// src/pages/Pendiente.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Pendiente() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [approved, setApproved] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      // 1) Sesión / usuario
      const { data: sessData } = await supabase.auth.getSession();
      const session = sessData?.session ?? null;
      if (!mounted) return;

      if (!session) {
        // Sin sesión → vuelve al inicio
        navigate("/", { replace: true });
        return;
      }

      setEmail(session.user.email || "");

      // 2) Email confirmado
      const { data: userData } = await supabase.auth.getUser();
      const confirmed = !!userData?.user?.email_confirmed_at;
      setEmailConfirmed(confirmed);

      // 3) ¿Aprobado por admin?
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profErr) {
        console.warn("[Pendiente] error cargando perfil:", profErr);
      }
      setApproved(!!prof?.approved);

      setLoading(false);

      // 4) Si todo ok → a /dashboard
      if (confirmed && prof?.approved) {
        navigate("/dashboard", { replace: true });
      }
    })();

    return () => { mounted = false; };
  }, [navigate]);

  async function reenviarEmail() {
    setMsg("");
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      setMsg("No se pudo reenviar el email. Inténtalo de nuevo.");
    } else {
      setMsg("Te hemos reenviado el email de verificación.");
    }
  }

  async function salir() {
    await supabase.auth.signOut();
    // Limpieza por si acaso
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    navigate("/", { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-700">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-xl mx-auto px-5 py-12">
        <h1 className="text-2xl font-semibold mb-3">Cuenta pendiente de aprobación</h1>
        <p className="text-slate-700">
          Hemos recibido tu solicitud. Revisaremos tu cuenta en breve.
        </p>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-700">
            <strong>Email:</strong> {email || "—"}
          </p>
          <p className="text-sm mt-2">
            <strong>Verificación de email:</strong>{" "}
            {emailConfirmed ? "Verificado ✅" : "Pendiente ⏳"}
          </p>
          <p className="text-sm mt-1">
            <strong>Aprobación de administrador:</strong>{" "}
            {approved ? "Aprobado ✅" : "Pendiente ⏳"}
          </p>

          {!emailConfirmed && (
            <button
              onClick={reenviarEmail}
              className="mt-4 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
            >
              Reenviar email de verificación
            </button>
          )}

          <div className="mt-4 text-sm text-slate-700">{msg}</div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
            >
              Volver al inicio
            </button>
            <button
              onClick={salir}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}