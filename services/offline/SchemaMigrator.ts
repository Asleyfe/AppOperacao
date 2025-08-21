/**
 * =====================================================
 * SISTEMA DE MIGRAÇÃO DE SCHEMA OFFLINE
 * =====================================================
 * Data: 21 de agosto de 2025
 * Objetivo: Gerenciar versões e migrações do banco SQLite offline
 * Uso: Aplicar atualizações de schema de forma controlada
 */

import { getLocalDatabase, safeExecAsync, safeGetFirstAsync, safeGetAllAsync } from './database';

// =====================================================
// INTERFACES DE MIGRAÇÃO
// =====================================================
export interface Migration {
  version: number;
  name: string;
  description: string;
  sql: string[];
  rollback?: string[];
  dependencies?: number[];
}

export interface MigrationResult {
  success: boolean;
  version: number;
  name: string;
  error?: string;
  executionTime: number;
}

export interface SchemaVersion {
  version: number;
  name: string;
  applied_at: string;
  checksum?: string;
}

// =====================================================
// CLASSE PRINCIPAL DE MIGRAÇÃO
// =====================================================
export class SchemaMigrator {
  private static readonly SCHEMA_VERSION_TABLE = 'schema_version';
  private static readonly CURRENT_VERSION = 3; // Versão atual do schema

  // =====================================================
  // INICIALIZAÇÃO
  // =====================================================
  
  /**
   * Inicializar sistema de migração
   */
  static async initialize(): Promise<void> {
    try {
      console.log('🔧 [MIGRATOR] Inicializando sistema de migração...');
      const db = await getLocalDatabase();
      
      // Criar tabela de controle de versão se não existir
      await safeExecAsync(db, `
        CREATE TABLE IF NOT EXISTS ${this.SCHEMA_VERSION_TABLE} (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now')),
          checksum TEXT,
          execution_time INTEGER DEFAULT 0
        )
      `);

      console.log('✅ [MIGRATOR] Sistema de migração inicializado');
    } catch (error) {
      console.error('❌ [MIGRATOR] Erro ao inicializar sistema de migração:', error);
      throw error;
    }
  }

  /**
   * Obter versão atual do schema
   */
  static async getCurrentVersion(): Promise<number> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db, `
        SELECT MAX(version) as version FROM ${this.SCHEMA_VERSION_TABLE}
      `);
      
      return result?.version || 0;
    } catch (error) {
      console.error('❌ [MIGRATOR] Erro ao obter versão atual:', error);
      return 0;
    }
  }

  /**
   * Verificar se migração é necessária
   */
  static async needsMigration(): Promise<boolean> {
    const currentVersion = await this.getCurrentVersion();
    return currentVersion < this.CURRENT_VERSION;
  }

  // =====================================================
  // DEFINIÇÕES DE MIGRAÇÃO
  // =====================================================
  
  /**
   * Obter todas as migrações disponíveis
   */
  static getMigrations(): Migration[] {
    return [
      // Migração 1: Correção da tabela equipes_local
      {
        version: 1,
        name: 'fix_equipes_table',
        description: 'Corrigir estrutura da tabela equipes_local',
        sql: [
          // Backup da tabela atual
          `CREATE TABLE IF NOT EXISTS equipes_local_backup AS SELECT * FROM equipes_local`,
          
          // Recriar tabela com estrutura correta
          `DROP TABLE IF EXISTS equipes_local`,
          `CREATE TABLE equipes_local (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prefixo TEXT NOT NULL UNIQUE,
            nome TEXT, -- Removido NOT NULL
            tipo TEXT CHECK (tipo IN ('Manutenção', 'Operação', 'Emergência', 'Projeto')) DEFAULT 'Manutenção',
            status TEXT CHECK (status IN ('Ativa', 'Inativa', 'Suspensa')) DEFAULT 'Ativa',
            data TEXT NOT NULL,
            encarregado_matricula INTEGER,
            observacoes TEXT,
            user_id TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            synced INTEGER DEFAULT 0,
            last_modified TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (encarregado_matricula) REFERENCES colaboradores_local(matricula)
          )`,
          
          // Migrar dados do backup
          `INSERT INTO equipes_local (id, prefixo, nome, tipo, status, data, encarregado_matricula, observacoes, user_id, created_at, updated_at, synced, last_modified)
           SELECT id, prefixo, nome, 
                  COALESCE(tipo, 'Manutenção') as tipo,
                  COALESCE(status, 'Ativa') as status,
                  data, encarregado_matricula, observacoes, user_id, 
                  COALESCE(created_at, datetime('now')) as created_at,
                  COALESCE(updated_at, datetime('now')) as updated_at,
                  COALESCE(synced, 0) as synced,
                  COALESCE(last_modified, datetime('now')) as last_modified
           FROM equipes_local_backup`,
          
          // Criar índices
          `CREATE INDEX IF NOT EXISTS idx_equipes_prefixo ON equipes_local(prefixo)`,
          `CREATE INDEX IF NOT EXISTS idx_equipes_data ON equipes_local(data)`,
          `CREATE INDEX IF NOT EXISTS idx_equipes_encarregado ON equipes_local(encarregado_matricula)`,
          `CREATE INDEX IF NOT EXISTS idx_equipes_synced ON equipes_local(synced)`,
          
          // Criar trigger para updated_at
          `CREATE TRIGGER IF NOT EXISTS tr_equipes_updated_at
           AFTER UPDATE ON equipes_local
           FOR EACH ROW
           BEGIN
             UPDATE equipes_local SET updated_at = datetime('now') WHERE id = NEW.id;
           END`
        ],
        rollback: [
          `DROP TABLE IF EXISTS equipes_local`,
          `ALTER TABLE equipes_local_backup RENAME TO equipes_local`
        ]
      },

      // Migração 2: Adicionar campos de auditoria
      {
        version: 2,
        name: 'add_audit_fields',
        description: 'Adicionar campos de auditoria às tabelas principais',
        sql: [
          // Colaboradores
          `ALTER TABLE colaboradores_local ADD COLUMN user_id TEXT`,
          `ALTER TABLE colaboradores_local ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`,
          `ALTER TABLE colaboradores_local ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`,
          
          // Serviços
          `ALTER TABLE servicos_local ADD COLUMN user_id TEXT`,
          `ALTER TABLE servicos_local ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`,
          `ALTER TABLE servicos_local ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`,
          
          // Triggers para updated_at
          `CREATE TRIGGER IF NOT EXISTS tr_colaboradores_updated_at
           AFTER UPDATE ON colaboradores_local
           FOR EACH ROW
           BEGIN
             UPDATE colaboradores_local SET updated_at = datetime('now') WHERE matricula = NEW.matricula;
           END`,
          
          `CREATE TRIGGER IF NOT EXISTS tr_servicos_updated_at
           AFTER UPDATE ON servicos_local
           FOR EACH ROW
           BEGIN
             UPDATE servicos_local SET updated_at = datetime('now') WHERE id = NEW.id;
           END`
        ],
        rollback: [
          `DROP TRIGGER IF EXISTS tr_colaboradores_updated_at`,
          `DROP TRIGGER IF EXISTS tr_servicos_updated_at`
          // Nota: SQLite não suporta DROP COLUMN, seria necessário recriar tabelas
        ]
      },

      // Migração 3: Criar tabelas ausentes
      {
        version: 3,
        name: 'create_missing_tables',
        description: 'Criar tabelas execucoes_colaborador_local e servico_header_local',
        sql: [
          // Tabela execucoes_colaborador_local
          `CREATE TABLE IF NOT EXISTS execucoes_colaborador_local (
            id TEXT PRIMARY KEY,
            colaborador_matricula INTEGER NOT NULL,
            servico_id TEXT NOT NULL,
            data_execucao TEXT NOT NULL,
            hora_inicio TEXT,
            hora_fim TEXT,
            status TEXT CHECK (status IN ('Pendente', 'Em Andamento', 'Concluído', 'Cancelado')) DEFAULT 'Pendente',
            observacoes TEXT,
            user_id TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            synced INTEGER DEFAULT 0,
            last_modified TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (colaborador_matricula) REFERENCES colaboradores_local(matricula),
            FOREIGN KEY (servico_id) REFERENCES servicos_local(id)
          )`,
          
          // Tabela servico_header_local
          `CREATE TABLE IF NOT EXISTS servico_header_local (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            descricao TEXT,
            categoria TEXT,
            tipo TEXT,
            ativo INTEGER DEFAULT 1,
            user_id TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            synced INTEGER DEFAULT 0,
            last_modified TEXT DEFAULT (datetime('now'))
          )`,
          
          // Índices para execucoes_colaborador_local
          `CREATE INDEX IF NOT EXISTS idx_execucoes_colaborador ON execucoes_colaborador_local(colaborador_matricula)`,
          `CREATE INDEX IF NOT EXISTS idx_execucoes_servico ON execucoes_colaborador_local(servico_id)`,
          `CREATE INDEX IF NOT EXISTS idx_execucoes_data ON execucoes_colaborador_local(data_execucao)`,
          `CREATE INDEX IF NOT EXISTS idx_execucoes_status ON execucoes_colaborador_local(status)`,
          `CREATE INDEX IF NOT EXISTS idx_execucoes_synced ON execucoes_colaborador_local(synced)`,
          
          // Índices para servico_header_local
          `CREATE INDEX IF NOT EXISTS idx_servico_header_nome ON servico_header_local(nome)`,
          `CREATE INDEX IF NOT EXISTS idx_servico_header_categoria ON servico_header_local(categoria)`,
          `CREATE INDEX IF NOT EXISTS idx_servico_header_ativo ON servico_header_local(ativo)`,
          `CREATE INDEX IF NOT EXISTS idx_servico_header_synced ON servico_header_local(synced)`,
          
          // Trigger para execucoes_colaborador_local
          `CREATE TRIGGER IF NOT EXISTS tr_execucoes_updated_at
           AFTER UPDATE ON execucoes_colaborador_local
           FOR EACH ROW
           BEGIN
             UPDATE execucoes_colaborador_local SET updated_at = datetime('now') WHERE id = NEW.id;
           END`,
          
          // Trigger para servico_header_local
          `CREATE TRIGGER IF NOT EXISTS tr_servico_header_updated_at
           AFTER UPDATE ON servico_header_local
           FOR EACH ROW
           BEGIN
             UPDATE servico_header_local SET updated_at = datetime('now') WHERE id = NEW.id;
           END`
        ],
        rollback: [
          `DROP TRIGGER IF EXISTS tr_execucoes_updated_at`,
          `DROP TRIGGER IF EXISTS tr_servico_header_updated_at`,
          `DROP TABLE IF EXISTS execucoes_colaborador_local`,
          `DROP TABLE IF EXISTS servico_header_local`
        ]
      }
    ];
  }

  // =====================================================
  // EXECUÇÃO DE MIGRAÇÕES
  // =====================================================
  
  /**
   * Aplicar uma migração específica
   */
  static async applyMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [MIGRATOR] Aplicando migração ${migration.version}: ${migration.name}`);
      const db = await getLocalDatabase();
      
      // Verificar se migração já foi aplicada
      const existing = await safeGetFirstAsync(db, 
        `SELECT version FROM ${this.SCHEMA_VERSION_TABLE} WHERE version = ?`, 
        [migration.version]
      );
      
      if (existing) {
        console.log(`⚠️ [MIGRATOR] Migração ${migration.version} já foi aplicada`);
        return {
          success: true,
          version: migration.version,
          name: migration.name,
          executionTime: Date.now() - startTime
        };
      }

      // Verificar dependências
      if (migration.dependencies) {
        for (const dep of migration.dependencies) {
          const depExists = await safeGetFirstAsync(db, 
            `SELECT version FROM ${this.SCHEMA_VERSION_TABLE} WHERE version = ?`, 
            [dep]
          );
          if (!depExists) {
            throw new Error(`Dependência não satisfeita: migração ${dep} deve ser aplicada primeiro`);
          }
        }
      }

      // Executar comandos SQL da migração
      for (const sql of migration.sql) {
        console.log(`📝 [MIGRATOR] Executando: ${sql.substring(0, 100)}...`);
        await safeExecAsync(db, sql);
      }

      // Registrar migração aplicada
      await safeExecAsync(db, `
        INSERT INTO ${this.SCHEMA_VERSION_TABLE} (version, name, applied_at, execution_time)
        VALUES (?, ?, datetime('now'), ?)
      `, [migration.version, migration.name, Date.now() - startTime]);

      const executionTime = Date.now() - startTime;
      console.log(`✅ [MIGRATOR] Migração ${migration.version} aplicada com sucesso (${executionTime}ms)`);
      
      return {
        success: true,
        version: migration.version,
        name: migration.name,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ [MIGRATOR] Erro na migração ${migration.version}:`, error);
      
      return {
        success: false,
        version: migration.version,
        name: migration.name,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      };
    }
  }

  /**
   * Aplicar todas as migrações pendentes
   */
  static async applyPendingMigrations(): Promise<MigrationResult[]> {
    try {
      console.log('🚀 [MIGRATOR] Iniciando aplicação de migrações pendentes...');
      
      await this.initialize();
      const currentVersion = await this.getCurrentVersion();
      const migrations = this.getMigrations();
      const results: MigrationResult[] = [];

      console.log(`📊 [MIGRATOR] Versão atual: ${currentVersion}, Versão alvo: ${this.CURRENT_VERSION}`);

      // Filtrar migrações pendentes
      const pendingMigrations = migrations.filter(m => m.version > currentVersion);
      
      if (pendingMigrations.length === 0) {
        console.log('✅ [MIGRATOR] Nenhuma migração pendente');
        return [];
      }

      console.log(`📋 [MIGRATOR] ${pendingMigrations.length} migrações pendentes encontradas`);

      // Ordenar por versão
      pendingMigrations.sort((a, b) => a.version - b.version);

      // Aplicar migrações em ordem
      for (const migration of pendingMigrations) {
        const result = await this.applyMigration(migration);
        results.push(result);
        
        if (!result.success) {
          console.error(`❌ [MIGRATOR] Parando aplicação devido a erro na migração ${migration.version}`);
          break;
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
      
      console.log(`🎯 [MIGRATOR] Concluído: ${successCount}/${results.length} migrações aplicadas (${totalTime}ms)`);
      
      return results;
    } catch (error) {
      console.error('❌ [MIGRATOR] Erro ao aplicar migrações:', error);
      throw error;
    }
  }

  /**
   * Reverter uma migração específica
   */
  static async rollbackMigration(version: number): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 [MIGRATOR] Revertendo migração ${version}`);
      const db = await getLocalDatabase();
      
      // Encontrar migração
      const migrations = this.getMigrations();
      const migration = migrations.find(m => m.version === version);
      
      if (!migration) {
        throw new Error(`Migração ${version} não encontrada`);
      }
      
      if (!migration.rollback) {
        throw new Error(`Migração ${version} não possui script de rollback`);
      }

      // Verificar se migração foi aplicada
      const existing = await safeGetFirstAsync(db, 
        `SELECT version FROM ${this.SCHEMA_VERSION_TABLE} WHERE version = ?`, 
        [version]
      );
      
      if (!existing) {
        throw new Error(`Migração ${version} não foi aplicada`);
      }

      // Executar comandos de rollback
      for (const sql of migration.rollback) {
        console.log(`📝 [MIGRATOR] Revertendo: ${sql.substring(0, 100)}...`);
        await safeExecAsync(db, sql);
      }

      // Remover registro da migração
      await safeExecAsync(db, 
        `DELETE FROM ${this.SCHEMA_VERSION_TABLE} WHERE version = ?`, 
        [version]
      );

      const executionTime = Date.now() - startTime;
      console.log(`✅ [MIGRATOR] Migração ${version} revertida com sucesso (${executionTime}ms)`);
      
      return {
        success: true,
        version,
        name: migration.name,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ [MIGRATOR] Erro ao reverter migração ${version}:`, error);
      
      return {
        success: false,
        version,
        name: 'rollback',
        error: error instanceof Error ? error.message : String(error),
        executionTime
      };
    }
  }

  // =====================================================
  // UTILITÁRIOS E INFORMAÇÕES
  // =====================================================
  
  /**
   * Obter histórico de migrações aplicadas
   */
  static async getMigrationHistory(): Promise<SchemaVersion[]> {
    try {
      const db = await getLocalDatabase();
      return await safeGetAllAsync(db, `
        SELECT version, name, applied_at, checksum, execution_time
        FROM ${this.SCHEMA_VERSION_TABLE}
        ORDER BY version
      `);
    } catch (error) {
      console.error('❌ [MIGRATOR] Erro ao obter histórico:', error);
      return [];
    }
  }

  /**
   * Verificar integridade do schema
   */
  static async checkSchemaIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      const db = await getLocalDatabase();
      
      // Verificar se tabelas principais existem
      const requiredTables = [
        'colaboradores_local',
        'equipes_local',
        'composicao_equipe_local',
        'servicos_local',
        'execucoes_colaborador_local',
        'servico_header_local',
        'operation_queue'
      ];
      
      for (const table of requiredTables) {
        const exists = await safeGetFirstAsync(db, 
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?", 
          [table]
        );
        
        if (!exists) {
          issues.push(`Tabela ausente: ${table}`);
        }
      }
      
      // Verificar índices importantes
      const requiredIndexes = [
        'idx_equipes_prefixo',
        'idx_colaboradores_matricula',
        'idx_servicos_equipe',
        'idx_execucoes_colaborador'
      ];
      
      for (const index of requiredIndexes) {
        const exists = await safeGetFirstAsync(db, 
          "SELECT name FROM sqlite_master WHERE type='index' AND name=?", 
          [index]
        );
        
        if (!exists) {
          issues.push(`Índice ausente: ${index}`);
        }
      }
      
      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('❌ [MIGRATOR] Erro na verificação de integridade:', error);
      return {
        valid: false,
        issues: [`Erro na verificação: ${error}`]
      };
    }
  }

  /**
   * Obter informações do schema atual
   */
  static async getSchemaInfo(): Promise<any> {
    try {
      const currentVersion = await this.getCurrentVersion();
      const history = await this.getMigrationHistory();
      const integrity = await this.checkSchemaIntegrity();
      const needsMigration = await this.needsMigration();
      
      return {
        currentVersion,
        targetVersion: this.CURRENT_VERSION,
        needsMigration,
        history,
        integrity,
        availableMigrations: this.getMigrations().length
      };
    } catch (error) {
      console.error('❌ [MIGRATOR] Erro ao obter informações do schema:', error);
      return null;
    }
  }
}

// =====================================================
// EXPORTAÇÕES PARA FACILITAR USO
// =====================================================
export const applyPendingMigrations = SchemaMigrator.applyPendingMigrations.bind(SchemaMigrator);
export const getCurrentVersion = SchemaMigrator.getCurrentVersion.bind(SchemaMigrator);
export const needsMigration = SchemaMigrator.needsMigration.bind(SchemaMigrator);
export const getSchemaInfo = SchemaMigrator.getSchemaInfo.bind(SchemaMigrator);

/**
 * =====================================================
 * EXEMPLO DE USO:
 * =====================================================
 * 
 * import { SchemaMigrator, applyPendingMigrations } from './SchemaMigrator';
 * 
 * // Aplicar migrações pendentes na inicialização
 * const results = await applyPendingMigrations();
 * console.log('Migrações aplicadas:', results);
 * 
 * // Verificar se precisa de migração
 * if (await SchemaMigrator.needsMigration()) {
 *   console.log('Migração necessária!');
 * }
 * 
 * // Obter informações do schema
 * const info = await SchemaMigrator.getSchemaInfo();
 * console.log('Schema info:', info);
 * =====================================================
 */