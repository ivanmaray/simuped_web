// src/pages/SimulacionDetalle.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

const HINT_PENALTY_POINTS = 5; // puntos que se restan por cada pista usada (puedes ajustar)

function formatLevel(level) {
  const key = String(level || "").toLowerCase();
  const map = { basico: "Básico", básico: "Básico", medio: "Medio", avanzado: "Avanzado" };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : "");
}
function formatMode(mode) {
  const key = String(mode || "").toLowerCase();
  const map = { online: "Online", presencial: "Presencial" };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : "");
}

function formatRole(rol) {
  const k = String(rol || "").toLowerCase();
  if (k.includes("medic")) return "Médico";
  if (k.includes("enfer")) return "Enfermería";
  if (k.includes("farm")) return "Farmacia";
  return k ? k[0].toUpperCase() + k.slice(1) : "";
}

function isTimedStep(step) {
  if (!step?.description) return false;
  const desc = String(step.description).toLowerCase();
  return desc.includes("intervención urgente");
}

// Normaliza el rol del usuario a 'medico' | 'enfermeria' | 'farmacia'
function normalizeRole(rol) {
  const k = String(rol || "").toLowerCase();
  if (k.includes("medic")) return "medico";
  if (k.includes("enfer")) return "enfermeria";
  if (k.includes("farm")) return "farmacia";
  return "";
}

// Visible si roles es null/[] o incluye el userRole
function isVisibleForRole(roles, userRole) {
  if (!roles || roles.length === 0) return true;
  const arr = roles.map((r) => String(r).toLowerCase());
  return arr.includes(String(userRole || "").toLowerCase());
}

// Intenta normalizar "options": puede venir como array de strings o de objetos {key,label}
function normalizeOptions(opts) {
  if (!opts) return [];
  // si es string JSON:
  if (typeof opts === "string") {
    try {
      opts = JSON.parse(opts);
    } catch {
      return [];
    }
  }
  if (Array.isArray(opts)) {
    // si es array de strings -> mapea a {key, label}
    if (opts.every((o) => typeof o === "string")) {
      return opts.map((label, i) => ({ key: String(i), label }));
    }
    // si ya son objetos
    return opts.map((o, i) => ({ key: String(o.key ?? i), label: o.label ?? String(o) }));
  }
  return [];
}

function getOptionLabelByIndex(q, idx) {
  try {
    const opts = Array.isArray(q._options) ? q._options : [];
    const item = opts[Number(idx)];
    return item ? item.label : "";
  } catch {
    return "";
  }
}

// Formatea segundos como mm:ss
function formatMMSS(total) {
  if (total == null || Number.isNaN(Number(total))) return "--:--";
  const s = Math.max(0, Math.floor(total));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function ScoreDonut({ score = 0, size = 84 }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const angle = pct * 3.6;
  const ringStyle = {
    width: `${size}px`,
    height: `${size}px`,
    background: `conic-gradient(#10b981 ${angle}deg, #e5e7eb 0)`,
  };
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <div className="rounded-full" style={ringStyle} />
      <div
        className="absolute rounded-full bg-white grid place-items-center text-slate-900"
        style={{ width: size - 20, height: size - 20 }}
      >
        <span className="font-semibold">{pct}%</span>
      </div>
    </div>
  );
}

function CaseCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 shadow-sm">
      {title && <h3 className="text-sm font-semibold text-slate-600 mb-3">{title}</h3>}
      {children}
    </section>
  );
}


function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600 bg-slate-50">
      {children}
    </span>
  );
}

function Row({ label, value, alert }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-slate-500">{label}</span>
      <span className={alert ? "font-semibold text-rose-600" : "font-medium text-slate-800"}>{value}</span>
    </div>
  );
}


function PrebriefBanner({ objective }) {
  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-5 mb-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white grid place-items-center">ℹ️</div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-900">Pre-brief · Contrato psicológico</h3>
          <p className="text-sm text-slate-600 mt-1">
            Este es un entorno seguro de aprendizaje. Puedes equivocarte: lo importante es el proceso y el razonamiento clínico.
          </p>
          <div className="mt-3 grid sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-500">Objetivo docente</div>
              <ul className="mt-1 text-sm text-slate-700 list-disc pl-5">
                {objective ? <li>{objective}</li> : <li>Conoce los objetivos del caso y cómo se evaluará la simulación.</li>}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Reglas de la simulación</div>
              <ul className="mt-1 text-sm text-slate-700 list-disc pl-5">
                <li>Algunos pasos contienen preguntas <span className="font-medium">críticas</span>.</li>
                <li>Puedes pedir <span className="font-medium">pistas</span> (si están disponibles); restan puntuación.</li>
                <li>En ciertos pasos verás <span className="font-medium">urgencia</span> y límite de tiempo.</li>
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Criterios de evaluación</div>
              <ul className="mt-1 text-sm text-slate-700 list-disc pl-5">
                <li>Nota = % aciertos – penalización por pistas.</li>
                <li>Se señalarán las <span className="font-medium">preguntas críticas falladas</span> en el debrief.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SimulacionDetalle() {
  const { id } = useParams(); // id de scenarios (int)
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const initialAttemptId = query.get("attempt");

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Escenario + pasos + preguntas
  const [scenario, setScenario] = useState(null);
  const [brief, setBrief] = useState(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [steps, setSteps] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rol, setRol] = useState("");

  // Respuestas marcadas (solo memoria local por ahora)
  // answers: { [questionId]: { selectedKey, isCorrect } }
  const [answers, setAnswers] = useState({});
  const [hintsUsed, setHintsUsed] = useState({}); // { [questionId]: number }
  const [revealedHints, setRevealedHints] = useState({}); // { [questionId]: string[] }
  const [qTimers, setQTimers] = useState({}); // { [qid]: { start: number, remaining: number, expired: boolean } }
  const [qTick, setQTick] = useState(0);
  function requestHint(q) {
    if (qTimers[q.id]?.expired) return;
    if (!q?.hints) return;
    let list = q.hints;
    if (typeof list === "string") {
      try { list = JSON.parse(list); } catch { list = []; }
    }
    if (!Array.isArray(list) || list.length === 0) return;

    setRevealedHints((prev) => {
      const already = prev[q.id] || [];
      if (already.length >= list.length) return prev; // no más pistas
      const next = [...already, list[already.length]];
      return { ...prev, [q.id]: next };
    });

    setHintsUsed((prev) => ({
      ...prev,
      [q.id]: Math.min((prev[q.id] || 0) + 1, Array.isArray(list) ? list.length : 1),
    }));
  }
  const [showSummary, setShowSummary] = useState(false);

  // Intento actual
  const [attemptId, setAttemptId] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);      // ISO string from attempts.expires_at
  const [remainingSecs, setRemainingSecs] = useState(null); // number in seconds
  const [timeUp, setTimeUp] = useState(false);

  const currentStep = steps[currentIdx] || null;

  useEffect(() => {
    if (!currentStep) return;
    if (!isTimedStep(currentStep)) return; // Solo pasos urgentes tienen countdown
    setQTimers((prev) => {
      const next = { ...prev };
      for (const q of currentStep.questions || []) {
        if (q?.time_limit && !next[q.id]) {
          next[q.id] = { start: Date.now(), remaining: Number(q.time_limit) || 0, expired: false };
        }
      }
      return next;
    });
  }, [currentStep]);

  const totalQuestions = useMemo(() => {
    return steps.reduce((acc, s) => acc + (s.questions?.length || 0), 0);
  }, [steps]);

  const answeredInStep = useMemo(() => {
    if (!currentStep) return 0;
    let c = 0;
    for (const q of currentStep.questions || []) {
      if (answers[q.id]?.selectedKey != null) c++;
    }
    return c;
  }, [answers, currentStep]);

  const answeredTotal = useMemo(() => Object.keys(answers).length, [answers]);
  const allAnswered = totalQuestions > 0 && answeredTotal >= totalQuestions;

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) setErr(error.message || "Error de sesión");
      const sess = data?.session ?? null;
      setSession(sess);
      if (!sess) {
        setLoading(false);
        return;
      }

      // Validar attempt en query; si falta, ir a confirm
      if (!initialAttemptId) {
        navigate(`/simulacion/${id}/confirm`, { replace: true });
        return;
      }
      // Comprobar que el attempt existe y pertenece al usuario y al escenario
      const { data: att, error: attErr } = await supabase
        .from("attempts")
        .select("id, user_id, scenario_id, expires_at, time_limit")
        .eq("id", initialAttemptId)
        .maybeSingle();

      if (attErr || !att || att.user_id !== sess.user.id || Number(att.scenario_id) !== Number(id)) {
        navigate(`/simulacion/${id}/confirm`, { replace: true });
        return;
      }
      setAttemptId(att.id);
      if (att.expires_at) {
        const exp = new Date(att.expires_at);
        setExpiresAt(exp.toISOString());
        const diff = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000));
        setRemainingSecs(diff);
        if (diff === 0) setTimeUp(true);
      } else {
        // If DB column not set yet, leave as null (no timer)
        setExpiresAt(null);
        setRemainingSecs(null);
      }

      // Rol del usuario
      let userRole = "";
      if (sess?.user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("rol")
          .eq("id", sess.user.id)
          .maybeSingle();
        userRole = normalizeRole(prof?.rol ?? sess.user?.user_metadata?.rol);
      }
      setRol(userRole);

      // Cargar escenario
      const { data: esc, error: e1 } = await supabase
        .from("scenarios")
        .select("id, title, summary, level, mode, created_at")
        .eq("id", Number(id))
        .maybeSingle();

      if (e1) {
        setErr(e1.message || "Error cargando escenario");
        setLoading(false);
        return;
      }
      if (!esc) {
        setErr("Escenario no encontrado");
        setLoading(false);
        return;
      }
      setScenario(esc);
      // Cargar briefing del caso (Pantalla 0)
      try {
        const { data: b, error: bErr } = await supabase
          .from("case_briefs")
          .select("*")
          .eq("scenario_id", esc.id)
          .maybeSingle();
        if (!bErr && b) {
          setBrief(b);
          setShowBriefing(true);
        } else {
          setBrief(null);
          setShowBriefing(false);
        }
      } catch (e) {
        console.warn("[SimulacionDetalle] error cargando briefing:", e);
        setBrief(null);
        setShowBriefing(false);
      }

      // Cargar pasos
      const { data: st, error: e2 } = await supabase
        .from("steps")
        .select("id, description, step_order, role_specific, roles, narrative")
        .eq("scenario_id", esc.id)
        .order("step_order", { ascending: true });

      if (e2) {
        setErr(e2.message || "Error cargando pasos");
        setLoading(false);
        return;
      }

      // Cargar preguntas por paso, filtrando por rol
      const stepsWithQs = [];
      for (const s of st || []) {
        if (!isVisibleForRole(s.roles, userRole)) continue;

        const { data: qs, error: e3 } = await supabase
          .from("questions")
          .select("id, text:question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit, critical_rationale")
          .eq("step_id", s.id)
          .order("id", { ascending: true });

        if (e3) {
          setErr(e3.message || "Error cargando preguntas");
          setLoading(false);
          return;
        }

        const qsFiltered = (qs || []).filter((q) => isVisibleForRole(q.roles, userRole));

        stepsWithQs.push({
          ...s,
          questions: qsFiltered.map((q, i) => ({
            ...q,
            _options: normalizeOptions(q.options),
          })),
        });
      }
      setSteps(stepsWithQs);
      setLoading(false);
    }

    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!mounted) return;
      setSession(sess ?? null);
      if (!sess) navigate("/", { replace: true });
    });
    return () => {
      mounted = false;
      try {
        sub?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, [id, navigate, initialAttemptId]);

  // Ticker para countdown (moved to top-level)
  useEffect(() => {
    if (!expiresAt) return;
    if (timeUp) return;

    const expMs = new Date(expiresAt).getTime();
    const idInt = setInterval(() => {
      const remain = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
      setRemainingSecs(remain);
      if (remain === 0) {
        setTimeUp(true);
      }
    }, 1000);

    return () => clearInterval(idInt);
  }, [expiresAt, timeUp]);

  useEffect(() => {
    if (!currentStep || showSummary || !isTimedStep(currentStep)) return;
    const int = setInterval(() => {
      setQTick((t) => t + 1);
      setQTimers((prev) => {
        const next = { ...prev };
        const now = Date.now();
        const newlyExpired = [];
        for (const q of (currentStep?.questions || [])) {
          const t = next[q.id];
          if (!q?.time_limit || !t) continue;
          const limit = Number(q.time_limit) || 0;
          const elapsed = Math.floor((now - t.start) / 1000);
          const remaining = Math.max(0, limit - elapsed);
          const expired = remaining <= 0;
          if (!t.expired && expired) newlyExpired.push(q.id);
          next[q.id] = { ...t, remaining, expired };
        }
        if (newlyExpired.length) {
          setAnswers((ans) => {
            const updated = { ...ans };
            for (const qid of newlyExpired) {
              if (!updated[qid]) {
                updated[qid] = { selectedKey: null, selectedIndex: null, isCorrect: false };
              }
            }
            return updated;
          });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(int);
  }, [currentStep, showSummary]);

  // Auto-finalizar cuando se acaba el tiempo (moved to top-level)
  useEffect(() => {
    if (!timeUp || showSummary) return;
    // Si se agota el tiempo, finalizamos como "abandonado" salvo que ya estén todas respondidas (entonces "finalizado")
    const handler = async () => {
      await finishAttempt(allAnswered ? "finalizado" : "abandonado");
    };
    handler();
  }, [timeUp, showSummary, allAnswered]);

  async function selectAnswer(q, optKey, optIndex) {
    if (qTimers[q.id]?.expired) {
      console.warn("[SimulacionDetalle] Pregunta expirada: no se puede responder");
      return;
    }
    // Evitar re-selección: si ya existe una respuesta para esta pregunta, no hacer nada
    if (answers[q.id]?.selectedKey != null) {
      return;
    }
    if (remainingSecs !== null && remainingSecs <= 0) {
      console.warn("[SimulacionDetalle] Tiempo agotado: no se pueden registrar más respuestas");
      return;
    }
    const isCorrect = Number(q.correct_option) === Number(optIndex);

    // Optimistic UI
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { selectedKey: optKey, selectedIndex: Number(optIndex), isCorrect },
    }));

    if (!session?.user?.id || !attemptId) {
      console.warn("[SimulacionDetalle] Falta session o attemptId");
      return;
    }

    try {
      // upsert por (attempt_id, question_id)
      const { error: upErr } = await supabase
        .from("attempt_answers")
        .upsert(
          {
            attempt_id: attemptId,
            question_id: q.id,
            selected_option: Number(optIndex),
            is_correct: isCorrect,
          },
          { onConflict: "attempt_id,question_id" }
        );

      if (upErr) {
        console.error("[SimulacionDetalle] upsert attempt_answers error:", upErr);
      } else {
        console.debug("[SimulacionDetalle] respuesta guardada en intento");
      }
    } catch (e) {
      console.error("[SimulacionDetalle] excepción guardando respuesta:", e);
    }
  }

  async function finishAttempt(statusOverride) {
    if (!attemptId) return;

    // calcula correctas desde memoria local
    const correctCount = Object.values(answers).filter((a) => a?.isCorrect).length;
    const total = totalQuestions || 0;
    const base = total ? (correctCount / total) * 100 : 0;
    const hintCount = Object.values(hintsUsed).reduce((a, b) => a + (b || 0), 0);
    const penalty = hintCount * HINT_PENALTY_POINTS;
    const score = Math.max(0, Math.round(base - penalty));

    try {
      const { error: updErr } = await supabase
        .from("attempts")
        .update({
          finished_at: new Date().toISOString(),
          correct_count: correctCount,
          total_count: total,
          score,
          ...(statusOverride ? { status: statusOverride } : { status: "finalizado" }),
        })
        .eq("id", attemptId);

      if (updErr) {
        console.error("[SimulacionDetalle] finishAttempt update error:", updErr);
        alert(`Hubo un problema al finalizar el intento: ${updErr.message || updErr.details || "Error desconocido"}`);
      } else {
        setShowSummary(true);
        try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
      }
    } catch (e) {
      console.error("[SimulacionDetalle] finishAttempt excepción:", e);
      alert(`Hubo un problema al finalizar el intento: ${e.message || e.toString()}`);
    }
  }

  function nextStep() {
    setCurrentIdx((i) => Math.min(i + 1, steps.length - 1));
  }
  function prevStep() {
    setCurrentIdx((i) => Math.max(i - 1, 0));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando…</div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-800">No has iniciado sesión</h1>
          <p className="text-slate-600 mt-2">Por favor, vuelve a la página de inicio para acceder.</p>
          <a
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    );
  }

  // Early render: Briefing Pantalla 0
  if (!showSummary && showBriefing) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="max-w-6xl mx-auto px-5 py-6 mt-2">
          <PrebriefBanner objective={brief?.learning_objective || brief?.title || scenario?.title} />
          {/* CABECERA BRIEFING */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">{brief?.title || scenario?.title}</h1>
            {brief?.context && <p className="text-slate-600 mt-1">{brief.context}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {(Array.isArray(brief?.chips) ? brief.chips : []).map((c, i) => (
                <Chip key={i}>{c}</Chip>
              ))}
            </div>
          </div>

          {/* Datos del paciente */}
          <CaseCard title="Datos del paciente">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                {brief?.demographics?.age && <Row label="Edad" value={brief.demographics.age} />}
                {brief?.demographics?.weightKg != null && (
                  <Row label="Peso" value={`${brief.demographics.weightKg} kg`} />
                )}
                {brief?.demographics?.sex && <Row label="Sexo" value={brief.demographics.sex} />}
                {brief?.chief_complaint && <Row label="Motivo" value={brief.chief_complaint} />}
              </div>
              <div>
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {(brief?.history || []).map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                  {!brief?.history?.length && <li className="text-slate-500">—</li>}
                </ul>
              </div>
            </div>
          </CaseCard>

          {/* Triángulo pediátrico */}
          <CaseCard title="Triángulo de evaluación pediátrica">
            <div className="grid grid-cols-3 gap-3 text-center">
              {(["appearance", "breathing", "circulation"]).map((k) => {
                const v = brief?.triangle?.[k];
                const clr = v === "red"
                  ? "bg-rose-100 text-rose-700 border-rose-200"
                  : v === "amber"
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-emerald-100 text-emerald-700 border-emerald-200";
                const label = k === "appearance" ? "Apariencia" : k === "breathing" ? "Respiración" : "Circulación";
                return (
                  <div key={k} className={`rounded-xl border p-4 ${v ? clr : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    <div className="text-sm">{label}</div>
                    <div className="text-lg font-semibold capitalize">{v || "—"}</div>
                  </div>
                );
              })}
            </div>
          </CaseCard>

          {/* Constantes y Exploración */}
          <CaseCard title="Constantes y exploración">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <Row label="FC" value={brief?.vitals?.fc != null ? `${brief.vitals.fc} lpm` : "—"} alert={brief?.vitals?.fc > 170} />
                <Row label="FR" value={brief?.vitals?.fr != null ? `${brief.vitals.fr} rpm` : "—"} />
                <Row label="SatO₂" value={brief?.vitals?.sat != null ? `${brief.vitals.sat} %` : "—"} alert={brief?.vitals?.sat < 92} />
                <Row label="Tª" value={brief?.vitals?.temp != null ? `${brief.vitals.temp} ºC` : "—"} />
                {Array.isArray(brief?.vitals?.notes) && brief.vitals.notes.length > 0 && (
                  <ul className="list-disc pl-5 mt-2 text-sm text-slate-700">
                    {brief.vitals.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  {(brief?.exam || []).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {!brief?.exam?.length && <li className="text-slate-500">—</li>}
                </ul>
              </div>
            </div>
          </CaseCard>

          {/* Pruebas complementarias */}
          <CaseCard title="Pruebas complementarias">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">Analítica rápida</h4>
                <ul className="text-sm text-slate-700">
                  {(brief?.quick_labs || []).map((q, i) => (
                    <li key={i} className="flex justify-between border-b py-1">
                      <span>{q.name}</span>
                      <span className="font-medium">{q.value}</span>
                    </li>
                  ))}
                  {!brief?.quick_labs?.length && <li className="text-slate-500">—</li>}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">Imagen</h4>
                <ul className="text-sm text-slate-700">
                  {(brief?.imaging || []).map((im, i) => (
                    <li key={i} className="flex justify-between border-b py-1">
                      <span>{im.name}</span>
                      <span className="font-medium">{im.status === "ordered" ? "Solicitada" : "Disponible"}</span>
                    </li>
                  ))}
                  {!brief?.imaging?.length && <li className="text-slate-500">—</li>}
                </ul>
              </div>
            </div>
          </CaseCard>

          {/* Timeline */}
          <CaseCard title="Timeline">
            <ol className="text-sm text-slate-700">
              {(brief?.timeline || []).map((t, i) => (
                <li key={i} className="py-1">{t.tmin}’ · {t.event}</li>
              ))}
              {!brief?.timeline?.length && <li className="text-slate-500">—</li>}
            </ol>
          </CaseCard>

          {/* Red flags */}
          <CaseCard title="Banderas rojas">
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
              {(brief?.red_flags || []).map((r, i) => (
                <li key={i} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">{r}</li>
              ))}
              {!brief?.red_flags?.length && <li className="text-slate-500">—</li>}
            </ul>
          </CaseCard>

          {/* Objetivos por rol */}
          <CaseCard title="Objetivos por rol">
            <div className="grid sm:grid-cols-3 gap-4">
              {["MED", "NUR", "PHARM"].map((role) => (
                <div key={role}>
                  <div className="text-xs font-semibold text-slate-500 mb-2">
                    {role === "MED" ? "Médico" : role === "NUR" ? "Enfermería" : "Farmacia"}
                  </div>
                  <ul className="list-disc pl-5 text-sm text-slate-700">
                    {(brief?.objectives?.[role] || []).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                    {!((brief?.objectives?.[role] || []).length) && <li className="text-slate-500">—</li>}
                  </ul>
                </div>
              ))}
            </div>
          </CaseCard>

          {/* Acciones críticas del caso */}
          <CaseCard title="Acciones críticas del caso">
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
              {(brief?.critical_actions || []).map((r, i) => (
                <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">⚠️ {r}</li>
              ))}
              {!brief?.critical_actions?.length && (
                <li className="text-slate-500">—</li>
              )}
            </ul>
          </CaseCard>

          {/* Competencias del escenario */}
          <CaseCard title="Competencias del escenario">
            <ul className="grid sm:grid-cols-3 gap-2 text-sm text-slate-700">
              {(brief?.competencies || []).map((c, i) => (
                <li key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">{c}</li>
              ))}
              {!brief?.competencies?.length && (
                <li className="text-slate-500">—</li>
              )}
            </ul>
          </CaseCard>

          {/* Barra de inicio */}
          <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-slate-300 bg-white/90 backdrop-blur p-4 shadow-lg">
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{scenario?.title}</span>
              <span className="mx-2">·</span>
              <span>{brief?.level === "intermediate" ? "Nivel intermedio" : brief?.level === "advanced" ? "Nivel avanzado" : "Nivel básico"}</span>
              <span className="mx-2">·</span>
              <span>~{brief?.estimated_minutes ?? scenario?.estimated_minutes ?? 10} min</span>
            </div>
            <button
              onClick={() => setShowBriefing(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:opacity-90"
            >
              Comenzar simulación
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {showSummary ? (
        <section className="max-w-6xl mx-auto px-5 py-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {(() => {
              const correctCount = Object.values(answers).filter((a) => a?.isCorrect).length;
              const total = totalQuestions || 0;
              const base = total ? (correctCount / total) * 100 : 0;
              const hintCount = Object.values(hintsUsed).reduce((a, b) => a + (b || 0), 0);
              const penalty = hintCount * HINT_PENALTY_POINTS;
              const score = Math.max(0, Math.round(base - penalty));
              return (
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Resumen del intento</h2>
                    <p className="text-slate-600 mt-1">
                      Nota obtenida y detalle de respuestas.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <ScoreDonut score={score} size={84} />
                      <div className="mt-1 text-sm text-slate-600">
                        {correctCount}/{total} correctas
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Penalización por pistas: {Object.values(hintsUsed).reduce((a,b)=>a+(b||0),0) * HINT_PENALTY_POINTS} puntos
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Resultado de preguntas críticas */}
            {(() => {
              const allQs = steps.flatMap((s) => s.questions || []);
              const crit = allQs.filter(q => q.is_critical);
              if (!crit.length) return null;
              const failed = crit.filter(q => !(answers[q.id]?.isCorrect));
              return (
                <div className={`rounded-xl border p-4 ${failed.length ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {failed.length ? "Preguntas críticas falladas" : "Todas las preguntas críticas superadas"}
                    </div>
                    <div className="text-sm text-slate-600">
                      {crit.length - failed.length}/{crit.length} superadas
                    </div>
                  </div>
                  {failed.length > 0 && (
                    <ul className="mt-2 space-y-3 pl-5 text-sm">
                      {failed.map(q => (
                        <li key={q.id} className="list-disc">
                          <div className="text-slate-800 font-medium">{q.text}</div>
                          {q.critical_rationale && (
                            <p className="mt-1 text-slate-600">{q.critical_rationale}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}

            <div className="mt-6 space-y-6">
              {steps.flatMap((s) => s.questions || []).map((q) => {
                const saved = answers[q.id] || {};
                const selectedIdx =
                  typeof saved.selectedIndex === "number" ? saved.selectedIndex : null;
                const selectedLabel =
                  selectedIdx != null ? getOptionLabelByIndex(q, selectedIdx) : "—";
                const correctIdx = Number(q.correct_option);
                const correctLabel = getOptionLabelByIndex(q, correctIdx);
                const correcto = !!saved.isCorrect;

                return (
                  <article key={q.id} className={`rounded-xl border p-4 ${q.is_critical ? "border-amber-300 bg-amber-50/30" : "border-slate-200"}`}>
                    <p className="font-medium">{q.text}</p>
                    {q.is_critical && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        ⚠️ Pregunta crítica
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        className={`rounded-lg px-3 py-2 text-sm border ${
                          correcto
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        <span className="font-semibold">
                          {correcto ? "Tu respuesta" : "Tu respuesta (incorrecta)"}:{" "}
                        </span>
                        <span>{selectedLabel}</span>
                      </div>

                      <div className="rounded-lg px-3 py-2 text-sm border bg-slate-50 text-slate-800 border-slate-200">
                        <span className="font-semibold">Respuesta correcta: </span>
                        <span>{correctLabel}</span>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="mt-3 text-sm text-slate-700">
                        <span className="font-semibold">Explicación: </span>
                        {q.explanation}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/simulacion")}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                Ver escenarios
              </button>
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-lg bg-[#1a69b8] text-white hover:opacity-95"
              >
                Volver al panel
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Header del escenario (fijo bajo el Navbar) */}
          <header className="sticky top-[72px] z-30">
            <div className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1]">
              <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3 text-white">
                {/* Chips */}
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
                    {formatMode(scenario?.mode)}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
                    {formatLevel(scenario?.level)}
                  </span>
                  {rol ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
                      {formatRole(rol)}
                    </span>
                  ) : null}
                </div>

                {/* Título (truncado) */}
                <h1 className="ml-2 font-semibold truncate flex-1">
                  {scenario?.title || "Escenario"}
                </h1>

                {/* Tiempo */}
                {remainingSecs !== null && (
                  <div
                    className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ring-1
              ${remainingSecs <= 60
                ? "bg-rose-500/90 ring-rose-400 text-white"
                : "bg-white/15 ring-white/30 text-white"}`}
                    title="Tiempo restante"
                  >
                    <span className="text-xs">Tiempo</span>
                    <span className="font-mono text-sm tabular-nums">
                      {formatMMSS(remainingSecs)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-5 py-6 mt-2 grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar de pasos */}
            <aside className="md:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Pasos</h2>
                <ol className="space-y-2">
                  {steps.map((s, idx) => {
                    const active = idx === currentIdx;
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => setCurrentIdx(idx)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition
                            ${
                              active
                                ? "border-[#1d99bf] bg-[#1d99bf]/10"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                          <div className="text-sm font-medium">{s.description || `Paso ${idx + 1}`}</div>
                          {s.role_specific && (
                            <div className="text-xs text-slate-500">Específico de rol</div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={prevStep}
                    disabled={currentIdx === 0}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={currentIdx >= steps.length - 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </aside>

            {/* Contenido del paso */}
            <section className="md:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">
                    {currentStep?.description || `Paso ${currentIdx + 1}`}
                  </h2>
                  <span className="text-sm text-slate-600">
                    Respondidas en este paso: {answeredInStep}/{currentStep?.questions?.length ?? 0}
                  </span>
                </div>

                {/* Aviso por tiempo */}
                {timeUp && (
                  <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-sm">
                    El tiempo se ha agotado. No puedes seleccionar más respuestas. Puedes finalizar para ver el resumen.
                  </div>
                )}

                {/* Narrativa del paso */}
                {currentStep?.narrative && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold text-slate-500 mb-1">Historia · Paso {currentIdx + 1}</div>
                    <p className="text-sm text-slate-800 whitespace-pre-line">{currentStep.narrative}</p>
                  </div>
                )}

                {/* Preguntas */}
                <div className="mt-4 space-y-6">
                  {(currentStep?.questions || []).map((q) => {
                    const opts = q._options;
                    const saved = answers[q.id];
                    const selectedKey = saved?.selectedKey ?? null;
                    const isCorrect = saved?.isCorrect;

                    return (
                      <article key={q.id} className={`rounded-xl border p-4 ${q.is_critical ? "border-amber-300 bg-amber-50/30" : "border-slate-200"}`}>
                        <p className="font-medium">{q.text}</p>
                        {q.is_critical && (
                          <div className="mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            ⚠️ Pregunta crítica
                          </div>
                        )}
                        {isTimedStep(currentStep) && q.time_limit ? (
                          <div className="mt-2">
                            <div
                              className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded border ${
                                qTimers[q.id]?.expired
                                  ? "bg-rose-100 text-rose-800 border-rose-200"
                                  : (qTimers[q.id]?.remaining ?? q.time_limit) <= 10
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              ⏱️ {formatMMSS(qTimers[q.id]?.remaining ?? q.time_limit)}
                            </div>
                            <div className="h-1 bg-slate-200 rounded mt-1 overflow-hidden">
                              <div
                                className="h-1 bg-amber-500"
                                style={{ width: `${Math.max(0, Math.min(100, ((qTimers[q.id]?.remaining ?? q.time_limit) / q.time_limit) * 100))}%` }}
                              />
                            </div>
                            {qTimers[q.id]?.expired && !answers[q.id]?.selectedKey && (
                              <div className="mt-2 text-xs text-rose-700">Tiempo agotado: la pregunta se ha marcado como incorrecta.</div>
                            )}
                          </div>
                        ) : null}
                        {/* Botón de pista */}
                        {(() => {
                          let list = q.hints;
                          if (typeof list === "string") { try { list = JSON.parse(list); } catch { list = []; } }
                          const availableHints = Array.isArray(list) ? list : [];
                          const used = hintsUsed[q.id] || 0;
                          const canAsk = availableHints.length > 0 && used < availableHints.length && answers[q.id]?.selectedKey == null && !(timeUp || (remainingSecs !== null && remainingSecs <= 0)) && !qTimers[q.id]?.expired;
                          return (
                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => requestHint(q)}
                                disabled={!canAsk}
                                className="text-xs px-2 py-1 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
                                title={canAsk ? `Pedir pista (−${HINT_PENALTY_POINTS} puntos a la nota)` : "Pista no disponible"}
                              >
                                Pedir pista
                              </button>
                              { (revealedHints[q.id] || []).length > 0 && (
                                <span className="text-xs text-slate-600">Pistas usadas: {(revealedHints[q.id] || []).length}/{availableHints.length}</span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="mt-3 space-y-2">
                          {opts.map((o, idx) => {
                            const checked = selectedKey === o.key;
                            return (
                              <label
                                key={o.key}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border
                                ${
                                  checked
                                    ? "border-[#1d99bf] bg-[#1d99bf]/10"
                                    : "border-transparent hover:bg-slate-50"
                                }
                                ${answers[q.id]?.selectedKey != null ? " opacity-70 cursor-not-allowed" : ""}
                              `}
                              >
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  className="accent-[#1d99bf]"
                                  checked={checked}
                                  disabled={
                                    timeUp ||
                                    (remainingSecs !== null && remainingSecs <= 0) ||
                                    (answers[q.id]?.selectedKey != null) ||
                                    qTimers[q.id]?.expired
                                  }
                                  onChange={() => selectAnswer(q, o.key, idx)}
                                />
                                <span>{o.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        {/* Pistas reveladas */}
                        { (revealedHints[q.id] || []).length > 0 && (
                          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 text-sky-900 px-3 py-2 text-sm">
                            <div className="font-medium mb-1">Pistas</div>
                            <ul className="list-disc pl-5">
                              {revealedHints[q.id].map((h, i) => (
                                <li key={i}>{h}</li>
                              ))}
                            </ul>
                            <div className="mt-2 text-xs text-sky-800">Cada pista resta {HINT_PENALTY_POINTS} puntos de la nota final.</div>
                          </div>
                        )}

                        {selectedKey != null && (
                          <div
                            className={`mt-3 rounded-lg px-3 py-2 text-sm
                            ${
                              isCorrect
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {isCorrect ? "✅ Correcto" : "❌ Incorrecto"}
                            {q.explanation && (
                              <div className="mt-1 text-slate-700">
                                <span className="font-medium">Explicación: </span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {/* Navegación del paso (inferior) */}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={prevStep}
                    disabled={currentIdx === 0}
                    className="px-4 py-2 rounded-lg border border-slate-300 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                      className="px-4 py-2 rounded-lg border border-slate-300"
                    >
                      Arriba
                    </button>
                    <button
                      onClick={nextStep}
                      disabled={currentIdx >= steps.length - 1 || timeUp}
                      className="px-4 py-2 rounded-lg bg-[#1a69b8] text-white hover:opacity-95 disabled:opacity-40"
                    >
                      {currentIdx >= steps.length - 1 ? "Fin" : "Siguiente paso"}
                    </button>
                    <button
                      onClick={() => finishAttempt()}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                      disabled={!allAnswered && !timeUp}
                      title={allAnswered ? "Finalizar y guardar nota" : (timeUp ? "Tiempo agotado: se finalizará" : "Responde todas las preguntas para finalizar")}
                    >
                      Finalizar intento
                    </button>
                  </div>
                </div>
              </div>

              {/* Intentos anteriores */}
              <section className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Intentos anteriores</h3>
                <AttemptsList scenarioId={scenario?.id} />
              </section>
            </section>
          </main>
        </>
      )}
    </div>
  );
}

function AttemptsList({ scenarioId }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("attempts")
        .select("id, started_at, finished_at, correct_count, total_count, score, rol")
        .eq("scenario_id", scenarioId)
        .order("started_at", { ascending: false });
      if (!mounted) return;
      if (!error) setRows(data || []);
    })();
    return () => {
      mounted = false;
    };
  }, [scenarioId]);

  if (!rows.length) return <p className="text-slate-600">Aún no tienes intentos previos.</p>;
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-4 py-2">Fecha</th>
            <th className="text-left px-4 py-2">Rol</th>
            <th className="text-left px-4 py-2">Estado</th>
            <th className="text-left px-4 py-2">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const date = new Date(r.started_at).toLocaleString();
            const estado = r.finished_at ? "Finalizado" : "En curso";
            const res = r.finished_at
              ? `${r.correct_count}/${r.total_count} (${r.score ?? 0}%)`
              : "—";
            // use formatRole if available
            let roleLabel = "";
            if (r.rol) {
              roleLabel = formatRole(r.rol);
            }
            return (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{date}</td>
                <td className="px-4 py-2">{roleLabel}</td>
                <td className="px-4 py-2">{estado}</td>
                <td className="px-4 py-2">{res}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}