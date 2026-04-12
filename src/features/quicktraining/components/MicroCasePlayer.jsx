import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import ReactMarkdown from "react-markdown";

/* ─── CSS keyframes ──────────────────────────────────────────── */
const KEYFRAMES = `
@keyframes deltaFloat {
  0%   { opacity:1; transform:translateY(0) scale(1.15); }
  60%  { opacity:1; transform:translateY(-18px) scale(1.2); }
  100% { opacity:0; transform:translateY(-34px) scale(0.9); }
}
@keyframes scoreFlash {
  0%,100% { background:rgba(255,255,255,0.12); }
  40%     { background:rgba(255,255,255,0.35); }
}
@keyframes correctPulse {
  0%   { box-shadow:0 0 0 0 rgba(16,185,129,0.45); }
  70%  { box-shadow:0 0 0 9px rgba(16,185,129,0); }
  100% { box-shadow:0 0 0 0 rgba(16,185,129,0); }
}
@keyframes wrongShake {
  0%,100% { transform:translateX(0); }
  20%     { transform:translateX(-6px); }
  40%     { transform:translateX(6px); }
  60%     { transform:translateX(-4px); }
  80%     { transform:translateX(4px); }
}
@keyframes confettiFall {
  0%   { transform:translateY(-20px) rotate(0deg); opacity:1; }
  80%  { opacity:0.8; }
  100% { transform:translateY(100vh) rotate(760deg); opacity:0; }
}
@keyframes starPop {
  0%   { transform:scale(0) rotate(-30deg); opacity:0; }
  60%  { transform:scale(1.4) rotate(6deg); opacity:1; }
  100% { transform:scale(1) rotate(0deg);  opacity:1; }
}
@keyframes starGlow {
  0%,100% { filter:drop-shadow(0 0 0px #fbbf24); }
  50%     { filter:drop-shadow(0 0 8px #fbbf24); }
}
@keyframes nodePop {
  0%   { transform:scale(0.5); opacity:0.4; }
  60%  { transform:scale(1.25); }
  100% { transform:scale(1); opacity:1; }
}
.anim-delta   { animation:deltaFloat 1.1s ease-out forwards; }
.anim-flash   { animation:scoreFlash 0.5s ease-out; }
.anim-correct { animation:correctPulse 0.6s ease-out; }
.anim-wrong   { animation:wrongShake 0.4s ease-out; }
.star-1 { animation:starPop 0.45s 0.05s both, starGlow 1.5s 0.5s ease-in-out infinite; }
.star-2 { animation:starPop 0.45s 0.35s both, starGlow 1.5s 0.8s ease-in-out infinite; }
.star-3 { animation:starPop 0.45s 0.65s both, starGlow 1.5s 1.1s ease-in-out infinite; }
.node-pop { animation:nodePop 0.3s ease-out both; }
`;

const ROLE_LABELS = { medico:"Medicina", enfermeria:"Enfermería", farmacia:"Farmacia" };

/* ─── Confetti ───────────────────────────────────────────────── */
const CONFETTI_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];
function Confetti() {
  const pieces = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 1.8 + Math.random() * 1.4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 7,
      circle: Math.random() > 0.5,
      rot: Math.random() * 360,
    }))
  ).current;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '-16px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.circle ? '50%' : '2px',
            transform: `rotate(${p.rot}deg)`,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Stars ──────────────────────────────────────────────────── */
function Stars({ count }) {
  return (
    <div className="flex items-center justify-center gap-3 my-2">
      {[1, 2, 3].map(n => (
        <span
          key={n}
          className={`text-4xl select-none ${n <= count ? `star-${n}` : 'opacity-20 grayscale'}`}
          style={{ display: 'inline-block' }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}

/* ─── Grade helpers ──────────────────────────────────────────── */
function getGrade(score, maxPossible) {
  if (maxPossible <= 0) return null;
  const pct = score / maxPossible;
  if (pct >= 0.85) return { label:"Excelente", stars:3, colorText:"text-emerald-700", colorBg:"bg-emerald-50",  colorBorder:"border-emerald-300", bar:"bg-emerald-500"  };
  if (pct >= 0.60) return { label:"Notable",   stars:2, colorText:"text-blue-700",    colorBg:"bg-blue-50",    colorBorder:"border-blue-300",    bar:"bg-blue-500"    };
  if (pct >= 0.30) return { label:"Suficiente", stars:1, colorText:"text-amber-700",   colorBg:"bg-amber-50",   colorBorder:"border-amber-300",   bar:"bg-amber-500"   };
  return                  { label:"Mejorable",  stars:0, colorText:"text-red-700",     colorBg:"bg-red-50",     colorBorder:"border-red-300",     bar:"bg-red-400"     };
}

function formatTime(secs) {
  if (!secs || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ─── useNodeGraph ───────────────────────────────────────────── */
function useNodeGraph(microCase) {
  return useMemo(() => {
    const nodeMap = new Map();
    (microCase?.nodes || []).forEach(n => nodeMap.set(n.id, n));
    const startId = microCase?.start_node_id || (microCase?.nodes?.[0]?.id ?? null);
    return { nodeMap, startId };
  }, [microCase]);
}

/* ─── usePreviousAttempts ────────────────────────────────────── */
function usePreviousAttempts(caseId, token, version = 0) {
  const [attempts, setAttempts] = useState([]);
  useEffect(() => {
    if (!caseId || !token) return;
    fetch(`/api/micro_cases?action=attempts&case_id=${caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { attempts: [] })
      .then(d => setAttempts(Array.isArray(d.attempts) ? d.attempts : []))
      .catch(() => setAttempts([]));
  }, [caseId, token, version]);
  return { attempts };
}

const FEEDBACK_DELAY_MS       = 1500;
const INFO_AUTO_ADVANCE_MS    = 1400;

/* ═══════════════════════════════════════════════════════════════
   MicroCasePlayer
═══════════════════════════════════════════════════════════════ */
export default function MicroCasePlayer({ microCase, onSubmitAttempt, participantRole, token }) {
  const [attemptsVersion, setAttemptsVersion] = useState(0);
  const { attempts: previousAttempts } = usePreviousAttempts(microCase?.id, token, attemptsVersion);
  const { nodeMap, startId } = useNodeGraph(microCase);

  const [currentNodeId, setCurrentNodeId] = useState(startId);
  const [history, setHistory]             = useState([]);
  const [lastFeedback, setLastFeedback]   = useState(null);
  const [score, setScore]                 = useState(0);
  const [startedAt]                       = useState(() => Date.now());
  const [isCompleted, setIsCompleted]     = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [registered, setRegistered]       = useState(false);

  /* Timer */
  const [elapsed, setElapsed] = useState(0);

  /* Gamification */
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isLocked, setIsLocked]                 = useState(false);
  const [streak, setStreak]                     = useState(0);
  const [deltaAnim, setDeltaAnim]               = useState(null);
  const [flashKey, setFlashKey]                 = useState(0);
  const [showConfetti, setShowConfetti]         = useState(false);
  const [finalTime, setFinalTime]               = useState(null);

  /* Reset on new case */
  useEffect(() => {
    setCurrentNodeId(startId);
    setHistory([]);
    setScore(0);
    setLastFeedback(null);
    setIsCompleted(false);
    setRegistered(false);
    setSelectedOptionId(null);
    setIsLocked(false);
    setStreak(0);
    setDeltaAnim(null);
    setShowConfetti(false);
    setFinalTime(null);
    setElapsed(0);
  }, [startId]);

  /* Timer tick */
  useEffect(() => {
    if (isCompleted) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [isCompleted, startedAt]);

  const currentNode    = currentNodeId ? nodeMap.get(currentNodeId) : null;
  const roleLabel      = participantRole ? (ROLE_LABELS[participantRole] || participantRole) : null;
  const isTerminalNode = currentNode ? currentNode.is_terminal : false;
  const showSummary    = !currentNode && isCompleted;
  const showUnavailable= !currentNode && !isCompleted;

  /* Decision nodes list (for progress dots) */
  const decisionNodes = useMemo(() =>
    (microCase?.nodes || []).filter(n => n.kind === 'decision'),
  [microCase]);

  const totalNodes = useMemo(() =>
    (microCase?.nodes || []).filter(n => ["decision","info","outcome"].includes(n.kind)).length || 0,
  [microCase]);

  const visitedIds = useMemo(() => {
    const s = new Set(history.map(h => h.nodeId));
    if (currentNode && !s.has(currentNode.id)) s.add(currentNode.id);
    return s;
  }, [history, currentNode]);

  const progressRatio   = totalNodes > 0 ? Math.min(1, visitedIds.size / totalNodes) : 0;
  const progressPercent = showSummary || isTerminalNode ? 100 : Math.round(progressRatio * 100);

  /* Max possible score */
  const maxPossibleScore = useMemo(() =>
    history.reduce((sum, step) => {
      const best = Math.max(0, ...(step.allOptions || []).map(o => o.score_delta || 0));
      return sum + best;
    }, 0),
  [history]);

  /* Best option id */
  const bestOptionId = useMemo(() => {
    if (!currentNode?.options?.length) return null;
    return [...currentNode.options].sort((a, b) => (b.score_delta||0) - (a.score_delta||0))[0]?.id;
  }, [currentNode]);

  /* Auto-advance */
  useEffect(() => {
    if (!currentNode || !currentNode.auto_advance_to || currentNode.kind === "decision" || currentNodeId === startId) return;
    const t = window.setTimeout(() => setCurrentNodeId(currentNode.auto_advance_to), INFO_AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [currentNode, currentNodeId, startId]);

  const autoAdvanceActive = Boolean(
    currentNode && currentNode.auto_advance_to && currentNode.kind !== "decision" && currentNodeId !== startId
  );

  /* ── Handle option select ─────────────────────────────────── */
  function handleOptionSelect(option) {
    if (isLocked) return;
    const delta     = option.score_delta || 0;
    const nextScore = score + delta;

    setIsLocked(true);
    setSelectedOptionId(option.id);
    setStreak(prev => delta >= 1 ? prev + 1 : 0);
    setDeltaAnim({ value: delta, key: Date.now() });
    setFlashKey(k => k + 1);

    setHistory(prev => [...prev, {
      nodeId: currentNode.id,
      nodeBody: currentNode.body_md || "",
      allOptions: currentNode.options || [],
      chosenOptionId: option.id,
      chosenLabel: option.label,
      scoreDelta: delta,
      feedback: option.feedback_md || null,
    }]);
    setScore(nextScore);
    setLastFeedback(option.feedback_md ? { content: option.feedback_md, positive: delta >= 0 } : null);

    const nextNodeId = option.next_node_id || currentNode?.auto_advance_to || null;

    setTimeout(() => {
      setSelectedOptionId(null);
      setIsLocked(false);
      setDeltaAnim(null);
      if (!nextNodeId) {
        setIsCompleted(true);
        setCurrentNodeId(null);
      } else {
        setCurrentNodeId(nextNodeId);
      }
    }, FEEDBACK_DELAY_MS);
  }

  /* ── Handle terminal node reached ────────────────────────── */
  useEffect(() => {
    if (!isTerminalNode && !showSummary) return;
    const t = Math.floor((Date.now() - startedAt) / 1000);
    setFinalTime(t);
    // Check grade for confetti
    const g = getGrade(score, maxPossibleScore);
    if (g && g.stars >= 2) {
      setShowConfetti(true);
      const off = setTimeout(() => setShowConfetti(false), 3800);
      return () => clearTimeout(off);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminalNode, showSummary]);

  async function handleFinish() {
    if (submitting || registered || !token) return;
    setSubmitting(true);
    try {
      const durationSeconds = Math.max(0, Math.ceil((Date.now() - startedAt) / 1000));
      const p = onSubmitAttempt?.({ caseId: microCase.id, steps: history, scoreTotal: score, completed: true, durationSeconds });
      if (p && typeof p.then === "function") await p;
      setRegistered(true);
      setAttemptsVersion(v => v + 1);
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
    setSelectedOptionId(null);
    setIsLocked(false);
    setStreak(0);
    setDeltaAnim(null);
    setShowConfetti(false);
    setFinalTime(null);
    setElapsed(0);
  }

  if (!microCase) return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      No se pudo cargar el microcaso.
    </div>
  );
  if (showUnavailable) return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      Selecciona un punto de inicio válido.
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     END SCREEN
  ════════════════════════════════════════════════════════════ */
  if (showSummary || isTerminalNode) {
    const grade = getGrade(score, maxPossibleScore);
    const pct   = maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : null;
    const timeDisplay = finalTime ?? Math.floor((Date.now() - startedAt) / 1000);

    return (
      <>
        <style>{KEYFRAMES}</style>
        {showConfetti && <Confetti />}

        <div className="max-w-2xl mx-auto space-y-5">

          {/* ── Score hero ── */}
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center shadow-sm">
            {/* Outcome text if terminal node */}
            {currentNode?.body_md && (
              <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-left prose prose-sm max-w-none text-slate-700">
                <ReactMarkdown>{currentNode.body_md}</ReactMarkdown>
              </div>
            )}

            {/* Stars */}
            {grade && <Stars count={grade.stars} />}

            {/* Grade label */}
            {grade && (
              <div className={`inline-block mt-1 mb-3 rounded-full border px-5 py-1.5 text-sm font-bold ${grade.colorBg} ${grade.colorBorder} ${grade.colorText}`}>
                {grade.label}
              </div>
            )}

            {/* Score */}
            <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
              <div className="rounded-xl bg-[#0A3D91] px-6 py-3 text-white">
                <p className="text-2xl font-black leading-none">{score} <span className="text-base font-semibold opacity-70">/ {maxPossibleScore}</span></p>
                <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mt-0.5">Puntos</p>
              </div>
              <div className="rounded-xl bg-slate-100 px-5 py-3 text-slate-700">
                <p className="text-2xl font-black leading-none">⏱ {formatTime(timeDisplay)}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Tiempo</p>
              </div>
            </div>

            {/* Score bar */}
            {pct !== null && (
              <div className="mt-4 mx-auto max-w-xs">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${grade?.bar || 'bg-slate-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 text-right mt-1">{pct}% del máximo</p>
              </div>
            )}

            {/* Decision path summary */}
            {decisionNodes.length > 0 && (
              <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                {decisionNodes.map((dn, idx) => {
                  const step = history.find(h => h.nodeId === dn.id);
                  const good = step ? step.scoreDelta >= 1 : null;
                  return (
                    <div key={dn.id} className="flex flex-col items-center gap-1">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${good === true ? 'bg-emerald-100 border-2 border-emerald-400 text-emerald-700'
                          : good === false ? 'bg-red-100 border-2 border-red-400 text-red-700'
                          : 'bg-slate-100 border-2 border-slate-200 text-slate-400'}`}>
                        {good === true ? '✓' : good === false ? '✗' : idx+1}
                      </div>
                      {step && (
                        <span className={`text-[9px] font-bold ${step.scoreDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {step.scoreDelta >= 0 ? '+' : ''}{step.scoreDelta}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Revisión de decisiones ── */}
          {history.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-4">Revisión de tus decisiones</h4>
              <div className="space-y-4">
                {history.map((step, idx) => {
                  const bestOption = [...(step.allOptions||[])].sort((a,b)=>(b.score_delta||0)-(a.score_delta||0))[0];
                  const wasOptimal = bestOption?.id === step.chosenOptionId;
                  const positive   = step.scoreDelta >= 0;
                  return (
                    <div key={`${step.nodeId}-${idx}`} className="border border-slate-100 rounded-xl p-4">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Decisión {idx + 1}</p>
                      {step.nodeBody && (
                        <div className="text-xs text-slate-600 mb-3 prose prose-xs max-w-none line-clamp-2">
                          <ReactMarkdown>{step.nodeBody}</ReactMarkdown>
                        </div>
                      )}
                      <div className={`flex items-start gap-2 rounded-lg px-3 py-2 mb-2 ${positive ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                        <span className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${positive ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'}`}>
                          {positive ? '✓' : '✗'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700">Tu elección</p>
                          <p className="text-xs text-slate-600 mt-0.5">{step.chosenLabel}</p>
                          {step.feedback && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">{step.feedback.slice(0,140)}{step.feedback.length>140?'…':''}</p>
                          )}
                        </div>
                        <span className={`text-xs font-semibold flex-shrink-0 ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                          {step.scoreDelta>=0?'+':''}{step.scoreDelta}
                        </span>
                      </div>
                      {!wasOptimal && bestOption && (
                        <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-blue-50 border border-blue-100">
                          <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full flex items-center justify-center bg-[#0A3D91] text-white text-[10px]">★</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#0A3D91]">Opción óptima</p>
                            <p className="text-xs text-slate-600 mt-0.5">{bestOption.label}</p>
                          </div>
                          <span className="text-xs font-semibold text-[#0A3D91] flex-shrink-0">+{bestOption.score_delta||0}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Intentos previos ── */}
          {previousAttempts.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Intentos anteriores</h4>
              <div className="space-y-2">
                {previousAttempts.slice(0, 5).map(att => {
                  const g = getGrade(att.score_total, maxPossibleScore);
                  return (
                    <div key={att.id} className="flex items-center justify-between text-xs text-slate-600 py-1.5 border-b border-slate-100 last:border-0">
                      <span>{dayjs(att.completed_at || att.created_at).format("DD/MM/YY HH:mm")}</span>
                      <div className="flex items-center gap-2">
                        {g && <span className={`text-[10px] font-semibold ${g.colorText}`}>{'⭐'.repeat(g.stars)} {g.label}</span>}
                        <span className="font-semibold text-slate-800">{att.score_total} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Acciones ── */}
          <div className="flex flex-wrap gap-3">
            {!registered ? (
              <button type="button" onClick={handleFinish} disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A3D91] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E6ACB] disabled:opacity-60 transition">
                {submitting ? 'Guardando…' : 'Registrar resultado'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                ✓ Resultado registrado
              </span>
            )}
            <button type="button" onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              🔄 Reintentar
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ════════════════════════════════════════════════════════════
     PLAYER
  ════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div className="max-w-2xl mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white leading-snug truncate">{microCase.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Timer */}
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-mono font-semibold text-white/70">
                ⏱ {formatTime(elapsed)}
              </span>
              {/* Streak */}
              {streak >= 2 && (
                <span className="rounded-full border border-orange-400/40 bg-orange-500/25 px-2.5 py-1 text-[11px] font-bold text-orange-300 animate-pulse">
                  🔥 {streak}
                </span>
              )}
              {roleLabel && (
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                  {roleLabel}
                </span>
              )}
              {/* Score + delta */}
              <div className="relative">
                <span key={flashKey} className="anim-flash rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white inline-block">
                  {score} pts
                </span>
                {deltaAnim && (
                  <span key={deltaAnim.key}
                    className={`anim-delta absolute -top-5 -right-1 text-xs font-black pointer-events-none select-none ${deltaAnim.value >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {deltaAnim.value >= 0 ? '+' : ''}{deltaAnim.value}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Decision-node progress dots */}
          {decisionNodes.length > 0 ? (
            <div className="flex items-center gap-1.5">
              {decisionNodes.map((dn, idx) => {
                const step      = history.find(h => h.nodeId === dn.id);
                const isCurrent = currentNodeId === dn.id;
                const good      = step ? step.scoreDelta >= 1 : null;
                return (
                  <div key={dn.id} className="flex items-center gap-1.5">
                    <div className={`flex items-center justify-center rounded-full text-[9px] font-bold transition-all duration-300
                      ${isCurrent ? 'h-6 w-6 bg-white text-slate-900 shadow-lg shadow-white/30 node-pop'
                        : good === true  ? 'h-5 w-5 bg-emerald-400 text-white node-pop'
                        : good === false ? 'h-5 w-5 bg-red-400 text-white node-pop'
                        : 'h-4 w-4 bg-white/20 text-white/50'}`}>
                      {isCurrent ? idx+1 : good === true ? '✓' : good === false ? '✗' : ''}
                    </div>
                    {idx < decisionNodes.length - 1 && (
                      <div className={`h-px flex-1 min-w-[8px] transition-colors duration-300 ${good !== null ? (good ? 'bg-emerald-400/60' : 'bg-red-400/60') : 'bg-white/20'}`} />
                    )}
                  </div>
                );
              })}
              {/* Overall progress fill */}
              <div className="flex-1 h-px bg-white/20 ml-1" />
            </div>
          ) : (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-white/70 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          )}
        </div>

        {/* ── Nodo ── */}
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

          {/* Opciones */}
          <div className="mt-6">
            {autoAdvanceActive ? (
              <p className="text-sm text-slate-400 italic">Continuando…</p>
            ) : currentNodeId === startId && currentNode.auto_advance_to ? (
              <button type="button"
                onClick={() => setCurrentNodeId(currentNode.auto_advance_to)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A3D91] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1E6ACB] transition">
                Empezar caso →
              </button>
            ) : !isTerminalNode ? (
              <div className="grid gap-2.5">
                {(currentNode.options || []).map((option) => {
                  const isChosen      = selectedOptionId === option.id;
                  const isBest        = option.id === bestOptionId;
                  const chosenDelta   = selectedOptionId
                    ? (currentNode.options.find(o => o.id === selectedOptionId)?.score_delta || 0)
                    : 0;
                  const chosenPositive = chosenDelta >= 0;

                  let btnClass = "text-left rounded-xl border px-4 py-3.5 text-sm font-medium transition-all duration-200 ";
                  let indClass = "mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all ";
                  let indContent = "";

                  if (!selectedOptionId) {
                    btnClass += "border-slate-200 bg-white text-slate-700 hover:border-[#0A3D91] hover:bg-[#0A3D91]/4 cursor-pointer group";
                    indClass += "border-slate-300 group-hover:border-[#0A3D91]";
                  } else if (isChosen) {
                    if (chosenPositive) {
                      btnClass += "border-emerald-400 bg-emerald-50 text-emerald-900 anim-correct";
                      indClass += "border-emerald-400 bg-emerald-400 text-white";
                      indContent = "✓";
                    } else {
                      btnClass += "border-red-400 bg-red-50 text-red-900 anim-wrong";
                      indClass += "border-red-400 bg-red-400 text-white";
                      indContent = "✗";
                    }
                  } else if (isBest && !chosenPositive) {
                    btnClass += "border-blue-300 bg-blue-50 text-blue-800 opacity-90";
                    indClass += "border-blue-400 bg-blue-400 text-white";
                    indContent = "★";
                  } else {
                    btnClass += "border-slate-100 bg-white text-slate-400 opacity-40 cursor-default";
                    indClass += "border-slate-200";
                  }

                  return (
                    <button key={option.id} type="button"
                      onClick={() => handleOptionSelect(option)}
                      disabled={isLocked}
                      className={btnClass}
                    >
                      <div className="flex items-start gap-3">
                        <span className={indClass}>{indContent}</span>
                        <div className="prose prose-sm max-w-none flex-1">
                          <ReactMarkdown>{option.label}</ReactMarkdown>
                        </div>
                        {isChosen && (
                          <span className={`flex-shrink-0 text-sm font-black ${chosenPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            {chosenDelta >= 0 ? '+' : ''}{chosenDelta}
                          </span>
                        )}
                        {isBest && !isChosen && selectedOptionId && !chosenPositive && (
                          <span className="flex-shrink-0 text-xs font-semibold text-blue-600">
                            +{option.score_delta || 0}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
