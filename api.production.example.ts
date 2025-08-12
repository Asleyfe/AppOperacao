// api.production.example.ts
// Exemplo de API para rastreamento de produção individual
// Focado em métricas para Power BI

import { supabase } from './services/supabase';

// Tipos para o sistema de rastreamento de produção
export interface ExecucaoColaborador {
  id: number;
  servico_id: string;
  colaborador_id: number;
  equipe_id: number;
  data_execucao: string;
  inicio_participacao?: string;
  fim_participacao?: string;
  duracao_minutos?: number;
  avaliacao_qualidade?: number;
  status_participacao: 'Ativo' | 'Ausente' | 'Substituído';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProducaoColaborador {
  colaborador_id: number;
  colaborador_nome: string;
  colaborador_funcao: string;
  equipe_id: number;
  data_equipe: string;
  encarregado_id: number;
  encarregado_nome: string;
  servico_id: string;
  servico_descricao: string;
  servico_status: string;
  data_execucao: string;
  inicio_participacao?: string;
  fim_participacao?: string;
  duracao_minutos?: number;
  avaliacao_qualidade?: number;
  status_participacao: string;
  observacoes?: string;
  ano: number;
  mes: number;
  semana: number;
  dia_semana: number;
  ano_mes: string;
  ano_semana: string;
  servico_ativo: number;
  ausencia: number;
  alta_qualidade: number;
  tem_duracao: number;
}

export interface MetricasMensaisColaborador {
  colaborador_id: number;
  colaborador_nome: string;
  colaborador_funcao: string;
  ano: number;
  mes: number;
  ano_mes: string;
  total_servicos: number;
  servicos_ativos: number;
  total_ausencias: number;
  servicos_alta_qualidade: number;
  avaliacao_media: number;
  total_minutos_trabalhados: number;
  media_minutos_por_servico: number;
  equipes_diferentes: number;
  dias_trabalhados: number;
  percentual_presenca: number;
  percentual_alta_qualidade: number;
}

export interface MetricasEquipeData {
  equipe_id: number;
  data_equipe: string;
  encarregado_id: number;
  encarregado_nome: string;
  total_colaboradores: number;
  total_servicos_executados: number;
  servicos_ativos: number;
  total_ausencias: number;
  avaliacao_media_equipe: number;
  total_minutos_equipe: number;
  media_minutos_por_servico: number;
  servicos_por_colaborador: number;
  percentual_presenca_equipe: number;
  ano: number;
  mes: number;
  semana: number;
  ano_mes: string;
}

// API para gerenciar execuções de colaboradores
export const productionAPI = {
  // Buscar todas as execuções de um colaborador
  async getExecucoesColaborador(colaboradorId: number): Promise<ExecucaoColaborador[]> {
    const { data, error } = await supabase
      .from('execucoes_colaborador')
      .select('*')
      .eq('colaborador_id', colaboradorId)
      .order('data_execucao', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Buscar execuções por período
  async getExecucoesPorPeriodo(
    dataInicio: string,
    dataFim: string,
    colaboradorId?: number
  ): Promise<ExecucaoColaborador[]> {
    let query = supabase
      .from('execucoes_colaborador')
      .select('*')
      .gte('data_execucao', dataInicio)
      .lte('data_execucao', dataFim);

    if (colaboradorId) {
      query = query.eq('colaborador_id', colaboradorId);
    }

    const { data, error } = await query.order('data_execucao', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Registrar nova execução
  async registrarExecucao(execucao: Omit<ExecucaoColaborador, 'id' | 'created_at' | 'updated_at' | 'duracao_minutos'>): Promise<ExecucaoColaborador> {
    const { data, error } = await supabase
      .from('execucoes_colaborador')
      .insert(execucao)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Atualizar execução existente
  async atualizarExecucao(
    id: number,
    updates: Partial<Omit<ExecucaoColaborador, 'id' | 'created_at' | 'updated_at' | 'duracao_minutos'>>
  ): Promise<ExecucaoColaborador> {
    const { data, error } = await supabase
      .from('execucoes_colaborador')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Deletar execução
  async deletarExecucao(id: number): Promise<void> {
    const { error } = await supabase
      .from('execucoes_colaborador')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Buscar dados detalhados de produção (view principal para Power BI)
  async getProducaoColaborador(
    colaboradorId?: number,
    dataInicio?: string,
    dataFim?: string
  ): Promise<ProducaoColaborador[]> {
    let query = supabase
      .from('vw_producao_colaborador')
      .select('*');

    if (colaboradorId) {
      query = query.eq('colaborador_id', colaboradorId);
    }

    if (dataInicio) {
      query = query.gte('data_execucao', dataInicio);
    }

    if (dataFim) {
      query = query.lte('data_execucao', dataFim);
    }

    const { data, error } = await query.order('data_execucao', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Buscar métricas mensais por colaborador
  async getMetricasMensaisColaborador(
    colaboradorId?: number,
    ano?: number,
    mes?: number
  ): Promise<MetricasMensaisColaborador[]> {
    let query = supabase
      .from('vw_metricas_mensais_colaborador')
      .select('*');

    if (colaboradorId) {
      query = query.eq('colaborador_id', colaboradorId);
    }

    if (ano) {
      query = query.eq('ano', ano);
    }

    if (mes) {
      query = query.eq('mes', mes);
    }

    const { data, error } = await query.order('ano', { ascending: false })
      .order('mes', { ascending: false })
      .order('colaborador_nome');

    if (error) throw error;
    return data || [];
  },

  // Buscar métricas por equipe e data
  async getMetricasEquipeData(
    equipeId?: number,
    ano?: number,
    mes?: number
  ): Promise<MetricasEquipeData[]> {
    let query = supabase
      .from('vw_metricas_equipe_data')
      .select('*');

    if (equipeId) {
      query = query.eq('equipe_id', equipeId);
    }

    if (ano) {
      query = query.eq('ano', ano);
    }

    if (mes) {
      query = query.eq('mes', mes);
    }

    const { data, error } = await query.order('data_equipe', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Buscar resumo de produtividade de um colaborador
  async getResumoColaborador(colaboradorId: number, ano?: number): Promise<{
    total_servicos: number;
    servicos_ativos: number;
    total_ausencias: number;
    avaliacao_media: number;
    total_horas_trabalhadas: number;
    dias_trabalhados: number;
    equipes_participadas: number;
    percentual_presenca: number;
  }> {
    let query = supabase
      .from('vw_metricas_mensais_colaborador')
      .select('*')
      .eq('colaborador_id', colaboradorId);

    if (ano) {
      query = query.eq('ano', ano);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        total_servicos: 0,
        servicos_ativos: 0,
        total_ausencias: 0,
        avaliacao_media: 0,
        total_horas_trabalhadas: 0,
        dias_trabalhados: 0,
        equipes_participadas: 0,
        percentual_presenca: 0
      };
    }

    // Agregar dados de todos os meses
    const resumo = data.reduce((acc, item) => {
      acc.total_servicos += item.total_servicos;
      acc.servicos_ativos += item.servicos_ativos;
      acc.total_ausencias += item.total_ausencias;
      acc.total_horas_trabalhadas += (item.total_minutos_trabalhados || 0) / 60;
      acc.dias_trabalhados += item.dias_trabalhados;
      acc.equipes_participadas = Math.max(acc.equipes_participadas, item.equipes_diferentes);
      return acc;
    }, {
      total_servicos: 0,
      servicos_ativos: 0,
      total_ausencias: 0,
      total_horas_trabalhadas: 0,
      dias_trabalhados: 0,
      equipes_participadas: 0
    });

    // Calcular médias
    const avaliacoes = data.filter(item => item.avaliacao_media > 0);
    const avaliacao_media = avaliacoes.length > 0 
      ? avaliacoes.reduce((sum, item) => sum + item.avaliacao_media, 0) / avaliacoes.length 
      : 0;

    const percentual_presenca = resumo.total_servicos > 0 
      ? (resumo.servicos_ativos / resumo.total_servicos) * 100 
      : 0;

    return {
      ...resumo,
      avaliacao_media: Math.round(avaliacao_media * 100) / 100,
      total_horas_trabalhadas: Math.round(resumo.total_horas_trabalhadas * 100) / 100,
      percentual_presenca: Math.round(percentual_presenca * 100) / 100
    };
  },

  // Buscar top performers por período
  async getTopPerformers(
    dataInicio: string,
    dataFim: string,
    limite: number = 10
  ): Promise<{
    colaborador_id: number;
    colaborador_nome: string;
    total_servicos: number;
    avaliacao_media: number;
    percentual_presenca: number;
  }[]> {
    const { data, error } = await supabase
      .from('vw_producao_colaborador')
      .select(`
        colaborador_id,
        colaborador_nome,
        servico_ativo,
        avaliacao_qualidade
      `)
      .gte('data_execucao', dataInicio)
      .lte('data_execucao', dataFim);

    if (error) throw error;

    if (!data || data.length === 0) return [];

    // Agregar dados por colaborador
    const colaboradores = data.reduce((acc, item) => {
      const id = item.colaborador_id;
      if (!acc[id]) {
        acc[id] = {
          colaborador_id: id,
          colaborador_nome: item.colaborador_nome,
          total_servicos: 0,
          servicos_ativos: 0,
          avaliacoes: []
        };
      }
      acc[id].total_servicos++;
      acc[id].servicos_ativos += item.servico_ativo;
      if (item.avaliacao_qualidade) {
        acc[id].avaliacoes.push(item.avaliacao_qualidade);
      }
      return acc;
    }, {} as any);

    // Calcular métricas e ordenar
    const performers = Object.values(colaboradores).map((col: any) => ({
      colaborador_id: col.colaborador_id,
      colaborador_nome: col.colaborador_nome,
      total_servicos: col.total_servicos,
      avaliacao_media: col.avaliacoes.length > 0 
        ? col.avaliacoes.reduce((sum: number, val: number) => sum + val, 0) / col.avaliacoes.length 
        : 0,
      percentual_presenca: (col.servicos_ativos / col.total_servicos) * 100
    })).sort((a, b) => {
      // Ordenar por total de serviços e depois por avaliação média
      if (b.total_servicos !== a.total_servicos) {
        return b.total_servicos - a.total_servicos;
      }
      return b.avaliacao_media - a.avaliacao_media;
    }).slice(0, limite);

    return performers;
  }
};

// Exemplo de uso:
/*
// Buscar produção de um colaborador
const producao = await productionAPI.getProducaoColaborador(1, '2024-01-01', '2024-01-31');

// Buscar métricas mensais
const metricas = await productionAPI.getMetricasMensaisColaborador(1, 2024, 1);

// Registrar nova execução
const novaExecucao = await productionAPI.registrarExecucao({
  servico_id: 'SRV001',
  colaborador_id: 1,
  equipe_id: 1,
  data_execucao: '2024-01-20',
  inicio_participacao: '2024-01-20T08:00:00Z',
  fim_participacao: '2024-01-20T12:00:00Z',
  avaliacao_qualidade: 5,
  status_participacao: 'Ativo',
  observacoes: 'Execução exemplar'
});

// Buscar resumo anual de um colaborador
const resumo = await productionAPI.getResumoColaborador(1, 2024);

// Buscar top performers do mês
const topPerformers = await productionAPI.getTopPerformers('2024-01-01', '2024-01-31', 5);
*/