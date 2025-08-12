// =====================================================
// SERVIÇO DE FATURAMENTO SIMPLES COM VIEWS
// =====================================================
// API simplificada para usar as VIEWs de faturamento
// que detectam automaticamente substituições
// Data: 2025-01-27

import { supabase } from './supabase';

// =====================================================
// INTERFACES SIMPLIFICADAS
// =====================================================

export interface FaturamentoItem {
  giservico_id: number;
  id_servico: number;
  id_item: number;
  grupo: string;
  item: string;
  status: 'Instalado' | 'Retirado';
  quantidade: number;
  n_serie?: string;
  prefixo?: string;
  created_at: string;
  valor_unitario: number;
  valor_total: number;
  unidade: string;
  eh_substituicao: boolean;
  tipo_operacao: 'Normal' | 'Substituição';
}

export interface ResumoFaturamentoServico {
  id_servico: number;
  descricao_servico: string;
  equipe_prefixo: string;
  data_planejada: string;
  status_servico: string;
  total_itens: number;
  qtd_instalados: number;
  qtd_retirados: number;
  valor_instalados: number;
  valor_retirados: number;
  valor_total_servico: number;
  tem_substituicao_trafo: boolean;
  grupos_presentes: string;
  calculado_em: string;
}

export interface ResumoFaturamentoGrupo {
  grupo: string;
  total_servicos: number;
  total_itens: number;
  qtd_instalados: number;
  qtd_retirados: number;
  valor_instalados: number;
  valor_retirados: number;
  valor_total_grupo: number;
  valor_medio_unitario: number;
}

export interface ValorFaturamentoSimples {
  id: number;
  grupo: string;
  item: string;
  status: 'Instalado' | 'Retirado';
  valor_normal: number;
  valor_substituicao?: number;
  unidade: string;
  ativo: boolean;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// FUNÇÕES PARA CONSULTAR FATURAMENTO
// =====================================================

/**
 * Busca faturamento detalhado de um serviço específico
 */
export async function buscarFaturamentoServico(idServico: number): Promise<FaturamentoItem[]> {
  const { data, error } = await supabase
    .from('vw_faturamento_automatico')
    .select('*')
    .eq('id_servico', idServico)
    .order('grupo')
    .order('status');

  if (error) {
    console.error('Erro ao buscar faturamento do serviço:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca resumo de faturamento de um serviço
 */
export async function buscarResumoFaturamentoServico(idServico: number): Promise<ResumoFaturamentoServico | null> {
  const { data, error } = await supabase
    .from('vw_resumo_faturamento_servico')
    .select('*')
    .eq('id_servico', idServico)
    .single();

  if (error) {
    console.error('Erro ao buscar resumo do serviço:', error);
    throw error;
  }

  return data;
}

/**
 * Busca faturamento por equipe em um período
 */
export async function buscarFaturamentoPorEquipe(
  equipePrefixo: string,
  dataInicio: string,
  dataFim: string
): Promise<ResumoFaturamentoServico[]> {
  const { data, error } = await supabase
    .from('vw_resumo_faturamento_servico')
    .select('*')
    .eq('equipe_prefixo', equipePrefixo)
    .gte('data_planejada', dataInicio)
    .lte('data_planejada', dataFim)
    .order('data_planejada', { ascending: false });

  if (error) {
    console.error('Erro ao buscar faturamento por equipe:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca ranking de equipes por faturamento
 */
export async function buscarRankingEquipes(
  dataInicio: string,
  dataFim: string,
  limite: number = 10
): Promise<any[]> {
  const { data, error } = await supabase
    .rpc('ranking_equipes_faturamento', {
      data_inicio: dataInicio,
      data_fim: dataFim,
      limite_resultado: limite
    });

  if (error) {
    console.error('Erro ao buscar ranking de equipes:', error);
    // Fallback: consulta manual se a função não existir
    return await buscarRankingEquipesFallback(dataInicio, dataFim, limite);
  }

  return data || [];
}

/**
 * Fallback para ranking de equipes (consulta manual)
 */
async function buscarRankingEquipesFallback(
  dataInicio: string,
  dataFim: string,
  limite: number
): Promise<any[]> {
  const { data, error } = await supabase
    .from('vw_resumo_faturamento_servico')
    .select(`
      equipe_prefixo,
      valor_total_servico
    `)
    .gte('data_planejada', dataInicio)
    .lte('data_planejada', dataFim);

  if (error) {
    throw error;
  }

  // Agrupa por equipe
  const agrupado = (data || []).reduce((acc: any, item: any) => {
    const equipe = item.equipe_prefixo;
    if (!acc[equipe]) {
      acc[equipe] = {
        equipe_prefixo: equipe,
        total_servicos: 0,
        valor_total_equipe: 0
      };
    }
    acc[equipe].total_servicos += 1;
    acc[equipe].valor_total_equipe += item.valor_total_servico;
    return acc;
  }, {});

  return Object.values(agrupado)
    .sort((a: any, b: any) => b.valor_total_equipe - a.valor_total_equipe)
    .slice(0, limite);
}

/**
 * Busca resumo por grupos de equipamentos
 */
export async function buscarResumoFaturamentoPorGrupo(): Promise<ResumoFaturamentoGrupo[]> {
  const { data, error } = await supabase
    .from('vw_resumo_faturamento_grupo')
    .select('*')
    .order('valor_total_grupo', { ascending: false });

  if (error) {
    console.error('Erro ao buscar resumo por grupo:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca serviços com substituição de transformador
 */
export async function buscarServicosComSubstituicao(
  dataInicio?: string,
  dataFim?: string
): Promise<ResumoFaturamentoServico[]> {
  let query = supabase
    .from('vw_resumo_faturamento_servico')
    .select('*')
    .eq('tem_substituicao_trafo', true);

  if (dataInicio) {
    query = query.gte('data_planejada', dataInicio);
  }
  if (dataFim) {
    query = query.lte('data_planejada', dataFim);
  }

  const { data, error } = await query.order('data_planejada', { ascending: false });

  if (error) {
    console.error('Erro ao buscar serviços com substituição:', error);
    throw error;
  }

  return data || [];
}

// =====================================================
// FUNÇÕES PARA GERENCIAR VALORES
// =====================================================

/**
 * Busca todos os valores de faturamento
 */
export async function buscarValoresFaturamento(): Promise<ValorFaturamentoSimples[]> {
  const { data, error } = await supabase
    .from('valores_faturamento_simples')
    .select('*')
    .eq('ativo', true)
    .order('grupo')
    .order('item')
    .order('status');

  if (error) {
    console.error('Erro ao buscar valores de faturamento:', error);
    throw error;
  }

  return data || [];
}

/**
 * Busca valores por grupo
 */
export async function buscarValoresPorGrupo(grupo: string): Promise<ValorFaturamentoSimples[]> {
  const { data, error } = await supabase
    .from('valores_faturamento_simples')
    .select('*')
    .eq('grupo', grupo)
    .eq('ativo', true)
    .order('item')
    .order('status');

  if (error) {
    console.error('Erro ao buscar valores por grupo:', error);
    throw error;
  }

  return data || [];
}

/**
 * Atualiza valor de faturamento
 */
export async function atualizarValorFaturamento(
  id: number,
  dados: Partial<ValorFaturamentoSimples>
): Promise<ValorFaturamentoSimples> {
  const { data, error } = await supabase
    .from('valores_faturamento_simples')
    .update(dados)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar valor:', error);
    throw error;
  }

  return data;
}

/**
 * Cria novo valor de faturamento
 */
export async function criarValorFaturamento(
  dados: Omit<ValorFaturamentoSimples, 'id' | 'created_at' | 'updated_at'>
): Promise<ValorFaturamentoSimples> {
  const { data, error } = await supabase
    .from('valores_faturamento_simples')
    .insert(dados)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar valor:', error);
    throw error;
  }

  return data;
}

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

/**
 * Formata valor monetário para exibição
 */
export function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

/**
 * Calcula total de faturamento de uma lista de itens
 */
export function calcularTotalFaturamento(itens: FaturamentoItem[]): number {
  return itens.reduce((total, item) => total + item.valor_total, 0);
}

/**
 * Agrupa itens de faturamento por grupo
 */
export function agruparPorGrupo(itens: FaturamentoItem[]): Record<string, FaturamentoItem[]> {
  return itens.reduce((acc, item) => {
    if (!acc[item.grupo]) {
      acc[item.grupo] = [];
    }
    acc[item.grupo].push(item);
    return acc;
  }, {} as Record<string, FaturamentoItem[]>);
}

/**
 * Verifica se um serviço tem substituição de transformador
 */
export function temSubstituicaoTransformador(itens: FaturamentoItem[]): boolean {
  return itens.some(item => item.eh_substituicao && item.grupo === 'TRANSFORMADOR');
}

// =====================================================
// EXPORTAÇÕES PADRÃO
// =====================================================

export default {
  // Consultas
  buscarFaturamentoServico,
  buscarResumoFaturamentoServico,
  buscarFaturamentoPorEquipe,
  buscarRankingEquipes,
  buscarResumoFaturamentoPorGrupo,
  buscarServicosComSubstituicao,
  
  // Valores
  buscarValoresFaturamento,
  buscarValoresPorGrupo,
  atualizarValorFaturamento,
  criarValorFaturamento,
  
  // Utilitários
  formatarValor,
  calcularTotalFaturamento,
  agruparPorGrupo,
  temSubstituicaoTransformador
};