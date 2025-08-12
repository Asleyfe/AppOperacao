import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MapPin, Play, Square, CircleCheck as CheckCircle, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/services/api';
import { Servico, Equipe } from '@/types/types';
import ChecklistModal from '@/components/ChecklistModal';
import { useAuth } from '@/hooks/useAuth';

export default function ServicesScreen() {
  const { colaborador } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [selectedServiceForChecklist, setSelectedServiceForChecklist] = useState<number | null>(null); // Changed from string to number
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<Equipe | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (colaborador) {
      loadData();
    }
  }, [colaborador]);

  const loadData = async () => {
    try {
      const [servicosData, equipesData] = await Promise.all([
        api.getServicos(),
        api.getEquipes()
      ]);

      // Find team for today with current logged user as encarregado (para compatibilidade)
      const teamToday = equipesData.find(
        (equipe: Equipe) => equipe.data === today && equipe.encarregadoMatricula === colaborador?.matricula
      );
      setCurrentTeam(teamToday || null);

      // A função RPC get_servicos_permitidos já aplica a filtragem hierárquica
      // Filtrar serviços para hoje
      const todayServices = servicosData.filter(
        (servico: Servico) => servico.dataPlanejada === today
      );

      setServicos(todayServices);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar dados');
    }
  };

  const updateServiceStatus = async (
    servicoId: number, // Changed from string to number
    status: string, 
    timestampField?: string
  ) => {
    try {
      const updateData: any = { status };
      
      if (timestampField) {
        updateData.timestamps = {};
        updateData.timestamps[timestampField] = new Date().toISOString();
        
        // Preserve existing timestamps
        const currentService = servicos.find(s => s.id === servicoId);
        if (currentService) {
          updateData.timestamps = {
            ...currentService.timestamps,
            [timestampField]: new Date().toISOString()
          };
        }
      }

      await api.updateServico(servicoId, updateData);
      loadData();


    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar serviço');
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
            console.log('Clicou em Fim Execução para serviço:', servico.id);
            setSelectedServiceForChecklist(servico.id);
            setShowChecklistModal(true);
            console.log('Estado do modal após clique:', { selectedServiceForChecklist: servico.id, showChecklistModal: true });
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
        <Text style={styles.title}>Serviços do Dia</Text>
        <Text style={styles.subtitle}>
          {format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
        </Text>
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
