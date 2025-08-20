export type ConflictStrategy = 'server_wins' | 'client_wins' | 'last_modified' | 'merge';

export interface ConflictResolution {
  resolvedData: any;
  strategy: ConflictStrategy;
  hasConflict: boolean;
  conflictFields?: string[];
}

export class ConflictResolver {
  resolveConflict(
    localData: any,
    serverData: any,
    strategy: ConflictStrategy = 'last_modified'
  ): ConflictResolution {
    const validStrategies: ConflictStrategy[] = ['server_wins', 'client_wins', 'last_modified', 'merge'];
    
    if (!validStrategies.includes(strategy)) {
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
    }

    const conflictFields = this.detectConflicts(localData, serverData);
    const hasConflict = conflictFields.length > 0;

    let resolvedData: any;

    switch (strategy) {
      case 'server_wins':
        resolvedData = { ...serverData };
        break;
      case 'client_wins':
        resolvedData = { ...localData };
        break;
      case 'last_modified':
        resolvedData = this.resolveByTimestamp(localData, serverData);
        break;
      case 'merge':
        resolvedData = this.mergeData(localData, serverData);
        break;
    }

    return {
      resolvedData,
      strategy,
      hasConflict,
      conflictFields: hasConflict ? conflictFields : undefined,
    };
  }

  detectConflicts(localData: any, serverData: any): any[] {
    const conflicts: any[] = [];
    const excludeFields = ['id', 'created_at', 'updated_at', 'last_modified'];
    const allKeys = new Set([...Object.keys(localData), ...Object.keys(serverData)]);

    for (const key of allKeys) {
      if (excludeFields.includes(key)) continue;
      
      const localValue = localData[key];
      const serverValue = serverData[key];
      
      if (localValue !== serverValue) {
        conflicts.push({
          field: key,
          localValue: localValue,
          serverValue: serverValue,
        });
      }
    }

    return conflicts;
  }

  private resolveByTimestamp(localData: any, serverData: any): any {
    const localTime = localData.updated_at || localData.last_modified;
    const serverTime = serverData.updated_at || serverData.last_modified;

    if (this.isNewer(localTime, serverTime)) {
      return { ...localData };
    } else {
      return { ...serverData };
    }
  }

  mergeData(localData: any, serverData: any): any {
    const merged = { ...serverData };
    
    // Merge strategy: prefer non-null local values for specific fields
    const preferLocalFields = ['observacoes', 'status'];
    
    // Add all local fields that don't exist in server
    for (const key in localData) {
      if (!(key in serverData)) {
        merged[key] = localData[key];
      }
    }
    
    // Override with local values for preferred fields
    for (const field of preferLocalFields) {
      if (localData[field] != null && localData[field] !== '') {
        merged[field] = localData[field];
      }
    }

    return merged;
  }

  isNewer(timestamp1: string | null, timestamp2: string | null): boolean {
    if (!timestamp1 && !timestamp2) return false;
    if (!timestamp1) return false;
    if (!timestamp2) return true;

    try {
      const date1 = new Date(timestamp1);
      const date2 = new Date(timestamp2);
      
      if (isNaN(date1.getTime()) && isNaN(date2.getTime())) return false;
      if (isNaN(date1.getTime())) return false;
      if (isNaN(date2.getTime())) return true;
      
      return date1 > date2;
    } catch {
      return false;
    }
  }

  static async logConflict(conflict: any) {
    // Salvar log do conflito para auditoria
    const { getLocalDatabase, safeRunAsync } = await import('./database'); // Import dynamically to avoid circular dependency
    const db = await getLocalDatabase();
    try {
      await safeRunAsync(db,
        `CREATE TABLE IF NOT EXISTS conflict_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          resolution TEXT NOT NULL,
          local_data TEXT,
          remote_data TEXT,
          resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      );

      await safeRunAsync(db,
        `INSERT INTO conflict_log (table_name, record_id, resolution, local_data, remote_data, resolved_at) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          conflict.tableName,
          conflict.recordId,
          conflict.resolution,
          JSON.stringify(conflict.loser),
          JSON.stringify(conflict.winner),
          new Date().toISOString()
        ]
      );
      console.log('Conflito logado com sucesso:', conflict);
    } catch (error) {
      console.error('Erro ao logar conflito:', error);
    }
  }
}
