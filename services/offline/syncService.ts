import { supabase } from '../supabase';
   import { getLocalDatabase } from './database';
   
   class SyncService {
     // Sincronizar dados do servidor para local
     async syncFromServer() {
       try {
         // Buscar dados do Supabase
         const { data: colaboradores } = await supabase
           .from('colaboradores')
           .select('*');
         
         const { data: equipes } = await supabase
           .from('equipes')
           .select('*');
         
         // Inserir/atualizar no SQLite local
         const db = await getLocalDatabase();
         
         if (colaboradores) {
           for (const colaborador of colaboradores) {
             await db.runAsync(
               `INSERT OR REPLACE INTO colaboradores_local 
                (id, nome, funcao, matricula, supervisor_id, coordenador_id, synced) 
                VALUES (?, ?, ?, ?, ?, ?, 1)`,
               [colaborador.id, colaborador.nome, colaborador.funcao, 
                colaborador.matricula, colaborador.supervisor_id, colaborador.coordenador_id]
             );
           }
         }
         
         // Repetir para outras tabelas...
       } catch (error) {
         console.error('Erro na sincronização do servidor:', error);
       }
     }
     
     // Sincronizar dados locais para servidor
     async syncToServer() {
       try {
         const db = await getLocalDatabase();
         
         // Buscar registros não sincronizados
         const result = await db.getAllAsync(
           'SELECT * FROM servicos_local WHERE synced = 0'
         );
         
         for (const servico of result) {
           // Enviar para Supabase
           const { error } = await supabase
             .from('servicos')
             .upsert({
               id: servico.id,
               equipe_id: servico.equipe_id,
               data_planejada: servico.data_planejada,
               status: servico.status,
               // ... outros campos
             });
           
           if (!error) {
             // Marcar como sincronizado
             await db.runAsync(
               'UPDATE servicos_local SET synced = 1 WHERE id = ?',
               [servico.id]
             );
           }
         }
       } catch (error) {
         console.error('Erro na sincronização para servidor:', error);
       }
     }
   }

   export { SyncService };