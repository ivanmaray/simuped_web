// src/auth.jsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const computeEmailConfirmed = (u) => {
    if (!u) return false;
    return (
      Boolean(u.email_confirmed_at) ||
      Boolean(u.confirmed_at) ||
      (Array.isArray(u.identities) &&
        u.identities.some((id) => id?.identity_data?.email_verified))
    );
  };

  const fetchProfile = useCallback(
    async (uid) => {
      if (!uid) {
        setProfile(null);
        setApproved(false);
        setIsAdmin(false);
        return null;
      }
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("id, nombre, apellidos, dni, rol, unidad, areas_interes, approved, is_admin, updated_at")
        .eq("id", uid)
        .maybeSingle();

      if (error) {
        console.warn("[Auth] error loading profile:", error);
        setProfile(null);
        setApproved(false);
        setIsAdmin(false);
        return null;
      }
      setProfile(prof || null);
      setApproved(!!prof?.approved);
      setIsAdmin(!!prof?.is_admin);
      return prof || null;
    },
    []
  );

  const refresh = useCallback(async () => {
    const { data: sessData } = await supabase.auth.getSession();
    const session = sessData?.session ?? null;
    const u = session?.user ?? null;
    setUser(u);
    setEmailConfirmed(computeEmailConfirmed(u));
    await fetchProfile(u?.id);
  }, [fetchProfile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await refresh();
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      const u = sess?.user ?? null;
      setUser(u);
      setEmailConfirmed(computeEmailConfirmed(u));
      await fetchProfile(u?.id);
    });

    return () => {
      mounted = false;
      try {
        sub?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, [refresh, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setApproved(false);
    setIsAdmin(false);
    setEmailConfirmed(false);
  }, []);

  const value = {
    user,
    emailConfirmed,
    profile,
    approved,
    isAdmin,
    loading,
    refresh,
    refreshProfile: fetchProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export default AuthProvider;