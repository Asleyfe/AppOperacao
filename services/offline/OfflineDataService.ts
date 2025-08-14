import { IDataService } from './IDaraService';
   import { getLocalDatabase } from './database';
   
   export class OfflineDataService implements IDataService {
     async getServicos(): Promise<any[]> {
       try {
         const db = await getLocalDatabase();
         const result = await db.getAllAsync(
           `SELECT s.*, e.nome as equipe_nome 
            FROM servicos_local s 
            LEFT JOIN equipes_local e ON s.equipe_id = e.id 
            WHERE DATE(s.data_planejada) = DATE('now')`
         );
         return result;
       } catch (error) {
         throw error;
       }
     }
     
     async updateServico(id: string, data: any): Promise<void> {
       try {
         const db = await getLocalDatabase();
         await db.runAsync(
           `UPDATE servicos_local 
            SET status = ?, inicio_execucao = ?, synced = 0, last_modified = CURRENT_TIMESTAMP 
            WHERE id = ?`,
           [data.status, data.inicio_execucao, id]
         );
       } catch (error) {
         throw error;
       }
     }
     
     // ... outras implementações
   }