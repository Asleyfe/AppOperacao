import { useState, useEffect } from 'react';
   import { NetworkService } from '../services/offline/NetworkService';
   
   export const useNetworkStatus = () => {
     const [isConnected, setIsConnected] = useState(true);
     const [isSyncing, setIsSyncing] = useState(false);
     
     useEffect(() => {
       // Listener para mudanças de conectividade
       NetworkService.addListener((connected) => {
         setIsConnected(connected);
       });
       
       // Listener para mudanças no status de sincronização
       NetworkService.addSyncListener((syncing) => {
         setIsSyncing(syncing);
       });
     }, []);
     
     return { isConnected, isSyncing };
   };