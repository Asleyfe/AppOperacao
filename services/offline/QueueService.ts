import { getLocalDatabase, safeRunAsync, safeGetAllAsync } from './database';
import { supabase } from '../supabase';

export class QueueService {
  // Adicionar operação à fila
  static async addOperation(type: string, table: string, recordId: string, data: any) {
    try {
      const db = await getLocalDatabase();
      await safeRunAsync(db,
        `INSERT INTO operation_queue (operation_type, table_name, record_id, data, status, created_at) 
         VALUES (?, ?, ?, ?, 'PENDING', datetime('now'))`,
        [type, table, recordId, JSON.stringify(data)]
      );
    } catch (error) {
      console.error('Erro ao adicionar operação à fila:', error);
    }
  }
  
  // Processar fila quando online
  static async processQueue() {
    try {
      const db = await getLocalDatabase();
      const operations = await safeGetAllAsync(db,
        `SELECT * FROM operation_queue WHERE status = 'PENDING' ORDER BY created_at`
      );
      
      for (const operation of operations) {
        await this.executeOperation(operation);
      }
    } catch (error) {
      console.error('Erro ao processar fila:', error);
    }
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
        await this.updateOperationStatus(operation.id, 'SUCCESS');
      } catch (error) {
        console.error('Erro ao executar operação:', error);
        // Incrementar tentativas
        await this.incrementAttempts(operation.id);
      }
    }
    
    private static async updateOperationStatus(operationId: string, status: string) {
      try {
        const db = await getLocalDatabase();
        await safeRunAsync(db,
          'UPDATE operation_queue SET status = ? WHERE id = ?',
          [status, operationId]
        );
      } catch (error) {
        console.error('Erro ao atualizar status da operação:', error);
      }
    }
    
    private static async incrementAttempts(operationId: string) {
      try {
        const db = await getLocalDatabase();
        await safeRunAsync(db,
          'UPDATE operation_queue SET attempts = attempts + 1 WHERE id = ?',
          [operationId]
        );
      } catch (error) {
        console.error('Erro ao incrementar tentativas:', error);
      }
    }
  }