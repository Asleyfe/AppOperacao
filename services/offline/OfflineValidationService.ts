/**
 * =====================================================
 * SERVIÇO DE VALIDAÇÃO OFFLINE
 * =====================================================
 * Data: 21 de agosto de 2025
 * Objetivo: Implementar validações que simulem CHECK constraints do PostgreSQL
 * Uso: Validar dados antes de inserir/atualizar no SQLite offline
 */

import { getLocalDatabase, safeGetFirstAsync, safeGetAllAsync } from './database';

// =====================================================
// INTERFACES DE VALIDAÇÃO
// =====================================================
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface EquipeData {
  id?: number;
  data: string;
  prefixo: string;
  tipo_equipe?: string;
  status_composicao?: string;
  encarregado_matricula: number;
}

export interface ServicoData {
  id?: string;
  equipe_id: number;
  data_planejada: string;
  descricao: string;
  status?: string;
  equipe_prefixo?: string;
  nota?: string;
  inicio_deslocamento?: string;
  fim_deslocamento?: string;
  inicio_execucao?: string;
  fim_execucao?: string;
}

export interface ColaboradorData {
  id?: number;
  nome: string;
  funcao: string;
  matricula: number;
  user_id?: string;
  supervisor_id?: number;
  coordenador_id?: number;
}

// =====================================================
// CLASSE PRINCIPAL DE VALIDAÇÃO
// =====================================================
export class OfflineValidationService {
  
  // =====================================================
  // CONSTANTES DE VALIDAÇÃO
  // =====================================================
  private static readonly VALID_EQUIPE_TIPOS = ['LV', 'LM', 'PODA', 'LM LEVE'];
  private static readonly VALID_EQUIPE_STATUS = ['Pendente', 'Aprovada', 'Rejeitada'];
  private static readonly VALID_SERVICO_STATUS = [
    'Planejado', 
    'Em Deslocamento', 
    'Aguardando Execução', 
    'Em Execução', 
    'Finalizado'
  ];
  private static readonly VALID_GISERVICO_STATUS = ['Instalado', 'Retirado'];
  private static readonly VALID_FUNCOES = [
    'Encarregado', 
    'Eletricista', 
    'Motorista', 
    'Coordenador', 
    'Supervisor'
  ];

  // =====================================================
  // VALIDAÇÕES BÁSICAS
  // =====================================================
  
  /**
   * Validar tipo de equipe
   */
  static validateTipoEquipe(tipo: string): boolean {
    return this.VALID_EQUIPE_TIPOS.includes(tipo);
  }

  /**
   * Validar status de equipe
   */
  static validateEquipeStatus(status: string): boolean {
    return this.VALID_EQUIPE_STATUS.includes(status);
  }

  /**
   * Validar status de serviço
   */
  static validateServicoStatus(status: string): boolean {
    return this.VALID_SERVICO_STATUS.includes(status);
  }

  /**
   * Validar função de colaborador
   */
  static validateFuncao(funcao: string): boolean {
    return this.VALID_FUNCOES.includes(funcao);
  }

  /**
   * Validar formato de data
   */
  static validateDate(dateString: string): boolean {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Validar formato de timestamp
   */
  static validateTimestamp(timestampString: string): boolean {
    if (!timestampString) return true; // Opcional
    const timestamp = new Date(timestampString);
    return timestamp instanceof Date && !isNaN(timestamp.getTime());
  }

  /**
   * Validar matrícula (deve ser número positivo)
   */
  static validateMatricula(matricula: number): boolean {
    return Number.isInteger(matricula) && matricula > 0;
  }

  /**
   * Validar prefixo de equipe (formato: LETRA + NÚMEROS)
   */
  static validatePrefixo(prefixo: string): boolean {
    if (!prefixo || prefixo.trim().length === 0) return false;
    // Formato esperado: A123, B456, etc.
    const regex = /^[A-Z]\d{1,4}$/;
    return regex.test(prefixo.trim().toUpperCase());
  }

  // =====================================================
  // VALIDAÇÕES COMPLEXAS COM BANCO DE DADOS
  // =====================================================

  /**
   * Verificar se matrícula de colaborador existe
   */
  static async validateColaboradorExists(matricula: number): Promise<boolean> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db, 
        'SELECT 1 FROM colaboradores_local WHERE matricula = ?', 
        [matricula]
      );
      return !!result;
    } catch (error) {
      console.error('❌ [VALIDATION] Erro ao verificar colaborador:', error);
      return false;
    }
  }

  /**
   * Verificar se prefixo de equipe já existe (para data específica)
   */
  static async validatePrefixoUnique(prefixo: string, data: string, excludeId?: number): Promise<boolean> {
    try {
      const db = await getLocalDatabase();
      let query = 'SELECT 1 FROM equipes_local WHERE prefixo = ? AND data = ?';
      let params: any[] = [prefixo, data];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const result = await safeGetFirstAsync(db, query, params);
      return !result; // Retorna true se NÃO encontrou (é único)
    } catch (error) {
      console.error('❌ [VALIDATION] Erro ao verificar unicidade do prefixo:', error);
      return false;
    }
  }

  /**
   * Verificar se equipe existe
   */
  static async validateEquipeExists(equipeId: number): Promise<boolean> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db, 
        'SELECT 1 FROM equipes_local WHERE id = ?', 
        [equipeId]
      );
      return !!result;
    } catch (error) {
      console.error('❌ [VALIDATION] Erro ao verificar equipe:', error);
      return false;
    }
  }

  /**
   * Verificar se colaborador pode ser encarregado (tem função adequada)
   */
  static async validateEncarregadoElegible(matricula: number): Promise<boolean> {
    try {
      const db = await getLocalDatabase();
      const result = await safeGetFirstAsync(db, 
        'SELECT funcao FROM colaboradores_local WHERE matricula = ?', 
        [matricula]
      );
      
      if (!result) return false;
      
      // Funções que podem ser encarregado
      const funcoesEncarregado = ['Encarregado', 'Coordenador', 'Supervisor'];
      return funcoesEncarregado.includes(result.funcao);
    } catch (error) {
      console.error('❌ [VALIDATION] Erro ao verificar elegibilidade de encarregado:', error);
      return false;
    }
  }

  // =====================================================
  // VALIDAÇÃO DE EQUIPE
  // =====================================================
  
  /**
   * Validar dados completos de equipe
   */
  static async validateEquipe(equipe: EquipeData): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔍 [VALIDATION] Validando equipe:', equipe);

    // Validações obrigatórias
    if (!equipe.data) {
      errors.push('Campo "data" é obrigatório');
    } else if (!this.validateDate(equipe.data)) {
      errors.push('Campo "data" deve ter formato de data válido');
    }

    if (!equipe.prefixo || equipe.prefixo.trim().length === 0) {
      errors.push('Campo "prefixo" é obrigatório');
    } else if (!this.validatePrefixo(equipe.prefixo)) {
      errors.push('Campo "prefixo" deve ter formato válido (ex: A123)');
    }

    if (!equipe.encarregado_matricula) {
      errors.push('Campo "encarregado_matricula" é obrigatório');
    } else if (!this.validateMatricula(equipe.encarregado_matricula)) {
      errors.push('Campo "encarregado_matricula" deve ser um número positivo');
    }

    // Validações de valores permitidos
    const tipoEquipe = equipe.tipo_equipe || 'LV';
    if (!this.validateTipoEquipe(tipoEquipe)) {
      errors.push(`Tipo de equipe "${tipoEquipe}" inválido. Valores permitidos: ${this.VALID_EQUIPE_TIPOS.join(', ')}`);
    }

    const statusComposicao = equipe.status_composicao || 'Pendente';
    if (!this.validateEquipeStatus(statusComposicao)) {
      errors.push(`Status de composição "${statusComposicao}" inválido. Valores permitidos: ${this.VALID_EQUIPE_STATUS.join(', ')}`);
    }

    // Validações assíncronas (se não há erros críticos)
    if (errors.length === 0) {
      // Verificar se encarregado existe
      const encarregadoExists = await this.validateColaboradorExists(equipe.encarregado_matricula);
      if (!encarregadoExists) {
        errors.push(`Colaborador com matrícula ${equipe.encarregado_matricula} não encontrado`);
      } else {
        // Verificar se pode ser encarregado
        const canBeEncarregado = await this.validateEncarregadoElegible(equipe.encarregado_matricula);
        if (!canBeEncarregado) {
          warnings.push(`Colaborador com matrícula ${equipe.encarregado_matricula} pode não ter função adequada para ser encarregado`);
        }
      }

      // Verificar unicidade do prefixo
      if (equipe.prefixo && equipe.data) {
        const prefixoUnique = await this.validatePrefixoUnique(equipe.prefixo, equipe.data, equipe.id);
        if (!prefixoUnique) {
          errors.push(`Prefixo "${equipe.prefixo}" já existe para a data ${equipe.data}`);
        }
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    console.log('✅ [VALIDATION] Resultado da validação de equipe:', result);
    return result;
  }

  // =====================================================
  // VALIDAÇÃO DE SERVIÇO
  // =====================================================
  
  /**
   * Validar dados completos de serviço
   */
  static async validateServico(servico: ServicoData): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔍 [VALIDATION] Validando serviço:', servico);

    // Validações obrigatórias
    if (!servico.equipe_id) {
      errors.push('Campo "equipe_id" é obrigatório');
    }

    if (!servico.data_planejada) {
      errors.push('Campo "data_planejada" é obrigatório');
    } else if (!this.validateDate(servico.data_planejada)) {
      errors.push('Campo "data_planejada" deve ter formato de data válido');
    }

    if (!servico.descricao || servico.descricao.trim().length === 0) {
      errors.push('Campo "descricao" é obrigatório');
    } else if (servico.descricao.trim().length < 10) {
      warnings.push('Descrição muito curta (menos de 10 caracteres)');
    }

    // Validações de valores permitidos
    const status = servico.status || 'Planejado';
    if (!this.validateServicoStatus(status)) {
      errors.push(`Status "${status}" inválido. Valores permitidos: ${this.VALID_SERVICO_STATUS.join(', ')}`);
    }

    // Validações de timestamps
    if (servico.inicio_deslocamento && !this.validateTimestamp(servico.inicio_deslocamento)) {
      errors.push('Campo "inicio_deslocamento" deve ter formato de timestamp válido');
    }

    if (servico.fim_deslocamento && !this.validateTimestamp(servico.fim_deslocamento)) {
      errors.push('Campo "fim_deslocamento" deve ter formato de timestamp válido');
    }

    if (servico.inicio_execucao && !this.validateTimestamp(servico.inicio_execucao)) {
      errors.push('Campo "inicio_execucao" deve ter formato de timestamp válido');
    }

    if (servico.fim_execucao && !this.validateTimestamp(servico.fim_execucao)) {
      errors.push('Campo "fim_execucao" deve ter formato de timestamp válido');
    }

    // Validações de lógica de negócio
    if (servico.inicio_deslocamento && servico.fim_deslocamento) {
      const inicio = new Date(servico.inicio_deslocamento);
      const fim = new Date(servico.fim_deslocamento);
      if (inicio >= fim) {
        errors.push('Início do deslocamento deve ser anterior ao fim do deslocamento');
      }
    }

    if (servico.inicio_execucao && servico.fim_execucao) {
      const inicio = new Date(servico.inicio_execucao);
      const fim = new Date(servico.fim_execucao);
      if (inicio >= fim) {
        errors.push('Início da execução deve ser anterior ao fim da execução');
      }
    }

    // Validações assíncronas (se não há erros críticos)
    if (errors.length === 0 && servico.equipe_id) {
      const equipeExists = await this.validateEquipeExists(servico.equipe_id);
      if (!equipeExists) {
        errors.push(`Equipe com ID ${servico.equipe_id} não encontrada`);
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    console.log('✅ [VALIDATION] Resultado da validação de serviço:', result);
    return result;
  }

  // =====================================================
  // VALIDAÇÃO DE COLABORADOR
  // =====================================================
  
  /**
   * Validar dados completos de colaborador
   */
  static async validateColaborador(colaborador: ColaboradorData): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔍 [VALIDATION] Validando colaborador:', colaborador);

    // Validações obrigatórias
    if (!colaborador.nome || colaborador.nome.trim().length === 0) {
      errors.push('Campo "nome" é obrigatório');
    } else if (colaborador.nome.trim().length < 2) {
      errors.push('Campo "nome" deve ter pelo menos 2 caracteres');
    }

    if (!colaborador.funcao || colaborador.funcao.trim().length === 0) {
      errors.push('Campo "funcao" é obrigatório');
    } else if (!this.validateFuncao(colaborador.funcao)) {
      errors.push(`Função "${colaborador.funcao}" inválida. Valores permitidos: ${this.VALID_FUNCOES.join(', ')}`);
    }

    if (!colaborador.matricula) {
      errors.push('Campo "matricula" é obrigatório');
    } else if (!this.validateMatricula(colaborador.matricula)) {
      errors.push('Campo "matricula" deve ser um número positivo');
    }

    // Validações de referências
    if (colaborador.supervisor_id && !this.validateMatricula(colaborador.supervisor_id)) {
      errors.push('Campo "supervisor_id" deve ser um número positivo válido');
    }

    if (colaborador.coordenador_id && !this.validateMatricula(colaborador.coordenador_id)) {
      errors.push('Campo "coordenador_id" deve ser um número positivo válido');
    }

    // Validação de lógica: colaborador não pode ser supervisor de si mesmo
    if (colaborador.supervisor_id === colaborador.matricula) {
      errors.push('Colaborador não pode ser supervisor de si mesmo');
    }

    if (colaborador.coordenador_id === colaborador.matricula) {
      errors.push('Colaborador não pode ser coordenador de si mesmo');
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    console.log('✅ [VALIDATION] Resultado da validação de colaborador:', result);
    return result;
  }

  // =====================================================
  // VALIDAÇÕES UTILITÁRIAS
  // =====================================================
  
  /**
   * Validar múltiplos objetos de uma vez
   */
  static async validateBatch<T>(
    items: T[], 
    validator: (item: T) => Promise<ValidationResult>
  ): Promise<{ valid: boolean; results: ValidationResult[]; totalErrors: number }> {
    const results: ValidationResult[] = [];
    let totalErrors = 0;

    for (const item of items) {
      const result = await validator(item);
      results.push(result);
      totalErrors += result.errors.length;
    }

    return {
      valid: totalErrors === 0,
      results,
      totalErrors
    };
  }

  /**
   * Obter resumo de validação
   */
  static getValidationSummary(result: ValidationResult): string {
    if (result.valid) {
      const warningText = result.warnings && result.warnings.length > 0 
        ? ` (${result.warnings.length} avisos)` 
        : '';
      return `✅ Validação passou${warningText}`;
    } else {
      return `❌ Validação falhou: ${result.errors.length} erros`;
    }
  }

  /**
   * Formatar erros para exibição
   */
  static formatErrors(result: ValidationResult): string {
    const lines: string[] = [];
    
    if (result.errors.length > 0) {
      lines.push('❌ ERROS:');
      result.errors.forEach((error, index) => {
        lines.push(`  ${index + 1}. ${error}`);
      });
    }
    
    if (result.warnings && result.warnings.length > 0) {
      lines.push('⚠️ AVISOS:');
      result.warnings.forEach((warning, index) => {
        lines.push(`  ${index + 1}. ${warning}`);
      });
    }
    
    return lines.join('\n');
  }
}

// =====================================================
// EXPORTAÇÕES PARA FACILITAR USO
// =====================================================
export const validateEquipe = OfflineValidationService.validateEquipe.bind(OfflineValidationService);
export const validateServico = OfflineValidationService.validateServico.bind(OfflineValidationService);
export const validateColaborador = OfflineValidationService.validateColaborador.bind(OfflineValidationService);

// Constantes exportadas
export const VALID_EQUIPE_TIPOS = ['LV', 'LM', 'PODA', 'LM LEVE'];
export const VALID_EQUIPE_STATUS = ['Pendente', 'Aprovada', 'Rejeitada'];
export const VALID_SERVICO_STATUS = [
  'Planejado', 
  'Em Deslocamento', 
  'Aguardando Execução', 
  'Em Execução', 
  'Finalizado'
];
export const VALID_FUNCOES = [
  'Encarregado', 
  'Eletricista', 
  'Motorista', 
  'Coordenador', 
  'Supervisor'
];

/**
 * =====================================================
 * EXEMPLO DE USO:
 * =====================================================
 * 
 * import { OfflineValidationService, validateEquipe } from './OfflineValidationService';
 * 
 * // Validar equipe
 * const equipeData = {
 *   data: '2025-08-21',
 *   prefixo: 'A123',
 *   tipo_equipe: 'LV',
 *   status_composicao: 'Pendente',
 *   encarregado_matricula: 12345
 * };
 * 
 * const result = await validateEquipe(equipeData);
 * if (!result.valid) {
 *   console.error('Erros de validação:', result.errors);
 *   return;
 * }
 * 
 * // Prosseguir com inserção/atualização
 * =====================================================
 */