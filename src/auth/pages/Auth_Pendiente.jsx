// src/pages/Pendiente.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import Navbar from "../../components/Navbar.jsx";

/**
 * Optimizaciones clave para que no "tarde tanto":
 * 1) Menos llamadas: ya no hacemos refreshSession en bucle.
 * 2) Polling ligero con backoff y parada temprana (verificado → más lento; aprobado → paramos).
 * 3) Suscripción Realtime a profiles (id = user.id) para enterarnos AL INSTANTE
 *    cuando el admin aprueba (requiere Realtime habilitado en la tabla).
 * 4) Un solo SELECT al perfil por id; sólo si falla probamos email como fallback.
 */

// URL de retorno tras verificar
const REDIRECT_TO =
  typeof window !== "undefined"
    ? `${window.location.origin}/pendiente`
    : undefined;

function fmt(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt || "");
  }
}

export default function Auth_Pendiente() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [verified, setVerified] = useState(false);

  const [approved, setApproved] = useState(null); // true/false/null
  const [approvedAt, setApprovedAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [emailConfirmedAtRaw, setEmailConfirmedAtRaw] = useState(null);

  // Timers y canales
  const pollTimer = useRef(null);
  const backoffMs = useRef(1000); // 1s inicial; luego 2s, 3s, tope 10s
  const realtimeChan = useRef(null);

  const nextStep = useMemo(() => {
    if (verified && approved) return "Todo listo. Puedes entrar.";
    if (!verified) return "Verifica tu email para continuar.";
    if (!approved) return "Esperando aprobación del administrador.";
    return "";
  }, [verified, approved]);

  // Arranque: cargar usuario + perfil una vez
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      await primeUserAndProfile(); // primer disparo
      if (!mounted) return;

      // Suscripción a cambios de sesión (evita refrescos manuales continuos)
      const { data: subAuth } = supabase.auth.onAuthStateChange((evt, sess) => {
        // Cuando cambie el token o se confirme email, volvemos a leer rápido
        if (evt === "SIGNED_IN" || evt === "USER_UPDATED" || evt === "TOKEN_REFRESHED") {
          safePrimeUserAndProfile();
        }
      });

      // Suscripción Realtime para aprobación instantánea (si ya tenemos userId)
      if (userId) {
        attachRealtime(userId);
      }

      // Polling con backoff suave sólo mientras falte algo
      schedulePoll();

      setLoading(false);

      // Limpieza
      return () => {
        mounted = false;
        try { subAuth?.subscription?.unsubscribe?.(); } catch {}
        clearTimer();
        detachRealtime();
      };
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si conseguimos userId más tarde (p.ej., venimos sin sesión y luego inicia),
  // adjuntamos Realtime entonces.
  useEffect(() => {
    if (!userId) return;
    attachRealtime(userId);
    return () => detachRealtime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, verified]);

  async function primeUserAndProfile() {
    setErrorMsg("");

    // 1) Usuario actual
    const { data: userRes, error: uErr } = await supabase.auth.getUser();
    if (uErr) {
      console.warn("[Pendiente] getUser error:", uErr);
    }
    const user = userRes?.user || null;
    setEmailConfirmedAtRaw(user?.email_confirmed_at || null);

    if (!user) {
      // Sin sesión: mostramos lo que sepamos y no seguimos tirando de perfil
      const pendingEmail = localStorage.getItem("pending_email") || "";
      setEmail(pendingEmail);
      setUserId("");
      setVerified(false);
      setApproved(null);
      setApprovedAt(null);
      return;
    }

    setEmail(user.email || "");
    try { localStorage.setItem("pending_email", user.email || ""); } catch {}
    setUserId(user.id || "");
    const isVerified = !!user.email_confirmed_at;
    setVerified(isVerified);

    // 2) Perfil (approved)
    const prof = await getProfileByIdOrEmail(user.id, user.email);
    if (prof) {
      setApproved(!!prof.approved);
      setApprovedAt(prof.approved_at || null);
    } else {
      setApproved(null);
      setApprovedAt(null);
    }

    // 3) Redirección inmediata si todo OK
    if (isVerified && prof?.approved) {
      navigate("/dashboard", { replace: true });
    }
  }

  function safePrimeUserAndProfile() {
    // Evita solapes si ya hay uno en curso
    if (checking) return;
    setChecking(true);
    primeUserAndProfile().finally(() => setChecking(false));
  }

  async function getProfileByIdOrEmail(uid, mail) {
    // Intento por id (rápido, 1 llamada)
    let { data: byId, error: e1 } = await supabase
      .from("profiles")
      .select("id, email, approved, approved_at, updated_at")
      .eq("id", uid)
      .maybeSingle();

    if (!e1 && byId) return byId;

    // Fallback por email si por alguna razón el id aún no cuadra
    let { data: byEmail, error: e2 } = await supabase
      .from("profiles")
      .select("id, email, approved, approved_at, updated_at")
      .eq("email", mail)
      .maybeSingle();

    if (e2) {
      console.warn("[Pendiente] profiles por email error:", e2);
    }
    return byEmail || null;
  }

  function clearTimer() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function schedulePoll() {
    clearTimer();
    // Si ya está todo listo, no seguimos
    if (verified && approved) return;

    // Backoff: 1s → 2s → 3s … tope 10s
    const ms = Math.min(backoffMs.current, 10000);
    pollTimer.current = setTimeout(async () => {
      await primeUserAndProfile();
      // Si ya verificó el email, espaciamos más aún
      if (verified) {
        backoffMs.current = Math.min(backoffMs.current + 2000, 10000);
      } else {
        backoffMs.current = Math.min(backoffMs.current + 1000, 8000);
      }
      schedulePoll();
    }, ms);
  }

  function attachRealtime(uid) {
    // Evitar duplicados
    detachRealtime();
    realtimeChan.current = supabase
      .channel(`profile-approve-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
        (payload) => {
          const row = payload.new || {};
          setApproved(!!row.approved);
          setApprovedAt(row.approved_at || null);
          // Si ya está verificado y ahora aprobado → ir al panel
          if (verified && row.approved) {
            navigate("/dashboard", { replace: true });
          }
        }
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          // No bloqueamos nada si la subscripción tarda; el polling hará su trabajo
          // pero normalmente llega en milisegundos.
        }
      });
  }

  function detachRealtime() {
    if (realtimeChan.current) {
      try {
        supabase.removeChannel(realtimeChan.current);
      } catch {}
      realtimeChan.current = null;
    }
  }

  async function handleCheckNow() {
    setChecking(true);
    try {
      // Renovamos sesión una vez y refrescamos estados.
      await supabase.auth.refreshSession();
      await primeUserAndProfile();
    } catch (e) {
      console.error("[Pendiente] checkNow error:", e);
      setErrorMsg("No se pudo actualizar la sesión.");
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setChecking(true);
    try {
      const target = (email || localStorage.getItem("pending_email") || "").trim();
      if (!target) {
        alert("No tenemos un email para reenviar. Vuelve a iniciar sesión.");
        return;
      }
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: target,
        options: REDIRECT_TO ? { emailRedirectTo: REDIRECT_TO } : undefined,
      });
      if (error) throw error;
      alert("Te hemos enviado de nuevo el correo de verificación. Revisa tu bandeja y spam.");
    } catch (e) {
      console.error("[Pendiente] resend error:", e);
      setErrorMsg(e.message || "No se pudo reenviar el correo ahora.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar variant="public" />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Estado de tu acceso</h1>
        <p className="text-slate-600 mb-6 text-lg">{nextStep}</p>

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-2 text-sm">
            {errorMsg}
          </div>
        )}

        <div className="space-y-5">
          {/* Verificación de email */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">Verificación de email</div>
                <div className="mt-1 text-slate-800">
                  {email ? <span className="font-medium text-base">{email}</span> : "—"}
                </div>
              </div>
              <div className={`text-lg md:text-xl ${verified ? "text-emerald-600" : "text-rose-600"}`}>
                {verified ? "✔ Email verificado" : "❌ Email no verificado"}
              </div>
            </div>

            {!verified && (
              <div className="mt-3 text-sm text-slate-600 space-y-2">
                <p>Revisa tu bandeja de entrada y spam. Si ya has hecho clic en el enlace, pulsa “Comprobar ahora”.</p>
                <p className="text-xs text-slate-500">
                  Si tras unos minutos no se actualiza, <strong>cierra sesión y vuelve a entrar</strong>.
                </p>
                <button onClick={handleResend} disabled={checking} className="text-[#1a69b8] underline disabled:opacity-60">
                  {checking ? "Enviando…" : "Reenviar verificación"}
                </button>
              </div>
            )}
          </section>

          {/* Aprobación admin */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500">Aprobación de administrador</div>
                <div className="mt-1 text-slate-800 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm font-medium ${
                      approved
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {approved ? "✔ Aprobado" : "Pendiente"}
                  </span>
                  {approvedAt && <span className="text-xs text-slate-500">· desde {fmt(approvedAt)}</span>}
                </div>
              </div>
              <div className={`text-lg md:text-xl ${approved ? "text-emerald-600" : "text-amber-600"}`}>{approved ? "✔" : "—"}</div>
            </div>
            {!approved && (
              <p className="mt-2 text-xs text-slate-500">
                Si tu cuenta ya aparece aprobada pero sigues sin poder entrar, verifica tu email y pulsa <em>Comprobar ahora</em>.
              </p>
            )}
          </section>
        </div>

        <div className="mt-6 flex items-center gap-3 flex-wrap">
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
            onClick={() => navigate("/dashboard")}
            disabled={!(verified && approved)}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-95 disabled:opacity-40"
          >
            Ir al panel
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
            className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-4">
          Tras confirmar el correo, esta pantalla puede tardar un poco en actualizarse. Si no cambia, <strong>cierra sesión y vuelve a entrar</strong>.
        </p>
      </main>
    </div>
  );
}