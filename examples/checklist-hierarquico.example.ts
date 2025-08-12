// examples/checklist-hierarquico.example.ts
// Exemplo de uso do sistema de checklist hierárquico com campos de cabeçalho
// Exemplo de uso da nova estrutura hierárquica de checklist

import { api } from '../services/api';
import { ChecklistCompleto, ChecklistResposta } from '../types/types';

/**
 * Exemplo 1: Buscar checklist completo com hierarquia
 */
export async function exemploChecklistCompleto() {
  try {
    // Buscar o template "Acompanhamento de Serviço" (ID 4)
    const checklistCompleto: ChecklistCompleto = await api.getChecklistCompleto(4);
    
    console.log('Template:', checklistCompleto.template.nome);
    console.log('Descrição:', checklistCompleto.template.descricao);
    
    // Listar todos os grupos e seus itens
    checklistCompleto.grupos.forEach(grupo => {
      console.log(`\n📁 Grupo: ${grupo.nome}`);
      
      grupo.itens.forEach(item => {
        console.log(`  📋 ${item.nome}`);
        console.log(`     Unidade: ${item.unidade || 'N/A'}`);
        console.log(`     Código: ${item.codigo_material || 'N/A'}`);
      });
    });
    
    return checklistCompleto;
  } catch (error) {
    console.error('Erro ao buscar checklist completo:', error);
    throw error;
  }
}

/**
 * Exemplo 1.1: Criar checklist com cabeçalho completo
 */
export async function exemploChecklistComCabecalho() {
  try {
    const checklistData = {
      checklistTemplateId: 1,
      preenchidoPor: 123, // ID do colaborador
      dataPreenchimento: '2024-01-15',
      // Campos de cabeçalho
      kmInicial: 125.5,
      kmFinal: 127.8,
      equipePrefixo: 'EQ001',
      horaInicial: '08:00',
      horaFinal: '12:30',
      tipoServico: 'Manutenção Preventiva',
      statusServico: 'Em Andamento',
      equipamento: 'Caminhão Munck',
      si: 'SI-2024-001',
      ptp: 'PTP-2024-015',
      ocorrencia: 'Substituição de isoladores danificados',
      projeto: 'Modernização da rede elétrica - Setor Norte',
      respostas: [
        {
          item: 'Poste de Concreto',
          resposta: 'Conforme'
        }
      ]
    };
    
    const resultado = await api.updateChecklist('SERV-001', checklistData);
    console.log('Checklist criado com cabeçalho:', resultado);
  } catch (error) {
    console.error('Erro ao criar checklist:', error);
  }
}

/**
 * Exemplo 1.2: Atualizar apenas o cabeçalho do checklist
 */
export async function exemploAtualizarCabecalho() {
  try {
    const headerData = {
      kmInicial: 125.5,
      kmFinal: 128.2,
      equipePrefixo: 'EQ001',
      horaInicial: '08:00',
      horaFinal: '13:15',
      tipoServico: 'Manutenção Corretiva',
      statusServico: 'Concluído',
      equipamento: 'Caminhão Munck + Guindaste',
      si: 'SI-2024-001',
      ptp: 'PTP-2024-015',
      ocorrencia: 'Substituição completa do poste danificado por tempestade',
      projeto: 'Emergência - Restabelecimento de energia'
    };
    
    const resultado = await api.updateChecklistHeader('SERV-001', headerData);
    console.log('Cabeçalho atualizado:', resultado);
  } catch (error) {
    console.error('Erro ao atualizar cabeçalho:', error);
  }
}

/**
 * Exemplo 2: Preenchimento de checklist em campo
 */
export async function exemploPreenchimentoChecklist(checklistId: number, usuarioId: string) {
  try {
    // Exemplo de respostas para diferentes itens
    const respostas: Partial<ChecklistResposta>[] = [
      {
        checklist_id: checklistId,
        item_id: 1, // Poste de Concreto 9m
        status: 'Instalado',
        quantidade: 2,
        observacao: 'Postes instalados conforme projeto',
        usuario_id: usuarioId
      },
      {
        checklist_id: checklistId,
        item_id: 7, // Isolador Tipo Pino 15kV
        status: 'Instalado',
        quantidade: 6,
        observacao: 'Isoladores testados e aprovados',
        usuario_id: usuarioId
      },
      {
        checklist_id: checklistId,
        item_id: 13, // Cabo 3x35mm² XLPE
        status: 'Instalado',
        quantidade: 150,
        observacao: 'Cabo instalado em 150 metros',
        usuario_id: usuarioId
      }
    ];
    
    // Salvar cada resposta
    const respostasSalvas = [];
    for (const resposta of respostas) {
      const respostaSalva = await api.createChecklistResposta(resposta);
      respostasSalvas.push(respostaSalva);
      console.log(`✅ Resposta salva para item ${resposta.item_id}`);
    }
    
    return respostasSalvas;
  } catch (error) {
    console.error('Erro ao preencher checklist:', error);
    throw error;
  }
}

/**
 * Exemplo 3: Buscar grupos específicos
 */
export async function exemploGruposEspecificos() {
  try {
    // Buscar grupos do template "Acompanhamento de Serviço"
    const grupos = await api.getChecklistGrupos(4);
    
    console.log('Grupos disponíveis:');
    grupos.forEach(grupo => {
      console.log(`- ${grupo.nome} (Ordem: ${grupo.ordem})`);
    });
    
    // Buscar itens de um grupo específico (ex: Postes - ID 1)
    const itensPostes = await api.getChecklistItens(1);
    
    console.log('\nItens do grupo Postes:');
    itensPostes.forEach(item => {
      console.log(`- ${item.nome} (${item.unidade}) - ${item.codigo_material}`);
    });
    
    return { grupos, itensPostes };
  } catch (error) {
    console.error('Erro ao buscar grupos específicos:', error);
    throw error;
  }
}

/**
 * Exemplo 4: Relatório de checklist preenchido
 */
export async function exemploRelatorioChecklist(checklistId: number) {
  try {
    // Buscar todas as respostas do checklist
    const respostas = await api.getChecklistRespostas(checklistId);
    
    console.log(`\n📊 Relatório do Checklist ${checklistId}`);
    console.log('=' .repeat(50));
    
    // Agrupar por status
    const instalados = respostas.filter(r => r.status === 'Instalado');
    const retirados = respostas.filter(r => r.status === 'Retirado');
    
    console.log(`\n✅ Itens Instalados: ${instalados.length}`);
    instalados.forEach(resposta => {
      console.log(`  - Item ${resposta.item_id}: ${resposta.quantidade || 0} unidades`);
      if (resposta.observacao) {
        console.log(`    Obs: ${resposta.observacao}`);
      }
    });
    
    console.log(`\n❌ Itens Retirados: ${retirados.length}`);
    retirados.forEach(resposta => {
      console.log(`  - Item ${resposta.item_id}: ${resposta.quantidade || 0} unidades`);
      if (resposta.observacao) {
        console.log(`    Obs: ${resposta.observacao}`);
      }
    });
    
    return {
      total: respostas.length,
      instalados: instalados.length,
      retirados: retirados.length,
      respostas
    };
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    throw error;
  }
}

/**
 * Exemplo 5: Atualização de resposta existente
 */
export async function exemploAtualizarResposta(respostaId: number) {
  try {
    const dadosAtualizacao = {
      quantidade: 3,
      observacao: 'Quantidade atualizada após verificação em campo',
      status: 'Instalado' as const
    };
    
    const respostaAtualizada = await api.updateChecklistResposta(respostaId, dadosAtualizacao);
    
    console.log('✅ Resposta atualizada:', respostaAtualizada);
    
    return respostaAtualizada;
  } catch (error) {
    console.error('Erro ao atualizar resposta:', error);
    throw error;
  }
}

/**
 * Exemplo de uso completo
 */
export async function exemploUsoCompleto() {
  try {
    console.log('🚀 Iniciando exemplo de uso completo do checklist hierárquico\n');
    
    // 1. Buscar estrutura completa
    console.log('1️⃣ Buscando estrutura completa...');
    const checklistCompleto = await exemploChecklistCompleto();
    
    // 2. Buscar grupos específicos
    console.log('\n2️⃣ Buscando grupos específicos...');
    await exemploGruposEspecificos();
    
    // 3. Simular preenchimento (substitua pelos IDs reais)
    console.log('\n3️⃣ Simulando preenchimento...');
    // await exemploPreenchimentoChecklist(1, 'user-uuid-here');
    
    // 4. Gerar relatório (substitua pelo ID real)
    console.log('\n4️⃣ Gerando relatório...');
    // await exemploRelatorioChecklist(1);
    
    console.log('\n✅ Exemplo concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no exemplo:', error);
  }
}

// Exportar todas as funções para uso individual
export {
  exemploChecklistCompleto,
  exemploChecklistComCabecalho,
  exemploAtualizarCabecalho,
  exemploPreenchimentoChecklist,
  exemploGruposEspecificos,
  exemploRelatorioChecklist,
  exemploAtualizarResposta
};