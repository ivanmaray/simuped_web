// src/pages/Pendiente.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

export default function Pendiente() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [verified, setVerified] = useState(false);
  const [approved, setApproved] = useState(null); // true/false/null
  const [approvedAt, setApprovedAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const tries = useRef(0);
  const pollTimer = useRef(null);
  const didFirstRefresh = useRef(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Primer refresh de sesión al aterrizar (por si venimos del enlace de verificación)
      try {
        if (!didFirstRefresh.current) {
          await supabase.auth.refreshSession();
          didFirstRefresh.current = true;
        }
      } catch (e) {
        console.warn("[Pendiente] refreshSession inicial falló:", e);
      }

      await refreshStates();
      setLoading(false);

      // Autopoll hasta 60s (15 intentos cada 4s)
      clearInterval(pollTimer.current);
      pollTimer.current = setInterval(async () => {
        tries.current += 1;
        if (tries.current > 15) {
          clearInterval(pollTimer.current);
          return;
        }
        await refreshStates();
      }, 4000);
    })();

    return () => clearInterval(pollTimer.current);
  }, []);

  async function refreshStates() {
    try {
      setErrorMsg("");
      setChecking(true);

      // 1) Usuario actual (email / verificado)
      const { data: userRes, error: uErr } = await supabase.auth.getUser();
      if (uErr) {
        console.warn("[Pendiente] getUser error:", uErr);
      }
      const user = userRes?.user || null;

      // Si no hay sesión (p.ej. email no verificado y Auth bloquea login), intenta mostrar email recordado
      if (!user) {
        const pendingEmail = localStorage.getItem('pending_email') || '';
        setEmail(pendingEmail);
        setUserId("");
        setVerified(false);
        setApproved(null);
        setApprovedAt(null);
        setChecking(false);
        return;
      }

      setEmail(user.email || "");
      setUserId(user.id || "");
      const isVerified = !!user.email_confirmed_at;
      setVerified(isVerified);

      // 2) Approved en profiles (preferir id; fallback por email si hubiese desajuste)
      let prof = null;
      let pErr = null;

      const byId = await supabase
        .from("profiles")
        .select("id, email, approved, approved_at, updated_at")
        .eq("id", user.id)
        .maybeSingle();

      pErr = byId.error; prof = byId.data;

      if (pErr || !prof) {
        console.warn("[Pendiente] profiles by id no encontrado o error, probando por email", pErr);
        const byEmail = await supabase
          .from("profiles")
          .select("id, email, approved, approved_at, updated_at")
          .eq("email", user.email)
          .maybeSingle();
        pErr = byEmail.error; prof = byEmail.data;
      }

      if (pErr) {
        console.warn("[Pendiente] profiles select error:", pErr);
        setApproved(null);
        setApprovedAt(null);
      } else {
        setApproved(!!prof?.approved);
        setApprovedAt(prof?.approved_at || null);
      }

      // 3) Redirigir si todo OK
      if (isVerified && prof?.approved) {
        navigate("/dashboard", { replace: true });
      }
    } catch (e) {
      console.error("[Pendiente] refreshStates excepción:", e);
      setErrorMsg(e.message || "No se pudo comprobar el estado actualmente.");
    } finally {
      setChecking(false);
    }
  }

  async function handleCheckNow() {
    setChecking(true);
    try {
      await supabase.auth.refreshSession();
      await refreshStates();
    } catch (e) {
      console.error("[Pendiente] checkNow error:", e);
      setErrorMsg("No se pudo actualizar la sesión.");
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    try {
      const target = email || localStorage.getItem('pending_email') || '';
      if (!target) return;
      await supabase.auth.resend({ type: 'signup', email: target });
      alert('Hemos reenviado el correo de verificación. Revisa tu bandeja y spam.');
    } catch (e) {
      console.error('[Pendiente] resend error:', e);
      alert('No se pudo reenviar el correo ahora.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar variant="public" />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Cuenta pendiente de aprobación</h1>
        <p className="text-slate-600 mb-6">
          Hemos recibido tu solicitud. Un administrador revisará tu cuenta.
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-2 text-sm">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">Verificación de email</div>
                <div className="mt-1 text-slate-800">
                  {email ? <span className="font-medium">{email}</span> : "—"}
                  <div className="text-xs text-slate-500">{userId ? `UID: ${userId}` : ''}</div>
                </div>
              </div>
              <div className={`text-lg ${verified ? "text-emerald-600" : "text-rose-600"}`}>
                {verified ? "✔ Email verificado" : "❌ Email no verificado"}
              </div>
            </div>
            {!verified && (
              <div className="mt-3 text-sm text-slate-600 space-y-2">
                <p>Revisa tu bandeja de entrada y spam. Si ya has hecho clic en el enlace, pulsa “Comprobar ahora”.</p>
                <button onClick={handleResend} className="text-[#1a69b8] underline">Reenviar verificación</button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Aprobación de administrador</div>
                <div className="mt-1 text-slate-800 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm font-medium ${approved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {approved ? '✔ Aprobado' : 'Pendiente'}
                  </span>
                  {approvedAt && (
                    <span className="text-xs text-slate-500">· desde {new Date(approvedAt).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className={`text-lg ${approved ? 'text-emerald-600' : 'text-amber-600'}`}>{approved ? '✔' : '—'}</div>
            </div>
            {!approved && (
              <p className="mt-2 text-xs text-slate-500">
                Si tu cuenta ya aparece aprobada pero sigues sin poder entrar, verifica tu email y pulsa <em>Comprobar ahora</em>.
              </p>
            )}
          </section>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCheckNow}
            disabled={checking || loading}
            className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            {checking ? "Comprobando…" : "Comprobar ahora"}
          </button>

          <button
            type="button"
            onClick={async () => { try { await supabase.auth.signOut({ scope: "global" }); } finally { navigate("/", { replace: true }); } }}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95"
          >
            Cerrar sesión
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-4">
          Esta página se actualiza automáticamente durante unos segundos tras confirmar el correo.
        </p>
      </main>
    </div>
  );
}