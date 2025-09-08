// /src/pages/PresencialInstructor.jsx
// Ruta esperada: /presencial/instructor/:id/:sessionId  (id = escenario)
// También soporta: /presencial/instructor
import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

const CHECK_STATUSES = [
  { key: 'ok', label: 'Bien', icon: '✔️' },
  { key: 'wrong', label: 'Mal', icon: '✖️' },
  { key: 'missed', label: 'No hecho', icon: '⬜' },
  { key: 'na', label: 'N/A', icon: '∅' },
];

console.debug('[Instructor] componente v2 cargado');

const colors = {
  primary: "#0A3D91",
  primaryLight: "#4FA3E3",
  accent: "#1E6ACB",
};
const LS_KEY = 'presencial:last_session';

export default function PresencialInstructor() {
  const { id, sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [scenario, setScenario] = useState(null); // {id,title,summary}
  const [steps, setSteps] = useState([]); // scenario_steps
  const [variables, setVariables] = useState([]); // scenario_variables

  const [session, setSession] = useState(null); // presencial_sessions row
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef(null);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);

  // NUEVO: estado UI -> fase y banner
  const [currentStepId, setCurrentStepId] = useState(null);
  const [bannerText, setBannerText] = useState("");

  // Variables reveladas (para marcar botones activos)
  const [revealed, setRevealed] = useState(new Set());
  // Checklist
  const [checklist, setChecklist] = useState([]); // scenario_checklist
  const [checkStatus, setCheckStatus] = useState({}); // {item_id: 'ok'|'wrong'|'missed'|'na'}
  const [checkNotes, setCheckNotes] = useState({}); // {item_id: string}

  // Listado para creación de sesión si faltan params
  const [scenarios, setScenarios] = useState([]);
  const [creating, setCreating] = useState(false);
  const [creatingFor, setCreatingFor] = useState(null);
  const [listError, setListError] = useState("");

  const publicUrl = useMemo(() => {
    if (!session?.public_code) return null;
    return `${window.location.origin}/presencial-alumno/${session.public_code}`;
    // Si tu ruta de alumnos fuera /presencial/a/:code, usa esto:
    // return `${window.location.origin}/presencial/a/${session.public_code}`;
  }, [session?.public_code]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Intento de reanudar última sesión abierta (persistencia local)
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const last = JSON.parse(raw);
            if (last && last.id && last.scenario_id) {
              // Comprobar si sigue abierta (o si no hay columna ended_at, al menos que exista)
              const { data: s0 } = await supabase
                .from('presencial_sessions')
                .select('id, scenario_id, ended_at')
                .eq('id', last.id)
                .maybeSingle();
              if (s0 && (!Object.prototype.hasOwnProperty.call(s0, 'ended_at') || !s0.ended_at)) {
                navigate(`/presencial/instructor/${s0.scenario_id}/${s0.id}`, { replace: true });
                return; // detenemos aquí para no cargar el selector
              } else {
                // Si está cerrada, limpia el registro local
                localStorage.removeItem(LS_KEY);
              }
            }
          }
        } catch {}
        // Si faltan parámetros, mostrar selector de escenarios
        if (!id || !sessionId) {
          setLoading(true);
          setScenario(null);
          setSession(null);
          setSteps([]);
          setVariables([]);
          setErrorMsg("");
          const { data: scs, error: scsErr } = await supabase
            .from("scenarios")
            .select("id,title,summary,estimated_minutes,level")
            .order("created_at", { ascending: false })
            .limit(20);
          if (scsErr) throw scsErr;
          if (mounted) setScenarios(scs || []);
          setLoading(false);
          return;
        }

        // 1) Escenario
        const { data: sc, error: scErr } = await supabase
          .from("scenarios")
          .select("id,title,summary")
          .eq("id", id)
          .maybeSingle();
        if (scErr) throw scErr;
        if (mounted) setScenario(sc);

        // 2) Sesión (ahora también banner_text y current_step_id)
        const { data: s, error: sErr } = await supabase
          .from("presencial_sessions")
          .select("*")
          .eq("id", sessionId)
          .maybeSingle();
        if (sErr) throw sErr;
        if (mounted && s) {
          setSession(s);
          setBannerText(s.banner_text || "");
          setCurrentStepId(s.current_step_id || null);
          // si existen columnas de tiempo, úsalas; si no, ignora
          if (Object.prototype.hasOwnProperty.call(s, "started_at")) {
            setStartedAt(s.started_at || null);
          }
          if (Object.prototype.hasOwnProperty.call(s, "ended_at")) {
            setEndedAt(s.ended_at || null);
          }
          // Ajustar temporizador si ya estaba finalizada
          if (s && s.started_at && s.ended_at) {
            try {
              const t0 = new Date(s.started_at).getTime();
              const t1 = new Date(s.ended_at).getTime();
              setElapsedSec(Math.max(0, Math.floor((t1 - t0) / 1000)));
            } catch {}
          }
          // Guardar como última sesión (para recuperación) si no está finalizada
          try {
            if (!s.ended_at) {
              localStorage.setItem(LS_KEY, JSON.stringify({ id: s.id, scenario_id: s.scenario_id }));
            }
          } catch {}
        }

        // 3) Pasos
        const { data: st, error: stErr } = await supabase
          .from("scenario_steps")
          .select("id, name, order_index")
          .eq("scenario_id", id)
          .order("order_index", { ascending: true });
        if (stErr) throw stErr;
        if (mounted) {
          setSteps(st || []);
          if (!s?.current_step_id && st && st.length > 0) {
            // si no hay paso en sesión aún, preseleccionar el primero solo en UI
            setCurrentStepId((prev) => prev ?? st[0].id);
          }
        }

        // 4) Variables
        const { data: vars, error: vErr } = await supabase
          .from("scenario_variables")
          .select("id, key, label, unit, type, initial_value")
          .eq("scenario_id", id)
          .order("id", { ascending: true });
        if (vErr) throw vErr;
        if (mounted) setVariables(vars || []);
        // 4b) Cargar variables reveladas actuales para marcar UI
        if (s && s.id) {
          await refreshRevealed(s.id);
        }
        // 5) Checklist (tolerante: si no existen tablas/vistas, se ignora)
        try {
          const { data: items } = await supabase
            .from('scenario_checklist')
            .select('id,label,order_index')
            .eq('scenario_id', id)
            .order('order_index', { ascending: true });
          if (items && items.length) {
            setChecklist(items);
            const { data: sessMarks } = await supabase
              .from('session_checklist')
              .select('item_id,status,note')
              .eq('session_id', sessionId);
            if (sessMarks) {
              const st = {};
              const nt = {};
              for (const r of sessMarks) { st[r.item_id] = r.status; if (r.note) nt[r.item_id] = r.note; }
              setCheckStatus(st);
              setCheckNotes(nt);
            }
          }
        } catch (e) {
          console.debug('[Instructor] checklist no disponible (ok)');
        }
      } catch (e) {
        console.error("[Instructor] init error:", e);
        setErrorMsg(e?.message || "No se pudo cargar la sesión");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, sessionId]);

  // Refrescar variables reveladas desde BD
  async function refreshRevealed(sid) {
    const theId = sid || sessionId;
    if (!theId) return;
    try {
      const { data, error } = await supabase
        .from('session_variables')
        .select('variable_id')
        .eq('session_id', theId)
        .eq('is_revealed', true);
      if (!error) {
        const s = new Set((data || []).map(r => r.variable_id));
        setRevealed(s);
      }
    } catch (e) {
      // silencioso
    }
  }

  // Suscripción realtime a session_variables para marcar/desmarcar en UI
  useEffect(() => {
    if (!sessionId) return;
    // carga inicial por si refrescamos ruta
    refreshRevealed(sessionId);
    const ch = supabase
      .channel(`instr-svars:${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_variables', filter: `session_id=eq.${sessionId}` },
        () => refreshRevealed(sessionId)
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(ch); } catch {}
    };
  }, [sessionId]);

  // Crear sesión
  async function createSessionForScenario(scenarioId) {
    setCreating(true);
    setCreatingFor(scenarioId);
    setListError("");
    try {
      const public_code = Array(6)
        .fill(0)
        .map(() =>
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
            Math.floor(Math.random() * 36)
          )
        )
        .join("");
      const { data: newRow, error: insErr } = await supabase
        .from("presencial_sessions")
        .insert({
          scenario_id: scenarioId,
          public_code,
        })
        .select("id, public_code")
        .single();
      if (insErr) throw insErr;
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ id: newRow.id, scenario_id: scenarioId }));
      } catch {}
      navigate(`/presencial/confirm/${scenarioId}/${newRow.id}`, {
        replace: true,
      });
    } catch (e) {
      setListError(e?.message || "No se pudo crear la sesión");
    } finally {
      setCreating(false);
      setCreatingFor(null);
    }
  }

  // Timer local en UI
  useEffect(() => {
    if (!startedAt) {
      setElapsedSec(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const t0 = new Date(startedAt).getTime();
    const compute = () => {
      const endMs = endedAt ? new Date(endedAt).getTime() : Date.now();
      const diff = Math.max(0, Math.floor((endMs - t0) / 1000));
      setElapsedSec(diff);
    };
    compute();
    if (endedAt) return;
    timerRef.current = setInterval(compute, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startedAt, endedAt]);

  function fmtDuration(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const p2 = (n) => String(n).padStart(2, "0");
    return hh > 0 ? `${hh}:${p2(mm)}:${p2(ss)}` : `${p2(mm)}:${p2(ss)}`;
  }

  // Controles inicio/fin (persistentes y tolerantes a columnas faltantes)
  async function startSession() {
    if (!sessionId) return;
    const now = new Date().toISOString();
    // Estado local inmediato
    setStartedAt(now);
    setEndedAt(null);
    setElapsedSec(0);
    // Persistir sesión como actual en localStorage
    try {
      if (sessionId && scenario?.id) {
        localStorage.setItem(LS_KEY, JSON.stringify({ id: sessionId, scenario_id: scenario.id }));
      }
    } catch {}
    // Persistir si existen las columnas; si no, ignorar error
    try {
      await supabase
        .from("presencial_sessions")
        .update({ started_at: now, ended_at: null })
        .eq("id", sessionId);
    } catch (e) {
      console.warn("[Instructor] startSession: no se pudo guardar started_at (columna puede no existir)", e);
    }
  }

  async function endSession() {
    if (!sessionId) return;
    const now = new Date().toISOString();
    setEndedAt(now);
    try {
      const t0 = startedAt ? new Date(startedAt).getTime() : Date.now();
      const t1 = new Date(now).getTime();
      setElapsedSec(Math.max(0, Math.floor((t1 - t0) / 1000)));
    } catch {}
    // Persistir fin de sesión si la columna existe; si falla, usa banner como fallback
    try {
      await supabase
        .from("presencial_sessions")
        .update({ ended_at: now })
        .eq("id", sessionId);
      try { localStorage.removeItem(LS_KEY); } catch {}
    } catch (e) {
      console.warn("[Instructor] endSession: no se pudo guardar ended_at; usando banner como fallback", e);
      try {
        await supabase
          .from("presencial_sessions")
          .update({ banner_text: "Sesión finalizada" })
          .eq("id", sessionId);
        setBannerText("Sesión finalizada");
        try { localStorage.removeItem(LS_KEY); } catch {}
      } catch (e2) {
        console.error("[Instructor] endSession fallback error:", e2);
      }
    }
  }

  // Mostrar/ocultar variables - toggle helper
  async function setVariableReveal(variableId, reveal) {
    if (!sessionId) return;
    const v = variables.find((x) => x.id === variableId);
    try {
      if (reveal) {
        const currentVal = v?.initial_value ?? null;
        await supabase.from('session_variables').upsert(
          {
            session_id: sessionId,
            variable_id: variableId,
            is_revealed: true,
            value: currentVal,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'session_id,variable_id' }
        );
        setRevealed((prev) => { const s = new Set(prev); s.add(variableId); return s; });
        // Ping de sesión para forzar refresco en alumnos aunque no haya realtime en session_variables
        try {
          await supabase
            .from('presencial_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        } catch {}
      } else {
        await supabase
          .from('session_variables')
          .upsert(
            {
              session_id: sessionId,
              variable_id: variableId,
              is_revealed: false,
              // mantenemos el valor previo si existía; si no, null
              value: v?.initial_value ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'session_id,variable_id' }
          );
        setRevealed((prev) => { const s = new Set(prev); s.delete(variableId); return s; });
        // Ping de sesión para forzar refresco en alumnos aunque no haya realtime en session_variables
        try {
          await supabase
            .from('presencial_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        } catch {}
      }
    } catch (e) {
      console.error('[Instructor] setVariableReveal error:', e);
      setErrorMsg(reveal ? 'No se pudo mostrar la variable.' : 'No se pudo ocultar la variable.');
    }
  }

  // NUEVO: guardar banner
  async function saveBanner(nextText) {
    if (!sessionId) return;
    const textToSave = typeof nextText === "string" ? nextText : bannerText;
    try {
      await supabase
        .from("presencial_sessions")
        .update({ banner_text: textToSave })
        .eq("id", sessionId);
      console.debug('[Instructor] Banner actualizado en sesión', sessionId);
      // Asegura estado local coherente en caso de llamada con argumento
      if (typeof nextText === "string") setBannerText(nextText);
    } catch (e) {
      console.error("[Instructor] saveBanner error:", e);
      setErrorMsg("No se pudo guardar el texto en pantalla.");
    }
  }

  // NUEVO: cambiar fase (paso)
  async function updateStep(stepId) {
    if (!sessionId) return;
    setCurrentStepId(stepId);
    try {
      await supabase
        .from("presencial_sessions")
        .update({ current_step_id: stepId })
        .eq("id", sessionId);
      console.debug('[Instructor] Fase actualizada', { sessionId, stepId });
    } catch (e) {
      console.error("[Instructor] updateStep error:", e);
      setErrorMsg("No se pudo cambiar la fase del caso.");
    }
  }

  // NUEVO: ocultar todas las variables
  async function clearAllVariables() {
    if (!sessionId) return;
    try {
      await supabase
        .from('session_variables')
        .update({ is_revealed: false, updated_at: new Date().toISOString() })
        .eq('session_id', sessionId);
      setRevealed(new Set());
      // Ping para notificar a los alumnos la limpieza total
      try {
        await supabase
          .from('presencial_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', sessionId);
      } catch {}
    } catch (e) {
      console.error("[Instructor] clearAllVariables error:", e);
      setErrorMsg("No se pudieron ocultar las variables.");
    }
  }

  async function upsertChecklist(itemId, status) {
    if (!sessionId) return;
    try {
      await supabase
        .from('session_checklist')
        .upsert({ session_id: sessionId, item_id: itemId, status, updated_at: new Date().toISOString() }, { onConflict: 'session_id,item_id' });
      setCheckStatus(prev => ({ ...prev, [itemId]: status }));
      // Ping para forzar refresco en pantallas conectadas
      try { await supabase.from('presencial_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId); } catch {}
    } catch (e) {
      console.error('[Instructor] upsertChecklist', e);
      setErrorMsg('No se pudo actualizar el checklist.');
    }
  }

  async function saveChecklistNote(itemId, note) {
    if (!sessionId) return;
    setCheckNotes(prev => ({ ...prev, [itemId]: note }));
    try {
      await supabase
        .from('session_checklist')
        .upsert({ session_id: sessionId, item_id: itemId, status: checkStatus[itemId] || 'na', note, updated_at: new Date().toISOString() }, { onConflict: 'session_id,item_id' });
    } catch (e) {
      console.error('[Instructor] saveChecklistNote', e);
    }
  }
  useEffect(() => {
    if (!sessionId || checklist.length === 0) return;
    const ch = supabase
      .channel(`instr-scheck:${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_checklist', filter: `session_id=eq.${sessionId}` },
        async () => {
          try {
            const { data: sessMarks } = await supabase
              .from('session_checklist')
              .select('item_id,status,note')
              .eq('session_id', sessionId);
            if (sessMarks) {
              const st = {}; const nt = {};
              for (const r of sessMarks) { st[r.item_id] = r.status; if (r.note) nt[r.item_id] = r.note; }
              setCheckStatus(st); setCheckNotes(nt);
            }
          } catch {}
        }
      )
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [sessionId, checklist.length]);

  // Si faltan parámetros, selector de escenario
  if (!id || !sessionId) {
    if (loading) {
      return (
        <div className="min-h-screen grid place-items-center text-slate-600">
          Cargando…
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <section className="max-w-3xl mx-auto px-5 py-12">
          <h1 className="text-3xl font-bold mb-1">Instructor · Nueva sesión</h1>
          <p className="mb-6 text-lg text-slate-700">
            Selecciona un escenario para crear una nueva sesión presencial.
          </p>
          {listError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2">
              {listError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {scenarios.length === 0 && (
              <div className="col-span-2 text-slate-500">
                No hay escenarios disponibles.
              </div>
            )}
            {scenarios.map((sc) => (
              <div
                key={sc.id}
                className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col"
              >
                <div className="font-semibold text-lg mb-1">{sc.title}</div>
                {sc.summary && (
                  <div className="text-slate-600 mb-2">{sc.summary}</div>
                )}
                <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-4">
                  {sc.estimated_minutes && <span>⏱️ {sc.estimated_minutes} min</span>}
                  {sc.level && <span>Nivel: {sc.level}</span>}
                </div>
                <button
                  className={`mt-auto px-4 py-2 rounded-lg font-semibold text-white ${
                    creatingFor === sc.id
                      ? "bg-slate-400 cursor-wait"
                      : "bg-[#1E6ACB] hover:bg-[#0A3D91]"
                  }`}
                  disabled={creating || creatingFor === sc.id}
                  onClick={() => createSessionForScenario(sc.id)}
                >
                  {creatingFor === sc.id ? "Creando…" : "Crear sesión"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Con params pero algo falló
  if (!scenario || !session) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const last = JSON.parse(raw);
        if (last && last.id === sessionId) localStorage.removeItem(LS_KEY);
      }
    } catch {}
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="mb-3">No se pudo cargar la sesión.</p>
          <Link to="/simulacion-presencial" className="text-[#0A3D91] underline">
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <p className="opacity-95">Instructor · Sesión {sessionId}</p>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">
            {scenario.title}
          </h1>
          {scenario.summary && <p className="opacity-90 mt-1">{scenario.summary}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {/* Estado */}
            {!startedAt && (
              <span className="px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/30">
                ● No iniciada
              </span>
            )}
            {startedAt && !endedAt && (
              <span className="px-2.5 py-1 rounded-full bg-green-500/20 ring-1 ring-green-300/40">
                ● En curso
              </span>
            )}
            {startedAt && endedAt && (
              <span className="px-2.5 py-1 rounded-full bg-slate-200/30 ring-1 ring-white/30">
                ● Finalizada
              </span>
            )}

            {/* Fase actual */}
            {currentStepId && steps.length > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
                Fase: {steps.find((s) => s.id === currentStepId)?.name || "—"}
              </span>
            ) : null}

            {/* Duración */}
            {startedAt && (
              <span className="ml-1 px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
                Tiempo: {fmtDuration(elapsedSec)}
              </span>
            )}

            {/* Marcas */}
            {startedAt ? (
              <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
                Iniciada: {new Date(startedAt).toLocaleString()}
              </span>
            ) : null}
            {endedAt ? (
              <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
                Finalizada: {new Date(endedAt).toLocaleString()}
              </span>
            ) : null}

            {publicUrl && (
              <button
                onClick={() => navigator.clipboard.writeText(publicUrl)}
                className="ml-2 px-3 py-1.5 rounded-lg bg-white/15 ring-1 ring-white/30 hover:bg-white/20"
              >
                Copiar enlace de alumnos
              </button>
            )}
            {sessionId && (
              <Link
                to={`/presencial/confirm/${id}/${sessionId}`}
                className="ml-2 px-3 py-1.5 rounded-lg bg-white/15 ring-1 ring-white/30 hover:bg-white/20"
                title="Pasar lista / confirmar alumnos"
              >
                Confirmar alumnos
              </Link>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {errorMsg && (
          <div className="lg:col-span-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2">
            {errorMsg}
          </div>
        )}

        {/* Panel de control */}
        <section className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Control de la sesión</h2>

          {/* Controles inicio/fin */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={startSession}
              disabled={!!startedAt && !endedAt}
              className={`px-3 py-2 rounded-lg font-semibold ${
                startedAt && !endedAt
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "text-slate-900 hover:opacity-90"
              }`}
              style={{
                background:
                  startedAt && !endedAt ? undefined : colors.primaryLight,
              }}
              title={startedAt && !endedAt ? "Ya iniciada" : "Iniciar sesión"}
            >
              Iniciar
            </button>
            <button
              onClick={endSession}
              disabled={!startedAt || !!endedAt}
              className={`px-3 py-2 rounded-lg border ${
                !startedAt || endedAt
                  ? "border-slate-200 text-slate-400 cursor-not-allowed"
                  : "border-slate-300 hover:bg-slate-50"
              }`}
              title={
                !startedAt ? "Aún no iniciada" : endedAt ? "Ya finalizada" : "Finalizar sesión"
              }
            >
              Finalizar
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              Volver
            </button>
          </div>

          {/* Cronómetro */}
          <div className="mb-4">
            <div className="text-sm text-slate-600">Duración</div>
            <div className="text-2xl font-mono tabular-nums">
              {fmtDuration(elapsedSec)}
            </div>
          </div>

          {/* Checklist */}
          {checklist && checklist.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Checklist</h3>
              <div className="space-y-3">
                {checklist.map(item => (
                  <div key={item.id} className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="font-medium text-slate-900">{item.label}</div>
                      <div className="flex flex-wrap gap-2">
                        {CHECK_STATUSES.map(s => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => upsertChecklist(item.id, s.key)}
                            className={`px-2.5 py-1.5 rounded ring-1 text-sm ${checkStatus[item.id] === s.key ? 'ring-[#1E6ACB] bg-[#4FA3E3]/10' : 'ring-slate-200 hover:bg-slate-50'}`}
                            title={s.label}
                          >
                            <span className="mr-1">{s.icon}</span>{s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Nota opcional"
                        value={checkNotes[item.id] || ''}
                        onChange={(e) => saveChecklistNote(item.id, e.target.value)}
                        className="w-full md:w-1/2 rounded border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Texto en pantalla (banner) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">
              Texto en pantalla (banner)
            </h3>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
              placeholder="Introduce el texto que verán los alumnos (introducción del caso, mensajes, etc.)"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => saveBanner()}
                className="px-3 py-2 rounded-lg font-semibold text-slate-900 hover:opacity-90"
                style={{ background: colors.primaryLight }}
                title="Publicar/actualizar el texto en la pantalla del alumno"
              >
                Publicar en pantalla
              </button>
              <button
                onClick={() => saveBanner("")}
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
                title="Vaciar el banner en la pantalla del alumno"
              >
                Limpiar banner
              </button>
            </div>
          </div>

          {/* Fase del caso */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Fase del caso</h3>
            {steps && steps.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {steps.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateStep(st.id)}
                    className={`px-3 py-1.5 rounded-full text-sm ring-1 ${
                      currentStepId === st.id
                        ? "ring-[#1E6ACB] bg-[#4FA3E3]/10"
                        : "ring-slate-200 bg-white hover:bg-slate-50"
                    }`}
                    title="Cambiar fase (se reflejará en la pantalla de alumnos)"
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                Este escenario no tiene fases definidas.
              </div>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Acciones rápidas</h3>
            <button
              onClick={clearAllVariables}
              className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
              title="Oculta todas las variables reveladas en la pantalla del alumno"
            >
              Ocultar todas las variables
            </button>
          </div>

          {/* Variables del caso */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Variables del caso</h3>
            <p className="text-sm text-slate-600 mb-2">
              Click para alternar visibilidad en la pantalla del alumno. Con Ctrl/Cmd+clic fuerzas ocultar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {variables.map((v) => {
                const isOn = revealed.has(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={(e) => {
                      const willShow = !(revealed.has(v.id));
                      if (e.metaKey || e.ctrlKey) {
                        // Forzar ocultar con modificador
                        setVariableReveal(v.id, false);
                      } else {
                        setVariableReveal(v.id, willShow);
                      }
                    }}
                    className={`p-3 rounded-lg text-left transition border ${
                      isOn
                        ? 'border-[#1E6ACB] bg-[#4FA3E3]/10'
                        : 'border-slate-300 bg-white hover:bg-slate-100'
                    }`}
                    title={
                      isOn
                        ? 'Visible · Click para ocultar (o Ctrl/Cmd+Click)'
                        : 'Oculta · Click para mostrar (o Ctrl/Cmd+Click)'
                    }
                  >
                    <div className="text-slate-500 text-xs">{v.type}</div>
                    <div className="font-semibold">{v.label}</div>
                    {v.unit && (
                      <div className="text-slate-400 text-sm">{v.unit}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Ayuda y enlace público */}
        <aside className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold">Pantalla del alumno</h3>
          {publicUrl ? (
            <div className="mt-2 text-sm">
              <p className="text-slate-700">
                Comparte este enlace para proyectar la pantalla del alumno:
              </p>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#0A3D91] underline break-all"
              >
                {publicUrl}
              </a>
              <div className="mt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200"
                >
                  Copiar enlace
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              La sesión no tiene public_code todavía.
            </p>
          )}

          <div className="mt-6">
            <h4 className="font-semibold mb-1">Cómo funciona</h4>
            <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
              <li>
                Pulsa <span className="font-medium">Iniciar</span> cuando
                comience la simulación.
              </li>
              <li>
                Usa el <span className="font-medium">banner</span> para
                introducir el caso o comunicar mensajes clave.
              </li>
              <li>
                Cuando pidan un dato, pulsa la variable para{" "}
                <span className="font-medium">mostrarla</span> en alumnos.
              </li>
              <li>
                Cambia la <span className="font-medium">fase</span> del caso
                según el progreso.
              </li>
              <li>
                Al terminar, pulsa <span className="font-medium">Finalizar</span>{" "}
                para cerrar la sesión.
              </li>
            </ol>
          </div>
        </aside>
      </main>
    </div>
  );
}