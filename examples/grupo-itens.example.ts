// Exemplo de uso da tabela grupo_itens
// Esta tabela armazena grupos e itens de forma simplificada

import { api } from '../services/api';
import { GrupoItem } from '../types/types';

// Exemplo de uso das funções da API para grupo_itens
export const exemploGrupoItens = {
  
  // Buscar todos os grupos e itens
  async buscarTodosGrupoItens(): Promise<GrupoItem[]> {
    try {
      const grupoItens = await api.getGrupoItens();
      console.log('Todos os grupos e itens:', grupoItens);
      return grupoItens;
    } catch (error) {
      console.error('Erro ao buscar grupo_itens:', error);
      throw error;
    }
  },
  
  // Buscar apenas os grupos únicos
  async buscarGrupos(): Promise<string[]> {
    try {
      const grupos = await api.getGrupos();
      console.log('Grupos disponíveis:', grupos);
      return grupos;
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      throw error;
    }
  },
  
  // Buscar itens de um grupo específico
  async buscarItensPorGrupo(grupo: string): Promise<GrupoItem[]> {
    try {
      const itens = await api.getItensByGrupo(grupo);
      console.log(`Itens do grupo '${grupo}':`, itens);
      return itens;
    } catch (error) {
      console.error(`Erro ao buscar itens do grupo '${grupo}':`, error);
      throw error;
    }
  },
  
  // Criar um novo item
  async criarNovoItem(grupo: string, item: string, unidade?: string): Promise<GrupoItem> {
    try {
      const novoItem = await api.createGrupoItem({
        grupo,
        item,
        unidade
      });
      console.log('Novo item criado:', novoItem);
      return novoItem;
    } catch (error) {
      console.error('Erro ao criar novo item:', error);
      throw error;
    }
  },
  
  // Atualizar um item existente
  async atualizarItem(id: number, updates: Partial<Pick<GrupoItem, 'grupo' | 'item' | 'unidade'>>): Promise<GrupoItem> {
    try {
      const itemAtualizado = await api.updateGrupoItem(id, updates);
      console.log('Item atualizado:', itemAtualizado);
      return itemAtualizado;
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      throw error;
    }
  },
  
  // Deletar um item
  async deletarItem(id: number): Promise<void> {
    try {
      await api.deleteGrupoItem(id);
      console.log(`Item com ID ${id} deletado com sucesso`);
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      throw error;
    }
  }
};

// Exemplo de uso prático com dados reais
export const exemploUso = async () => {
  try {
    console.log('=== Exemplos de Uso da API Grupo Itens ===\n');

    // 1. Buscar todos os grupos
    console.log('1. Buscando todos os grupos:');
    const grupos = await exemploGrupoItens.buscarGrupos();
    console.log('Grupos disponíveis:', grupos);
    console.log(`Total de grupos: ${grupos.length}`);
    
    // 2. Buscar itens de grupos específicos
    console.log('\n2. Itens do grupo "POSTE":');
    const postes = await exemploGrupoItens.buscarItensPorGrupo('POSTE');
    console.log(`Quantidade de postes: ${postes.length}`);
    console.log('Exemplos de postes:', postes.slice(0, 3));

    console.log('\n3. Itens do grupo "CABOS BT":');
    const cabosBT = await exemploGrupoItens.buscarItensPorGrupo('CABOS BT');
    console.log('Cabos BT disponíveis:', cabosBT);

    console.log('\n4. Itens do grupo "TRANSFORMADOR":');
    const transformadores = await exemploGrupoItens.buscarItensPorGrupo('TRANSFORMADOR');
    console.log(`Quantidade de transformadores: ${transformadores.length}`);
    console.log('Exemplos de transformadores:', transformadores.slice(0, 2));

    // 5. Buscar todos os itens e fazer análises
    console.log('\n5. Análise geral dos itens:');
    const todosItens = await exemploGrupoItens.buscarTodosGrupoItens();
    console.log(`Total de itens na base: ${todosItens.length}`);
    
    // Buscar itens específicos por padrão
    const itens11kV = todosItens.filter(item => 
      item.item.includes('11/') || item.item.includes('11,8')
    );
    console.log(`Itens com 11kV: ${itens11kV.length}`);
    
    const todosCabos = todosItens.filter(item => 
      item.grupo.includes('CABOS')
    );
    console.log(`Total de cabos: ${todosCabos.length}`);

    // 6. Criar um novo item personalizado
    console.log('\n6. Criando novo item personalizado:');
    const novoItem = await exemploGrupoItens.criarNovoItem(
      'POSTE',
      'POSTE 13/1800 - ESPECIAL',
      'UD'
    );
    console.log('Novo item criado:', novoItem);
    
    // 7. Atualizar o item criado
    console.log('\n7. Atualizando item:');
    const itemAtualizado = await exemploGrupoItens.atualizarItem(novoItem.id, {
      item: 'POSTE 13/1800 - ESPECIAL REFORÇADO'
    });
    console.log('Item atualizado:', itemAtualizado);
    
    // 8. Deletar o item de teste
    console.log('\n8. Deletando item de teste:');
    await exemploGrupoItens.deletarItem(novoItem.id);
    console.log('Item deletado com sucesso');

    // 9. Estatísticas por grupo
    console.log('\n9. Estatísticas por grupo:');
    const estatisticas = {};
    for (const grupo of grupos) {
      const itensDoGrupo = await exemploGrupoItens.buscarItensPorGrupo(grupo);
      estatisticas[grupo] = itensDoGrupo.length;
    }
    console.log('Itens por grupo:', estatisticas);
    
  } catch (error) {
    console.error('Erro no exemplo de uso:', error);
  }
};

// Função utilitária para buscar itens por padrão
export const buscarItensPorPadrao = async (padrao: string): Promise<GrupoItem[]> => {
  const todosItens = await exemploGrupoItens.buscarTodosGrupoItens();
  return todosItens.filter(item => 
    item.item.toLowerCase().includes(padrao.toLowerCase()) ||
    item.grupo.toLowerCase().includes(padrao.toLowerCase())
  );
};

// Função utilitária para buscar itens por unidade
export const buscarItensPorUnidade = async (unidade: string): Promise<GrupoItem[]> => {
  const todosItens = await exemploGrupoItens.buscarTodosGrupoItens();
  return todosItens.filter(item => item.unidade === unidade);
};

// Estrutura da tabela grupo_itens:
// {
//   id: number (SERIAL PRIMARY KEY)
//   grupo: string (NOT NULL)
//   item: string (NOT NULL)
//   unidade?: string (opcional)
//   created_at: string (timestamp)
//   updated_at: string (timestamp)
// }

// Grupos disponíveis na base de dados:
// - POSTE (diversos tipos e alturas)
// - ESTRUTURA PRIMARIA CONVENCIONAL (cruzetas, mãos francesas, etc.)
// - ISOLADOR (diversos tipos e tensões)
// - CABOS MT (cabos de média tensão)
// - CABOS BT (cabos de baixa tensão)
// - TRANSFORMADOR (diversos tipos e potências)
// - EQUIPAMENTO DE PROTECAO (chaves, para-raios, etc.)
// - ATERRAMENTO (hastes, conectores, etc.)
// - FERRAGEM (parafusos, porcas, arruelas, etc.)
// - MEDIDOR (medidores de energia)
// - RAMAL DE LIGACAO (componentes para ligação)
// - OUTROS (itens diversos)

// Exemplos de itens por categoria:
// POSTE: POSTE 9/600, POSTE 11/600, POSTE 13/1000, etc.
// TRANSFORMADOR: TRANSFORMADOR 15 KVA, TRANSFORMADOR 30 KVA, etc.
// CABOS: CABO 4 AWG, CABO 1/0 AWG, CABO 35 MM2, etc.
// ISOLADOR: ISOLADOR 15 KV, ISOLADOR 25 KV, etc.