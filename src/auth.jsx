// src/auth.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// Helper: robust email-confirmed check (supports different Supabase fields)
function isEmailConfirmed(user) {
  if (!user) return false;
  if (user.email_confirmed_at || user.confirmed_at) return true;
  if (Array.isArray(user.identities)) {
    return user.identities.some((id) => id?.identity_data?.email && (id?.verified === true));
  }
  return false;
}

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Public method: force refresh of auth + profile
  const refresh = async () => {
    try {
      setLastError(null);
      const { data } = await supabase.auth.getSession();
      const sess = data?.session ?? null;
      setSession(sess);
      setEmailConfirmed(isEmailConfirmed(sess?.user));

      if (sess?.user?.id) {
        const { data: prof, error } = await supabase
          .from('profiles')
          .select('approved,is_admin')
          .eq('id', sess.user.id)
          .maybeSingle();
        if (error) throw error;
        setApproved(!!prof?.approved);
        setIsAdmin(!!prof?.is_admin);
      } else {
        setApproved(false);
        setIsAdmin(false);
      }
    } catch (e) {
      console.warn('[Auth] refresh error:', e);
      setLastError(e);
      // fallback conservative: tratar como no aprobado
      setApproved(false);
      setIsAdmin(false);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function prime() {
      await refresh();
    }

    prime();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess ?? null);
      setEmailConfirmed(isEmailConfirmed(sess?.user));
      // Reutilizamos refresh para mantener una sola vía de carga
      refresh();
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
      mounted = false;
    };
  }, []);

  const value = { ready, session, emailConfirmed, approved, isAdmin, refresh, lastError };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);