import { useEffect, useMemo, useState } from "react";
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

export default function MicroCasePlayer({ microCase, onSubmitAttempt, participantRole }) {
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
  const totalDecisionNodes = useMemo(() => {
    return (microCase?.nodes || []).filter((node) => node.kind === "decision").length || 0;
  }, [microCase]);
  const progressRatio = totalDecisionNodes > 0 ? Math.min(1, history.length / totalDecisionNodes) : 0;
  const hasNode = Boolean(currentNode);
  const isTerminalNode = hasNode ? (currentNode.is_terminal || (currentNode.options?.length ?? 0) === 0) : false;

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

  const progressPercent = showSummary ? 100 : Math.round(progressRatio * 100);
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

              {!isTerminalNode ? (
                <div className="mt-6 grid gap-3">
                  {currentNode.options.map((option) => (
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
                <div className="mt-6 space-y-3">
                  <Toast message="Has alcanzado un desenlace del caso." tone="success" />
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
            <h4 className="text-sm font-semibold text-slate-800">Historial</h4>
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
      </aside>
    </div>
  );
}
