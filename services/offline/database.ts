import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let tablesCreated = false;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Função para executar operações com retry (contorna bug do expo-sqlite no Android)
const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Se é o erro específico do prepareAsync, tenta novamente
      if (error.message?.includes('prepareAsync') && error.message?.includes('NullPointerException')) {
        console.warn(`⚠️ [DATABASE] Tentativa ${attempt}/${maxRetries} falhou com erro prepareAsync, tentando novamente...`);
        
        if (attempt < maxRetries) {
          // Aguarda um pouco antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
          continue;
        }
      }
      
      // Para outros erros, falha imediatamente
      throw error;
    }
  }
  
  throw lastError!;
};

const initializeDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (initializationPromise) {
    return initializationPromise;
  }
  
  if (db) {
    return db;
  }
  
  initializationPromise = (async () => {
    try {
      console.log('🔧 [DATABASE] Inicializando banco de dados...');
      db = await SQLite.openDatabaseAsync('app_offline.db');
      console.log('✅ [DATABASE] Banco de dados inicializado com sucesso');
      return db;
    } catch (error) {
      console.error('❌ [DATABASE] Erro ao inicializar banco:', error);
      initializationPromise = null;
      throw error;
    }
  })();
  
  return initializationPromise;
};

// Tabelas principais para funcionalidades do encarregado
const createTables = async () => {
  try {
    console.log('🏗️ [DATABASE] Iniciando criação de tabelas...');
    const database = await initializeDatabase();
    
    if (tablesCreated) {
      console.log('✅ [DATABASE] Tabelas já foram criadas anteriormente');
      return;
    }
  
  // Colaboradores
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS colaboradores_local (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      funcao TEXT NOT NULL,
      matricula INTEGER UNIQUE NOT NULL,
      supervisor_id INTEGER,
      coordenador_id INTEGER,
      synced BOOLEAN DEFAULT 0,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Equipes - Recriar tabela para remover constraint NOT NULL do campo nome
  await database.runAsync(`DROP TABLE IF EXISTS equipes_local`);
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS equipes_local (
      id INTEGER PRIMARY KEY,
      nome TEXT,
      prefixo TEXT UNIQUE NOT NULL,
      status_composicao TEXT DEFAULT 'Pendente',
      encarregado_matricula INTEGER,
      synced BOOLEAN DEFAULT 0,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Composição de Equipes
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS composicao_equipe_local (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipe_id INTEGER NOT NULL,
      colaborador_matricula INTEGER NOT NULL,
      synced BOOLEAN DEFAULT 0,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(equipe_id, colaborador_matricula)
    )
  `);
  
  // Serviços
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS servicos_local (
      id TEXT PRIMARY KEY,
      equipe_id INTEGER,
      data_planejada DATE NOT NULL,
      descricao TEXT,
      status TEXT DEFAULT 'Planejado',
      inicio_deslocamento TIMESTAMP,
      fim_deslocamento TIMESTAMP,
      inicio_execucao TIMESTAMP,
      fim_execucao TIMESTAMP,
      equipe_prefixo TEXT,
      nota TEXT,
      synced BOOLEAN DEFAULT 0,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Grupo de Itens
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS grupo_itens_local (
      id INTEGER PRIMARY KEY,
      grupo TEXT NOT NULL,
      item TEXT NOT NULL,
      unidade TEXT,
      descricao TEXT,
      synced BOOLEAN DEFAULT 0,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Adicionar coluna unidade se não existir (para bancos existentes)
  try {
    await database.runAsync(`
      ALTER TABLE grupo_itens_local ADD COLUMN unidade TEXT
    `);
  } catch (error) {
    // Coluna já existe, ignorar erro
  }
  
  // GI Serviço (Checklists)
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS giservico_local (
      id INTEGER PRIMARY KEY,
      id_servico TEXT NOT NULL,
      id_item INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      status TEXT NOT NULL,
      n_serie TEXT,
      prefixo TEXT,
      synced BOOLEAN DEFAULT 0,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Serviço Header
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS servico_header_local (
      id INTEGER PRIMARY KEY,
      servico_id TEXT NOT NULL,
      km_inicial INTEGER,
      km_final INTEGER,
      hora_inicial TEXT,
      hora_final TEXT,
      data_execucao DATE,
      equipe_prefixo TEXT,
      equipamento TEXT,
      projeto TEXT,
      si TEXT,
      ptp TEXT,
      status_servico TEXT,
      ocorrencia TEXT,
      synced BOOLEAN DEFAULT 0,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Histórico de Turno (para validações offline)
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS historico_turno_local (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      colaborador_matricula TEXT NOT NULL,
      equipe_prefixo TEXT NOT NULL,
      data_turno DATE NOT NULL,
      hora_inicio_turno TEXT NOT NULL,
      hora_oper TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0,
      UNIQUE(colaborador_matricula, equipe_prefixo, data_turno)
    );
  `);

  // Fila de operações para sincronização
  await database.runAsync(`
    CREATE TABLE IF NOT EXISTS operation_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation_type TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      data TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      attempts INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
    tablesCreated = true;
    console.log('✅ [DATABASE] Tabelas do banco de dados criadas com sucesso');
  } catch (error) {
    console.error('❌ [DATABASE] Erro ao criar tabelas:', error);
    tablesCreated = false;
    throw error;
  }
};

const getLocalDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    console.log('📱 [DATABASE] Obtendo instância do banco de dados...');
    const database = await initializeDatabase();
    
    if (!tablesCreated) {
      console.log('🏗️ [DATABASE] Tabelas não criadas, criando agora...');
      await createTables();
    }
    
    console.log('✅ [DATABASE] Banco de dados pronto para uso');
    return database;
  } catch (error) {
    console.error('❌ [DATABASE] Erro ao obter banco de dados:', error);
    throw error;
  }
};

// Funções wrapper com retry para operações de banco
const safeRunAsync = async (db: SQLite.SQLiteDatabase, sql: string, params?: any[]) => {
  return executeWithRetry(() => db.runAsync(sql, params));
};

const safeGetAllAsync = async (db: SQLite.SQLiteDatabase, sql: string, params?: any[]) => {
  return executeWithRetry(() => db.getAllAsync(sql, params));
};

const safeGetFirstAsync = async (db: SQLite.SQLiteDatabase, sql: string, params?: any[]) => {
  return executeWithRetry(() => db.getFirstAsync(sql, params));
};

const safeExecAsync = async (db: SQLite.SQLiteDatabase, sql: string) => {
  return executeWithRetry(() => db.execAsync(sql));
};

export { 
  getLocalDatabase, 
  createTables, 
  safeRunAsync, 
  safeGetAllAsync, 
  safeGetFirstAsync, 
  safeExecAsync 
};