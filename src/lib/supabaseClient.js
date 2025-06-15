// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL  ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  throw new Error('Supabase environment variables not set');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,   // magic-link / OAuth support
    },
    global: { fetch },
    realtime: { timeout: 30_000 },
  }
);

supabase.auth.onAuthStateChange((event, session) => {
  logger.info(`Auth event: ${event}`, session);
});