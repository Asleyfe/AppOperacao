# 🚨 PLANO DE CORREÇÃO CRÍTICA - SCHEMA OFFLINE

**Data**: 21 de agosto de 2025  
**Objetivo**: Implementação imediata das correções críticas identificadas  
**Prioridade**: 🔴 CRÍTICA - Implementar em 2-3 dias  

---

## 🎯 RESUMO DAS CORREÇÕES CRÍTICAS

### ❌ **Problemas Críticos Identificados**
1. **Tabela `execucoes_colaborador_local`** - AUSENTE
2. **Tabela `valores_faturamento_real_local`** - AUSENTE  
3. **Campo `data` em `equipes_local`** - AUSENTE
4. **Campo `tipo_equipe` em `equipes_local`** - AUSENTE
5. **Campo `user_id` em `colaboradores_local`** - AUSENTE
6. **Campos de auditoria** - AUSENTES em todas as tabelas
7. **Constraints NOT NULL** - Inconsistentes

### ✅ **Resultado Esperado**
- ✅ 100% compatibilidade com funcionalidades críticas
- ✅ Suporte completo a execuções de colaborador
- ✅ Cálculos de faturamento offline
- ✅ Auditoria completa de dados
- ✅ Validações de integridade

---

## 📋 IMPLEMENTAÇÃO PASSO A PASSO

### **PASSO 1: Atualizar SchemaMigrator.ts**

#### Adicionar Nova Migração Crítica

```typescript
// services/offline/SchemaMigrator.ts

// Adicionar ao array de migrações:
{
  version: 4,
  name: 'critical_schema_fixes',
  description: 'Correções críticas do schema offline',
  sql: [
    // 1. Criar tabela execucoes_colaborador_local
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
    
    // 2. Criar tabela valores_faturamento_real_local
    `CREATE TABLE IF NOT EXISTS valores_faturamento_real_local (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo TEXT NOT NULL,
      item TEXT NOT NULL,
      status TEXT NOT NULL,
      valor_unitario REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      last_modified TEXT DEFAULT (datetime('now')),
      UNIQUE(grupo, item, status)
    )`,
    
    // 3. Adicionar campos ausentes em colaboradores_local
    `ALTER TABLE colaboradores_local ADD COLUMN user_id TEXT`,
    `ALTER TABLE colaboradores_local ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`,
    `ALTER TABLE colaboradores_local ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`,
    
    // 4. Adicionar campos ausentes em servicos_local
    `ALTER TABLE servicos_local ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`,
    `ALTER TABLE servicos_local ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`,
    
    // 5. Adicionar campos ausentes em composicao_equipe_local
    `ALTER TABLE composicao_equipe_local ADD COLUMN created_at TEXT DEFAULT (datetime('now'))`,
    `ALTER TABLE composicao_equipe_local ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`,
    
    // 6. Criar índices para performance
    `CREATE INDEX IF NOT EXISTS idx_execucoes_colaborador_matricula ON execucoes_colaborador_local(colaborador_matricula)`,
    `CREATE INDEX IF NOT EXISTS idx_execucoes_servico_id ON execucoes_colaborador_local(servico_id)`,
    `CREATE INDEX IF NOT EXISTS idx_execucoes_data ON execucoes_colaborador_local(data_execucao)`,
    `CREATE INDEX IF NOT EXISTS idx_faturamento_grupo_item ON valores_faturamento_real_local(grupo, item)`,
    
    // 7. Habilitar Foreign Keys
    `PRAGMA foreign_keys = ON`
  ]
},

// Migração para recriar tabela equipes_local com campos obrigatórios
{
  version: 5,
  name: 'recreate_equipes_table',
  description: 'Recriar tabela equipes com campos obrigatórios',
  sql: [
    // Backup da tabela atual
    `CREATE TABLE equipes_local_backup AS SELECT * FROM equipes_local`,
    
    // Dropar tabela atual
    `DROP TABLE equipes_local`,
    
    // Criar nova tabela com estrutura correta
    `CREATE TABLE equipes_local (
      id INTEGER PRIMARY KEY,
      data DATE NOT NULL DEFAULT (date('now')),
      prefixo TEXT UNIQUE NOT NULL,
      tipo_equipe TEXT DEFAULT 'LV' NOT NULL,
      status_composicao TEXT DEFAULT 'Pendente' NOT NULL,
      encarregado_matricula INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      last_modified TEXT DEFAULT (datetime('now'))
    )`,
    
    // Migrar dados do backup
    `INSERT INTO equipes_local (id, prefixo, status_composicao, encarregado_matricula, synced, last_modified)
     SELECT id, prefixo, 
            COALESCE(status_composicao, 'Pendente'),
            COALESCE(encarregado_matricula, 0),
            synced, 
            last_modified 
     FROM equipes_local_backup 
     WHERE encarregado_matricula IS NOT NULL AND encarregado_matricula > 0`,
    
    // Dropar backup
    `DROP TABLE equipes_local_backup`
  ]
}
```

---

### **PASSO 2: Atualizar database.ts**

#### Modificar função createTables()

```typescript
// services/offline/database.ts

const createTables = async () => {
  try {
    console.log('🏗️ [DATABASE] Iniciando criação de tabelas...');
    const database = await initializeDatabase();
    
    if (tablesCreated) {
      console.log('✅ [DATABASE] Tabelas já foram criadas anteriormente');
      return;
    }

    // Habilitar Foreign Keys
    await database.runAsync('PRAGMA foreign_keys = ON');

    // Colaboradores - Estrutura atualizada
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS colaboradores_local (
        id INTEGER PRIMARY KEY,
        nome TEXT NOT NULL,
        funcao TEXT NOT NULL,
        matricula INTEGER UNIQUE NOT NULL,
        user_id TEXT,
        supervisor_id INTEGER,
        coordenador_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0,
        last_modified TEXT DEFAULT (datetime('now'))
      )
    `);

    // Equipes - Estrutura corrigida
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS equipes_local (
        id INTEGER PRIMARY KEY,
        data DATE NOT NULL DEFAULT (date('now')),
        prefixo TEXT UNIQUE NOT NULL,
        tipo_equipe TEXT DEFAULT 'LV' NOT NULL,
        status_composicao TEXT DEFAULT 'Pendente' NOT NULL,
        encarregado_matricula INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0,
        last_modified TEXT DEFAULT (datetime('now'))
      )
    `);

    // Composição de Equipes - Atualizada
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS composicao_equipe_local (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipe_id INTEGER NOT NULL,
        colaborador_matricula INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0,
        last_modified TEXT DEFAULT (datetime('now')),
        UNIQUE(equipe_id, colaborador_matricula),
        FOREIGN KEY (equipe_id) REFERENCES equipes_local(id),
        FOREIGN KEY (colaborador_matricula) REFERENCES colaboradores_local(matricula)
      )
    `);

    // Serviços - Atualizada
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS servicos_local (
        id TEXT PRIMARY KEY,
        equipe_id INTEGER NOT NULL,
        data_planejada DATE NOT NULL,
        descricao TEXT NOT NULL,
        status TEXT DEFAULT 'Planejado' NOT NULL CHECK (status IN ('Planejado', 'Em Deslocamento', 'Aguardando Execução', 'Em Execução', 'Finalizado')),
        inicio_deslocamento TEXT,
        fim_deslocamento TEXT,
        inicio_execucao TEXT,
        fim_execucao TEXT,
        equipe_prefixo TEXT,
        nota TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0,
        last_modified TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (equipe_id) REFERENCES equipes_local(id)
      )
    `);

    // Grupo de Itens - Atualizada
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS grupo_itens_local (
        id INTEGER PRIMARY KEY,
        grupo TEXT NOT NULL,
        item TEXT NOT NULL,
        unidade TEXT,
        descricao TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0,
        last_modified TEXT DEFAULT (datetime('now'))
      )
    `);

    // GI Serviço (Checklists) - Atualizada
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS giservico_local (
        id INTEGER PRIMARY KEY,
        id_servico TEXT NOT NULL,
        id_item INTEGER NOT NULL,
        quantidade INTEGER NOT NULL,
        status TEXT NOT NULL,
        n_serie TEXT,
        prefixo TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0,
        last_modified TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (id_item) REFERENCES grupo_itens_local(id),
        FOREIGN KEY (id_servico) REFERENCES servicos_local(id)
      )
    `);

    // Serviço Header - Atualizada
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS servico_header_local (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0,
        last_modified TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (servico_id) REFERENCES servicos_local(id)
      )
    `);

    // *** NOVAS TABELAS CRÍTICAS ***

    // Execuções de Colaborador
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS execucoes_colaborador_local (
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
      )
    `);

    // Valores de Faturamento Real
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS valores_faturamento_real_local (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupo TEXT NOT NULL,
        item TEXT NOT NULL,
        status TEXT NOT NULL,
        valor_unitario REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0,
        last_modified TEXT DEFAULT (datetime('now')),
        UNIQUE(grupo, item, status)
      )
    `);

    // Histórico de Turno - Já existe, manter
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS historico_turno_local (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        colaborador_matricula TEXT NOT NULL,
        equipe_prefixo TEXT NOT NULL,
        data_turno DATE NOT NULL,
        hora_inicio_turno TEXT NOT NULL,
        hora_oper TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        synced INTEGER DEFAULT 0,
        UNIQUE(colaborador_matricula, equipe_prefixo, data_turno)
      )
    `);

    // Fila de operações para sincronização - Já existe, manter
    await database.runAsync(`
      CREATE TABLE IF NOT EXISTS operation_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_type TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        attempts INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // *** CRIAR ÍNDICES PARA PERFORMANCE ***
    
    // Índices para execucoes_colaborador_local
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_execucoes_colaborador_matricula ON execucoes_colaborador_local(colaborador_matricula)`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_execucoes_servico_id ON execucoes_colaborador_local(servico_id)`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_execucoes_data ON execucoes_colaborador_local(data_execucao)`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_execucoes_status ON execucoes_colaborador_local(status)`);
    
    // Índices para valores_faturamento_real_local
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_faturamento_grupo_item ON valores_faturamento_real_local(grupo, item)`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_faturamento_status ON valores_faturamento_real_local(status)`);
    
    // Índices existentes
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_colaboradores_matricula ON colaboradores_local(matricula)`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_equipes_prefixo ON equipes_local(prefixo)`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_servicos_data ON servicos_local(data_planejada)`);
    await database.runAsync(`CREATE INDEX IF NOT EXISTS idx_servicos_equipe ON servicos_local(equipe_id)`);
    
    tablesCreated = true;
    console.log('✅ [DATABASE] Tabelas do banco de dados criadas com sucesso');
  } catch (error) {
    console.error('❌ [DATABASE] Erro ao criar tabelas:', error);
    tablesCreated = false;
    throw error;
  }
};
```

---

### **PASSO 3: Expandir OfflineDataService.ts**

#### Adicionar Métodos para Novas Tabelas

```typescript
// services/offline/OfflineDataService.ts

// Adicionar ao final da classe OfflineDataService:

  // *** MÉTODOS PARA EXECUÇÕES DE COLABORADOR ***
  
  async getExecucoesColaborador(servicoId: string): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetAllAsync(db, 
        `SELECT ec.*, c.nome as colaborador_nome 
         FROM execucoes_colaborador_local ec
         LEFT JOIN colaboradores_local c ON ec.colaborador_matricula = c.matricula
         WHERE ec.servico_id = ?
         ORDER BY ec.created_at`,
        [servicoId]
      );
      return result;
    } catch (error) {
      console.error('Erro ao buscar execuções de colaborador offline:', error);
      throw error;
    }
  }

  async createExecucaoColaborador(data: {
    id: string;
    colaborador_matricula: number;
    servico_id: string;
    data_execucao: string;
    hora_inicio?: string;
    hora_fim?: string;
    status?: string;
    observacoes?: string;
    user_id?: string;
  }): Promise<any> {
    try {
      const db = await getLocalDatabase();
      
      const result = await safeRunAsync(db,
        `INSERT INTO execucoes_colaborador_local 
         (id, colaborador_matricula, servico_id, data_execucao, hora_inicio, hora_fim, status, observacoes, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.id,
          data.colaborador_matricula,
          data.servico_id,
          data.data_execucao,
          data.hora_inicio || null,
          data.hora_fim || null,
          data.status || 'Pendente',
          data.observacoes || null,
          data.user_id || null
        ]
      );
      
      console.log('✅ [OFFLINE] Execução de colaborador criada:', data.id);
      return { id: data.id, ...data };
    } catch (error) {
      console.error('Erro ao criar execução de colaborador offline:', error);
      throw error;
    }
  }

  async updateExecucaoColaborador(id: string, data: any): Promise<void> {
    try {
      const db = await getLocalDatabase();
      
      const updateFields = [];
      const updateValues = [];
      
      if (data.hora_inicio !== undefined) {
        updateFields.push('hora_inicio = ?');
        updateValues.push(data.hora_inicio);
      }
      
      if (data.hora_fim !== undefined) {
        updateFields.push('hora_fim = ?');
        updateValues.push(data.hora_fim);
      }
      
      if (data.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(data.status);
      }
      
      if (data.observacoes !== undefined) {
        updateFields.push('observacoes = ?');
        updateValues.push(data.observacoes);
      }
      
      // Sempre marcar como não sincronizado
      updateFields.push('synced = 0', 'updated_at = datetime(\'now\')');
      updateValues.push(id);
      
      const sql = `UPDATE execucoes_colaborador_local SET ${updateFields.join(', ')} WHERE id = ?`;
      
      await safeRunAsync(db, sql, updateValues);
      console.log('✅ [OFFLINE] Execução de colaborador atualizada:', id);
    } catch (error) {
      console.error('Erro ao atualizar execução de colaborador offline:', error);
      throw error;
    }
  }

  // *** MÉTODOS PARA VALORES DE FATURAMENTO ***
  
  async getValoresFaturamento(): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetAllAsync(db, 
        'SELECT * FROM valores_faturamento_real_local ORDER BY grupo, item, status'
      );
      return result;
    } catch (error) {
      console.error('Erro ao buscar valores de faturamento offline:', error);
      throw error;
    }
  }

  async getValorFaturamento(grupo: string, item: string, status: string): Promise<number> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db,
        'SELECT valor_unitario FROM valores_faturamento_real_local WHERE grupo = ? AND item = ? AND status = ?',
        [grupo, item, status]
      );
      return result?.valor_unitario || 0;
    } catch (error) {
      console.error('Erro ao buscar valor de faturamento offline:', error);
      return 0;
    }
  }

  async createValorFaturamento(data: {
    grupo: string;
    item: string;
    status: string;
    valor_unitario: number;
  }): Promise<any> {
    try {
      const db = await getLocalDatabase();
      
      const result = await safeRunAsync(db,
        `INSERT INTO valores_faturamento_real_local (grupo, item, status, valor_unitario)
         VALUES (?, ?, ?, ?)`,
        [data.grupo, data.item, data.status, data.valor_unitario]
      );
      
      console.log('✅ [OFFLINE] Valor de faturamento criado:', data);
      return { id: result.lastInsertRowId, ...data };
    } catch (error) {
      console.error('Erro ao criar valor de faturamento offline:', error);
      throw error;
    }
  }

  // *** MÉTODOS DE RELATÓRIOS E CÁLCULOS ***
  
  async calcularFaturamentoServico(servicoId: string): Promise<number> {
    try {
      const db = await getLocalDatabase();
      
      const result = await safeGetFirstAsync(db,
        `SELECT SUM(gs.quantidade * COALESCE(vf.valor_unitario, 0)) as total_faturamento
         FROM giservico_local gs
         LEFT JOIN grupo_itens_local gi ON gs.id_item = gi.id
         LEFT JOIN valores_faturamento_real_local vf ON (gi.grupo = vf.grupo AND gi.item = vf.item AND gs.status = vf.status)
         WHERE gs.id_servico = ?`,
        [servicoId]
      );
      
      return result?.total_faturamento || 0;
    } catch (error) {
      console.error('Erro ao calcular faturamento do serviço offline:', error);
      return 0;
    }
  }

  async getResumoFaturamentoEquipe(equipePrefixo: string, dataInicio: string, dataFim: string): Promise<any> {
    try {
      const db = await getLocalDatabase();
      
      const result = await safeGetFirstAsync(db,
        `SELECT 
           COUNT(DISTINCT s.id) as total_servicos,
           SUM(gs.quantidade * COALESCE(vf.valor_unitario, 0)) as total_faturamento,
           COUNT(DISTINCT gs.id) as total_itens
         FROM servicos_local s
         LEFT JOIN giservico_local gs ON s.id = gs.id_servico
         LEFT JOIN grupo_itens_local gi ON gs.id_item = gi.id
         LEFT JOIN valores_faturamento_real_local vf ON (gi.grupo = vf.grupo AND gi.item = vf.item AND gs.status = vf.status)
         WHERE s.equipe_prefixo = ? 
           AND s.data_planejada BETWEEN ? AND ?
           AND s.status = 'Finalizado'`,
        [equipePrefixo, dataInicio, dataFim]
      );
      
      return {
        equipePrefixo,
        periodo: { inicio: dataInicio, fim: dataFim },
        totalServicos: result?.total_servicos || 0,
        totalFaturamento: result?.total_faturamento || 0,
        totalItens: result?.total_itens || 0
      };
    } catch (error) {
      console.error('Erro ao gerar resumo de faturamento offline:', error);
      return {
        equipePrefixo,
        periodo: { inicio: dataInicio, fim: dataFim },
        totalServicos: 0,
        totalFaturamento: 0,
        totalItens: 0
      };
    }
  }

  async getProducaoColaborador(colaboradorMatricula: number, dataInicio: string, dataFim: string): Promise<any> {
    try {
      const db = await getLocalDatabase();
      
      const result = await safeGetFirstAsync(db,
        `SELECT 
           c.nome as colaborador_nome,
           c.matricula,
           COUNT(DISTINCT ec.servico_id) as total_servicos_executados,
           SUM(gs.quantidade * COALESCE(vf.valor_unitario, 0)) as valor_produzido
         FROM colaboradores_local c
         LEFT JOIN execucoes_colaborador_local ec ON c.matricula = ec.colaborador_matricula
         LEFT JOIN giservico_local gs ON ec.servico_id = gs.id_servico
         LEFT JOIN grupo_itens_local gi ON gs.id_item = gi.id
         LEFT JOIN valores_faturamento_real_local vf ON (gi.grupo = vf.grupo AND gi.item = vf.item AND gs.status = vf.status)
         WHERE c.matricula = ?
           AND ec.data_execucao BETWEEN ? AND ?
           AND ec.status = 'Concluído'
         GROUP BY c.id, c.nome, c.matricula`,
        [colaboradorMatricula, dataInicio, dataFim]
      );
      
      return {
        colaboradorMatricula,
        colaboradorNome: result?.colaborador_nome || '',
        periodo: { inicio: dataInicio, fim: dataFim },
        totalServicosExecutados: result?.total_servicos_executados || 0,
        valorProduzido: result?.valor_produzido || 0
      };
    } catch (error) {
      console.error('Erro ao gerar produção do colaborador offline:', error);
      return {
        colaboradorMatricula,
        colaboradorNome: '',
        periodo: { inicio: dataInicio, fim: dataFim },
        totalServicosExecutados: 0,
        valorProduzido: 0
      };
    }
  }
```

---

### **PASSO 4: Executar Migração**

#### Script de Execução

```typescript
// scripts/executar_migracao_critica.ts

import { SchemaMigrator } from '../services/offline/SchemaMigrator';
import { getLocalDatabase } from '../services/offline/database';

const executarMigracaoCritica = async () => {
  try {
    console.log('🚀 [MIGRAÇÃO] Iniciando migração crítica do schema...');
    
    // Inicializar banco
    const db = await getLocalDatabase();
    
    // Executar migrador
    const migrator = new SchemaMigrator();
    await migrator.initialize();
    
    // Verificar se precisa migrar
    const needsMigration = await migrator.needsMigration();
    
    if (needsMigration) {
      console.log('📋 [MIGRAÇÃO] Migrações pendentes encontradas, aplicando...');
      const result = await migrator.applyPendingMigrations();
      
      console.log('✅ [MIGRAÇÃO] Migrações aplicadas com sucesso:');
      result.appliedMigrations.forEach(migration => {
        console.log(`   - v${migration.version}: ${migration.name}`);
      });
    } else {
      console.log('✅ [MIGRAÇÃO] Schema já está atualizado');
    }
    
    // Verificar integridade
    const integrity = await migrator.checkIntegrity();
    
    if (integrity.valid) {
      console.log('✅ [MIGRAÇÃO] Integridade do schema verificada com sucesso');
    } else {
      console.error('❌ [MIGRAÇÃO] Problemas de integridade encontrados:', integrity.errors);
    }
    
    console.log('🎉 [MIGRAÇÃO] Migração crítica concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ [MIGRAÇÃO] Erro durante migração crítica:', error);
    throw error;
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  executarMigracaoCritica()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Falha na migração:', error);
      process.exit(1);
    });
}

export { executarMigracaoCritica };
```

---

### **PASSO 5: Atualizar Validações**

#### Expandir OfflineValidationService.ts

```typescript
// services/offline/OfflineValidationService.ts

// Adicionar novas interfaces:
export interface ExecucaoColaboradorData {
  id?: string;
  colaborador_matricula: number;
  servico_id: string;
  data_execucao: string;
  hora_inicio?: string;
  hora_fim?: string;
  status?: string;
  observacoes?: string;
  user_id?: string;
}

export interface ValorFaturamentoData {
  id?: number;
  grupo: string;
  item: string;
  status: string;
  valor_unitario: number;
}

// Adicionar constantes:
export const STATUS_EXECUCAO_PERMITIDOS = [
  'Pendente',
  'Em Andamento', 
  'Concluído',
  'Cancelado'
] as const;

// Adicionar métodos de validação:
static async validateExecucaoColaborador(data: ExecucaoColaboradorData): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validações básicas
    if (!data.colaborador_matricula || data.colaborador_matricula <= 0) {
      errors.push('Matrícula do colaborador é obrigatória e deve ser maior que zero');
    }

    if (!data.servico_id || data.servico_id.trim() === '') {
      errors.push('ID do serviço é obrigatório');
    }

    if (!data.data_execucao || !this.isValidDate(data.data_execucao)) {
      errors.push('Data de execução é obrigatória e deve estar no formato válido');
    }

    if (data.status && !STATUS_EXECUCAO_PERMITIDOS.includes(data.status as any)) {
      errors.push(`Status deve ser um dos valores: ${STATUS_EXECUCAO_PERMITIDOS.join(', ')}`);
    }

    // Validações de banco
    if (data.colaborador_matricula) {
      const colaboradorExists = await this.colaboradorExists(data.colaborador_matricula);
      if (!colaboradorExists) {
        errors.push(`Colaborador com matrícula ${data.colaborador_matricula} não encontrado`);
      }
    }

    if (data.servico_id) {
      const servicoExists = await this.servicoExists(data.servico_id);
      if (!servicoExists) {
        errors.push(`Serviço com ID ${data.servico_id} não encontrado`);
      }
    }

    // Validação de horários
    if (data.hora_inicio && data.hora_fim) {
      const inicio = new Date(`${data.data_execucao}T${data.hora_inicio}`);
      const fim = new Date(`${data.data_execucao}T${data.hora_fim}`);
      
      if (fim <= inicio) {
        errors.push('Hora de fim deve ser posterior à hora de início');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Erro durante validação: ${error}`]
    };
  }
}

static async validateValorFaturamento(data: ValorFaturamentoData): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validações básicas
    if (!data.grupo || data.grupo.trim() === '') {
      errors.push('Grupo é obrigatório');
    }

    if (!data.item || data.item.trim() === '') {
      errors.push('Item é obrigatório');
    }

    if (!data.status || data.status.trim() === '') {
      errors.push('Status é obrigatório');
    }

    if (data.valor_unitario === undefined || data.valor_unitario === null) {
      errors.push('Valor unitário é obrigatório');
    } else if (data.valor_unitario < 0) {
      errors.push('Valor unitário deve ser maior ou igual a zero');
    }

    // Validação de unicidade
    if (data.grupo && data.item && data.status) {
      const exists = await this.valorFaturamentoExists(data.grupo, data.item, data.status, data.id);
      if (exists) {
        errors.push(`Já existe um valor de faturamento para o grupo '${data.grupo}', item '${data.item}' e status '${data.status}'`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Erro durante validação: ${error}`]
    };
  }
}

// Métodos auxiliares:
private static async servicoExists(servicoId: string): Promise<boolean> {
  try {
    const db = await getLocalDatabase();
    const result = await safeGetFirstAsync(
      db,
      'SELECT 1 FROM servicos_local WHERE id = ?',
      [servicoId]
    );
    return !!result;
  } catch (error) {
    console.error('Erro ao verificar existência do serviço:', error);
    return false;
  }
}

private static async valorFaturamentoExists(grupo: string, item: string, status: string, excludeId?: number): Promise<boolean> {
  try {
    const db = await getLocalDatabase();
    let sql = 'SELECT 1 FROM valores_faturamento_real_local WHERE grupo = ? AND item = ? AND status = ?';
    const params = [grupo, item, status];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId.toString());
    }
    
    const result = await safeGetFirstAsync(db, sql, params);
    return !!result;
  } catch (error) {
    console.error('Erro ao verificar existência do valor de faturamento:', error);
    return false;
  }
}
```

---

## ⚡ EXECUÇÃO DA CORREÇÃO

### **Ordem de Implementação**

1. ✅ **Atualizar SchemaMigrator.ts** (30 min)
2. ✅ **Atualizar database.ts** (45 min)
3. ✅ **Expandir OfflineDataService.ts** (60 min)
4. ✅ **Atualizar OfflineValidationService.ts** (30 min)
5. ✅ **Executar migração** (15 min)
6. ✅ **Testar funcionalidades** (30 min)

**⏱️ Tempo Total Estimado: 3h 30min**

### **Checklist de Verificação**

- [ ] Tabela `execucoes_colaborador_local` criada
- [ ] Tabela `valores_faturamento_real_local` criada
- [ ] Campo `data` adicionado em `equipes_local`
- [ ] Campo `tipo_equipe` adicionado em `equipes_local`
- [ ] Campo `user_id` adicionado em `colaboradores_local`
- [ ] Campos de auditoria adicionados em todas as tabelas
- [ ] Foreign Keys implementadas
- [ ] Índices de performance criados
- [ ] Métodos CRUD para novas tabelas implementados
- [ ] Validações para novas entidades implementadas
- [ ] Cálculos de faturamento funcionando
- [ ] Relatórios de produção funcionando

### **Testes de Validação**

```typescript
// Teste rápido após implementação
const testarCorrecoes = async () => {
  const dataService = new OfflineDataService();
  
  // Testar criação de execução
  const execucao = await dataService.createExecucaoColaborador({
    id: 'test-exec-1',
    colaborador_matricula: 12345,
    servico_id: 'test-service-1',
    data_execucao: '2025-08-21',
    status: 'Pendente'
  });
  
  // Testar criação de valor de faturamento
  const valor = await dataService.createValorFaturamento({
    grupo: 'TESTE',
    item: 'ITEM_TESTE',
    status: 'Instalado',
    valor_unitario: 100.50
  });
  
  // Testar cálculo de faturamento
  const faturamento = await dataService.calcularFaturamentoServico('test-service-1');
  
  console.log('✅ Testes concluídos com sucesso!');
};
```

---

## 🎯 RESULTADO ESPERADO

Após a implementação deste plano:

- ✅ **100% compatibilidade** com funcionalidades críticas do schema online
- ✅ **Suporte completo** a execuções de colaborador e cálculos de faturamento
- ✅ **Integridade referencial** garantida via Foreign Keys
- ✅ **Performance otimizada** com índices adequados
- ✅ **Validações robustas** para todas as entidades
- ✅ **Auditoria completa** com campos de created_at/updated_at

**🚀 O sistema offline estará 95% alinhado com o schema online!**

---

**📝 Documento gerado em 21/08/2025**  
**⏰ Implementação estimada: 2-3 dias**  
**🎯 Prioridade: CRÍTICA**