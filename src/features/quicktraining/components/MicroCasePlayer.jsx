import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import ReactMarkdown from "react-markdown";

const ROLE_LABELS = {
  medico: "Medicina",
  enfermeria: "Enfermería",
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

function usePreviousAttempts(caseId, token, version = 0) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!caseId || !token) return;
    setLoading(true);
    fetch(`/api/micro_cases?action=attempts&case_id=${caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) return { attempts: [] };
        return res.json();
      })
      .then((data) => setAttempts(Array.isArray(data.attempts) ? data.attempts : []))
      .catch(() => setAttempts([]))
      .finally(() => setLoading(false));
  }, [caseId, token, version]);
  return { attempts, loading };
}

const FEEDBACK_DELAY_MS = 400;
const INFO_AUTO_ADVANCE_DELAY_MS = 1400;

export default function MicroCasePlayer({ microCase, onSubmitAttempt, participantRole, token }) {
  const [attemptsVersion, setAttemptsVersion] = useState(0);
  const { attempts: previousAttempts, loading: loadingAttempts } = usePreviousAttempts(microCase?.id, token, attemptsVersion);
  const { nodeMap, startId } = useNodeGraph(microCase);
  const [currentNodeId, setCurrentNodeId] = useState(startId);
  const [history, setHistory] = useState([]);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [score, setScore] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [isCompleted, setIsCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    setCurrentNodeId(startId);
    setHistory([]);
    setScore(0);
    setLastFeedback(null);
    setIsCompleted(false);
    setRegistered(false);
  }, [startId]);

  const currentNode = currentNodeId ? nodeMap.get(currentNodeId) : null;
  const roleLabel = participantRole ? (ROLE_LABELS[participantRole] || participantRole) : null;

  const totalRelevantNodes = useMemo(() => {
    return (microCase?.nodes || []).filter(
      (node) => ["decision", "info", "outcome"].includes(node.kind)
    ).length || 0;
  }, [microCase]);

  const visitedNodeIds = useMemo(() => {
    const ids = new Set(history.map((step) => step.nodeId));
    if (currentNode && !ids.has(currentNode.id)) ids.add(currentNode.id);
    return ids;
  }, [history, currentNode]);

  const progressRatio = totalRelevantNodes > 0 ? Math.min(1, visitedNodeIds.size / totalRelevantNodes) : 0;
  const hasNode = Boolean(currentNode);
  const isTerminalNode = hasNode ? currentNode.is_terminal : false;
  const showSummary = !hasNode && isCompleted;
  const showUnavailable = !hasNode && !isCompleted;
  const progressPercent = showSummary || isTerminalNode ? 100 : Math.round(progressRatio * 100);

  // Auto-advance
  useEffect(() => {
    if (!currentNode || !currentNode.auto_advance_to || currentNode.kind === "decision" || currentNodeId === startId) return;
    const timer = window.setTimeout(() => setCurrentNodeId(currentNode.auto_advance_to), INFO_AUTO_ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [currentNode, currentNodeId, startId]);

  const autoAdvanceActive = Boolean(
    currentNode && currentNode.auto_advance_to && currentNode.kind !== "decision" && currentNodeId !== startId
  );

  function handleOptionSelect(option) {
    const nextScore = score + (option.score_delta || 0);
    setHistory((prev) => [...prev, {
      nodeId: currentNode.id,
      nodeBody: currentNode.body_md || "",
      allOptions: currentNode.options || [],
      chosenOptionId: option.id,
      chosenLabel: option.label,
      scoreDelta: option.score_delta || 0,
      feedback: option.feedback_md || null,
    }]);
    setScore(nextScore);
    setLastFeedback(option.feedback_md ? { content: option.feedback_md, positive: (option.score_delta || 0) >= 0 } : null);

    const nextNodeId = option.next_node_id || currentNode?.auto_advance_to || null;
    if (!nextNodeId) {
      setIsCompleted(true);
      setCurrentNodeId(null);
    } else {
      setTimeout(() => setCurrentNodeId(nextNodeId), FEEDBACK_DELAY_MS);
    }
  }

  async function handleFinish() {
    if (submitting || registered) return;
    if (!token) return;
    setSubmitting(true);
    try {
      const durationSeconds = Math.max(0, Math.ceil((Date.now() - startedAt) / 1000));
      const maybePromise = onSubmitAttempt?.({ caseId: microCase.id, steps: history, scoreTotal: score, completed: true, durationSeconds });
      if (maybePromise && typeof maybePromise.then === "function") await maybePromise;
      setRegistered(true);
      setAttemptsVersion((v) => v + 1);
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
    setRegistered(false);
  }

  if (!microCase) return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      No se pudo cargar el microcaso.
    </div>
  );

  if (showUnavailable) return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      Selecciona un punto de inicio válido para este microcaso.
    </div>
  );

  // ── END SCREEN ──
  if (showSummary || isTerminalNode) {
    const isSuccess = currentNode?.metadata?.is_correct === true;
    const isFailure = currentNode?.metadata?.is_correct === false;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Outcome */}
        <div className={`rounded-2xl border-2 p-6 text-center ${isSuccess ? 'border-emerald-200 bg-emerald-50' : isFailure ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
          <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${isSuccess ? 'bg-emerald-100' : isFailure ? 'bg-amber-100' : 'bg-slate-100'}`}>
            {isSuccess ? (
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : isFailure ? (
              <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            ) : (
              <svg className="h-7 w-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </div>
          <h3 className={`text-lg font-semibold ${isSuccess ? 'text-emerald-900' : isFailure ? 'text-amber-900' : 'text-slate-800'}`}>
            {isSuccess ? 'Paciente estabilizado' : isFailure ? 'Escalada requerida' : 'Caso completado'}
          </h3>
          {currentNode?.body_md && (
            <div className={`mt-2 text-sm prose prose-sm max-w-none ${isSuccess ? 'text-emerald-800' : isFailure ? 'text-amber-800' : 'text-slate-600'}`}>
              <ReactMarkdown>{currentNode.body_md}</ReactMarkdown>
            </div>
          )}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-semibold text-slate-700">
            Puntuación final: <span className="text-[#0A3D91] font-bold">{score} pts</span>
          </div>
        </div>

        {/* Revisión de decisiones */}
        {history.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="text-sm font-semibold text-slate-800 mb-4">Revisión de tus decisiones</h4>
            <div className="space-y-4">
              {history.map((step, idx) => {
                const bestOption = [...(step.allOptions || [])].sort((a, b) => (b.score_delta || 0) - (a.score_delta || 0))[0];
                const wasOptimal = bestOption?.id === step.chosenOptionId;
                return (
                  <div key={`${step.nodeId}-${idx}`} className="border border-slate-100 rounded-xl p-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Decisión {idx + 1}</p>
                    {step.nodeBody && (
                      <div className="text-xs text-slate-600 mb-3 prose prose-xs max-w-none line-clamp-2">
                        <ReactMarkdown>{step.nodeBody}</ReactMarkdown>
                      </div>
                    )}
                    {/* Lo que elegiste */}
                    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 mb-2 ${wasOptimal ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                      <span className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${wasOptimal ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'}`}>
                        {wasOptimal ? '✓' : '✗'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700">Tu elección</p>
                        <p className="text-xs text-slate-600 mt-0.5">{step.chosenLabel}</p>
                        {step.feedback && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">{step.feedback.slice(0, 120)}{step.feedback.length > 120 ? '…' : ''}</p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold flex-shrink-0 ${step.scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {step.scoreDelta >= 0 ? '+' : ''}{step.scoreDelta}
                      </span>
                    </div>
                    {/* Opción óptima (si no la eligió) */}
                    {!wasOptimal && bestOption && (
                      <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-blue-50 border border-blue-100">
                        <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center bg-[#0A3D91] text-white text-[10px]">★</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#0A3D91]">Opción óptima</p>
                          <p className="text-xs text-slate-600 mt-0.5">{bestOption.label}</p>
                        </div>
                        <span className="text-xs font-semibold text-[#0A3D91] flex-shrink-0">
                          +{bestOption.score_delta || 0}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Intentos previos */}
        {previousAttempts.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Intentos anteriores</h4>
            <div className="space-y-2">
              {previousAttempts.slice(0, 5).map((att) => (
                <div key={att.id} className="flex items-center justify-between text-xs text-slate-600 py-1.5 border-b border-slate-100 last:border-0">
                  <span>{dayjs(att.completed_at || att.created_at).format("DD/MM/YY HH:mm")}</span>
                  <span className="font-semibold text-slate-800">{att.score_total} pts · {att.duration_seconds ? `${att.duration_seconds}s` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-3">
          {!registered ? (
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A3D91] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E6ACB] disabled:opacity-60 transition"
            >
              {submitting ? 'Guardando…' : 'Registrar resultado'}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700">
              ✓ Resultado registrado
            </span>
          )}
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── PLAYER ──
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header compacto */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-0.5">Paso {history.length + 1} de {Math.max(totalRelevantNodes, history.length + 1)}</p>
            <h3 className="text-base font-semibold text-white leading-snug">{microCase.title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {roleLabel && (
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                {roleLabel}
              </span>
            )}
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
              {score} pts
            </span>
          </div>
        </div>
        {/* Barra de progreso */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-white/70 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Contenido del nodo */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
        <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
          <ReactMarkdown>{currentNode.body_md || "Sin descripción"}</ReactMarkdown>
        </div>

        {/* Feedback de la decisión anterior */}
        {lastFeedback && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${lastFeedback.positive ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{lastFeedback.content}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Opciones / controles */}
        <div className="mt-6">
          {autoAdvanceActive ? (
            <p className="text-sm text-slate-400 italic">Continuando…</p>
          ) : currentNodeId === startId && currentNode.auto_advance_to ? (
            <button
              type="button"
              onClick={() => setCurrentNodeId(currentNode.auto_advance_to)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A3D91] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E6ACB] transition"
            >
              Empezar caso →
            </button>
          ) : !isTerminalNode ? (
            <div className="grid gap-2.5">
              {(currentNode.options || []).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionSelect(option)}
                  className="text-left rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 hover:border-[#0A3D91] hover:bg-[#0A3D91]/4 transition group"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 border-slate-300 group-hover:border-[#0A3D91] transition" />
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{option.label}</ReactMarkdown>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
