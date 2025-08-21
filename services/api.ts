// services/api.ts
// Implementação da API usando Supabase

import { Colaborador, Equipe, Servico, GrupoItem, GIServico, ServicoHeader, ComposicaoEquipe } from '@/types/types';
import { supabase } from './supabase';
import { NetworkService } from './offline/NetworkService';
import { OfflineDataService } from './offline/OfflineDataService';

const offlineDataService = new OfflineDataService();

export const api = {
  // Colaboradores
  getColaboradores: async () => {
    if (await NetworkService.isConnected()) {
      try {
        const { data, error } = await supabase
          .from('colaboradores')
          .select('*')
          .order('nome');
        
        if (error) throw error;
        return data as Colaborador[];
      } catch (error) {
        console.error('Erro ao buscar colaboradores online, tentando offline:', error);
        return await offlineDataService.getColaboradores(); // Assuming getColaboradores exists in OfflineDataService
      }
    } else {
      return await offlineDataService.getColaboradores(); // Assuming getColaboradores exists in OfflineDataService
    }
  },

  // ========================================
  // GRUPO ITENS
  // ========================================
  
  // Buscar todos os grupos e itens
  getGrupoItens: async () => {
    if (await NetworkService.isConnected()) {
      try {
        const { data, error } = await supabase
          .from('grupo_itens')
          .select('*')
          .order('grupo', { ascending: true })
          .order('item', { ascending: true });
        
        if (error) throw error;
        return data as GrupoItem[];
      } catch (error) {
        console.error('Erro ao buscar grupo de itens online, tentando offline:', error);
        return await offlineDataService.getGrupoItens();
      }
    } else {
      return await offlineDataService.getGrupoItens();
    }
  },
  
  // Buscar itens por grupo
  getItensByGrupo: async (grupo: string) => {
    if (await NetworkService.isConnected()) {
      try {
        const { data, error } = await supabase
          .from('grupo_itens')
          .select('*')
          .eq('grupo', grupo)
          .order('item', { ascending: true });
        
        if (error) throw error;
        return data as GrupoItem[];
      } catch (error) {
        console.error('Erro ao buscar itens por grupo online, tentando offline:', error);
        // Assuming getItensByGrupo exists in OfflineDataService
        return await offlineDataService.getGrupoItens().then(items => items.filter((item: any) => item.grupo === grupo));
      }
    } else {
      // Assuming getItensByGrupo exists in OfflineDataService
      return await offlineDataService.getGrupoItens().then(items => items.filter((item: any) => item.grupo === grupo));
    }
  },
  
  // Buscar grupos únicos
  getGrupos: async () => {
    if (await NetworkService.isConnected()) {
      try {
        const { data, error } = await supabase
          .from('grupo_itens')
          .select('grupo')
          .order('grupo', { ascending: true });
        
        if (error) throw error;
        // Retornar apenas valores únicos
        const grupos = [...new Set(data.map(item => item.grupo))];
        return grupos;
      } catch (error) {
        console.error('Erro ao buscar grupos online, tentando offline:', error);
        // Assuming getGrupos exists in OfflineDataService
        const offlineGroups = await offlineDataService.getGrupoItens();
        return [...new Set(offlineGroups.map(item => item.grupo))];
      }
    } else {
      // Assuming getGrupos exists in OfflineDataService
      const offlineGroups = await offlineDataService.getGrupoItens();
      return [...new Set(offlineGroups.map(item => item.grupo))];
    }
  },
  
  // Criar novo item
  createGrupoItem: async (item: Omit<GrupoItem, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('grupo_itens')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data as GrupoItem;
  },
  
  // Atualizar item
  updateGrupoItem: async (id: number, item: Partial<GrupoItem>) => {
    const { data, error } = await supabase
      .from('grupo_itens')
      .update(item)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as GrupoItem;
  },
  
  // Deletar item
  deleteGrupoItem: async (id: number) => {
    const { error } = await supabase
      .from('grupo_itens')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // ========================================
  // SERVIÇO HEADER - Cabeçalho de Serviços
  // ========================================
  
  // Buscar cabeçalho por serviço
  getServicoHeader: async (servicoId: number) => {
    if (await NetworkService.isConnected()) {
      try {
        const { data, error } = await supabase
          .from('servico_header')
          .select('*')
          .eq('servico_id', servicoId)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return data;
      } catch (error) {
        console.error('Erro ao buscar cabeçalho de serviço online, tentando offline:', error);
        return await offlineDataService.getServicoHeader(servicoId);
      }
    } else {
      return await offlineDataService.getServicoHeader(servicoId);
    }
  },
  
  // Criar cabeçalho de serviço
  createServicoHeader: async (header: any) => {
    if (await NetworkService.isConnected()) {
      try {
        const { data, error } = await supabase
          .from('servico_header')
          .insert(header)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Erro ao criar cabeçalho de serviço online, tentando offline:', error);
        return await offlineDataService.createServicoHeader(header);
      }
    } else {
      return await offlineDataService.createServicoHeader(header);
    }
  },
  
  // Atualizar cabeçalho de serviço
  updateServicoHeader: async (servicoId: number, header: any) => {
    if (await NetworkService.isConnected()) {
      try {
        const { data, error } = await supabase
          .from('servico_header')
          .update(header)
          .eq('servico_id', servicoId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Erro ao atualizar cabeçalho de serviço online, tentando offline:', error);
        return await offlineDataService.updateServicoHeader(servicoId, header);
      }
    } else {
      return await offlineDataService.updateServicoHeader(servicoId, header);
    }
  },
  
  // Criar ou atualizar cabeçalho (upsert)
  upsertServicoHeader: async (header: any) => {
    const { data, error } = await supabase
      .from('servico_header')
      .upsert(header, { onConflict: 'servico_id' })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  // Deletar cabeçalho de serviço
  deleteServicoHeader: async (servicoId: number) => {
    const { error } = await supabase
      .from('servico_header')
      .delete()
      .eq('servico_id', servicoId);
    
    if (error) throw error;
    return true;
  },

  // ========================================
  // GI SERVIÇO - Controle de Itens por Serviço
  // ========================================
  
  getGIServicos: async () => {
    const { data, error } = await supabase
      .from('giservico')
      .select(`
        *,
        item:grupo_itens(*),
        servico:servicos(*),
        equipe:equipes(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getGIServicosByServico: async (servicoId: number) => {
    if (await NetworkService.isConnected()) {
      try {
        const { data, error } = await supabase
          .from('giservico')
          .select(`
            *,
            item:grupo_itens(*)
          `)
          .eq('id_servico', servicoId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Erro ao buscar GI Serviços por serviço online, tentando offline:', error);
        return await offlineDataService.getGIServicosByServico(servicoId);
      }
    } else {
      return await offlineDataService.getGIServicosByServico(servicoId);
    }
  },

  getGIServicosByItem: async (itemId: number) => {
    if (await NetworkService.isConnected()) {
      try {
        const { data, error } = await supabase
          .from('giservico')
          .select(`
            *,
            servico:servicos(*)
          `)
          .eq('id_item', itemId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Erro ao buscar GI Serviços por item online, tentando offline:', error);
        // Assuming getGIServicosByItem exists in OfflineDataService
        return await offlineDataService.getGIServicosByServico(itemId).then(gis => gis.filter((gi: any) => gi.id_item === itemId));
      }
    } else {
      // Assuming getGIServicosByItem exists in OfflineDataService
      return await offlineDataService.getGIServicosByServico(itemId).then(gis => gis.filter((gi: any) => gi.id_item === itemId));
    }
  },

  getGIServicosByStatus: async (status: 'Instalado' | 'Retirado') => {
    const { data, error } = await supabase
      .from('giservico')
      .select(`
        *,
        item:grupo_itens(*),
        servico:servicos(*),
        equipe:equipes(*)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getGIServicosByEquipe: async (prefixo: string) => {
    const { data, error } = await supabase
      .from('giservico')
      .select(`
        *,
        item:grupo_itens(*),
        servico:servicos(*),
        equipe:equipes(*)
      `)
      .eq('prefixo', prefixo)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getGIServicosByEquipeAndStatus: async (prefixo: string, status: 'Instalado' | 'Retirado') => {
    const { data, error } = await supabase
      .from('giservico')
      .select(`
        *,
        item:grupo_itens(*),
        servico:servicos(*),
        equipe:equipes(*)
      `)
      .eq('prefixo', prefixo)
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  createGIServico: async (giservico: any) => {
    const { data, error } = await supabase
      .from('giservico')
      .insert(giservico)
      .select(`
        *,
        item:grupo_itens(*),
        servico:servicos(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  updateGIServico: async (id: number, giservico: any) => {
    const { data, error } = await supabase
      .from('giservico')
      .update(giservico)
      .eq('id', id)
      .select(`
        *,
        item:grupo_itens(*),
        servico:servicos(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  deleteGIServico: async (id: number) => {
    const { error } = await supabase
      .from('giservico')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Funções utilitárias para GI Serviço
  getItensInstaladosPorServico: async (servicoId: number) => {
    const { data, error } = await supabase
      .from('giservico')
      .select(`
        *,
        item:grupo_itens(*)
      `)
      .eq('id_servico', servicoId)
      .eq('status', 'Instalado')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getItensRetiradosPorServico: async (servicoId: number) => {
    const { data, error } = await supabase
      .from('giservico')
      .select(`
        *,
        item:grupo_itens(*)
      `)
      .eq('id_servico', servicoId)
      .eq('status', 'Retirado')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  getResumoItensPorServico: async (servicoId: number) => {
    const { data, error } = await supabase
      .from('giservico')
      .select('status')
      .eq('id_servico', servicoId);
    
    if (error) throw error;
    
    const resumo = {
      total: data.length,
      instalados: data.filter(item => item.status === 'Instalado').length,
      retirados: data.filter(item => item.status === 'Retirado').length
    };
    
    return resumo;
  },
  
  // ========================================
  // SERVIÇOS
  // ========================================
  
  // Função para filtrar serviços baseado na hierarquia


  // Equipes
  getEquipes: async () => {
    const { data: equipesData, error: equipesError } = await supabase
      .from('vw_equipes_com_matriculas')
      .select('*');
    
    if (equipesError) throw equipesError;

    // Para cada equipe, buscar sua composição
    const equipes = await Promise.all(equipesData.map(async (equipe) => {
      const { data: composicaoData, error: composicaoError } = await supabase
        .from('composicao_equipe')
        .select('colaborador_matricula')
        .eq('equipe_id', equipe.id);
      
      if (composicaoError) throw composicaoError;
      
      // Converter para o formato esperado pela aplicação
      const composicao = composicaoData.map(item => ({
        colaboradorMatricula: item.colaborador_matricula
      }));

      return {
        ...equipe,
        prefixo: equipe.prefixo,
        encarregadoMatricula: equipe.encarregado_matricula, // Agora é matrícula
        statusComposicao: equipe.status_composicao,
        composicao
      };
    }));
    
    return equipes as Equipe[];
  },

  getEquipesByEncarregado: async (encarregadoMatricula: string) => {
    if (await NetworkService.isConnected()) {
      try {
        const { data: equipesData, error: equipesError } = await supabase
          .from('vw_equipes_com_matriculas')
          .select('*')
          .eq('encarregado_matricula', encarregadoMatricula);
        
        if (equipesError) throw equipesError;

        // Para cada equipe, buscar sua composição
        const equipes = await Promise.all(equipesData.map(async (equipe) => {
          const { data: composicaoData, error: composicaoError } = await supabase
            .from('composicao_equipe')
            .select('colaborador_matricula')
            .eq('equipe_id', equipe.id);
          
          if (composicaoError) throw composicaoError;
          
          // Converter para o formato esperado pela aplicação
          const composicao = composicaoData.map(item => ({
            colaboradorMatricula: item.colaborador_matricula
          }));

          return {
            ...equipe,
            prefixo: equipe.prefixo,
            encarregadoMatricula: equipe.encarregado_matricula,
            statusComposicao: equipe.status_composicao,
            composicao
          };
        }));
        
        return equipes as Equipe[];
      } catch (error) {
        console.error('Erro ao buscar equipes do encarregado online, tentando offline:', error);
        return await offlineDataService.getEquipesByEncarregado(encarregadoMatricula);
      }
    } else {
      return await offlineDataService.getEquipesByEncarregado(encarregadoMatricula);
    }
  },

  updateEquipe: async (id: number, data: any) => {
    // Separar os dados da equipe e da composição
    const { composicao, encarregadoMatricula, ...equipeData } = data;
    
    // Atualizar a equipe

    const { data: updatedEquipe, error: equipeError } = await supabase
      .from('equipes')
      .update({
        data: equipeData.data,
        encarregado_matricula: encarregadoMatricula,
        status_composicao: equipeData.statusComposicao
      })
      .eq('id', id)
      .select();
    
    if (equipeError) throw equipeError;
    
    // Se houver composição, primeiro remover a antiga
    if (composicao) {
      const { error: deleteError } = await supabase
        .from('composicao_equipe')
        .delete()
        .eq('equipe_id', id);
      
      if (deleteError) throw deleteError;
      
      // Inserir a nova composição
      const composicaoFormatada = composicao.map((item: ComposicaoEquipe) => ({
        equipe_id: id,
        colaborador_matricula: item.colaboradorMatricula
      }));
      
      const { error: insertError } = await supabase
        .from('composicao_equipe')
        .insert(composicaoFormatada);
      
      if (insertError) throw insertError;
    }
    
    // Buscar a equipe atualizada com a composição
    return await api.getEquipes().then(equipes => 
      equipes.find(equipe => equipe.id === id)
    );
  },

  createEquipe: async (data: any) => {
    const { composicao, encarregadoMatricula, ...equipeData } = data;
    
    // Inserir a equipe

    const { data: newEquipe, error: equipeError } = await supabase
      .from('equipes')
      .insert({
        data: equipeData.data,
        encarregado_matricula: encarregadoMatricula,
        status_composicao: equipeData.statusComposicao
      })
      .select();
    
    if (equipeError) throw equipeError;
    
    // Inserir a composição
      if (composicao && newEquipe) {
        const composicaoFormatada = composicao.map((item: ComposicaoEquipe) => ({
          equipe_id: newEquipe[0].id,
          colaborador_matricula: item.colaboradorMatricula
        }));
      
      const { error: insertError } = await supabase
        .from('composicao_equipe')
        .insert(composicaoFormatada);
      
      if (insertError) throw insertError;
    }
    
    // Buscar a equipe criada com a composição
    return await api.getEquipes().then(equipes => 
      equipes.find(equipe => equipe.id === newEquipe[0].id)
    );
  },

  // Serviços
  getServicos: async () => {
    const { data, error } = await supabase
      .rpc('get_servicos_permitidos');
    
    if (error) throw error;
    
    // Converter para o formato esperado pela aplicação
    const servicos = data.map((servico: any) => ({ // Explicitly type servico here
      id: servico.id,
      nota: servico.nota,
      equipeId: servico.equipe_id,
      equipePrefixo: servico.equipe_prefixo,
      dataPlanejada: servico.data_planejada,
      descricao: servico.descricao,
      status: servico.status,
      // checklistId removido - substituído pelo sistema GIservico
      // Dados hierárquicos para filtragem no frontend
      encarregadoId: servico.encarregado_id,
      supervisorId: servico.supervisor_id,
      coordenadorId: servico.coordenador_id,
      encarregadoFuncao: servico.encarregado_funcao,
      timestamps: {
        inicioDeslocamento: servico.inicio_deslocamento,
        fimDeslocamento: servico.fim_deslocamento,
        inicioExecucao: servico.inicio_execucao,
        fimExecucao: servico.fim_execucao
      }
    }));
    
    return servicos as Servico[];
  },

  createServico: async (data: any) => {
    // Preparar os dados para inserção
    // O ID será gerado automaticamente pelo trigger se não fornecido
    const insertData: any = {
      nota: data.nota,
      equipe_prefixo: data.equipe_prefixo || data.equipePrefixo,
      data_planejada: data.data_planejada || data.dataPlanejada,
      descricao: data.descricao,
      status: data.status || 'Planejado',
      inicio_deslocamento: data.inicio_deslocamento || data.timestamps?.inicioDeslocamento || null,
      fim_deslocamento: data.fim_deslocamento || data.timestamps?.fimDeslocamento || null,
      inicio_execucao: data.inicio_execucao || data.timestamps?.inicioExecucao || null,
      fim_execucao: data.fim_execucao || data.timestamps?.fimExecucao || null
    };

    // Só incluir equipe_id se fornecido
    if (data.equipe_id || data.equipeId) {
      insertData.equipe_id = data.equipe_id || data.equipeId;
    }

    const { data: newServico, error } = await supabase
      .from('servicos')
      .insert(insertData)
      .select();
    
    if (error) throw error;
    
    // Converter para o formato esperado pela aplicação
    return {
      id: newServico[0].id,
      nota: newServico[0].nota,
      equipeId: newServico[0].equipe_id,
      equipePrefixo: newServico[0].equipe_prefixo,
      dataPlanejada: newServico[0].data_planejada,
      descricao: newServico[0].descricao,
      status: newServico[0].status,
      // checklistId removido - substituído pelo sistema GIservico
      timestamps: {
        inicioDeslocamento: newServico[0].inicio_deslocamento,
        fimDeslocamento: newServico[0].fim_deslocamento,
        inicioExecucao: newServico[0].inicio_execucao,
        fimExecucao: newServico[0].fim_execucao
      }
    };
  },

  updateServico: async (id: number, data: any) => { // Changed id type from string to number
    // Extrair os timestamps do objeto
    const { timestamps, ...servicoData } = data;
    
    // Preparar os dados para atualização - só incluir campos que existem
    const updateData: any = {};
    
    // Só adicionar campos se eles existirem nos dados
    if (servicoData.equipeId !== undefined) updateData.equipe_id = servicoData.equipeId;
    if (servicoData.dataPlanejada !== undefined) updateData.data_planejada = servicoData.dataPlanejada;
    if (servicoData.descricao !== undefined) updateData.descricao = servicoData.descricao;
    if (servicoData.status !== undefined) updateData.status = servicoData.status;
    
    // Adicionar os timestamps se existirem
    if (timestamps) {
      if (timestamps.inicioDeslocamento) updateData.inicio_deslocamento = timestamps.inicioDeslocamento;
      if (timestamps.fimDeslocamento) updateData.fim_deslocamento = timestamps.fimDeslocamento;
      if (timestamps.inicioExecucao) updateData.inicio_execucao = timestamps.inicioExecucao;
      if (timestamps.fimExecucao) {
        // Aplicar ajuste de +3 horas para fimExecucao
        const originalDate = new Date(timestamps.fimExecucao);
        const adjustedDate = new Date(originalDate.getTime() + (3 * 60 * 60 * 1000)); // +3 horas
        updateData.fim_execucao = adjustedDate.toISOString();
        
        console.log('🕐 [TIMEZONE API] Horário original fimExecucao:', timestamps.fimExecucao);
        console.log('🕐 [TIMEZONE API] Horário ajustado (+3h):', updateData.fim_execucao);
      }
    }
    
    const { data: updatedServico, error } = await supabase
      .from('servicos')
      .update(updateData)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    // Converter para o formato esperado pela aplicação
    return {
      id: updatedServico[0].id,
      equipeId: updatedServico[0].equipe_id,
      dataPlanejada: updatedServico[0].data_planejada,
      descricao: updatedServico[0].descricao,
      status: updatedServico[0].status,
      // checklistId removido - substituído pelo sistema GIservico
      timestamps: {
        inicioDeslocamento: updatedServico[0].inicio_deslocamento,
        fimDeslocamento: updatedServico[0].fim_deslocamento,
        inicioExecucao: updatedServico[0].inicio_execucao,
        fimExecucao: updatedServico[0].fim_execucao
      }
    } as Servico;
  },

  // Funções de checklist removidas - substituídas pelo sistema GIservico

  // ========================================
  // HISTORICO TURNO
  // ========================================

  createHistoricoTurno: async (data: {
    colaborador_matricula: number;
    equipe_prefixo: string;
    data_turno: string;
    hora_oper: string; // Assuming HH:MM string, will convert to TIMESTAMPTZ
  }) => {
    if (!(await NetworkService.isConnected())) {
      return await offlineDataService.createHistoricoTurno({
        colaborador_matricula: data.colaborador_matricula,
        equipe_prefixo: data.equipe_prefixo,
        data_turno: data.data_turno,
        hora_inicio: data.hora_oper
      });
    }
    try {
      const { data: newRecord, error } = await supabase
        .from('historico_turno')
        .insert({
          colaborador_matricula: data.colaborador_matricula,
          equipe_prefixo: data.equipe_prefixo,
          data_turno: data.data_turno,
          hora_oper: `${data.data_turno}T${data.hora_oper}:00` // Combine date and time, Supabase will handle timezone if column is TIMESTAMPTZ
        })
        .select()
        .single();

      if (error) throw error;
      return newRecord;
    } catch (error) {
      console.log('🔄 [API] Erro online, tentando offline para createHistoricoTurno:', error);
      return await offlineDataService.createHistoricoTurno({
        colaborador_matricula: data.colaborador_matricula,
        equipe_prefixo: data.equipe_prefixo,
        data_turno: data.data_turno,
        hora_inicio: data.hora_oper
      });
    }
  },

  checkHistoricoTurnoExists: async (data: {
    colaborador_matricula: number;
    equipe_prefixo: string;
    data_turno: string;
  }) => {
    if (!(await NetworkService.isConnected())) {
      return await offlineDataService.checkHistoricoTurnoExists(data);
    }
    try {
      const { data: existingRecord, error } = await supabase
        .from('historico_turno')
        .select('id')
        .eq('colaborador_matricula', data.colaborador_matricula)
        .eq('equipe_prefixo', data.equipe_prefixo)
        .eq('data_turno', data.data_turno)
        .maybeSingle();

      if (error) throw error;
      return !!existingRecord; // Returns true if record exists, false otherwise
    } catch (error) {
      console.log('🔄 [API] Erro online, tentando offline para checkHistoricoTurnoExists:', error);
      return await offlineDataService.checkHistoricoTurnoExists(data);
    }
  },
};
