import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
function usePreviousAttempts(caseId) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    fetch(`/api/micro_cases?action=attempts&case_id=${caseId}`)
      .then((res) => res.json())
      .then((data) => {
        setAttempts(Array.isArray(data.attempts) ? data.attempts : []);
      })
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false));
  }, [caseId]);
  return { attempts, loading };
}
import ReactMarkdown from "react-markdown";

const ROLE_LABELS = {
  medico: "Medicina",
  enfermeria: "Enfermeria",
  farmacia: "Farmacia"
};

function useNodeGraph(microCase) {
  return useMemo(() => {
    const nodeMap = new Map();
    (microCase?.nodes || []).forEach((node) => {
      nodeMap.set(node.id, node);
    });
    const startId = microCase?.start_node_id || (microCase?.nodes?.[0]?.id ?? null);
    return { nodeMap, startId };
  }, [microCase]);
}

function Toast({ message, tone = "info" }) {
  const palette = tone === "success"
    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
    : tone === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-slate-50 border-slate-200 text-slate-600";
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${palette}`}>{message}</div>
  );
}

const FEEDBACK_DELAY_MS = 400;
const INFO_AUTO_ADVANCE_DELAY_MS = 1400;

export default function MicroCasePlayer({ microCase, onSubmitAttempt, participantRole }) {
  const { attempts: previousAttempts, loading: loadingAttempts } = usePreviousAttempts(microCase?.id);
  const { nodeMap, startId } = useNodeGraph(microCase);
  const [currentNodeId, setCurrentNodeId] = useState(startId);
  const [history, setHistory] = useState([]);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [isCompleted, setIsCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (isCompleted) return;
    setTick(Date.now());
    const interval = window.setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isCompleted]);

  useEffect(() => {
    setCurrentNodeId(startId);
    setHistory([]);
    setScore(0);
    setLastFeedback(null);
    setIsCompleted(false);
    setStartedAt(Date.now());
    setTick(Date.now());
  }, [startId]);

  const currentNode = currentNodeId ? nodeMap.get(currentNodeId) : null;
  const roleLabel = participantRole ? (ROLE_LABELS[participantRole] || participantRole) : null;
  // Nuevo: contar todos los nodos relevantes (decision, info, outcome no automáticos)
  const totalRelevantNodes = useMemo(() => {
    return (microCase?.nodes || []).filter(
      (node) => ["decision", "info", "outcome"].includes(node.kind)
    ).length || 0;
  }, [microCase]);

  // Nodos visitados: historial + el nodo actual si no está en historial
  const visitedNodeIds = useMemo(() => {
    const ids = new Set(history.map((step) => step.nodeId));
    if (currentNode && !ids.has(currentNode.id)) ids.add(currentNode.id);
    return ids;
  }, [history, currentNode]);

  const progressRatio = totalRelevantNodes > 0 ? Math.min(1, visitedNodeIds.size / totalRelevantNodes) : 0;
  const hasNode = Boolean(currentNode);
  const isTerminalNode = hasNode ? currentNode.is_terminal : false;

  // Auto-advance non-decision nodes when a next step is specified so the user avoids extra clicks.
  useEffect(() => {
    if (!currentNode || !currentNode.auto_advance_to || currentNode.kind === "decision" || currentNodeId === startId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCurrentNodeId(currentNode.auto_advance_to);
    }, INFO_AUTO_ADVANCE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [currentNode, currentNodeId, startId]);
  const autoAdvanceActive = Boolean(
    currentNode && currentNode.auto_advance_to && currentNode.kind !== "decision" && currentNodeId !== startId
  );

  function handleOptionSelect(option) {
    const nextScore = score + (option.score_delta || 0);
    const step = {
      nodeId: currentNode.id,
      optionId: option.id,
      outcomeLabel: option.feedback_md ? option.feedback_md.slice(0, 120) : null,
      scoreDelta: option.score_delta || 0,
      elapsedMs: Date.now() - startedAt
    };

    setHistory((prev) => [...prev, step]);
    setScore(nextScore);

    if (option.feedback_md) {
      setLastFeedback({ content: option.feedback_md, tone: option.score_delta >= 0 ? 'success' : 'error' });
    } else {
      setLastFeedback(null);
    }

    const nextNodeId = option.next_node_id || currentNode?.auto_advance_to || null;

    if (!nextNodeId) {
      setIsCompleted(true);
      setCurrentNodeId(null);
      setTick(Date.now());
    } else {
      setTimeout(() => {
        setCurrentNodeId(nextNodeId);
      }, FEEDBACK_DELAY_MS);
    }
  }

  async function handleFinish() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const durationSeconds = Math.max(0, Math.ceil((tick - startedAt) / 1000));
      const maybePromise = onSubmitAttempt?.({
        caseId: microCase.id,
        steps: history,
        scoreTotal: score,
        completed: true,
        durationSeconds
      });
      if (maybePromise && typeof maybePromise.then === "function") {
        await maybePromise;
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestart() {
    setCurrentNodeId(startId);
    setHistory([]);
    setScore(0);
    setLastFeedback(null);
    setIsCompleted(false);
    setStartedAt(Date.now());
    setTick(Date.now());
  }

  if (!microCase) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
        No se pudo cargar el microcaso.
      </div>
    );
  }

  const showSummary = !hasNode && isCompleted;
  const showUnavailable = !hasNode && !isCompleted;
  const elapsedSeconds = Math.max(0, Math.ceil((tick - startedAt) / 1000));

  if (showUnavailable) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
        Selecciona un punto de inicio válido para este microcaso.
      </div>
    );
  }

  // Solo mostrar 100% si el caso está completado (nodo terminal)
  const progressPercent = showSummary || isTerminalNode ? 100 : Math.round(progressRatio * 100);
  const progressBarWidth = `${Math.min(100, Math.max(0, progressPercent))}%`;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-5 text-white shadow-[0_26px_48px_-30px_rgba(15,23,42,0.8)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/60">Microcaso activo</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{microCase.title}</h3>
              <p className="mt-1 text-xs text-white/65">
                {showSummary ? 'Resumen final' : `Paso ${history.length + 1} de ${Math.max(totalDecisionNodes, history.length + 1)}`}
                {` • ${elapsedSeconds}s`}
              </p>
            </div>
            {roleLabel ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90">
                {roleLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-white/60">
              <span>Progreso</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: progressBarWidth }}></div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          {showSummary ? (
            <div className="space-y-4">
              <Toast message="Has completado este microcaso." tone="success" />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p>Repasa tus decisiones en el panel lateral o vuelve a intentarlo para explorar otros desenlaces.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? 'Guardando…' : 'Registrar resultado'}
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Reintentar microcaso
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="prose prose-sm max-w-none text-slate-800">
                <ReactMarkdown>{currentNode.body_md || "Escenario sin descripción"}</ReactMarkdown>
              </div>

              {lastFeedback ? (
                <div className="mt-4">
                  <Toast
                    message={<ReactMarkdown>{lastFeedback.content}</ReactMarkdown>}
                    tone={lastFeedback.tone}
                  />
                </div>
              ) : null}

              {autoAdvanceActive ? (
                <div className="mt-6 text-sm text-slate-500">
                  Avanzando automáticamente al siguiente paso…
                </div>
              ) : currentNodeId === startId && currentNode.auto_advance_to ? (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setCurrentNodeId(currentNode.auto_advance_to)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0A3D91] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0A3D91]/90"
                  >
                    Iniciar microcaso
                  </button>
                </div>
              ) : !isTerminalNode ? (
                <div className="mt-6 grid gap-3">
                  {(currentNode.options || []).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleOptionSelect(option)}
                      className="text-left rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-[#0A3D91] hover:bg-[#0A3D91]/5"
                    >
                      <ReactMarkdown>{option.label}</ReactMarkdown>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border-2 p-6 text-center">
                    {currentNode.metadata?.is_correct === true ? (
                      <div className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-emerald-900">¡Paciente Estabilizado!</h3>
                        <p className="text-sm text-emerald-700">
                          El paciente ha respondido bien al tratamiento y presenta signos de recuperación.
                        </p>
                      </div>
                    ) : currentNode.metadata?.is_correct === false ? (
                      <div className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                          <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-amber-900">Escalada Requerida</h3>
                        <p className="text-sm text-amber-700">
                          Se requiere intervención de un especialista superior o derivación a centro de mayor complejidad.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                          <svg className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Evolucion Critica</h3>
                        <p className="text-sm text-slate-700">
                          Este desenlace marca un punto de inflexion clinica. Analiza los detalles para identificar decisiones que pudieron cambiar la trayectoria del paciente.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="prose prose-sm max-w-none text-slate-800">
                      <ReactMarkdown>{currentNode.body_md || "Caso completado."}</ReactMarkdown>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleFinish}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {submitting ? 'Guardando…' : 'Registrar resultado'}
                    </button>
                    <button
                      type="button"
                      onClick={handleRestart}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Reintentar microcaso
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-900 px-4 py-5 text-white">
          <h4 className="text-sm font-semibold tracking-wide uppercase text-slate-200">Progreso</h4>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Decisiones tomadas</span>
              <span className="font-semibold">{history.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Puntuación</span>
              <span className="font-semibold">{score}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tiempo transcurrido</span>
              <span className="font-semibold">{elapsedSeconds}s</span>
            </div>
          </div>
        </div>

        {history.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5">
            <h4 className="text-sm font-semibold text-slate-800">Historial actual</h4>
            <ol className="mt-3 space-y-2 text-xs text-slate-600">
              {history.map((step, index) => (
                <li key={`${step.nodeId}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span>Paso {index + 1}</span>
                    <span className="font-semibold text-slate-700">{step.scoreDelta >= 0 ? `+${step.scoreDelta}` : step.scoreDelta} pts</span>
                  </div>
                  {step.outcomeLabel ? (
                    <p className="mt-1 text-[0.7rem] text-slate-500 line-clamp-2">{step.outcomeLabel}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5">
          <h4 className="text-sm font-semibold text-slate-800">Intentos previos</h4>
          {loadingAttempts ? (
            <div className="text-xs text-slate-500">Cargando intentos…</div>
          ) : previousAttempts.length === 0 ? (
            <div className="text-xs text-slate-500">No hay intentos previos registrados.</div>
          ) : (
            <ol className="mt-3 space-y-2 text-xs text-slate-600">
              {previousAttempts.map((att) => (
                <li key={att.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span>{dayjs(att.completed_at || att.created_at).format("DD/MM/YYYY HH:mm")}</span>
                    <span className="font-semibold text-slate-700">{att.score_total} pts</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span>Rol: {ROLE_LABELS[att.attempt_role] || att.attempt_role || "-"}</span>
                    <span>{att.duration_seconds ? `${att.duration_seconds}s` : "-"}</span>
                  </div>
                  <span className="block mt-1 text-[0.7rem] text-slate-500">{att.status === "completed" ? "Completado" : "En progreso"}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}
