// Importar polyfill do BackHandler antes de qualquer outro import
import '../polyfills/BackHandler';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { Redirect, usePathname } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createTables } from '@/services/offline/database';
import { NetworkService } from '@/services/offline/NetworkService';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading, colaborador } = useAuth();
  const [loaded] = useFonts({});
  const pathname = usePathname();

  useFrameworkReady();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Inicializar banco de dados offline e serviços de rede de forma não bloqueante
  useEffect(() => {
    const initializeOfflineServices = async () => {
      try {
        // Inicializar serviços em background sem bloquear a UI
        Promise.all([
          createTables().then(() => console.log('✅ Banco de dados offline inicializado com sucesso')),
          NetworkService.initialize().then(() => console.log('✅ Serviço de rede inicializado com sucesso'))
        ]).catch(error => {
          console.error('❌ Erro ao inicializar serviços offline:', error);
        });
      } catch (error) {
        console.error('❌ Erro ao inicializar serviços offline:', error);
      }
    };

    // Executar inicialização em background
    setTimeout(initializeOfflineServices, 100);
  }, []);

  // Configurar matrícula do colaborador no NetworkService e executar sincronização inicial
  useEffect(() => {
    if (colaborador?.matricula) {
      NetworkService.setColaboradorMatricula(colaborador.matricula);
      console.log('✅ Matrícula do colaborador configurada no NetworkService:', colaborador.matricula);
      
      // Executar sincronização inicial após login
      NetworkService.syncAfterLogin().catch(error => {
        console.error('Erro na sincronização inicial:', error);
      });
    } else {
      NetworkService.setColaboradorMatricula(null);
    }
  }, [colaborador]);

  // Mostrar loading apenas se as fontes não carregaram ou se ainda está verificando autenticação inicial
  if (!loaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Se ainda está carregando dados do usuário, mas as fontes já carregaram, permitir navegação
  if (loading) {
    // Permitir que a aplicação continue carregando em background
    // A autenticação será verificada nas telas individuais
  }

  // Redirecionar baseado no estado de autenticação (apenas se não estiver carregando)
  if (!loading && !isAuthenticated && pathname !== '/login') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Redirect href="/login" />
      </ThemeProvider>
    );
  }

  if (!loading && isAuthenticated && pathname === '/login') {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Redirect href="/(tabs)" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
