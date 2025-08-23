// src/pages/Pendiente.jsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth";
import { supabase } from "../supabaseClient";

export default function Pendiente() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason"); // "email" | "approval" | null

  const { user, emailConfirmed, approved, loading } = useAuth();

  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");

  // Si ya está todo OK, manda a /dashboard
  useEffect(() => {
    if (!loading && user && emailConfirmed && approved) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, emailConfirmed, approved, navigate]);

  async function resendEmail() {
    if (!user?.email) return;
    try {
      setSending(true);
      setErr("");
      setInfo("");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      if (error) throw error;
      setInfo("Correo de verificación reenviado. Revisa tu bandeja de entrada.");
    } catch (e) {
      console.error("[Pendiente] resend error:", e);
      setErr(e?.message || "No se pudo reenviar el correo.");
    } finally {
      setSending(false);
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/", { replace: true });
    }
  }

  const isEmailPending = reason === "email" || (!emailConfirmed && !loading);
  const isApprovalPending = reason === "approval" || (emailConfirmed && !approved && !loading);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-xl mx-auto px-6 py-14">
        <h1 className="text-2xl font-semibold mb-2">Cuenta pendiente</h1>

        {isEmailPending && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
            <p className="text-slate-700">
              Tu correo aún no está confirmado. Hemos enviado un email de verificación.
            </p>
            <p className="text-slate-600 mt-2">
              Si no lo encuentras, puedes reenviarlo:
            </p>
            <button
              onClick={resendEmail}
              disabled={sending}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
            >
              {sending ? "Enviando…" : "Reenviar verificación"}
            </button>
          </div>
        )}

        {isApprovalPending && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4">
            <p className="text-slate-700">
              Tu cuenta está pendiente de aprobación por un administrador.
            </p>
            <p className="text-slate-600 mt-2">
              Te avisaremos cuando esté lista. Puedes volver más tarde.
            </p>
          </div>
        )}

        {info && <div className="mb-3 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">{info}</div>}
        {err && <div className="mb-3 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{err}</div>}

        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => navigate("/", { replace: true })}
            className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            Ir al inicio
          </button>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    </div>
  );
}