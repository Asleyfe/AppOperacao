export class QueueService {
     // Adicionar operação à fila
     static async addOperation(type: string, table: string, recordId: string, data: any) {
       const db = getLocalDatabase();
       db.transaction(tx => {
         tx.executeSql(
           `INSERT INTO operation_queue (operation_type, table_name, record_id, data) 
            VALUES (?, ?, ?, ?)`,
           [type, table, recordId, JSON.stringify(data)]
         );
       });
     }
     
     // Processar fila quando online
     static async processQueue() {
       const db = getLocalDatabase();
       db.transaction(tx => {
         tx.executeSql(
           `SELECT * FROM operation_queue WHERE status = 'PENDING' ORDER BY created_at`,
           [],
           async (_, { rows }) => {
             for (let i = 0; i < rows.length; i++) {
               const operation = rows.item(i);
               await this.executeOperation(operation);
             }
           }
         );
       });
     }
     
     private static async executeOperation(operation: any) {
       try {
         const data = JSON.parse(operation.data);
         
         switch (operation.operation_type) {
           case 'UPDATE':
             await supabase
               .from(operation.table_name)
               .update(data)
               .eq('id', operation.record_id);
             break;
           case 'CREATE':
             await supabase
               .from(operation.table_name)
               .insert(data);
             break;
           // ... outros casos
         }
         
         // Marcar como sucesso
         this.updateOperationStatus(operation.id, 'SUCCESS');
       } catch (error) {
         // Incrementar tentativas
         this.incrementAttempts(operation.id);
       }
     }
   }