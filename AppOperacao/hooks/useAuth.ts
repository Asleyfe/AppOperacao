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
    // Verificar sessão atual
    checkSession();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('=== AUTH STATE CHANGE ===');
        console.log('Event:', event);
        console.log('Session:', session);
        
        if (session?.user) {
          console.log('Usuário logado:', session.user.id);
          setUser(session.user);
          await loadColaborador(session.user.id);
        } else {
          console.log('Usuário deslogado - limpando estados');
          setUser(null);
          setColaborador(null);
        }
        setLoading(false);
        console.log('Loading finalizado');
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
      console.log('=== DEBUG USEAUTH ===');
      console.log('Carregando colaborador para userId:', userId);
      
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('Resultado da consulta colaborador:', { data, error });

      if (error) {
        console.error('Erro ao carregar colaborador:', error);
        setColaborador(null);
        return;
      }

      console.log('Colaborador carregado com sucesso:', data);
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