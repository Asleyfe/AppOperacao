import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Modal from 'react-native-modal';
import { X, Check } from 'lucide-react-native';
import { format } from 'date-fns';
import { api } from '@/services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isAndroid = Platform.OS === 'android';

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
          <View style={styles.contentContainer}>
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
                    mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'} // dropdown no Android é mais compacto
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
                    mode={Platform.OS === 'android' ? 'dropdown' : 'dialog'}
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
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    maxHeight: isAndroid ? '75%' : '75%',
    minHeight: isAndroid ? 380 : 280,
    maxWidth: screenWidth - 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isAndroid ? 16 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: isAndroid ? 20 : 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    flex: 1,
    padding: isAndroid ? 12 : 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: isAndroid ? 220 : 200,
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
    padding: isAndroid ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: isAndroid ? 10 : 12,
    borderRadius: isAndroid ? 6 : 8,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: isAndroid ? 16 : 18,
    fontWeight: 'bold',
    marginLeft: isAndroid ? 6 : 8,
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
    marginVertical: isAndroid ? 8 : 12,
    paddingHorizontal: isAndroid ? 12 : 16,
    gap: isAndroid ? 12 : 16,
  },
  pickerWrapper: {
    alignItems: 'center',
    flex: 1,
    maxWidth: isAndroid ? 110 : 120,
  },
  pickerLabel: {
    fontSize: isAndroid ? 14 : 16,
    color: '#374151',
    marginBottom: isAndroid ? 6 : 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: isAndroid ? 6 : 8,
    backgroundColor: '#FFFFFF',
    height: isAndroid ? 48 : 50,
    minHeight: isAndroid ? 48 : 50,
    justifyContent: 'center',
    paddingHorizontal: isAndroid ? 8 : 4,
    paddingVertical: isAndroid ? 2 : 0,
    overflow: 'visible',
    elevation: isAndroid ? 1 : 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: isAndroid ? 0.05 : 0.08,
    shadowRadius: isAndroid ? 1 : 2,
    width: '100%',
  },
  picker: {
    height: isAndroid ? 48 : 50,
    width: '100%',
    margin: 0,
    padding: 0,
    fontSize: isAndroid ? 16 : 18,
  },
  disabledPicker: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  timeSeparator: {
    fontSize: isAndroid ? 20 : 24,
    fontWeight: '700',
    color: '#1F2937',
    alignSelf: 'center',
    marginTop: isAndroid ? 8 : 12,
    paddingHorizontal: isAndroid ? 4 : 6,
    textAlign: 'center',
  },
  selectedTimeContainer: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
    borderWidth: 1,
    borderRadius: isAndroid ? 6 : 8,
    padding: isAndroid ? 8 : 8,
    alignItems: 'center',
    marginTop: isAndroid ? 16 : 12,
    marginBottom: isAndroid ? 20 : 0,
    marginHorizontal: 0,
    shadowColor: '#0EA5E9',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: isAndroid ? 0.1 : 0.08,
    shadowRadius: isAndroid ? 2 : 2,
    elevation: isAndroid ? 2 : 2,
    minHeight: isAndroid ? 50 : 45,
  },
  selectedTimeLabel: {
    fontSize: isAndroid ? 12 : 12,
    color: '#0369A1',
    fontWeight: '600',
    marginBottom: isAndroid ? 4 : 4,
    textAlign: 'center',
  },
  selectedTime: {
    fontSize: isAndroid ? 16 : 16,
    color: '#0369A1',
    fontWeight: 'bold',
    letterSpacing: isAndroid ? 0.5 : 0.5,
  },
});
