// Exemplo de uso da tabela servico_header
// Sistema de cabeçalho de serviços - substitui dependência de checklists

import { api } from '@/services/api';
import { ServicoHeader } from '@/types/types';

// ========================================
// EXEMPLOS DE USO DA API SERVICO_HEADER
// ========================================

export const exemploServicoHeader = {
  
  // 1. CRIAR CABEÇALHO DE SERVIÇO
  async criarCabecalho() {
    const novoHeader: Omit<ServicoHeader, 'id' | 'created_at' | 'updated_at'> = {
      servico_id: 1,
      km_inicial: 12500.5,
      km_final: 12650.8,
      hora_inicial: '08:00:00',
      hora_final: '17:30:00',
      data_execucao: '2024-01-15',
      equipe_prefixo: 'EQ001',
      equipamento: 'Caminhão Munck - Placa ABC-1234',
      si: 'SI-2024-001',
      ptp: 'PTP-2024-001',
      projeto: 'Instalação de medidores residenciais - Bairro Centro',
      status_servico: 'Em Andamento',
      ocorrencia: 'Execução normal, sem intercorrências'
    };
    
    try {
      const header = await api.createServicoHeader(novoHeader);
      console.log('Cabeçalho criado:', header);
      return header;
    } catch (error) {
      console.error('Erro ao criar cabeçalho:', error);
      throw error;
    }
  },
  
  // 2. BUSCAR CABEÇALHO POR SERVIÇO
  async buscarCabecalho(servicoId: number) {
    try {
      const header = await api.getServicoHeader(servicoId);
      if (header) {
        console.log('Cabeçalho encontrado:', header);
        return header;
      } else {
        console.log('Nenhum cabeçalho encontrado para o serviço:', servicoId);
        return null;
      }
    } catch (error) {
      console.error('Erro ao buscar cabeçalho:', error);
      throw error;
    }
  },
  
  // 3. ATUALIZAR CABEÇALHO EXISTENTE
  async atualizarCabecalho(servicoId: number) {
    const dadosAtualizacao: Partial<ServicoHeader> = {
      km_final: 12680.2,
      hora_final: '18:15:00',
      status_servico: 'Concluído',
      ocorrencia: 'Serviço finalizado com sucesso. Todos os medidores instalados.'
    };
    
    try {
      const header = await api.updateServicoHeader(servicoId, dadosAtualizacao);
      console.log('Cabeçalho atualizado:', header);
      return header;
    } catch (error) {
      console.error('Erro ao atualizar cabeçalho:', error);
      throw error;
    }
  },
  
  // 4. CRIAR OU ATUALIZAR (UPSERT)
  async salvarCabecalho(servicoId: number) {
    const headerData: Omit<ServicoHeader, 'id' | 'created_at' | 'updated_at'> = {
      servico_id: servicoId,
      km_inicial: 15200.0,
      km_final: 15350.5,
      hora_inicial: '07:30:00',
      hora_final: '16:45:00',
      data_execucao: '2024-01-16',
      equipe_prefixo: 'EQ002',
      equipamento: 'Van de Serviço - Placa XYZ-5678',
      si: 'SI-2024-002',
      ptp: 'PTP-2024-002',
      projeto: 'Manutenção preventiva em transformadores',
      status_servico: 'Concluído'
    };
    
    try {
      const header = await api.upsertServicoHeader(headerData);
      console.log('Cabeçalho salvo (upsert):', header);
      return header;
    } catch (error) {
      console.error('Erro ao salvar cabeçalho:', error);
      throw error;
    }
  },
  
  // 5. DELETAR CABEÇALHO
  async deletarCabecalho(servicoId: number) {
    try {
      await api.deleteServicoHeader(servicoId);
      console.log('Cabeçalho deletado para o serviço:', servicoId);
      return true;
    } catch (error) {
      console.error('Erro ao deletar cabeçalho:', error);
      throw error;
    }
  }
};

// ========================================
// EXEMPLO DE FLUXO COMPLETO
// ========================================

export const exemploFluxoCompleto = async () => {
  console.log('=== EXEMPLO DE FLUXO COMPLETO - CABEÇALHO DE SERVIÇO ===');
  
  const servicoId = 1;
  
  try {
    // 1. Verificar se já existe cabeçalho
    console.log('\n1. Verificando cabeçalho existente...');
    let header = await exemploServicoHeader.buscarCabecalho(servicoId);
    
    if (!header) {
      // 2. Criar novo cabeçalho
      console.log('\n2. Criando novo cabeçalho...');
      header = await exemploServicoHeader.criarCabecalho();
    }
    
    // 3. Atualizar dados durante execução
    console.log('\n3. Atualizando dados durante execução...');
    header = await exemploServicoHeader.atualizarCabecalho(servicoId);
    
    // 4. Finalizar serviço
    console.log('\n4. Finalizando serviço...');
    const headerFinal = await api.updateServicoHeader(servicoId, {
      status_servico: 'Concluído',
      hora_final: new Date().toTimeString().slice(0, 8),
      ocorrencia: 'Serviço finalizado com sucesso'
    });
    
    console.log('\n=== FLUXO CONCLUÍDO ===');
    console.log('Cabeçalho final:', headerFinal);
    
  } catch (error) {
    console.error('Erro no fluxo:', error);
  }
};

// ========================================
// VALIDAÇÕES E UTILITÁRIOS
// ========================================

export const validacoesCabecalho = {
  
  // Validar dados de quilometragem
  validarKm(kmInicial?: number, kmFinal?: number): boolean {
    if (kmInicial && kmFinal) {
      return kmFinal >= kmInicial;
    }
    return true; // Se um dos valores for null/undefined, não validar
  },
  
  // Validar horários
  validarHorarios(horaInicial?: string, horaFinal?: string): boolean {
    if (horaInicial && horaFinal) {
      return horaFinal >= horaInicial;
    }
    return true;
  },
  
  // Calcular quilometragem percorrida
  calcularKmPercorrido(header: ServicoHeader): number | null {
    if (header.km_inicial && header.km_final) {
      return header.km_final - header.km_inicial;
    }
    return null;
  },
  
  // Calcular tempo de execução
  calcularTempoExecucao(header: ServicoHeader): string | null {
    if (header.hora_inicial && header.hora_final) {
      const inicio = new Date(`1970-01-01T${header.hora_inicial}`);
      const fim = new Date(`1970-01-01T${header.hora_final}`);
      const diff = fim.getTime() - inicio.getTime();
      const horas = Math.floor(diff / (1000 * 60 * 60));
      const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${horas}h ${minutos}m`;
    }
    return null;
  }
};

// ========================================
// EXEMPLO DE USO NO COMPONENTE
// ========================================

export const exemploUsoComponente = {
  
  // Função para salvar dados do formulário
  async salvarFormulario(servicoId: number, dadosFormulario: any) {
    const headerData: Omit<ServicoHeader, 'id' | 'created_at' | 'updated_at'> = {
      servico_id: servicoId,
      km_inicial: dadosFormulario.kmInicial,
      km_final: dadosFormulario.kmFinal,
      hora_inicial: dadosFormulario.horaInicial,
      hora_final: dadosFormulario.horaFinal,
      data_execucao: dadosFormulario.dataExecucao,
      equipe_prefixo: dadosFormulario.equipePrefixo,
      equipamento: dadosFormulario.equipamento,
      si: dadosFormulario.si,
      ptp: dadosFormulario.ptp,
      projeto: dadosFormulario.projeto,
      status_servico: dadosFormulario.statusServico,
      ocorrencia: dadosFormulario.ocorrencia
    };
    
    // Validar dados antes de salvar
    if (!validacoesCabecalho.validarKm(headerData.km_inicial, headerData.km_final)) {
      throw new Error('Quilometragem final deve ser maior ou igual à inicial');
    }
    
    if (!validacoesCabecalho.validarHorarios(headerData.hora_inicial, headerData.hora_final)) {
      throw new Error('Hora final deve ser maior ou igual à inicial');
    }
    
    // Salvar usando upsert
    return await api.upsertServicoHeader(headerData);
  },
  
  // Função para carregar dados no formulário
  async carregarFormulario(servicoId: number) {
    const header = await api.getServicoHeader(servicoId);
    
    if (header) {
      return {
        kmInicial: header.km_inicial,
        kmFinal: header.km_final,
        horaInicial: header.hora_inicial,
        horaFinal: header.hora_final,
        dataExecucao: header.data_execucao,
        equipePrefixo: header.equipe_prefixo,
        equipamento: header.equipamento,
        si: header.si,
        ptp: header.ptp,
        projeto: header.projeto,
        statusServico: header.status_servico,
        ocorrencia: header.ocorrencia
      };
    }
    
    return null;
  }
};

console.log('Exemplo de uso da tabela servico_header carregado!');
console.log('Use exemploFluxoCompleto() para testar o fluxo completo.');