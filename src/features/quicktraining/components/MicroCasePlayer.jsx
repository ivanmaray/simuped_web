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
@keyframes slideInRight {
  from { transform:translateX(20px); opacity:0; }
  to   { transform:translateX(0);    opacity:1; }
}
@keyframes toastPop {
  0%   { transform:translateX(24px) scale(0.88); opacity:0; }
  18%  { transform:translateX(-3px)  scale(1.05); opacity:1; }
  85%  { transform:translateX(0)     scale(1);    opacity:1; }
  100% { transform:translateX(8px)   scale(0.92); opacity:0; }
}
@keyframes streakBounce {
  0%,100% { transform:scale(1); }
  40%     { transform:scale(1.35) rotate(-5deg); }
  70%     { transform:scale(0.92) rotate(3deg); }
}
.opt-enter { animation:slideInRight 0.24s ease-out both; }
.toast-pop { animation:toastPop 1.8s ease-in-out both; }
.streak-hot { animation:streakBounce 0.6s ease-in-out; }
@keyframes screenFlashRed {
  0%,100% { opacity:0; }
  20%,60% { opacity:0.18; }
}
@keyframes screenFlashGreen {
  0%,100% { opacity:0; }
  20%,60% { opacity:0.14; }
}
@keyframes coinSpin {
  0%   { transform:scale(1) rotate(0deg); }
  50%  { transform:scale(1.5) rotate(180deg); }
  100% { transform:scale(1) rotate(360deg); }
}
@keyframes missionIn {
  0%   { transform:scale(0.85) translateY(10px); opacity:0; }
  60%  { transform:scale(1.03) translateY(-2px); opacity:1; }
  100% { transform:scale(1) translateY(0); opacity:1; }
}
.coin-spin { animation:coinSpin 0.4s ease-out; }
.mission-in { animation:missionIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
`;

const ROLE_LABELS = { medico:"Medicina", enfermeria:"Enfermería", farmacia:"Farmacia" };

/* ─── ScreenFlash ──────────────────────────────────────────────── */
function ScreenFlash({ type }) {
  if (!type) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40"
      style={{
        background: type === 'red' ? '#ef4444' : '#22c55e',
        animation: type === 'red' ? 'screenFlashRed 0.45s ease-out' : 'screenFlashGreen 0.4s ease-out',
      }} />
  );
}

/* ─── Toast ──────────────────────────────────────────────────── */
function Toast({ toast }) {
  if (!toast) return null;
  const { text, positive, key } = toast;
  return (
    <div key={key}
      className={`fixed top-16 right-4 z-50 rounded-2xl px-5 py-3 text-sm font-black shadow-2xl toast-pop pointer-events-none select-none
        ${positive
          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white'
          : 'bg-gradient-to-br from-red-400 to-red-600 text-white'}`}
    >
      {text}
    </div>
  );
}

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

/* ─── Auto-format info node text into paragraphs ────────────── */
function formatInfoBody(text) {
  if (!text) return text;
  // Insert blank line before sentences starting with uppercase after a period
  // but skip abbreviations like "SatO₂", "mmHg", etc.
  return text
    // Break before common clinical section starters
    .replace(/\.\s+(FC\s|TA\s|SatO|T\s\d|Temp|GCS|Exploración|Analítica|Antecedentes|Historia|En urgencias|En domicilio|Padres|Ahora|Actualmente|Acude|Llega|Monitor|Dispositivo|Vía |Sin |Presenta|Signos|Síntomas)/g, '.\n\n$1')
    // Break before any new sentence starting with capital letter (not mid-abbreviation)
    .replace(/\.\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ])/g, '.\n\n$1');
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
  const [toast, setToast]                       = useState(null);
  const [screenFlash, setScreenFlash] = useState(null); // 'red'|'green'|null
  const [coinAnim, setCoinAnim]     = useState(false);
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

    // Game effects
    if (delta < 0) {
      setScreenFlash('red');
      setTimeout(() => { setScreenFlash(null); }, 500);
    } else if (delta >= 4) {
      setCoinAnim(true);
      setScreenFlash('green');
      setTimeout(() => { setCoinAnim(false); setScreenFlash(null); }, 450);
    }

    // Toast
    const toastMsg =
      delta >= 4 ? `🎯 ¡Perfecto! +${delta}` :
      delta >= 2 ? `✓ ¡Bien! +${delta}` :
      delta >= 1 ? `👍 Correcto +${delta}` :
      delta === 0 ? `➡ Neutral` :
      `✗ Incorrecto ${delta}`;
    setToast({ text: toastMsg, positive: delta >= 1, key: Date.now() });
    setTimeout(() => setToast(null), 1900);

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

  /* ── Handle terminal node reached — auto-register ──────────── */
  useEffect(() => {
    if (!isTerminalNode && !showSummary) return;

    const t = Math.floor((Date.now() - startedAt) / 1000);
    setFinalTime(t);

    // Confetti
    const g = getGrade(score, maxPossibleScore);
    if (g && g.stars >= 2) {
      setShowConfetti(true);
      const off = setTimeout(() => setShowConfetti(false), 3800);
      // cleanup handled below
    }

    // Auto-submit — always, regardless of score
    if (!token || registered || submitting) return;
    setSubmitting(true);
    const durationSeconds = Math.max(0, t);
    Promise.resolve(
      onSubmitAttempt?.({ caseId: microCase.id, steps: history, scoreTotal: score, completed: true, durationSeconds })
    )
      .then(() => {
        setRegistered(true);
        setAttemptsVersion(v => v + 1);
      })
      .catch(() => {}) // silent — no bloquea la UI
      .finally(() => setSubmitting(false));

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
    const isVictory = grade && grade.stars >= 1;

    return (
      <>
        <style>{KEYFRAMES}</style>
        {showConfetti && <Confetti />}

        <div className="max-w-2xl mx-auto space-y-4">
          {/* ── Game Over / Victory header ── */}
          <div className="rounded-xl overflow-hidden shadow-2xl text-center mission-in"
            style={{background: isVictory
              ? 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)'
              : 'linear-gradient(135deg,#1a0000,#3d0000,#1f0010)'}}>
            {/* Banner */}
            <div className="py-5 px-4" style={{background: isVictory
                ? 'linear-gradient(90deg,#06402a44,#065f4644,#06402a44)'
                : 'linear-gradient(90deg,#7f1d1d44,#991b1b44,#7f1d1d44)'}}>
              <p className={`text-2xl font-black tracking-widest mb-1 ${isVictory ? 'text-emerald-300' : 'text-red-400'}`}
                style={{textShadow: isVictory ? '0 0 20px #4ade8099' : '0 0 20px #f8717199'}}>
                {grade?.stars === 3 ? '✓ Caso resuelto' : grade?.stars === 2 ? '✓ Buen resultado' : grade?.stars === 1 ? '△ Resultado correcto' : '✗ Resultado mejorable'}
              </p>
              {/* Stars */}
              {grade && <Stars count={grade.stars} />}
              {grade && (
                <div className={`inline-block mt-2 rounded border px-4 py-1 text-xs font-black tracking-widest uppercase ${grade.colorBg} ${grade.colorBorder} ${grade.colorText}`}>
                  {grade.label}
                </div>
              )}
            </div>

            {/* Outcome text */}
            {currentNode?.body_md && (
              <div className="mx-4 my-3 rounded border border-white/10 bg-black/30 px-4 py-3 text-xs text-left text-slate-300 prose prose-xs max-w-none [&_p]:text-slate-300 [&_strong]:text-white [&_h3]:text-slate-200 [&_h3]:font-black">
                <ReactMarkdown>{currentNode.body_md}</ReactMarkdown>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-center gap-3 px-4 pb-5 flex-wrap">
              <div className="rounded border border-yellow-500/40 bg-yellow-950/50 px-5 py-3 min-w-[90px]">
                <p className="text-xl font-black text-yellow-400">💰 {score}</p>
                <p className="text-[9px] font-black text-yellow-600/80 uppercase tracking-widest mt-0.5">/ {maxPossibleScore} pts</p>
              </div>
              <div className="rounded border border-slate-500/40 bg-slate-900/50 px-5 py-3 min-w-[90px]">
                <p className="text-xl font-black text-slate-300">⏱ {formatTime(timeDisplay)}</p>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">TIEMPO</p>
              </div>
              {pct !== null && (
                <div className="rounded border border-purple-500/40 bg-purple-950/50 px-5 py-3 min-w-[90px]">
                  <p className="text-xl font-black text-purple-300">{pct}%</p>
                  <p className="text-[9px] font-black text-purple-600/80 uppercase tracking-widest mt-0.5">PRECISIÓN</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Revisión de decisiones ── */}
          {history.length > 0 && (
            <div className="rounded-xl overflow-hidden shadow-lg" style={{background:'linear-gradient(135deg,#060e1c,#0a1830)'}}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <span className="text-purple-400 text-xs">📜</span>
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Revisión de decisiones</h4>
              </div>
              <div className="p-4 space-y-3">
                {history.map((step, idx) => {
                  const bestOption = [...(step.allOptions||[])].sort((a,b)=>(b.score_delta||0)-(a.score_delta||0))[0];
                  const wasOptimal = bestOption?.id === step.chosenOptionId;
                  const positive   = step.scoreDelta >= 0;
                  return (
                    <div key={`${step.nodeId}-${idx}`} className={`rounded border px-3 py-2.5 ${positive ? 'border-emerald-700/40 bg-emerald-950/30' : 'border-red-700/40 bg-red-950/30'}`}>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Decisión {idx + 1}</p>
                      <div className="flex items-start gap-2">
                        <span className={`flex-shrink-0 h-4 w-4 rounded flex items-center justify-center text-[9px] font-black mt-0.5 ${positive ? 'bg-emerald-600 text-white' : 'bg-red-700 text-white'}`}>
                          {positive ? '✓' : '✗'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 leading-snug">{step.chosenLabel}</p>
                          {step.feedback && (
                            <p className="text-[11px] text-slate-500 mt-1 italic leading-snug">{step.feedback.slice(0,140)}{step.feedback.length>140?'…':''}</p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 text-xs font-black ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {step.scoreDelta >= 0 ? '+' : ''}{step.scoreDelta}
                        </span>
                      </div>
                      {!wasOptimal && bestOption && (
                        <div className="mt-2 flex items-start gap-2 rounded border border-yellow-700/30 bg-yellow-950/30 px-2 py-1.5">
                          <span className="text-yellow-500 text-[9px]">⭐</span>
                          <p className="text-[10px] text-yellow-400/80 leading-snug flex-1">{bestOption.label.slice(0,80)}{bestOption.label.length>80?'…':''}</p>
                          <span className="text-[10px] font-black text-yellow-400">+{bestOption.score_delta}</span>
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
            <div className="rounded-xl overflow-hidden" style={{background:'linear-gradient(135deg,#060e1c,#0a1830)'}}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <span className="text-slate-500 text-xs">🕐</span>
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Intentos anteriores</h4>
              </div>
              <div className="p-4 space-y-2">
                {previousAttempts.slice(0, 5).map(att => {
                  const g = getGrade(att.score_total, maxPossibleScore);
                  return (
                    <div key={att.id} className="flex items-center justify-between text-[10px] text-slate-500 py-1 border-b border-white/5 last:border-0 font-mono">
                      <span>{dayjs(att.completed_at || att.created_at).format("DD/MM/YY HH:mm")}</span>
                      <div className="flex items-center gap-2">
                        {g && <span className={`font-black ${g.colorText}`}>{'⭐'.repeat(g.stars)}</span>}
                        <span className="font-black text-slate-300">💰{att.score_total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Acciones ── */}
          <div className="flex flex-wrap items-center gap-3">
            {submitting ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                GUARDANDO...
              </span>
            ) : registered ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-black font-mono">✓ GUARDADO</span>
            ) : null}
            <button type="button" onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded border-2 border-blue-500 bg-blue-700/80 hover:bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 tracking-wide">
              🔄 Repetir caso
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
      <Toast toast={toast} />
      <ScreenFlash type={screenFlash} />
      <div className="max-w-2xl mx-auto space-y-4">

        {/* ── HUD ── */}
        <div className="rounded-xl overflow-hidden shadow-2xl" style={{background:'linear-gradient(135deg,#060e1c,#0a1e38,#0d2347)'}}>
          {/* Top strip */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-purple-300 text-base">⚕</span>
              <h3 className="text-xs font-black text-white/90 leading-snug truncate tracking-wide uppercase">{microCase.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {roleLabel && (
                <span className="rounded border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-[9px] font-black text-blue-300 uppercase tracking-widest">{roleLabel}</span>
              )}
              <span className="font-mono text-[10px] text-slate-400">⏱ {formatTime(elapsed)}</span>
            </div>
          </div>
          {/* Score bar */}
          <div className="px-4 py-3">
            {/* Puntuación */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black w-12 text-yellow-400 font-mono">PUNTOS</span>
              <div className="flex-1 h-2 rounded-sm overflow-hidden bg-black/40 border border-white/10">
                <div className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${maxPossibleScore > 0 ? Math.min(100,(score/maxPossibleScore)*100) : 0}%`,
                    background: 'linear-gradient(90deg,#92400e,#fbbf24)',
                    boxShadow: '0 0 5px #fbbf2455',
                  }} />
              </div>
              <div className="relative flex-shrink-0">
                <span key={flashKey} className={`font-mono text-[10px] font-black text-yellow-400 ${coinAnim ? 'coin-spin inline-block' : ''}`}>
                  💰 {score}
                </span>
                {deltaAnim && (
                  <span key={deltaAnim.key}
                    className={`anim-delta absolute -top-4 -right-0 text-xs font-black pointer-events-none select-none ${deltaAnim.value >= 0 ? 'text-yellow-300' : 'text-red-400'}`}>
                    {deltaAnim.value >= 0 ? '+' : ''}{deltaAnim.value}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Stage progress */}
          <div className="px-4 pb-3">
            {decisionNodes.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-slate-500 font-black mr-1 tracking-widest uppercase">PROGRESO</span>
                {decisionNodes.map((dn, idx) => {
                  const step      = history.find(h => h.nodeId === dn.id);
                  const isCurrent = currentNodeId === dn.id;
                  const good      = step ? step.scoreDelta >= 1 : null;
                  return (
                    <div key={dn.id} className="flex items-center gap-1.5">
                      <div className={`flex items-center justify-center text-[8px] font-black transition-all duration-300
                        ${isCurrent ? 'h-6 w-6 rounded border-2 border-purple-400 bg-purple-500/30 text-purple-300 node-pop shadow-lg shadow-purple-500/30'
                          : good === true  ? 'h-5 w-5 rounded border border-emerald-500 bg-emerald-500/20 text-emerald-400 node-pop'
                          : good === false ? 'h-5 w-5 rounded border border-red-500 bg-red-500/20 text-red-400 node-pop'
                          : 'h-4 w-4 rounded border border-white/15 bg-white/5 text-white/25'}`}>
                        {isCurrent ? idx+1 : good === true ? '✓' : good === false ? '✗' : ''}
                      </div>
                      {idx < decisionNodes.length - 1 && (
                        <div className={`h-px w-4 transition-colors duration-300 ${good === true ? 'bg-emerald-500/50' : good === false ? 'bg-red-500/50' : 'bg-white/15'}`} />
                      )}
                    </div>
                  );
                })}
                <div className="flex-1 h-px bg-white/10 ml-1" />
                {streak >= 2 && (
                  <span key={streak} className={`text-[10px] font-black ml-2 ${streak >= 4 ? 'text-orange-300 streak-hot' : 'text-orange-400 animate-pulse'}`}>
                    {'🔥'.repeat(streak >= 4 ? 2 : 1)}×{streak}
                  </span>
                )}
              </div>
            ) : (
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-purple-500/70 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* ── INFO node ── */}
        {currentNode.kind === 'info' && (
          <div className="rounded-xl overflow-hidden shadow-xl mission-in" style={{background:'linear-gradient(135deg,#060e1c,#0a1830,#0d2040)'}}>
            <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-blue-500/20">
              <span className="text-blue-400 text-sm">🩺</span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Caso clínico</span>
            </div>
            <div className="px-4 py-4">
              <div className="prose prose-sm max-w-none text-slate-200 [&>p]:leading-7 [&>p]:mb-3 [&>p:last-child]:mb-0 [&>p]:text-[0.88rem] [&_strong]:text-white [&_h3]:text-blue-300 [&_h3]:text-sm [&_h3]:font-black [&_h3]:tracking-wide [&_ul]:text-slate-300 [&_li]:text-[0.85rem]">
                <ReactMarkdown>{formatInfoBody(currentNode.body_md) || ""}</ReactMarkdown>
              </div>
              {currentNodeId === startId && currentNode.auto_advance_to && (
                <div className="mt-5 pt-4 border-t border-blue-500/20">
                  <button type="button"
                    onClick={() => setCurrentNodeId(currentNode.auto_advance_to)}
                    className="inline-flex items-center gap-2 rounded border-2 border-blue-500 bg-blue-700 hover:bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 tracking-wide">
                    ▶ Comenzar caso
                  </button>
                </div>
              )}
              {autoAdvanceActive && (
                <p className="mt-3 text-[10px] text-blue-400/70 font-mono animate-pulse">CARGANDO...</p>
              )}
            </div>
          </div>
        )}

        {/* ── DECISION node ── */}
        {currentNode.kind === 'decision' && (
          <div className="rounded-xl overflow-hidden shadow-xl mission-in" style={{background:'linear-gradient(135deg,#060e1c,#0c1a30,#0f1f3a)'}}>
            {/* Decision header */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-amber-500/25" style={{background:'linear-gradient(90deg,#78350f22,transparent)'}}>
              <span className="text-amber-400 text-xs">⚡</span>
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">Decisión clínica</span>
            </div>
            {/* Feedback anterior */}
            {lastFeedback && (
              <div className={`mx-4 mt-3 rounded border px-3 py-2.5 text-xs ${lastFeedback.positive ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300' : 'border-red-500/40 bg-red-950/60 text-red-300'}`}>
                <div className="prose prose-xs max-w-none [&_p]:text-inherit [&_strong]:text-white [&_p]:mb-1 [&_p:last-child]:mb-0">
                  <ReactMarkdown>{lastFeedback.content}</ReactMarkdown>
                </div>
              </div>
            )}
            {/* Question */}
            <div className="px-4 pt-3 pb-1">
              <div className="prose prose-sm max-w-none text-slate-100 font-medium leading-relaxed [&>p]:mb-0 [&>p]:text-[0.9rem] [&_strong]:text-yellow-300">
                <ReactMarkdown>{currentNode.body_md || ""}</ReactMarkdown>
              </div>
            </div>
            {/* Opciones */}
            <div key={currentNodeId} className="px-4 pb-4 pt-3 grid gap-2">
              {(currentNode.options || []).map((option, idx) => {
                const isChosen     = selectedOptionId === option.id;
                const isBest       = option.id === bestOptionId;
                const optDelta     = option.score_delta || 0;
                const isSelected   = !!selectedOptionId;
                const chosenDelta  = isSelected
                  ? (currentNode.options.find(o => o.id === selectedOptionId)?.score_delta || 0)
                  : 0;
                const chosenPositive = chosenDelta >= 1;

                const letters = ['A','B','C','D','E'];

                let btnStyle = {};
                let letterClass = "flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-xs font-black border-2 transition-all ";
                let wrapClass = "w-full text-left rounded border-2 px-3 py-3 text-sm font-medium transition-all duration-200 opt-enter flex items-start gap-3 ";
                let scoreBadge = null;

                if (!isSelected) {
                  wrapClass += "border-slate-600/50 bg-slate-800/30 text-slate-200 hover:border-blue-500/80 hover:bg-blue-900/25 hover:scale-[1.01] hover:shadow-md hover:shadow-blue-900/30 cursor-pointer group";
                  letterClass += "border-slate-500 bg-slate-700/50 text-slate-300 group-hover:border-blue-400 group-hover:bg-blue-800/50 group-hover:text-blue-200";
                } else if (isChosen) {
                  if (chosenPositive) {
                    wrapClass += "border-emerald-500 bg-emerald-950/70 text-emerald-200 anim-correct";
                    letterClass += "border-emerald-400 bg-emerald-600 text-white";
                  } else {
                    wrapClass += "border-red-500 bg-red-950/70 text-red-200 anim-wrong";
                    letterClass += "border-red-400 bg-red-700 text-white";
                  }
                  scoreBadge = (
                    <span className={`flex-shrink-0 text-sm font-black ${chosenPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {chosenDelta >= 0 ? '+' : ''}{chosenDelta}
                    </span>
                  );
                } else {
                  if (isBest && !chosenPositive) {
                    wrapClass += "border-yellow-500/80 bg-yellow-950/50 text-yellow-200 opacity-95";
                    letterClass += "border-yellow-400 bg-yellow-700/70 text-yellow-200";
                    scoreBadge = <span className="flex-shrink-0 text-xs font-black text-yellow-400">⭐+{optDelta}</span>;
                  } else if (optDelta >= 1) {
                    wrapClass += "border-emerald-700/50 bg-emerald-950/30 text-emerald-300/70 opacity-70";
                    letterClass += "border-emerald-600/60 bg-emerald-900/40 text-emerald-400/70";
                    scoreBadge = <span className="flex-shrink-0 text-[10px] font-semibold text-emerald-500/70">+{optDelta}</span>;
                  } else {
                    wrapClass += "border-slate-700/30 bg-slate-900/30 text-slate-500/50 opacity-30 cursor-default";
                    letterClass += "border-slate-600/30 bg-slate-800/30 text-slate-500/40";
                    scoreBadge = <span className="flex-shrink-0 text-[10px] text-slate-600/50">{optDelta}</span>;
                  }
                }

                return (
                  <button key={option.id} type="button"
                    onClick={() => handleOptionSelect(option)}
                    disabled={isLocked}
                    className={wrapClass}
                    style={{ animationDelay: `${idx * 0.07}s` }}
                  >
                    <span className={letterClass}>{isChosen ? (chosenPositive ? '✓' : '✗') : (isSelected && isBest && !chosenPositive) ? '★' : letters[idx]}</span>
                    <div className="prose prose-sm max-w-none flex-1 [&_p]:mb-0 [&_p]:text-inherit [&_strong]:text-yellow-300">
                      <ReactMarkdown>{option.label}</ReactMarkdown>
                    </div>
                    {scoreBadge}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
