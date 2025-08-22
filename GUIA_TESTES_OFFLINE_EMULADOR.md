# 🧪 Guia Completo para Testes Offline no Emulador

## 📋 Índice
1. [Configuração do Ambiente](#configuração-do-ambiente)
2. [Simulação de Cenários Offline](#simulação-de-cenários-offline)
3. [Scripts de Teste](#scripts-de-teste)
4. [Estratégias de Teste](#estratégias-de-teste)
5. [Debugging e Monitoramento](#debugging-e-monitoramento)
6. [Casos de Teste Específicos](#casos-de-teste-específicos)

---

## 🔧 Configuração do Ambiente

### 1. Preparação do Emulador

#### Android Studio (Emulador Android)
```bash
# Iniciar emulador com configurações específicas
emulator -avd Pixel_7_API_34 -netdelay none -netspeed full

# Para simular rede lenta
emulator -avd Pixel_7_API_34 -netdelay gprs -netspeed edge
```

#### iOS Simulator
```bash
# Abrir simulador
open -a Simulator

# Configurar condições de rede via Device > Network Link Conditioner
```

### 2. Configuração do Projeto

#### Variáveis de Ambiente para Teste
```bash
# .env.test
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
EXPO_PUBLIC_TEST_MODE=true
EXPO_PUBLIC_OFFLINE_MODE=true
```

---

## 📱 Simulação de Cenários Offline

### 1. Métodos de Simulação de Rede

#### A. Via Emulador Android
```bash
# Desabilitar dados móveis e WiFi
adb shell svc wifi disable
adb shell svc data disable

# Reabilitar conexão
adb shell svc wifi enable
adb shell svc data enable

# Simular rede instável
adb shell settings put global airplane_mode_on 1
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true
```

#### B. Via iOS Simulator
1. **Device > Network Link Conditioner**
2. Escolher perfis:
   - `100% Loss` (completamente offline)
   - `3G` (rede lenta)
   - `Edge` (rede muito lenta)
   - `Custom` (configuração personalizada)

#### C. Via Código (Programaticamente)
```typescript
// services/offline/TestNetworkService.ts
export class TestNetworkService {
  private static forceOffline = false;
  
  static setOfflineMode(offline: boolean) {
    this.forceOffline = offline;
    // Simular mudança de estado
    NetInfo.fetch().then(() => {
      // Disparar listeners com estado simulado
    });
  }
  
  static isOffline(): boolean {
    return this.forceOffline;
  }
}
```

### 2. Proxy para Interceptar Requisições

#### Configuração do Charles Proxy
```bash
# Instalar Charles Proxy
# Configurar proxy no emulador: 10.0.2.2:8888 (Android)
# Configurar proxy no iOS: IP_DO_MAC:8888

# Simular falhas de rede:
# Tools > Map Remote > Fail (para simular timeout)
# Tools > Throttle Settings (para simular rede lenta)
```

---

## 🧪 Scripts de Teste

### 1. Script de Teste Automatizado

```typescript
// __tests__/offline-scenarios.test.ts
import { TestNetworkService } from '../services/offline/TestNetworkService';
import { OfflineDataService } from '../services/offline/OfflineDataService';
import { SyncService } from '../services/offline/syncService';

describe('Cenários Offline', () => {
  beforeEach(() => {
    // Reset do estado
    TestNetworkService.setOfflineMode(false);
  });
  
  test('Deve funcionar completamente offline', async () => {
    // 1. Simular modo offline
    TestNetworkService.setOfflineMode(true);
    
    // 2. Tentar operações CRUD
    const servico = await OfflineDataService.createServico({
      equipe_id: 1,
      data_planejada: '2025-01-20',
      descricao: 'Teste offline',
      status: 'Planejado'
    });
    
    // 3. Verificar se foi salvo localmente
    expect(servico.synced).toBe(0);
    
    // 4. Simular volta da conexão
    TestNetworkService.setOfflineMode(false);
    
    // 5. Executar sincronização
    const syncService = new SyncService();
    await syncService.syncToServer();
    
    // 6. Verificar se foi sincronizado
    const servicoAtualizado = await OfflineDataService.getServico(servico.id);
    expect(servicoAtualizado.synced).toBe(1);
  });
  
  test('Deve lidar com conflitos de sincronização', async () => {
    // Implementar teste de conflitos
  });
  
  test('Deve manter fila de operações offline', async () => {
    // Implementar teste de fila
  });
});
```

### 2. Script de Teste Manual

```typescript
// scripts/test-offline-manual.ts
import { OfflineDataService } from '../services/offline/OfflineDataService';
import { NetworkService } from '../services/offline/NetworkService';

export class ManualOfflineTest {
  static async runFullOfflineTest() {
    console.log('🧪 Iniciando teste offline manual...');
    
    try {
      // 1. Verificar estado inicial
      await this.checkInitialState();
      
      // 2. Criar dados offline
      await this.createOfflineData();
      
      // 3. Simular reconexão
      await this.simulateReconnection();
      
      // 4. Verificar sincronização
      await this.verifySynchronization();
      
      console.log('✅ Teste offline concluído com sucesso!');
    } catch (error) {
      console.error('❌ Erro no teste offline:', error);
    }
  }
  
  private static async checkInitialState() {
    console.log('📊 Verificando estado inicial...');
    const servicos = await OfflineDataService.getServicos();
    console.log(`Serviços locais: ${servicos.length}`);
  }
  
  private static async createOfflineData() {
    console.log('📝 Criando dados offline...');
    
    // Criar serviço
    const servico = await OfflineDataService.createServico({
      equipe_id: 1,
      data_planejada: new Date().toISOString().split('T')[0],
      descricao: 'Teste offline - ' + Date.now(),
      status: 'Planejado'
    });
    
    console.log(`Serviço criado offline: ${servico.id}`);
    
    // Criar cabeçalho
    const header = await OfflineDataService.createServicoHeader({
      servico_id: servico.id,
      km_inicial: 100,
      km_final: 150,
      status_servico: 'Em Andamento'
    });
    
    console.log(`Cabeçalho criado offline: ${header.id}`);
  }
  
  private static async simulateReconnection() {
    console.log('🔄 Simulando reconexão...');
    // Aqui você pode implementar lógica para simular reconexão
    await NetworkService.syncAfterLogin();
  }
  
  private static async verifySynchronization() {
    console.log('🔍 Verificando sincronização...');
    const servicosNaoSincronizados = await OfflineDataService.getServicosPendentes();
    console.log(`Serviços pendentes: ${servicosNaoSincronizados.length}`);
  }
}
```

---

## 🎯 Estratégias de Teste

### 1. Cenários de Teste Essenciais

#### A. Operações CRUD Offline
- ✅ Criar serviços offline
- ✅ Editar serviços existentes offline
- ✅ Visualizar dados locais
- ✅ Deletar registros offline

#### B. Sincronização
- ✅ Sincronização após reconexão
- ✅ Resolução de conflitos
- ✅ Sincronização parcial (falha de rede)
- ✅ Sincronização em lote

#### C. Estados de Rede
- ✅ Completamente offline
- ✅ Rede instável (intermitente)
- ✅ Rede lenta
- ✅ Timeout de requisições

### 2. Matriz de Testes

| Cenário | Ação | Resultado Esperado | Status |
|---------|------|-------------------|--------|
| Offline Total | Criar Serviço | Salvo localmente (synced=0) | ⏳ |
| Offline Total | Editar Serviço | Atualizado localmente | ⏳ |
| Reconexão | Sync Automática | Dados enviados ao servidor | ⏳ |
| Conflito | Edição Simultânea | Conflito detectado e resolvido | ⏳ |
| Rede Lenta | Timeout | Operação mantida na fila | ⏳ |

---

## 🔍 Debugging e Monitoramento

### 1. Logs Detalhados

```typescript
// services/offline/DebugLogger.ts
export class DebugLogger {
  static logNetworkState(state: any) {
    console.log('🌐 [NETWORK]', {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      timestamp: new Date().toISOString()
    });
  }
  
  static logOfflineOperation(operation: string, data: any) {
    console.log('💾 [OFFLINE]', {
      operation,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  static logSyncOperation(operation: string, result: any) {
    console.log('🔄 [SYNC]', {
      operation,
      result,
      timestamp: new Date().toISOString()
    });
  }
}
```

### 2. Monitoramento de Estado

```typescript
// components/OfflineDebugPanel.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { OfflineDataService } from '../services/offline/OfflineDataService';

export const OfflineDebugPanel = () => {
  const { isConnected, isSyncing } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  
  useEffect(() => {
    const updatePendingCount = async () => {
      const pending = await OfflineDataService.getPendingOperationsCount();
      setPendingCount(pending);
    };
    
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View style={{ padding: 10, backgroundColor: '#f0f0f0' }}>
      <Text>🌐 Conectado: {isConnected ? '✅' : '❌'}</Text>
      <Text>🔄 Sincronizando: {isSyncing ? '✅' : '❌'}</Text>
      <Text>⏳ Operações Pendentes: {pendingCount}</Text>
      
      <Button 
        title="Forçar Sincronização" 
        onPress={() => NetworkService.syncAfterLogin()}
      />
    </View>
  );
};
```

---

## 📋 Casos de Teste Específicos

### 1. Teste de Criação de Serviço Offline

```bash
# Passos manuais:
1. Desabilitar WiFi/dados no emulador
2. Abrir app e fazer login (dados em cache)
3. Ir para tela de serviços
4. Criar novo serviço
5. Verificar se aparece indicador "não sincronizado"
6. Reabilitar conexão
7. Verificar sincronização automática
```

### 2. Teste de Conflito de Dados

```bash
# Cenário:
1. Dispositivo A e B com mesmo serviço
2. A fica offline, B permanece online
3. Ambos editam o mesmo serviço
4. A volta online
5. Verificar resolução de conflito
```

### 3. Teste de Rede Instável

```bash
# Simular:
1. Ativar/desativar WiFi rapidamente
2. Usar Network Link Conditioner (iOS)
3. Usar Charles Proxy com throttling
4. Verificar comportamento da fila de sincronização
```

---

## 🚀 Scripts Úteis

### 1. Script de Reset do Banco Local

```bash
# scripts/reset-local-db.sh
#!/bin/bash
echo "🗑️ Limpando banco de dados local..."
adb shell run-as com.seu.app rm -rf databases/
echo "✅ Banco local limpo!"
```

### 2. Script de Monitoramento de Logs

```bash
# scripts/monitor-logs.sh
#!/bin/bash
echo "📱 Monitorando logs do app..."
adb logcat | grep -E "(OFFLINE|SYNC|NETWORK)"
```

### 3. Script de Teste Completo

```bash
# scripts/run-offline-tests.sh
#!/bin/bash
echo "🧪 Executando testes offline..."

# 1. Executar testes unitários
npm test -- --testPathPattern=offline

# 2. Executar testes de integração
npm run test:integration

# 3. Gerar relatório de cobertura
npm run test:coverage

echo "✅ Testes concluídos!"
```

---

## 📚 Recursos Adicionais

### Ferramentas Recomendadas
- **Charles Proxy**: Interceptação e simulação de rede
- **Flipper**: Debugging avançado para React Native
- **React Native Debugger**: Debug específico para RN
- **Reactotron**: Monitoramento de estado e ações

### Documentação Útil
- [NetInfo Documentation](https://github.com/react-native-netinfo/react-native-netinfo)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Android Emulator Network](https://developer.android.com/studio/run/emulator-networking)
- [iOS Simulator Network](https://developer.apple.com/documentation/xcode/simulating-network-conditions)

---

## ⚠️ Considerações Importantes

1. **Performance**: Testes offline podem ser mais lentos
2. **Estado**: Sempre limpar estado entre testes
3. **Timing**: Aguardar operações assíncronas completarem
4. **Logs**: Manter logs detalhados para debugging
5. **Cobertura**: Testar todos os cenários críticos

---

*Este guia deve ser atualizado conforme novos cenários de teste são identificados.*