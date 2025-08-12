import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Calendar, BarChart3, Filter, TrendingUp } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Picker } from '@react-native-picker/picker';

// Interfaces para os dados de faturamento
interface FaturamentoDiario {
  dia: string;
  data: string;
  valor_total: number;
}

interface FaturamentoSemanal {
  semana: string;
  valor_total: number;
  equipe?: string;
  dias: FaturamentoDiario[];
}

interface EquipeOption {
  id: string;
  prefixo: string;
}

export default function ReportsScreen() {
  const { colaborador, loading: authLoading } = useAuth();
  const [startDate, setStartDate] = useState(subWeeks(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [faturamentoData, setFaturamentoData] = useState<FaturamentoSemanal[]>([]);
  const [equipes, setEquipes] = useState<EquipeOption[]>([]);
  const [selectedEquipe, setSelectedEquipe] = useState<string>('todas');
  const [loading, setLoading] = useState(false);
  const [totalFaturamento, setTotalFaturamento] = useState(0);
  const [mediaFaturamento, setMediaFaturamento] = useState(0);
  const [equipeEncarregado, setEquipeEncarregado] = useState<string | null>(null);

  const isAdmin = colaborador?.funcao === 'Admin';
  const isEncarregado = colaborador?.funcao?.toUpperCase().includes('ENCARREGADO');

  useEffect(() => {
    loadEquipes();
    if (isEncarregado && colaborador) {
      loadEquipeEncarregado();
    }
  }, [colaborador, isEncarregado]);

  useEffect(() => {
    if (!authLoading && colaborador) {
      loadFaturamentoData();
    }
  }, [startDate, endDate, selectedEquipe, authLoading, colaborador]);

  const loadEquipes = async () => {
    try {
      const { data, error } = await supabase
        .from('equipes')
        .select('id, prefixo')
        .order('prefixo');
      
      if (error) throw error;
      setEquipes(data || []);
    } catch (error) {
      console.error('Erro ao carregar equipes:', error);
    }
  };

  const loadEquipeEncarregado = async () => {
    try {
      if (!colaborador?.matricula) return;
      
      const { data, error } = await supabase
        .from('equipes')
        .select('prefixo')
        .eq('encarregado_matricula', colaborador.matricula)
        .single();
      
      if (error) {
        console.error('Erro ao carregar equipe do encarregado:', error);
        setEquipeEncarregado(null);
        return;
      }
      
      setEquipeEncarregado(data?.prefixo || null);
    } catch (error) {
      console.error('Erro ao carregar equipe do encarregado:', error);
      setEquipeEncarregado(null);
    }
  };

  const loadFaturamentoData = async () => {
    setLoading(true);
    try {
      if (!colaborador) {
        setLoading(false);
        return;
      }
      
      // Usar as datas de início e fim selecionadas
      const queryStartDate = startOfWeek(startDate, { weekStartsOn: 1 });
      const queryEndDate = endOfWeek(endDate, { weekStartsOn: 1 });
      
      let query = supabase
        .from('vw_faturamento_real')
        .select(`
          data_servico,
          valor_total,
          equipe
        `)
        .gte('data_servico', format(queryStartDate, 'yyyy-MM-dd'))
        .lte('data_servico', format(queryEndDate, 'yyyy-MM-dd'));
      
      // Filtrar por equipe
      if (isEncarregado && colaborador?.matricula) {
        // Para encarregados: buscar todas as equipes que ele gerencia
        const { data: equipesEncarregado, error: equipeError } = await supabase
          .from('equipes')
          .select('prefixo')
          .eq('encarregado_matricula', colaborador.matricula);
        
        if (equipeError) {
          console.error('Erro ao buscar equipes do encarregado:', equipeError);
          // Se houver erro, não mostrar dados
          query = query.eq('equipe', 'EQUIPE_INEXISTENTE');
        } else if (equipesEncarregado && equipesEncarregado.length > 0) {
          // Filtrar por todas as equipes do encarregado
          const prefixos = equipesEncarregado.map(e => e.prefixo);
          query = query.in('equipe', prefixos);
        } else {
          // Se não encontrar equipes, não mostrar dados
          query = query.eq('equipe', 'EQUIPE_INEXISTENTE');
        }
      } else if (isAdmin && selectedEquipe !== 'todas') {
        // Para administradores: aplicar filtro de equipe selecionada
        const equipeData = equipes.find(e => {
          return e.id === selectedEquipe || e.id.toString() === selectedEquipe.toString();
        });
        if (equipeData) {
          query = query.eq('equipe', equipeData.prefixo);
        } else {
          // Se não encontrar a equipe, não mostrar dados
          query = query.eq('equipe', 'EQUIPE_INEXISTENTE');
        }
      } else if (!isAdmin && !isEncarregado) {
        // Para outros perfis que não são admin nem encarregado, não mostrar dados
        query = query.eq('equipe', 'EQUIPE_INEXISTENTE');
      }
      // Se for admin e selectedEquipe === 'todas', não aplica filtro (mostra todas as equipes)
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Processar dados por semana
      const weeklyData = processWeeklyData(data || [], queryStartDate, queryEndDate);
      setFaturamentoData(weeklyData);
      
      // Calcular estatísticas
      const total = weeklyData.reduce((sum, item) => sum + item.valor_total, 0);
      setTotalFaturamento(total);
      setMediaFaturamento(weeklyData.length > 0 ? total / weeklyData.length : 0);
      
    } catch (error) {
      console.error('Erro ao carregar dados de faturamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const processWeeklyData = (data: any[], queryStartDate: Date, queryEndDate: Date): FaturamentoSemanal[] => {
    const weeklyMap = new Map<string, { valor_total: number; dias: Map<string, number> }>();
    
    // Calcular número de semanas no período
    const diffInWeeks = Math.ceil((queryEndDate.getTime() - queryStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    // Inicializar todas as semanas com valor 0 e dias vazios
    for (let i = 0; i <= diffInWeeks; i++) {
      const weekStart = addWeeks(queryStartDate, i);
      if (weekStart <= queryEndDate) {
        const weekKey = format(weekStart, 'dd/MM', { locale: ptBR });
        weeklyMap.set(weekKey, { valor_total: 0, dias: new Map() });
        
        // Inicializar todos os dias da semana
        for (let j = 0; j < 7; j++) {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + j);
          if (dayDate >= queryStartDate && dayDate <= queryEndDate) {
            const dayKey = format(dayDate, 'dd/MM', { locale: ptBR });
            weeklyMap.get(weekKey)!.dias.set(dayKey, 0);
          }
        }
      }
    }
    
    // Somar valores por semana e dia
    data.forEach((item) => {
      // Criar data sem problemas de fuso horário
      const [year, month, day] = item.data_servico.split('-').map(Number);
      const itemDate = new Date(year, month - 1, day);
      const weekStart = startOfWeek(itemDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'dd/MM', { locale: ptBR });
      const dayKey = format(itemDate, 'dd/MM', { locale: ptBR });
      
      if (weeklyMap.has(weekKey)) {
        const weekData = weeklyMap.get(weekKey)!;
        weekData.valor_total += (item.valor_total || 0);
        if (weekData.dias.has(dayKey)) {
          weekData.dias.set(dayKey, weekData.dias.get(dayKey)! + (item.valor_total || 0));
        }
      }
    });
    
    const result = Array.from(weeklyMap.entries()).map(([semana, weekData]) => ({
      semana,
      valor_total: weekData.valor_total,
      dias: Array.from(weekData.dias.entries()).map(([dayKey, valor]) => {
        const [day, month] = dayKey.split('/');
        const currentYear = new Date().getFullYear();
        const dayName = format(new Date(currentYear, parseInt(month) - 1, parseInt(day)), 'EEEE', { locale: ptBR });
        return {
          dia: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          data: dayKey,
          valor_total: valor
        };
      })
    }));
    
    return result;
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };



  // Mostrar loading enquanto a autenticação não estiver completa
  if (authLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <BarChart3 size={28} color="#007AFF" />
          <View style={styles.headerText}>
            <Text style={styles.title}>Faturamento Semanal</Text>
            <Text style={styles.subtitle}>Análise de valores por semana</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando autenticação...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BarChart3 size={28} color="#007AFF" />
        <View style={styles.headerText}>
          <Text style={styles.title}>Faturamento Semanal</Text>
          <Text style={styles.subtitle}>Análise de valores por semana</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={styles.filtersContainer}>
          <View style={styles.dateSection}>
            <Text style={styles.sectionTitle}>Período</Text>
            <View style={styles.dateRangeContainer}>
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Data Início</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Calendar size={20} color="#007AFF" />
                  <Text style={styles.dateText}>
                    {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.dateInputContainer}>
                <Text style={styles.dateLabel}>Data Fim</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Calendar size={20} color="#007AFF" />
                  <Text style={styles.dateText}>
                    {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {isAdmin && (
            <View style={styles.equipeSection}>
              <Filter size={20} color="#007AFF" />
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedEquipe}
                  onValueChange={setSelectedEquipe}
                  style={styles.picker}
                >
                  <Picker.Item label="Todas as Equipes" value="todas" />
                  {equipes.map((equipe) => (
                    <Picker.Item 
                      key={equipe.id} 
                      label={equipe.prefixo} 
                      value={equipe.id} 
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>

        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={onStartDateChange}
          />
        )}
        
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={onEndDateChange}
          />
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#34C759" />
            <Text style={styles.statNumber}>{formatCurrency(totalFaturamento)}</Text>
            <Text style={styles.statLabel}>Total do Período</Text>
          </View>
          
          <View style={styles.statCard}>
            <BarChart3 size={24} color="#007AFF" />
            <Text style={styles.statNumber}>{formatCurrency(mediaFaturamento)}</Text>
            <Text style={styles.statLabel}>Média Semanal</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        ) : (
          <View style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <BarChart3 size={24} color="#3B82F6" />
              <Text style={styles.reportTitle}>Faturamento por Semana</Text>
            </View>

            {faturamentoData.length > 0 ? (
              <View style={styles.weeksContainer}>
                {faturamentoData.map((item, index) => {
                  const maxValue = Math.max(...faturamentoData.map(d => d.valor_total));
                  const percentage = maxValue > 0 ? (item.valor_total / maxValue) * 100 : 0;
                  const maxDayValue = Math.max(...item.dias.map(d => d.valor_total));
                  
                  return (
                    <View key={index} style={styles.weekCard}>
                      <Text style={styles.weekTitle}>Semana {index + 1}</Text>
                      <View style={styles.barContainer}>
                        <View style={styles.barBackground}>
                          <View 
                            style={[
                              styles.barFill, 
                              { height: `${percentage}%` }
                            ]} 
                          />
                        </View>
                        <Text style={styles.barValue}>
                          {formatCurrency(item.valor_total)}
                        </Text>
                      </View>
                      <Text style={styles.weekLabel}>{item.semana}</Text>
                      
                      {/* Dados diários */}
                      <View style={styles.daysContainer}>
                        <Text style={styles.daysTitle}>Detalhamento Diário:</Text>
                        {item.dias.map((dia, dayIndex) => {
                          const dayPercentage = maxDayValue > 0 ? (dia.valor_total / maxDayValue) * 100 : 0;
                          return (
                            <View key={dayIndex} style={styles.dayRow}>
                              <View style={styles.dayInfo}>
                                <Text style={styles.dayName}>{dia.dia}</Text>
                                <Text style={styles.dayDate}>{dia.data}</Text>
                              </View>
                              <View style={styles.dayBarContainer}>
                                <View style={styles.dayBarBackground}>
                                  <View 
                                    style={[
                                      styles.dayBarFill, 
                                      { width: `${dayPercentage}%` }
                                    ]} 
                                  />
                                </View>
                                <Text style={styles.dayValue}>
                                  {formatCurrency(dia.valor_total)}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Nenhum dado encontrado para o período selecionado</Text>
              </View>
            )}
          </View>
        )}

        {!isAdmin && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Visualizando dados da sua equipe: {equipeEncarregado || 'N/A'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minHeight: 48,
  },
  dateText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  equipeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerContainer: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  picker: {
    height: 50,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    marginTop: 0,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 8,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  reportCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginLeft: 12,
  },
  chart: {
    borderRadius: 16,
  },
  weeksContainer: {
    gap: 12,
  },
  weekCard: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  weekTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  barContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  barBackground: {
    width: 40,
    height: 80,
    backgroundColor: '#e9ecef',
    borderRadius: 20,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 20,
    minHeight: 4,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
  weekLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  daysContainer: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  daysTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 12,
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#212529',
  },
  dayDate: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 2,
  },
  dayBarContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  dayBarBackground: {
    width: 60,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  dayBarFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
    minWidth: 2,
  },
  dayValue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#28a745',
    textAlign: 'right',
  },
  noDataContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#1565c0',
    fontWeight: '500',
  },
});