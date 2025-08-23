// src/auth.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prime() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const sess = data?.session ?? null;
        setSession(sess);
        setEmailConfirmed(Boolean(sess?.user?.email_confirmed_at));

        if (sess?.user?.id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('approved,is_admin')
            .eq('id', sess.user.id)
            .maybeSingle();
          if (!mounted) return;
          setApproved(!!prof?.approved);
          setIsAdmin(!!prof?.is_admin);
        } else {
          setApproved(false);
          setIsAdmin(false);
        }
      } finally {
        if (mounted) setReady(true);
      }
    }

    prime();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess ?? null);
      setEmailConfirmed(Boolean(sess?.user?.email_confirmed_at));
      if (sess?.user?.id) {
        supabase
          .from('profiles')
          .select('approved,is_admin')
          .eq('id', sess.user.id)
          .maybeSingle()
          .then(({ data }) => {
            setApproved(!!data?.approved);
            setIsAdmin(!!data?.is_admin);
          })
          .finally(() => setReady(true));
      } else {
        setApproved(false);
        setIsAdmin(false);
        setReady(true);
      }
    });

    return () => {
      sub?.subscription?.unsubscribe?.();
      mounted = false;
    };
  }, []);

  const value = { ready, session, emailConfirmed, approved, isAdmin };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);