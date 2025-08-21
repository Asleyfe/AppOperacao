import { api } from '../api';
import { OfflineDataService } from './OfflineDataService';
import { NetworkService } from './NetworkService';
import { getLocalDatabase, safeRunAsync } from './database';

export class DataPreloadService {
  private static offlineService = new OfflineDataService();

  /**
   * Carrega todos os dados essenciais para funcionamento offline após login
   */
  static async preloadEssentialData(encarregadoMatricula?: string): Promise<void> {
    console.log('🚀 [PRELOAD] Iniciando carregamento de dados essenciais...');
    
    try {
      // Verificar se está online
      const isOnline = await NetworkService.isConnected();
      
      if (!isOnline) {
        console.log('📱 [PRELOAD] Offline - usando dados locais existentes');
        return;
      }

      console.log('🌐 [PRELOAD] Online - carregando dados do servidor...');
      
      // Carregar dados em paralelo para melhor performance
      const promises = [
        this.preloadColaboradores(),
        this.preloadGrupoItens(),
        this.preloadEquipes(encarregadoMatricula),
        this.preloadServicos(encarregadoMatricula)
      ];

      await Promise.allSettled(promises);
      
      console.log('✅ [PRELOAD] Carregamento de dados essenciais concluído!');
    } catch (error) {
      console.error('❌ [PRELOAD] Erro no carregamento de dados:', error);
      // Não lançar erro para não bloquear o login
    }
  }

  /**
   * Carrega colaboradores e salva localmente
   */
  private static async preloadColaboradores(): Promise<void> {
    try {
      console.log('👥 [PRELOAD] Carregando colaboradores...');
      
      const colaboradores = await api.getColaboradores();
      
      if (colaboradores && colaboradores.length > 0) {
        const db = await getLocalDatabase();
        
        // Usar INSERT OR REPLACE para evitar violação de constraint UNIQUE
        for (const colaborador of colaboradores) {
          await safeRunAsync(db, 
            `INSERT OR REPLACE INTO colaboradores_local 
             (id, nome, funcao, matricula, supervisor_id, coordenador_id, synced) 
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
              colaborador.id,
              colaborador.nome,
              colaborador.funcao,
              colaborador.matricula,
              colaborador.supervisor_id,
              colaborador.coordenador_id
            ]
          );
        }
        
        console.log(`✅ [PRELOAD] ${colaboradores.length} colaboradores carregados`);
      }
    } catch (error) {
      console.error('❌ [PRELOAD] Erro ao carregar colaboradores:', error);
    }
  }

  /**
   * Carrega grupo de itens e salva localmente
   */
  private static async preloadGrupoItens(): Promise<void> {
    try {
      console.log('📋 [PRELOAD] Carregando grupo de itens...');
      
      const grupoItens = await api.getGrupoItens();
      
      if (grupoItens && grupoItens.length > 0) {
        const db = await getLocalDatabase();
        
        // Usar INSERT OR REPLACE para evitar conflitos
        for (const item of grupoItens) {
          await safeRunAsync(db,
            `INSERT OR REPLACE INTO grupo_itens_local 
             (id, grupo, item, unidade, synced) 
             VALUES (?, ?, ?, ?, 1)`,
            [
              item.id,
              item.grupo,
              item.item,
              item.unidade
            ]
          );
        }
        
        console.log(`✅ [PRELOAD] ${grupoItens.length} itens de grupo carregados`);
      }
    } catch (error) {
      console.error('❌ [PRELOAD] Erro ao carregar grupo de itens:', error);
    }
  }

  /**
   * Carrega equipes e salva localmente
   */
  private static async preloadEquipes(encarregadoMatricula?: string): Promise<void> {
    try {
      console.log('👷 [PRELOAD] Carregando equipes...');
      
      let equipes;
      if (encarregadoMatricula) {
        equipes = await api.getEquipesByEncarregado(encarregadoMatricula);
      } else {
        equipes = await api.getEquipes();
      }
      
      if (equipes && equipes.length > 0) {
        const db = await getLocalDatabase();
        
        // Usar INSERT OR REPLACE para evitar conflitos
        for (const equipe of equipes) {
          await safeRunAsync(db,
            `INSERT OR REPLACE INTO equipes_local 
             (id, nome, prefixo, status_composicao, encarregado_matricula, synced) 
             VALUES (?, ?, ?, ?, ?, 1)`,
            [
              equipe.id,
              equipe.nome,
              equipe.prefixo,
              equipe.statusComposicao,
              equipe.encarregadoMatricula
            ]
          );
          
          // Inserir composição da equipe
          if (equipe.composicao && equipe.composicao.length > 0) {
            for (const membro of equipe.composicao) {
              await safeRunAsync(db,
                `INSERT OR REPLACE INTO composicao_equipe_local 
                 (equipe_id, colaborador_matricula, synced) 
                 VALUES (?, ?, 1)`,
                [equipe.id, membro.colaboradorMatricula]
              );
            }
          }
        }
        
        console.log(`✅ [PRELOAD] ${equipes.length} equipes carregadas`);
      }
    } catch (error) {
      console.error('❌ [PRELOAD] Erro ao carregar equipes:', error);
    }
  }

  /**
   * Carrega serviços e salva localmente
   */
  private static async preloadServicos(encarregadoMatricula?: string): Promise<void> {
    try {
      console.log('🔧 [PRELOAD] Carregando serviços...');
      
      let servicos;
      if (encarregadoMatricula) {
        servicos = await this.offlineService.getServicosByEncarregado(encarregadoMatricula);
      } else {
        servicos = await api.getServicos();
      }
      
      if (servicos && servicos.length > 0) {
        const db = await getLocalDatabase();
        
        // Usar INSERT OR REPLACE para evitar conflitos
        for (const servico of servicos) {
          await safeRunAsync(db,
            `INSERT OR REPLACE INTO servicos_local 
             (id, numero, descricao, status, nota, equipe_id, encarregado_id, 
              data_planejada, inicio_deslocamento, fim_deslocamento, 
              inicio_execucao, fim_execucao, synced) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              servico.id,
              servico.numero || null,
              servico.descricao,
              servico.status,
              servico.nota,
              servico.equipeId,
              servico.encarregadoId,
              servico.dataPlanejada,
              servico.timestamps?.inicioDeslocamento,
              servico.timestamps?.fimDeslocamento,
              servico.timestamps?.inicioExecucao,
              servico.timestamps?.fimExecucao
            ]
          );
        }
        
        console.log(`✅ [PRELOAD] ${servicos.length} serviços carregados`);
      }
    } catch (error) {
      console.error('❌ [PRELOAD] Erro ao carregar serviços:', error);
    }
  }

  /**
   * Verifica se os dados essenciais estão disponíveis localmente
   */
  static async hasEssentialData(): Promise<boolean> {
    try {
      const db = await getLocalDatabase();
      
      // Verificar se existem dados nas tabelas principais
      const checks = [
        'SELECT COUNT(*) as count FROM colaboradores_local',
        'SELECT COUNT(*) as count FROM grupo_itens_local',
        'SELECT COUNT(*) as count FROM equipes_local'
      ];
      
      for (const query of checks) {
        const result = await new Promise<any>((resolve, reject) => {
          db.transaction(tx => {
            tx.executeSql(query, [], (_, { rows }) => {
              resolve(rows.item(0));
            }, (_, error) => {
              reject(error);
              return false;
            });
          });
        });
        
        if (result.count === 0) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ [PRELOAD] Erro ao verificar dados essenciais:', error);
      return false;
    }
  }

  /**
   * Força o recarregamento de todos os dados
   */
  static async forceReload(encarregadoMatricula?: string): Promise<void> {
    console.log('🔄 [PRELOAD] Forçando recarregamento de dados...');
    await this.preloadEssentialData(encarregadoMatricula);
  }
}