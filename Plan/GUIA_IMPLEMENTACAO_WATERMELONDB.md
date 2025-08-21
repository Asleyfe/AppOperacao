# Guia de Implementação: WatermelonDB

## 📋 Visão Geral

Este documento detalha o processo completo de migração da implementação atual (SQLite nativo) para **WatermelonDB**, incluindo todos os passos necessários, configurações e adaptações de código.

⚠️ **ATENÇÃO**: Este guia é apenas para referência. Conforme análise em `ANALISE_WATERMELONDB.md`, **NÃO é recomendado** migrar para WatermelonDB neste projeto.

## 🎯 Pré-requisitos

- React Native com Expo
- Node.js 16+
- Conhecimento em TypeScript
- Backup completo do projeto atual
- Tempo estimado: **40-60 horas**

---

## 📦 Fase 1: Instalação e Configuração Inicial

### Passo 1.1: Instalar Dependências

```bash
# Instalar WatermelonDB e dependências
npm install @nozbe/watermelondb @nozbe/with-observables

# Para Expo (managed workflow)
expo install expo-sqlite

# Para React Native CLI (bare workflow)
npm install react-native-sqlite-2
```

### Passo 1.2: Configurar Metro Bundler

Editar `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adicionar suporte para WatermelonDB
config.resolver.alias = {
  ...config.resolver.alias,
  '@nozbe/watermelondb/DatabaseProvider': '@nozbe/watermelondb/DatabaseProvider/index.native.js',
  '@nozbe/watermelondb/QueryDescription': '@nozbe/watermelondb/QueryDescription/index.native.js',
  '@nozbe/watermelondb/Collection/helpers': '@nozbe/watermelondb/Collection/helpers/index.native.js',
};

config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
```

### Passo 1.3: Configurar Babel

Editar `babel.config.js`:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-proposal-decorators', { legacy: true },
      '@babel/plugin-proposal-class-properties',
    ],
  };
};
```

---

## 🗄️ Fase 2: Definição do Schema

### Passo 2.1: Criar Schema Base

Criar `database/schema.ts`:

```typescript
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Colaboradores
    tableSchema({
      name: 'colaboradores',
      columns: [
        { name: 'nome', type: 'string' },
        { name: 'funcao', type: 'string' },
        { name: 'matricula', type: 'number', isIndexed: true },
        { name: 'supervisor_id', type: 'number', isOptional: true },
        { name: 'coordenador_id', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    
    // Equipes
    tableSchema({
      name: 'equipes',
      columns: [
        { name: 'nome', type: 'string' },
        { name: 'prefixo', type: 'string', isIndexed: true },
        { name: 'tipo_equipe', type: 'string' },
        { name: 'status_composicao', type: 'string' },
        { name: 'encarregado_matricula', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    
    // Serviços
    tableSchema({
      name: 'servicos',
      columns: [
        { name: 'equipe_id', type: 'number' },
        { name: 'data_planejada', type: 'string' },
        { name: 'descricao', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'prioridade', type: 'string' },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    
    // Checklists
    tableSchema({
      name: 'checklists',
      columns: [
        { name: 'servico_id', type: 'string' },
        { name: 'item_id', type: 'string' },
        { name: 'descricao', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'observacoes', type: 'string', isOptional: true },
        { name: 'colaborador_matricula', type: 'number' },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    
    // Fila de operações
    tableSchema({
      name: 'operation_queue',
      columns: [
        { name: 'operation_type', type: 'string' },
        { name: 'table_name', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'data', type: 'string' }, // JSON serializado
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
  ]
});
```

---

## 🏗️ Fase 3: Criação dos Models

### Passo 3.1: Model Base

Criar `database/models/BaseModel.ts`:

```typescript
import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export class BaseModel extends Model {
  @field('synced') synced!: boolean;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  
  // Marcar como não sincronizado quando modificado
  async markAsModified() {
    await this.update(record => {
      record.synced = false;
      record.updatedAt = new Date();
    });
  }
}
```

### Passo 3.2: Model Colaborador

Criar `database/models/Colaborador.ts`:

```typescript
import { field } from '@nozbe/watermelondb/decorators';
import { BaseModel } from './BaseModel';

export class Colaborador extends BaseModel {
  static table = 'colaboradores';
  
  @field('nome') nome!: string;
  @field('funcao') funcao!: string;
  @field('matricula') matricula!: number;
  @field('supervisor_id') supervisorId?: number;
  @field('coordenador_id') coordenadorId?: number;
  
  // Métodos de negócio
  get isEncarregado(): boolean {
    return this.funcao === 'Encarregado';
  }
  
  get isSupervisor(): boolean {
    return this.funcao === 'Supervisor';
  }
}
```

### Passo 3.3: Model Equipe

Criar `database/models/Equipe.ts`:

```typescript
import { field, relation } from '@nozbe/watermelondb/decorators';
import { BaseModel } from './BaseModel';
import { Colaborador } from './Colaborador';

export class Equipe extends BaseModel {
  static table = 'equipes';
  
  @field('nome') nome!: string;
  @field('prefixo') prefixo!: string;
  @field('tipo_equipe') tipoEquipe!: string;
  @field('status_composicao') statusComposicao!: string;
  @field('encarregado_matricula') encarregadoMatricula?: number;
  
  // Relacionamentos
  @relation('colaboradores', 'encarregado_matricula') encarregado?: Colaborador;
}
```

### Passo 3.4: Demais Models

Criar models similares para:
- `database/models/Servico.ts`
- `database/models/Checklist.ts`
- `database/models/OperationQueue.ts`

---

## 🔧 Fase 4: Configuração do Database

### Passo 4.1: Database Provider

Criar `database/index.ts`:

```typescript
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { Colaborador } from './models/Colaborador';
import { Equipe } from './models/Equipe';
import { Servico } from './models/Servico';
import { Checklist } from './models/Checklist';
import { OperationQueue } from './models/OperationQueue';

// Configurar adapter
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'AppOperacao',
  migrations: [],
});

// Criar database
export const database = new Database({
  adapter,
  modelClasses: [
    Colaborador,
    Equipe,
    Servico,
    Checklist,
    OperationQueue,
  ],
});
```

### Passo 4.2: Provider React

Editar `app/_layout.tsx`:

```typescript
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from '@/database';

export default function RootLayout() {
  return (
    <DatabaseProvider database={database}>
      {/* Resto da aplicação */}
    </DatabaseProvider>
  );
}
```

---

## 🔄 Fase 5: Migração dos Serviços

### Passo 5.1: Novo Offline Data Service

Criar `services/watermelon/OfflineDataService.ts`:

```typescript
import { database } from '@/database';
import { Colaborador } from '@/database/models/Colaborador';
import { Equipe } from '@/database/models/Equipe';
import { Q } from '@nozbe/watermelondb';

export class WatermelonOfflineDataService {
  // Colaboradores
  static async getColaboradores() {
    return await database.collections
      .get<Colaborador>('colaboradores')
      .query()
      .fetch();
  }
  
  static async getColaboradorByMatricula(matricula: number) {
    return await database.collections
      .get<Colaborador>('colaboradores')
      .query(Q.where('matricula', matricula))
      .fetchOne();
  }
  
  static async createColaborador(data: any) {
    return await database.write(async () => {
      return await database.collections
        .get<Colaborador>('colaboradores')
        .create(colaborador => {
          colaborador.nome = data.nome;
          colaborador.funcao = data.funcao;
          colaborador.matricula = data.matricula;
          colaborador.supervisorId = data.supervisor_id;
          colaborador.coordenadorId = data.coordenador_id;
          colaborador.synced = false;
        });
    });
  }
  
  static async updateColaborador(id: string, data: any) {
    const colaborador = await database.collections
      .get<Colaborador>('colaboradores')
      .find(id);
      
    return await database.write(async () => {
      return await colaborador.update(record => {
        record.nome = data.nome || record.nome;
        record.funcao = data.funcao || record.funcao;
        record.synced = false;
      });
    });
  }
  
  // Equipes
  static async getEquipes() {
    return await database.collections
      .get<Equipe>('equipes')
      .query()
      .fetch();
  }
  
  static async getEquipesByEncarregado(matricula: number) {
    return await database.collections
      .get<Equipe>('equipes')
      .query(Q.where('encarregado_matricula', matricula))
      .fetch();
  }
  
  // Métodos similares para Serviços, Checklists, etc.
}
```

### Passo 5.2: Novo Sync Service

Criar `services/watermelon/SyncService.ts`:

```typescript
import { database } from '@/database';
import { supabase } from '@/services/supabase';
import { Colaborador } from '@/database/models/Colaborador';
import { Q } from '@nozbe/watermelondb';

export class WatermelonSyncService {
  // Sincronizar dados do servidor para local
  static async syncFromServer() {
    try {
      // Buscar colaboradores do Supabase
      const { data: colaboradoresData } = await supabase
        .from('colaboradores')
        .select('*');
        
      if (colaboradoresData) {
        await database.write(async () => {
          for (const item of colaboradoresData) {
            // Verificar se já existe
            const existing = await database.collections
              .get<Colaborador>('colaboradores')
              .query(Q.where('matricula', item.matricula))
              .fetch();
              
            if (existing.length === 0) {
              // Criar novo
              await database.collections
                .get<Colaborador>('colaboradores')
                .create(colaborador => {
                  colaborador.nome = item.nome;
                  colaborador.funcao = item.funcao;
                  colaborador.matricula = item.matricula;
                  colaborador.supervisorId = item.supervisor_id;
                  colaborador.coordenadorId = item.coordenador_id;
                  colaborador.synced = true;
                });
            } else {
              // Atualizar existente
              const colaborador = existing[0];
              await colaborador.update(record => {
                record.nome = item.nome;
                record.funcao = item.funcao;
                record.synced = true;
              });
            }
          }
        });
      }
      
      // Repetir para equipes, serviços, etc.
      
    } catch (error) {
      console.error('Erro na sincronização:', error);
      throw error;
    }
  }
  
  // Sincronizar dados locais para servidor
  static async syncToServer() {
    try {
      // Buscar registros não sincronizados
      const unsyncedColaboradores = await database.collections
        .get<Colaborador>('colaboradores')
        .query(Q.where('synced', false))
        .fetch();
        
      for (const colaborador of unsyncedColaboradores) {
        // Enviar para Supabase
        const { error } = await supabase
          .from('colaboradores')
          .upsert({
            id: colaborador.id,
            nome: colaborador.nome,
            funcao: colaborador.funcao,
            matricula: colaborador.matricula,
            supervisor_id: colaborador.supervisorId,
            coordenador_id: colaborador.coordenadorId,
          });
          
        if (!error) {
          // Marcar como sincronizado
          await database.write(async () => {
            await colaborador.update(record => {
              record.synced = true;
            });
          });
        }
      }
      
      // Repetir para outras tabelas
      
    } catch (error) {
      console.error('Erro ao enviar dados:', error);
      throw error;
    }
  }
  
  // Sincronização completa
  static async fullSync() {
    await this.syncFromServer();
    await this.syncToServer();
  }
}
```

---

## 🎣 Fase 6: Hooks e Componentes Reativos

### Passo 6.1: Hook para Colaboradores

Criar `hooks/useColaboradores.ts`:

```typescript
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { useMemo } from 'react';
import { Colaborador } from '@/database/models/Colaborador';
import { Q } from '@nozbe/watermelondb';

export function useColaboradores() {
  const database = useDatabase();
  
  const colaboradoresCollection = useMemo(
    () => database.collections.get<Colaborador>('colaboradores'),
    [database]
  );
  
  return colaboradoresCollection.query().observe();
}

export function useColaboradoresByFuncao(funcao: string) {
  const database = useDatabase();
  
  const colaboradoresCollection = useMemo(
    () => database.collections.get<Colaborador>('colaboradores'),
    [database]
  );
  
  return colaboradoresCollection
    .query(Q.where('funcao', funcao))
    .observe();
}
```

### Passo 6.2: Componente Reativo

Adaptar `app/(tabs)/servicos.tsx`:

```typescript
import React from 'react';
import { View, FlatList } from 'react-native';
import { useColaboradores } from '@/hooks/useColaboradores';
import withObservables from '@nozbe/with-observables';

function ServicosScreen({ colaboradores }) {
  return (
    <View>
      <FlatList
        data={colaboradores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>{item.nome} - {item.funcao}</Text>
        )}
      />
    </View>
  );
}

// HOC para observar mudanças
const enhance = withObservables([], () => ({
  colaboradores: database.collections
    .get('colaboradores')
    .query()
    .observe(),
}));

export default enhance(ServicosScreen);
```

---

## 🔄 Fase 7: Migrations e Versionamento

### Passo 7.1: Sistema de Migrations

Criar `database/migrations.ts`:

```typescript
import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // Versão 1 -> 2: Adicionar nova coluna
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'colaboradores',
          columns: [
            { name: 'telefone', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    
    // Versão 2 -> 3: Nova tabela
    {
      toVersion: 3,
      steps: [
        createTable({
          name: 'historico_turnos',
          columns: [
            { name: 'colaborador_id', type: 'string' },
            { name: 'data_inicio', type: 'number' },
            { name: 'data_fim', type: 'number' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
```

### Passo 7.2: Atualizar Database Config

Editar `database/index.ts`:

```typescript
import { migrations } from './migrations';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'AppOperacao',
  migrations, // Adicionar migrations
});
```

---

## 🧪 Fase 8: Testes

### Passo 8.1: Setup de Testes

Criar `__tests__/watermelon/setup.ts`:

```typescript
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from '@/database/schema';
import { Colaborador } from '@/database/models/Colaborador';

export function createTestDatabase() {
  const adapter = new SQLiteAdapter({
    schema,
    dbName: 'test.db',
    migrations: [],
  });
  
  return new Database({
    adapter,
    modelClasses: [Colaborador],
  });
}
```

### Passo 8.2: Testes de Model

Criar `__tests__/watermelon/Colaborador.test.ts`:

```typescript
import { createTestDatabase } from './setup';
import { Colaborador } from '@/database/models/Colaborador';

describe('Colaborador Model', () => {
  let database;
  
  beforeEach(() => {
    database = createTestDatabase();
  });
  
  afterEach(async () => {
    await database.adapter.close();
  });
  
  it('should create colaborador', async () => {
    const colaborador = await database.write(async () => {
      return await database.collections
        .get<Colaborador>('colaboradores')
        .create(record => {
          record.nome = 'João Silva';
          record.funcao = 'Encarregado';
          record.matricula = 12345;
        });
    });
    
    expect(colaborador.nome).toBe('João Silva');
    expect(colaborador.isEncarregado).toBe(true);
  });
});
```

---

## 🚀 Fase 9: Deployment e Otimizações

### Passo 9.1: Configurações de Build

Editar `app.config.js`:

```javascript
export default {
  expo: {
    // ... outras configurações
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            enableProguardInReleaseBuilds: true,
            proguardFiles: ["proguard-rules.pro"],
          },
        },
      ],
    ],
  },
};
```

### Passo 9.2: Otimizações de Performance

```typescript
// Usar índices nas queries mais frequentes
const colaboradores = await database.collections
  .get<Colaborador>('colaboradores')
  .query(
    Q.where('funcao', 'Encarregado'),
    Q.sortBy('nome', Q.asc)
  )
  .fetch();

// Batch operations para melhor performance
await database.write(async () => {
  const batch = [];
  
  for (const item of items) {
    const record = colaboradoresCollection.prepareCreate(colaborador => {
      colaborador.nome = item.nome;
      colaborador.funcao = item.funcao;
    });
    batch.push(record);
  }
  
  await database.batch(...batch);
});
```

---

## 📋 Fase 10: Checklist de Migração

### ✅ Pré-migração
- [ ] Backup completo do projeto
- [ ] Testes da implementação atual funcionando
- [ ] Ambiente de desenvolvimento configurado
- [ ] Equipe treinada em WatermelonDB

### ✅ Durante a migração
- [ ] Instalar e configurar WatermelonDB
- [ ] Criar schema e models
- [ ] Migrar serviços offline
- [ ] Adaptar componentes para reatividade
- [ ] Implementar sistema de sync
- [ ] Criar testes abrangentes
- [ ] Testar em dispositivos reais

### ✅ Pós-migração
- [ ] Remover código SQLite antigo
- [ ] Otimizar performance
- [ ] Documentar nova arquitetura
- [ ] Treinar equipe de manutenção
- [ ] Monitorar performance em produção

---

## ⚠️ Riscos e Mitigações

### Riscos Identificados
1. **Perda de dados durante migração**
   - **Mitigação**: Backup completo + testes extensivos
   
2. **Performance pior que esperada**
   - **Mitigação**: Benchmarks antes/depois + otimizações
   
3. **Bugs em funcionalidades críticas**
   - **Mitigação**: Testes automatizados + rollback plan
   
4. **Incompatibilidade com Expo**
   - **Mitigação**: Testar em ambiente similar à produção

### Plano de Rollback
1. Manter branch com implementação SQLite atual
2. Scripts de migração reversa
3. Backup de dados antes da migração
4. Processo de deploy gradual (feature flags)

---

## 📊 Estimativas de Tempo

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| 1 | Instalação e configuração | 4-6 horas |
| 2-3 | Schema e Models | 8-12 horas |
| 4 | Database setup | 2-4 horas |
| 5 | Migração de serviços | 12-16 horas |
| 6 | Hooks e componentes | 6-8 horas |
| 7 | Migrations | 4-6 horas |
| 8 | Testes | 8-12 horas |
| 9-10 | Deploy e otimizações | 4-8 horas |
| **Total** | | **48-72 horas** |

---

## 🎯 Conclusão

Este guia fornece um roadmap completo para migração para WatermelonDB. No entanto, conforme análise detalhada em `ANALISE_WATERMELONDB.md`, **recomenda-se manter a implementação SQLite atual** devido ao:

- ✅ Sistema atual 90% implementado
- ❌ Alto custo de migração (48-72 horas)
- ❌ Riscos de introduzir bugs
- ❌ Sinais de abandono do WatermelonDB

**Recomendação final**: Usar este guia apenas como referência para projetos futuros iniciados do zero.

---

**Documento criado em:** Janeiro 2025  
**Versão:** 1.0  
**Status:** Guia de referência (não recomendado para este projeto)