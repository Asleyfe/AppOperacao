import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import Modal from 'react-native-modal';
import { X, Plus, Minus, Save } from 'lucide-react-native';
import { api } from '@/services/api';
import { Colaborador, Equipe, ComposicaoEquipe } from '@/types/types';

interface EditTeamModalProps {
  visible: boolean;
  onClose: () => void;
  currentTeam: Equipe | null;
  colaboradores: Colaborador[];
  onTeamUpdate: (team: Equipe) => void;
  today: string;
  colaboradorLogado: Colaborador;
}

export default function EditTeamModal({
  visible,
  onClose,
  currentTeam,
  colaboradores,
  onTeamUpdate,
  today,
  colaboradorLogado
}: EditTeamModalProps) {
  const [teamMembers, setTeamMembers] = useState<ComposicaoEquipe[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Colaborador[]>([]);

  useEffect(() => {
    if (visible) {
      initializeTeamData();
    }
  }, [visible, currentTeam, colaboradores]);

  const initializeTeamData = () => {
    // Filtrar colaboradores excluindo cargos de liderança
    const filteredColaboradores = colaboradores.filter(c => {
      const funcao = c.funcao?.toLowerCase() || '';
      return !funcao.includes('encarregado') && 
             !funcao.includes('supervisor') && 
             !funcao.includes('coordenador');
    });

    if (currentTeam) {
      setTeamMembers([...currentTeam.composicao]);
      
      const usedIds = currentTeam.composicao.map(c => c.colaboradorMatricula);
      const available = filteredColaboradores.filter(c => !usedIds.includes(c.matricula));
      setAvailableMembers(available);
    } else {
      // Automatically add current encarregado
      setTeamMembers([{ colaboradorMatricula: colaboradorLogado.matricula }]);
      setAvailableMembers(filteredColaboradores.filter(c => c.matricula !== colaboradorLogado.matricula));
    }
  };

  const addMember = (colaborador: Colaborador) => {
    if (teamMembers.length >= 7) {
      Alert.alert('Limite Excedido', 'A equipe pode ter no máximo 7 membros');
      return;
    }

    setTeamMembers([...teamMembers, { colaboradorMatricula: colaborador.matricula }]);
    setAvailableMembers(availableMembers.filter(c => c.matricula !== colaborador.matricula));
  };

  const removeMember = (colaboradorMatricula: number) => {
    // Prevent removing the encarregado
    if (colaboradorMatricula === colaboradorLogado.matricula) {
      Alert.alert('Erro', 'O encarregado não pode ser removido da equipe');
      return;
    }

    setTeamMembers(teamMembers.filter(m => m.colaboradorMatricula !== colaboradorMatricula));
    
    const colaborador = colaboradores.find(c => c.matricula === colaboradorMatricula);
    if (colaborador) {
      // Verificar se o colaborador não é um cargo de liderança antes de adicionar de volta
      const funcao = colaborador.funcao?.toLowerCase() || '';
      const isLeadership = funcao.includes('encarregado') || 
                          funcao.includes('supervisor') || 
                          funcao.includes('coordenador');
      
      if (!isLeadership) {
        setAvailableMembers([...availableMembers, colaborador]);
      }
    }
  };

  // updateMemberTime function is no longer needed as horaInicio is removed
  // const updateMemberTime = (colaboradorMatricula: number, horaInicio: string) => {
  //   setTeamMembers(teamMembers.map(m => 
  //     m.colaboradorMatricula === colaboradorMatricula ? { ...m, horaInicio } : m
  //   ));
  // };

  const saveTeam = async () => {
    // Check if colaboradorLogado is still valid
    if (!colaboradorLogado || !colaboradorLogado.matricula) {
      Alert.alert('Erro', 'Dados do colaborador não disponíveis. Faça login novamente.');
      return;
    }
    
    try {
      const teamData = {
        data: today,
        encarregadoMatricula: colaboradorLogado.matricula,
        composicao: teamMembers,
        statusComposicao: 'Pendente'
      };

      let updatedTeam;
      if (currentTeam) {
        updatedTeam = await api.updateEquipe(currentTeam.id, teamData);
      } else {
        updatedTeam = await api.createEquipe(teamData);
      }

      if (updatedTeam) { // Add null check here
        onTeamUpdate(updatedTeam);
        Alert.alert('Sucesso', 'Equipe salva! Aguardando aprovação da supervisão.');
      } else {
        Alert.alert('Erro', 'Falha ao salvar equipe: Equipe não encontrada após a operação.');
      }
    } catch (error) {
      console.error("Erro ao salvar equipe:", error); // Log the error for debugging
      Alert.alert('Erro', 'Falha ao salvar equipe');
    }
  };

  const getColaboradorNome = (matricula: number) => {
    const colaborador = colaboradores.find(c => c.matricula === matricula);
    if (!colaborador) {
      console.warn(`Colaborador com matrícula ${matricula} não encontrado na lista de colaboradores.`);
    }
    return colaborador?.nome || 'Colaborador não encontrado';
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Editar Equipe</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          {/* Team Members */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Colaboradores na Equipe ({teamMembers.length}/7)
            </Text>
            
            {teamMembers.map((member, index) => (
              <View key={member.colaboradorMatricula} style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {getColaboradorNome(member.colaboradorMatricula)}
                  </Text>
                  {/* Hora de início removed */}
                </View>
                
                {member.colaboradorMatricula !== colaboradorLogado.matricula && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeMember(member.colaboradorMatricula)}
                  >
                    <Minus size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Available Members */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Colaboradores Disponíveis</Text>
            
            {availableMembers.map((colaborador) => (
              <View key={colaborador.id} style={styles.availableMemberCard}>
                <View>
                  <Text style={styles.memberName}>{colaborador.nome}</Text>
                  <Text style={styles.memberFunction}>{colaborador.funcao}</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addMember(colaborador)}
                >
                  <Plus size={20} color="#10B981" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.saveButton} onPress={saveTeam}>
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Salvar Equipe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  memberFunction: {
    fontSize: 14,
    color: '#6B7280',
  },
  removeButton: {
    padding: 8,
  },
  availableMemberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addButton: {
    padding: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
