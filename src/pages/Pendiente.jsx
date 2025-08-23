// src/pages/Pendiente.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

export default function Pendiente() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState(null);
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");

  async function fetchStatus() {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      console.debug("[Pendiente] getUser ->", { hasUser: !!userData?.user, userErr });
      if (userErr) throw userErr;

      const u = userData?.user ?? null;
      setUser(u);

      // si no hay sesión → a inicio
      if (!u) {
        navigate("/", { replace: true });
        return;
      }

      const emailOk = Boolean(
        u?.email_confirmed_at ||
        u?.confirmed_at ||
        (Array.isArray(u?.identities) && u.identities.some((i) => i?.email_verified || i?.identity_data?.email_verified))
      );

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("approved,is_admin,updated_at,nombre,apellidos,rol,unidad")
        .eq("id", u.id)
        .maybeSingle();
      console.debug("[Pendiente] profiles.maybeSingle ->", { prof, profErr });

      if (profErr) throw profErr;
      setPerfil(prof);

      // fallback: si no hay fila en profiles, intenta metadata (por si la fila aún no existe)
      const metaAdmin = Boolean(u?.user_metadata?.is_admin);
      const metaApproved = Boolean(u?.user_metadata?.approved);

      // si es admin, pasa siempre; si está aprobado y email verificado, pasa también
      if (prof?.is_admin || metaAdmin) {
        console.debug("[Pendiente] Admin detectado → redirigiendo a /dashboard");
        navigate("/dashboard", { replace: true });
        return;
      }
      if (emailOk && (prof?.approved || metaApproved)) {
        console.debug("[Pendiente] Email verificado y cuenta aprobada → /dashboard");
        navigate("/dashboard", { replace: true });
        return;
      }
    } catch (e) {
      if (e?.status === 401 || e?.message?.toLowerCase?.().includes("token")) {
        console.warn("[Pendiente] Sesión inválida, cerrando sesión…");
        try { await supabase.auth.signOut(); } catch {}
        navigate("/", { replace: true });
        return;
      }
      console.error("[Pendiente] error:", e);
      setErr("No se pudo comprobar el estado de tu cuenta.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;
      setLoading(true);
      await fetchStatus();
    })();

    const interval = setInterval(fetchStatus, 15000); // reintenta cada 15s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const email = user?.email ?? "(desconocido)";
  const emailVerificado = Boolean(
    user?.email_confirmed_at ||
    user?.confirmed_at ||
    (Array.isArray(user?.identities) && user.identities.some((i) => i?.email_verified || i?.identity_data?.email_verified))
  );
  const admin = Boolean(perfil?.is_admin || user?.user_metadata?.is_admin);
  const aprobado = Boolean(perfil?.approved || user?.user_metadata?.approved);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-2">Cuenta pendiente de aprobación</h1>
          <p className="text-slate-700 mb-6">
            Hemos recibido tu solicitud. Un administrador revisará tu cuenta en breve.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded-full text-xs ring-1 ${emailVerificado ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-amber-200"}`}>
              {emailVerificado ? "Email verificado" : "Email no verificado"}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs ring-1 ${aprobado || admin ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-700 ring-slate-200"}`}>
              {admin ? "Administrador" : (aprobado ? "Aprobado" : "Pendiente")}
            </span>
          </div>

          {err && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {err}
            </div>
          )}

          <div className="space-y-2 text-sm bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p>
              <span className="font-medium">Email:</span> {email}
            </p>
            <p>
              <span className="font-medium">Verificación de email:</span>{" "}
              {emailVerificado ? "Verificado ✅" : "No verificado ⏳"}
            </p>
            <p>
              <span className="font-medium">Aprobación de administrador:</span>{" "}
              {admin ? "Administrador ✅" : aprobado ? "Aprobado ✅" : "Pendiente ⏳"}
            </p>
            {perfil?.updated_at && (
              <p className="text-slate-500">
                Última revisión: {new Date(perfil.updated_at).toLocaleString()}
              </p>
            )}
          </div>

          {!emailVerificado && (
            <form
              className="mt-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setErr("");
                try {
                  const { error } = await supabase.auth.resend({
                    type: "signup",
                    email,
                  });
                  if (error) throw error;
                  // Notifica sin bloquear la UI
                  console.info("[Pendiente] email de verificación reenviado");
                  setErr("");
                } catch (e) {
                  console.error(e);
                  setErr("No se pudo reenviar el email de verificación.");
                }
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90"
              >
                Reenviar email de verificación
              </button>
            </form>
          )}

          <form
            className="mt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              await fetchStatus();
            }}
          >
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-lg border ${loading ? "opacity-60 cursor-not-allowed" : "hover:bg-slate-50"} border-slate-300`}
            >
              {loading ? "Comprobando…" : "Comprobar ahora"}
            </button>
          </form>

          <p className="text-xs text-slate-500 mt-6">
            Esta página comprueba tu estado automáticamente cada 15 segundos.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Link
              to="/"
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              Volver al inicio
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}