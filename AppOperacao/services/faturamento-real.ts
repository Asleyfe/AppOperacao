// API para sistema de faturamento com dados reais
// Baseado na migração 46_populate_faturamento_dados_reais.sql

import { supabase } from '../lib/supabase';

// Interfaces para os dados reais de faturamento
export interface ValorFaturamentoReal {
  id: number;
  grupo: string;
  item: string;
  status: 'Instalado' | 'Retirado';
  valor_unitario: number;
  unidade: string;
  tipo_servico?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface FaturamentoItemReal {
  servico_id: number;
  numero_servico: string;
  equipe: string;
  data_servico: string;
  grupo: string;
  item: string;
  status: 'Instalado' | 'Retirado';
  quantidade: number;
  valor_unitario: number;
  unidade: string;
  tipo_servico?: string;
  observacoes?: string;
  valor_total: number;
  eh_substituicao_trafo: boolean;
}

export interface ResumoFaturamentoServicoReal {
  numero_servico: string;
  equipe: string;
  data_servico: string;
  total_itens: number;
  valor_total_servico: number;
  valor_substituicoes: number;
  valor_outros: number;
}

export interface ResumoFaturamentoGrupoReal {
  grupo: string;
  total_itens: number;
  quantidade_total: number;
  valor_total_grupo: number;
  valor_medio_unitario: number;
}

// Classe principal para gerenciar faturamento com dados reais
export class FaturamentoRealService {
  
  /**
   * Busca faturamento detalhado por serviço
   */
  static async getFaturamentoPorServico(numeroServico: string): Promise<FaturamentoItemReal[]> {
    const { data, error } = await supabase
      .from('vw_faturamento_real')
      .select('*')
      .eq('numero_servico', numeroServico)
      .order('grupo', { ascending: true })
      .order('item', { ascending: true });

    if (error) {
      console.error('Erro ao buscar faturamento por serviço:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Busca resumo de faturamento por serviço
   */
  static async getResumoFaturamentoServico(numeroServico: string): Promise<ResumoFaturamentoServicoReal | null> {
    const { data, error } = await supabase
      .from('vw_resumo_faturamento_real')
      .select('*')
      .eq('numero_servico', numeroServico)
      .single();

    if (error) {
      console.error('Erro ao buscar resumo de faturamento:', error);
      throw error;
    }

    return data;
  }

  /**
   * Busca faturamento por equipe em um período
   */
  static async getFaturamentoPorEquipe(
    equipe: string, 
    dataInicio: string, 
    dataFim: string
  ): Promise<ResumoFaturamentoServicoReal[]> {
    const { data, error } = await supabase
      .from('vw_resumo_faturamento_real')
      .select('*')
      .eq('equipe', equipe)
      .gte('data_servico', dataInicio)
      .lte('data_servico', dataFim)
      .order('data_servico', { ascending: false });

    if (error) {
      console.error('Erro ao buscar faturamento por equipe:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Busca resumo por grupo de equipamentos
   */
  static async getResumoFaturamentoPorGrupo(): Promise<ResumoFaturamentoGrupoReal[]> {
    const { data, error } = await supabase
      .from('vw_resumo_faturamento_grupo_real')
      .select('*')
      .order('valor_total_grupo', { ascending: false });

    if (error) {
      console.error('Erro ao buscar resumo por grupo:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Busca serviços com substituição de transformadores
   */
  static async getServicosComSubstituicaoTrafo(
    dataInicio?: string, 
    dataFim?: string
  ): Promise<FaturamentoItemReal[]> {
    let query = supabase
      .from('vw_faturamento_real')
      .select('*')
      .eq('eh_substituicao_trafo', true)
      .eq('grupo', 'TRAFOS');

    if (dataInicio) {
      query = query.gte('data_servico', dataInicio);
    }
    if (dataFim) {
      query = query.lte('data_servico', dataFim);
    }

    const { data, error } = await query
      .order('data_servico', { ascending: false })
      .order('numero_servico', { ascending: true });

    if (error) {
      console.error('Erro ao buscar substituições de trafo:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Busca ranking de equipes por faturamento
   */
  static async getRankingEquipes(
    dataInicio: string, 
    dataFim: string
  ): Promise<Array<{equipe: string, total_servicos: number, valor_total: number}>> {
    const { data, error } = await supabase
      .rpc('get_ranking_equipes_faturamento', {
        data_inicio: dataInicio,
        data_fim: dataFim
      });

    if (error) {
      console.error('Erro ao buscar ranking de equipes:', error);
      // Fallback: calcular via view
      return this.getRankingEquipesFallback(dataInicio, dataFim);
    }

    return data || [];
  }

  /**
   * Fallback para ranking de equipes usando a view
   */
  private static async getRankingEquipesFallback(
    dataInicio: string, 
    dataFim: string
  ): Promise<Array<{equipe: string, total_servicos: number, valor_total: number}>> {
    const { data, error } = await supabase
      .from('vw_resumo_faturamento_real')
      .select('equipe, valor_total_servico')
      .gte('data_servico', dataInicio)
      .lte('data_servico', dataFim);

    if (error) {
      console.error('Erro no fallback de ranking:', error);
      return [];
    }

    // Agrupar por equipe
    const ranking = data.reduce((acc, item) => {
      const equipe = item.equipe;
      if (!acc[equipe]) {
        acc[equipe] = { equipe, total_servicos: 0, valor_total: 0 };
      }
      acc[equipe].total_servicos += 1;
      acc[equipe].valor_total += item.valor_total_servico;
      return acc;
    }, {} as Record<string, {equipe: string, total_servicos: number, valor_total: number}>);

    return Object.values(ranking).sort((a, b) => b.valor_total - a.valor_total);
  }

  /**
   * Busca itens sem valor de faturamento cadastrado
   */
  static async getItensSemValor(): Promise<Array<{grupo: string, item: string, status: string}>> {
    const { data, error } = await supabase
      .rpc('get_itens_sem_valor_faturamento');

    if (error) {
      console.error('Erro ao buscar itens sem valor:', error);
      // Fallback: buscar via query manual
      return this.getItensSemValorFallback();
    }

    return data || [];
  }

  /**
   * Fallback para itens sem valor
   */
  private static async getItensSemValorFallback(): Promise<Array<{grupo: string, item: string, status: string}>> {
    const { data, error } = await supabase
      .from('giservico')
      .select('grupo, item, status')
      .not('grupo', 'in', '("ISOLADOR","PARA RAIO","CABOS MT","CABOS BT","ESTRUTURAS PRIMARIAS COMPACTA","ESTRUTURAS PRIMARIAS CONVENCIONAL","TRAFOS","CHAVES","ELO FUSIVEL","ESTRUTURAS SECUNDARIAS RD MULTIPLEXADA","ESTRUTURAS SECUNDARIAS RD NUA")');

    if (error) {
      console.error('Erro no fallback de itens sem valor:', error);
      return [];
    }

    // Remover duplicatas
    const unique = data.reduce((acc, item) => {
      const key = `${item.grupo}-${item.item}-${item.status}`;
      if (!acc[key]) {
        acc[key] = item;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(unique);
  }

  /**
   * Busca valores de faturamento por grupo e item
   */
  static async getValoresFaturamento(
    grupo?: string, 
    item?: string
  ): Promise<ValorFaturamentoReal[]> {
    let query = supabase
      .from('valores_faturamento_real')
      .select('*');

    if (grupo) {
      query = query.eq('grupo', grupo);
    }
    if (item) {
      query = query.ilike('item', `%${item}%`);
    }

    const { data, error } = await query
      .order('grupo', { ascending: true })
      .order('item', { ascending: true })
      .order('status', { ascending: true });

    if (error) {
      console.error('Erro ao buscar valores de faturamento:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Atualiza valor de faturamento
   */
  static async atualizarValorFaturamento(
    id: number, 
    novoValor: number
  ): Promise<ValorFaturamentoReal | null> {
    const { data, error } = await supabase
      .from('valores_faturamento_real')
      .update({ valor_unitario: novoValor })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar valor de faturamento:', error);
      throw error;
    }

    return data;
  }

  /**
   * Adiciona novo valor de faturamento
   */
  static async adicionarValorFaturamento(
    valor: Omit<ValorFaturamentoReal, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ValorFaturamentoReal | null> {
    const { data, error } = await supabase
      .from('valores_faturamento_real')
      .insert(valor)
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar valor de faturamento:', error);
      throw error;
    }

    return data;
  }

  /**
   * Busca faturamento consolidado mensal
   */
  static async getFaturamentoMensal(
    ano: number, 
    mes: number
  ): Promise<Array<{equipe: string, total_servicos: number, valor_total: number}>> {
    const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia}`;

    return this.getRankingEquipes(dataInicio, dataFim);
  }

  /**
   * Busca estatísticas gerais de faturamento
   */
  static async getEstatisticasGerais(): Promise<{
    total_servicos: number;
    valor_total: number;
    valor_medio_servico: number;
    grupos_mais_faturados: ResumoFaturamentoGrupoReal[];
  }> {
    const [resumoServicos, resumoGrupos] = await Promise.all([
      supabase.from('vw_resumo_faturamento_real').select('valor_total_servico'),
      this.getResumoFaturamentoPorGrupo()
    ]);

    const totalServicos = resumoServicos.data?.length || 0;
    const valorTotal = resumoServicos.data?.reduce((sum, item) => sum + item.valor_total_servico, 0) || 0;
    const valorMedioServico = totalServicos > 0 ? valorTotal / totalServicos : 0;

    return {
      total_servicos: totalServicos,
      valor_total: valorTotal,
      valor_medio_servico: valorMedioServico,
      grupos_mais_faturados: resumoGrupos.slice(0, 5)
    };
  }
}

// Funções auxiliares para formatação
export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export const formatarData = (data: string): string => {
  return new Date(data).toLocaleDateString('pt-BR');
};

export const formatarQuantidade = (quantidade: number, unidade: string): string => {
  return `${quantidade} ${unidade}`;
};

// Exportar como default
export default FaturamentoRealService;