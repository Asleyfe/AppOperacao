import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import Modal from 'react-native-modal';
import { X, Check } from 'lucide-react-native';
import { format } from 'date-fns';
import { api } from '@/services/api';

interface ConfirmShiftStartModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (horaOper: string) => void;
  encarregadoMatricula: number;
  equipePrefixo: string;
  dataTurno: string;
}

export default function ConfirmShiftStartModal({ 
  visible, 
  onClose, 
  onConfirm, 
  encarregadoMatricula, 
  equipePrefixo, 
  dataTurno 
}: ConfirmShiftStartModalProps) {
  const [horaOper, setHoraOper] = useState('');
  const [turnoJaIniciado, setTurnoJaIniciado] = useState(false);
  const [verificandoTurno, setVerificandoTurno] = useState(false);

  useEffect(() => {
    if (visible) {
      verificarTurnoExistente();
    }
  }, [visible, encarregadoMatricula, equipePrefixo, dataTurno]);

  const verificarTurnoExistente = async () => {
    setVerificandoTurno(true);
    try {
      const exists = await api.checkHistoricoTurnoExists({
        colaborador_matricula: encarregadoMatricula,
        equipe_prefixo: equipePrefixo,
        data_turno: dataTurno
      });
      setTurnoJaIniciado(exists);
    } catch (error) {
      console.error('Erro ao verificar histórico de turno:', error);
      setTurnoJaIniciado(false);
    } finally {
      setVerificandoTurno(false);
    }
  };

  const handleConfirm = () => {
    if (turnoJaIniciado) {
      Alert.alert('Aviso', 'O turno já foi iniciado para esta equipe hoje.');
      return;
    }

    if (!horaOper || !/^\d{2}:\d{2}$/.test(horaOper)) {
      Alert.alert('Erro', 'Por favor, insira um horário válido no formato HH:MM.');
      return;
    }
    onConfirm(horaOper);
    setHoraOper(''); // Reset field after confirmation
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Início de Turno Oper</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          {turnoJaIniciado && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                ⚠️ O turno já foi iniciado para esta equipe hoje.
              </Text>
            </View>
          )}
          
          <Text style={styles.label}>Horário de Início no Sistema Oper (HH:MM):</Text>
          <TextInput
            style={[styles.input, turnoJaIniciado && styles.disabledInput]}
            value={horaOper}
            onChangeText={setHoraOper}
            placeholder="Ex: 08:00"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            editable={!turnoJaIniciado}
          />
        </View>

        <View style={styles.modalFooter}>
          {verificandoTurno ? (
            <View style={[styles.confirmButton, styles.loadingButton]}>
              <Text style={styles.confirmButtonText}>Verificando...</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                turnoJaIniciado && styles.disabledButton
              ]} 
              onPress={handleConfirm}
              disabled={turnoJaIniciado}
            >
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>
                {turnoJaIniciado ? 'Turno Já Iniciado' : 'Confirmar'}
              </Text>
            </TouchableOpacity>
          )}
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
    maxHeight: '50%',
    minHeight: '30%',
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
  label: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingButton: {
    backgroundColor: '#9CA3AF',
  },
  disabledButton: {
    backgroundColor: '#6B7280',
    opacity: 0.6,
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
});
