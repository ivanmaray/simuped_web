// src/pages/Pendiente.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../auth.jsx";
import Navbar from "../components/Navbar.jsx";

export default function Pendiente() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [emailVerified, setEmailVerified] = useState(false);
  const [approved, setApproved] = useState(null); // true/false/null
  const [checking, setChecking] = useState(true);

  async function fetchStatus() {
    try {
      setChecking(true);

      // 1) Refrescar usuario de Auth (trae email_confirmed_at actualizado si volviste del enlace)
      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (uErr) console.warn("[Pendiente] getUser error:", uErr);
      const ev = !!user?.email_confirmed_at;
      setEmailVerified(ev);

      // 2) Si no hay usuario/uid aún, salir dejando approved en null
      if (!user?.id) {
        setApproved(null);
        return;
      }

      // 3) Refrescar approved desde profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("[Pendiente] profiles select error:", error);
        setApproved(null);
      } else {
        setApproved(!!data?.approved);
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 15000);
    return () => clearInterval(t);
  }, [session?.user?.id]);

  // Si ya está todo OK, mandar a dashboard
  useEffect(() => {
    if (emailVerified && approved === true) {
      navigate("/dashboard", { replace: true });
    }
  }, [emailVerified, approved, navigate]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="public" />
      <main className="max-w-2xl mx-auto px-5 py-12">
        <h1 className="text-2xl font-semibold text-slate-900">Cuenta pendiente de aprobación</h1>
        <p className="mt-2 text-slate-700">
          Hemos recibido tu solicitud. Un administrador revisará tu cuenta.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-slate-500">Verificación de email</dt>
              <dd className="mt-1">
                {emailVerified ? "✅ Verificado" : "❌ No verificado"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Aprobación de administrador</dt>
              <dd className="mt-1">
                {approved === true ? "✅ Aprobado" : approved === false ? "⏳ Pendiente" : "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={checking}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              {checking ? "Comprobando…" : "Comprobar ahora"}
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await supabase.auth.signOut({ scope: "global" });
                } finally {
                  navigate("/", { replace: true });
                }
              }}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}