/**
 * =====================================================
 * SERVIÇO DE AUTORIZAÇÃO OFFLINE
 * =====================================================
 * Data: 21 de agosto de 2025
 * Objetivo: Implementar regras de segurança RLS do PostgreSQL no SQLite offline
 * Uso: Controlar acesso a dados baseado em funções e hierarquia
 */

import { getLocalDatabase, safeGetFirstAsync, safeGetAllAsync } from './database';

// =====================================================
// INTERFACES DE AUTORIZAÇÃO
// =====================================================
export interface UserContext {
  matricula: number;
  funcao: string;
  nome: string;
  user_id?: string;
  supervisor_id?: number;
  coordenador_id?: number;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  context?: any;
}

export interface PermissionCheck {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  restrictions?: string[];
}

// =====================================================
// ENUMS DE FUNÇÕES E PERMISSÕES
// =====================================================
export enum UserRole {
  ADMIN = 'Admin',
  COORDENADOR = 'Coordenador',
  SUPERVISOR = 'Supervisor',
  ENCARREGADO = 'Encarregado',
  ELETRICISTA = 'Eletricista',
  MOTORISTA = 'Motorista'
}

export enum Permission {
  VIEW_ALL_COLABORADORES = 'view_all_colaboradores',
  EDIT_ALL_COLABORADORES = 'edit_all_colaboradores',
  VIEW_OWN_TEAM_COLABORADORES = 'view_own_team_colaboradores',
  VIEW_ALL_EQUIPES = 'view_all_equipes',
  EDIT_ALL_EQUIPES = 'edit_all_equipes',
  VIEW_OWN_EQUIPES = 'view_own_equipes',
  EDIT_OWN_EQUIPES = 'edit_own_equipes',
  VIEW_ALL_SERVICOS = 'view_all_servicos',
  EDIT_ALL_SERVICOS = 'edit_all_servicos',
  VIEW_OWN_SERVICOS = 'view_own_servicos',
  EDIT_OWN_SERVICOS = 'edit_own_servicos'
}

// =====================================================
// CLASSE PRINCIPAL DE AUTORIZAÇÃO
// =====================================================
export class OfflineAuthorizationService {
  
  // =====================================================
  // CACHE DE CONTEXTO DO USUÁRIO
  // =====================================================
  private static userContextCache: Map<number, UserContext> = new Map();
  private static cacheExpiry: Map<number, number> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // =====================================================
  // OBTER CONTEXTO DO USUÁRIO
  // =====================================================
  
  /**
   * Obter contexto completo do usuário
   */
  static async getUserContext(matricula: number): Promise<UserContext | null> {
    try {
      // Verificar cache
      const cached = this.userContextCache.get(matricula);
      const cacheTime = this.cacheExpiry.get(matricula);
      
      if (cached && cacheTime && Date.now() < cacheTime) {
        console.log('📋 [AUTH] Usando contexto do cache para matrícula:', matricula);
        return cached;
      }

      console.log('🔍 [AUTH] Buscando contexto do usuário:', matricula);
      const db = await getLocalDatabase();
      
      const user = await safeGetFirstAsync(db, `
        SELECT 
          matricula,
          nome,
          funcao,
          user_id,
          supervisor_id,
          coordenador_id
        FROM colaboradores_local 
        WHERE matricula = ?
      `, [matricula]);

      if (!user) {
        console.log('❌ [AUTH] Usuário não encontrado:', matricula);
        return null;
      }

      const context: UserContext = {
        matricula: user.matricula,
        funcao: user.funcao,
        nome: user.nome,
        user_id: user.user_id,
        supervisor_id: user.supervisor_id,
        coordenador_id: user.coordenador_id
      };

      // Atualizar cache
      this.userContextCache.set(matricula, context);
      this.cacheExpiry.set(matricula, Date.now() + this.CACHE_DURATION);

      console.log('✅ [AUTH] Contexto do usuário obtido:', context);
      return context;
    } catch (error) {
      console.error('❌ [AUTH] Erro ao obter contexto do usuário:', error);
      return null;
    }
  }

  /**
   * Limpar cache de contexto
   */
  static clearUserContextCache(matricula?: number): void {
    if (matricula) {
      this.userContextCache.delete(matricula);
      this.cacheExpiry.delete(matricula);
    } else {
      this.userContextCache.clear();
      this.cacheExpiry.clear();
    }
  }

  // =====================================================
  // VERIFICAÇÕES DE FUNÇÃO
  // =====================================================
  
  /**
   * Verificar se usuário é admin
   */
  static async isAdmin(matricula: number): Promise<boolean> {
    const context = await this.getUserContext(matricula);
    return context?.funcao === UserRole.ADMIN;
  }

  /**
   * Verificar se usuário é coordenador
   */
  static async isCoordenador(matricula: number): Promise<boolean> {
    const context = await this.getUserContext(matricula);
    return context?.funcao === UserRole.COORDENADOR;
  }

  /**
   * Verificar se usuário é supervisor
   */
  static async isSupervisor(matricula: number): Promise<boolean> {
    const context = await this.getUserContext(matricula);
    return context?.funcao === UserRole.SUPERVISOR;
  }

  /**
   * Verificar se usuário é encarregado
   */
  static async isEncarregado(matricula: number): Promise<boolean> {
    const context = await this.getUserContext(matricula);
    if (context?.funcao === UserRole.ENCARREGADO) return true;
    
    // Verificar se tem equipes sob sua responsabilidade
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db, 
        'SELECT 1 FROM equipes_local WHERE encarregado_matricula = ?', 
        [matricula]
      );
      return !!result;
    } catch (error) {
      console.error('❌ [AUTH] Erro ao verificar se é encarregado:', error);
      return false;
    }
  }

  /**
   * Verificar se usuário tem função administrativa
   */
  static async hasAdminRole(matricula: number): Promise<boolean> {
    const isAdm = await this.isAdmin(matricula);
    const isCoord = await this.isCoordenador(matricula);
    const isSuper = await this.isSupervisor(matricula);
    return isAdm || isCoord || isSuper;
  }

  // =====================================================
  // AUTORIZAÇÃO DE COLABORADORES
  // =====================================================
  
  /**
   * Verificar se pode ver colaborador específico
   */
  static async canViewColaborador(userMatricula: number, colaboradorMatricula: number): Promise<AuthorizationResult> {
    try {
      console.log('🔐 [AUTH] Verificando permissão para ver colaborador:', { userMatricula, colaboradorMatricula });
      
      // Admin, coordenador e supervisor podem ver todos
      if (await this.hasAdminRole(userMatricula)) {
        return { authorized: true, reason: 'Usuário tem função administrativa' };
      }

      // Pode ver a si mesmo
      if (userMatricula === colaboradorMatricula) {
        return { authorized: true, reason: 'Visualizando próprio perfil' };
      }

      // Encarregado pode ver colaboradores de suas equipes
      if (await this.isEncarregado(userMatricula)) {
        const canView = await this.isColaboradorInUserTeams(userMatricula, colaboradorMatricula);
        if (canView) {
          return { authorized: true, reason: 'Colaborador está em equipe do encarregado' };
        }
      }

      return { authorized: false, reason: 'Sem permissão para ver este colaborador' };
    } catch (error) {
      console.error('❌ [AUTH] Erro na verificação de permissão:', error);
      return { authorized: false, reason: 'Erro interno na verificação' };
    }
  }

  /**
   * Verificar se pode editar colaborador específico
   */
  static async canEditColaborador(userMatricula: number, colaboradorMatricula: number): Promise<AuthorizationResult> {
    try {
      // Admin e coordenador podem editar todos
      if (await this.isAdmin(userMatricula) || await this.isCoordenador(userMatricula)) {
        return { authorized: true, reason: 'Usuário tem permissão administrativa' };
      }

      // Supervisor pode editar colaboradores sob sua supervisão
      if (await this.isSupervisor(userMatricula)) {
        const isSupervised = await this.isColaboradorSupervised(userMatricula, colaboradorMatricula);
        if (isSupervised) {
          return { authorized: true, reason: 'Colaborador está sob supervisão do usuário' };
        }
      }

      // Pode editar a si mesmo (dados limitados)
      if (userMatricula === colaboradorMatricula) {
        return { 
          authorized: true, 
          reason: 'Editando próprio perfil',
          context: { limitedEdit: true }
        };
      }

      return { authorized: false, reason: 'Sem permissão para editar este colaborador' };
    } catch (error) {
      console.error('❌ [AUTH] Erro na verificação de permissão de edição:', error);
      return { authorized: false, reason: 'Erro interno na verificação' };
    }
  }

  /**
   * Obter colaboradores que o usuário pode ver
   */
  static async getViewableColaboradores(userMatricula: number): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      
      // Admin, coordenador e supervisor veem todos
      if (await this.hasAdminRole(userMatricula)) {
        return await safeGetAllAsync(db, 'SELECT * FROM colaboradores_local ORDER BY nome');
      }

      // Encarregado vê colaboradores de suas equipes + ele mesmo
      if (await this.isEncarregado(userMatricula)) {
        return await safeGetAllAsync(db, `
          SELECT DISTINCT c.* FROM colaboradores_local c
          WHERE c.matricula = ? -- Ele mesmo
          OR c.matricula IN (
            SELECT DISTINCT ce.colaborador_matricula 
            FROM composicao_equipe_local ce
            JOIN equipes_local e ON ce.equipe_id = e.id
            WHERE e.encarregado_matricula = ?
          )
          ORDER BY c.nome
        `, [userMatricula, userMatricula]);
      }

      // Outros usuários veem apenas a si mesmos
      return await safeGetAllAsync(db, 
        'SELECT * FROM colaboradores_local WHERE matricula = ?', 
        [userMatricula]
      );
    } catch (error) {
      console.error('❌ [AUTH] Erro ao obter colaboradores visíveis:', error);
      return [];
    }
  }

  // =====================================================
  // AUTORIZAÇÃO DE EQUIPES
  // =====================================================
  
  /**
   * Verificar se pode ver equipe específica
   */
  static async canViewEquipe(userMatricula: number, equipeId: number): Promise<AuthorizationResult> {
    try {
      // Admin, coordenador e supervisor podem ver todas
      if (await this.hasAdminRole(userMatricula)) {
        return { authorized: true, reason: 'Usuário tem função administrativa' };
      }

      // Encarregado pode ver suas próprias equipes
      const db = await getLocalDatabase();
      const equipe = await safeGetFirstAsync(db, 
        'SELECT encarregado_matricula FROM equipes_local WHERE id = ?', 
        [equipeId]
      );

      if (equipe && equipe.encarregado_matricula === userMatricula) {
        return { authorized: true, reason: 'Usuário é encarregado da equipe' };
      }

      // Colaborador pode ver equipes das quais faz parte
      const participacao = await safeGetFirstAsync(db, `
        SELECT 1 FROM composicao_equipe_local ce
        JOIN equipes_local e ON ce.equipe_id = e.id
        WHERE e.id = ? AND ce.colaborador_matricula = ?
      `, [equipeId, userMatricula]);

      if (participacao) {
        return { authorized: true, reason: 'Usuário faz parte da equipe' };
      }

      return { authorized: false, reason: 'Sem permissão para ver esta equipe' };
    } catch (error) {
      console.error('❌ [AUTH] Erro na verificação de permissão de equipe:', error);
      return { authorized: false, reason: 'Erro interno na verificação' };
    }
  }

  /**
   * Verificar se pode editar equipe específica
   */
  static async canEditEquipe(userMatricula: number, equipeId: number): Promise<AuthorizationResult> {
    try {
      // Admin e coordenador podem editar todas
      if (await this.isAdmin(userMatricula) || await this.isCoordenador(userMatricula)) {
        return { authorized: true, reason: 'Usuário tem permissão administrativa' };
      }

      // Encarregado pode editar suas próprias equipes
      const db = await getLocalDatabase();
      const equipe = await safeGetFirstAsync(db, 
        'SELECT encarregado_matricula FROM equipes_local WHERE id = ?', 
        [equipeId]
      );

      if (equipe && equipe.encarregado_matricula === userMatricula) {
        return { authorized: true, reason: 'Usuário é encarregado da equipe' };
      }

      return { authorized: false, reason: 'Sem permissão para editar esta equipe' };
    } catch (error) {
      console.error('❌ [AUTH] Erro na verificação de permissão de edição de equipe:', error);
      return { authorized: false, reason: 'Erro interno na verificação' };
    }
  }

  /**
   * Obter equipes que o usuário pode ver
   */
  static async getViewableEquipes(userMatricula: number, data?: string): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      let query = 'SELECT * FROM equipes_local';
      let params: any[] = [];
      
      // Admin, coordenador e supervisor veem todas
      if (await this.hasAdminRole(userMatricula)) {
        if (data) {
          query += ' WHERE data = ?';
          params.push(data);
        }
        query += ' ORDER BY prefixo';
        return await safeGetAllAsync(db, query, params);
      }

      // Encarregado vê suas equipes + equipes onde participa
      query = `
        SELECT DISTINCT e.* FROM equipes_local e
        WHERE e.encarregado_matricula = ? -- Suas equipes
        OR e.id IN (
          SELECT ce.equipe_id FROM composicao_equipe_local ce
          WHERE ce.colaborador_matricula = ? -- Equipes onde participa
        )
      `;
      params = [userMatricula, userMatricula];
      
      if (data) {
        query += ' AND e.data = ?';
        params.push(data);
      }
      
      query += ' ORDER BY e.prefixo';
      return await safeGetAllAsync(db, query, params);
    } catch (error) {
      console.error('❌ [AUTH] Erro ao obter equipes visíveis:', error);
      return [];
    }
  }

  // =====================================================
  // AUTORIZAÇÃO DE SERVIÇOS
  // =====================================================
  
  /**
   * Verificar se pode ver serviço específico
   */
  static async canViewServico(userMatricula: number, servicoId: string): Promise<AuthorizationResult> {
    try {
      // Admin, coordenador e supervisor podem ver todos
      if (await this.hasAdminRole(userMatricula)) {
        return { authorized: true, reason: 'Usuário tem função administrativa' };
      }

      // Verificar se o serviço pertence a uma equipe do usuário
      const db = await getLocalDatabase();
      const servico = await safeGetFirstAsync(db, `
        SELECT s.*, e.encarregado_matricula FROM servicos_local s
        JOIN equipes_local e ON s.equipe_id = e.id
        WHERE s.id = ?
      `, [servicoId]);

      if (!servico) {
        return { authorized: false, reason: 'Serviço não encontrado' };
      }

      // Encarregado pode ver serviços de suas equipes
      if (servico.encarregado_matricula === userMatricula) {
        return { authorized: true, reason: 'Usuário é encarregado da equipe do serviço' };
      }

      // Colaborador pode ver serviços de equipes onde participa
      const participacao = await safeGetFirstAsync(db, `
        SELECT 1 FROM composicao_equipe_local ce
        WHERE ce.equipe_id = ? AND ce.colaborador_matricula = ?
      `, [servico.equipe_id, userMatricula]);

      if (participacao) {
        return { authorized: true, reason: 'Usuário participa da equipe do serviço' };
      }

      return { authorized: false, reason: 'Sem permissão para ver este serviço' };
    } catch (error) {
      console.error('❌ [AUTH] Erro na verificação de permissão de serviço:', error);
      return { authorized: false, reason: 'Erro interno na verificação' };
    }
  }

  /**
   * Verificar se pode editar serviço específico
   */
  static async canEditServico(userMatricula: number, servicoId: string): Promise<AuthorizationResult> {
    try {
      // Admin e coordenador podem editar todos
      if (await this.isAdmin(userMatricula) || await this.isCoordenador(userMatricula)) {
        return { authorized: true, reason: 'Usuário tem permissão administrativa' };
      }

      // Verificar se o serviço pertence a uma equipe do usuário
      const db = await getLocalDatabase();
      const servico = await safeGetFirstAsync(db, `
        SELECT s.*, e.encarregado_matricula FROM servicos_local s
        JOIN equipes_local e ON s.equipe_id = e.id
        WHERE s.id = ?
      `, [servicoId]);

      if (!servico) {
        return { authorized: false, reason: 'Serviço não encontrado' };
      }

      // Encarregado pode editar serviços de suas equipes
      if (servico.encarregado_matricula === userMatricula) {
        return { authorized: true, reason: 'Usuário é encarregado da equipe do serviço' };
      }

      return { authorized: false, reason: 'Sem permissão para editar este serviço' };
    } catch (error) {
      console.error('❌ [AUTH] Erro na verificação de permissão de edição de serviço:', error);
      return { authorized: false, reason: 'Erro interno na verificação' };
    }
  }

  /**
   * Obter serviços que o usuário pode ver
   */
  static async getViewableServicos(userMatricula: number, data?: string): Promise<any[]> {
    try {
      const db = await getLocalDatabase();
      let query = 'SELECT s.* FROM servicos_local s JOIN equipes_local e ON s.equipe_id = e.id';
      let params: any[] = [];
      
      // Admin, coordenador e supervisor veem todos
      if (await this.hasAdminRole(userMatricula)) {
        if (data) {
          query += ' WHERE s.data_planejada = ?';
          params.push(data);
        }
        query += ' ORDER BY s.data_planejada, e.prefixo';
        return await safeGetAllAsync(db, query, params);
      }

      // Encarregado e colaboradores veem serviços de suas equipes
      query += `
        WHERE e.encarregado_matricula = ? -- Equipes do encarregado
        OR e.id IN (
          SELECT ce.equipe_id FROM composicao_equipe_local ce
          WHERE ce.colaborador_matricula = ? -- Equipes onde participa
        )
      `;
      params = [userMatricula, userMatricula];
      
      if (data) {
        query += ' AND s.data_planejada = ?';
        params.push(data);
      }
      
      query += ' ORDER BY s.data_planejada, e.prefixo';
      return await safeGetAllAsync(db, query, params);
    } catch (error) {
      console.error('❌ [AUTH] Erro ao obter serviços visíveis:', error);
      return [];
    }
  }

  // =====================================================
  // FUNÇÕES AUXILIARES
  // =====================================================
  
  /**
   * Verificar se colaborador está em equipes do usuário
   */
  private static async isColaboradorInUserTeams(userMatricula: number, colaboradorMatricula: number): Promise<boolean> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db, `
        SELECT 1 FROM composicao_equipe_local ce
        JOIN equipes_local e ON ce.equipe_id = e.id
        WHERE e.encarregado_matricula = ? AND ce.colaborador_matricula = ?
      `, [userMatricula, colaboradorMatricula]);
      
      return !!result;
    } catch (error) {
      console.error('❌ [AUTH] Erro ao verificar colaborador em equipes:', error);
      return false;
    }
  }

  /**
   * Verificar se colaborador está sob supervisão do usuário
   */
  private static async isColaboradorSupervised(supervisorMatricula: number, colaboradorMatricula: number): Promise<boolean> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db, 
        'SELECT 1 FROM colaboradores_local WHERE matricula = ? AND supervisor_id = ?', 
        [colaboradorMatricula, supervisorMatricula]
      );
      
      return !!result;
    } catch (error) {
      console.error('❌ [AUTH] Erro ao verificar supervisão:', error);
      return false;
    }
  }

  /**
   * Obter permissões completas do usuário
   */
  static async getUserPermissions(matricula: number): Promise<PermissionCheck> {
    const isAdm = await this.isAdmin(matricula);
    const isCoord = await this.isCoordenador(matricula);
    const isSuper = await this.isSupervisor(matricula);
    const isEnc = await this.isEncarregado(matricula);

    // Admin tem todas as permissões
    if (isAdm) {
      return {
        canView: true,
        canEdit: true,
        canDelete: true,
        canCreate: true
      };
    }

    // Coordenador tem quase todas as permissões
    if (isCoord) {
      return {
        canView: true,
        canEdit: true,
        canDelete: false, // Não pode deletar
        canCreate: true
      };
    }

    // Supervisor tem permissões limitadas
    if (isSuper) {
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canCreate: false,
        restrictions: ['Apenas colaboradores supervisionados']
      };
    }

    // Encarregado tem permissões de suas equipes
    if (isEnc) {
      return {
        canView: true,
        canEdit: true,
        canDelete: false,
        canCreate: false,
        restrictions: ['Apenas suas equipes e colaboradores']
      };
    }

    // Outros usuários têm permissões mínimas
    return {
      canView: true,
      canEdit: false,
      canDelete: false,
      canCreate: false,
      restrictions: ['Apenas próprios dados']
    };
  }

  // =====================================================
  // UTILITÁRIOS DE DEBUG
  // =====================================================
  
  /**
   * Obter informações de debug sobre autorização
   */
  static async getAuthDebugInfo(matricula: number): Promise<any> {
    const context = await this.getUserContext(matricula);
    const permissions = await this.getUserPermissions(matricula);
    
    return {
      context,
      permissions,
      roles: {
        isAdmin: await this.isAdmin(matricula),
        isCoordenador: await this.isCoordenador(matricula),
        isSupervisor: await this.isSupervisor(matricula),
        isEncarregado: await this.isEncarregado(matricula)
      },
      cacheInfo: {
        cached: this.userContextCache.has(matricula),
        cacheExpiry: this.cacheExpiry.get(matricula)
      }
    };
  }
}

// =====================================================
// EXPORTAÇÕES PARA FACILITAR USO
// =====================================================
export const canViewColaborador = OfflineAuthorizationService.canViewColaborador.bind(OfflineAuthorizationService);
export const canEditColaborador = OfflineAuthorizationService.canEditColaborador.bind(OfflineAuthorizationService);
export const canViewEquipe = OfflineAuthorizationService.canViewEquipe.bind(OfflineAuthorizationService);
export const canEditEquipe = OfflineAuthorizationService.canEditEquipe.bind(OfflineAuthorizationService);
export const canViewServico = OfflineAuthorizationService.canViewServico.bind(OfflineAuthorizationService);
export const canEditServico = OfflineAuthorizationService.canEditServico.bind(OfflineAuthorizationService);
export const getUserContext = OfflineAuthorizationService.getUserContext.bind(OfflineAuthorizationService);
export const getUserPermissions = OfflineAuthorizationService.getUserPermissions.bind(OfflineAuthorizationService);

/**
 * =====================================================
 * EXEMPLO DE USO:
 * =====================================================
 * 
 * import { OfflineAuthorizationService, canEditServico } from './OfflineAuthorizationService';
 * 
 * // Verificar se pode editar serviço
 * const result = await canEditServico(12345, 'servico-123');
 * if (!result.authorized) {
 *   console.error('Acesso negado:', result.reason);
 *   return;
 * }
 * 
 * // Obter serviços visíveis para o usuário
 * const servicos = await OfflineAuthorizationService.getViewableServicos(12345, '2025-08-21');
 * 
 * // Obter permissões do usuário
 * const permissions = await getUserPermissions(12345);
 * console.log('Permissões:', permissions);
 * =====================================================
 */