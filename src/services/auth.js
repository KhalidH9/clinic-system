// src/services/auth.js
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';

/**
 * Sign in with email + password.
 * Throws on error so TanStack Query / callers can handle it uniformly.
 */
export const login = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logger.warn('Login failure', { email, error });
    // Always throw *Error* instances so .message is safe everywhere
    throw new Error(error.message);
  }

  logger.info('Login success', { userId: data?.user?.id });
  return data;
};

/**
 * Global sign-out helper used by Sidebar, top-right menus, etc.
 * Callers should handle toast / redirect UI.
 */
export const logout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error('Logout failed', error);
    throw new Error('Logout failed — please try again.');
  }

  logger.info('User logged out');
  return true;
};
/**
 * Optional helpers you might expose later:
 *
 * export const signup = (email, password) => supabase.auth.signUp({ email, password });
 */