// src/pages/SimulacionDetalle.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

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
  const [steps, setSteps] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rol, setRol] = useState("");

  // Respuestas marcadas (solo memoria local por ahora)
  // answers: { [questionId]: { selectedKey, isCorrect } }
  const [answers, setAnswers] = useState({});
  const [showSummary, setShowSummary] = useState(false);

  // Intento actual
  const [attemptId, setAttemptId] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);      // ISO string from attempts.expires_at
  const [remainingSecs, setRemainingSecs] = useState(null); // number in seconds
  const [timeUp, setTimeUp] = useState(false);

  const currentStep = steps[currentIdx] || null;

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

      // Cargar pasos
      const { data: st, error: e2 } = await supabase
        .from("steps")
        .select("id, description, step_order, role_specific, roles")
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
          .select("id, text:question_text, options, correct_option, explanation, roles")
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
    const score = total ? Math.round((correctCount / total) * 10000) / 100 : 0; // 2 decimales

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {showSummary ? (
        <section className="max-w-6xl mx-auto px-5 py-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {(() => {
              const correctCount = Object.values(answers).filter((a) => a?.isCorrect).length;
              const total = totalQuestions || 0;
              const score = total ? Math.round((correctCount / total) * 100) : 0;
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
                    </div>
                  </div>
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
                  <article key={q.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-medium">{q.text}</p>

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

                {/* Preguntas */}
                <div className="mt-4 space-y-6">
                  {(currentStep?.questions || []).map((q) => {
                    const opts = q._options;
                    const saved = answers[q.id];
                    const selectedKey = saved?.selectedKey ?? null;
                    const isCorrect = saved?.isCorrect;

                    return (
                      <article key={q.id} className="rounded-xl border border-slate-200 p-4">
                        <p className="font-medium">{q.text}</p>
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
                                    (answers[q.id]?.selectedKey != null)
                                  }
                                  onChange={() => selectAnswer(q, o.key, idx)}
                                />
                                <span>{o.label}</span>
                              </label>
                            );
                          })}
                        </div>

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