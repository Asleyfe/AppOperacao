import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator
} from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { OfflineDataService } from '../../services/offline/OfflineDataService';
import { NetworkService } from '../../services/offline/NetworkService';
import { SyncService } from '../../services/offline/syncService';

/**
 * 🧪 Painel de Testes Offline
 * 
 * Este componente fornece uma interface visual para testar cenários offline
 * diretamente no aplicativo, sem necessidade de comandos externos.
 * 
 * Funcionalidades:
 * - Monitoramento de estado da rede
 * - Simulação de operações offline
 * - Controle de sincronização
 * - Visualização de dados pendentes
 * - Criação de dados de teste
 * 
 * Para usar: Adicione este componente em uma tela de debug ou desenvolvimento
 */

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  timestamp: Date;
}

interface PendingData {
  servicos: number;
  headers: number;
  historico: number;
  total: number;
}

export const OfflineTestPanel: React.FC = () => {
  // Estados do componente
  const [isTestMode, setIsTestMode] = useState(false);
  const [pendingData, setPendingData] = useState<PendingData>({
    servicos: 0,
    headers: 0,
    historico: 0,
    total: 0
  });
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Hook de status da rede
  const { isConnected, isSyncing } = useNetworkStatus();

  /**
   * Atualiza contadores de dados pendentes
   */
  const updatePendingData = async () => {
    try {
      const servicosPendentes = await OfflineDataService.getServicosPendentes();
      const headersPendentes = await OfflineDataService.getHeadersPendentes();
      const historicoPendente = await OfflineDataService.getHistoricoPendente();

      const newPendingData = {
        servicos: servicosPendentes.length,
        headers: headersPendentes.length,
        historico: historicoPendente.length,
        total: servicosPendentes.length + headersPendentes.length + historicoPendente.length
      };

      setPendingData(newPendingData);
    } catch (error) {
      console.error('Erro ao atualizar dados pendentes:', error);
    }
  };

  /**
   * Adiciona resultado de teste
   */
  const addTestResult = (name: string, status: TestResult['status'], message?: string) => {
    const result: TestResult = {
      id: Date.now().toString(),
      name,
      status,
      message,
      timestamp: new Date()
    };

    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Manter apenas os 10 últimos
  };

  /**
   * Cria dados de teste offline
   */
  const createTestData = async () => {
    setIsRunningTest(true);
    addTestResult('Criando dados de teste', 'running');

    try {
      // Criar serviço de teste
      const testServico = {
        equipe_id: 1,
        data_planejada: new Date().toISOString().split('T')[0],
        descricao: `Teste offline - ${new Date().toLocaleTimeString()}`,
        status: 'Planejado' as const,
        created_offline: true
      };

      const servico = await OfflineDataService.createServico(testServico);
      
      // Criar cabeçalho de teste
      const testHeader = {
        servico_id: servico.id,
        km_inicial: Math.floor(Math.random() * 1000) + 1000,
        km_final: Math.floor(Math.random() * 1000) + 1500,
        status_servico: 'Iniciado' as const
      };

      await OfflineDataService.createServicoHeader(testHeader);

      // Criar histórico de teste
      const testHistorico = {
        colaborador_matricula: '12345',
        turno: 'Manhã' as const,
        data: new Date().toISOString().split('T')[0],
        atividade: `Teste offline realizado às ${new Date().toLocaleTimeString()}`
      };

      await OfflineDataService.createHistoricoTurno(testHistorico);

      addTestResult('Criando dados de teste', 'success', 'Serviço, cabeçalho e histórico criados');
      await updatePendingData();

    } catch (error) {
      addTestResult('Criando dados de teste', 'error', error.message);
    } finally {
      setIsRunningTest(false);
    }
  };

  /**
   * Força sincronização manual
   */
  const forceSyncronization = async () => {
    if (!isConnected) {
      Alert.alert('Sem Conexão', 'Conecte-se à internet para sincronizar');
      return;
    }

    setIsRunningTest(true);
    addTestResult('Sincronização manual', 'running');

    try {
      await NetworkService.syncAfterLogin();
      setLastSyncTime(new Date());
      addTestResult('Sincronização manual', 'success', 'Dados sincronizados com sucesso');
      await updatePendingData();

    } catch (error) {
      addTestResult('Sincronização manual', 'error', error.message);
    } finally {
      setIsRunningTest(false);
    }
  };

  /**
   * Simula cenário de teste completo
   */
  const runFullScenario = async () => {
    setIsRunningTest(true);
    addTestResult('Cenário completo', 'running');

    try {
      // 1. Criar dados offline
      await createTestData();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Tentar sincronizar (se online)
      if (isConnected) {
        await forceSyncronization();
      }

      addTestResult('Cenário completo', 'success', 'Cenário executado com sucesso');

    } catch (error) {
      addTestResult('Cenário completo', 'error', error.message);
    } finally {
      setIsRunningTest(false);
    }
  };

  /**
   * Limpa dados de teste
   */
  const clearTestData = async () => {
    Alert.alert(
      'Limpar Dados de Teste',
      'Isso removerá todos os dados criados offline. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await OfflineDataService.clearOfflineData();
              addTestResult('Limpeza de dados', 'success', 'Dados offline removidos');
              await updatePendingData();
            } catch (error) {
              addTestResult('Limpeza de dados', 'error', error.message);
            }
          }
        }
      ]
    );
  };

  // Atualizar dados pendentes periodicamente
  useEffect(() => {
    updatePendingData();
    const interval = setInterval(updatePendingData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Renderização do status da rede
  const renderNetworkStatus = () => (
    <View style={styles.statusContainer}>
      <Text style={styles.sectionTitle}>📡 Status da Rede</Text>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Conectado:</Text>
        <Text style={[styles.statusValue, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
          {isConnected ? '✅ Online' : '❌ Offline'}
        </Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Sincronizando:</Text>
        <Text style={[styles.statusValue, { color: isSyncing ? '#FF9800' : '#757575' }]}>
          {isSyncing ? '🔄 Sim' : '⏸️ Não'}
        </Text>
      </View>
      {lastSyncTime && (
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Última Sync:</Text>
          <Text style={styles.statusValue}>
            {lastSyncTime.toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  );

  // Renderização dos dados pendentes
  const renderPendingData = () => (
    <View style={styles.pendingContainer}>
      <Text style={styles.sectionTitle}>⏳ Dados Pendentes</Text>
      <View style={styles.pendingGrid}>
        <View style={styles.pendingItem}>
          <Text style={styles.pendingNumber}>{pendingData.servicos}</Text>
          <Text style={styles.pendingLabel}>Serviços</Text>
        </View>
        <View style={styles.pendingItem}>
          <Text style={styles.pendingNumber}>{pendingData.headers}</Text>
          <Text style={styles.pendingLabel}>Cabeçalhos</Text>
        </View>
        <View style={styles.pendingItem}>
          <Text style={styles.pendingNumber}>{pendingData.historico}</Text>
          <Text style={styles.pendingLabel}>Histórico</Text>
        </View>
        <View style={[styles.pendingItem, styles.pendingTotal]}>
          <Text style={[styles.pendingNumber, styles.totalNumber]}>{pendingData.total}</Text>
          <Text style={[styles.pendingLabel, styles.totalLabel]}>Total</Text>
        </View>
      </View>
    </View>
  );

  // Renderização dos controles de teste
  const renderTestControls = () => (
    <View style={styles.controlsContainer}>
      <Text style={styles.sectionTitle}>🧪 Controles de Teste</Text>
      
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Modo de Teste:</Text>
        <Switch
          value={isTestMode}
          onValueChange={setIsTestMode}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isTestMode ? '#f5dd4b' : '#f4f3f4'}
        />
      </View>

      {isTestMode && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={createTestData}
            disabled={isRunningTest}
          >
            <Text style={styles.buttonText}>📝 Criar Dados de Teste</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={forceSyncronization}
            disabled={isRunningTest || !isConnected}
          >
            <Text style={styles.buttonText}>🔄 Forçar Sincronização</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.accentButton]}
            onPress={runFullScenario}
            disabled={isRunningTest}
          >
            <Text style={styles.buttonText}>🎯 Cenário Completo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={clearTestData}
            disabled={isRunningTest}
          >
            <Text style={styles.buttonText}>🗑️ Limpar Dados</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Renderização dos resultados de teste
  const renderTestResults = () => (
    <View style={styles.resultsContainer}>
      <Text style={styles.sectionTitle}>📊 Resultados dos Testes</Text>
      {testResults.length === 0 ? (
        <Text style={styles.noResults}>Nenhum teste executado ainda</Text>
      ) : (
        testResults.map(result => (
          <View key={result.id} style={styles.resultItem}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultName}>{result.name}</Text>
              <Text style={styles.resultTime}>
                {result.timestamp.toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.resultStatus}>
              <Text style={[styles.statusBadge, styles[`status${result.status}`]]}>
                {result.status === 'pending' && '⏳'}
                {result.status === 'running' && '🔄'}
                {result.status === 'success' && '✅'}
                {result.status === 'error' && '❌'}
                {' '}{result.status.toUpperCase()}
              </Text>
              {result.message && (
                <Text style={styles.resultMessage}>{result.message}</Text>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Painel de Testes Offline</Text>
        <Text style={styles.subtitle}>Ferramenta de desenvolvimento para testes offline</Text>
      </View>

      {renderNetworkStatus()}
      {renderPendingData()}
      {renderTestControls()}
      {renderTestResults()}

      {isRunningTest && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Executando teste...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pendingContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pendingItem: {
    width: '48%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  pendingTotal: {
    backgroundColor: '#e3f2fd',
    width: '100%',
  },
  pendingNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  totalNumber: {
    fontSize: 28,
    color: '#1976D2',
  },
  pendingLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  controlsContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  buttonsContainer: {
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  accentButton: {
    backgroundColor: '#FF9800',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultsContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  resultTime: {
    fontSize: 12,
    color: '#666',
  },
  resultStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  statuspending: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },
  statusrunning: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
  },
  statussuccess: {
    backgroundColor: '#E8F5E8',
    color: '#388E3C',
  },
  statuserror: {
    backgroundColor: '#FFEBEE',
    color: '#D32F2F',
  },
  resultMessage: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
});

export default OfflineTestPanel;