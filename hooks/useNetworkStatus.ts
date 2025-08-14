import { useState, useEffect } from 'react';
   import { NetworkService } from '../services/offline/NetworkService';
   
   export const useNetworkStatus = () => {
     const [isConnected, setIsConnected] = useState(true);
     const [isSyncing, setIsSyncing] = useState(false);
     
     useEffect(() => {
       NetworkService.addListener((connected) => {
         setIsConnected(connected);
         if (connected) {
           setIsSyncing(true);
           // Simular tempo de sincronização
           setTimeout(() => setIsSyncing(false), 3000);
         }
       });
     }, []);
     
     return { isConnected, isSyncing };
   };