import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Upload, FileSpreadsheet, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Equipe } from '@/types/types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface ImportResult {
  success: number;
  errors: string[];
}

export default function ImportScreen() {
  const { colaborador } = useAuth();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Equipe | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (colaborador) {
      loadCurrentTeam();
    }
  }, [colaborador]);

  const loadCurrentTeam = async () => {
    try {
      const equipesData = await api.getEquipes();
      
      const teamToday = equipesData.find(
        (equipe: Equipe) => equipe.data === today && equipe.encarregadoMatricula === colaborador?.matricula
      );
      setCurrentTeam(teamToday || null);
    } catch (error) {
      console.error('Erro ao carregar equipe atual:', error);
    }
  };

  const selectFile = async () => {
    try {
      // Verificar se estamos no ambiente web
      if (typeof window !== 'undefined' && window.document) {
        // Ambiente web - usar input file
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        
        return new Promise((resolve) => {
          input.onchange = (event: any) => {
            const file = event.target.files[0];
            if (file) {
              const fileUrl = URL.createObjectURL(file);
              setSelectedFile({
                 canceled: false,
                 assets: [{
                   name: file.name,
                   size: file.size,
                   uri: fileUrl,
                   mimeType: file.type
                 }]
               });
              setImportResult(null);
            }
            resolve(null);
          };
          input.click();
        });
      } else {
        // Ambiente mobile - usar DocumentPicker
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
          ],
          copyToCacheDirectory: true,
        });

        if (!result.canceled) {
          setSelectedFile(result);
          setImportResult(null);
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar arquivo:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo.');
    }
  };

  const processExcelFile = async (fileUri: string) => {

    try {
      let workbook;
      
      // Verificar se estamos no ambiente web ou mobile
      if (typeof window !== 'undefined' && window.fetch) {
        // Ambiente web - usar fetch para ler o arquivo
        const response = await fetch(fileUri);
        const arrayBuffer = await response.arrayBuffer();
        workbook = XLSX.read(arrayBuffer, { type: 'array' });
      } else {
        // Ambiente mobile - usar FileSystem
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Converter base64 para array buffer
        const binaryString = atob(fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        workbook = XLSX.read(bytes, { type: 'array' });
      }
      
      // Pegar a primeira planilha
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON
      const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (excelData.length < 2) {
        throw new Error('Planilha vazia ou sem dados válidos');
      }
      
      // Primeira linha são os cabeçalhos
      const headers = excelData[0] as string[];
      
      // Mapear índices das colunas
      const notaIndex = headers.findIndex(h => h && h.toLowerCase().includes('nota'));
      const obsIndex = headers.findIndex(h => h && h.toLowerCase().includes('obs'));
      const equipeIndex = headers.findIndex(h => h && h.toLowerCase().includes('equipe'));
      const dataIndex = headers.findIndex(h => h && h.toLowerCase().includes('data'));
      
      if (notaIndex === -1 || obsIndex === -1 || equipeIndex === -1 || dataIndex === -1) {
        throw new Error('Colunas obrigatórias não encontradas. Verifique se a planilha contém: nota, obs, equipe, Data de Execucao');
      }
      
      // Processar dados das linhas (pular cabeçalho)
      const processedData = [];
      
      for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i] as any[];
        
        // Pular linhas vazias
        if (!row || row.length === 0 || !row[notaIndex]) {
          continue;
        }
        
        const nota = row[notaIndex]?.toString().trim();
        const obs = row[obsIndex]?.toString().trim();
        const equipe = row[equipeIndex]?.toString().trim();
        let dataExecucao = row[dataIndex];
        
        // Processar data
        if (typeof dataExecucao === 'number') {
          // Excel armazena datas como números seriais
          const excelDate = new Date((dataExecucao - 25569) * 86400 * 1000);
          dataExecucao = format(excelDate, 'yyyy-MM-dd');
        } else if (dataExecucao) {
          // Tentar converter string para data
          const parsedDate = new Date(dataExecucao);
          if (!isNaN(parsedDate.getTime())) {
            dataExecucao = format(parsedDate, 'yyyy-MM-dd');
          } else {
            dataExecucao = today; // Usar data atual como fallback
          }
        } else {
          dataExecucao = today; // Usar data atual como fallback
        }
        
        if (nota && obs && equipe) {
          processedData.push({
            nota: nota,
            equipe_prefixo: equipe,
            data_planejada: dataExecucao,
            descricao: obs,
            status: 'Planejado'
          });
        }
      }
      

      
      if (processedData.length === 0) {
        throw new Error('Nenhum registro válido encontrado na planilha');
      }
      
      return processedData;
      
    } catch (error) {
      throw error;
    }
  };

  const importServices = async () => {
    if (!selectedFile || selectedFile.canceled) {
      Alert.alert('Erro', 'Nenhum arquivo selecionado');
      return;
    }

    setImporting(true);
    
    try {
      // Process the Excel file
      const servicesData = await processExcelFile(selectedFile.assets[0].uri);
      
      const results: ImportResult = {
        success: 0,
        errors: []
      };

      // Send each service to the API
      if (servicesData && servicesData.length > 0) {
        for (const serviceData of servicesData) {
          try {
            const result = await api.createServico(serviceData);
            results.success++;
          } catch (error: any) {
            
            // Tratar erros específicos de forma mais clara
            let errorMessage = '';
            if (error?.code === 'P0001' && error?.message?.includes('não encontrada')) {
              errorMessage = `Equipe ${serviceData.equipe_prefixo} não encontrada no sistema`;
            } else if (error?.message) {
              errorMessage = error.message;
            } else {
              errorMessage = 'Erro desconhecido';
            }
            
            results.errors.push(`Erro ao importar serviço ${serviceData.nota}: ${errorMessage}`);
          }
        }
      } else {
        results.errors.push('Nenhum dado válido encontrado no arquivo');
      }
      setImportResult(results);
      
      // Mostrar resultado da importação
      if (results.success > 0 && results.errors.length > 0) {
        Alert.alert(
          'Importação Parcial',
          `${results.success} serviços importados com sucesso.\n${results.errors.length} serviços falharam. Verifique a seção "Resultado de Importação" para detalhes.`
        );
      } else if (results.success > 0) {
        Alert.alert(
          'Importação Concluída',
          `${results.success} serviços importados com sucesso`
        );
      } else if (results.errors.length > 0) {
        Alert.alert(
          'Erro na Importação',
          `Nenhum serviço foi importado. Verifique a seção "Resultado de Importação" para detalhes.`
        );
      }
    } catch (error) {
      Alert.alert('Erro', `Falha ao processar arquivo: ${error}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Importar Programação</Text>
        <Text style={styles.subtitle}>Upload de planilha de serviços</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.uploadCard}>
          <View style={styles.uploadHeader}>
            <Upload size={32} color="#3B82F6" />
            <Text style={styles.uploadTitle}>
              Importar Programação de Serviços
            </Text>
          </View>

          <Text style={styles.uploadDescription}>
            Selecione uma planilha Excel (.xlsx) contendo a programação dos serviços. 
            A planilha deve conter as colunas: nota, obs, equipe, Data de Execucao.
          </Text>

          {!selectedFile || selectedFile.canceled ? (
            <TouchableOpacity style={styles.selectButton} onPress={selectFile}>
              <FileSpreadsheet size={24} color="#FFFFFF" />
              <Text style={styles.selectButtonText}>Selecionar Arquivo</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.selectedFileContainer}>
              <View style={styles.fileInfo}>
                <FileSpreadsheet size={24} color="#10B981" />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>
                    {selectedFile.assets[0].name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {Math.round((selectedFile.assets[0].size || 0) / 1024)} KB
                  </Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.changeButton} 
                  onPress={selectFile}
                >
                  <Text style={styles.changeButtonText}>Alterar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.importButton, importing && styles.importButtonDisabled]}
                  onPress={importServices}
                  disabled={importing}
                >
                  <Upload size={20} color="#FFFFFF" />
                  <Text style={styles.importButtonText}>
                    {importing ? 'Importando...' : 'Importar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Import Results */}
        {importResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              {importResult.success > 0 ? (
                <CheckCircle size={24} color="#10B981" />
              ) : (
                <AlertCircle size={24} color="#EF4444" />
              )}
              <Text style={styles.resultTitle}>Resultado da Importação</Text>
            </View>

            <View style={styles.resultStats}>
              <Text style={styles.successText}>
                ✅ {importResult.success} serviços importados com sucesso
              </Text>
              
              {importResult.errors.length > 0 && (
                <Text style={styles.errorText}>
                  ❌ {importResult.errors.length} erros encontrados
                </Text>
              )}
            </View>

            {importResult.errors.length > 0 && (
              <View style={styles.errorsContainer}>
                <Text style={styles.errorsTitle}>Erros:</Text>
                {importResult.errors.map((error, index) => (
                  <Text key={index} style={styles.errorDetail}>
                    • {error}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Formato da Planilha</Text>
          <Text style={styles.instructionsText}>
            A planilha deve conter as seguintes colunas:
          </Text>
          
          <View style={styles.columnList}>
            <Text style={styles.columnItem}>• nota: ID/número da nota de serviço</Text>
            <Text style={styles.columnItem}>• obs: Observações/descrição do serviço</Text>
            <Text style={styles.columnItem}>• equipe: Prefixo da equipe responsável</Text>
            <Text style={styles.columnItem}>• Data de Execucao: Data de execução no formato YYYY-MM-DD</Text>
          </View>
        </View>
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
  uploadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 12,
    textAlign: 'center',
  },
  uploadDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  selectedFileContainer: {
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  fileSize: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  changeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  changeButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 6,
  },
  importButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultCard: {
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
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 12,
  },
  resultStats: {
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: '#059669',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
  errorsContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 8,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#7F1D1D',
    marginBottom: 4,
  },
  instructionsCard: {
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
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  columnList: {
    marginLeft: 8,
  },
  columnItem: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 20,
  },
});