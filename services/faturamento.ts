// services/faturamento.ts
// API para sistema de faturamento baseado em itens executados

import { supabase } from './supabase';

// =====================================================
// INTERFACES PARA FATURAMENTO
// =====================================================

export interface ValorFaturamento {
  id?: number;
  grupo: string;
  item: string;
  status: 'Instalado' | 'Retirado';
  valor_unitario: number;
  unidade?: string;
  ativo: boolean;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FaturamentoServico {
  id?: number;
  servico_id: number;
  equipe_prefixo?: string;
  data_execucao?: string;
  valor_total_instalado: number;
  valor_total_retirado: number;
  valor_total_geral: number;
  quantidade_itens_instalados: number;
  quantidade_itens_retirados: number;
  quantidade_itens_total: number;
  status_faturamento: 'Pendente' | 'Calculado' | 'Faturado';
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DetalheFaturamento {
  id?: number;
  faturamento_servico_id: number;
  giservico_id: number;
  grupo: string;
  item: string;
  status: 'Instalado' | 'Retirado';
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  unidade?: string;
  n_serie?: string;
  created_at?: string;
}

export interface ResumoFaturamento {
  periodo: string;
  total_servicos: number;
  total_itens_instalados: number;
  total_itens_retirados: number;
  valor_total_instalado: number;
  valor_total_retirado: number;
  valor_total_geral: number;
  servicos_pendentes: number;
  servicos_calculados: number;
  servicos_faturados: number;
}

// =====================================================
// API DE VALORES DE FATURAMENTO
// =====================================================

export const faturamentoAPI = {
  
  // ========================================
  // VALORES DE FATURAMENTO
  // ========================================
  
  // Buscar todos os valores de faturamento
  getValoresFaturamento: async (): Promise<ValorFaturamento[]> => {
    const { data, error } = await supabase
      .from('valores_faturamento')
      .select('*')
      .eq('ativo', true)
      .order('grupo', { ascending: true })
      .order('item', { ascending: true })
      .order('status', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  // Buscar valores por grupo
  getValoresPorGrupo: async (grupo: string): Promise<ValorFaturamento[]> => {
    const { data, error } = await supabase
      .from('valores_faturamento')
      .select('*')
      .eq('grupo', grupo)
      .eq('ativo', true)
      .order('item', { ascending: true })
      .order('status', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  // Buscar valor específico
  getValorEspecifico: async (grupo: string, item: string, status: 'Instalado' | 'Retirado'): Promise<ValorFaturamento | null> => {
    // Primeiro tenta buscar o valor específico para o item
    const { data: valorEspecifico, error: errorEspecifico } = await supabase
      .from('valores_faturamento')
      .select('*')
      .eq('grupo', grupo)
      .eq('item', item)
      .eq('status', status)
      .eq('ativo', true)
      .single();
    
    if (!errorEspecifico && valorEspecifico) {
      return valorEspecifico;
    }
    
    // Se não encontrar, busca o valor genérico "todos" para o grupo
    const { data: valorGenerico, error: errorGenerico } = await supabase
      .from('valores_faturamento')
      .select('*')
      .eq('grupo', grupo)
      .eq('item', 'todos')
      .eq('status', status)
      .eq('ativo', true)
      .single();
    
    if (errorGenerico && errorGenerico.code !== 'PGRST116') throw errorGenerico;
    return valorGenerico || null;
  },
  
  // Criar novo valor de faturamento
  createValorFaturamento: async (valor: Omit<ValorFaturamento, 'id' | 'created_at' | 'updated_at'>): Promise<ValorFaturamento> => {
    const { data, error } = await supabase
      .from('valores_faturamento')
      .insert(valor)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // Atualizar valor de faturamento
  updateValorFaturamento: async (id: number, valor: Partial<ValorFaturamento>): Promise<ValorFaturamento> => {
    const { data, error } = await supabase
      .from('valores_faturamento')
      .update(valor)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // Desativar valor de faturamento
  desativarValorFaturamento: async (id: number): Promise<void> => {
    const { error } = await supabase
      .from('valores_faturamento')
      .update({ ativo: false })
      .eq('id', id);
    
    if (error) throw error;
  },
  
  // ========================================
  // FATURAMENTO DE SERVIÇOS
  // ========================================
  
  // Calcular faturamento de um serviço
  calcularFaturamentoServico: async (servicoId: number): Promise<FaturamentoServico> => {
    // Buscar todos os itens executados no serviço
    const { data: itensExecutados, error: errorItens } = await supabase
      .from('giservico')
      .select(`
        *,
        item:grupo_itens(*),
        servico:servicos(*)
      `)
      .eq('id_servico', servicoId);
    
    if (errorItens) throw errorItens;
    
    if (!itensExecutados || itensExecutados.length === 0) {
      throw new Error('Nenhum item executado encontrado para este serviço');
    }
    
    // Buscar dados do serviço
    const { data: servicoData, error: errorServico } = await supabase
      .from('servicos')
      .select('*, equipe:equipes(*)')
      .eq('id', servicoId)
      .single();
    
    if (errorServico) throw errorServico;
    
    // Calcular valores
    let valorTotalInstalado = 0;
    let valorTotalRetirado = 0;
    let quantidadeInstalados = 0;
    let quantidadeRetirados = 0;
    const detalhes: Omit<DetalheFaturamento, 'id' | 'faturamento_servico_id' | 'created_at'>[] = [];
    
    for (const itemExecutado of itensExecutados) {
      const grupo = itemExecutado.item?.grupo || '';
      const item = itemExecutado.item?.item || '';
      const status = itemExecutado.status as 'Instalado' | 'Retirado';
      const quantidade = itemExecutado.quantidade || 1;
      
      // Buscar valor de faturamento
      const valorFaturamento = await faturamentoAPI.getValorEspecifico(grupo, item, status);
      
      if (valorFaturamento) {
        const valorTotal = valorFaturamento.valor_unitario * quantidade;
        
        if (status === 'Instalado') {
          valorTotalInstalado += valorTotal;
          quantidadeInstalados += quantidade;
        } else {
          valorTotalRetirado += valorTotal;
          quantidadeRetirados += quantidade;
        }
        
        detalhes.push({
          giservico_id: itemExecutado.id,
          grupo,
          item,
          status,
          quantidade,
          valor_unitario: valorFaturamento.valor_unitario,
          valor_total: valorTotal,
          unidade: valorFaturamento.unidade,
          n_serie: itemExecutado.n_serie
        });
      }
    }
    
    const valorTotalGeral = valorTotalInstalado + valorTotalRetirado;
    
    // Buscar ou criar registro de faturamento do serviço
    const { data: faturamentoExistente } = await supabase
      .from('faturamento_servicos')
      .select('*')
      .eq('servico_id', servicoId)
      .single();
    
    const dadosFaturamento: Omit<FaturamentoServico, 'id' | 'created_at' | 'updated_at'> = {
      servico_id: servicoId,
      equipe_prefixo: servicoData.equipe_prefixo,
      data_execucao: servicoData.data_planejada,
      valor_total_instalado: valorTotalInstalado,
      valor_total_retirado: valorTotalRetirado,
      valor_total_geral: valorTotalGeral,
      quantidade_itens_instalados: quantidadeInstalados,
      quantidade_itens_retirados: quantidadeRetirados,
      quantidade_itens_total: quantidadeInstalados + quantidadeRetirados,
      status_faturamento: 'Calculado'
    };
    
    let faturamentoServico: FaturamentoServico;
    
    if (faturamentoExistente) {
      // Atualizar existente
      const { data, error } = await supabase
        .from('faturamento_servicos')
        .update(dadosFaturamento)
        .eq('id', faturamentoExistente.id)
        .select()
        .single();
      
      if (error) throw error;
      faturamentoServico = data;
      
      // Remover detalhes antigos
      await supabase
        .from('detalhes_faturamento')
        .delete()
        .eq('faturamento_servico_id', faturamentoExistente.id);
    } else {
      // Criar novo
      const { data, error } = await supabase
        .from('faturamento_servicos')
        .insert(dadosFaturamento)
        .select()
        .single();
      
      if (error) throw error;
      faturamentoServico = data;
    }
    
    // Inserir detalhes
    if (detalhes.length > 0) {
      const detalhesComId = detalhes.map(detalhe => ({
        ...detalhe,
        faturamento_servico_id: faturamentoServico.id!
      }));
      
      const { error: errorDetalhes } = await supabase
        .from('detalhes_faturamento')
        .insert(detalhesComId);
      
      if (errorDetalhes) throw errorDetalhes;
    }
    
    return faturamentoServico;
  },
  
  // Buscar faturamento de um serviço
  getFaturamentoServico: async (servicoId: number): Promise<FaturamentoServico | null> => {
    const { data, error } = await supabase
      .from('faturamento_servicos')
      .select('*')
      .eq('servico_id', servicoId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },
  
  // Buscar detalhes de faturamento de um serviço
  getDetalhesFaturamento: async (faturamentoServicoId: number): Promise<DetalheFaturamento[]> => {
    const { data, error } = await supabase
      .from('detalhes_faturamento')
      .select('*')
      .eq('faturamento_servico_id', faturamentoServicoId)
      .order('grupo', { ascending: true })
      .order('item', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  // Buscar faturamentos por período
  getFaturamentosPorPeriodo: async (dataInicio: string, dataFim: string): Promise<FaturamentoServico[]> => {
    const { data, error } = await supabase
      .from('faturamento_servicos')
      .select('*')
      .gte('data_execucao', dataInicio)
      .lte('data_execucao', dataFim)
      .order('data_execucao', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  // Buscar faturamentos por equipe
  getFaturamentosPorEquipe: async (equipePrefixo: string): Promise<FaturamentoServico[]> => {
    const { data, error } = await supabase
      .from('faturamento_servicos')
      .select('*')
      .eq('equipe_prefixo', equipePrefixo)
      .order('data_execucao', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  // Marcar como faturado
  marcarComoFaturado: async (faturamentoServicoId: number): Promise<FaturamentoServico> => {
    const { data, error } = await supabase
      .from('faturamento_servicos')
      .update({ status_faturamento: 'Faturado' })
      .eq('id', faturamentoServicoId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // ========================================
  // RELATÓRIOS E RESUMOS
  // ========================================
  
  // Gerar resumo de faturamento por período
  getResumoFaturamento: async (dataInicio: string, dataFim: string): Promise<ResumoFaturamento> => {
    const { data: faturamentos, error } = await supabase
      .from('faturamento_servicos')
      .select('*')
      .gte('data_execucao', dataInicio)
      .lte('data_execucao', dataFim);
    
    if (error) throw error;
    
    const resumo: ResumoFaturamento = {
      periodo: `${dataInicio} a ${dataFim}`,
      total_servicos: faturamentos.length,
      total_itens_instalados: faturamentos.reduce((sum, f) => sum + f.quantidade_itens_instalados, 0),
      total_itens_retirados: faturamentos.reduce((sum, f) => sum + f.quantidade_itens_retirados, 0),
      valor_total_instalado: faturamentos.reduce((sum, f) => sum + f.valor_total_instalado, 0),
      valor_total_retirado: faturamentos.reduce((sum, f) => sum + f.valor_total_retirado, 0),
      valor_total_geral: faturamentos.reduce((sum, f) => sum + f.valor_total_geral, 0),
      servicos_pendentes: faturamentos.filter(f => f.status_faturamento === 'Pendente').length,
      servicos_calculados: faturamentos.filter(f => f.status_faturamento === 'Calculado').length,
      servicos_faturados: faturamentos.filter(f => f.status_faturamento === 'Faturado').length
    };
    
    return resumo;
  },
  
  // Buscar grupos com valores de faturamento
  getGruposComValores: async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('valores_faturamento')
      .select('grupo')
      .eq('ativo', true)
      .order('grupo', { ascending: true });
    
    if (error) throw error;
    
    // Retornar apenas valores únicos
    const grupos = [...new Set(data.map(item => item.grupo))];
    return grupos;
  },
  
  // Buscar itens mais faturados
  getItensMaisFaturados: async (limite: number = 10): Promise<any[]> => {
    const { data, error } = await supabase
      .from('detalhes_faturamento')
      .select('grupo, item, status, quantidade, valor_total')
      .order('valor_total', { ascending: false })
      .limit(limite);
    
    if (error) throw error;
    return data;
  }
};

export default faturamentoAPI;