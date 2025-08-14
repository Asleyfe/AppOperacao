# Checklist de Implementação - Funcionalidades Offline para Encarregado

## 📋 Visão Geral

Este documento detalha o plano de implementação para permitir que as funcionalidades do encarregado funcionem offline e sincronizem automaticamente quando houver conexão de rede.

### 🎯 Objetivo
Permitir que encarregados continuem trabalhando em campo mesmo sem conexão de internet, garantindo que todos os dados sejam sincronizados quando a conectividade for restaurada.

### 🏗️ Arquitetura Atual
- **Frontend**: React Native com Expo
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Armazenamento**: Apenas online via Supabase
- **Funcionalidades do Encarregado**: Visualizar serviços, preencher checklists, gerenciar equipes

### 📊 Status da Implementação

**✅ IMPLEMENTADO (9/10 itens - 90% concluído)**:
- ✅ Estrutura de armazenamento local (SQLite)
- ✅ Sistema de sincronização de dados
- ✅ Serviços offline para funcionalidades do encarregado
- ✅ Sistema de fila para operações pendentes
- ✅ Detecção de conectividade de rede
- ✅ Hook useNetworkStatus criado
- ✅ Sistema de resolução de conflitos
- ✅ Adaptar componentes existentes para funcionar offline
- ✅ Implementar indicadores visuais de status offline/online

**🔄 PENDENTE (1/10 itens - 10% restante)**:
- ⏳ Implementar testes para funcionalidades offline

**📁 Arquivos Criados**:
- `services/offline/database.ts` - Estrutura SQLite
- `services/offline/OfflineDataService.ts` - Serviços offline
- `services/offline/syncService.ts` - Sincronização
- `services/offline/QueueService.ts` - Fila de operações
- `services/offline/NetworkService.ts` - Detecção de rede
- `services/offline/ConflictResolver.ts` - Resolução de conflitos
- `services/offline/IDataService.ts` - Interface comum
- `hooks/useNetworkStatus.ts` - Hook de status de rede

**📝 Arquivos Adaptados**:
- `app/(tabs)/servicos.tsx` - Adaptado para funcionar offline com indicadores visuais
- `components/ChecklistModal.tsx` - Adaptado para salvar dados offline com indicadores de status

---

## 🚀 Fase 1: Infraestrutura Base (Alta Prioridade)

### ✅ 1. Criar estrutura de armazenamento local (SQLite) - **IMPLEMENTADO** ✅

**🎯 Objetivo**: Implementar banco de dados local que espelhe as tabelas principais do Supabase

**💡 Ideia por trás**: 
- SQLite é leve, confiável e funciona offline
- Permite consultas SQL complexas como no backend
- Mantém consistência de dados entre online/offline

**🔧 Como implementar**:

1. **Instalar dependências**:
   ```bash
   npm install expo-sqlite react-native-sqlite-storage
   ```

2. **Criar estrutura do banco local** (`services/offline/database.ts`):
   ```typescript
   import * as SQLite from 'expo-sqlite';
   
   const db = SQLite.openDatabase('app_offline.db');
   
   // Tabelas principais para funcionalidades do encarregado
   const createTables = () => {
     // Colaboradores
     db.transaction(tx => {
       tx.executeSql(`
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
       tx.executeSql(`
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
       tx.executeSql(`
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
       tx.executeSql(`
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
       tx.executeSql(`
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
     });
   };
   ```

3. **Campos de controle adicionados**:
   - `synced`: Indica se o registro foi sincronizado
   - `last_modified`: Timestamp da última modificação
   - Permite rastreamento de mudanças e conflitos

---

### ✅ 2. Implementar sistema de sincronização de dados - **IMPLEMENTADO** ✅

**🎯 Objetivo**: Criar mecanismo bidirecional de sincronização entre SQLite local e Supabase

**💡 Ideia por trás**: 
- Sincronização incremental (apenas dados modificados)
- Controle de conflitos por timestamp
- Prioridade para dados mais recentes

**🔧 Como implementar**:

1. **Criar serviço de sincronização** (`services/offline/syncService.ts`):
   ```typescript
   import { supabase } from '../supabase';
   import { getLocalDatabase } from './database';
   
   class SyncService {
     // Sincronizar dados do servidor para local
     async syncFromServer() {
       try {
         // Buscar dados do Supabase
         const { data: colaboradores } = await supabase
           .from('colaboradores')
           .select('*');
         
         const { data: equipes } = await supabase
           .from('equipes')
           .select('*');
         
         // Inserir/atualizar no SQLite local
         const db = getLocalDatabase();
         
         colaboradores?.forEach(colaborador => {
           db.transaction(tx => {
             tx.executeSql(
               `INSERT OR REPLACE INTO colaboradores_local 
                (id, nome, funcao, matricula, supervisor_id, coordenador_id, synced) 
                VALUES (?, ?, ?, ?, ?, ?, 1)`,
               [colaborador.id, colaborador.nome, colaborador.funcao, 
                colaborador.matricula, colaborador.supervisor_id, colaborador.coordenador_id]
             );
           });
         });
         
         // Repetir para outras tabelas...
       } catch (error) {
         console.error('Erro na sincronização do servidor:', error);
       }
     }
     
     // Sincronizar dados locais para servidor
     async syncToServer() {
       try {
         const db = getLocalDatabase();
         
         // Buscar registros não sincronizados
         db.transaction(tx => {
           tx.executeSql(
             'SELECT * FROM servicos_local WHERE synced = 0',
             [],
             async (_, { rows }) => {
               for (let i = 0; i < rows.length; i++) {
                 const servico = rows.item(i);
                 
                 // Enviar para Supabase
                 const { error } = await supabase
                   .from('servicos')
                   .upsert({
                     id: servico.id,
                     equipe_id: servico.equipe_id,
                     data_planejada: servico.data_planejada,
                     status: servico.status,
                     // ... outros campos
                   });
                 
                 if (!error) {
                   // Marcar como sincronizado
                   tx.executeSql(
                     'UPDATE servicos_local SET synced = 1 WHERE id = ?',
                     [servico.id]
                   );
                 }
               }
             }
           );
         });
       } catch (error) {
         console.error('Erro na sincronização para servidor:', error);
       }
     }
   }
   ```

2. **Estratégia de sincronização**:
   - **Pull**: Baixar dados do servidor quando online
   - **Push**: Enviar dados locais modificados
   - **Incremental**: Apenas dados modificados desde última sync
   - **Automática**: Executar em background quando detectar conexão

---

### ✅ 3. Criar serviços offline para funcionalidades do encarregado - **IMPLEMENTADO** ✅

**🎯 Objetivo**: Adaptar `api.ts` para funcionar com dados locais quando offline

**💡 Ideia por trás**: 
- Padrão Repository: mesma interface, diferentes implementações
- Transparência: componentes não sabem se estão online/offline
- Fallback automático: tenta online, se falhar usa offline

**🔧 Como implementar**:

1. **Criar interface comum** (`services/offline/IDataService.ts`):
   ```typescript
   export interface IDataService {
     getServicos(): Promise<any[]>;
     getEquipes(): Promise<any[]>;
     getGrupoItens(): Promise<any[]>;
     updateServico(id: string, data: any): Promise<void>;
     createGiServico(data: any): Promise<void>;
     // ... outras operações
   }
   ```

2. **Implementação offline** (`services/offline/OfflineDataService.ts`):
   ```typescript
   import { IDataService } from './IDataService';
   import { getLocalDatabase } from './database';
   
   export class OfflineDataService implements IDataService {
     async getServicos(): Promise<any[]> {
       return new Promise((resolve, reject) => {
         const db = getLocalDatabase();
         db.transaction(tx => {
           tx.executeSql(
             `SELECT s.*, e.nome as equipe_nome 
              FROM servicos_local s 
              LEFT JOIN equipes_local e ON s.equipe_id = e.id 
              WHERE DATE(s.data_planejada) = DATE('now')`,
             [],
             (_, { rows }) => {
               const servicos = [];
               for (let i = 0; i < rows.length; i++) {
                 servicos.push(rows.item(i));
               }
               resolve(servicos);
             },
             (_, error) => reject(error)
           );
         });
       });
     }
     
     async updateServico(id: string, data: any): Promise<void> {
       return new Promise((resolve, reject) => {
         const db = getLocalDatabase();
         db.transaction(tx => {
           tx.executeSql(
             `UPDATE servicos_local 
              SET status = ?, inicio_execucao = ?, synced = 0, last_modified = CURRENT_TIMESTAMP 
              WHERE id = ?`,
             [data.status, data.inicio_execucao, id],
             () => resolve(),
             (_, error) => reject(error)
           );
         });
       });
     }
     
     // ... outras implementações
   }
   ```

3. **Adaptação do api.ts**:
   ```typescript
   import { NetworkService } from './offline/NetworkService';
   import { OfflineDataService } from './offline/OfflineDataService';
   import { OnlineDataService } from './OnlineDataService';
   
   class ApiService {
     private offlineService = new OfflineDataService();
     private onlineService = new OnlineDataService();
     
     async getServicos() {
       if (await NetworkService.isConnected()) {
         try {
           return await this.onlineService.getServicos();
         } catch (error) {
           // Fallback para offline
           return await this.offlineService.getServicos();
         }
       } else {
         return await this.offlineService.getServicos();
       }
     }
     
     // ... outros métodos com mesma lógica
   }
   ```

---

### ✅ 4. Criar sistema de fila para operações pendentes - **IMPLEMENTADO** ✅

**🎯 Objetivo**: Armazenar operações CRUD realizadas offline para sincronizar posteriormente

**💡 Ideia por trás**: 
- Garantir que nenhuma operação seja perdida
- Executar operações na ordem correta
- Retry automático em caso de falha

**🔧 Como implementar**:

1. **Tabela de fila de operações**:
   ```sql
   CREATE TABLE IF NOT EXISTS operation_queue (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     operation_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
     table_name TEXT NOT NULL,
     record_id TEXT NOT NULL,
     data TEXT, -- JSON com os dados
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     attempts INTEGER DEFAULT 0,
     max_attempts INTEGER DEFAULT 3,
     status TEXT DEFAULT 'PENDING' -- 'PENDING', 'SUCCESS', 'FAILED'
   );
   ```

2. **Serviço de fila** (`services/offline/QueueService.ts`):
   ```typescript
   export class QueueService {
     // Adicionar operação à fila
     static async addOperation(type: string, table: string, recordId: string, data: any) {
       const db = getLocalDatabase();
       db.transaction(tx => {
         tx.executeSql(
           `INSERT INTO operation_queue (operation_type, table_name, record_id, data) 
            VALUES (?, ?, ?, ?)`,
           [type, table, recordId, JSON.stringify(data)]
         );
       });
     }
     
     // Processar fila quando online
     static async processQueue() {
       const db = getLocalDatabase();
       db.transaction(tx => {
         tx.executeSql(
           `SELECT * FROM operation_queue WHERE status = 'PENDING' ORDER BY created_at`,
           [],
           async (_, { rows }) => {
             for (let i = 0; i < rows.length; i++) {
               const operation = rows.item(i);
               await this.executeOperation(operation);
             }
           }
         );
       });
     }
     
     private static async executeOperation(operation: any) {
       try {
         const data = JSON.parse(operation.data);
         
         switch (operation.operation_type) {
           case 'UPDATE':
             await supabase
               .from(operation.table_name)
               .update(data)
               .eq('id', operation.record_id);
             break;
           case 'CREATE':
             await supabase
               .from(operation.table_name)
               .insert(data);
             break;
           // ... outros casos
         }
         
         // Marcar como sucesso
         this.updateOperationStatus(operation.id, 'SUCCESS');
       } catch (error) {
         // Incrementar tentativas
         this.incrementAttempts(operation.id);
       }
     }
   }
   ```

---

## 🔄 Fase 2: Funcionalidades Core (Prioridade Média)

### ✅ 5. Implementar detecção de conectividade de rede - **IMPLEMENTADO** ✅

**🎯 Objetivo**: Monitorar status da rede e alternar automaticamente entre modo online/offline

**💡 Ideia por trás**: 
- Detecção em tempo real de mudanças na conectividade
- Sincronização automática quando conexão é restaurada
- Feedback visual para o usuário

**🔧 Como implementar**:

1. **Instalar dependência**:
   ```bash
   npm install @react-native-async-storage/async-storage @react-native-community/netinfo
   ```

2. **Serviço de rede** (`services/offline/NetworkService.ts`):
   ```typescript
   import NetInfo from '@react-native-community/netinfo';
   import { SyncService } from './SyncService';
   
   export class NetworkService {
     private static listeners: ((isConnected: boolean) => void)[] = [];
     
     static async initialize() {
       // Monitorar mudanças na conectividade
       NetInfo.addEventListener(state => {
         const isConnected = state.isConnected && state.isInternetReachable;
         
         if (isConnected) {
           // Quando voltar online, sincronizar automaticamente
           this.onConnectionRestored();
         }
         
         // Notificar listeners
         this.listeners.forEach(listener => listener(isConnected));
       });
     }
     
     static async isConnected(): Promise<boolean> {
       const state = await NetInfo.fetch();
       return state.isConnected && state.isInternetReachable;
     }
     
     static addListener(callback: (isConnected: boolean) => void) {
       this.listeners.push(callback);
     }
     
     private static async onConnectionRestored() {
       try {
         // Sincronizar dados
         const syncService = new SyncService();
         await syncService.syncToServer(); // Enviar dados locais
         await syncService.syncFromServer(); // Baixar dados atualizados
         
         // Processar fila de operações
         await QueueService.processQueue();
       } catch (error) {
         console.error('Erro na sincronização automática:', error);
       }
     }
   }
   ```

3. **Hook personalizado** (`hooks/useNetworkStatus.ts`):
   ```typescript
   import { useState, useEffect } from 'react';
   import { NetworkService } from '../services/offline/NetworkService';
   
   export const useNetworkStatus = () => {
     const [isConnected, setIsConnected] = useState(true);
     const [isSyncing, setIsSyncing] = useState(false);
     
     useEffect(() => {
       NetworkService.addListener((connected) => {
         setIsConnected(connected);
         if (connected) {
           setIsSyncing(true);
           // Simular tempo de sincronização
           setTimeout(() => setIsSyncing(false), 3000);
         }
       });
     }, []);
     
     return { isConnected, isSyncing };
   };
   ```

---

### ✅ 6. Adaptar componentes existentes para funcionar offline - **IMPLEMENTADO** ✅

**🎯 Objetivo**: Modificar `servicos.tsx`, `ChecklistModal.tsx` e `EditTeamModal.tsx` para usar os novos serviços offline

**💡 Ideia por trás**: 
- Mínima alteração nos componentes existentes
- Transparência total para o usuário
- Feedback visual do status de conectividade

**🔧 Como implementar**:

1. **Atualizar servicos.tsx**:
   ```typescript
   import { useNetworkStatus } from '../hooks/useNetworkStatus';
   import { api } from '../services/api'; // Já adaptado para offline
   
   export default function ServicosScreen() {
     const { isConnected, isSyncing } = useNetworkStatus();
     const [servicos, setServicos] = useState([]);
     
     // Indicador visual de status
     const renderStatusIndicator = () => (
       <View style={styles.statusBar}>
         <Text style={[styles.statusText, { color: isConnected ? 'green' : 'orange' }]}>
           {isConnected ? '🟢 Online' : '🟠 Offline'}
         </Text>
         {isSyncing && <Text style={styles.syncText}>Sincronizando...</Text>}
       </View>
     );
     
     const loadServicos = async () => {
       try {
         // api.getServicos() já funciona offline automaticamente
         const data = await api.getServicos();
         setServicos(data);
       } catch (error) {
         Alert.alert('Erro', 'Não foi possível carregar os serviços');
       }
     };
     
     const updateServicoStatus = async (id: string, status: string) => {
       try {
         // Funciona offline, será sincronizado quando voltar online
         await api.updateServico(id, { 
           status, 
           inicio_execucao: new Date().toISOString() 
         });
         
         // Atualizar lista local
         loadServicos();
         
         if (!isConnected) {
           Alert.alert('Offline', 'Alteração salva localmente. Será sincronizada quando houver conexão.');
         }
       } catch (error) {
         Alert.alert('Erro', 'Não foi possível atualizar o serviço');
       }
     };
     
     return (
       <View style={styles.container}>
         {renderStatusIndicator()}
         {/* Resto do componente permanece igual */}
       </View>
     );
   }
   ```

2. **Atualizar ChecklistModal.tsx**:
   ```typescript
   export default function ChecklistModal({ servicoId, visible, onClose }) {
     const { isConnected } = useNetworkStatus();
     
     const saveChecklist = async (itemData) => {
       try {
         // Salvar no banco local (funciona offline)
         await api.createGiServico({
           id_servico: servicoId,
           id_item: itemData.id_item,
           quantidade: itemData.quantidade,
           status: itemData.status,
           n_serie: itemData.n_serie
         });
         
         if (!isConnected) {
           Alert.alert(
             'Salvo Offline', 
             'Checklist salvo localmente. Será sincronizado quando houver conexão.',
             [{ text: 'OK' }]
           );
         }
         
         onClose();
       } catch (error) {
         Alert.alert('Erro', 'Não foi possível salvar o checklist');
       }
     };
     
     // Resto do componente permanece praticamente igual
   }
   ```

---

### ✅ 7. Criar sistema de resolução de conflitos - **IMPLEMENTADO** ✅

**🎯 Objetivo**: Gerenciar conflitos quando dados locais e remotos divergem durante sincronização

**💡 Ideia por trás**: 
- Estratégia "Last Write Wins" (última escrita vence)
- Backup de dados conflitantes
- Log de conflitos para auditoria

**🔧 Como implementar**:

1. **Serviço de resolução de conflitos** (`services/offline/ConflictResolver.ts`):
   ```typescript
   export class ConflictResolver {
     static async resolveConflict(localRecord: any, remoteRecord: any, tableName: string) {
       // Comparar timestamps
       const localTime = new Date(localRecord.last_modified);
       const remoteTime = new Date(remoteRecord.updated_at);
       
       if (localTime > remoteTime) {
         // Dados locais são mais recentes
         return {
           resolution: 'USE_LOCAL',
           winner: localRecord,
           loser: remoteRecord
         };
       } else {
         // Dados remotos são mais recentes
         return {
           resolution: 'USE_REMOTE',
           winner: remoteRecord,
           loser: localRecord
         };
       }
     }
     
     static async logConflict(conflict: any) {
       // Salvar log do conflito para auditoria
       const db = getLocalDatabase();
       db.transaction(tx => {
         tx.executeSql(
           `INSERT INTO conflict_log (table_name, record_id, resolution, local_data, remote_data, resolved_at) 
            VALUES (?, ?, ?, ?, ?, ?)`,
           [
             conflict.tableName,
             conflict.recordId,
             conflict.resolution,
             JSON.stringify(conflict.loser),
             JSON.stringify(conflict.winner),
             new Date().toISOString()
           ]
         );
       });
     }
   }
   ```

---

## 🎨 Fase 3: Interface e Experiência (Baixa Prioridade)

### ✅ 8. Implementar indicadores visuais de status offline/online - **IMPLEMENTADO** ✅

**🎯 Objetivo**: Mostrar claramente ao usuário o status de conectividade e sincronização

**💡 Ideia por trás**: 
- Transparência total sobre o estado da aplicação
- Confiança do usuário no sistema offline
- Feedback visual de operações em andamento

**🔧 Como implementar**:

1. **Componente de status** (`components/NetworkStatusBar.tsx`):
   ```typescript
   import React from 'react';
   import { View, Text, StyleSheet } from 'react-native';
   import { useNetworkStatus } from '../hooks/useNetworkStatus';
   
   export const NetworkStatusBar = () => {
     const { isConnected, isSyncing } = useNetworkStatus();
     
     if (isSyncing) {
       return (
         <View style={[styles.statusBar, styles.syncing]}>
           <Text style={styles.statusText}>🔄 Sincronizando dados...</Text>
         </View>
       );
     }
     
     if (!isConnected) {
       return (
         <View style={[styles.statusBar, styles.offline]}>
           <Text style={styles.statusText}>📱 Modo Offline - Dados serão sincronizados quando houver conexão</Text>
         </View>
       );
     }
     
     return null; // Não mostrar nada quando online
   };
   
   const styles = StyleSheet.create({
     statusBar: {
       padding: 8,
       alignItems: 'center',
     },
     offline: {
       backgroundColor: '#FFF3CD',
       borderColor: '#FFEAA7',
     },
     syncing: {
       backgroundColor: '#D1ECF1',
       borderColor: '#BEE5EB',
     },
     statusText: {
       fontSize: 12,
       fontWeight: '500',
     },
   });
   ```

2. **Indicadores nos botões**:
   ```typescript
   const SaveButton = ({ onPress, isOffline }) => (
     <TouchableOpacity 
       style={[styles.button, isOffline && styles.offlineButton]} 
       onPress={onPress}
     >
       <Text style={styles.buttonText}>
         {isOffline ? '💾 Salvar Offline' : '☁️ Salvar'}
       </Text>
     </TouchableOpacity>
   );
   ```

---

### ⏳ 9. Implementar testes para funcionalidades offline - **PENDENTE** ⏳

**🎯 Objetivo**: Garantir que todas as funcionalidades offline funcionem corretamente

**💡 Ideia por trás**: 
- Confiabilidade do sistema offline
- Detecção precoce de problemas
- Cobertura de cenários críticos

**🔧 Como implementar**:

1. **Testes unitários** (`__tests__/offline/`):
   ```typescript
   // OfflineDataService.test.ts
   describe('OfflineDataService', () => {
     test('deve salvar serviço offline', async () => {
       const service = new OfflineDataService();
       const servicoData = {
         id: 'test-123',
         status: 'Em Execução',
         inicio_execucao: new Date().toISOString()
       };
       
       await service.updateServico('test-123', servicoData);
       
       const servicos = await service.getServicos();
       const servicoSalvo = servicos.find(s => s.id === 'test-123');
       
       expect(servicoSalvo.status).toBe('Em Execução');
       expect(servicoSalvo.synced).toBe(false);
     });
   });
   ```

2. **Testes de integração**:
   ```typescript
   // SyncService.test.ts
   describe('SyncService', () => {
     test('deve sincronizar dados locais para servidor', async () => {
       // Simular dados offline
       const offlineService = new OfflineDataService();
       await offlineService.updateServico('test-123', { status: 'Finalizado' });
       
       // Sincronizar
       const syncService = new SyncService();
       await syncService.syncToServer();
       
       // Verificar se foi enviado para o servidor
       const { data } = await supabase
         .from('servicos')
         .select('*')
         .eq('id', 'test-123')
         .single();
       
       expect(data.status).toBe('Finalizado');
     });
   });
   ```

---

## 📱 Implementação Prática

### Ordem de Implementação Recomendada:

1. **Semana 1**: Estrutura SQLite + Detecção de rede
2. **Semana 2**: Serviços offline + Sistema de fila
3. **Semana 3**: Sincronização + Resolução de conflitos
4. **Semana 4**: Adaptação de componentes + Testes
5. **Semana 5**: Indicadores visuais + Refinamentos

### Arquivos a serem criados/modificados:

**Novos arquivos**:
- `services/offline/database.ts`
- `services/offline/SyncService.ts`
- `services/offline/OfflineDataService.ts`
- `services/offline/NetworkService.ts`
- `services/offline/QueueService.ts`
- `services/offline/ConflictResolver.ts`
- `hooks/useNetworkStatus.ts`
- `components/NetworkStatusBar.tsx`

**Arquivos a modificar**:
- `services/api.ts` (adicionar lógica offline)
- `app/(tabs)/servicos.tsx` (indicadores de status)
- `components/ChecklistModal.tsx` (feedback offline)
- `components/EditTeamModal.tsx` (suporte offline)

### Dependências necessárias:
```json
{
  "expo-sqlite": "~11.3.3",
  "@react-native-community/netinfo": "9.3.10",
  "@react-native-async-storage/async-storage": "1.18.2"
}
```

---

## 🎯 Benefícios Esperados

1. **Produtividade**: Encarregados podem trabalhar sem interrupções
2. **Confiabilidade**: Dados nunca são perdidos
3. **Experiência**: Interface responsiva mesmo offline
4. **Sincronização**: Dados sempre atualizados quando online
5. **Transparência**: Usuário sempre sabe o status da aplicação

---

## 🔍 Considerações Técnicas

- **Armazenamento**: SQLite suporta até 281TB (mais que suficiente)
- **Performance**: Consultas locais são muito mais rápidas
- **Bateria**: Menos uso de rede = maior duração da bateria
- **Segurança**: Dados locais seguem as mesmas regras de RLS
- **Backup**: Dados sempre existem em dois locais (local + remoto)

Este plano garante que o encarregado tenha uma experiência fluida e confiável, independente da conectividade de rede.