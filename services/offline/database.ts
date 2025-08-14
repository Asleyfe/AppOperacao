import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

const initializeDatabase = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('app_offline.db');
  }
  return db;
};

// Tabelas principais para funcionalidades do encarregado
const createTables = async () => {
  const database = await initializeDatabase();
  
  // Colaboradores
  await database.execAsync(`
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
  
  // Equipes
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS equipes_local (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      prefixo TEXT UNIQUE NOT NULL,
      tipo_equipe TEXT NOT NULL,
      status_composicao TEXT DEFAULT 'Pendente',
      encarregado_matricula INTEGER,
      synced BOOLEAN DEFAULT 0,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Serviços
  await database.execAsync(`
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
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS grupo_itens_local (
      id INTEGER PRIMARY KEY,
      grupo TEXT NOT NULL,
      item TEXT NOT NULL,
      descricao TEXT,
      synced BOOLEAN DEFAULT 0,
      last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // GI Serviço (Checklists)
  await database.execAsync(`
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
};

const getLocalDatabase = async () => {
  return await initializeDatabase();
};

export { getLocalDatabase, createTables };