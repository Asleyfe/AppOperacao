import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MapPin, Play, Square, CircleCheck as CheckCircle, Clock, TriangleAlert as AlertTriangle, Wifi, WifiOff } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/services/api';
import { OfflineDataService } from '@/services/offline/OfflineDataService';
import { Servico, Equipe } from '@/types/types';
import ChecklistModal from '@/components/ChecklistModal';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function ServicesScreen() {
  const { colaborador } = useAuth();
  const { isConnected, isSyncing } = useNetworkStatus();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [selectedServiceForChecklist, setSelectedServiceForChecklist] = useState<number | null>(null); // Changed from string to number
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Equipe | null>(null);
  const [offlineDataService] = useState(() => new OfflineDataService());

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (colaborador) {
      loadData();
    }
  }, [colaborador]);

  // Recarregar dados quando a sincronização for concluída
  useEffect(() => {
    if (colaborador && !isSyncing && isConnected) {
      console.log('🔄 [SYNC] Sincronização concluída, recarregando dados da tela de serviços');
      loadDataOffline(); // Forçar carregamento offline após sincronização
    }
  }, [isSyncing, colaborador]);

  const loadDataOffline = async () => {
    try {
      console.log('📱 [OFFLINE DEBUG] Forçando carregamento OFFLINE após sincronização');
      console.log('👤 [OFFLINE DEBUG] Colaborador logado:', colaborador?.matricula);
      console.log('📅 [OFFLINE DEBUG] Data de hoje:', today);
      
      // Usar o novo método que filtra por encarregado
      const servicosData = await offlineDataService.getServicosByEncarregado(
        colaborador?.matricula || '',
        today
      );
      
      const equipesData = await offlineDataService.getEquipesByEncarregado(
        colaborador?.matricula || ''
      );
      
      console.log('📋 [OFFLINE DEBUG] Serviços do encarregado (offline):', servicosData.length);
      console.log('👥 [OFFLINE DEBUG] Equipes do encarregado (offline):', equipesData.length);
      
      // Find team for today with current logged user as encarregado (para compatibilidade)
      const teamToday = equipesData.find(
        (equipe: Equipe) => equipe.data === today && equipe.encarregadoMatricula === colaborador?.matricula
      );
      console.log('🎯 [OFFLINE DEBUG] Equipe do dia encontrada (offline):', teamToday);
      setCurrentTeam(teamToday || null);

      // Os serviços já vêm filtrados do método getServicosByEncarregado
      console.log('✅ [OFFLINE DEBUG] Serviços já filtrados (offline):', servicosData.length);
      console.log('📋 [OFFLINE DEBUG] Detalhes dos serviços (offline):', servicosData.map(s => ({
        id: s.id,
        numero: s.numero,
        status: s.status,
        dataPlanejada: s.dataPlanejada,
        encarregadoId: s.encarregadoId
      })));

      setServicos(servicosData);
    } catch (error) {
      console.error('❌ [OFFLINE DEBUG] Erro em loadDataOffline:', error);
      Alert.alert('Erro', 'Falha ao carregar dados offline. Verifique se os dados foram sincronizados anteriormente.');
    }
  };

  const loadData = async () => {
    try {
      console.log('📊 [OFFLINE DEBUG] Iniciando loadData');
      console.log('🌐 [OFFLINE DEBUG] Status da conexão:', isConnected);
      console.log('👤 [OFFLINE DEBUG] Colaborador logado:', colaborador?.matricula);
      console.log('📅 [OFFLINE DEBUG] Data de hoje:', today);
      
      if (isConnected) {
        console.log('🌐 [OFFLINE DEBUG] Carregando dados ONLINE');
        const [servicosData, equipesData] = await Promise.all([
          api.getServicos(),
          api.getEquipes()
        ]);
        
        console.log('📋 [OFFLINE DEBUG] Serviços recebidos (online):', servicosData.length);
        console.log('👥 [OFFLINE DEBUG] Equipes recebidas (online):', equipesData.length);
        
        // Find team for today with current logged user as encarregado (para compatibilidade)
        const teamToday = equipesData.find(
          (equipe: Equipe) => equipe.data === today && equipe.encarregadoMatricula === colaborador?.matricula
        );
        console.log('🎯 [OFFLINE DEBUG] Equipe do dia encontrada:', teamToday);
        setCurrentTeam(teamToday || null);

        // Filtrar serviços para hoje
        const todayServices = servicosData.filter(
          (servico: Servico) => servico.dataPlanejada === today
        );
        
        console.log('✅ [OFFLINE DEBUG] Serviços filtrados (online):', todayServices.length);
        console.log('📋 [OFFLINE DEBUG] Serviços filtrados (detalhes):', todayServices.map(s => ({
          id: s.id,
          status: s.status,
          dataPlanejada: s.dataPlanejada
        })));

        setServicos(todayServices);
      } else {
        console.log('📱 [OFFLINE DEBUG] Carregando dados OFFLINE');
        
        // Usar o novo método que filtra por encarregado
        const servicosData = await offlineDataService.getServicosByEncarregado(
          colaborador?.matricula || '',
          today
        );
        
        const equipesData = await offlineDataService.getEquipesByEncarregado(
          colaborador?.matricula || ''
        );
        
        console.log('📋 [OFFLINE DEBUG] Serviços do encarregado (offline):', servicosData.length);
        console.log('👥 [OFFLINE DEBUG] Equipes do encarregado (offline):', equipesData.length);
        
        // Find team for today with current logged user as encarregado (para compatibilidade)
        const teamToday = equipesData.find(
          (equipe: Equipe) => equipe.data === today && equipe.encarregadoMatricula === colaborador?.matricula
        );
        console.log('🎯 [OFFLINE DEBUG] Equipe do dia encontrada (offline):', teamToday);
        setCurrentTeam(teamToday || null);

        // Os serviços já vêm filtrados do método getServicosByEncarregado
        console.log('✅ [OFFLINE DEBUG] Serviços já filtrados (offline):', servicosData.length);
        console.log('📋 [OFFLINE DEBUG] Detalhes dos serviços (offline):', servicosData.map(s => ({
          id: s.id,
          numero: s.numero,
          status: s.status,
          dataPlanejada: s.dataPlanejada,
          encarregadoId: s.encarregadoId
        })));

        setServicos(servicosData);
      }
    } catch (error) {
      console.error('❌ [OFFLINE DEBUG] Erro em loadData:', error);
      const errorMessage = isConnected 
        ? 'Falha ao carregar dados do servidor'
        : 'Falha ao carregar dados offline. Verifique se os dados foram sincronizados anteriormente.';
      Alert.alert('Erro', errorMessage);
    }
  };

  const updateServiceStatus = async (
    servicoId: number, // Changed from string to number
    status: string, 
    timestampField?: string
  ) => {
    try {
      console.log('🔄 [OFFLINE DEBUG] Iniciando updateServiceStatus');
      console.log('📋 [OFFLINE DEBUG] Parâmetros recebidos:', {
        servicoId,
        status,
        timestampField,
        isConnected
      });

      // TODO: Implementar validação de turno iniciado no futuro
      // Verificar se o turno foi iniciado antes de permitir mudanças de status
      // Só aplicar esta validação para ações que iniciam um serviço
      /*
      if (status === 'Em Deslocamento' || (status === 'Aguardando Execução' && timestampField === 'fimDeslocamento')) {
        const servico = servicos.find(s => s.id === servicoId);
        if (servico && servico.equipePrefixo && colaborador) {
          try {
            const turnoExiste = await api.checkHistoricoTurnoExists({
              colaborador_matricula: colaborador.matricula,
              equipe_prefixo: servico.equipePrefixo,
              data_turno: today
            });
            
            if (!turnoExiste) {
              Alert.alert(
                'Turno Não Iniciado',
                'O serviço só pode ser iniciado após a confirmação do início do turno da equipe.'
              );
              return;
            }
          } catch (error) {
            console.error('Erro ao verificar histórico de turno:', error);
            Alert.alert('Erro', 'Não foi possível verificar o status do turno.');
            return;
          }
        }
      }
      */

      const updateData: any = { status };
      
      if (timestampField) {
        updateData.timestamps = {};
        
        // Criar timestamp com ajuste de fuso horário se necessário
        let timestamp;
        if (timestampField === 'fimExecucao') {
          // Adicionar 3 horas para ajustar ao fuso horário UTC do banco de dados
          const now = new Date();
          const adjustedTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // +3 horas
          timestamp = adjustedTime.toISOString();
          
          console.log('🕐 [TIMEZONE] Horário original:', now.toISOString());
          console.log('🕐 [TIMEZONE] Horário ajustado (+3h):', timestamp);
        } else {
          timestamp = new Date().toISOString();
        }
        
        updateData.timestamps[timestampField] = timestamp;
        
        // Preserve existing timestamps
        const currentService = servicos.find(s => s.id === servicoId);
        console.log('🔍 [OFFLINE DEBUG] Serviço atual encontrado:', currentService);
        
        if (currentService) {
          updateData.timestamps = {
            ...currentService.timestamps,
            [timestampField]: timestamp
          };
        }
      }

      console.log('📦 [OFFLINE DEBUG] Dados para atualização:', updateData);

      if (isConnected) {
        console.log('🌐 [OFFLINE DEBUG] Modo ONLINE - Atualizando no servidor');
        // Online: atualizar diretamente no servidor
        await api.updateServico(servicoId, updateData);
      } else {
        console.log('📱 [OFFLINE DEBUG] Modo OFFLINE - Atualizando localmente');
        // Offline: usar serviço offline (será sincronizado depois)
        await offlineDataService.updateServico(servicoId, updateData);
        console.log('✅ [OFFLINE DEBUG] Atualização offline concluída');
      }
      
      console.log('🔄 [OFFLINE DEBUG] Recarregando dados...');
      await loadData();
      console.log('✅ [OFFLINE DEBUG] Dados recarregados com sucesso');

    } catch (error) {
      console.error('❌ [OFFLINE DEBUG] Erro em updateServiceStatus:', error);
      const errorMessage = isConnected 
        ? 'Falha ao atualizar serviço no servidor'
        : 'Falha ao atualizar serviço offline. A alteração será sincronizada quando houver conexão.';
      Alert.alert('Erro', errorMessage);
    }
  };

  const handleChecklistComplete = async () => {
    if (selectedServiceForChecklist) {
      // A atualização do status já é feita dentro do ChecklistModal
      // Apenas recarregar os dados
      loadData();
    }
    setShowChecklistModal(false);
    setSelectedServiceForChecklist(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planejado': return '#6B7280';
      case 'Em Deslocamento': return '#F59E0B';
      case 'Aguardando Execução': return '#3B82F6';
      case 'Em Execução': return '#10B981';

      case 'Finalizado': return '#059669';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Planejado': return Clock;
      case 'Em Deslocamento': return MapPin;
      case 'Aguardando Execução': return AlertTriangle;
      case 'Em Execução': return Play;
      case 'Finalizado': return CheckCircle;
      default: return Clock;
    }
  };

  const getNextAction = (servico: Servico) => {
    switch (servico.status) {
      case 'Planejado':
        return {
          label: 'Iniciar Deslocamento',
          action: () => updateServiceStatus(servico.id, 'Em Deslocamento', 'inicioDeslocamento'),
          color: '#F59E0B'
        };
      case 'Em Deslocamento':
        return {
          label: 'Fim Deslocamento',
          action: () => updateServiceStatus(servico.id, 'Aguardando Execução', 'fimDeslocamento'),
          color: '#3B82F6'
        };
      case 'Aguardando Execução':
        return {
          label: 'Iniciar Execução',
          action: () => updateServiceStatus(servico.id, 'Em Execução', 'inicioExecucao'),
          color: '#10B981'
        };
      case 'Em Execução':
        return {
          label: 'Fim Execução',
          action: () => {
            setSelectedServiceForChecklist(servico.id);
    setShowChecklistModal(true);
          },
          color: '#059669'
        };

      default:
        return null;
    }
  };

  const renderServiceCard = (servico: Servico) => {
    const StatusIcon = getStatusIcon(servico.status);
    const nextAction = getNextAction(servico);

    return (
      <View key={servico.id} style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceId}>{servico.nota}</Text>
            <View style={styles.statusContainer}>
              <StatusIcon size={16} color={getStatusColor(servico.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(servico.status) }]}>
                {servico.status}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.serviceDescription}>{servico.descricao}</Text>

        {/* Timestamps */}
        <View style={styles.timestampsContainer}>
          {Object.entries(servico.timestamps).map(([key, value]) => {
            if (value) {
              const labels = {
                inicioDeslocamento: 'Início Deslocamento',
                fimDeslocamento: 'Fim Deslocamento',
                inicioExecucao: 'Início Execução',
                fimExecucao: 'Fim Execução'
              };
              
              return (
                <Text key={key} style={styles.timestampText}>
                  {labels[key as keyof typeof labels]}: {format(new Date(value), 'HH:mm')}
                </Text>
              );
            }
            return null;
          })}
        </View>

        {/* Action Button */}
        {nextAction && servico.status !== 'Finalizado' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: nextAction.color }]}
            onPress={nextAction.action}
          >
            <Text style={styles.actionButtonText}>{nextAction.label}</Text>
          </TouchableOpacity>
        )}

        {servico.status === 'Finalizado' && (
          <View style={[styles.actionButton, styles.finishedButton]}>
            <CheckCircle size={20} color="#059669" />
            <Text style={styles.finishedButtonText}>Serviço Finalizado</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Serviços do Dia</Text>
            <Text style={styles.subtitle}>
              {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
            </Text>
          </View>
          <View style={styles.networkStatus}>
            {isSyncing ? (
              <View style={styles.syncingContainer}>
                <Text style={styles.syncingText}>Sincronizando...</Text>
              </View>
            ) : (
              <View style={[styles.statusContainer, { backgroundColor: isConnected ? '#10B981' : 'transparent' }]}>
                {isConnected ? (
                  <Wifi size={16} color="#FFFFFF" />
                ) : (
                  <WifiOff size={16} color="#EF4444" />
                )}
                <Text style={[styles.statusText, { color: isConnected ? '#FFFFFF' : '#EF4444' }]}>
                  {isConnected ? 'Online' : 'Offline'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {servicos.length > 0 ? (
          servicos.map(renderServiceCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Nenhum serviço programado para hoje
            </Text>
          </View>
        )}
      </ScrollView>

      <ChecklistModal
        visible={showChecklistModal}
        onClose={() => setShowChecklistModal(false)}
        servicoId={selectedServiceForChecklist}
        onComplete={handleChecklistComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#10B981',
    padding: 24,
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#D1FAE5',
  },
  networkStatus: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  syncingContainer: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  syncingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  serviceDescription: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 16,
    lineHeight: 22,
  },
  timestampsContainer: {
    marginBottom: 16,
  },
  timestampText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  finishedButton: {
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishedButtonText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
  },
});
