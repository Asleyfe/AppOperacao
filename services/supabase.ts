// services/supabase.ts
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';

// Credenciais fixas para desenvolvimento (temporário)
const SUPABASE_URL_FALLBACK = 'https://zzwfyttukbvgwonjsxic.supabase.co';
const SUPABASE_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6d2Z5dHR1a2J2Z3dvbmpzeGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NjI4ODQsImV4cCI6MjA2OTIzODg4NH0.K4Zxlt8NBkGfbOVppqxt8MAomE4CLw9husGGrieCkwo';

// Tentar obter das variáveis de ambiente primeiro, depois usar fallback
let SUPABASE_URL: string;
let SUPABASE_KEY: string;

try {
  SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || 
                 Constants.manifest?.extra?.supabaseUrl || 
                 SUPABASE_URL_FALLBACK;
  
  SUPABASE_KEY = Constants.expoConfig?.extra?.supabaseKey || 
                 Constants.manifest?.extra?.supabaseKey || 
                 SUPABASE_KEY_FALLBACK;
} catch (error) {
  console.warn('Erro ao acessar Constants, usando credenciais fixas:', error);
  SUPABASE_URL = SUPABASE_URL_FALLBACK;
  SUPABASE_KEY = SUPABASE_KEY_FALLBACK;
}

// Log para debug


// Verificar se as credenciais estão disponíveis
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Credenciais do Supabase não encontradas!');
  throw new Error('Credenciais do Supabase são obrigatórias');
}

// Inicializar o cliente Supabase com configurações robustas
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: undefined, // Usar storage padrão do React Native
  },
  global: {
    headers: {
      'apikey': SUPABASE_KEY,
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Verificar se o cliente foi inicializado corretamente