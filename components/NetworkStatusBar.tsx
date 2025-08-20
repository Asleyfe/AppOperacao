import React from 'react';
   import { View, Text, StyleSheet } from 'react-native';
   import { useNetworkStatus } from '../hooks/useNetworkStatus';
   
   export const NetworkStatusBar = () => {
     const { isConnected, isSyncing } = useNetworkStatus();
     
     if (isSyncing) {
       return (
         <View style={[styles.statusBar, styles.syncing]}>
           <Text style={styles.statusText}>🔄 Sincronizando dados...</Text>
         </View>
       );
     }
     
     if (!isConnected) {
    return (
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, styles.offlineText]}>📱 Offline - Dados serão sincronizados quando houver conexão</Text>
      </View>
    );
  }
     
     return null; // Não mostrar nada quando online
   };
   
   const styles = StyleSheet.create({
     statusBar: {
       padding: 8,
       alignItems: 'center',
     },
     offlineText: {
    color: '#EF4444',
  },
     syncing: {
       backgroundColor: '#D1ECF1',
       borderColor: '#BEE5EB',
     },
     statusText: {
       fontSize: 12,
       fontWeight: '500',
     },
   });