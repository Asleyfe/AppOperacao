import NetInfo from '@react-native-community/netinfo';
import { SyncService } from './syncService';
import { QueueService } from './QueueService';
   
   export class NetworkService {
     private static listeners: ((isConnected: boolean) => void)[] = [];
     private static colaboradorMatricula: string | null = null;
     
     static setColaboradorMatricula(matricula: string | null) {
       this.colaboradorMatricula = matricula;
     }
     
     // Método para sincronização manual após login
     static async syncAfterLogin() {
       try {
         if (!this.colaboradorMatricula) {
           console.log('⚠️ Sincronização pós-login ignorada: matrícula não definida');
           return;
         }
         
         console.log('🔄 Iniciando sincronização pós-login para colaborador:', this.colaboradorMatricula);
         
         const syncService = new SyncService();
         await syncService.syncFromServer(this.colaboradorMatricula);
         
         console.log('✅ Sincronização pós-login concluída');
       } catch (error) {
         console.error('Erro na sincronização pós-login:', error);
       }
     }
     
     static async initialize() {
       // Monitorar mudanças na conectividade
       NetInfo.addEventListener(state => {
         const isConnected = state.isConnected && state.isInternetReachable;
         
         if (isConnected) {
           // Quando voltar online, sincronizar automaticamente
           this.onConnectionRestored();
         }
         
         // Notificar listeners
         this.listeners.forEach(listener => listener(isConnected));
       });
     }
     
     static async isConnected(): Promise<boolean> {
       const state = await NetInfo.fetch();
       return state.isConnected && state.isInternetReachable;
     }
     
     static addListener(callback: (isConnected: boolean) => void) {
       this.listeners.push(callback);
     }
     
     private static async onConnectionRestored() {
       try {
         // Só sincronizar se houver matrícula do colaborador (usuário logado)
         if (!this.colaboradorMatricula) {
           console.log('⚠️ Sincronização automática ignorada: usuário não logado');
           return;
         }
         
         console.log('🔄 Iniciando sincronização automática para colaborador:', this.colaboradorMatricula);
         
         // Sincronizar dados
         const syncService = new SyncService();
         await syncService.syncToServer(); // Enviar dados locais
         await syncService.syncFromServer(this.colaboradorMatricula); // Baixar dados atualizados filtrados por encarregado
         
         // Processar fila de operações
         await QueueService.processQueue();
         
         console.log('✅ Sincronização automática concluída');
       } catch (error) {
         console.error('Erro na sincronização automática:', error);
       }
     }
   }