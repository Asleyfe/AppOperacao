import { IDataService } from './IDataService';
import { getLocalDatabase, safeRunAsync, safeGetAllAsync, safeGetFirstAsync } from './database';

export class OfflineDataService implements IDataService {
  async getColaboradores(): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetAllAsync(db, 'SELECT * FROM colaboradores_local ORDER BY nome');
      return result;
    } catch (error) {
      console.error('Erro ao buscar colaboradores offline:', error);
      throw error;
    }
  }

  async getServicos(): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      // Usar o mesmo formato de data que o componente (yyyy-MM-dd)
      const today = new Date().toISOString().split('T')[0]; // Formato: yyyy-MM-dd
      const result = await safeGetAllAsync(db,
        `SELECT s.*, e.nome as equipe_nome 
         FROM servicos_local s 
         LEFT JOIN equipes_local e ON s.equipe_id = e.id 
         WHERE DATE(s.data_planejada) = ?`,
        [today]
      );
      
      // Mapear campos do banco para o formato da aplicação
      return result.map((servico: any) => ({
        ...servico,
        dataPlanejada: servico.data_planejada, // Mapear data_planejada para dataPlanejada
        equipeId: servico.equipe_id,
        equipePrefixo: servico.equipe_prefixo,
        timestamps: {
          inicioDeslocamento: servico.inicio_deslocamento,
          fimDeslocamento: servico.fim_deslocamento,
          inicioExecucao: servico.inicio_execucao,
          fimExecucao: servico.fim_execucao
        }
      }));
    } catch (error) {
      console.error('Erro ao buscar serviços offline:', error);
      throw error;
    }
  }
  
  async updateServico(id: number, data: any): Promise<void> {
    try {
      const db = await getLocalDatabase();
      
      // Construir campos de atualização dinamicamente
      const updateFields = [];
      const updateValues = [];
      
      if (data.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(data.status);
      }
      
      // Tratar timestamps
      if (data.timestamps) {
        if (data.timestamps.inicioDeslocamento) {
          updateFields.push('inicio_deslocamento = ?');
          updateValues.push(data.timestamps.inicioDeslocamento);
        }
        if (data.timestamps.fimDeslocamento) {
          updateFields.push('fim_deslocamento = ?');
          updateValues.push(data.timestamps.fimDeslocamento);
        }
        if (data.timestamps.inicioExecucao) {
          updateFields.push('inicio_execucao = ?');
          updateValues.push(data.timestamps.inicioExecucao);
        }
        if (data.timestamps.fimExecucao) {
          updateFields.push('fim_execucao = ?');
          updateValues.push(data.timestamps.fimExecucao);
        }
      }
      
      // Campos diretos de timestamp (compatibilidade)
      if (data.inicio_execucao) {
        updateFields.push('inicio_execucao = ?');
        updateValues.push(data.inicio_execucao);
        console.log('▶️ [OFFLINE DEBUG] Atualizando inicio_execucao (direto):', data.inicio_execucao);
      }
      if (data.fim_execucao) {
        updateFields.push('fim_execucao = ?');
        // Aplicar ajuste de +3 horas para fim_execucao se for um timestamp atual
        let fimExecucaoValue = data.fim_execucao;
        if (typeof data.fim_execucao === 'string' && data.fim_execucao.includes('T')) {
          const originalDate = new Date(data.fim_execucao);
          const adjustedDate = new Date(originalDate.getTime() + (3 * 60 * 60 * 1000)); // +3 horas
          fimExecucaoValue = adjustedDate.toISOString();
          
          console.log('🕐 [TIMEZONE OFFLINE] Horário original fim_execucao:', data.fim_execucao);
          console.log('🕐 [TIMEZONE OFFLINE] Horário ajustado (+3h):', fimExecucaoValue);
        }
        updateValues.push(fimExecucaoValue);
      }
      
      // Sempre marcar como não sincronizado e atualizar timestamp de modificação
      updateFields.push('synced = 0', 'last_modified = CURRENT_TIMESTAMP');
      
      // Adicionar ID no final
      updateValues.push(id);
      
      const sql = `UPDATE servicos_local SET ${updateFields.join(', ')} WHERE id = ?`;
      
      const result = await safeRunAsync(db, sql, updateValues);
      console.log('🎉 [OFFLINE DEBUG] Serviço atualizado offline com sucesso! ID:', id);
      
      // Verificar se a atualização foi bem-sucedida
      const updatedService = await safeGetFirstAsync(
        db,
        'SELECT * FROM servicos_local WHERE id = ?',
        [id]
      );
      console.log('🔄 [OFFLINE DEBUG] Serviço após atualização:', updatedService);
    } catch (error) {
      console.error('Erro ao atualizar serviço offline:', error);
      throw error;
    }
  }
  
  async getServicos(): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      // Usar o mesmo formato de data que o componente (yyyy-MM-dd)
      const today = new Date().toISOString().split('T')[0]; // Formato: yyyy-MM-dd
      const result = await safeGetAllAsync(db,
        `SELECT s.*, e.nome as equipe_nome 
         FROM servicos_local s 
         LEFT JOIN equipes_local e ON s.equipe_id = e.id 
         WHERE DATE(s.data_planejada) = ?`,
        [today]
      );
      
      // Mapear campos do banco para o formato da aplicação
      return result.map((servico: any) => ({
        ...servico,
        dataPlanejada: servico.data_planejada, // Mapear data_planejada para dataPlanejada
        equipeId: servico.equipe_id,
        equipePrefixo: servico.equipe_prefixo,
        timestamps: {
          inicioDeslocamento: servico.inicio_deslocamento,
          fimDeslocamento: servico.fim_deslocamento,
          inicioExecucao: servico.inicio_execucao,
          fimExecucao: servico.fim_execucao
        }
      }));
    } catch (error) {
      console.error('Erro ao buscar serviços offline:', error);
      throw error;
    }
  }

  async getEquipes(): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetAllAsync(db, 'SELECT * FROM equipes_local');
      return result;
    } catch (error) {
      console.error('Erro ao buscar equipes offline:', error);
      throw error;
    }
  }

  async getEquipesByEncarregado(encarregadoMatricula: string): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      
      const result = await safeGetAllAsync(db,
        'SELECT * FROM equipes_local WHERE encarregado_matricula = ?',
        [encarregadoMatricula]
      );
      
      return result;
    } catch (error) {
      console.error('❌ [OFFLINE] Erro ao buscar equipes do encarregado:', error);
      throw error;
    }
  }
  
  async getGrupoItens(): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetAllAsync(db, 'SELECT * FROM grupo_itens_local');
      return result;
    } catch (error) {
      console.error('Erro ao buscar grupo de itens offline:', error);
      throw error;
    }
  }

  async getGrupos(): Promise<string[]> {
    try {
      const grupoItens = await this.getGrupoItens();
      // Retornar apenas valores únicos de grupos
      const grupos = [...new Set(grupoItens.map(item => item.grupo))];
      return grupos;
    } catch (error) {
      console.error('Erro ao buscar grupos offline:', error);
      throw error;
    }
  }

  async createGIServico(data: any): Promise<any> {
    try {
      const db = await getLocalDatabase();
      const result = await safeRunAsync(db,
        `INSERT INTO giservico_local (id_servico, id_item, quantidade, status, n_serie, prefixo, synced, last_modified)
         VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
        [data.id_servico, data.id_item, data.quantidade, data.status, data.n_serie, data.prefixo]
      );
      return { id: result.lastInsertRowId, ...data };
    } catch (error) {
      console.error('Erro ao criar GI Serviço offline:', error);
      throw error;
    }
  }

  async updateGIServico(id: number, data: any): Promise<any> {
    try {
      const db = await getLocalDatabase();
      const updateFields = [];
      const updateValues = [];

      if (data.id_item !== undefined) {
        updateFields.push('id_item = ?');
        updateValues.push(data.id_item);
      }
      if (data.quantidade !== undefined) {
        updateFields.push('quantidade = ?');
        updateValues.push(data.quantidade);
      }
      if (data.status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(data.status);
      }
      if (data.n_serie !== undefined) {
        updateFields.push('n_serie = ?');
        updateValues.push(data.n_serie);
      }
      if (data.prefixo !== undefined) {
        updateFields.push('prefixo = ?');
        updateValues.push(data.prefixo);
      }

      updateFields.push('synced = 0', 'last_modified = CURRENT_TIMESTAMP');
      updateValues.push(id);

      const sql = `UPDATE giservico_local SET ${updateFields.join(', ')} WHERE id = ?`;
      await safeRunAsync(db, sql, updateValues);
      return { id, ...data };
    } catch (error) {
      console.error('Erro ao atualizar GI Serviço offline:', error);
      throw error;
    }
  }

  async getServicoHeader(servicoId: number): Promise<any> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db,
        `SELECT * FROM servico_header_local WHERE servico_id = ?`,
        [servicoId]
      );
      return result;
    } catch (error) {
      console.error('Erro ao buscar cabeçalho de serviço offline:', error);
      throw error;
    }
  }

  async createServicoHeader(header: any): Promise<any> {
    try {
      const db = await getLocalDatabase();
      const result = await safeRunAsync(db,
        `INSERT INTO servico_header_local (
          servico_id, km_inicial, km_final, hora_inicial, hora_final, data_execucao,
          equipe_prefixo, equipamento, projeto, si, ptp, status_servico, ocorrencia,
          synced, last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
        [
          header.servico_id, header.km_inicial, header.km_final, header.hora_inicial, header.hora_final, header.data_execucao,
          header.equipe_prefixo, header.equipamento, header.projeto, header.si, header.ptp, header.status_servico, header.ocorrencia
        ]
      );
      return { id: result.lastInsertRowId, ...header };
    } catch (error) {
      console.error('Erro ao criar cabeçalho de serviço offline:', error);
      throw error;
    }
  }

  async updateServicoHeader(servicoId: number, header: any): Promise<any> {
    try {
      const db = await getLocalDatabase();
      const updateFields = [];
      const updateValues = [];

      if (header.km_inicial !== undefined) {
        updateFields.push('km_inicial = ?');
        updateValues.push(header.km_inicial);
      }
      if (header.km_final !== undefined) {
        updateFields.push('km_final = ?');
        updateValues.push(header.km_final);
      }
      if (header.hora_inicial !== undefined) {
        updateFields.push('hora_inicial = ?');
        updateValues.push(header.hora_inicial);
      }
      if (header.hora_final !== undefined) {
        updateFields.push('hora_final = ?');
        updateValues.push(header.hora_final);
      }
      if (header.data_execucao !== undefined) {
        updateFields.push('data_execucao = ?');
        updateValues.push(header.data_execucao);
      }
      if (header.equipe_prefixo !== undefined) {
        updateFields.push('equipe_prefixo = ?');
        updateValues.push(header.equipe_prefixo);
      }
      if (header.equipamento !== undefined) {
        updateFields.push('equipamento = ?');
        updateValues.push(header.equipamento);
      }
      if (header.projeto !== undefined) {
        updateFields.push('projeto = ?');
        updateValues.push(header.projeto);
      }
      if (header.si !== undefined) {
        updateFields.push('si = ?');
        updateValues.push(header.si);
      }
      if (header.ptp !== undefined) {
        updateFields.push('ptp = ?');
        updateValues.push(header.ptp);
      }
      if (header.status_servico !== undefined) {
        updateFields.push('status_servico = ?');
        updateValues.push(header.status_servico);
      }
      if (header.ocorrencia !== undefined) {
        updateFields.push('ocorrencia = ?');
        updateValues.push(header.ocorrencia);
      }

      updateFields.push('synced = 0', 'last_modified = CURRENT_TIMESTAMP');
      updateValues.push(servicoId);

      const sql = `UPDATE servico_header_local SET ${updateFields.join(', ')} WHERE servico_id = ?`;
      await safeRunAsync(db, sql, updateValues);
      return { servico_id: servicoId, ...header };
    } catch (error) {
      console.error('Erro ao atualizar cabeçalho de serviço offline:', error);
      throw error;
    }
  }

  async getGIServicosByServico(servicoId: number): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetAllAsync(db,
        `SELECT gi.*, gi_item.grupo, gi_item.item, gi_item.unidade
         FROM giservico_local gi
         LEFT JOIN grupo_itens_local gi_item ON gi.id_item = gi_item.id
         WHERE gi.id_servico = ?
         ORDER BY gi.last_modified DESC`,
        [servicoId]
      );
      return result;
    } catch (error) {
      console.error('Erro ao buscar GI Serviços por serviço offline:', error);
      throw error;
    }
  }

  async getServicosByEncarregado(encarregadoId: string, today: string): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      
      // Buscar todas as equipes do encarregado
      const equipesResult = await safeGetAllAsync(db,
        'SELECT * FROM equipes_local WHERE encarregado_matricula = ?',
        [encarregadoId]
      );
      
      if (equipesResult.length === 0) {
        return [];
      }
      
      // Extrair IDs das equipes
      const equipeIds = equipesResult.map(equipe => equipe.id);
      
      // Buscar serviços das equipes na data atual
      const placeholders = equipeIds.map(() => '?').join(',');
      const servicosQuery = `
        SELECT * FROM servicos_local 
        WHERE equipe_id IN (${placeholders}) 
        AND data_planejada = ?
        ORDER BY id
      `;
      
      const queryParams = [...equipeIds, today];
      const servicosResult = await safeGetAllAsync(db, servicosQuery, queryParams);
      
      // Mapear para o formato esperado pela aplicação
      const servicosMapeados = servicosResult.map(servico => ({
        id: servico.id,
        numero: servico.numero,
        descricao: servico.descricao,
        status: servico.status,
        nota: servico.nota,
        equipeId: servico.equipe_id,
        encarregadoId: servico.encarregado_id,
        dataPlanejada: servico.data_planejada,
        timestamps: {
          inicioDeslocamento: servico.inicio_deslocamento,
          fimDeslocamento: servico.fim_deslocamento,
          inicioExecucao: servico.inicio_execucao,
          fimExecucao: servico.fim_execucao
        },
        synced: servico.synced,
        lastModified: servico.last_modified
      }));
      
      return servicosMapeados;
    } catch (error) {
      console.error('❌ [OFFLINE] Erro ao buscar serviços por encarregado:', error);
      throw error;
    }
  }

  // Métodos para histórico de turno
  async checkHistoricoTurnoExists(data: {
    colaborador_matricula: number;
    equipe_prefixo: string;
    data_turno: string;
  }): Promise<boolean> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db,
        `SELECT id FROM historico_turno_local 
         WHERE colaborador_matricula = ? AND equipe_prefixo = ? AND data_turno = ?`,
        [data.colaborador_matricula.toString(), data.equipe_prefixo, data.data_turno]
      );
      
      console.log('🔍 [OFFLINE DEBUG] Verificação de turno offline:', {
        colaborador: data.colaborador_matricula,
        equipe: data.equipe_prefixo,
        data: data.data_turno,
        existe: !!result
      });
      
      return !!result;
    } catch (error) {
      console.error('❌ [OFFLINE DEBUG] Erro ao verificar histórico de turno offline:', error);
      throw error;
    }
  }

  async createHistoricoTurno(data: {
    colaborador_matricula: number;
    equipe_prefixo: string;
    data_turno: string;
    hora_inicio: string;
    tipo_turno?: string;
    observacoes?: string;
  }): Promise<any> {
    try {
      const db = await getLocalDatabase();
      // Criar timestamp compatível com hora_oper (TIMESTAMPTZ)
      const horaOper = `${data.data_turno}T${data.hora_inicio}:00`;
      
      const result = await safeRunAsync(db,
        `INSERT OR REPLACE INTO historico_turno_local 
         (colaborador_matricula, equipe_prefixo, data_turno, hora_inicio_turno, hora_oper, synced)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [
          data.colaborador_matricula.toString(),
          data.equipe_prefixo,
          data.data_turno,
          data.hora_inicio,
          horaOper
        ]
      );
      
      console.log('✅ [OFFLINE DEBUG] Histórico de turno criado offline:', {
        id: result.lastInsertRowId,
        colaborador: data.colaborador_matricula,
        equipe: data.equipe_prefixo,
        data: data.data_turno
      });
      
      return { id: result.lastInsertRowId, ...data };
    } catch (error) {
      console.error('❌ [OFFLINE DEBUG] Erro ao criar histórico de turno offline:', error);
      throw error;
    }
  }

  // Métodos de Faturamento Offline
  async getValoresFaturamento(): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetAllAsync(db,
        `SELECT * FROM valores_faturamento_real_local ORDER BY grupo, item, status`
      );
      
      console.log('===============================================\n');
      return result;
    } catch (error) {
      console.error('❌ [OFFLINE] Erro ao buscar valores de faturamento:', error);
      return [];
    }
  }

  async getFaturamentoData(startDate: string, endDate: string, equipePrefixos?: string[]): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      
      // Query base para buscar dados de faturamento
      let query = `
        SELECT 
          s.id as numero_servico,
          s.equipe_prefixo as equipe,
          s.data_planejada as data_servico,
          gi.grupo,
          gi.item,
          gis.status,
          gis.quantidade,
          COALESCE(vfr.valor_unitario, 0) as valor_unitario,
          (gis.quantidade * COALESCE(vfr.valor_unitario, 0)) as valor_total
        FROM servicos_local s
        INNER JOIN giservico_local gis ON s.id = gis.id_servico
        INNER JOIN grupo_itens_local gi ON gis.id_item = gi.id
        LEFT JOIN valores_faturamento_real_local vfr ON (
          gi.grupo = vfr.grupo AND 
          gi.item = vfr.item AND 
          gis.status = vfr.status
        )
        WHERE s.data_planejada >= ? AND s.data_planejada <= ?
      `;
      
      const params = [startDate, endDate];
      
      // Filtrar por equipes se especificado
      if (equipePrefixos && equipePrefixos.length > 0) {
        const placeholders = equipePrefixos.map(() => '?').join(',');
        query += ` AND s.equipe_prefixo IN (${placeholders})`;
        params.push(...equipePrefixos);
      }
      
      query += ` ORDER BY s.data_planejada, s.equipe_prefixo, gi.grupo, gi.item`;
      
      const result = await safeGetAllAsync(db, query, params);
      
      console.log('✅ [OFFLINE] Dados de faturamento carregados:', {
        periodo: `${startDate} a ${endDate}`,
        equipes: equipePrefixos?.length || 'todas',
        registros: result.length
      });
      
      return result;
    } catch (error) {
      console.error('❌ [OFFLINE] Erro ao buscar dados de faturamento:', error);
      return [];
    }
  }

  async syncValoresFaturamento(valoresOnline: any[]): Promise<void> {
    try {
      const db = await getLocalDatabase();
      
      if (!valoresOnline || valoresOnline.length === 0) {
        console.log('⚠️ [OFFLINE] Nenhum valor de faturamento para sincronizar');
        return;
      }
      
      console.log(`🔄 [OFFLINE] Iniciando sincronização de ${valoresOnline.length} valores de faturamento...`);
      
      // Limpar dados antigos
      await safeRunAsync(db, 'DELETE FROM valores_faturamento_real_local');
      console.log('🗑️ [OFFLINE] Dados antigos de faturamento removidos');
      
      // Inserir novos dados usando INSERT OR REPLACE para evitar conflitos de constraint UNIQUE
      let sucessos = 0;
      let erros = 0;
      
      for (const valor of valoresOnline) {
        try {
          // Validar dados obrigatórios
          if (!valor.grupo || !valor.item || !valor.status || valor.valor_unitario === undefined) {
            console.warn('⚠️ [OFFLINE] Valor de faturamento com dados incompletos ignorado:', valor);
            erros++;
            continue;
          }
          
          await safeRunAsync(db,
            `INSERT OR REPLACE INTO valores_faturamento_real_local 
             (grupo, item, status, valor_unitario, unidade, observacoes, synced, created_at, updated_at, last_modified)
             VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              valor.grupo,
              valor.item,
              valor.status,
              valor.valor_unitario,
              valor.unidade || null,
              valor.observacoes || null
            ]
          );
          sucessos++;
        } catch (itemError) {
          console.error('❌ [OFFLINE] Erro ao inserir valor de faturamento:', valor, itemError);
          erros++;
        }
      }
      
      console.log(`✅ [OFFLINE] Sincronização de valores de faturamento concluída: ${sucessos} sucessos, ${erros} erros`);
      
      if (erros > 0) {
        console.warn(`⚠️ [OFFLINE] ${erros} valores de faturamento não puderam ser sincronizados`);
      }
    } catch (error) {
      console.error('❌ [OFFLINE] Erro crítico ao sincronizar valores de faturamento:', error);
      // Não propagar o erro para não interromper outras sincronizações
    }
  }
}
