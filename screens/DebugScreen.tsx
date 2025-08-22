import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Alert
} from 'react-native';
import { OfflineTestPanel } from '../components/debug/OfflineTestPanel';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * 🛠️ Tela de Debug e Desenvolvimento
 * 
 * Esta tela fornece acesso às ferramentas de desenvolvimento e debug,
 * incluindo o painel de testes offline.
 * 
 * Funcionalidades:
 * - Painel de testes offline
 * - Informações do sistema
 * - Ferramentas de debug
 * - Configurações de desenvolvimento
 * 
 * Para usar:
 * 1. Adicione esta tela às suas rotas de navegação
 * 2. Acesse apenas em modo de desenvolvimento
 * 3. Use para testar cenários offline
 */

export const DebugScreen: React.FC = () => {
  const [showOfflinePanel, setShowOfflinePanel] = useState(false);
  const { isConnected, isSyncing } = useNetworkStatus();

  /**
   * Mostra informações do sistema
   */
  const showSystemInfo = () => {
    const systemInfo = {
      'Modo': __DEV__ ? 'Desenvolvimento' : 'Produção',
      'Plataforma': Platform.OS,
      'Versão do App': '1.0.0', // Pegar do package.json
      'Conexão': isConnected ? 'Online' : 'Offline',
      'Sincronizando': isSyncing ? 'Sim' : 'Não'
    };

    const message = Object.entries(systemInfo)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    Alert.alert('Informações do Sistema', message);
  };

  /**
   * Limpa cache e dados temporários
   */
  const clearCache = () => {
    Alert.alert(
      'Limpar Cache',
      'Isso removerá dados temporários e cache. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Implementar limpeza de cache
              // await AsyncStorage.clear();
              Alert.alert('Sucesso', 'Cache limpo com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao limpar cache: ' + error.message);
            }
          }
        }
      ]
    );
  };

  /**
   * Força sincronização completa
   */
  const forceFullSync = () => {
    if (!isConnected) {
      Alert.alert('Sem Conexão', 'Conecte-se à internet para sincronizar');
      return;
    }

    Alert.alert(
      'Sincronização Completa',
      'Isso forçará uma sincronização completa de todos os dados. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sincronizar',
          onPress: async () => {
            try {
              // Implementar sincronização completa
              // await NetworkService.fullSync();
              Alert.alert('Sucesso', 'Sincronização iniciada!');
            } catch (error) {
              Alert.alert('Erro', 'Falha na sincronização: ' + error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛠️ Ferramentas de Debug</Text>
        <Text style={styles.subtitle}>Ambiente de Desenvolvimento</Text>
      </View>

      <View style={styles.content}>
        {/* Status da Conexão */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>📡 Status da Conexão</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Estado:</Text>
            <Text style={[styles.statusValue, { color: isConnected ? '#4CAF50' : '#F44336' }]}>
              {isConnected ? '🟢 Online' : '🔴 Offline'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Sincronização:</Text>
            <Text style={[styles.statusValue, { color: isSyncing ? '#FF9800' : '#757575' }]}>
              {isSyncing ? '🔄 Ativa' : '⏸️ Inativa'}
            </Text>
          </View>
        </View>

        {/* Ferramentas de Teste */}
        <View style={styles.toolsCard}>
          <Text style={styles.cardTitle}>🧪 Ferramentas de Teste</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => setShowOfflinePanel(true)}
          >
            <Text style={styles.buttonText}>🧪 Painel de Testes Offline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={showSystemInfo}
          >
            <Text style={styles.buttonText}>ℹ️ Informações do Sistema</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.accentButton]}
            onPress={forceFullSync}
            disabled={!isConnected}
          >
            <Text style={styles.buttonText}>🔄 Sincronização Completa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={clearCache}
          >
            <Text style={styles.buttonText}>🗑️ Limpar Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Informações Rápidas */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>📋 Informações Rápidas</Text>
          <Text style={styles.infoText}>• Use o painel de testes para simular cenários offline</Text>
          <Text style={styles.infoText}>• Scripts NPM disponíveis para automação</Text>
          <Text style={styles.infoText}>• Logs são salvos automaticamente</Text>
          <Text style={styles.infoText}>• Consulte README_TESTES_OFFLINE.md para mais detalhes</Text>
        </View>

        {/* Aviso de Desenvolvimento */}
        {__DEV__ && (
          <View style={styles.devWarning}>
            <Text style={styles.warningText}>⚠️ Modo de Desenvolvimento Ativo</Text>
            <Text style={styles.warningSubtext}>
              Esta tela não estará disponível em produção
            </Text>
          </View>
        )}
      </View>

      {/* Modal do Painel de Testes Offline */}
      <Modal
        visible={showOfflinePanel}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOfflinePanel(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Testes Offline</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowOfflinePanel(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <OfflineTestPanel />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toolsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
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
  warningButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  devWarning: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 5,
  },
  warningSubtext: {
    fontSize: 14,
    color: '#F57C00',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2196F3',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DebugScreen;