import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { User } from '@supabase/supabase-js';
import { Colaborador } from '@/types/types';

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
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Erro ao carregar colaborador:', error);
        setColaborador(null);
        return;
      };
      setColaborador(data);
    } catch (error) {
      console.error('Erro ao carregar colaborador:', error);
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