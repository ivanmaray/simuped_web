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

// --- Audio helpers (beeps/alerts) ---
const audioCtxRef = { ctx: null };
function ensureCtx() {
  if (!audioCtxRef.ctx) {
    try { audioCtxRef.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  const ctx = audioCtxRef.ctx;
  if (ctx && ctx.state === 'suspended') {
    try { ctx.resume(); } catch {}
  }
  return ctx;
}

function playBeep({ freq = 880, ms = 180, gain = 0.12 } = {}) {
  const ctx = ensureCtx(); if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g); g.connect(comp); comp.connect(ctx.destination);
  const t0 = ctx.currentTime; const t1 = t0 + ms / 1000;
  osc.start(t0); osc.stop(t1);
}

function playAlarm() {
  const ctx = ensureCtx(); if (!ctx) return;
  playBeep({ freq: 700, ms: 220, gain: 0.18 });
  setTimeout(() => playBeep({ freq: 920, ms: 220, gain: 0.18 }), 260);
  setTimeout(() => playBeep({ freq: 1150, ms: 260, gain: 0.18 }), 520);
}

// --- Event logger (best-effort) ---
async function logEvent(kind, payload = {}) {
  if (!sessionId) return;
  const at = new Date().toISOString();
  try {
    // Intenta escribir en una tabla 'session_events' con payload jsonb.
    await supabase.from('session_events').insert({
      session_id: sessionId,
      at,
      kind,
      payload
    });
  } catch (e) {
    // Silencioso: si la tabla/columnas no existen, seguimos sin bloquear la UI
    console.debug('[Instructor] logEvent skipped:', kind);
  }
}

// Texto-guion por defecto (se puede editar en UI)
const DEFAULT_SCRIPT = [
  'Llegada a urgencias: lactante de 12 meses con fiebre alta y decaimiento. Se inicia triage.',
  'Empeora clínicamente: cianosis periférica y relleno capilar lento. Sospecha de hipotensión: preparar fluidoterapia.',
  'Desaturación progresiva: valorar ventilación no invasiva y monitorización continua.'
];

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

  // Valores actuales de variables de la sesión y edición rápida
  const [sessionVarValues, setSessionVarValues] = useState({}); // {variable_id: value}
  const [pendingValues, setPendingValues] = useState({}); // inputs locales

  // Guion del caso (intro narrativa por pasos que se publica como banner)
  const [scriptTexts, setScriptTexts] = useState(DEFAULT_SCRIPT);
  const [scriptIndex, setScriptIndex] = useState(0);

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
          .select("id,title,summary,patient_overview")
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
        .select('variable_id, value, is_revealed')
        .eq('session_id', theId);
      if (!error) {
        const onSet = new Set();
        const values = {};
        (data || []).forEach(r => {
          if (r.is_revealed) onSet.add(r.variable_id);
          if (r.value !== undefined && r.value !== null) values[r.variable_id] = r.value;
        });
        setRevealed(onSet);
        setSessionVarValues(values);
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
    setSession(prev => (prev ? { ...prev, started_at: now, ended_at: null } : prev));
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
    // Log
    try { logEvent('session.start', { started_at: now }); } catch {}
  }

  async function endSession() {
    if (!sessionId) return;
    const now = new Date().toISOString();
    setEndedAt(now);
    setSession(prev => (prev ? { ...prev, ended_at: now } : prev));
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
      // Log
      try { logEvent('session.end', { ended_at: now, duration_sec: elapsedSec }); } catch {}
      // Navegar al informe tras finalizar correctamente
      try {
        navigate(`/presencial/${id}/informe?session=${sessionId}`, { replace: true });
      } catch {}
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
        const currentVal = (pendingValues[variableId] ?? sessionVarValues[variableId] ?? v?.initial_value ?? null);
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
        setSessionVarValues(prev => ({ ...prev, [variableId]: currentVal }));
        try { logEvent('variable.show', { variable_id: variableId, label: v?.label, value: currentVal, unit: v?.unit }); } catch {}
        // Ping de sesión para forzar refresco en alumnos aunque no haya realtime en session_variables
        try {
          await supabase
            .from('presencial_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        } catch {}
        playBeep({ freq: 880 });
      } else {
        setRevealed(prev => { const s = new Set(prev); s.delete(variableId); return s; });
        setPendingValues(prev => ({ ...prev, [variableId]: '' }));
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
        setSessionVarValues(prev => ({ ...prev, [variableId]: (v?.initial_value ?? prev[variableId] ?? null) }));
        try { logEvent('variable.hide', { variable_id: variableId, label: v?.label }); } catch {}
        // Ping de sesión para forzar refresco en alumnos aunque no haya realtime en session_variables
        try {
          await supabase
            .from('presencial_sessions')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        } catch {}
        playBeep({ freq: 620 });
      }
    } catch (e) {
      console.error('[Instructor] setVariableReveal error:', e);
      setErrorMsg(reveal ? 'No se pudo mostrar la variable.' : 'No se pudo ocultar la variable.');
    }
  }

  // Helpers para edición rápida de constantes
  function setPending(variableId, value) {
    setPendingValues(prev => ({ ...prev, [variableId]: value }));
  }

  async function publishValue(variableId) {
    if (!sessionId) return;
    playBeep({ freq: 900 });
    const v = variables.find(x => x.id === variableId);
    const val = (pendingValues[variableId] ?? sessionVarValues[variableId] ?? v?.initial_value ?? null);
    try {
      await supabase
        .from('session_variables')
        .upsert({ session_id: sessionId, variable_id: variableId, value: val, is_revealed: true, updated_at: new Date().toISOString() }, { onConflict: 'session_id,variable_id' });
      setSessionVarValues(prev => ({ ...prev, [variableId]: val }));
      setRevealed(prev => { const s = new Set(prev); s.add(variableId); return s; });
      // Log
      try { logEvent('variable.update', { variable_id: variableId, label: v?.label, value: val, unit: v?.unit }); } catch {}
      // ping + sound
      try { await supabase.from('presencial_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId); } catch {}
      playBeep({ freq: 900 });
    } catch (e) {
      console.error('[Instructor] publishValue error', e);
      setErrorMsg('No se pudo guardar el valor.');
    }
  }

  // Helper para ocultar variable y limpiar input
  async function hideVariable(variableId) {
    if (!sessionId) return;
    const v = variables.find(x => x.id === variableId);
    setRevealed(prev => { const s = new Set(prev); s.delete(variableId); return s; });
    setPendingValues(prev => ({ ...prev, [variableId]: '' }));
    try {
      await supabase
        .from('session_variables')
        .upsert({ session_id: sessionId, variable_id: variableId, value: sessionVarValues[variableId] ?? v?.initial_value ?? null, is_revealed: false, updated_at: new Date().toISOString() }, { onConflict: 'session_id,variable_id' });
      // Log
      try { logEvent('variable.hide', { variable_id: variableId, label: v?.label }); } catch {}
      // ping
      try { await supabase.from('presencial_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId); } catch {}
      playBeep({ freq: 620 });
    } catch(e) {
      console.error('[Instructor] hideVariable error', e);
      setErrorMsg('No se pudo ocultar la variable.');
    }
  }

  // Emitir alarma a alumnos (ping)
  async function triggerAlarm() {
    ensureCtx();
    if (!sessionId) return;
    // try to update a specific alarm column if it exists; always bump updated_at
    const now = new Date().toISOString();
    try {
      await supabase.from('presencial_sessions').update({ updated_at: now, alarm_ping: now }).eq('id', sessionId);
    } catch {
      try { await supabase.from('presencial_sessions').update({ updated_at: now }).eq('id', sessionId); } catch {}
    }
    // Log
    try { logEvent('alarm', {}); } catch {}
    playAlarm();
  }

  // Helpers para el guion/narrativa
  function publishScript(index = scriptIndex) {
    const txt = scriptTexts[index] ?? '';
    setBannerText(txt);
    saveBanner(txt);
    try { logEvent('script.publish', { index, text: txt }); } catch {}
  }

  function nextScript() { if (scriptIndex < scriptTexts.length - 1) { setScriptIndex(scriptIndex + 1); } }
  function prevScript() { if (scriptIndex > 0) { setScriptIndex(scriptIndex - 1); } }
  function addScriptLine() { setScriptTexts(arr => [...arr, '']); setScriptIndex(scriptTexts.length); }
  function resetScript() { setScriptIndex(0); }

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
      try { logEvent('banner.update', { text: textToSave }); } catch {}
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
      try {
        const name = steps.find(s => s.id === stepId)?.name || null;
        logEvent('step.change', { step_id: stepId, name });
      } catch {}
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
      try { logEvent('variable.clear_all', {}); } catch {}
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
      try {
        const label = (checklist.find(i => i.id === itemId) || {}).label;
        logEvent('check.update', { item_id: itemId, status, label });
      } catch {}
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
      try {
        const label = (checklist.find(i => i.id === itemId) || {}).label;
        logEvent('check.note', { item_id: itemId, note, label });
      } catch {}
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

  // Mantener sincronizada la fila de la sesión (banner, fase, inicio/fin) si cambia en otro cliente
  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`instr-sess:${sessionId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'presencial_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const next = payload?.new;
          if (!next) return;
          setSession(prev => ({ ...prev, ...next }));
          if (Object.prototype.hasOwnProperty.call(next, 'banner_text')) {
            setBannerText(next.banner_text || '');
          }
          if (Object.prototype.hasOwnProperty.call(next, 'current_step_id')) {
            setCurrentStepId(next.current_step_id || null);
          }
          if (Object.prototype.hasOwnProperty.call(next, 'started_at')) {
            setStartedAt(next.started_at || null);
          }
          if (Object.prototype.hasOwnProperty.call(next, 'ended_at')) {
            setEndedAt(next.ended_at || null);
          }
        }
      )
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [sessionId]);

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

      {scenario?.patient_overview && (
        <section className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Ficha inicial del paciente</h3>
            <div className="text-sm text-slate-700 leading-relaxed">
              {scenario.patient_overview.split(/\n+/).map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-1 text-slate-400">•</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-3 gap-7">
        {errorMsg && (
          <div className="lg:col-span-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2">
            {errorMsg}
          </div>
        )}

        {/* Panel de control */}
        <section className="lg:col-span-2 p-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Sticky header bar for quick actions */}
          <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/95 border-b border-slate-200">
            <div className="px-6 py-4 flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold mr-auto">Control de la sesión</h2>
              {/* Cronómetro compact */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">Duración</span>
                <span className="font-mono tabular-nums px-2 py-1 rounded bg-slate-100">{fmtDuration(elapsedSec)}</span>
              </div>
              <button
                onClick={startSession}
                disabled={!!startedAt && !endedAt}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition shadow-sm ${
                  startedAt && !endedAt
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "text-white hover:opacity-95"
                }`}
                style={{ background: startedAt && !endedAt ? undefined : colors.primary }}
                title={startedAt && !endedAt ? "Ya iniciada" : "Iniciar sesión"}
              >
                <span>▶</span> Iniciar
              </button>
              <button
                onClick={endSession}
                disabled={!startedAt || !!endedAt}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition shadow-sm ${
                  !startedAt || endedAt
                    ? "border-slate-200 text-slate-400 cursor-not-allowed"
                    : "border-red-300 text-red-700 hover:bg-red-50"
                }`}
                title={!startedAt ? "Aún no iniciada" : endedAt ? "Ya finalizada" : "Finalizar sesión"}
              >
                <span>■</span> Finalizar
              </button>
              <button
                onClick={triggerAlarm}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm"
                title="Emitir una alarma sonora en las pantallas conectadas"
              >
                🔔 Alarma
              </button>
              {endedAt && (
                <Link
                  to={`/presencial/${id}/informe?session=${sessionId}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 shadow-sm"
                  title="Ver informe de la sesión"
                >
                  📄 Informe
                </Link>
              )}
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 shadow-sm"
              >
                ← Volver
              </button>
            </div>
          </div>
          <div className="p-6">

          {/* Guion del caso (publica como banner por pasos) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Guion del caso</h3>
            <p className="text-sm text-slate-600 mb-2">Define una introducción y eventos que se irán publicando al alumnado como texto en pantalla.</p>
            <div className="space-y-2 mb-3">
              {scriptTexts.map((t, idx) => (
                <div key={idx} className={`flex items-center gap-2 ${idx === scriptIndex ? 'ring-1 ring-[#1E6ACB] rounded-lg p-2 bg-[#4FA3E3]/5' : ''}`}>
                  <span className="text-xs text-slate-500 w-10">Paso {idx+1}</span>
                  <input
                    value={t}
                    onChange={(e)=> setScriptTexts(arr => arr.map((x,i)=> i===idx? e.target.value : x))}
                    placeholder={idx===0? 'Llegada a urgencias...' : 'Texto del evento...'}
                    className="flex-1 rounded border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                  />
                  <button onClick={()=> setScriptIndex(idx)} className="px-2 py-1 rounded border border-slate-300 text-sm hover:bg-slate-50" title="Seleccionar este paso">Usar</button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={addScriptLine} className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50">+ Añadir paso</button>
              <button onClick={prevScript} className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50">← Anterior</button>
              <button onClick={nextScript} className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50">Siguiente →</button>
              <button onClick={()=> publishScript()} className="px-3 py-1.5 rounded font-semibold text-slate-900" style={{ background: colors.primaryLight }}>Publicar este paso</button>
              <button onClick={resetScript} className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50">Reiniciar</button>
            </div>
          </div>

          {/* Constantes / variables (edición rápida de valores) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Constantes (edición rápida)</h3>
            <p className="text-sm text-slate-600 mb-2">Introduce el valor y pulsa <span className="font-medium">Mostrar</span> para publicarlo (o <span className="font-medium">Ocultar</span> para retirarlo). Cuando se muestre, habrá un aviso sonoro breve.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {variables.map(v => {
                const isOn = revealed.has(v.id);
                const current = sessionVarValues[v.id];
                return (
                  <div
                    key={v.id}
                    className={`p-3 rounded-lg border bg-white transition ring-1 ${
                      isOn ? 'border-[#1E6ACB] ring-[#1E6ACB]/30 bg-[#4FA3E3]/5' : 'border-slate-200 ring-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        {v.type}
                        {typeof sessionVarValues[v.id] !== 'undefined' && sessionVarValues[v.id] !== null ? (
                          <span> · Actual: <span className="font-medium text-slate-700">{sessionVarValues[v.id]}</span></span>
                        ) : null}
                      </div>
                      {isOn && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#1E6ACB]/10 text-[#1E6ACB]">
                          ● visible
                        </span>
                      )}
                    </div>

                    <div className="font-medium mt-0.5">{v.label}</div>

                    {/* Input + unidad (primera fila) */}
                    <div className="mt-2">
                      <div className="flex items-stretch rounded border border-slate-300 focus-within:ring-2 focus-within:ring-[#1E6ACB] h-9">
                        <input
                          value={pendingValues[v.id] ?? ''}
                          onChange={(e)=> setPending(v.id, e.target.value)}
                          placeholder={current ? `Actual: ${current}` : (v.initial_value ?? '')}
                          className="flex-1 rounded-l px-3 outline-none h-full"
                        />
                        {v.unit && (
                          <span className="px-2 min-w-[3rem] grid place-items-center text-xs text-slate-500 bg-slate-50 border-l border-slate-200 rounded-r h-full">
                            {v.unit}
                          </span>
                        )}
                      </div>

                      {/* Botonera (segunda fila) para que no se corte en pantallas estrechas */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={()=> publishValue(v.id)}
                          className={`h-9 px-3 rounded ring-1 text-sm transition ${isOn ? 'ring-[#1E6ACB] bg-[#4FA3E3]/10' : 'ring-slate-200 hover:bg-slate-50'}`}
                          title="Publicar ahora al alumnado"
                        >
                          Mostrar
                        </button>
                        <button
                          onClick={()=> hideVariable(v.id)}
                          className="h-9 px-3 rounded ring-1 ring-slate-200 hover:bg-slate-50 text-sm transition"
                          title="Ocultar al alumnado"
                        >
                          Ocultar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

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
            <button
              onClick={triggerAlarm}
              className="ml-2 px-3 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
              title="Emitir una alarma sonora en las pantallas conectadas"
            >
              🔔 Alarma
            </button>
          </div>


          </div>
        </section>

        {/* Ayuda y enlace público */}
        <aside className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold flex items-center gap-2">Pantalla del alumno <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">pública</span></h3>
          {publicUrl ? (
            <div className="mt-2 text-sm">
              <p className="text-slate-700">
                Comparte este enlace para proyectar la pantalla del alumno:
              </p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0A3D91] underline break-all"
                >
                  {publicUrl}
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(publicUrl)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200"
                  title="Copiar enlace"
                >
                  Copiar
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              La sesión no tiene public_code todavía.
            </p>
          )}

          <details className="mt-6">
            <summary className="font-semibold cursor-pointer select-none">Cómo funciona</summary>
            <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1 mt-2">
              <li>Pulsa <span className="font-medium">Iniciar</span> cuando comience la simulación.</li>
              <li>Usa el <span className="font-medium">guion</span> para publicar la narración del caso.</li>
              <li>Publica <span className="font-medium">constantes</span> o muéstralas/ocúltalas cuando proceda.</li>
              <li>Cambia la <span className="font-medium">fase</span> según el progreso.</li>
              <li>Al terminar, pulsa <span className="font-medium">Finalizar</span> para cerrar la sesión.</li>
            </ol>
          </details>

          {checklist && checklist.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Checklist</h3>
              <div className="space-y-3">
                {checklist.map(item => (
                  <div key={item.id} className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-2">
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
                      <input
                        type="text"
                        placeholder="Nota opcional"
                        value={checkNotes[item.id] || ''}
                        onChange={(e) => saveChecklistNote(item.id, e.target.value)}
                        className="w-full rounded border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}