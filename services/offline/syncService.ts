import { supabase } from '../supabase';
   import { getLocalDatabase, safeRunAsync, safeGetAllAsync } from './database';
   
   class SyncService {
     // Sincronizar dados do servidor para local
    async syncFromServer(colaboradorMatricula?: string) {
      try {
        console.log(`🔄 [SYNC] Iniciando sincronização - Encarregado: ${colaboradorMatricula || 'TODOS OS DADOS'}`);
         // Buscar dados do Supabase
         const { data: colaboradores } = await supabase
           .from('colaboradores')
           .select('*');
         
         // Filtrar equipes por encarregado se matricula for fornecida
         let equipesQuery = supabase.from('equipes').select('*');
         if (colaboradorMatricula) {
           equipesQuery = equipesQuery.eq('encarregado_matricula', colaboradorMatricula);
         }
         const { data: equipes } = await equipesQuery;
         console.log(`📊 [SYNC] Equipes encontradas: ${equipes?.length || 0}`);
         if (colaboradorMatricula && equipes) {
           console.log(`🎯 [SYNC] Equipes do encarregado ${colaboradorMatricula}:`, equipes.map(e => `${e.id} - ${e.nome}`));
         }
         
         const { data: grupoItens } = await supabase
           .from('grupo_itens')
           .select('*');

         const { data: giServicos } = await supabase
           .from('giservico')
           .select('*');

         // Buscar serviços do Supabase - filtrar por equipes do encarregado se matricula for fornecida
         let servicosQuery = supabase.from('servicos').select('*');
         if (colaboradorMatricula && equipes && equipes.length > 0) {
           const equipeIds = equipes.map(equipe => equipe.id);
           servicosQuery = servicosQuery.in('equipe_id', equipeIds);
           console.log(`🔍 [SYNC DEBUG] Filtrando serviços para ${equipeIds.length} equipes do encarregado ${colaboradorMatricula}`);
         }
         const { data: servicos } = await servicosQuery;
         console.log(`📊 [SYNC] Serviços encontrados: ${servicos?.length || 0}`);

         // Buscar servicoHeaders - filtrar por serviços das equipes do encarregado
         let servicoHeadersQuery = supabase.from('servico_header').select('*');
         if (colaboradorMatricula && servicos && servicos.length > 0) {
           const servicoIds = servicos.map(servico => servico.id);
           servicoHeadersQuery = servicoHeadersQuery.in('servico_id', servicoIds);
           console.log(`🔍 [SYNC DEBUG] Filtrando servicoHeaders para ${servicoIds.length} serviços do encarregado`);
         }
         const { data: servicoHeaders } = await servicoHeadersQuery;
         
         // Inserir/atualizar no SQLite local
         const db = await getLocalDatabase();
         
         if (colaboradores) {
           for (const colaborador of colaboradores) {
             // Validar campos obrigatórios
             if (!colaborador.nome || !colaborador.funcao || !colaborador.matricula) {
               console.warn('Colaborador com dados incompletos ignorado:', colaborador);
               continue;
             }
             
             await safeRunAsync(db,
               `INSERT OR REPLACE INTO colaboradores_local 
                (id, nome, funcao, matricula, supervisor_id, coordenador_id, synced, last_modified) 
                VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
               [colaborador.id, colaborador.nome, colaborador.funcao, 
                colaborador.matricula, colaborador.supervisor_id, colaborador.coordenador_id]
             );
           }
         }

         if (equipes) {
           for (const equipe of equipes) {
             // Validar campos obrigatórios
             if (!equipe.prefixo || !equipe.tipo_equipe) {
               console.warn('Equipe com dados incompletos ignorada:', equipe);
               continue;
             }
             
             await safeRunAsync(db,
               `INSERT OR REPLACE INTO equipes_local
                (id, nome, prefixo, tipo_equipe, status_composicao, encarregado_matricula, synced, last_modified)
                VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
               [equipe.id, equipe.nome || equipe.prefixo, equipe.prefixo, equipe.tipo_equipe, equipe.status_composicao || 'Pendente', equipe.encarregado_matricula]
             );
             console.log(`✅ Equipe ${equipe.prefixo} sincronizada com sucesso`);
           }
         }

         if (grupoItens) {
           for (const item of grupoItens) {
             await safeRunAsync(db,
               `INSERT OR REPLACE INTO grupo_itens_local
                (id, grupo, item, descricao, synced, last_modified)
                VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
               [item.id, item.grupo, item.item, item.descricao]
             );
           }
         }

         if (giServicos) {
           for (const gi of giServicos) {
             await safeRunAsync(db,
               `INSERT OR REPLACE INTO giservico_local
                (id, id_servico, id_item, quantidade, status, n_serie, prefixo, synced, last_modified)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
               [gi.id, gi.id_servico, gi.id_item, gi.quantidade, gi.status, gi.n_serie, gi.prefixo]
             );
           }
         }

         if (servicoHeaders) {
           for (const header of servicoHeaders) {
             await safeRunAsync(db,
               `INSERT OR REPLACE INTO servico_header_local
                (id, servico_id, km_inicial, km_final, hora_inicial, hora_final, data_execucao, equipe_prefixo, equipamento, projeto, si, ptp, status_servico, ocorrencia, synced, last_modified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
               [header.id, header.servico_id, header.km_inicial, header.km_final, header.hora_inicial, header.hora_final, header.data_execucao, header.equipe_prefixo, header.equipamento, header.projeto, header.si, header.ptp, header.status_servico, header.ocorrencia]
             );
           }
         }

         if (servicos) {
           console.log(`🔄 Sincronizando ${servicos.length} serviços para o banco local`);
           for (const servico of servicos) {
             // Validar campos obrigatórios
             if (!servico.id || !servico.equipe_id) {
               console.warn('Serviço com dados incompletos ignorado:', servico);
               continue;
             }
             
             await safeRunAsync(db,
               `INSERT OR REPLACE INTO servicos_local
                (id, equipe_id, data_planejada, descricao, status, inicio_deslocamento, fim_deslocamento, inicio_execucao, fim_execucao, equipe_prefixo, nota, synced, last_modified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
               [servico.id, servico.equipe_id, servico.data_planejada, servico.descricao, servico.status, servico.inicio_deslocamento, servico.fim_deslocamento, servico.inicio_execucao, servico.fim_execucao, servico.equipe_prefixo || '', servico.nota || '0000']
             );
             console.log(`📝 [SYNC DEBUG] Campo nota inserido no banco local - Serviço ID: ${servico.id}, Nota: ${servico.nota || '0000'}`);
             console.log(`✅ Serviço ID ${servico.id} sincronizado com sucesso`);
           }
         }
       } catch (error) {
         console.error('Erro na sincronização do servidor:', error);
       }
     }
     
     // Sincronizar dados locais para servidor
     async syncToServer() {
       try {
         const db = await getLocalDatabase();
         
         // Buscar registros não sincronizados
         // Sincronizar servicos_local
         const servicosToSync = await safeGetAllAsync(db,
           'SELECT * FROM servicos_local WHERE synced = 0'
         );
         
         for (const servico of servicosToSync as any[]) { // Explicitly type servico
           const { error } = await supabase
             .from('servicos')
             .upsert({
               id: servico.id,
               equipe_id: servico.equipe_id,
               data_planejada: servico.data_planejada,
               descricao: servico.descricao,
               status: servico.status,
               inicio_deslocamento: servico.inicio_deslocamento,
               fim_deslocamento: servico.fim_deslocamento,
               inicio_execucao: servico.inicio_execucao,
               fim_execucao: servico.fim_execucao,
               equipe_prefixo: servico.equipe_prefixo,
               nota: servico.nota || '0000',
             });
           
           if (!error) {
             await safeRunAsync(db,
               'UPDATE servicos_local SET synced = 1 WHERE id = ?',
               [servico.id]
             );
           } else {
             console.error('Erro ao sincronizar serviço:', servico.id, error);
           }
         }

         // Sincronizar equipes_local
         const equipesToSync = await safeGetAllAsync(db,
           'SELECT * FROM equipes_local WHERE synced = 0'
         );

         for (const equipe of equipesToSync as any[]) { // Explicitly type equipe
           const { error } = await supabase
             .from('equipes')
             .upsert({
               id: equipe.id,
               nome: equipe.nome,
               prefixo: equipe.prefixo,
               tipo_equipe: equipe.tipo_equipe,
               status_composicao: equipe.status_composicao,
               encarregado_matricula: equipe.encarregado_matricula,
             });

           if (!error) {
             await safeRunAsync(db,
               'UPDATE equipes_local SET synced = 1 WHERE id = ?',
               [equipe.id]
             );
           } else {
             console.error('Erro ao sincronizar equipe:', equipe.id, error);
           }
         }

         // Sincronizar grupo_itens_local
         const grupoItensToSync = await safeGetAllAsync(db,
           'SELECT * FROM grupo_itens_local WHERE synced = 0'
         );

         for (const item of grupoItensToSync as any[]) { // Explicitly type item
           const { error } = await supabase
             .from('grupo_itens')
             .upsert({
               id: item.id,
               grupo: item.grupo,
               item: item.item,
               descricao: item.descricao,
             });

           if (!error) {
             await safeRunAsync(db,
               'UPDATE grupo_itens_local SET synced = 1 WHERE id = ?',
               [item.id]
             );
           } else {
             console.error('Erro ao sincronizar grupo de item:', item.id, error);
           }
         }

         // Sincronizar giservico_local
         const giServicosToSync = await safeGetAllAsync(db,
           'SELECT * FROM giservico_local WHERE synced = 0'
         );

         for (const gi of giServicosToSync as any[]) { // Explicitly type gi
           const { error } = await supabase
             .from('giservico')
             .upsert({
               id: gi.id,
               id_servico: gi.id_servico,
               id_item: gi.id_item,
               quantidade: gi.quantidade,
               status: gi.status,
               n_serie: gi.n_serie,
               prefixo: gi.prefixo,
             });

           if (!error) {
             await safeRunAsync(db,
               'UPDATE giservico_local SET synced = 1 WHERE id = ?',
               [gi.id]
             );
           } else {
             console.error('Erro ao sincronizar GI Serviço:', gi.id, error);
           }
         }

         // Sincronizar servico_header_local
         const servicoHeadersToSync = await safeGetAllAsync(db,
           'SELECT * FROM servico_header_local WHERE synced = 0'
         );

         for (const header of servicoHeadersToSync as any[]) { // Explicitly type header
           const { error } = await supabase
             .from('servico_header')
             .upsert({
               id: header.id,
               servico_id: header.servico_id,
               km_inicial: header.km_inicial,
               km_final: header.km_final,
               hora_inicial: header.hora_inicial,
               hora_final: header.hora_final,
               data_execucao: header.data_execucao,
               equipe_prefixo: header.equipe_prefixo,
               equipamento: header.equipamento,
               projeto: header.projeto,
               si: header.si,
               ptp: header.ptp,
               status_servico: header.status_servico,
               ocorrencia: header.ocorrencia,
             });

           if (!error) {
             await safeRunAsync(db,
               'UPDATE servico_header_local SET synced = 1 WHERE id = ?',
               [header.id]
             );
           } else {
             console.error('Erro ao sincronizar cabeçalho de serviço:', header.id, error);
           }
         }
       } catch (error) {
         console.error('Erro na sincronização para servidor:', error);
       }
     }
   }

   export { SyncService };
