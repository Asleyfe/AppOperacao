import { supabase } from '../supabase';
import { getLocalDatabase, safeRunAsync, safeGetAllAsync } from './database';
import { OfflineDataService } from './OfflineDataService';
   
   class SyncService {
     private static isSyncing = false;
     
     // Sincronizar dados do servidor para local
    async syncFromServer(colaboradorMatricula?: string) {
      // Evitar sincronizações concorrentes
      if (SyncService.isSyncing) {
        console.log('⚠️ [SYNC] Sincronização já em andamento, ignorando nova tentativa');
        return;
      }
      
      SyncService.isSyncing = true;
      try {
        if (!colaboradorMatricula) {
          console.log('🔄 [SYNC] Sincronizando todos os dados');
        } else {
          console.log(`🔄 [SYNC] Sincronizando dados para colaborador: ${colaboradorMatricula}`);
        }
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
         }
         const { data: servicos } = await servicosQuery;

         // Buscar servicoHeaders - filtrar por serviços das equipes do encarregado
         let servicoHeadersQuery = supabase.from('servico_header').select('*');
         if (colaboradorMatricula && servicos && servicos.length > 0) {
           const servicoIds = servicos.map(servico => servico.id);
           servicoHeadersQuery = servicoHeadersQuery.in('servico_id', servicoIds);
         }
         const { data: servicoHeaders } = await servicoHeadersQuery;

         // Buscar histórico de turnos - filtrar por colaborador se matricula for fornecida
         let historicoTurnoQuery = supabase.from('historico_turno').select('*');
         if (colaboradorMatricula) {
           historicoTurnoQuery = historicoTurnoQuery.eq('colaborador_matricula', parseInt(colaboradorMatricula));
         }
         const { data: historicoTurno } = await historicoTurnoQuery;
         
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
             if (!equipe.prefixo) {
               console.warn('Equipe com dados incompletos ignorada:', equipe);
               continue;
             }
             
             await safeRunAsync(db,
               `INSERT OR REPLACE INTO equipes_local
                (id, nome, prefixo, status_composicao, encarregado_matricula, synced, last_modified)
                VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
               [equipe.id, equipe.nome || equipe.prefixo, equipe.prefixo, equipe.status_composicao || 'Pendente', equipe.encarregado_matricula]
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
             )
           }
         }

         if (historicoTurno) {
           console.log(`🔄 Sincronizando ${historicoTurno.length} registros de histórico de turno para o banco local`);
           for (const turno of historicoTurno) {
             // Validar campos obrigatórios
             if (!turno.colaborador_matricula || !turno.equipe_prefixo || !turno.data_turno) {
               console.warn('Histórico de turno com dados incompletos ignorado:', turno);
               continue;
             }
             
             await safeRunAsync(db,
               `INSERT OR REPLACE INTO historico_turno_local
                (id, colaborador_matricula, equipe_prefixo, data_turno, hora_inicio_turno, hora_oper, synced, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
               [turno.id, turno.colaborador_matricula.toString(), turno.equipe_prefixo, turno.data_turno, turno.hora_oper || '00:00', turno.hora_oper]
             );
             console.log(`✅ Histórico de turno ID ${turno.id} sincronizado com sucesso`);
           }
         }

         // Sincronizar valores de faturamento
         console.log('🔄 Sincronizando valores de faturamento...');
         const { data: valoresFaturamento } = await supabase
           .from('valores_faturamento_real')
           .select('*');
         
         if (valoresFaturamento && valoresFaturamento.length > 0) {
           const offlineDataService = new OfflineDataService();
           await offlineDataService.syncValoresFaturamento(valoresFaturamento);
           console.log(`✅ ${valoresFaturamento.length} valores de faturamento sincronizados com sucesso`);
         } else {
           console.log('⚠️ Nenhum valor de faturamento encontrado no servidor');
         }

         // Exibir dados das tabelas locais após sincronização
         await this.logLocalTablesData(db, colaboradorMatricula);
         
         console.log('✅ Sincronização do servidor concluída com sucesso');
       } catch (error) {
         console.error('Erro na sincronização do servidor:', error);
       } finally {
         SyncService.isSyncing = false;
       }
     }

     // Função para exibir dados das tabelas locais (exceto grupo_itens e colaboradores)
     private async logLocalTablesData(db: any, colaboradorMatricula?: string) {
       try {
         console.log('\n📊 ===== DADOS DAS TABELAS LOCAIS =====');
         
         // Equipes
         const equipes = await safeGetAllAsync(db, 'SELECT * FROM equipes_local ORDER BY prefixo');
         console.log(`\n🏢 EQUIPES_LOCAL (${equipes.length} registros):`);
         if (equipes.length > 0) {
           equipes.forEach((equipe: any) => {
             console.log(`   • ID: ${equipe.id} | Prefixo: ${equipe.prefixo} | Nome: ${equipe.nome || 'N/A'} | Encarregado: ${equipe.encarregado_matricula || 'N/A'} | Status: ${equipe.status_composicao || 'N/A'} | Synced: ${equipe.synced}`);
           });
         } else {
           console.log('   ⚠️ Nenhuma equipe encontrada');
         }

         // Serviços
         const servicos = await safeGetAllAsync(db, 'SELECT * FROM servicos_local ORDER BY id');
         console.log(`\n🔧 SERVICOS_LOCAL (${servicos.length} registros):`);
         if (servicos.length > 0) {
           servicos.forEach((servico: any) => {
             console.log(`   • ID: ${servico.id} | Equipe: ${servico.equipe_id} | Data: ${servico.data_planejada || 'N/A'} | Status: ${servico.status || 'N/A'} | Descrição: ${servico.descricao?.substring(0, 50) || 'N/A'}... | Synced: ${servico.synced}`);
           });
         } else {
           console.log('   ⚠️ Nenhum serviço encontrado');
         }

         // Serviço Headers
         const servicoHeaders = await safeGetAllAsync(db, 'SELECT * FROM servico_header_local ORDER BY id');
         console.log(`\n📋 SERVICO_HEADER_LOCAL (${servicoHeaders.length} registros):`);
         if (servicoHeaders.length > 0) {
           servicoHeaders.forEach((header: any) => {
             console.log(`   • ID: ${header.id} | Serviço: ${header.servico_id} | Equipe: ${header.equipe_prefixo || 'N/A'} | Data: ${header.data_execucao || 'N/A'} | Status: ${header.status_servico || 'N/A'} | Synced: ${header.synced}`);
           });
         } else {
           console.log('   ⚠️ Nenhum cabeçalho de serviço encontrado');
         }

         // GI Serviços
         const giServicos = await safeGetAllAsync(db, 'SELECT * FROM giservico_local ORDER BY id');
         console.log(`\n⚙️ GISERVICO_LOCAL (${giServicos.length} registros):`);
         if (giServicos.length > 0) {
           giServicos.forEach((gi: any) => {
             console.log(`   • ID: ${gi.id} | Serviço: ${gi.id_servico} | Item: ${gi.id_item} | Qtd: ${gi.quantidade || 'N/A'} | Status: ${gi.status || 'N/A'} | N° Série: ${gi.n_serie || 'N/A'} | Prefixo: ${gi.prefixo || 'N/A'} | Synced: ${gi.synced}`);
           });
         } else {
           console.log('   ⚠️ Nenhum GI Serviço encontrado');
         }

         // Histórico de Turnos
         const historicoTurnos = await safeGetAllAsync(db, 'SELECT * FROM historico_turno_local ORDER BY data_turno DESC, id');
         console.log(`\n⏰ HISTORICO_TURNO_LOCAL (${historicoTurnos.length} registros):`);
         if (historicoTurnos.length > 0) {
           historicoTurnos.forEach((turno: any) => {
             console.log(`   • ID: ${turno.id} | Colaborador: ${turno.colaborador_matricula} | Equipe: ${turno.equipe_prefixo} | Data: ${turno.data_turno} | Hora Início: ${turno.hora_inicio_turno || 'N/A'} | Hora Oper: ${turno.hora_oper || 'N/A'} | Synced: ${turno.synced}`);
           });
         } else {
           console.log('   ⚠️ Nenhum histórico de turno encontrado');
         }

         // Valores de Faturamento
         const valoresFaturamento = await safeGetAllAsync(db, 'SELECT * FROM valores_faturamento_real_local ORDER BY grupo, item, status');
         console.log(`\n💰 VALORES_FATURAMENTO_REAL_LOCAL (${valoresFaturamento.length} registros):`);
         if (valoresFaturamento.length > 0) {
           // Agrupar por grupo para estatísticas
           const grupos = valoresFaturamento.reduce((acc: any, item: any) => {
             if (!acc[item.grupo]) {
               acc[item.grupo] = { count: 0, items: new Set() };
             }
             acc[item.grupo].count++;
             acc[item.grupo].items.add(item.item);
             return acc;
           }, {});
           
           console.log('   📋 Distribuição por grupo:');
           Object.entries(grupos).forEach(([grupo, data]: [string, any]) => {
             console.log(`      • ${grupo}: ${data.count} registros (${data.items.size} itens únicos)`);
           });
           
           // Mostrar alguns exemplos
           console.log('   💵 Primeiros 3 registros:');
           valoresFaturamento.slice(0, 3).forEach((item: any) => {
             console.log(`      • ${item.grupo} | ${item.item} | ${item.status} = R$ ${item.valor_unitario}`);
           });
         } else {
           console.log('   ⚠️ Nenhum valor de faturamento encontrado');
         }

         // Resumo de sincronização
         console.log('\n📈 RESUMO DE SINCRONIZAÇÃO:');
         const totalRegistros = equipes.length + servicos.length + servicoHeaders.length + giServicos.length + historicoTurnos.length + valoresFaturamento.length;
         const registrosNaoSincronizados = [
           ...equipes.filter((e: any) => e.synced === 0),
           ...servicos.filter((s: any) => s.synced === 0),
           ...servicoHeaders.filter((h: any) => h.synced === 0),
           ...giServicos.filter((g: any) => g.synced === 0),
           ...historicoTurnos.filter((t: any) => t.synced === 0)
           // Valores de faturamento não têm campo synced, são sempre considerados sincronizados
         ].length;
         
         console.log(`   • Total de registros: ${totalRegistros}`);
         console.log(`   • Registros sincronizados: ${totalRegistros - registrosNaoSincronizados}`);
         console.log(`   • Registros pendentes: ${registrosNaoSincronizados}`);
         
         if (colaboradorMatricula) {
           console.log(`   • Filtro aplicado: Colaborador ${colaboradorMatricula}`);
         }
         
         console.log('\n📊 ===== FIM DOS DADOS DAS TABELAS =====\n');
         
       } catch (error) {
         console.error('❌ Erro ao exibir dados das tabelas locais:', error);
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

         // Sincronizar historico_turno_local
         const historicoTurnoToSync = await safeGetAllAsync(db,
           'SELECT * FROM historico_turno_local WHERE synced = 0'
         );

         for (const turno of historicoTurnoToSync as any[]) {
           const { error } = await supabase
             .from('historico_turno')
             .upsert({
               id: turno.id,
               colaborador_matricula: parseInt(turno.colaborador_matricula),
               equipe_prefixo: turno.equipe_prefixo,
               data_turno: turno.data_turno,
               hora_oper: turno.hora_oper,
             });

           if (!error) {
             await safeRunAsync(db,
               'UPDATE historico_turno_local SET synced = 1 WHERE id = ?',
               [turno.id]
             );
             console.log(`✅ Histórico de turno ID ${turno.id} sincronizado para servidor`);
           } else {
             console.error('Erro ao sincronizar histórico de turno:', turno.id, error);
           }
         }

         console.log('✅ Sincronização para servidor concluída com sucesso');
       } catch (error) {
         console.error('Erro na sincronização para servidor:', error);
       }
     }
   }

   export { SyncService };
