import { ConflictResolver } from '../services/offline/ConflictResolver';

describe('ConflictResolver', () => {
  let conflictResolver: ConflictResolver;

  beforeEach(() => {
    conflictResolver = new ConflictResolver();
  });

  describe('resolveConflict', () => {
    it('should resolve conflict using server wins strategy', () => {
      const localData = {
        id: 1,
        nome: 'Local Name',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const serverData = {
        id: 1,
        nome: 'Server Name',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const result = conflictResolver.resolveConflict(
        localData,
        serverData,
        'server_wins'
      );

      expect(result.resolvedData).toEqual(serverData);
      expect(result.strategy).toBe('server_wins');
      expect(result.hasConflict).toBe(true);
    });

    it('should resolve conflict using client wins strategy', () => {
      const localData = {
        id: 1,
        nome: 'Local Name',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const serverData = {
        id: 1,
        nome: 'Server Name',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const result = conflictResolver.resolveConflict(
        localData,
        serverData,
        'client_wins'
      );

      expect(result.resolvedData).toEqual(localData);
      expect(result.strategy).toBe('client_wins');
      expect(result.hasConflict).toBe(true);
    });

    it('should resolve conflict using last_modified strategy with server newer', () => {
      const localData = {
        id: 1,
        nome: 'Local Name',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const serverData = {
        id: 1,
        nome: 'Server Name',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const result = conflictResolver.resolveConflict(
        localData,
        serverData,
        'last_modified'
      );

      expect(result.resolvedData).toEqual(serverData);
      expect(result.strategy).toBe('last_modified');
      expect(result.hasConflict).toBe(true);
    });

    it('should resolve conflict using last_modified strategy with local newer', () => {
      const localData = {
        id: 1,
        nome: 'Local Name',
        updated_at: '2024-01-01T12:00:00Z',
      };

      const serverData = {
        id: 1,
        nome: 'Server Name',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const result = conflictResolver.resolveConflict(
        localData,
        serverData,
        'last_modified'
      );

      expect(result.resolvedData).toEqual(localData);
      expect(result.strategy).toBe('last_modified');
      expect(result.hasConflict).toBe(true);
    });

    it('should resolve conflict using merge strategy', () => {
      const localData = {
        id: 1,
        nome: 'Local Name',
        observacoes: 'Local observations',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const serverData = {
        id: 1,
        nome: 'Server Name',
        status: 'Finalizado',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const result = conflictResolver.resolveConflict(
        localData,
        serverData,
        'merge'
      );

      expect(result.resolvedData).toEqual({
        id: 1,
        nome: 'Server Name', // Server wins for conflicting fields
        observacoes: 'Local observations', // Local field preserved
        status: 'Finalizado', // Server field preserved
        updated_at: '2024-01-01T11:00:00Z', // Latest timestamp
      });
      expect(result.strategy).toBe('merge');
      expect(result.hasConflict).toBe(true);
    });

    it('should handle no conflict when data is identical', () => {
      const localData = {
        id: 1,
        nome: 'Same Name',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const serverData = {
        id: 1,
        nome: 'Same Name',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const result = conflictResolver.resolveConflict(
        localData,
        serverData,
        'last_modified'
      );

      expect(result.resolvedData).toEqual(localData);
      expect(result.hasConflict).toBe(false);
    });

    it('should handle missing updated_at fields in last_modified strategy', () => {
      const localData = {
        id: 1,
        nome: 'Local Name',
      };

      const serverData = {
        id: 1,
        nome: 'Server Name',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const result = conflictResolver.resolveConflict(
        localData,
        serverData,
        'last_modified'
      );

      expect(result.resolvedData).toEqual(serverData);
      expect(result.hasConflict).toBe(true);
    });

    it('should throw error for unknown strategy', () => {
      const localData = { id: 1, nome: 'Local' };
      const serverData = { id: 1, nome: 'Server' };

      expect(() => {
        conflictResolver.resolveConflict(
          localData,
          serverData,
          'unknown_strategy' as any
        );
      }).toThrow('Unknown conflict resolution strategy: unknown_strategy');
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts in different fields', () => {
      const localData = {
        id: 1,
        nome: 'Local Name',
        status: 'Em Andamento',
        observacoes: 'Local obs',
      };

      const serverData = {
        id: 1,
        nome: 'Server Name',
        status: 'Finalizado',
        observacoes: 'Local obs',
      };

      const conflicts = conflictResolver.detectConflicts(localData, serverData);

      expect(conflicts).toEqual([
        {
          field: 'nome',
          localValue: 'Local Name',
          serverValue: 'Server Name',
        },
        {
          field: 'status',
          localValue: 'Em Andamento',
          serverValue: 'Finalizado',
        },
      ]);
    });

    it('should return empty array when no conflicts', () => {
      const localData = {
        id: 1,
        nome: 'Same Name',
        status: 'Same Status',
      };

      const serverData = {
        id: 1,
        nome: 'Same Name',
        status: 'Same Status',
      };

      const conflicts = conflictResolver.detectConflicts(localData, serverData);

      expect(conflicts).toEqual([]);
    });

    it('should handle null and undefined values', () => {
      const localData = {
        id: 1,
        nome: 'Name',
        observacoes: null,
        status: undefined,
      };

      const serverData = {
        id: 1,
        nome: 'Name',
        observacoes: 'Server obs',
        status: 'Finalizado',
      };

      const conflicts = conflictResolver.detectConflicts(localData, serverData);

      expect(conflicts).toEqual([
        {
          field: 'observacoes',
          localValue: null,
          serverValue: 'Server obs',
        },
        {
          field: 'status',
          localValue: undefined,
          serverValue: 'Finalizado',
        },
      ]);
    });

    it('should handle different object structures', () => {
      const localData = {
        id: 1,
        nome: 'Name',
        localField: 'Local only',
      };

      const serverData = {
        id: 1,
        nome: 'Name',
        serverField: 'Server only',
      };

      const conflicts = conflictResolver.detectConflicts(localData, serverData);

      expect(conflicts).toEqual([
        {
          field: 'localField',
          localValue: 'Local only',
          serverValue: undefined,
        },
        {
          field: 'serverField',
          localValue: undefined,
          serverValue: 'Server only',
        },
      ]);
    });
  });

  describe('mergeData', () => {
    it('should merge data with server precedence for conflicts', () => {
      const localData = {
        id: 1,
        nome: 'Local Name',
        observacoes: 'Local obs',
        localField: 'Local only',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const serverData = {
        id: 1,
        nome: 'Server Name',
        status: 'Finalizado',
        serverField: 'Server only',
        updated_at: '2024-01-01T11:00:00Z',
      };

      const merged = conflictResolver.mergeData(localData, serverData);

      expect(merged).toEqual({
        id: 1,
        nome: 'Server Name', // Server wins
        observacoes: 'Local obs', // Local preserved
        localField: 'Local only', // Local preserved
        status: 'Finalizado', // Server preserved
        serverField: 'Server only', // Server preserved
        updated_at: '2024-01-01T11:00:00Z', // Latest
      });
    });

    it('should handle empty objects', () => {
      const localData = {};
      const serverData = { id: 1, nome: 'Server' };

      const merged = conflictResolver.mergeData(localData, serverData);

      expect(merged).toEqual({ id: 1, nome: 'Server' });
    });

    it('should handle null values', () => {
      const localData = { id: 1, nome: null, observacoes: 'Local' };
      const serverData = { id: 1, nome: 'Server', status: null };

      const merged = conflictResolver.mergeData(localData, serverData);

      expect(merged).toEqual({
        id: 1,
        nome: 'Server',
        observacoes: 'Local',
        status: null,
      });
    });
  });

  describe('isNewer', () => {
    it('should return true when first timestamp is newer', () => {
      const newer = '2024-01-01T12:00:00Z';
      const older = '2024-01-01T10:00:00Z';

      const result = conflictResolver.isNewer(newer, older);

      expect(result).toBe(true);
    });

    it('should return false when first timestamp is older', () => {
      const older = '2024-01-01T10:00:00Z';
      const newer = '2024-01-01T12:00:00Z';

      const result = conflictResolver.isNewer(older, newer);

      expect(result).toBe(false);
    });

    it('should return false when timestamps are equal', () => {
      const timestamp = '2024-01-01T10:00:00Z';

      const result = conflictResolver.isNewer(timestamp, timestamp);

      expect(result).toBe(false);
    });

    it('should handle invalid timestamps', () => {
      const valid = '2024-01-01T10:00:00Z';
      const invalid = 'invalid-date';

      const result1 = conflictResolver.isNewer(valid, invalid);
      const result2 = conflictResolver.isNewer(invalid, valid);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should handle null/undefined timestamps', () => {
      const valid = '2024-01-01T10:00:00Z';

      const result1 = conflictResolver.isNewer(valid, null);
      const result2 = conflictResolver.isNewer(null, valid);
      const result3 = conflictResolver.isNewer(null, null);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });
  });
});