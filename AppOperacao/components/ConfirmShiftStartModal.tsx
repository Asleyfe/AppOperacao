import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [turnoJaIniciado, setTurnoJaIniciado] = useState(false);
  const [verificandoTurno, setVerificandoTurno] = useState(false);

  // Gerar arrays de horas e minutos
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

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

    const horaOper = `${selectedHour}:${selectedMinute}`;
    onConfirm(horaOper);
    // Reset fields after confirmation
    setSelectedHour('08');
    setSelectedMinute('00');
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
          
          <Text style={styles.label}>Horário de Início no Sistema Oper:</Text>
          
          <View style={styles.timePickerContainer}>
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>Hora</Text>
              <View style={[styles.pickerContainer, turnoJaIniciado && styles.disabledPicker]}>
                <Picker
                  selectedValue={selectedHour}
                  onValueChange={(itemValue) => setSelectedHour(itemValue)}
                  style={styles.picker}
                  enabled={!turnoJaIniciado}
                  mode="dropdown"
                >
                  {hours.map((hour) => (
                    <Picker.Item key={hour} label={hour} value={hour} />
                  ))}
                </Picker>
              </View>
            </View>
            
            <Text style={styles.timeSeparator}>:</Text>
            
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>Minuto</Text>
              <View style={[styles.pickerContainer, turnoJaIniciado && styles.disabledPicker]}>
                <Picker
                  selectedValue={selectedMinute}
                  onValueChange={(itemValue) => setSelectedMinute(itemValue)}
                  style={styles.picker}
                  enabled={!turnoJaIniciado}
                  mode="dropdown"
                >
                  {minutes.map((minute) => (
                    <Picker.Item key={minute} label={minute} value={minute} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
          
          <View style={styles.selectedTimeContainer}>
            <Text style={styles.selectedTimeLabel}>Horário selecionado:</Text>
            <Text style={styles.selectedTime}>{selectedHour}:{selectedMinute}</Text>
          </View>
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
    maxHeight: '70%',
    minHeight: '50%',
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
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  pickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    width: '100%',
    minHeight: 120,
    justifyContent: 'center',
  },
  picker: {
    height: 120,
    width: '100%',
  },
  disabledPicker: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginHorizontal: 16,
    marginTop: 20,
  },
  selectedTimeContainer: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  selectedTimeLabel: {
    fontSize: 14,
    color: '#0369A1',
    fontWeight: '500',
    marginBottom: 4,
  },
  selectedTime: {
    fontSize: 20,
    color: '#0369A1',
    fontWeight: 'bold',
  },
});
