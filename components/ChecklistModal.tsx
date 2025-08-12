import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator // Adicionado para indicador de carregamento
} from 'react-native';
import { Alert } from 'react-native'; // Manter Alert para erros críticos, mas não para fluxo normal
import { Picker } from '@react-native-picker/picker';
import { X, CircleCheck as CheckCircle, Send, Plus, Minus } from 'lucide-react-native';
import { api } from '@/services/api';
import { GrupoItem, GIServico, Servico, ServicoHeader } from '@/types/types';
import { useAuth } from '@/hooks/useAuth';

// Define a local interface for GIServico to handle n_serie as string[] internally
interface LocalGIServico extends Omit<GIServico, 'n_serie'> {
  n_serie?: string[]; // For internal use, can be an array of strings
}

interface ChecklistModalProps {
  visible: boolean;
  onClose: () => void;
  servicoId: number | null;
  onComplete: () => void;
}

export default function ChecklistModal({
  visible,
  onClose,
  servicoId,
  onComplete
}: ChecklistModalProps) {

  
  const { colaborador } = useAuth();
  const [grupos, setGrupos] = useState<string[]>([]);
  const [grupoItens, setGrupoItens] = useState<GrupoItem[]>([]);
  const [servico, setServico] = useState<Servico | null>(null);
  
  // Verificar se o formulário deve estar desabilitado para encarregados quando o serviço já foi finalizado
  const isFormDisabled = colaborador?.funcao?.toUpperCase().includes('ENCARREGADO') && servico?.timestamps?.fimExecucao;
  const [giservicos, setGiservicos] = useState<LocalGIServico[]>([]); // Use LocalGIServico[]
  const [selectedGrupo, setSelectedGrupo] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<number | ''>('');
  const [formData, setFormData] = useState({
    status: 'Instalado' as 'Instalado' | 'Retirado',
    quantidade: 1,
    numeros_serie: [''] as string[]
  });
  const [headerData, setHeaderData] = useState<Partial<ServicoHeader>>({
    km_inicial: 0, // Inicializa com 0
    km_final: 0,   // Inicializa com 0
    equipe_prefixo: '',
    data_execucao: '',
    hora_inicial: '',
    hora_final: '',
    equipamento: '', // Inicializa com string vazia
    projeto: '',
    si: '',          // Inicializa com string vazia
    ptp: '',         // Inicializa com string vazia
    status_servico: 'Em Andamento',
    ocorrencia: '',  // Inicializa com string vazia
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for submission status
  const [scrollPosition, setScrollPosition] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  useEffect(() => {
    if (visible && servicoId) {
      loadData();
    }
  }, [visible, servicoId]);

  const loadData = async () => {

    try {
      // Carregar dados do serviço
      const servicosData = await api.getServicos();
      const servicoData = servicosData.find((s: any) => s.id === servicoId);
      
      if (servicoData) {

        setServico(servicoData);
        
        // Verificar se o serviço já foi finalizado e o usuário é encarregado
        if (colaborador?.funcao?.toUpperCase().includes('ENCARREGADO') && servicoData.timestamps?.fimExecucao) {
          Alert.alert(
            'Checklist já finalizado',
            'Este serviço já foi finalizado e não pode ser editado novamente.',
            [{ text: 'OK', onPress: onClose }]
          );
          return;
        }
        
        // Carregar grupos disponíveis
        const gruposData = await api.getGrupos();

        setGrupos(gruposData);
        
        // Carregar todos os itens
        const itensData = await api.getGrupoItens();

        setGrupoItens(itensData);
        
        // Carregar itens já adicionados ao serviço
        const giservicosData = await api.getGIServicosByServico(servicoId!);

        // Transformar n_serie de string para array se necessário
        const formattedGiservicos = giservicosData.map((gi: GIServico) => ({
          ...gi,
          n_serie: gi.n_serie ? gi.n_serie.split(',').filter(s => s.trim() !== '') : [] // Ensure empty strings are filtered
        }));
        setGiservicos(formattedGiservicos as LocalGIServico[]); // Cast to LocalGIServico[]
        
        // Inicializa os valores padrão com base em servicoData e data/hora atual
        const currentDate = new Date().toISOString().split('T')[0];
        const horaInicialExecucao = servicoData.timestamps?.inicioExecucao 
          ? new Date(servicoData.timestamps.inicioExecucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '';
        
        const now = new Date();
        const currentHour = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const defaultHeaderData: Partial<ServicoHeader> = {
          servico_id: servicoId!,
          km_inicial: 0, // Garante valor padrão
          km_final: 0,   // Garante valor padrão
          equipe_prefixo: servicoData.equipePrefixo || '',
          data_execucao: currentDate,
          hora_inicial: horaInicialExecucao,
          hora_final: currentHour,
          equipamento: '', // Garante valor padrão
          projeto: servicoData.nota || '',
          si: '',          // Garante valor padrão
          ptp: '',         // Garante valor padrão
          status_servico: 'Em Andamento',
          ocorrencia: '',  // Garante valor padrão
        };

        try {
          const headerDataResponse = await api.getServicoHeader(servicoId!);
          if (headerDataResponse) {
            // Se o cabeçalho existir, usa os dados do banco
            setHeaderData(headerDataResponse);
          } else {
            // Se não existir, usa os valores padrão baseados em servicoData
            setHeaderData(defaultHeaderData);
          }
        } catch (headerError: any) {
          console.error('Error fetching header:', headerError);
          if (headerError.code === 'PGRST116' || (headerError.message && headerError.message.includes('406'))) {

            // Se houver erro (não encontrado ou 406), inicializa com os valores padrão
            setHeaderData(defaultHeaderData);
          } else {
            Alert.alert('Erro', 'Falha ao carregar cabeçalho do serviço');
          }
        }
      } else {

      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Falha ao carregar dados');
    }
  };

  const handleGrupoSelect = (grupo: string) => {
    setSelectedGrupo(grupo);
    setSelectedItemId('');
    setFormData({
      status: 'Instalado' as 'Instalado' | 'Retirado',
      quantidade: 1,
      numeros_serie: ['']
    });
  };

  const handleAddItem = () => {


    if (!selectedItemId || !formData.status || formData.quantidade <= 0) {
      Alert.alert('Erro', 'Selecione um item, status e quantidade válidos para adicionar.');
      return;
    }

    const selectedItem = grupoItens.find(item => item.id === selectedItemId);
    if (!selectedItem) {
      Alert.alert('Erro', 'Item selecionado não encontrado.');

      return;
    }



    const novoGIServico: Partial<LocalGIServico> = { // Use LocalGIServico
      id_servico: servicoId!,
      id_item: selectedItem.id,
      status: formData.status,
      quantidade: formData.quantidade,
      n_serie: requiresSerialNumbers(selectedGrupo) ? formData.numeros_serie.filter(s => s.trim() !== '') : [],
      prefixo: headerData.equipe_prefixo // Adiciona o prefixo da equipe
    };


    setGiservicos(prev => {
      let newGiservicos = [...prev];

      if (requiresSerialNumbers(selectedGrupo)) {
        // For items with serial numbers, create a new entry for each serial number
        const validSerialNumbers = formData.numeros_serie.filter(s => s.trim() !== '');
        if (validSerialNumbers.length === 0) {
          Alert.alert('Erro', 'Por favor, insira os números de série para este item.');
          return prev; // Do not add if no serial numbers are provided for serializable items
        }
        validSerialNumbers.forEach(serial => {
          newGiservicos.push({
            ...novoGIServico,
            quantidade: 1, // Each serial number is a quantity of 1
            n_serie: [serial],
            id: Date.now() + Math.random() // Unique temporary ID for each entry
          } as LocalGIServico);
        });

      } else {
        // For items without serial numbers, check if an item with the same id_item and status already exists
        const existingIndex = prev.findIndex(gi => gi.id_item === selectedItem.id && gi.status === formData.status);
        
        if (existingIndex !== -1) {
          // Update existing item

          newGiservicos[existingIndex] = {
            ...newGiservicos[existingIndex],
            quantidade: (newGiservicos[existingIndex].quantidade || 0) + formData.quantidade,
          };

        } else {
          // Add new item

          newGiservicos.push({ ...novoGIServico, id: Date.now() } as LocalGIServico); // Adiciona ID temporário para renderização

        }
      }
      return newGiservicos;
    });

    // Reset form
    setSelectedItemId('');
    setFormData({
      status: 'Instalado' as 'Instalado' | 'Retirado',
      quantidade: 1,
      numeros_serie: ['']
    });
  };

  const handleQuantityChange = (type: 'increase' | 'decrease') => {
    setFormData(prev => {
      const newQuantity = type === 'increase' ? prev.quantidade + 1 : Math.max(1, prev.quantidade - 1);
      const newSerialNumbers = Array(newQuantity).fill('').map((_, i) => prev.numeros_serie[i] || '');
      return { ...prev, quantidade: newQuantity, numeros_serie: newSerialNumbers };
    });
  };

  const handleSerialNumberChange = (text: string, index: number) => {
    setFormData(prev => {
      const newSerialNumbers = [...prev.numeros_serie];
      newSerialNumbers[index] = text;
      return { ...prev, numeros_serie: newSerialNumbers };
    });
  };

  // Check if current group requires serial numbers
  const requiresSerialNumbers = (grupoNome: string) => {
    const gruposComNumeroSerie = ['poste', 'transformador', 'medição blindada'];
    return gruposComNumeroSerie.includes(grupoNome.toLowerCase()); // Comparação exata após converter para minúsculas
  };

  const submitChecklist = async () => {
    setIsSubmitting(true); // Set submitting state to true
    try {


      // Validar campos obrigatórios do cabeçalho
      if (!headerData.equipe_prefixo || !headerData.data_execucao || !headerData.hora_inicial || !headerData.hora_final) {
        Alert.alert('Erro', 'Preencha todos os campos obrigatórios do cabeçalho');
        setIsSubmitting(false); // Reset submitting state on error
        return;
      }

      if (giservicos.length === 0) {
        Alert.alert('Erro', 'Adicione pelo menos um item ao checklist antes de enviar.');
        setIsSubmitting(false); // Reset submitting state on error
        return;
      }



      // Salvar ou atualizar header do serviço
      try {
        const existingHeader = await api.getServicoHeader(servicoId!);
        let headerResult;
        if (existingHeader) {

          headerResult = await api.updateServicoHeader(servicoId!, headerData);
        } else {

          headerResult = await api.createServicoHeader(headerData);
        }

      } catch (headerError: any) {
        console.error('Erro ao salvar/atualizar cabeçalho:', headerError);
        Alert.alert('Erro', `Falha ao salvar cabeçalho: ${headerError.message || headerError}`);
        setIsSubmitting(false); // Reset submitting state on error
        return; // Interrompe se o cabeçalho não puder ser salvo
      }

      // Salvar itens do serviço
      let hasErrorSavingItems = false;
      for (const giservico of giservicos) {
        const { item, servico: relatedServico, equipe: relatedEquipe, ...giservicoDataToSave } = giservico; // Remove propriedades de join
        
        // Determine if the item requires serial numbers based on its group
        const itemGrupo = grupoItens.find(i => i.id === giservicoDataToSave.id_item)?.grupo;
        const isSerializable = itemGrupo ? requiresSerialNumbers(itemGrupo) : false;

        if (isSerializable && Array.isArray(giservicoDataToSave.n_serie) && giservicoDataToSave.n_serie.length > 0) {
          // For serializable items, create a new entry for each serial number
          for (const serial of giservicoDataToSave.n_serie) {
            // Destructure to remove the temporary 'id' before sending to the API
            const { id, ...dataWithoutTempIdForSerial } = giservicoDataToSave;
            const giToSaveForSerial: GIServico = {
              ...dataWithoutTempIdForSerial,
              quantidade: 1, // Each serial number is a quantity of 1
              n_serie: serial, // Save individual serial number as string
              id_item: dataWithoutTempIdForSerial.id_item,
              id_servico: dataWithoutTempIdForSerial.id_servico,
              status: dataWithoutTempIdForSerial.status,
              prefixo: dataWithoutTempIdForSerial.prefixo,
              created_at: dataWithoutTempIdForSerial.created_at
            };

            try {
              await api.createGIServico(giToSaveForSerial);

            } catch (giError: any) {
              console.error('Erro ao salvar item GI serializado:', giError);
              Alert.alert('Erro', `Falha ao salvar item serializado (${serial}): ${giError.message || giError}`);
              hasErrorSavingItems = true;
            }
          }
        } else {
          // For non-serializable items, or serializable items without serials (shouldn't happen with validation)
          const { id, ...dataWithoutTempId } = giservicoDataToSave; // Destructure to remove the temporary 'id'
          const finalGiservicoToSave: GIServico = {
            ...dataWithoutTempId, // Use the object without the temporary 'id'
            n_serie: Array.isArray(dataWithoutTempId.n_serie) ? dataWithoutTempId.n_serie.join(',') : dataWithoutTempId.n_serie,
            id_item: dataWithoutTempId.id_item,
            id_servico: dataWithoutTempId.id_servico,
            status: dataWithoutTempId.status,
            quantidade: dataWithoutTempId.quantidade,
            prefixo: dataWithoutTempId.prefixo,
            created_at: dataWithoutTempId.created_at
          };

          try {
            let giResult;
            if (giservico.id && giservico.id > 1000000) {
              // Item novo (ID temporário) - send data without the temporary ID
  
              giResult = await api.createGIServico(finalGiservicoToSave);
            } else if (giservico.id) {
              // Item existente - use the actual ID for update
  
              giResult = await api.updateGIServico(giservico.id, finalGiservicoToSave);
            }
  
          } catch (giError: any) {
            console.error('Erro ao salvar/atualizar item GI:', giError);
            Alert.alert('Erro', `Falha ao salvar item do checklist: ${giError.message || giError}`);
            hasErrorSavingItems = true;
          }
        }
      }

      if (hasErrorSavingItems) {
        Alert.alert('Atenção', 'Alguns itens do checklist não puderam ser salvos. Verifique o console para mais detalhes.');
      } else {

        // Update the service status and fim_execucao in the servicos table
        try {
          const [year, month, day] = headerData.data_execucao.split('-').map(Number);
          const [hours, minutes] = headerData.hora_final.split(':').map(Number);

          // Create a UTC Date object to ensure consistent timezone handling
          // Month is 0-indexed in JavaScript Date constructor
          const fimExecucaoDateUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
          const isoTimestampUTC = fimExecucaoDateUTC.toISOString();

          // Atualizar o status_servico na tabela servico_header
          const updatedHeaderData = {
            status_servico: headerData.status_servico // Usar o status diretamente do formulário
          };
          
          await api.updateServicoHeader(servicoId!, updatedHeaderData);
          
          // O status da tabela servicos deve sempre ser 'Finalizado' quando o checklist for enviado
          // independente do status_servico selecionado no formulário
          const servicoStatus: 'Finalizado' = 'Finalizado';
          
          // Atualizar o status e timestamp de fim de execução na tabela servicos
          const updatedServicoData = {
            status: servicoStatus,
            timestamps: {
              fimExecucao: isoTimestampUTC
            }
          };
          
          await api.updateServico(servicoId!, updatedServicoData);

        } catch (updateServicoError: any) {
          console.error('Erro ao atualizar status do serviço:', updateServicoError);
          Alert.alert('Erro', `Falha ao atualizar status do serviço: ${updateServicoError.message || updateServicoError}`);
          setIsSubmitting(false);
          return;
        }


        
        // Para ambiente web, vamos usar uma abordagem diferente
        if (typeof window !== 'undefined') {
          // Ambiente web - usar alert nativo do browser

          alert('Dados salvos com sucesso!');

          setIsSubmitting(false); // Reset submitting state after success
          setTimeout(() => {
            onComplete();

            onClose();
          }, 100);
        } else {
          // Ambiente mobile - usar Alert do React Native

          Alert.alert('Sucesso', 'Dados salvos com sucesso!', [
            { text: 'OK', onPress: () => {

              setIsSubmitting(false); // Reset submitting state after success
              // Introduce a small delay to ensure the alert is visible before closing the modal
              setTimeout(() => {
                onComplete();

                onClose();
              }, 100); // 100ms delay
            }}
          ]);
        }
      }
    } catch (error: any) { // Captura o erro geral
      console.error('Erro geral ao salvar dados do checklist:', error);
      Alert.alert('Erro', `Falha geral ao salvar dados: ${error.message || error}`);
      setIsSubmitting(false); // Reset submitting state on error
    }
  };

  if (!servico) {

    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={isSubmitting ? undefined : onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {isSubmitting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Salvando dados...</Text>
            </View>
          )}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Checklist do Serviço</Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            scrollEventThrottle={16}
            bounces={true}
            alwaysBounceVertical={false}
            removeClippedSubviews={false}
            contentInsetAdjustmentBehavior="automatic"
            directionalLockEnabled={false}
            automaticallyAdjustContentInsets={false}
            persistentScrollbar={true}
            indicatorStyle="black"
            scrollIndicatorInsets={{ right: 1 }}
            fadingEdgeLength={50}
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              setScrollPosition(contentOffset.y);
              setContentHeight(contentSize.height);
              setScrollViewHeight(layoutMeasurement.height);
              setShowScrollIndicator(contentSize.height > layoutMeasurement.height);
            }}
            onContentSizeChange={(width, height) => {
              setContentHeight(height);
              setShowScrollIndicator(height > scrollViewHeight);
            }}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              setScrollViewHeight(height);
              setShowScrollIndicator(contentHeight > height);
            }}
          >
            <Text style={styles.serviceId}>Serviço: {servicoId}</Text>
            
            {/* Aviso para encarregados quando o serviço já foi finalizado */}
            {isFormDisabled && (
              <View style={styles.warningSection}>
                <Text style={styles.warningText}>
                  ⚠️ Este serviço já foi finalizado e não pode ser editado.
                </Text>
              </View>
            )}
            
            {/* Cabeçalho com informações predefinidas */}
            <View style={styles.headerSection}>
              <Text style={styles.sectionTitle}>Informações do Serviço</Text>
              
              <View style={styles.headerRow}>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>KM Inicial *</Text>
                  <TextInput
                    style={styles.headerInput}
                    value={headerData.km_inicial?.toString() || ''}
                    onChangeText={(text) => setHeaderData({...headerData, km_inicial: parseInt(text) || undefined})}
                    placeholder="0"
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>KM Final *</Text>
                  <TextInput
                    style={styles.headerInput}
                    value={headerData.km_final?.toString() || ''}
                    onChangeText={(text) => setHeaderData({...headerData, km_final: parseInt(text) || undefined})}
                    placeholder="0"
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
              </View>
              
              <View style={styles.headerRow}>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>Equipe</Text>
                  <TextInput
                    style={[styles.headerInput, styles.readOnlyInput]}
                    value={headerData.equipe_prefixo}
                    editable={false}
                    placeholder="Prefixo da equipe"
                  />
                </View>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>Data</Text>
                  <TextInput
                    style={[styles.headerInput, styles.readOnlyInput]}
                    value={headerData.data_execucao}
                    editable={false}
                    placeholder="Data atual"
                  />
                </View>
              </View>
              
              <View style={styles.headerRow}>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>Hora Inicial *</Text>
                  <TextInput
                    style={[styles.headerInput, styles.readOnlyInput]}
                    value={headerData.hora_inicial}
                    editable={false}
                    placeholder="00:00"
                  />
                </View>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>Hora Final *</Text>
                  <TextInput
                    style={[styles.headerInput, styles.readOnlyInput]}
                    value={headerData.hora_final}
                    editable={false}
                    placeholder="00:00"
                  />
                </View>
              </View>
              
              <View style={styles.headerRow}>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>Equipamento *</Text>
                  <TextInput
                    style={styles.headerInput}
                    value={headerData.equipamento}
                    onChangeText={(text) => setHeaderData({...headerData, equipamento: text})}
                    placeholder="Número de série do equipamento"
                    editable={!isSubmitting}
                  />
                </View>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>Projeto</Text>
                  <TextInput
                    style={[styles.headerInput, styles.readOnlyInput]}
                    value={headerData.projeto}
                    editable={false}
                    placeholder="Nota do serviço"
                  />
                </View>
              </View>
              
              <View style={styles.headerRow}>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>SI</Text>
                  <TextInput
                    style={styles.headerInput}
                    value={headerData.si}
                    onChangeText={(text) => setHeaderData({...headerData, si: text})}
                    placeholder="Número sistêmico SI"
                    editable={!isSubmitting && !isFormDisabled}
                  />
                </View>
                <View style={styles.headerField}>
                  <Text style={styles.fieldLabel}>PTP</Text>
                  <TextInput
                    style={styles.headerInput}
                    value={headerData.ptp}
                    onChangeText={(text) => setHeaderData({...headerData, ptp: text})}
                    placeholder="Número sistêmico PTP"
                    editable={!isSubmitting && !isFormDisabled}
                  />
                </View>
              </View>
              
              <View style={styles.fullWidthField}>
                <Text style={styles.fieldLabel}>Status do Serviço</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={headerData.status_servico}
                    onValueChange={(itemValue) => setHeaderData({...headerData, status_servico: itemValue})}
                    style={styles.picker}
                    itemStyle={{ color: '#1F2937', fontSize: 16 }}
                    mode="dropdown"
                    enabled={!isSubmitting && !isFormDisabled}
                  >
                    <Picker.Item value="Parcial" label="Parcial" />
                    <Picker.Item value="Final" label="Final" />
                  </Picker>
                </View>
              </View>
            </View>
            
            {/* Formulário de Adição de Item */}
            <View style={styles.addItemSection}>
              <Text style={styles.sectionTitle}>Adicionar Item ao Checklist</Text>
              
              {/* Seleção de Grupo */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Grupo *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedGrupo}
                    onValueChange={(itemValue) => handleGrupoSelect(itemValue)}
                    style={styles.picker}
                    enabled={!isSubmitting && !isFormDisabled}
                    itemStyle={{ color: '#1F2937', fontSize: 16 }}
                    mode="dropdown"
                  >
                    <Picker.Item value="" label="Selecione um grupo" />
                    {grupos.map((grupo) => (
                      <Picker.Item key={grupo} label={grupo} value={grupo} />
                    ))}
                  </Picker>
                </View>
              </View>
              
              {/* Seleção de Item */}
              {selectedGrupo && (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Item *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedItemId}
                      onValueChange={(itemValue) => {
                        setSelectedItemId(itemValue === '' ? '' : Number(itemValue));
                        setFormData({
                          status: 'Instalado' as 'Instalado' | 'Retirado',
                          quantidade: 1,
                          numeros_serie: ['']
                        });
                      }}
                      style={styles.picker}
                      enabled={!isSubmitting && !isFormDisabled}
                      itemStyle={{ color: '#1F2937', fontSize: 16 }}
                      mode="dropdown"
                    >
                      <Picker.Item value="" label="Selecione um item" />
                      {grupoItens
                        .filter(item => item.grupo === selectedGrupo)
                        .map((item) => (
                          <Picker.Item 
                            key={item.id} 
                            value={item.id} 
                            label={`${item.item}${item.unidade ? ` (${item.unidade})` : ''}`} 
                          />
                        ))}
                    </Picker>
                  </View>
                  {selectedItemId && (
                    <Text style={styles.itemCodeInfo}>Item selecionado: {grupoItens.find(i => i.id === selectedItemId)?.item}</Text>
                  )}
                </View>
              )}
              
              {/* Seleção de Status */}
              {selectedItemId && (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Status *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.status}
                      onValueChange={(itemValue) => {
                        setFormData({...formData, status: itemValue});
                      }}
                      style={styles.picker}
                      enabled={!isSubmitting && !isFormDisabled}
                      itemStyle={{ color: '#1F2937', fontSize: 16 }}
                      mode="dropdown"
                    >
                      <Picker.Item value="Instalado" label="Instalado" />
                      <Picker.Item value="Retirado" label="Retirado" />
                    </Picker>
                  </View>
                </View>
              )}

              {/* Quantidade */}
              {selectedItemId && (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Quantidade *</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity onPress={() => handleQuantityChange('decrease')} style={styles.quantityButton} disabled={isSubmitting || isFormDisabled}>
                      <Minus size={20} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{formData.quantidade}</Text>
                    <TouchableOpacity onPress={() => handleQuantityChange('increase')} style={styles.quantityButton} disabled={isSubmitting || isFormDisabled}>
                      <Plus size={20} color="#1F2937" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {/* Números de Série */}
              {selectedItemId && selectedGrupo && requiresSerialNumbers(selectedGrupo) && (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Números de Série</Text>
                  {Array.from({ length: formData.quantidade }).map((_, index) => (
                    <TextInput
                      key={index}
                      style={styles.serialInput}
                      value={formData.numeros_serie[index] || ''}
                      onChangeText={(text) => handleSerialNumberChange(text, index)}
                      placeholder={`Número de série ${index + 1}`}
                      editable={!isSubmitting && !isFormDisabled}
                    />
                  ))}
                </View>
              )}
              
              {/* Botão Adicionar */}
              {selectedItemId && formData.status && (
                <TouchableOpacity 
                  style={styles.addItemButton}
                  onPress={handleAddItem}
                  disabled={isSubmitting || isFormDisabled}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.addItemButtonText}>Adicionar ao Checklist</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Itens Selecionados */}
            {giservicos.length > 0 && (
              <View style={styles.selectedItemsSection}>
                <Text style={styles.sectionTitle}>Itens Selecionados ({giservicos.length})</Text>
                
                {giservicos.map((giservico) => {
                  const item = grupoItens.find(i => i.id === giservico.id_item);
                    
                  if (!item) return null;
                  
                  return (
                    <View key={giservico.id} style={styles.selectedItem}>
                      <Text style={styles.selectedItemName}>{item.item || ''}</Text>
                      <Text style={styles.selectedItemDetails}>
                        Status: {giservico.status || ''}
                      </Text>
                      <Text style={styles.selectedItemDetails}>
                        Quantidade: {giservico.quantidade?.toString() || '1'}
                      </Text>
                      {giservico.n_serie && (
                        <Text style={styles.selectedItemSerial}>Nº Série: {Array.isArray(giservico.n_serie) ? giservico.n_serie.join(', ') : giservico.n_serie}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Indicador de posição de rolagem */}
          {showScrollIndicator && (
            <View style={styles.scrollPosition}>
              <Text style={styles.scrollPositionText}>
                {Math.round((scrollPosition / Math.max(contentHeight - scrollViewHeight, 1)) * 100)}%
              </Text>
            </View>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={submitChecklist}
              disabled={isSubmitting || isFormDisabled}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={20} color="#FFFFFF" />
              )}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Salvando...' : 'Enviar Checklist'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
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
    paddingRight: 15, // Reduz padding direito para dar espaço à barra de rolagem
  },
  serviceId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 20,
  },
  warningSection: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
  // Header Section Styles
  headerSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  headerField: {
    flex: 1,
  },
  fullWidthField: {
    marginBottom: 12,
  },
  fieldLabel: {
     fontSize: 14,
     fontWeight: '600',
     color: '#374151',
     marginBottom: 6,
   },
   headerInput: {
     borderWidth: 1,
     borderColor: '#ddd',
     borderRadius: 8,
     padding: 12,
     fontSize: 16,
     backgroundColor: '#fff',
     minHeight: 44,
   },
   readOnlyInput: {
     backgroundColor: '#f5f5f5',
     color: '#666',
   },
  // Group Section Styles
  groupSection: {
    marginBottom: 24,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  picker: {
    height: 50,
    color: '#1F2937', // Adiciona cor do texto
  },
  // Items Section Styles
  itemsSection: {
    marginBottom: 24,
  },
  itemCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  itemUnit: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  itemCode: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  itemControls: {
    gap: 12,
  },
  addItemSection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  // Removed duplicate fieldLabel definition
  itemCodeInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quantityDisplayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginHorizontal: 20,
    minWidth: 40,
    textAlign: 'center',
  },
  serialSection: {
    marginTop: 8,
  },
  serialInputGroup: {
    marginBottom: 12,
  },
  serialLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  serialInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  addItemButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addItemButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  quantitySection: {
    marginVertical: 8,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    minWidth: 40,
    textAlign: 'center',
  },
  statusControls: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
  },

  serialNumberSection: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serialNumberLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  serialNumberField: {
    marginBottom: 8,
  },
  serialFieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  serialNumberInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 40,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Selected Items Section
  selectedItemsSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  selectedItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  selectedItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedItemDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },

  serialNumberInfo: {
    marginTop: 4,
    marginBottom: 4,
  },
  selectedItemSerial: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '500',
    marginBottom: 2,
  },
  // Footer
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure it's on top
    borderRadius: 20, // Match modal content border radius
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#3B82F6',
  },
  scrollIndicator: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 2,
  },
  scrollThumb: {
    position: 'absolute',
    right: 2,
    width: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    minHeight: 20,
  },
  scrollPosition: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 5,
  },
  scrollPositionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
