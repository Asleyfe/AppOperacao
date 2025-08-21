import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { User } from '@supabase/supabase-js';
import { Colaborador } from '@/types/types';
import { NetworkService } from '@/services/offline/NetworkService';
import { OfflineDataService } from '@/services/offline/OfflineDataService';

export interface AuthState {
  user: User | null;
  colaborador: Colaborador | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão atual de forma otimizada
    checkSessionOptimized();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Carregar colaborador em background para não bloquear a UI
          loadColaborador(session.user.id);
        } else {
          setUser(null);
          setColaborador(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSessionOptimized = async () => {
    try {
      // Verificação rápida da sessão sem bloquear a UI
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Carregar colaborador em background
        loadColaborador(session.user.id);
      } else {
        setUser(null);
        setColaborador(null);
      }
      // Definir loading como false imediatamente para não bloquear a UI
      setLoading(false);
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      setUser(null);
      setColaborador(null);
      setLoading(false);
    }
  };

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadColaborador(session.user.id);
      } else {
        setUser(null);
        setColaborador(null);
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      setUser(null);
      setColaborador(null);
    } finally {
      setLoading(false);
    }
  };

  const loadColaborador = async (userId: string) => {
    try {
      // Verificar se há conexão de rede
      const isConnected = NetworkService.isConnected();
      
      if (isConnected) {
        // Online: tentar carregar do Supabase
        const { data, error } = await supabase
          .from('colaboradores')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Erro ao carregar colaborador online:', error);
          // Se falhar online, tentar offline como fallback
          await loadColaboradorOffline(userId);
          return;
        }
        setColaborador(data);
      } else {
        // Offline: carregar dados locais
        await loadColaboradorOffline(userId);
      }
    } catch (error) {
      console.error('Erro ao carregar colaborador:', error);
      // Tentar fallback offline em caso de erro de rede
      await loadColaboradorOffline(userId);
    }
  };

  const loadColaboradorOffline = async (userId: string) => {
    try {
      const offlineDataService = new OfflineDataService();
      const colaboradores = await offlineDataService.getColaboradores();
      
      // Buscar colaborador por user_id nos dados offline
      const colaboradorOffline = colaboradores.find(c => c.user_id === userId);
      
      if (colaboradorOffline) {
        setColaborador(colaboradorOffline);
        console.log('✅ Colaborador carregado offline:', colaboradorOffline.matricula);
      } else {
        console.warn('⚠️ Colaborador não encontrado nos dados offline');
        setColaborador(null);
      }
    } catch (error) {
      console.error('Erro ao carregar colaborador offline:', error);
      setColaborador(null);
    }
  };

  return {
    user,
    colaborador,
    loading,
    isAuthenticated: !!user, // Simplificado para evitar loops infinitos
  };
}