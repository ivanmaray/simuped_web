// src/pages/Pendiente.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Pendiente() {
  const [params] = useSearchParams();
  const reason = params.get("reason") || "";
  const [status, setStatus] = useState({ loading: true, approved: false, isAdmin: false, emailConfirmed: false, error: null, email: "" });
  const navigate = useNavigate();

  const mensaje = useMemo(() => {
    if (reason === "email") return { title: "Email no confirmado", desc: "Revisa tu correo y confirma tu email para poder acceder." };
    if (reason === "approval") return { title: "Cuenta pendiente de aprobación", desc: "Un administrador debe aprobar tu cuenta. Te avisaremos en cuanto esté lista." };
    if (reason === "profile") return { title: "No se pudo leer tu perfil", desc: "Estamos teniendo problemas para leer tu perfil. Inténtalo en unos minutos." };
    if (reason === "error") return { title: "Error inesperado", desc: "Ocurrió un error. Intenta de nuevo más tarde." };
    return { title: "Cuenta pendiente de aprobación", desc: "Hemos recibido tu solicitud. Revisaremos tu cuenta en breve." };
  }, [reason]);

  async function fetchStatus() {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const session = sess?.session ?? null;
      const email = session?.user?.email || "";
      const userId = session?.user?.id || null;

      const { data: userData } = await supabase.auth.getUser();
      const emailConfirmed = !!userData?.user?.email_confirmed_at;

      let approved = false, isAdmin = false;
      if (userId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("approved, is_admin")
          .eq("id", userId)
          .maybeSingle();
        approved = !!prof?.approved;
        isAdmin = !!prof?.is_admin;
      }

      setStatus({ loading: false, approved, isAdmin, emailConfirmed, error: null, email });

      // si ya cumple, al dashboard solo si email confirmado
      if (emailConfirmed && (approved || isAdmin)) {
        navigate("/dashboard", { replace: true });
      }
    } catch (e) {
      console.error("[Pendiente] error:", e);
      setStatus((s) => ({ ...s, loading: false, error: e }));
    }
  }

  useEffect(() => {
    let mounted = true;
    fetchStatus();
    const interval = setInterval(() => { if (mounted) fetchStatus(); }, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold text-slate-900">{mensaje.title}</h1>
        <p className="text-slate-700 mt-2">{mensaje.desc}</p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-slate-700"><span className="font-medium">Email:</span> {status.email || "—"}</p>
          <p className="text-slate-700 mt-1">
            <span className="font-medium">Verificación de email:</span>{" "}
            {status.emailConfirmed ? "Verificado ✅" : "No verificado ⏳"}
          </p>
          <p className="text-slate-700 mt-1">
            <span className="font-medium">Aprobación de administrador:</span>{" "}
            {status.approved || status.isAdmin ? "Aprobado ✅" : "Pendiente ⏳"}
          </p>

          {!status.emailConfirmed && (
            <button
              className="mt-4 px-4 py-2 rounded-lg bg-slate-900 text-white"
              onClick={async () => {
                const { data: u } = await supabase.auth.getUser();
                const email = u?.user?.email;
                if (email) {
                  await supabase.auth.resend({
                    type: "signup",
                    email,
                    options: { emailRedirectTo: window.location.origin }
                  });
                  alert("Te hemos reenviado el email de verificación.");
                }
              }}
            >
              Reenviar verificación
            </button>
          )}

          <div className="mt-6 flex gap-3">
            <button
              className="px-4 py-2 rounded-lg border border-slate-300"
              onClick={fetchStatus}
            >
              Comprobar ahora
            </button>
            <Link className="px-4 py-2 rounded-lg border border-slate-300" to="/">
              Volver al inicio
            </Link>
            <button
              className="px-4 py-2 rounded-lg bg-white text-slate-900 border border-slate-300"
              onClick={async () => {
                await supabase.auth.signOut({ scope: "global" });
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = "/";
              }}
            >
              Cerrar sesión
            </button>
          </div>

          <p className="text-slate-500 text-sm mt-4">
            Esta página comprueba tu estado automáticamente cada 15 segundos.
          </p>
        </div>
      </div>
    </div>
  );
}