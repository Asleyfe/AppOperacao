export interface Colaborador {
  id: number;
  nome: string;
  funcao: string;
  matricula: number; // Alterado para number (INTEGER) - matrículas numéricas de 4-5 dígitos
}

export interface ComposicaoEquipe {
  colaboradorMatricula: number; // Usando matrícula numérica diretamente
}

export interface Equipe {
  id: number;
  prefixo: string;
  data: string;
  encarregadoMatricula: number; // Usando matrícula numérica (INTEGER) diretamente
  composicao: ComposicaoEquipe[];
  statusComposicao: 'Pendente' | 'Aprovada' | 'Rejeitada';
}

export interface Servico {
  id: number; // Alterado de string para number (INTEGER SERIAL)
  nota?: string; // ID do serviço que pode se repetir
  equipeId: number;
  equipePrefixo?: string; // Prefixo da equipe
  dataPlanejada: string; // Data de execução
  descricao: string; // Tipo da nota
  status: 'Planejado' | 'Em Deslocamento' | 'Aguardando Execução' | 'Em Execução' | 'Finalizado';
  // checklistId removido - substituído pelo sistema GIservico
  // Campos hierárquicos para filtragem no frontend (usando matrículas)
  encarregadoId?: number;
  supervisorId?: number;
  coordenadorId?: number;
  encarregadoFuncao?: string;
  timestamps: {
    inicioDeslocamento: string | null;
    fimDeslocamento: string | null;
    inicioExecucao: string | null;
    fimExecucao: string | null;
  };
}

// Interfaces do sistema de checklist removidas - substituídas pelo sistema GIservico
// Mantidas apenas para compatibilidade durante a migração

// Interface para controle de itens por serviço (substitui checklist)
export interface GIServico {
  id?: number;
  id_servico: number; // FK para servicos.id
  id_item: number; // FK para grupo_itens.id
  n_serie?: string | null; // Número de série do item (pode ser string ou null)
  status: 'Instalado' | 'Retirado';
  quantidade: number; // Campo de quantidade (obrigatório)
  prefixo?: string; // FK para equipes.prefixo
  created_at?: string;
  // Campos relacionados (joins)
  item?: GrupoItem; // Dados relacionados quando fazer joins
  servico?: Servico; // Dados do serviço quando fazer join
  equipe?: Equipe; // Dados da equipe quando fazer join
}

// =====================================================
// INTERFACES PARA SISTEMA DE FATURAMENTO
// =====================================================

export interface ValorFaturamento {
  id?: number;
  grupo: string;
  item: string;
  status: 'Instalado' | 'Retirado';
  tipo_servico: 'Normal' | 'Substituição' | 'Com_Aparelhagem' | 'Sem_Aparelhagem';
  valor_unitario: number;
  unidade?: string;
  ativo: boolean;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FaturamentoServico {
  id?: number;
  servico_id: number;
  equipe_prefixo?: string;
  data_execucao?: string;
  valor_total_instalado: number;
  valor_total_retirado: number;
  valor_total_geral: number;
  quantidade_itens_instalados: number;
  quantidade_itens_retirados: number;
  quantidade_itens_total: number;
  status_faturamento: 'Pendente' | 'Calculado' | 'Faturado';
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
  // Dados relacionados quando fazer joins
  servico?: Servico;
  equipe?: Equipe;
}

export interface DetalheFaturamento {
  id?: number;
  faturamento_servico_id: number;
  giservico_id: number;
  grupo: string;
  item: string;
  status: 'Instalado' | 'Retirado';
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  unidade?: string;
  n_serie?: string;
  created_at?: string;
  // Dados relacionados quando fazer joins
  faturamento_servico?: FaturamentoServico;
  giservico?: GIServico;
}

export interface ResumoFaturamento {
  periodo: string;
  total_servicos: number;
  total_itens_instalados: number;
  total_itens_retirados: number;
  valor_total_instalado: number;
  valor_total_retirado: number;
  valor_total_geral: number;
  servicos_pendentes: number;
  servicos_calculados: number;
  servicos_faturados: number;
}

export interface FaturamentoEquipe {
  equipe_prefixo: string;
  total_servicos: number;
  valor_total: number;
  quantidade_itens: number;
}

export interface FaturamentoGrupo {
  grupo: string;
  total_instalados: number;
  total_retirados: number;
  valor_instalados: number;
  valor_retirados: number;
  valor_total: number;
}

// Interface ChecklistCompleto removida - substituída pelo sistema GIservico

export interface GrupoItem {
  id: number;
  grupo: string;
  item: string;
  unidade?: string;
  created_at?: string;
  updated_at?: string;
}

// Interface para cabeçalho de serviços
export interface ServicoHeader {
  id?: number;
  servico_id: number; // FK para servicos.id
  
  // Dados de quilometragem
  km_inicial?: number;
  km_final?: number;
  
  // Dados de tempo
  hora_inicial?: string; // TIME
  hora_final?: string; // TIME
  data_execucao?: string; // DATE
  
  // Dados da equipe e equipamento
  equipe_prefixo?: string; // FK para equipes.prefixo
  equipamento?: string;
  
  // Dados do projeto
  si?: string; // Sistema de Informação
  ptp?: string; // Permissão de Trabalho Programado
  projeto?: string; // Notas do projeto
  
  // Status e observações
  status_servico?: 'Pendente' | 'Em Andamento' | 'Concluído' | 'Cancelado' | 'Pausado' | 'Parcial' | 'Final';
  ocorrencia?: string; // Descrição de ocorrências durante o serviço
  
  // Controle de auditoria
  created_at?: string;
  updated_at?: string;
  
  // Campos relacionados (joins)
  servico?: Servico; // Dados do serviço quando fazer join
  equipe?: Equipe; // Dados da equipe quando fazer join
}
