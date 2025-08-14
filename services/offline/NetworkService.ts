import NetInfo from '@react-native-community/netinfo';
import { SyncService } from './syncService';
import { QueueService } from './QueueService';
   
   export class NetworkService {
     private static listeners: ((isConnected: boolean) => void)[] = [];
     
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
         // Sincronizar dados
         const syncService = new SyncService();
         await syncService.syncToServer(); // Enviar dados locais
         await syncService.syncFromServer(); // Baixar dados atualizados
         
         // Processar fila de operações
         await QueueService.processQueue();
       } catch (error) {
         console.error('Erro na sincronização automática:', error);
       }
     }
   }