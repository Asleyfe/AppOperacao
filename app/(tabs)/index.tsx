import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Clock, Users, CreditCard as Edit3, LogOut } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/services/api';
import { Colaborador, Equipe } from '@/types/types';
import EditTeamModal from '@/components/EditTeamModal';
import ConfirmShiftStartModal from '@/components/ConfirmShiftStartModal'; // Import new modal
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { router } from 'expo-router';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { OfflineDataService } from '@/services/offline/OfflineDataService';

export default function TeamScreen() {
  const { colaborador } = useAuth();
  const { isConnected } = useNetworkStatus();
  const offlineDataService = new OfflineDataService();
  const [currentTeam, setCurrentTeam] = useState<Equipe | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShiftStartModal, setShowShiftStartModal] = useState(false); // New state for shift start modal
  const [turnoIniciado, setTurnoIniciado] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFormatted = format(new Date(), 'dd/MM/yyyy', { locale: ptBR });

  useEffect(() => {
    if (colaborador) {
      loadData();
    }
  }, [colaborador]);

  // Early return if colaborador is null to prevent errors during logout
  if (!colaborador) {
    return null;
  }

  const loadData = async () => {
    // Don't load data if colaborador is null (during logout)
    if (!colaborador) {
      return;
    }
    
    try {
      let equipesData, colaboradoresData;
      
      if (isConnected) {
        // Online: usar API normal
        [equipesData, colaboradoresData] = await Promise.all([
          api.getEquipes(),
          api.getColaboradores()
        ]);
      } else {
        // Offline: usar dados locais
        [equipesData, colaboradoresData] = await Promise.all([
          offlineDataService.getEquipes(),
          offlineDataService.getColaboradores()
        ]);
      }

      setColaboradores(colaboradoresData);
      
      // Find team for current logged user as encarregado (regardless of date)
      const teamToday = equipesData.find(
        (equipe: Equipe) => equipe.encarregadoMatricula === colaborador.matricula
      );
      setCurrentTeam(teamToday || null);
      
      // Check if shift has already been started for today (only when online)
      if (teamToday && isConnected) {
        try {
          const turnoExiste = await api.checkHistoricoTurnoExists({
            colaborador_matricula: colaborador.matricula,
            equipe_prefixo: teamToday.prefixo,
            data_turno: today
          });
          setTurnoIniciado(turnoExiste);
        } catch (error) {
          console.error('Erro ao verificar histórico de turno:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      const errorMessage = isConnected 
        ? 'Falha ao carregar dados do servidor. Verifique sua conexão com a internet e tente novamente.'
        : 'Falha ao carregar dados offline. Verifique se os dados foram sincronizados anteriormente.';
      Alert.alert('Erro', errorMessage,
        [
          { text: 'Tentar novamente', onPress: () => loadData() },
          { text: 'OK' }
        ]
      );
    }
  };

  const confirmarInicioTurno = () => {
    // Verificar se a equipe está aprovada antes de permitir o início do turno
    if (!currentTeam) {
      Alert.alert('Erro', 'Nenhuma equipe encontrada.');
      return;
    }

    if (currentTeam.statusComposicao !== 'Aprovada') {
      Alert.alert(
        'Equipe Não Aprovada', 
        'O turno só pode ser iniciado após a aprovação da equipe. Status atual: ' + currentTeam.statusComposicao
      );
      return;
    }

    // Open the modal to get hora_oper
    setShowShiftStartModal(true);
  };

  const handleConfirmShiftStart = async (horaOper: string) => {
    if (!colaborador || !currentTeam) {
      Alert.alert('Erro', 'Dados do colaborador ou equipe não disponíveis.');
      return;
    }

    try {
      const historicoPromises = currentTeam.composicao.map(async (membro) => {
        await api.createHistoricoTurno({
          colaborador_matricula: membro.colaboradorMatricula,
          equipe_prefixo: currentTeam.prefixo,
          data_turno: today,
          hora_oper: horaOper,
        });
      });

      // Also create a record for the encarregado if they are not already in composicao
      const encarregadoInComposicao = currentTeam.composicao.some(
        (membro) => membro.colaboradorMatricula === colaborador.matricula
      );

      if (!encarregadoInComposicao) {
        historicoPromises.push(api.createHistoricoTurno({
          colaborador_matricula: colaborador.matricula,
          equipe_prefixo: currentTeam.prefixo,
          data_turno: today,
          hora_oper: horaOper,
        }));
      }

      await Promise.all(historicoPromises);

      setTurnoIniciado(true);
      setShowShiftStartModal(false);
      try {
        Alert.alert('Sucesso', 'Turno iniciado com sucesso!');
      } catch (alertError) {
        console.error('Erro ao exibir alerta de sucesso:', alertError);
      }
    } catch (error) {
      console.error('Erro ao registrar início de turno:', error);
      if (error instanceof Error) {
        console.error('Detalhes do erro:', error.message, error.stack);
      } else {
        console.error('Erro desconhecido:', JSON.stringify(error));
      }
      try {
        Alert.alert('Erro', 'Falha ao registrar início de turno. Verifique o console para mais detalhes.');
      } catch (alertError) {
        console.error('Erro ao exibir alerta de erro:', alertError);
      }
    }
  };

  const getColaboradorNome = (matricula: number) => {
    const colaborador = colaboradores.find(c => c.matricula === matricula);
    if (!colaborador) {
      console.warn(`Colaborador com matrícula ${matricula} não encontrado na lista de colaboradores.`);
    }
    return colaborador?.nome || 'Colaborador não encontrado';
  };

  const handleTeamUpdate = (updatedTeam: Equipe) => {
    setCurrentTeam(updatedTeam);
    setShowEditModal(false);
  };

  const handleLogout = async () => {
    console.log('🔄 Botão de logout pressionado');
    
    // Usar Alert nativo do React Native (funciona tanto no mobile quanto no web)
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair do aplicativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            console.log('✅ Usuário confirmou logout');
            try {
              console.log('🔄 Iniciando processo de logout...');
              // Primeiro redirecionar para a tela de login para evitar erros com BackHandler
              router.replace('/login');
              // Depois fazer o logout efetivo
              await supabase.auth.signOut();
              console.log('✅ Logout realizado com sucesso');
            } catch (error) {
              console.error('❌ Erro ao fazer logout:', error);
              Alert.alert('Erro', 'Não foi possível fazer logout.');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Gestão de Equipe</Text>
            <Text style={styles.subtitle}>
              {colaborador ? colaborador.nome : 'Carregando...'}
            </Text>
            <Text style={styles.functionText}>
              {colaborador ? colaborador.funcao : ''}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={() => {
              console.log('🔄 TouchableOpacity pressionado - evento capturado');
              handleLogout();
            }}
            activeOpacity={0.7}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          >
            <LogOut size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Início de Turno */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Clock size={24} color="#3B82F6" />
          <Text style={styles.cardTitle}>Início de Turno</Text>
        </View>
        
        <Text style={styles.dateText}>Data: {todayFormatted}</Text>
        
        <TouchableOpacity 
          style={[
            styles.startButton, 
            turnoIniciado && styles.startButtonDisabled
          ]}
          onPress={confirmarInicioTurno}
          disabled={turnoIniciado}
        >
          <Text style={[
            styles.startButtonText,
            turnoIniciado && styles.startButtonTextDisabled
          ]}>
            {turnoIniciado ? 'Turno Iniciado' : 'Confirmar Início de Turno'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Composição da Equipe */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Users size={24} color="#10B981" />
          <Text style={styles.cardTitle}>Minha Equipe</Text>
        </View>

        {currentTeam ? (
          <>
            <View style={styles.statusContainer}>
              <Text style={[
                styles.statusText,
                currentTeam.statusComposicao === 'Aprovada' ? styles.statusApproved :
                currentTeam.statusComposicao === 'Pendente' ? styles.statusPending :
                styles.statusRejected
              ]}>
                Status: {currentTeam.statusComposicao}
              </Text>
            </View>

            {currentTeam.composicao.map((membro, index) => (
              <View key={index} style={styles.teamMember}>
                <Text style={styles.memberName}>
                  {getColaboradorNome(membro.colaboradorMatricula)}
                </Text>
                {/* Hora de início removed */}
              </View>
            ))}

            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setShowEditModal(true)}
            >
              <Edit3 size={20} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Editar Equipe</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noTeamContainer}>
            <Text style={styles.noTeamText}>
              Nenhuma equipe configurada para hoje
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setShowEditModal(true)}
            >
              <Text style={styles.createButtonText}>Criar Equipe</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {colaborador && (
        <EditTeamModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          currentTeam={currentTeam}
          colaboradores={colaboradores}
          onTeamUpdate={handleTeamUpdate}
          today={today}
          colaboradorLogado={colaborador}
        />
      )}

      {colaborador && (
        <ConfirmShiftStartModal
          visible={showShiftStartModal}
          onClose={() => setShowShiftStartModal(false)}
          onConfirm={handleConfirmShiftStart}
          encarregadoMatricula={colaborador.matricula}
          equipePrefixo={currentTeam?.prefixo || ''}
          dataTurno={today}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#3B82F6',
    padding: 24,
    paddingTop: 60,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
  },
  functionText: {
    fontSize: 14,
    color: '#DBEAFE',
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'flex-start',
    minWidth: 80,
    minHeight: 44,
    justifyContent: 'center',
    zIndex: 999,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#DBEAFE',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  startButtonTextDisabled: {
    color: '#D1D5DB',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  teamMember: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    marginVertical: 4,
    borderRadius: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noTeamContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noTeamText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
