// src/auth.jsx
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

/**
 * Robust AuthProvider
 * - Exposes: user, emailConfirmed, profile, approved, isAdmin, loading
 * - Provides: refresh(), refreshProfile(), signOut()
 * - Handles: session changes, profile loading, resilient email-confirmed detection
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Small helper to clear local client auth state and storage
  function clearClientState() {
    try { localStorage.removeItem("sb-" + new URL(supabase.supabaseUrl).host + "-auth-token"); } catch {}
    try { sessionStorage.clear(); } catch {}
    setUser(null);
    setProfile(null);
    setApproved(false);
    setIsAdmin(false);
    setEmailConfirmed(false);
  }

  // Compute email confirmed from multiple possible fields (magic link, OAuth, etc)
  const computeEmailConfirmed = useCallback((u) => {
    if (!u) return false;
    // Most reliable flags from Supabase user object
    const direct =
      !!u.email_confirmed_at ||
      !!u.confirmed_at ||
      !!u.phone_confirmed_at;

    // Some providers put this under identities[*].identity_data.email_verified
    const identitiesVerified =
      Array.isArray(u.identities) &&
      u.identities.some((id) => id?.identity_data?.email_verified === true);

    // Also check user_metadata (depending on auth flow)
    const metaVerified =
      !!u.user_metadata?.email_verified || !!u.app_metadata?.email_verified;

    return direct || identitiesVerified || metaVerified;
  }, []);

  // Load profile for the given uid (null-safe)
  const fetchProfile = useCallback(async (uid) => {
    console.debug("[Auth] fetchProfile for uid:", uid);
    if (!uid) {
      setProfile(null);
      setApproved(false);
      setIsAdmin(false);
      return null;
    }

    const { data: prof, error } = await supabase
      .from("profiles")
      .select(
        "id, nombre, apellidos, dni, rol, unidad, areas_interes, approved, is_admin, updated_at"
      )
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      console.error("[Auth] error loading profile:", error);
      setProfile(null);
      setApproved(false);
      setIsAdmin(false);
      return null;
    }

    setProfile(prof || null);
    setApproved(!!prof?.approved);
    setIsAdmin(!!prof?.is_admin);
    return prof || null;
  }, []);

  // Refresh session + profile (public method)
  const refresh = useCallback(async () => {
    console.debug("[Auth] refresh() start");
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn("[Auth] getSession error:", error);
      }
      const sess = data?.session ?? null;
      const u = sess?.user ?? null;

      if (!u) {
        // No sesión válida: limpiamos y mandamos al login público
        clearClientState();
        setLoading(false);
        try { await supabase.auth.signOut(); } catch {}
        navigate("/", { replace: true });
        return;
      }

      setUser(u);
      setEmailConfirmed(computeEmailConfirmed(u));
      await fetchProfile(u.id);
    } catch (e) {
      console.error("[Auth] refresh() exception:", e);
      clearClientState();
      setLoading(false);
      navigate("/", { replace: true });
      return;
    } finally {
      setLoading(false);
      console.debug("[Auth] refresh() end -> loading=false");
    }
  }, [computeEmailConfirmed, fetchProfile, navigate]);

  // Initial load + subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    (async () => {
      await refresh(); // refresh already sets loading=false in finally
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      const u = sess?.user ?? null;
      console.debug("[Auth] onAuthStateChange user:", u?.id || null);
      if (!u) {
        clearClientState();
        if (mounted) setLoading(false);
        navigate("/", { replace: true });
        return;
      }
      setUser(u);
      setEmailConfirmed(computeEmailConfirmed(u));
      await fetchProfile(u.id);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      try {
        sub?.subscription?.unsubscribe?.();
      } catch {
        /* no-op */
      }
    };
  }, [refresh, computeEmailConfirmed, fetchProfile, navigate]);

  // Sign out helper
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      clearClientState();
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Memoized context value to avoid unnecessary renders
  const value = useMemo(
    () => ({
      user,
      emailConfirmed,
      profile,
      approved,
      isAdmin,
      loading,
      ready: !loading && !!user,
      refresh,
      refreshProfile: fetchProfile,
      signOut,
    }),
    [user, emailConfirmed, profile, approved, isAdmin, loading, refresh, fetchProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export default AuthProvider;