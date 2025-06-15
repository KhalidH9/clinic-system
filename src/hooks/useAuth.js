// src/hooks/useAuth.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { logger } from '../lib/logger';
import {
  queryClient,
  setupPersistor,
  clearPersistedCache,
} from '../lib/queryClient';

const INACTIVITY_LIMIT = 30 * 60 * 1_000; // 30 min
const SESSION_LIMIT    =  8 * 60 * 60 * 1_000; // 8 h
const REFRESH_INTERVAL = 15 * 60 * 1_000; // 15 min

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInactivityModal, setShowInactivityModal] = useState(false);

  const navigate = useNavigate();

  const inactivityTimer = useRef();
  const sessionTimer    = useRef();
  const refreshTimer    = useRef();

  /* --------------------------- helpers --------------------------- */
  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(
      () => setShowInactivityModal(true),
      INACTIVITY_LIMIT - 2 * 60 * 1_000
    );
  }, []);

  const logout = useCallback(
    async (msg) => {
      logger.warn('Logging out', { msg });
      toast.error(msg);
      await supabase.auth.signOut();
      await clearPersistedCache();           // ✦ wipe cache for next user
      setUser(null);
      navigate('/login');
      window.location.reload();
    },
    [navigate]
  );

  /* -------------------------- bootstrap -------------------------- */
  useEffect(() => {
    const bootstrap = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setupPersistor(session.user.id);     // ✦ user‑scoped cache
        resetInactivityTimer();
      } else {
        navigate('/login');
      }
      setLoading(false);
    };
    bootstrap();

    /* auth change listener */
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          setupPersistor(session.user.id);   // ✦ switch cache on the fly
          resetInactivityTimer();
        } else {
          clearPersistedCache();
          setUser(null);
          navigate('/login');
        }
      }
    );

    /* global timers */
    sessionTimer.current = setTimeout(
      () => logout('Session expired after 8 hours.'),
      SESSION_LIMIT
    );
    refreshTimer.current = setInterval(async () => {
      const { error } = await supabase.auth.refreshSession();
      if (error) logout('Session refresh failed.');
    }, REFRESH_INTERVAL);

    /* activity listeners */
    const events = [
      'mousemove',
      'mousedown',
      'keypress',
      'touchstart',
      'scroll',
    ];
    events.forEach((e) => window.addEventListener(e, resetInactivityTimer));

    /* cleanup */
    return () => {
      listener?.subscription?.unsubscribe();
      clearTimeout(inactivityTimer.current);
      clearTimeout(sessionTimer.current);
      clearInterval(refreshTimer.current);
      events.forEach((e) =>
        window.removeEventListener(e, resetInactivityTimer)
      );
    };
  }, [logout, navigate, resetInactivityTimer]);

  return {
    user,
    loading,
    showInactivityModal,
    setShowInactivityModal,
    forceInactivityLogout: () =>
      logout('You were inactive for too long. Please log in again.'),
  };
};
