import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
function getGrade(score, maxPossible, minPossible = 0) {
  const range = maxPossible - minPossible;
  if (range <= 0) return null;
  const pct = Math.max(0, Math.min(1, (score - minPossible) / range));
  if (pct >= 0.85) return { label:"Excelente", stars:3, colorText:"text-emerald-700", colorBg:"bg-emerald-50",  colorBorder:"border-emerald-300", bar:"bg-emerald-500"  };
  if (pct >= 0.60) return { label:"Notable",   stars:2, colorText:"text-blue-700",    colorBg:"bg-blue-50",    colorBorder:"border-blue-300",    bar:"bg-blue-500"    };
  if (pct >= 0.30) return { label:"Suficiente", stars:1, colorText:"text-amber-700",   colorBg:"bg-amber-50",   colorBorder:"border-amber-300",   bar:"bg-amber-500"   };
  return                  { label:"Mejorable",  stars:0, colorText:"text-red-700",     colorBg:"bg-red-50",     colorBorder:"border-red-300",     bar:"bg-red-400"     };
}

/* ─── Auto-format info node text into paragraphs ────────────── */
function formatInfoBody(text) {
  if (!text) return text;
  return text
    .replace(/\.\s+(FC\s|TA\s|SatO|T\s\d|Temp|GCS|Exploración|Analítica|Antecedentes|Historia|En urgencias|En domicilio|Padres|Ahora|Actualmente|Acude|Llega|Monitor|Dispositivo|Vía |Sin |Presenta|Signos|Síntomas)/g, '.\n\n$1')
    .replace(/\.\s+([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ])/g, '.\n\n$1');
}

function formatTime(secs) {
  if (!secs || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* Stable seeded shuffle — deterministic per node so it doesn't re-shuffle on re-render */
function seededShuffle(arr, seedStr) {
  const result = [...arr];
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) s = ((s << 5) - s + seedStr.charCodeAt(i)) | 0;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

/* ─── Sex display helper ─────────────────────────────────────── */
function sexSymbol(sex) {
  if (sex === "M") return "\u2642";
  if (sex === "F") return "\u2640";
  return "";
}

/* ─── Vital abnormality check ────────────────────────────────── */
function isVitalAbnormal(key, value) {
  if (value == null || value === "") return false;
  const v = Number(value);
  if (isNaN(v)) return false;
  switch (key) {
    case "fc":   return v > 160 || v < 50;
    case "fr":   return v > 40;
    case "sat":  return v < 94;
    case "temp": return v > 38;
    case "tas":  return v < 60 || v > 140;
    case "tad":  return v < 30 || v > 90;
    default:     return false;
  }
}

/* ═══════════════════════════════════════════════════════════════
   MULTI-CHANNEL ICU MONITOR — Realistic bedside monitor
   Each channel: waveform trace + numeric value on the right
   ═══════════════════════════════════════════════════════════════ */

/* Hook: oscillates a numeric value around its base ±range every ~3s */
function useOscillating(base, range) {
  const [val, setVal] = useState(base);
  const baseRef = useRef(base);
  useEffect(() => { baseRef.current = base; setVal(base); }, [base]);
  useEffect(() => {
    if (base == null || typeof base !== 'number' || base === 0) return; // don't oscillate 0 (e.g. PCR)
    const id = setInterval(() => {
      const b = baseRef.current;
      if (b == null || b === 0) return;
      const delta = (Math.random() - 0.5) * 2 * range;
      setVal(Math.round(b + delta));
    }, 2800 + Math.random() * 1400); // 2.8–4.2s — realistic monitor refresh
    return () => clearInterval(id);
  }, [base, range]);
  return (base == null || typeof base !== 'number') ? base : val;
}

/* Hook: oscillates a float value (for temp) */
function useOscillatingFloat(base, range, decimals = 1) {
  const [val, setVal] = useState(base);
  const baseRef = useRef(base);
  useEffect(() => { baseRef.current = base; setVal(base); }, [base]);
  useEffect(() => {
    if (base == null || typeof base !== 'number' || base === 0) return; // don't oscillate 0
    const id = setInterval(() => {
      const b = baseRef.current;
      if (b == null || b === 0) return;
      const delta = (Math.random() - 0.5) * 2 * range;
      setVal(parseFloat((b + delta).toFixed(decimals)));
    }, 5000 + Math.random() * 3000); // temp changes very slowly: 5–8s
    return () => clearInterval(id);
  }, [base, range, decimals]);
  return (base == null || typeof base !== 'number') ? base : val;
}

const GAUSS = (x, mu, sigma, amp) => amp * Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));

/* Beat templates — computed once */
const BEAT_ECG = (() => {
  const pts = [];
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    let y = 0;
    y += GAUSS(t, 0.10, 0.018, 0.10);  // P
    y += GAUSS(t, 0.20, 0.007, -0.08); // Q
    y += GAUSS(t, 0.23, 0.010, 0.88);  // R
    y += GAUSS(t, 0.26, 0.009, -0.20); // S
    y += GAUSS(t, 0.38, 0.035, 0.16);  // T
    y += Math.sin(t * Math.PI * 2) * 0.006;
    pts.push(y);
  }
  return pts;
})();

const BEAT_PLETH = (() => {
  const pts = [];
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    let y = 0;
    y += GAUSS(t, 0.28, 0.045, 0.85);  // systolic peak
    y += GAUSS(t, 0.42, 0.055, 0.35);  // dicrotic notch rebound
    y -= GAUSS(t, 0.36, 0.015, 0.18);  // dicrotic notch dip
    y += Math.sin(t * Math.PI) * 0.03;
    pts.push(Math.max(0, y));
  }
  return pts;
})();

const BEAT_ART = (() => {
  const pts = [];
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    let y = 0;
    y += GAUSS(t, 0.20, 0.035, 0.92);  // systolic upstroke
    y += GAUSS(t, 0.38, 0.050, 0.40);  // dicrotic notch rebound
    y -= GAUSS(t, 0.30, 0.012, 0.25);  // dicrotic notch
    y += 0.08; // baseline diastolic
    pts.push(Math.max(0, y));
  }
  return pts;
})();

/* Capnography — realistic 4-phase capnogram ("rounded rectangle")
   Phase I:   Inspiratory baseline (CO₂ ≈ 0)        t = 0.00–0.35
   Phase II:  Expiratory upstroke (steep rise)       t = 0.35–0.42
   Phase III: Alveolar plateau (slight upslope)      t = 0.42–0.80
   Phase IV:  Inspiratory downstroke (steep drop)     t = 0.80–0.87
   then back to baseline                             t = 0.87–1.00   */
const BEAT_CAPNO = (() => {
  const pts = [];
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    let y = 0;
    if (t < 0.35) {
      // Phase I: inspiratory baseline — flat near zero
      y = 0.01;
    } else if (t < 0.42) {
      // Phase II: expiratory upstroke — steep sigmoid
      const p = (t - 0.35) / 0.07;
      y = 0.85 * (1 / (1 + Math.exp(-12 * (p - 0.5))));
    } else if (t < 0.80) {
      // Phase III: alveolar plateau — slight upslope to EtCO₂ peak
      const p = (t - 0.42) / 0.38;
      y = 0.83 + p * 0.07; // gentle rise from 0.83 to 0.90
    } else if (t < 0.87) {
      // Phase IV: inspiratory downstroke — steep drop
      const p = (t - 0.80) / 0.07;
      y = 0.90 * (1 - (1 / (1 + Math.exp(-12 * (p - 0.5)))));
    } else {
      // Back to baseline
      y = 0.01;
    }
    pts.push(Math.max(0, y));
  }
  return pts;
})();

/* VF (ventricular fibrillation): chaotic high-frequency oscillation */
const WAVE_VF = (() => {
  const pts = [];
  // Pre-compute a pseudo-random chaotic waveform
  let seed = 42;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i <= 600; i++) {
    const t = i / 600;
    // Multiple overlapping sine waves + noise for realistic VF
    let y = 0;
    y += Math.sin(t * Math.PI * 18) * 0.35;
    y += Math.sin(t * Math.PI * 27 + 1.2) * 0.25;
    y += Math.sin(t * Math.PI * 43 + 0.7) * 0.15;
    y += (rand() - 0.5) * 0.3;
    // Amplitude modulation (VF waxes and wanes)
    y *= 0.6 + 0.4 * Math.sin(t * Math.PI * 3.2);
    pts.push(y);
  }
  return pts;
})();

/* Asystole: nearly flat line with minimal electrical drift */
const WAVE_ASYSTOLE = (() => {
  const pts = [];
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    // Very subtle baseline drift + tiny noise
    let y = Math.sin(t * Math.PI * 0.8) * 0.02 + (Math.random() - 0.5) * 0.015;
    pts.push(y);
  }
  return pts;
})();

/* Generic waveform trace renderer — sweep mode (cursor L→R, erase ahead).
   This mimics real bedside monitors: a vertical cursor moves across, redrawing
   the trace in place. A small "erase window" ahead of the cursor clears the
   previous sweep so the new trace overwrites the old one. */
function useWaveformTrace(canvasRef, { rate, template, color, speed = 1.1, freerun = false }) {
  const animRef = useRef(null);
  const bufRef  = useRef(null);   // Float32Array of Y values per pixel
  const drawnRef = useRef(null);  // Uint8Array: which pixels have been drawn at least once
  const cursorRef = useRef(0);    // current cursor X in float px
  const phaseRef  = useRef(0);    // beat phase accumulator

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) { animRef.current = requestAnimationFrame(draw); return; }
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const midY = H * 0.5;
    const amp  = H * 0.40;
    const bpm  = rate || 0;

    if (!bufRef.current || bufRef.current.length !== W) {
      bufRef.current = new Float32Array(W);
      drawnRef.current = new Uint8Array(W);
      bufRef.current.fill(midY);
      // Clear canvas with background
      ctx.fillStyle = "#050f0a";
      ctx.fillRect(0, 0, W, H);
    }
    const buf = bufRef.current;
    const drawn = drawnRef.current;

    // --- Advance cursor & compute new samples for each pixel crossed ---
    const prevX = cursorRef.current;
    cursorRef.current = (cursorRef.current + speed) % W;
    const nextX = cursorRef.current;

    // Sample the template for each pixel between prevX and nextX (supports wrap)
    const writePixel = (px) => {
      let y = midY;
      if (freerun && template.length > 0) {
        phaseRef.current = (phaseRef.current + 1) % template.length;
        y = midY - template[phaseRef.current] * amp;
      } else if (bpm > 0 && template.length > 0) {
        // Advance phase by 1px worth of beat time. pxPerBeat scales with rate.
        const pxPerBeat = (60 / bpm) * 70; // 70 px/sec sweep
        phaseRef.current = (phaseRef.current + 1 / pxPerBeat) % 1;
        const idx = Math.min(Math.floor(phaseRef.current * template.length), template.length - 1);
        y = midY - template[idx] * amp;
      } else {
        // No rate: flat line, reset phase
        phaseRef.current = 0;
        y = midY;
      }
      buf[px] = y;
      drawn[px] = 1;
    };

    if (nextX >= prevX) {
      for (let px = Math.ceil(prevX); px < Math.ceil(nextX); px++) writePixel(px % W);
    } else {
      for (let px = Math.ceil(prevX); px < W; px++) writePixel(px);
      for (let px = 0; px < Math.ceil(nextX); px++) writePixel(px);
    }

    // --- Erase a small window AHEAD of the cursor (gives the "gap" look) ---
    const eraseW = 18;
    const eraseStart = Math.ceil(nextX);
    ctx.fillStyle = "#050f0a";
    for (let i = 0; i < eraseW; i++) {
      const px = (eraseStart + i) % W;
      ctx.fillRect(px, 0, 1, H);
      drawn[px] = 0;
    }

    // --- Redraw ONLY the slice we just wrote (cheap) + grid where we erased ---
    // Grid: redraw major/minor lines within the segment we touched.
    const drawGridSlice = (x0, x1) => {
      ctx.save();
      ctx.strokeStyle = "rgba(80,160,120,0.08)";
      ctx.lineWidth = 0.5;
      for (let gx = x0; gx < x1; gx++) {
        if (gx % 40 === 0) { ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); ctx.stroke(); }
      }
      ctx.strokeStyle = "rgba(80,160,120,0.05)";
      for (let gy = 0; gy < H; gy += 20) { ctx.beginPath(); ctx.moveTo(x0, gy + 0.5); ctx.lineTo(x1, gy + 0.5); ctx.stroke(); }
      ctx.restore();
    };

    // Clear + re-paint the "written" slice so we overwrite any old content
    const paintSlice = (x0, x1) => {
      if (x1 <= x0) return;
      ctx.fillStyle = "#050f0a";
      ctx.fillRect(x0, 0, x1 - x0, H);
      drawGridSlice(x0, x1);
      // Glow pass
      ctx.beginPath();
      ctx.strokeStyle = color + "33";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      let started = false;
      for (let px = x0; px < x1; px++) {
        if (!drawn[px]) { started = false; continue; }
        if (!started) { ctx.moveTo(px, buf[px]); started = true; }
        else          { ctx.lineTo(px, buf[px]); }
      }
      ctx.stroke();
      // Main trace
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      started = false;
      for (let px = x0; px < x1; px++) {
        if (!drawn[px]) { started = false; continue; }
        if (!started) { ctx.moveTo(px, buf[px]); started = true; }
        else          { ctx.lineTo(px, buf[px]); }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    if (nextX >= prevX) {
      paintSlice(Math.max(0, Math.ceil(prevX) - 1), Math.ceil(nextX));
    } else {
      paintSlice(Math.max(0, Math.ceil(prevX) - 1), W);
      paintSlice(0, Math.ceil(nextX));
    }

    // Bright cursor line at nextX
    ctx.save();
    ctx.strokeStyle = color + "cc";
    ctx.lineWidth = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(Math.ceil(nextX) + 0.5, 0);
    ctx.lineTo(Math.ceil(nextX) + 0.5, H);
    ctx.stroke();
    ctx.restore();

    animRef.current = requestAnimationFrame(draw);
  }, [canvasRef, rate, template, color, speed, freerun]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = Math.max(1, Math.floor(canvas.offsetWidth));
      canvas.height = Math.max(1, Math.floor(canvas.offsetHeight));
      bufRef.current = null; // force reset on next frame
    };
    resize();
    cursorRef.current = 0;
    phaseRef.current = 0;
    animRef.current = requestAnimationFrame(draw);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [draw]);
}

/* Single channel row: label | waveform canvas | big number + alarm limits */
function MonitorChannel({ label, sublabel, unit, value, subvalue, color, rate, template, abnormal,
                         height = 48, freerun = false, alarmHigh, alarmLow, leadTag }) {
  const canvasRef = useRef(null);
  useWaveformTrace(canvasRef, { rate, template, color, freerun });
  const displayColor = abnormal ? '#ef4444' : color;
  return (
    <div className="flex items-stretch gap-0" style={{ borderBottom: '1px solid #0d2818' }}>
      {/* Label column */}
      <div className="flex flex-col items-start justify-center px-1.5 w-[42px] flex-shrink-0 py-0.5">
        <span className="text-[8px] font-bold uppercase tracking-wider leading-none" style={{ color: color + 'dd' }}>{label}</span>
        {sublabel && <span className="text-[6px] font-mono leading-none mt-0.5" style={{ color: color + '88' }}>{sublabel}</span>}
        <span className="text-[6px] font-mono leading-none mt-0.5" style={{ color: color + '55' }}>{unit}</span>
        {leadTag && (
          <span className="text-[6px] font-mono leading-none mt-0.5 px-0.5 rounded" style={{ color: color + 'aa', background: '#081a10' }}>{leadTag}</span>
        )}
      </div>
      {/* Waveform */}
      <div className="flex-1 min-w-0 relative">
        <canvas ref={canvasRef} className="w-full block" style={{ height: `${height}px`, background: '#050f0a' }} />
      </div>
      {/* Numeric value + alarm limits */}
      <div className="flex-shrink-0 w-[74px] flex flex-col justify-center items-end pr-1.5 py-0.5">
        {(alarmHigh != null || alarmLow != null) && (
          <div className="flex flex-col items-end leading-none" style={{ color: color + '66' }}>
            <span className="text-[7px] font-mono">{alarmHigh ?? ''}</span>
            <span className="text-[7px] font-mono">{alarmLow ?? ''}</span>
          </div>
        )}
        <div className="flex items-baseline gap-1 leading-none">
          <span className={`font-mono font-black tabular-nums ${abnormal ? 'animate-pulse' : ''}`}
            style={{ color: displayColor, fontSize: '1.35rem', textShadow: `0 0 8px ${displayColor}55`, lineHeight: 1 }}>
            {value ?? "--"}
          </span>
        </div>
        {subvalue != null && (
          <span className="text-[9px] font-mono tabular-nums mt-0.5" style={{ color: color + 'bb' }}>{subvalue}</span>
        )}
      </div>
    </div>
  );
}

/* Numeric-only row (no waveform) for temp / NIBP */
function MonitorNumericRow({ label, sublabel, unit, value, subvalue, color, abnormal, alarmHigh, alarmLow }) {
  const displayColor = abnormal ? '#ef4444' : color;
  return (
    <div className="flex items-center justify-between px-1.5 py-1" style={{ borderBottom: '1px solid #0d2818' }}>
      <div className="flex flex-col">
        <span className="text-[8px] font-bold uppercase tracking-wider leading-none" style={{ color: color + 'dd' }}>{label}</span>
        {sublabel && <span className="text-[6px] font-mono leading-none mt-0.5" style={{ color: color + '88' }}>{sublabel}</span>}
        <span className="text-[6px] font-mono leading-none mt-0.5" style={{ color: color + '55' }}>{unit}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {(alarmHigh != null || alarmLow != null) && (
          <div className="flex flex-col items-end leading-none" style={{ color: color + '66' }}>
            <span className="text-[7px] font-mono">{alarmHigh ?? ''}</span>
            <span className="text-[7px] font-mono">{alarmLow ?? ''}</span>
          </div>
        )}
        <div className="flex flex-col items-end">
          <span className={`font-mono font-black tabular-nums leading-none ${abnormal ? 'animate-pulse' : ''}`}
            style={{ color: displayColor, fontSize: '1.25rem', textShadow: `0 0 8px ${displayColor}55` }}>
            {value ?? "--"}
          </span>
          {subvalue != null && (
            <span className="text-[9px] font-mono tabular-nums mt-0.5" style={{ color: color + 'bb' }}>{subvalue}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Full Monitor Panel — multi-channel waveform display ────── */
function MonitorPanel({ vitals, deterioration = 0 }) {
  const fc = vitals?.fc;
  const fr = vitals?.fr;
  const sat = vitals?.sat;
  const temp = vitals?.temp;
  const tas = vitals?.tas;
  const tad = vitals?.tad;
  const rhythm = vitals?.rhythm;
  const etco2 = vitals?.etco2;

  // Apply deterioration modifiers
  const detFc  = deterioration > 0 && fc  ? Math.max(30, fc  - deterioration * 15) : fc;
  const detFr  = deterioration > 0 && fr  ? Math.max(4,  fr  - deterioration * 4)  : fr;
  const detSat = deterioration > 0 && sat ? Math.max(60, sat - deterioration * 5)  : sat;

  // Determine if we're in a special rhythm (VF, asystole)
  const isVF = rhythm === 'FV';
  const isAsystole = rhythm === 'asistolia';
  const isArrest = isVF || isAsystole;

  // Oscillating values — each vital fluctuates around its base (use deteriorated values)
  const oscFc   = useOscillating(detFc, 4);
  const oscSat  = useOscillating(detSat, 1);
  const oscFr   = useOscillating(detFr, 2);
  const oscTas  = useOscillating(tas, 3);
  const oscTad  = useOscillating(tad, 2);
  const oscTemp = useOscillatingFloat(temp, 0.1);
  const oscEtco2 = useOscillating(etco2, 2);

  // Pulso (desde pleth) — pequeña desviación sobre FC (típico de monitor real)
  const pulseRate = useOscillating(detFc != null && !isArrest ? detFc : null, 2);

  // MAP (mean arterial pressure) = DAP + (SAP - DAP)/3
  const map = (oscTas != null && oscTad != null && !isArrest)
    ? Math.round(oscTad + (oscTas - oscTad) / 3)
    : null;

  // Capnography: show EtCO₂ value if available, otherwise FR
  const capnoValue = etco2 != null ? oscEtco2 : (isArrest && fr === 0 ? '--' : oscFr);
  const capnoUnit = etco2 != null ? 'mmHg' : 'rpm';
  const capnoLabel = etco2 != null ? 'EtCO\u2082' : 'CO\u2082';

  const taDisplay = (oscTas != null && oscTad != null && !isArrest) ? `${oscTas}/${oscTad}` : (isArrest ? '--' : (oscTas ?? oscTad ?? null));
  const taSub = map != null ? `(${map})` : null;

  // Pick ECG template and display based on rhythm
  const ecgTemplate = isVF ? WAVE_VF : isAsystole ? WAVE_ASYSTOLE : BEAT_ECG;
  const ecgFreerun = isArrest; // VF and asystole don't depend on FC
  const ecgValue = isVF ? 'FV' : isAsystole ? '--' : oscFc;
  const ecgColor = isVF ? '#ef4444' : isAsystole ? '#ef4444' : '#22c55e';

  // Header label for rhythm / alarm pill
  const rhythmLabel = isVF ? 'FV \u26A0' : isAsystole ? 'ASISTOLIA \u26A0' : (rhythm || 'II');

  // Tiempo en pantalla (hh:mm) — sólo decorativo; se inicia cuando monta
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="rounded-lg overflow-hidden flex flex-col shadow-lg" style={{ background: '#050f0a', border: `1px solid ${isArrest ? '#7f1d1d' : '#0d2818'}` }}>
      {/* Status bar — Adulto · tiempo · ritmo · alarma */}
      <div className="flex items-center justify-between px-2 py-1 gap-2" style={{ background: isArrest ? '#1a0505' : '#0a1f13', borderBottom: `1px solid ${isArrest ? '#7f1d1d' : '#0d2818'}` }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[8px] font-black uppercase tracking-[0.15em]" style={{ color: '#4ade80aa' }}>Adulto</span>
          <span className="text-[8px] font-mono tabular-nums" style={{ color: '#4ade8088' }}>{mm}:{ss}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isArrest && (
            <span className="text-[7px] font-black px-1 py-0.5 rounded animate-pulse" style={{ color: '#fff', background: '#b91c1c' }}>ALARMA !!!</span>
          )}
          <span className={`text-[8px] font-mono font-black ${isArrest ? 'animate-pulse' : ''}`} style={{ color: isArrest ? '#ef4444' : '#4ade80bb' }}>{rhythmLabel}</span>
        </div>
      </div>

      {/* Channel rows */}
      <div className="flex-1 flex flex-col">
        {/* ECG — green normally, red in VF/asystole */}
        <MonitorChannel
          label={isVF ? "FV" : "ECG"}
          sublabel={isArrest ? null : "HR"}
          unit={isArrest ? "" : "lpm"}
          value={ecgValue} color={ecgColor}
          rate={fc} template={ecgTemplate} abnormal={isArrest} height={56} freerun={ecgFreerun}
          alarmHigh={!isArrest ? 120 : null} alarmLow={!isArrest ? 50 : null}
          leadTag={!isArrest ? "II" : null}
        />

        {/* SpO2 pleth — cyan (show flat in arrest) */}
        {sat != null && (
          <MonitorChannel
            label={"SpO\u2082"} sublabel="Pleth" unit="%"
            value={isArrest && sat === 0 ? '--' : oscSat}
            subvalue={isArrest ? null : (pulseRate != null ? `\u2665 ${pulseRate}` : null)}
            color="#22d3ee"
            rate={isArrest ? 0 : fc} template={isArrest ? WAVE_ASYSTOLE : BEAT_PLETH}
            abnormal={isArrest || isVitalAbnormal("sat", sat)} height={42} freerun={isArrest}
            alarmHigh={!isArrest ? 100 : null} alarmLow={!isArrest ? 92 : null}
          />
        )}

        {/* Arterial pressure — red (flat in arrest) */}
        {tas != null && tad != null && (
          <MonitorChannel
            label="ART" sublabel="PAM" unit="mmHg"
            value={taDisplay} subvalue={taSub}
            color="#f87171"
            rate={isArrest ? 0 : fc} template={isArrest ? WAVE_ASYSTOLE : BEAT_ART}
            abnormal={isArrest || isVitalAbnormal("tas", tas)} height={42} freerun={isArrest}
            alarmHigh={!isArrest ? 160 : null} alarmLow={!isArrest ? 80 : null}
          />
        )}

        {/* Capnography — yellow: show EtCO₂ if available, else FR */}
        {(fr != null || etco2 != null) && (
          <MonitorChannel
            label={capnoLabel} sublabel={etco2 != null ? "Resp" : null} unit={capnoUnit}
            value={capnoValue} color="#facc15"
            rate={isArrest ? 0 : (fr || 12)} template={isArrest && !etco2 ? WAVE_ASYSTOLE : BEAT_CAPNO}
            abnormal={isArrest || (etco2 != null ? etco2 < 20 : isVitalAbnormal("fr", fr))}
            height={36} freerun={isArrest && !etco2}
            alarmHigh={!isArrest ? (etco2 != null ? 45 : 30) : null}
            alarmLow={!isArrest ? (etco2 != null ? 30 : 10) : null}
          />
        )}
        {/* FR as numeric row when EtCO₂ is shown on the waveform */}
        {etco2 != null && fr != null && (
          <MonitorNumericRow label="FR" unit="rpm" value={isArrest && fr === 0 ? '--' : oscFr} color="#facc15"
            abnormal={isVitalAbnormal("fr", fr)} alarmHigh={30} alarmLow={10} />
        )}

        {/* Temperature — numeric only, pink */}
        {temp != null && (
          <MonitorNumericRow label={"T\u00BA"} sublabel="Core" unit={"\u00BAC"} value={oscTemp} color="#f472b6"
            abnormal={isVitalAbnormal("temp", temp)} alarmHigh={38.5} alarmLow={35} />
        )}
      </div>
    </div>
  );
}

/* ─── Monitor Chips (mobile) — compact waveform strips ───────── */
const VITAL_CHANNELS = {
  fc:   { label: "FC",   unit: "lpm",  color: "#22c55e", labelColor: "#4ade80" },
  sat:  { label: "SpO\u2082", unit: "%",   color: "#22d3ee", labelColor: "#67e8f9" },
  fr:   { label: "FR",   unit: "rpm",  color: "#facc15", labelColor: "#fde047" },
  temp: { label: "T\u00BA",   unit: "\u00BAC",  color: "#f472b6", labelColor: "#f9a8d4" },
  ta:   { label: "NIBP", unit: "mmHg", color: "#f87171", labelColor: "#fca5a5" },
};

function MobileWaveChip({ label, value, unit, color, rate, template, abnormal, freerun = false }) {
  const canvasRef = useRef(null);
  useWaveformTrace(canvasRef, { rate, template, color, speed: 0.3, freerun });
  const displayColor = abnormal ? '#ef4444' : color;
  return (
    <div className="rounded overflow-hidden" style={{ background: '#050f0a', border: `1px solid ${color}22`, minWidth: '90px', flex: '1 1 90px' }}>
      <canvas ref={canvasRef} className="w-full block" style={{ height: '28px', background: '#050f0a' }} />
      <div className="flex items-center justify-between px-1.5 py-0.5">
        <span className="text-[7px] font-bold uppercase" style={{ color: color + 'aa' }}>{label}</span>
        <span className={`text-xs font-mono font-black tabular-nums ${abnormal ? 'animate-pulse' : ''}`}
          style={{ color: displayColor, textShadow: `0 0 4px ${displayColor}33` }}>{value}</span>
      </div>
    </div>
  );
}

function MonitorChips({ vitals }) {
  const fc   = vitals?.fc ?? 0;
  const sat  = vitals?.sat ?? 0;
  const fr   = vitals?.fr ?? 0;
  const tas  = vitals?.tas ?? 0;
  const tad  = vitals?.tad ?? 0;
  const temp = vitals?.temp ?? 0;
  const etco2 = vitals?.etco2;
  const rhythm = vitals?.rhythm;

  const isVF = rhythm === 'FV';
  const isAsystole = rhythm === 'asistolia';
  const isArrest = isVF || isAsystole;

  const oscFc   = useOscillating(fc, 4);
  const oscSat  = useOscillating(sat, 1);
  const oscFr   = useOscillating(fr, 2);
  const oscTas  = useOscillating(tas, 3);
  const oscTad  = useOscillating(tad, 2);
  const oscTemp = useOscillatingFloat(temp, 0.1);
  const oscEtco2 = useOscillating(etco2, 2);

  if (!vitals) return null;

  const ecgTemplate = isVF ? WAVE_VF : isAsystole ? WAVE_ASYSTOLE : BEAT_ECG;
  const ecgColor = isArrest ? '#ef4444' : '#22c55e';
  const ecgValue = isVF ? 'FV' : isAsystole ? '--' : oscFc;

  // Capnography: show EtCO₂ if available, otherwise FR
  const capnoValue = etco2 != null ? oscEtco2 : (isArrest && fr === 0 ? '--' : oscFr);
  const capnoUnit = etco2 != null ? 'mmHg' : 'rpm';
  const capnoLabel = etco2 != null ? 'EtCO\u2082' : 'CO\u2082';

  return (
    <div className="flex flex-wrap gap-1.5">
      {vitals.fc != null && <MobileWaveChip label={isVF ? "FV" : "ECG"} value={ecgValue} unit={isArrest ? "" : "lpm"} color={ecgColor} rate={isArrest ? 0 : oscFc} template={ecgTemplate} abnormal={isArrest} freerun={isArrest} />}
      {vitals.sat != null && <MobileWaveChip label="SpO₂" value={isArrest && sat === 0 ? '--' : oscSat} unit="%" color="#22d3ee" rate={isArrest ? 0 : oscFc} template={isArrest ? WAVE_ASYSTOLE : BEAT_PLETH} abnormal={isArrest || isVitalAbnormal("sat", oscSat)} freerun={isArrest} />}
      {(vitals.fr != null || etco2 != null) && <MobileWaveChip label={capnoLabel} value={capnoValue} unit={capnoUnit} color="#facc15" rate={isArrest ? 0 : (oscFr || 12)} template={isArrest && !etco2 ? WAVE_ASYSTOLE : BEAT_CAPNO} abnormal={isArrest || (etco2 != null ? etco2 < 20 : isVitalAbnormal("fr", oscFr))} freerun={isArrest && !etco2} />}
      {vitals.tas != null && vitals.tad != null && (
        <MobileWaveChip label="ART" value={isArrest ? '--' : `${oscTas}/${oscTad}`} unit="mmHg" color="#f87171" rate={isArrest ? 0 : oscFc} template={isArrest ? WAVE_ASYSTOLE : BEAT_ART} abnormal={isArrest || isVitalAbnormal("tas", oscTas)} freerun={isArrest} />
      )}
      {vitals.temp != null && (
        <div className="rounded px-2 py-1 text-center" style={{ background: '#050f0a', border: '1px solid #f472b622', minWidth: '55px' }}>
          <span className="text-[7px] font-bold uppercase" style={{ color: '#f472b6aa' }}>T{"\u00BA"}</span>
          <span className={`block text-xs font-mono font-black tabular-nums ${isVitalAbnormal("temp", vitals.temp) ? 'animate-pulse' : ''}`}
            style={{ color: isVitalAbnormal("temp", vitals.temp) ? '#ef4444' : '#f472b6' }}>{oscTemp}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Patient demographics formatter ─────────────────────────── */
function PatientDemographics({ info }) {
  if (!info) return null;
  const parts = [];
  if (info.name) parts.push(info.name);
  const s = sexSymbol(info.sex);
  if (s) parts.push(s);
  if (info.age) parts.push(info.age);
  if (info.weightKg) parts.push(`${info.weightKg} kg`);
  return (
    <p className="text-sm font-semibold text-slate-700 tracking-wide">
      {parts.join(" \u00B7 ")}
    </p>
  );
}

/* ─── Labs table ─────────────────────────────────────────────── */
function normalizeLabs(labs) {
  if (!labs) return [];
  if (Array.isArray(labs)) return labs;
  // Convert object format {K: 7.2, Na: 138} → [{name:"K", value:"7.2"}, ...]
  if (typeof labs === 'object') {
    return Object.entries(labs)
      .filter(([, v]) => v != null && v !== true) // skip _pending: true flags
      .map(([name, value]) => ({ name, value: String(value) }));
  }
  return [];
}

function LabsTable({ labs }) {
  const items = normalizeLabs(labs);
  if (items.length === 0) return null;
  return (
    <div className="mt-3 rounded border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Laboratorio</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((lab, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-1.5">
            <span className="text-xs text-slate-600">{lab.name}</span>
            <span className={`text-xs font-mono font-bold ${lab.alert ? 'text-red-600' : 'text-slate-800'}`}>{lab.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Gasometry panel ────────────────────────────────────────── */
function GasometryPanel({ gas }) {
  if (!gas) return null;
  const fields = [
    { label: "pH", value: gas.pH },
    { label: "pCO2", value: gas.pCO2 },
    { label: "HCO3", value: gas.HCO3 },
    { label: "BE", value: gas.BE },
    { label: "Lactato", value: gas.lactato },
  ].filter(f => f.value != null);
  if (fields.length === 0) return null;
  return (
    <div className="mt-3 rounded border border-amber-200 bg-amber-50/50 overflow-hidden">
      <div className="bg-amber-50 px-3 py-1.5 border-b border-amber-200">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-700">Gasometr&iacute;a</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 py-2">
        {fields.map(f => (
          <div key={f.label} className="flex items-baseline justify-between">
            <span className="text-[10px] text-amber-600 font-semibold">{f.label}</span>
            <span className="text-xs font-mono font-bold text-slate-800">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Imaging viewer ─────────────────────────────────────────── */
const MODALITY_LABEL = {
  RX: "Rx",
  TC: "TC",
  RM: "RM",
  ECO: "Eco",
  ECG: "ECG",
  FOTO: "Foto",
};

function ImagingModal({ image, onClose }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const hotspots = Array.isArray(image?.hotspots) ? image.hotspots : [];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[92vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2 text-white">
            {image.modality && (
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300 bg-cyan-900/40 px-2 py-0.5 rounded">
                {MODALITY_LABEL[image.modality] || image.modality}
              </span>
            )}
            <span className="text-sm font-semibold">{image.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {hotspots.length > 0 && (
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded transition"
              >
                {revealed ? "Ocultar hallazgos" : `Revelar hallazgos (${hotspots.length})`}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
        <div className="relative bg-black flex items-center justify-center" style={{ maxHeight: "calc(92vh - 110px)" }}>
          {image.url ? (
            <div className="relative inline-block max-w-full max-h-full">
              <img
                src={image.url}
                alt={image.name}
                className="block max-w-full max-h-[calc(92vh-110px)] object-contain"
              />
              {revealed && hotspots.map((h, i) => (
                <div
                  key={i}
                  className="absolute pointer-events-none"
                  style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  <div className="w-6 h-6 rounded-full border-2 border-yellow-400 bg-yellow-400/20 animate-pulse" />
                  <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                    {h.label}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">
              Imagen no disponible. El administrador debe asignar una URL.
            </div>
          )}
        </div>
        {image.attribution && (
          <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-200 space-y-1">
            {image.attribution && (
              <div className="text-[10px] text-slate-400 italic">
                {image.attribution_url ? (
                  <a href={image.attribution_url} target="_blank" rel="noopener noreferrer"
                     className="underline hover:text-slate-200">{image.attribution}</a>
                ) : image.attribution}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InlineImaging({ img }) {
  const [zoom, setZoom] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hotspots = Array.isArray(img?.hotspots) ? img.hotspots : [];
  const modLabel = img.modality ? (MODALITY_LABEL[img.modality] || img.modality) : null;
  return (
    <>
      <figure className="rounded-lg border border-slate-300 bg-slate-900 overflow-hidden shadow-sm">
        <figcaption className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-800 text-white">
          <div className="flex items-center gap-2 min-w-0">
            {modLabel && (
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-300 bg-cyan-900/40 px-1.5 py-0.5 rounded flex-shrink-0">
                {modLabel}
              </span>
            )}
            <span className="text-xs font-semibold truncate">{img.name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {hotspots.length > 0 && (
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded transition"
              >
                {revealed ? "Ocultar hallazgos" : `Revelar hallazgos (${hotspots.length})`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setZoom(true)}
              className="text-[10px] font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded transition"
              title="Ampliar"
            >
              ⤢ Ampliar
            </button>
          </div>
        </figcaption>
        <div className="relative bg-black flex items-center justify-center">
          <div className="relative inline-block max-w-full">
            <img
              src={img.url}
              alt={img.name}
              className="block max-w-full max-h-[420px] object-contain mx-auto"
            />
            {revealed && hotspots.map((h, i) => (
              <div
                key={i}
                className="absolute pointer-events-none"
                style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)" }}
              >
                <div className="w-5 h-5 rounded-full border-2 border-yellow-400 bg-yellow-400/20 animate-pulse" />
                <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 bg-yellow-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                  {h.label}
                </div>
              </div>
            ))}
          </div>
        </div>
        {img.attribution && (
          <div className="px-3 py-1 bg-slate-800 border-t border-slate-700 text-[9px] text-slate-400 italic">
            {img.attribution_url ? (
              <a href={img.attribution_url} target="_blank" rel="noopener noreferrer"
                 className="underline hover:text-slate-200">{img.attribution}</a>
            ) : img.attribution}
          </div>
        )}
      </figure>
      {zoom && <ImagingModal image={img} onClose={() => setZoom(false)} />}
    </>
  );
}

function ImagingViewer({ imaging }) {
  if (!imaging || imaging.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {imaging.map((img, i) => {
        const modLabel = img.modality ? (MODALITY_LABEL[img.modality] || img.modality) : null;
        if (img.url) return <InlineImaging key={i} img={img} />;
        return (
          <div key={i} className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5">
            {modLabel && (
              <span className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-700 mr-1">
                {modLabel}
              </span>
            )}
            <span className="text-[11px] font-bold text-blue-700">{img.name}</span>
            {img.finding && <span className="text-[11px] text-blue-600 ml-1">— {img.finding}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Ventilation params ─────────────────────────────────────── */
function VentilationPanel({ vent }) {
  if (!vent) return null;
  const fields = [
    { label: "Modo", value: vent.mode },
    { label: "PIP", value: vent.pip },
    { label: "PEEP", value: vent.peep },
    { label: "FiO2", value: vent.fio2 },
    { label: "Vt", value: vent.vt },
  ].filter(f => f.value != null);
  if (fields.length === 0) return null;
  return (
    <div className="mt-3 rounded border border-teal-200 bg-teal-50/50 overflow-hidden">
      <div className="bg-teal-50 px-3 py-1.5 border-b border-teal-200">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-teal-700">Ventilaci&oacute;n</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 py-2">
        {fields.map(f => (
          <div key={f.label} className="flex items-baseline justify-between">
            <span className="text-[10px] text-teal-600 font-semibold">{f.label}</span>
            <span className="text-xs font-mono font-bold text-slate-800">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   MicroCasePlayer
═══════════════════════════════════════════════════════════════ */
export default function MicroCasePlayer({ microCase, onSubmitAttempt, participantRole, token }) {
  const [attemptsVersion, setAttemptsVersion] = useState(0);
  const { attempts: previousAttempts } = usePreviousAttempts(microCase?.id, token, attemptsVersion);
  const { nodeMap, startId } = useNodeGraph(microCase);

  const [currentNodeId, setCurrentNodeId] = useState(startId);
  const [history, setHistory]             = useState([]);
  const [nodeTrail, setNodeTrail]         = useState([]); // ALL visited nodes with metadata snapshots
  const [lastFeedback, setLastFeedback]   = useState(null);
  const [score, setScore]                 = useState(0);
  const [startedAt]                       = useState(() => Date.now());
  const [isCompleted, setIsCompleted]     = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [registered, setRegistered]       = useState(false);
  const [submitError, setSubmitError]     = useState(null);
  const [debriefTab, setDebriefTab]       = useState('decisions'); // 'decisions' | 'vitals' | 'labs' | 'timeline'

  /* Timer */
  const [elapsed, setElapsed] = useState(0);
  const nodeEnteredAtRef = useRef(Date.now());

  /* Gamification */
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [isLocked, setIsLocked]                 = useState(false);
  const [pendingAdvance, setPendingAdvance]     = useState(null); // { nextNodeId, completed }
  const [toast, setToast]                       = useState(null);
  const [screenFlash, setScreenFlash] = useState(null);
  const [coinAnim, setCoinAnim]     = useState(false);
  const [streak, setStreak]                     = useState(0);
  const [deltaAnim, setDeltaAnim]               = useState(null);
  const [flashKey, setFlashKey]                 = useState(0);
  const [showConfetti, setShowConfetti]         = useState(false);
  const [finalTime, setFinalTime]               = useState(null);
  const [deterioration, setDeterioration]       = useState(0); // 0 = none, 1-3 = levels

  /* Reset on new case */
  useEffect(() => {
    setCurrentNodeId(startId);
    setHistory([]);
    setNodeTrail([]);
    setScore(0);
    setLastFeedback(null);
    setIsCompleted(false);
    setRegistered(false);
    setSubmitError(null);
    setDebriefTab('decisions');
    setSelectedOptionId(null);
    setIsLocked(false);
    setPendingAdvance(null);
    setStreak(0);
    setDeltaAnim(null);
    setShowConfetti(false);
    setFinalTime(null);
    setElapsed(0);
    setDeterioration(0);
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

  /* Max / min possible score along the visited path (used to normalize grade) */
  const maxPossibleScore = useMemo(() =>
    history.reduce((sum, step) => {
      const best = Math.max(0, ...(step.allOptions || []).map(o => o.score_delta || 0));
      return sum + best;
    }, 0),
  [history]);

  const minPossibleScore = useMemo(() =>
    history.reduce((sum, step) => {
      const worst = Math.min(0, ...(step.allOptions || []).map(o => o.score_delta || 0));
      return sum + worst;
    }, 0),
  [history]);

  /* Best option id */
  const bestOptionId = useMemo(() => {
    if (!currentNode?.options?.length) return null;
    return [...currentNode.options].sort((a, b) => (b.score_delta||0) - (a.score_delta||0))[0]?.id;
  }, [currentNode]);

  /* Shuffled options — deterministic per node */
  const shuffledOptions = useMemo(() => {
    if (!currentNode?.options?.length) return [];
    return seededShuffle(currentNode.options, currentNode.id);
  }, [currentNode?.id, currentNode?.options]);

  /* Track when current node was entered (for per-step elapsed_ms) */
  useEffect(() => {
    nodeEnteredAtRef.current = Date.now();
  }, [currentNodeId]);

  /* Track every node visited (for debriefing) */
  useEffect(() => {
    if (!currentNode) return;
    setNodeTrail(prev => {
      if (prev.length > 0 && prev[prev.length - 1].nodeId === currentNode.id) return prev;
      return [...prev, {
        nodeId: currentNode.id,
        kind: currentNode.kind,
        title: currentNode.body_md?.match(/^###?\s+(.+)/)?.[1] || `Paso ${prev.length + 1}`,
        metadata: currentNode.metadata || {},
        isTerminal: currentNode.is_terminal || false,
      }];
    });
  }, [currentNode]);

  const autoAdvanceActive = false;

  /* Time pressure: deteriorate vitals on decision nodes after delay.
     Persisted in sessionStorage so un refresh no regala tiempo al jugador. */
  useEffect(() => {
    if (currentNode?.kind !== 'decision' || selectedOptionId) {
      setDeterioration(0);
      return;
    }
    const hasCritical = currentNode.options?.some(o => o.is_critical);
    if (!hasCritical) { setDeterioration(0); return; }

    const storageKey = `mc_det_${microCase?.id}_${currentNode.id}`;
    let startAt = Date.now();
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && parsed > 0) startAt = parsed;
      } else {
        sessionStorage.setItem(storageKey, String(startAt));
      }
    } catch { /* storage unavailable, fall back to now() */ }

    const elapsed = Math.max(0, Date.now() - startAt);
    const initialLevel = elapsed >= 90000 ? 3 : elapsed >= 60000 ? 2 : elapsed >= 30000 ? 1 : 0;
    setDeterioration(initialLevel);

    const timers = [];
    if (initialLevel < 1) timers.push(setTimeout(() => setDeterioration(1), Math.max(0, 30000 - elapsed)));
    if (initialLevel < 2) timers.push(setTimeout(() => setDeterioration(2), Math.max(0, 60000 - elapsed)));
    if (initialLevel < 3) timers.push(setTimeout(() => setDeterioration(3), Math.max(0, 90000 - elapsed)));
    return () => timers.forEach(clearTimeout);
  }, [currentNode?.id, currentNode?.kind, selectedOptionId, microCase?.id]);

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
      delta >= 4 ? `\uD83C\uDFAF \u00A1Perfecto! +${delta}` :
      delta >= 2 ? `\u2713 \u00A1Bien! +${delta}` :
      delta >= 1 ? `\uD83D\uDC4D Correcto +${delta}` :
      delta === 0 ? `\u27A1 Neutral` :
      `\u2717 Incorrecto ${delta}`;
    setToast({ text: toastMsg, positive: delta >= 1, key: Date.now() });
    setTimeout(() => setToast(null), 1900);

    const elapsedMs = Math.max(0, Date.now() - nodeEnteredAtRef.current);
    try { sessionStorage.removeItem(`mc_det_${microCase?.id}_${currentNode.id}`); } catch { /* noop */ }
    setHistory(prev => [...prev, {
      nodeId: currentNode.id,
      nodeBody: currentNode.body_md || "",
      allOptions: currentNode.options || [],
      optionId: option.id,
      chosenLabel: option.label,
      scoreDelta: delta,
      elapsedMs,
      feedback: option.feedback_md || null,
    }]);
    setScore(nextScore);
    setLastFeedback(option.feedback_md ? { content: option.feedback_md, positive: delta >= 0 } : null);

    const nextNodeId = option.next_node_id || currentNode?.auto_advance_to || null;

    // Guardar el avance pendiente; el usuario pulsará "Continuar →"
    setPendingAdvance({ nextNodeId, completed: !nextNodeId });

    // Pequeña pausa visual para el highlight de la opción (deltaAnim)
    setTimeout(() => setDeltaAnim(null), 800);
  }

  /* ── Confirmar avance tras leer el feedback ─────────────────── */
  function handleAdvance() {
    if (!pendingAdvance) return;
    const { nextNodeId, completed } = pendingAdvance;
    setSelectedOptionId(null);
    setIsLocked(false);
    setDeltaAnim(null);
    setPendingAdvance(null);
    if (completed || !nextNodeId) {
      setIsCompleted(true);
      setCurrentNodeId(null);
    } else {
      setCurrentNodeId(nextNodeId);
    }
  }

  /* ── Handle terminal node reached — auto-register ──────────── */
  useEffect(() => {
    if (!isTerminalNode && !showSummary) return;

    const t = Math.floor((Date.now() - startedAt) / 1000);
    setFinalTime(t);

    // Confetti
    const g = getGrade(score, maxPossibleScore, minPossibleScore);
    if (g && g.stars >= 2) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3800);
    }

    // Auto-submit
    if (!token || registered || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const durationSeconds = Math.max(0, t);
    const stepsPayload = history.map((h) => ({
      nodeId: h.nodeId,
      optionId: h.optionId || null,
      outcomeLabel: h.chosenLabel || null,
      scoreDelta: h.scoreDelta || 0,
      elapsedMs: h.elapsedMs ?? null,
    }));
    if (stepsPayload.length === 0 && score !== 0) {
      console.warn('[MicroCasePlayer] submit inconsistente: score≠0 con historia vacía', { caseId: microCase.id, score, nodeTrailLength: nodeTrail.length });
    }
    Promise.resolve(
      onSubmitAttempt?.({ caseId: microCase.id, steps: stepsPayload, scoreTotal: score, completed: true, durationSeconds })
    )
      .then((result) => {
        if (result && result.ok === false) {
          setSubmitError(result.error || 'No se pudo registrar el intento.');
          return;
        }
        setRegistered(true);
        setAttemptsVersion(v => v + 1);
      })
      .catch((err) => {
        setSubmitError(err?.message || 'No se pudo registrar el intento.');
      })
      .finally(() => setSubmitting(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminalNode, showSummary]);

  async function handleFinish() {
    if (submitting || registered || !token) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const durationSeconds = Math.max(0, Math.ceil((Date.now() - startedAt) / 1000));
      const stepsPayload = history.map((h) => ({
        nodeId: h.nodeId,
        optionId: h.optionId || null,
        outcomeLabel: h.chosenLabel || null,
        scoreDelta: h.scoreDelta || 0,
        elapsedMs: h.elapsedMs ?? null,
      }));
      const p = onSubmitAttempt?.({ caseId: microCase.id, steps: stepsPayload, scoreTotal: score, completed: true, durationSeconds });
      const result = p && typeof p.then === "function" ? await p : p;
      if (result && result.ok === false) {
        setSubmitError(result.error || 'No se pudo registrar el intento.');
        return;
      }
      setRegistered(true);
      setAttemptsVersion(v => v + 1);
    } catch (err) {
      setSubmitError(err?.message || 'No se pudo registrar el intento.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleRestart() {
    try {
      const prefix = `mc_det_${microCase?.id}_`;
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(prefix)) sessionStorage.removeItem(key);
      }
    } catch { /* noop */ }
    setCurrentNodeId(startId);
    setHistory([]);
    setNodeTrail([]);
    setScore(0);
    setLastFeedback(null);
    setIsCompleted(false);
    setRegistered(false);
    setSelectedOptionId(null);
    setIsLocked(false);
    setPendingAdvance(null);
    setStreak(0);
    setDeltaAnim(null);
    setShowConfetti(false);
    setFinalTime(null);
    setElapsed(0);
    setDebriefTab('decisions');
  }

  if (!microCase) return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      No se pudo cargar el microcaso.
    </div>
  );
  if (showUnavailable) return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      Selecciona un punto de inicio v&aacute;lido.
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     END SCREEN
  ════════════════════════════════════════════════════════════ */
  if (showSummary || isTerminalNode) {
    const grade = getGrade(score, maxPossibleScore, minPossibleScore);
    const scoreRange = maxPossibleScore - minPossibleScore;
    const pct   = scoreRange > 0 ? Math.round(Math.max(0, Math.min(1, (score - minPossibleScore) / scoreRange)) * 100) : null;
    const timeDisplay = finalTime ?? Math.floor((Date.now() - startedAt) / 1000);
    const isVictory = grade && grade.stars >= 1;
    const correctCount = history.filter(h => h.scoreDelta >= 1).length;
    const wrongCount   = history.filter(h => h.scoreDelta < 0).length;
    const neutralCount = history.filter(h => h.scoreDelta === 0).length;

    /* Build vitals timeline from nodeTrail */
    const vitalsTimeline = nodeTrail
      .filter(n => n.metadata?.vitals)
      .map((n, idx) => ({ step: idx + 1, label: n.title, kind: n.kind, ...n.metadata.vitals }));

    /* Build labs evolution — track unique lab names across nodes */
    const labSnapshots = nodeTrail
      .filter(n => n.metadata?.labs && normalizeLabs(n.metadata.labs).length > 0)
      .map((n, idx) => ({ step: idx + 1, label: n.title, labs: normalizeLabs(n.metadata.labs) }));

    /* Gasometry evolution */
    const gasSnapshots = nodeTrail
      .filter(n => n.metadata?.gasometry && n.metadata.gasometry.pH != null)
      .map((n, idx) => ({ step: idx + 1, label: n.title, ...n.metadata.gasometry }));

    /* Debriefing tabs config */
    const DEBRIEF_TABS = [
      { key: 'decisions', label: 'Decisiones', icon: '\uD83C\uDFAF', count: history.length },
      { key: 'vitals',    label: 'Constantes', icon: '\uD83D\uDC93', count: vitalsTimeline.length },
      { key: 'labs',      label: 'Laboratorio', icon: '\uD83E\uDDEA', count: labSnapshots.length },
      { key: 'timeline',  label: 'Cronolog\u00EDa', icon: '\u23F1', count: nodeTrail.length },
    ].filter(t => t.count > 0);

    return (
      <>
        <style>{KEYFRAMES}</style>
        {showConfetti && <Confetti />}

        <div className="max-w-4xl mx-auto space-y-4">
          {/* ══ HEADER: Score + Grade ══ */}
          <div className="rounded-xl overflow-hidden shadow-2xl mission-in"
            style={{background: isVictory
              ? 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)'
              : 'linear-gradient(135deg,#1a0000,#3d0000,#1f0010)'}}>
            <div className="py-4 px-4" style={{background: isVictory
                ? 'linear-gradient(90deg,#06402a44,#065f4644,#06402a44)'
                : 'linear-gradient(90deg,#7f1d1d44,#991b1b44,#7f1d1d44)'}}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className={`text-xl font-black tracking-widest ${isVictory ? 'text-emerald-300' : 'text-red-400'}`}
                    style={{textShadow: isVictory ? '0 0 20px #4ade8099' : '0 0 20px #f8717199'}}>
                    {grade?.stars === 3 ? '\u2713 Caso resuelto' : grade?.stars === 2 ? '\u2713 Buen resultado' : grade?.stars === 1 ? '\u25B3 Resultado correcto' : '\u2717 Resultado mejorable'}
                  </p>
                  {grade && <Stars count={grade.stars} />}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <div className="rounded border border-yellow-500/40 bg-yellow-950/50 px-4 py-2 text-center min-w-[75px]">
                    <p className="text-lg font-black text-yellow-400">{score}<span className="text-yellow-600/60 text-xs">/{maxPossibleScore}</span></p>
                    <p className="text-[8px] font-black text-yellow-600/60 uppercase tracking-widest">PUNTOS</p>
                  </div>
                  <div className="rounded border border-slate-500/40 bg-slate-900/50 px-4 py-2 text-center min-w-[75px]">
                    <p className="text-lg font-black text-slate-300">{formatTime(timeDisplay)}</p>
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">TIEMPO</p>
                  </div>
                  {pct !== null && (
                    <div className="rounded border border-purple-500/40 bg-purple-950/50 px-4 py-2 text-center min-w-[75px]">
                      <p className="text-lg font-black text-purple-300">{pct}%</p>
                      <p className="text-[8px] font-black text-purple-600/80 uppercase tracking-widest">PRECISIÓN</p>
                    </div>
                  )}
                  <div className="rounded border border-emerald-500/30 bg-emerald-950/40 px-4 py-2 text-center min-w-[75px]">
                    <p className="text-lg font-black text-emerald-400">{correctCount}<span className="text-emerald-600/50 text-xs">/{history.length}</span></p>
                    <p className="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest">ACIERTOS</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Outcome text (if terminal node has body) */}
            {currentNode?.body_md && (
              <div className="mx-4 my-3 rounded border border-white/10 bg-black/30 px-4 py-3 text-xs text-left text-slate-300 prose prose-xs max-w-none [&_p]:text-slate-300 [&_strong]:text-white [&_h3]:text-slate-200 [&_h3]:font-black">
                <ReactMarkdown>{currentNode.body_md}</ReactMarkdown>
              </div>
            )}

            {/* Quick verdict bar */}
            <div className="px-4 pb-4">
              <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-800 gap-0.5">
                {correctCount > 0 && <div className="bg-emerald-500 transition-all" style={{width:`${(correctCount/history.length)*100}%`}} />}
                {neutralCount > 0 && <div className="bg-amber-500 transition-all"  style={{width:`${(neutralCount/history.length)*100}%`}} />}
                {wrongCount > 0 &&   <div className="bg-red-500 transition-all"     style={{width:`${(wrongCount/history.length)*100}%`}} />}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-emerald-500/70 font-bold">{correctCount} correctas</span>
                {neutralCount > 0 && <span className="text-[9px] text-amber-500/70 font-bold">{neutralCount} neutrales</span>}
                <span className="text-[9px] text-red-500/70 font-bold">{wrongCount} incorrectas</span>
              </div>
            </div>
          </div>

          {/* ══ DEBRIEFING TABS ══ */}
          <div className="rounded-xl overflow-hidden shadow-lg bg-white border border-slate-200">
            {/* Tab bar */}
            <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
              {DEBRIEF_TABS.map(tab => (
                <button key={tab.key} type="button"
                  onClick={() => setDebriefTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all whitespace-nowrap border-b-2
                    ${debriefTab === tab.key
                      ? 'border-blue-500 text-blue-700 bg-white'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${debriefTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4">

              {/* ── TAB: DECISIONS ── */}
              {debriefTab === 'decisions' && (
                <div className="space-y-4">
                  {history.map((step, idx) => {
                    const bestOption = [...(step.allOptions||[])].sort((a,b)=>(b.score_delta||0)-(a.score_delta||0))[0];
                    const wasOptimal = bestOption?.id === step.optionId;
                    const positive   = step.scoreDelta >= 1;
                    const neutral    = step.scoreDelta === 0;
                    const borderColor = positive ? 'border-emerald-200' : neutral ? 'border-amber-200' : 'border-red-200';
                    const bgColor     = positive ? 'bg-emerald-50/50'   : neutral ? 'bg-amber-50/50'   : 'bg-red-50/50';

                    return (
                      <div key={`${step.nodeId}-${idx}`} className={`rounded-lg border-2 ${borderColor} ${bgColor} overflow-hidden`}>
                        {/* Decision header */}
                        <div className={`flex items-center justify-between px-4 py-2.5 ${positive ? 'bg-emerald-100/50' : neutral ? 'bg-amber-100/50' : 'bg-red-100/50'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-black
                              ${positive ? 'bg-emerald-500 text-white' : neutral ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                              {positive ? '\u2713' : neutral ? '\u2014' : '\u2717'}
                            </span>
                            <span className="text-xs font-bold text-slate-700">Decisión {idx + 1}</span>
                          </div>
                          <span className={`text-sm font-black ${positive ? 'text-emerald-600' : neutral ? 'text-amber-600' : 'text-red-600'}`}>
                            {step.scoreDelta >= 0 ? '+' : ''}{step.scoreDelta} pts
                          </span>
                        </div>

                        <div className="px-4 py-3 space-y-3">
                          {/* Question context (from node body) */}
                          {step.nodeBody && (
                            <div className="text-xs text-slate-500 leading-relaxed prose prose-xs max-w-none [&_p]:text-slate-500 [&_strong]:text-slate-700 [&_p]:mb-1 [&_p:last-child]:mb-0">
                              <ReactMarkdown>{step.nodeBody.length > 250 ? step.nodeBody.slice(0,250) + '\u2026' : step.nodeBody}</ReactMarkdown>
                            </div>
                          )}

                          {/* Your answer */}
                          <div className={`rounded-lg border px-3 py-2 ${positive ? 'border-emerald-300 bg-emerald-50' : neutral ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Tu respuesta</p>
                            <p className={`text-sm font-medium ${positive ? 'text-emerald-800' : neutral ? 'text-amber-800' : 'text-red-800'}`}>{step.chosenLabel}</p>
                          </div>

                          {/* Correct answer (if different) */}
                          {!wasOptimal && bestOption && (
                            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">⭐ Respuesta óptima (+{bestOption.score_delta})</p>
                              <div className="text-sm font-medium text-emerald-800 prose prose-sm max-w-none [&_p]:mb-0 [&_p]:text-emerald-800">
                                <ReactMarkdown>{bestOption.label}</ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* Clinical explanation (full, not truncated) */}
                          {step.feedback && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1.5">📖 Explicación clínica</p>
                              <div className="text-xs text-blue-900 leading-relaxed prose prose-xs max-w-none [&_p]:text-blue-900 [&_strong]:text-blue-950 [&_p]:mb-1 [&_p:last-child]:mb-0">
                                <ReactMarkdown>{step.feedback}</ReactMarkdown>
                              </div>
                            </div>
                          )}

                          {/* All options overview */}
                          <details className="group">
                            <summary className="cursor-pointer text-[10px] text-slate-400 hover:text-slate-600 font-medium">
                              Ver todas las opciones ({(step.allOptions||[]).length})
                            </summary>
                            <div className="mt-2 space-y-1.5">
                              {(step.allOptions||[]).sort((a,b) => (b.score_delta||0) - (a.score_delta||0)).map(opt => {
                                const isChosen = opt.id === step.optionId;
                                const d = opt.score_delta || 0;
                                return (
                                  <div key={opt.id} className={`flex items-start gap-2 rounded px-2.5 py-1.5 text-xs
                                    ${isChosen ? (d >= 1 ? 'bg-emerald-100 border border-emerald-300' : d === 0 ? 'bg-amber-100 border border-amber-300' : 'bg-red-100 border border-red-300') : 'bg-slate-50 border border-slate-100'}`}>
                                    <span className={`flex-shrink-0 text-[10px] font-black ${d >= 1 ? 'text-emerald-600' : d === 0 ? 'text-amber-600' : 'text-red-500'}`}>
                                      {d >= 0 ? '+' : ''}{d}
                                    </span>
                                    <span className={`flex-1 ${isChosen ? 'font-semibold' : ''} ${d >= 1 ? 'text-emerald-800' : 'text-slate-600'}`}>
                                      {opt.label}
                                      {isChosen && <span className="ml-1 text-[9px] font-bold text-slate-400">(tu respuesta)</span>}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── TAB: VITALS EVOLUTION ── */}
              {debriefTab === 'vitals' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 italic">Evolución de constantes vitales durante el caso</p>

                  {/* Vitals sparkline table */}
                  {vitalsTimeline.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-wider">Paso</th>
                            <th className="text-center px-2 py-2 text-[10px] font-black text-red-500 uppercase tracking-wider">FC</th>
                            <th className="text-center px-2 py-2 text-[10px] font-black text-blue-500 uppercase tracking-wider">FR</th>
                            <th className="text-center px-2 py-2 text-[10px] font-black text-cyan-500 uppercase tracking-wider">SatO₂</th>
                            <th className="text-center px-2 py-2 text-[10px] font-black text-amber-600 uppercase tracking-wider">TAS/TAD</th>
                            <th className="text-center px-2 py-2 text-[10px] font-black text-orange-500 uppercase tracking-wider">Tª</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vitalsTimeline.map((v, idx) => {
                            const prev = idx > 0 ? vitalsTimeline[idx-1] : null;
                            const arrow = (curr, old) => {
                              if (!old || curr == null || old == null) return '';
                              return curr > old ? '\u2191' : curr < old ? '\u2193' : '\u2192';
                            };
                            return (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="px-3 py-2 text-slate-600 font-medium">{v.step}</td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${isVitalAbnormal('fc',v.fc) ? 'text-red-600' : 'text-slate-700'}`}>
                                  {v.fc ?? '-'} {arrow(v.fc, prev?.fc) && <span className="text-[9px]">{arrow(v.fc, prev?.fc)}</span>}
                                </td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${isVitalAbnormal('fr',v.fr) ? 'text-blue-600' : 'text-slate-700'}`}>
                                  {v.fr ?? '-'} {arrow(v.fr, prev?.fr) && <span className="text-[9px]">{arrow(v.fr, prev?.fr)}</span>}
                                </td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${isVitalAbnormal('sat',v.sat) ? 'text-cyan-600 bg-cyan-50' : 'text-slate-700'}`}>
                                  {v.sat ?? '-'}% {arrow(v.sat, prev?.sat) && <span className="text-[9px]">{arrow(v.sat, prev?.sat)}</span>}
                                </td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${isVitalAbnormal('tas',v.tas) ? 'text-amber-600' : 'text-slate-700'}`}>
                                  {v.tas ?? '-'}/{v.tad ?? '-'}
                                </td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${isVitalAbnormal('temp',v.temp) ? 'text-orange-600' : 'text-slate-700'}`}>
                                  {v.temp != null ? `${v.temp}\u00B0` : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Gasometry evolution */}
                  {gasSnapshots.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">🧪 Gasometría</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-purple-50/50 border-b border-purple-200">
                              <th className="text-left px-3 py-2 text-[10px] font-black text-purple-500 uppercase">Paso</th>
                              <th className="text-center px-2 py-2 text-[10px] font-black text-purple-500 uppercase">pH</th>
                              <th className="text-center px-2 py-2 text-[10px] font-black text-purple-500 uppercase">pCO₂</th>
                              <th className="text-center px-2 py-2 text-[10px] font-black text-purple-500 uppercase">HCO₃</th>
                              <th className="text-center px-2 py-2 text-[10px] font-black text-purple-500 uppercase">BE</th>
                              <th className="text-center px-2 py-2 text-[10px] font-black text-purple-500 uppercase">Lactato</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gasSnapshots.map((g, idx) => (
                              <tr key={idx} className="border-b border-purple-100 hover:bg-purple-50/30">
                                <td className="px-3 py-2 text-slate-600 font-medium">{g.step}</td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${g.pH < 7.35 ? 'text-red-600' : 'text-slate-700'}`}>{g.pH}</td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${g.pCO2 > 45 || g.pCO2 < 35 ? 'text-amber-600' : 'text-slate-700'}`}>{g.pCO2}</td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${g.HCO3 < 18 ? 'text-red-600' : 'text-slate-700'}`}>{g.HCO3}</td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${g.BE < -5 ? 'text-red-600' : 'text-slate-700'}`}>{g.BE}</td>
                                <td className={`text-center px-2 py-2 font-mono font-bold ${g.lactato > 2 ? 'text-red-600 bg-red-50' : 'text-slate-700'}`}>{g.lactato}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: LABS EVOLUTION ── */}
              {debriefTab === 'labs' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 italic">Evolución de analíticas y pruebas complementarias</p>
                  {labSnapshots.map((snap, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[9px] font-black">{snap.step}</span>
                        <span className="text-[10px] font-bold text-slate-600">{snap.label}</span>
                      </div>
                      <div className="p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {snap.labs.map((lab, li) => (
                            <div key={li} className={`flex items-center justify-between rounded px-2.5 py-1.5 text-xs
                              ${lab.alert ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-100'}`}>
                              <span className={`font-medium ${lab.alert ? 'text-red-700' : 'text-slate-600'}`}>{lab.name}</span>
                              <span className={`font-mono font-bold ${lab.alert ? 'text-red-600' : 'text-slate-800'}`}>
                                {lab.alert && '\u26A0 '}{lab.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── TAB: CLINICAL TIMELINE ── */}
              {debriefTab === 'timeline' && (
                <div className="space-y-0">
                  <p className="text-xs text-slate-500 italic mb-4">Secuencia completa de nodos visitados</p>
                  {nodeTrail.map((node, idx) => {
                    const decision = history.find(h => h.nodeId === node.nodeId);
                    const kindColor = node.kind === 'decision' ? 'border-amber-400 bg-amber-100 text-amber-700'
                                    : node.kind === 'outcome'  ? 'border-purple-400 bg-purple-100 text-purple-700'
                                    : 'border-blue-400 bg-blue-100 text-blue-700';
                    const kindLabel = node.kind === 'decision' ? 'Decisi\u00F3n'
                                   : node.kind === 'outcome'  ? 'Desenlace'
                                   : 'Informaci\u00F3n';
                    return (
                      <div key={`${node.nodeId}-${idx}`} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-[9px] font-black flex-shrink-0 ${kindColor}`}>
                            {idx + 1}
                          </div>
                          {idx < nodeTrail.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 min-h-[20px]" />}
                        </div>
                        {/* Content */}
                        <div className="pb-4 flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border ${kindColor}`}>{kindLabel}</span>
                            {decision && (
                              <span className={`text-[10px] font-bold ${decision.scoreDelta >= 1 ? 'text-emerald-600' : decision.scoreDelta === 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                {decision.scoreDelta >= 0 ? '+' : ''}{decision.scoreDelta} pts
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-snug">{node.title}</p>
                          {decision && (
                            <p className="text-[10px] text-slate-400 mt-0.5 italic">
                              Elegiste: {decision.chosenLabel?.slice(0,60)}{decision.chosenLabel?.length > 60 ? '\u2026' : ''}
                            </p>
                          )}
                          {/* Show vitals snapshot if available */}
                          {node.metadata?.vitals && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {[
                                ['FC', node.metadata.vitals.fc, 'fc'],
                                ['SatO\u2082', node.metadata.vitals.sat, 'sat'],
                                ['TA', `${node.metadata.vitals.tas||'-'}/${node.metadata.vitals.tad||'-'}`, 'tas'],
                              ].filter(([,v]) => v != null && v !== '-/-').map(([label, val, key]) => (
                                <span key={label} className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold
                                  ${isVitalAbnormal(key, typeof val === 'string' ? parseInt(val) : val) ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                  {label} {val}{key === 'sat' ? '%' : key === 'fc' ? ' lpm' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ══ PREVIOUS ATTEMPTS ══ */}
          {previousAttempts.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-slate-400 text-xs">{"\uD83D\uDD50"}</span>
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">Intentos anteriores</h4>
              </div>
              <div className="p-4 space-y-2">
                {previousAttempts.slice(0, 5).map(att => {
                  const g = getGrade(att.score_total, maxPossibleScore, minPossibleScore);
                  return (
                    <div key={att.id} className="flex items-center justify-between text-[10px] text-slate-500 py-1.5 border-b border-slate-100 last:border-0">
                      <span className="font-mono">{dayjs(att.completed_at || att.created_at).format("DD/MM/YY HH:mm")}</span>
                      <div className="flex items-center gap-2">
                        {g && <span className={`font-black ${g.colorText}`}>{'\u2B50'.repeat(g.stars)}</span>}
                        <span className="font-black text-slate-700">{att.score_total} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ ACTIONS ══ */}
          <div className="flex flex-wrap items-center gap-3">
            {submitting ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                GUARDANDO...
              </span>
            ) : registered ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-black font-mono">{"\u2713"} GUARDADO</span>
            ) : submitError ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-black font-mono">{"\u2717"} NO GUARDADO: {submitError}</span>
                <button type="button" onClick={handleFinish}
                  className="rounded-md border border-red-300 bg-red-50 hover:bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700">
                  Reintentar
                </button>
              </div>
            ) : null}
            <button type="button" onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 tracking-wide">
              {"\uD83D\uDD04"} Repetir caso
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ════════════════════════════════════════════════════════════
     PLAYER — 3-Column Clinical Monitor Layout
  ════════════════════════════════════════════════════════════ */
  const vitals = currentNode?.metadata?.vitals || null;
  const labs = currentNode?.metadata?.labs || null;
  const gasometry = currentNode?.metadata?.gasometry || null;
  const imaging = currentNode?.metadata?.imaging || null;
  const ventilation = currentNode?.metadata?.ventilation || null;
  const patientInfo = microCase?.patient_info || null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <Toast toast={toast} />
      <ScreenFlash type={screenFlash} />

      <div className="max-w-7xl mx-auto space-y-0">

        {/* ════ HEADER BAR ════ */}
        <div className="bg-white border border-slate-200 rounded-t-xl shadow-sm">
          {/* Top row */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-[10px] font-black text-slate-500 leading-snug truncate tracking-[0.15em] uppercase">{microCase.title}</h3>
              {roleLabel && (
                <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 uppercase tracking-widest flex-shrink-0">{roleLabel}</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {patientInfo && (
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  {[patientInfo.name, sexSymbol(patientInfo.sex), patientInfo.age, patientInfo.weightKg ? `${patientInfo.weightKg}kg` : null].filter(Boolean).join(" \u00B7 ")}
                </span>
              )}
              <span className="font-mono text-[10px] text-slate-500 tabular-nums">{"\u23F1"} {formatTime(elapsed)}</span>
              <div className="relative flex-shrink-0">
                <span key={flashKey} className={`font-mono text-[10px] font-black text-amber-600 ${coinAnim ? 'coin-spin inline-block' : ''}`}>
                  {score} pts
                </span>
                {deltaAnim && (
                  <span key={deltaAnim.key}
                    className={`anim-delta absolute -top-4 -right-0 text-xs font-black pointer-events-none select-none ${deltaAnim.value >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                    {deltaAnim.value >= 0 ? '+' : ''}{deltaAnim.value}
                  </span>
                )}
              </div>
              {streak >= 2 && (
                <span key={streak} className={`text-[10px] font-black ${streak >= 4 ? 'text-orange-500 streak-hot' : 'text-orange-400 animate-pulse'}`}>
                  {'\uD83D\uDD25'.repeat(streak >= 4 ? 2 : 1)}{"\u00D7"}{streak}
                </span>
              )}
            </div>
          </div>

          {/* Progress dots */}
          <div className="px-4 py-2 bg-slate-50/50">
            {decisionNodes.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-slate-400 font-black mr-1 tracking-widest uppercase">Progreso</span>
                {decisionNodes.map((dn, idx) => {
                  const step      = history.find(h => h.nodeId === dn.id);
                  const isCurrent = currentNodeId === dn.id;
                  const good      = step ? step.scoreDelta >= 1 : null;
                  return (
                    <div key={dn.id} className="flex items-center gap-1.5">
                      <div className={`flex items-center justify-center text-[8px] font-black transition-all duration-300
                        ${isCurrent ? 'h-6 w-6 rounded-full border-2 border-blue-500 bg-blue-100 text-blue-700 node-pop shadow-sm'
                          : good === true  ? 'h-5 w-5 rounded-full border border-emerald-400 bg-emerald-100 text-emerald-600 node-pop'
                          : good === false ? 'h-5 w-5 rounded-full border border-red-400 bg-red-100 text-red-600 node-pop'
                          : 'h-4 w-4 rounded-full border border-slate-200 bg-white text-slate-300'}`}>
                        {isCurrent ? idx+1 : good === true ? '\u2713' : good === false ? '\u2717' : ''}
                      </div>
                      {idx < decisionNodes.length - 1 && (
                        <div className={`h-px w-4 transition-colors duration-300 ${good === true ? 'bg-emerald-300' : good === false ? 'bg-red-300' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  );
                })}
                <div className="flex-1 h-px bg-slate-200 ml-1" />
              </div>
            ) : (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* ════ 3-COLUMN BODY ════ */}
        {/* Desktop: 2 or 3 columns depending on vitals. Mobile: stacked */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-x border-b border-slate-200 rounded-b-xl overflow-hidden bg-slate-50">

          {/* ── LEFT: Monitor Panel (desktop) — only when vitals exist ── */}
          {vitals && (
            <div className="hidden md:block md:col-span-3 p-3 border-r border-slate-200 bg-white">
              <MonitorPanel vitals={vitals} deterioration={deterioration} />
            </div>
          )}

          {/* ── Mobile: Monitor chips with mini waveforms ── */}
          {vitals && (
            <div className="md:hidden p-2.5 border-b" style={{ background: '#050f0a', borderColor: '#0d2818' }}>
              <MonitorChips vitals={vitals} />
            </div>
          )}

          {/* ── CENTER: Patient Panel — expands when no monitor ── */}
          <div className={`${vitals ? 'md:col-span-5' : 'md:col-span-7'} p-4 border-b md:border-b-0 md:border-r border-slate-200 bg-white overflow-y-auto`} style={{ maxHeight: "70vh" }}>
            {/* Patient demographics */}
            <div className="mb-3 pb-3 border-b border-slate-100">
              <PatientDemographics info={patientInfo} />
            </div>

            {/* Narrative text — shown for ALL node types in the center panel */}
            {currentNode.body_md && (
              <div className="prose prose-sm max-w-none text-slate-700 [&>p]:leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0 [&>p]:text-[0.85rem] [&_strong]:text-slate-900 [&_h3]:text-slate-800 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:tracking-wide [&_ul]:text-slate-600 [&_li]:text-[0.83rem]">
                <ReactMarkdown>{formatInfoBody(currentNode.body_md) || ""}</ReactMarkdown>
              </div>
            )}

            {/* Labs */}
            <LabsTable labs={labs} />

            {/* Gasometry */}
            <GasometryPanel gas={gasometry} />

            {/* Imaging */}
            <ImagingViewer imaging={imaging} />

            {/* Ventilation */}
            <VentilationPanel vent={ventilation} />
          </div>

          {/* ── RIGHT: Action Panel — expands when no monitor ── */}
          <div className={`${vitals ? 'md:col-span-4' : 'md:col-span-5'} p-4 bg-white`}>

            {/* ── INFO node action ── */}
            {currentNode.kind === 'info' && (
              <div className="flex flex-col h-full min-h-[200px] space-y-3">
                {/* Feedback de la decisión anterior — persiste hasta la próxima pregunta */}
                {lastFeedback && currentNodeId !== startId && (
                  <div className={`rounded-lg border px-3 py-2.5 text-xs ${lastFeedback.positive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    <p className="text-[9px] font-black uppercase tracking-[0.15em] mb-1 opacity-70">Feedback de tu decisión</p>
                    <div className="prose prose-xs max-w-none [&_p]:text-inherit [&_strong]:font-bold [&_p]:mb-1 [&_p:last-child]:mb-0">
                      <ReactMarkdown>{lastFeedback.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
                <div className="flex-1 flex items-center justify-center">
                  {currentNode.auto_advance_to ? (
                    <button type="button"
                      onClick={() => setCurrentNodeId(currentNode.auto_advance_to)}
                      autoFocus
                      className="inline-flex items-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 tracking-wide">
                      {currentNodeId === startId ? `\u25B6 Comenzar caso` : `Continuar \u2192`}
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Informaci&oacute;n cl&iacute;nica</p>
                  )}
                </div>
              </div>
            )}

            {/* ── DECISION node action ── */}
            {currentNode.kind === 'decision' && (
              <div className="space-y-3">
                {/* Previous feedback */}
                {lastFeedback && (
                  <div className={`rounded-lg border px-3 py-2.5 text-xs ${lastFeedback.positive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    <div className="prose prose-xs max-w-none [&_p]:text-inherit [&_strong]:font-bold [&_p]:mb-1 [&_p:last-child]:mb-0">
                      <ReactMarkdown>{lastFeedback.content}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Question header — narrative is now in center panel */}
                <div className="border-b border-slate-100 pb-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600 mb-1">{"\u2699"} Decisi&oacute;n cl&iacute;nica</p>
                  <p className="text-xs text-slate-500">Selecciona la mejor opci&oacute;n:</p>
                </div>

                {/* Time pressure alert */}
                {deterioration > 0 && (
                  <div className={`rounded-lg border-2 px-3 py-2 mb-3 animate-pulse ${
                    deterioration >= 3 ? 'border-red-500 bg-red-50' :
                    deterioration >= 2 ? 'border-amber-500 bg-amber-50' :
                    'border-yellow-400 bg-yellow-50'}`}>
                    <p className={`text-xs font-black ${
                      deterioration >= 3 ? 'text-red-700' :
                      deterioration >= 2 ? 'text-amber-700' :
                      'text-yellow-700'}`}>
                      {deterioration >= 3 ? '\ud83d\udea8 DETERIORO CR\u00cdTICO \u2014 El paciente se descompensa. Act\u00faa YA.'
                       : deterioration >= 2 ? '\u26a0\ufe0f El paciente empeora. Cada segundo cuenta.'
                       : '\u23f1\ufe0f El paciente espera tu decisi\u00f3n...'}
                    </p>
                  </div>
                )}

                {/* Options */}
                <div key={currentNodeId} className="grid gap-2">
                  {shuffledOptions.map((option, idx) => {
                    const isChosen     = selectedOptionId === option.id;
                    const isBest       = option.id === bestOptionId;
                    const optDelta     = option.score_delta || 0;
                    const isSelected   = !!selectedOptionId;
                    const chosenDelta  = isSelected
                      ? (currentNode.options.find(o => o.id === selectedOptionId)?.score_delta || 0)
                      : 0;
                    const chosenPositive = chosenDelta >= 1;

                    const letters = ['A','B','C','D','E'];

                    let letterClass = "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-black border-2 transition-all ";
                    let wrapClass = "w-full text-left rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 opt-enter flex items-start gap-3 ";
                    let scoreBadge = null;

                    if (!isSelected) {
                      wrapClass += "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-sm cursor-pointer group";
                      letterClass += "border-slate-300 bg-slate-100 text-slate-500 group-hover:border-blue-400 group-hover:bg-blue-100 group-hover:text-blue-600";
                    } else if (isChosen) {
                      if (chosenPositive) {
                        wrapClass += "border-emerald-400 bg-emerald-50 text-emerald-800 anim-correct";
                        letterClass += "border-emerald-400 bg-emerald-500 text-white";
                      } else {
                        wrapClass += "border-red-400 bg-red-50 text-red-800 anim-wrong";
                        letterClass += "border-red-400 bg-red-500 text-white";
                      }
                      scoreBadge = (
                        <span className={`flex-shrink-0 text-sm font-black ${chosenPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {chosenDelta >= 0 ? '+' : ''}{chosenDelta}
                        </span>
                      );
                    } else {
                      if (isBest && !chosenPositive) {
                        wrapClass += "border-amber-300 bg-amber-50 text-amber-800 opacity-95";
                        letterClass += "border-amber-400 bg-amber-400 text-white";
                        scoreBadge = <span className="flex-shrink-0 text-xs font-black text-amber-600">{"\u2B50"}+{optDelta}</span>;
                      } else if (optDelta >= 1) {
                        wrapClass += "border-emerald-200 bg-emerald-50/50 text-emerald-600 opacity-70";
                        letterClass += "border-emerald-300 bg-emerald-100 text-emerald-500";
                        scoreBadge = <span className="flex-shrink-0 text-[10px] font-semibold text-emerald-500">+{optDelta}</span>;
                      } else {
                        wrapClass += "border-slate-100 bg-slate-50/50 text-slate-400 opacity-40 cursor-default";
                        letterClass += "border-slate-200 bg-slate-100 text-slate-300";
                        scoreBadge = <span className="flex-shrink-0 text-[10px] text-slate-400">{optDelta}</span>;
                      }
                    }

                    return (
                      <button key={option.id} type="button"
                        onClick={() => handleOptionSelect(option)}
                        disabled={isLocked}
                        className={wrapClass}
                        style={{ animationDelay: `${idx * 0.07}s` }}
                      >
                        <span className={letterClass}>{isChosen ? (chosenPositive ? '\u2713' : '\u2717') : (isSelected && isBest && !chosenPositive) ? '\u2605' : letters[idx]}</span>
                        <div className="prose prose-sm max-w-none flex-1 [&_p]:mb-0 [&_p]:text-inherit [&_strong]:text-amber-700">
                          <ReactMarkdown>{option.label}</ReactMarkdown>
                        </div>
                        {scoreBadge}
                      </button>
                    );
                  })}
                </div>

                {/* Botón Continuar — aparece tras seleccionar; el feedback permanece visible hasta que se pulsa */}
                {pendingAdvance && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleAdvance}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      autoFocus
                    >
                      {pendingAdvance.completed ? 'Ver resultados' : 'Continuar'} {"\u2192"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
