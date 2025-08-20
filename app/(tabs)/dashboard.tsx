import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Users, CircleCheck as CheckCircle, X, Clock, Activity } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/services/api';
import { Equipe, Colaborador, Servico } from '@/types/types';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardScreen() {
  const { colaborador } = useAuth();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [equipesData, colaboradoresData, servicosData] = await Promise.all([
        api.getEquipes(),
        api.getColaboradores(),
        api.getServicos()
      ]);

      setEquipes(equipesData);
      setColaboradores(colaboradoresData);
      setServicos(servicosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const approveTeam = async (equipeId: number) => {
    try {
      await api.updateEquipe(equipeId, { statusComposicao: 'Aprovada' });
      loadData();
    } catch (error) {
      console.error('Erro ao aprovar equipe:', error);
    }
  };

  const rejectTeam = async (equipeId: number) => {
    try {
      await api.updateEquipe(equipeId, { statusComposicao: 'Rejeitada' });
      loadData();
    } catch (error) {
      console.error('Erro ao rejeitar equipe:', error);
    }
  };

  const getColaboradorNome = (matricula: number) => {
    const colaborador = colaboradores.find(c => c.matricula === matricula);
    return colaborador?.nome || 'Colaborador não encontrado';
  };

  const getTeamStatus = (equipe: Equipe) => {
    const teamServices = servicos.filter(s => s.equipeId === equipe.id && s.dataPlanejada === today);
    
    if (teamServices.length === 0) return 'Sem serviços';
    
    const inProgress = teamServices.find(s => 
      s.status === 'Em Deslocamento' || s.status === 'Em Execução'
    );
    
    if (inProgress) {
      return `${inProgress.status}: ${inProgress.id}`;
    }
    
    const finished = teamServices.filter(s => s.status === 'Finalizado').length;
    return `${finished}/${teamServices.length} serviços finalizados`;
  };

  const renderTeamCard = (equipe: Equipe) => {
    const teamServices = servicos.filter(s => s.equipeId === equipe.id && s.dataPlanejada === today);
    const teamStatus = getTeamStatus(equipe);

    return (
      <View key={equipe.id} style={styles.teamCard}>
        <View style={styles.teamHeader}>
          <View style={styles.teamInfo}>
            <Text style={styles.teamTitle}>Equipe {equipe.prefixo}</Text>
            <Text style={styles.teamEncarregado}>
              Encarregado: {getColaboradorNome(equipe.encarregadoMatricula)}
            </Text>
          </View>
          
          <View style={[
            styles.statusBadge,
            equipe.statusComposicao === 'Aprovada' ? styles.statusApproved :
            equipe.statusComposicao === 'Pendente' ? styles.statusPending :
            equipe.statusComposicao === 'Rejeitada' ? styles.statusRejected :
            styles.statusRejected
          ]}>
            <Text style={[
              styles.statusText,
              equipe.statusComposicao === 'Aprovada' ? styles.statusApprovedText :
              equipe.statusComposicao === 'Pendente' ? styles.statusPendingText :
              equipe.statusComposicao === 'Rejeitada' ? styles.statusRejectedText :
              styles.statusRejectedText
            ]}>
              {equipe.statusComposicao}
            </Text>
          </View>
        </View>

        <View style={styles.teamMembers}>
          <Text style={styles.membersTitle}>Membros da Equipe:</Text>
          {equipe.composicao.map((membro, index) => (
            <Text key={index} style={styles.memberText}>
              • {getColaboradorNome(membro.colaboradorMatricula)} - {membro.horaInicio}
            </Text>
          ))}
        </View>

        <View style={styles.teamStatus}>
          <Activity size={16} color="#3B82F6" />
          <Text style={styles.statusCurrentText}>{teamStatus}</Text>
        </View>

        <View style={styles.teamServices}>
          <Text style={styles.servicesTitle}>Serviços do Dia:</Text>
          {teamServices.map((servico) => (
            <View key={servico.id} style={styles.serviceItem}>
              <Text style={styles.serviceId}>{servico.nota}</Text>
              <Text style={[styles.serviceStatus, { color: getStatusColor(servico.status) }]}>
                {servico.status}
              </Text>
            </View>
          ))}
        </View>

        {equipe.statusComposicao === 'Pendente' && (
          <View style={styles.approvalButtons}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => approveTeam(equipe.id)}
            >
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.approveButtonText}>Aprovar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => rejectTeam(equipe.id)}
            >
              <X size={20} color="#FFFFFF" />
              <Text style={styles.rejectButtonText}>Rejeitar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard - Supervisão</Text>
        <Text style={styles.subtitle}>
          Acompanhamento em tempo real
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {equipes.map(renderTeamCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#7C3AED',
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
    color: '#DDD6FE',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  teamCard: {
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
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  teamInfo: {
    flex: 1,
  },
  teamTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  teamEncarregado: {
    fontSize: 16,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusApprovedText: {
    color: '#065F46',
  },
  statusPendingText: {
    color: '#92400E',
  },
  statusRejectedText: {
    color: '#991B1B',
  },
  teamMembers: {
    marginBottom: 16,
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  memberText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  teamStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  statusCurrentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  teamServices: {
    marginBottom: 16,
  },
  servicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    marginBottom: 4,
  },
  serviceId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
