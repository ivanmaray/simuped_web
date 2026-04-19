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

/* ─── EcgTrace canvas component ──────────────────────────────── */
function EcgTrace({ fc, rhythm }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const bufferRef = useRef([]);
  const xRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const midY = H / 2;

    const heartRate = fc || 0;
    const speed = 1.8;
    const pixelsBetweenBeats = heartRate > 0 ? (60 / heartRate) * 80 : 0;

    xRef.current += speed;
    const buf = bufferRef.current;
    const newY = (() => {
      if (heartRate === 0) return midY;
      const phase = pixelsBetweenBeats > 0 ? (xRef.current % pixelsBetweenBeats) : 0;
      const qrsStart = pixelsBetweenBeats * 0.4;
      const qrsEnd = qrsStart + 12;
      if (phase >= qrsStart && phase < qrsStart + 3) {
        return midY + (phase - qrsStart) * 3;
      } else if (phase >= qrsStart + 3 && phase < qrsStart + 5) {
        return midY - 18 + (phase - qrsStart - 3) * (-6);
      } else if (phase >= qrsStart + 5 && phase < qrsStart + 8) {
        return midY - 30 + (phase - qrsStart - 5) * 14;
      } else if (phase >= qrsStart + 8 && phase < qrsEnd) {
        return midY + 12 - (phase - qrsStart - 8) * 3;
      } else {
        return midY + Math.sin(xRef.current * 0.02) * 1.2;
      }
    })();
    buf.push(newY);
    if (buf.length > W) buf.shift();

    ctx.fillStyle = "#0a1a1a";
    ctx.fillRect(0, 0, W, H);

    // Grid lines (subtle)
    ctx.strokeStyle = "rgba(0,255,100,0.06)";
    ctx.lineWidth = 0.5;
    for (let gy = 0; gy < H; gy += 15) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
    for (let gx = 0; gx < W; gx += 15) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }

    // ECG trace
    ctx.beginPath();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.8;
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 4;
    for (let i = 0; i < buf.length; i++) {
      const px = W - buf.length + i;
      if (i === 0) ctx.moveTo(px, buf[i]);
      else ctx.lineTo(px, buf[i]);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    animRef.current = requestAnimationFrame(draw);
  }, [fc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    const ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    bufferRef.current = [];
    xRef.current = 0;
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded"
        style={{ height: "72px", background: "#0a1a1a" }}
      />
      {rhythm && (
        <p className="text-[9px] font-mono text-green-500/70 mt-1 text-center tracking-wider uppercase">{rhythm}</p>
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

/* ─── Vital display row ──────────────────────────────────────── */
function VitalRow({ label, value, unit, abnormal }) {
  if (value == null && !unit) return null;
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-mono font-black tabular-nums transition-all duration-700 ${abnormal ? 'text-red-600' : 'text-slate-800'}`}>
          {value ?? "--"}
        </span>
        {unit && <span className="text-[10px] text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

/* ─── Monitor Panel (left column) ────────────────────────────── */
function MonitorPanel({ vitals }) {
  const fc = vitals?.fc;
  const fr = vitals?.fr;
  const sat = vitals?.sat;
  const temp = vitals?.temp;
  const tas = vitals?.tas;
  const tad = vitals?.tad;
  const rhythm = vitals?.rhythm;
  const hasVitals = fc != null || fr != null || sat != null || temp != null || tas != null || tad != null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2">
        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Monitor</h4>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        {hasVitals ? (
          <div className="space-y-0">
            <VitalRow label="FC" value={fc} unit="lpm" abnormal={isVitalAbnormal("fc", fc)} />
            {sat != null && <VitalRow label={<>SpO<sub>2</sub></>} value={sat} unit="%" abnormal={isVitalAbnormal("sat", sat)} />}
            {fr != null && <VitalRow label="FR" value={fr} unit="rpm" abnormal={isVitalAbnormal("fr", fr)} />}
            {temp != null && <VitalRow label={<>T&deg;</>} value={temp} unit="&deg;C" abnormal={isVitalAbnormal("temp", temp)} />}
            {(tas != null || tad != null) && (
              <VitalRow
                label="TA"
                value={tas != null && tad != null ? `${tas}/${tad}` : (tas ?? tad)}
                unit="mmHg"
                abnormal={isVitalAbnormal("tas", tas) || isVitalAbnormal("tad", tad)}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-slate-300 italic">Sin constantes</p>
          </div>
        )}
        <div className="mt-auto pt-3">
          <EcgTrace fc={fc || 0} rhythm={rhythm} />
        </div>
      </div>
    </div>
  );
}

/* ─── Monitor Chips (mobile) ─────────────────────────────────── */
function MonitorChips({ vitals }) {
  if (!vitals) return null;
  const items = [];
  if (vitals.fc != null) items.push({ label: "FC", value: vitals.fc, unit: "lpm", key: "fc" });
  if (vitals.sat != null) items.push({ label: "SpO2", value: vitals.sat, unit: "%", key: "sat" });
  if (vitals.fr != null) items.push({ label: "FR", value: vitals.fr, unit: "rpm", key: "fr" });
  if (vitals.temp != null) items.push({ label: "T", value: vitals.temp, unit: "\u00B0C", key: "temp" });
  if (vitals.tas != null && vitals.tad != null) items.push({ label: "TA", value: `${vitals.tas}/${vitals.tad}`, unit: "mmHg", key: "tas" });
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(it => (
        <div key={it.key} className={`rounded border px-2.5 py-1.5 text-center ${isVitalAbnormal(it.key, it.key === "tas" ? vitals.tas : (typeof it.value === "string" ? null : it.value)) ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
          <p className="text-[8px] font-bold text-slate-400 uppercase">{it.label}</p>
          <p className={`text-sm font-mono font-black tabular-nums ${isVitalAbnormal(it.key, it.key === "tas" ? vitals.tas : (typeof it.value === "string" ? null : it.value)) ? 'text-red-600' : 'text-slate-800'}`}>{it.value}</p>
          <p className="text-[8px] text-slate-400">{it.unit}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Labs table ─────────────────────────────────────────────── */
function LabsTable({ labs }) {
  if (!labs || labs.length === 0) return null;
  return (
    <div className="mt-3 rounded border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Laboratorio</span>
      </div>
      <div className="divide-y divide-slate-100">
        {labs.map((lab, i) => (
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

/* ─── Imaging tags ───────────────────────────────────────────── */
function ImagingTags({ imaging }) {
  if (!imaging || imaging.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 mb-1.5">Imagen</p>
      <div className="flex flex-wrap gap-1.5">
        {imaging.map((img, i) => (
          <div key={i} className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1">
            <span className="text-[10px] font-bold text-blue-700">{img.name}</span>
            {img.finding && <span className="text-[10px] text-blue-500 ml-1">- {img.finding}</span>}
          </div>
        ))}
      </div>
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
  const [screenFlash, setScreenFlash] = useState(null);
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
      delta >= 4 ? `\uD83C\uDFAF \u00A1Perfecto! +${delta}` :
      delta >= 2 ? `\u2713 \u00A1Bien! +${delta}` :
      delta >= 1 ? `\uD83D\uDC4D Correcto +${delta}` :
      delta === 0 ? `\u27A1 Neutral` :
      `\u2717 Incorrecto ${delta}`;
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
      setTimeout(() => setShowConfetti(false), 3800);
    }

    // Auto-submit
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
      .catch(() => {})
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
      Selecciona un punto de inicio v&aacute;lido.
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
                {grade?.stars === 3 ? '\u2713 Caso resuelto' : grade?.stars === 2 ? '\u2713 Buen resultado' : grade?.stars === 1 ? '\u25B3 Resultado correcto' : '\u2717 Resultado mejorable'}
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
                <p className="text-xl font-black text-yellow-400">{"\uD83D\uDCB0"} {score}</p>
                <p className="text-[9px] font-black text-yellow-600/80 uppercase tracking-widest mt-0.5">/ {maxPossibleScore} pts</p>
              </div>
              <div className="rounded border border-slate-500/40 bg-slate-900/50 px-5 py-3 min-w-[90px]">
                <p className="text-xl font-black text-slate-300">{"\u23F1"} {formatTime(timeDisplay)}</p>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">TIEMPO</p>
              </div>
              {pct !== null && (
                <div className="rounded border border-purple-500/40 bg-purple-950/50 px-5 py-3 min-w-[90px]">
                  <p className="text-xl font-black text-purple-300">{pct}%</p>
                  <p className="text-[9px] font-black text-purple-600/80 uppercase tracking-widest mt-0.5">PRECISI&Oacute;N</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Decision review ── */}
          {history.length > 0 && (
            <div className="rounded-xl overflow-hidden shadow-lg" style={{background:'linear-gradient(135deg,#060e1c,#0a1830)'}}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <span className="text-purple-400 text-xs">{"\uD83D\uDCDC"}</span>
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Revisi&oacute;n de decisiones</h4>
              </div>
              <div className="p-4 space-y-3">
                {history.map((step, idx) => {
                  const bestOption = [...(step.allOptions||[])].sort((a,b)=>(b.score_delta||0)-(a.score_delta||0))[0];
                  const wasOptimal = bestOption?.id === step.chosenOptionId;
                  const positive   = step.scoreDelta >= 0;
                  return (
                    <div key={`${step.nodeId}-${idx}`} className={`rounded border px-3 py-2.5 ${positive ? 'border-emerald-700/40 bg-emerald-950/30' : 'border-red-700/40 bg-red-950/30'}`}>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Decisi&oacute;n {idx + 1}</p>
                      <div className="flex items-start gap-2">
                        <span className={`flex-shrink-0 h-4 w-4 rounded flex items-center justify-center text-[9px] font-black mt-0.5 ${positive ? 'bg-emerald-600 text-white' : 'bg-red-700 text-white'}`}>
                          {positive ? '\u2713' : '\u2717'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 leading-snug">{step.chosenLabel}</p>
                          {step.feedback && (
                            <p className="text-[11px] text-slate-500 mt-1 italic leading-snug">{step.feedback.slice(0,140)}{step.feedback.length>140?'\u2026':''}</p>
                          )}
                        </div>
                        <span className={`flex-shrink-0 text-xs font-black ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {step.scoreDelta >= 0 ? '+' : ''}{step.scoreDelta}
                        </span>
                      </div>
                      {!wasOptimal && bestOption && (
                        <div className="mt-2 flex items-start gap-2 rounded border border-yellow-700/30 bg-yellow-950/30 px-2 py-1.5">
                          <span className="text-yellow-500 text-[9px]">{"\u2B50"}</span>
                          <p className="text-[10px] text-yellow-400/80 leading-snug flex-1">{bestOption.label.slice(0,80)}{bestOption.label.length>80?'\u2026':''}</p>
                          <span className="text-[10px] font-black text-yellow-400">+{bestOption.score_delta}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Previous attempts ── */}
          {previousAttempts.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{background:'linear-gradient(135deg,#060e1c,#0a1830)'}}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <span className="text-slate-500 text-xs">{"\uD83D\uDD50"}</span>
                <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Intentos anteriores</h4>
              </div>
              <div className="p-4 space-y-2">
                {previousAttempts.slice(0, 5).map(att => {
                  const g = getGrade(att.score_total, maxPossibleScore);
                  return (
                    <div key={att.id} className="flex items-center justify-between text-[10px] text-slate-500 py-1 border-b border-white/5 last:border-0 font-mono">
                      <span>{dayjs(att.completed_at || att.created_at).format("DD/MM/YY HH:mm")}</span>
                      <div className="flex items-center gap-2">
                        {g && <span className={`font-black ${g.colorText}`}>{'\u2B50'.repeat(g.stars)}</span>}
                        <span className="font-black text-slate-300">{"\uD83D\uDCB0"}{att.score_total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-wrap items-center gap-3">
            {submitting ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                GUARDANDO...
              </span>
            ) : registered ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-black font-mono">{"\u2713"} GUARDADO</span>
            ) : null}
            <button type="button" onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded border-2 border-blue-500 bg-blue-700/80 hover:bg-blue-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 tracking-wide">
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
                  {"\uD83D\uDCB0"} {score}
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
        {/* Desktop: 3 columns. Mobile: stacked */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-x border-b border-slate-200 rounded-b-xl overflow-hidden bg-slate-50">

          {/* ── LEFT: Monitor Panel (desktop) ── */}
          <div className="hidden md:block md:col-span-3 p-3 border-r border-slate-200 bg-white">
            <MonitorPanel vitals={vitals} />
          </div>

          {/* ── Mobile: Monitor chips ── */}
          <div className="md:hidden p-3 bg-white border-b border-slate-200">
            {vitals ? (
              <div className="space-y-2">
                <MonitorChips vitals={vitals} />
                <EcgTrace fc={vitals?.fc || 0} rhythm={vitals?.rhythm} />
              </div>
            ) : (
              <p className="text-xs text-slate-300 italic text-center py-2">Sin constantes vitales</p>
            )}
          </div>

          {/* ── CENTER: Patient Panel ── */}
          <div className="md:col-span-5 p-4 border-b md:border-b-0 md:border-r border-slate-200 bg-white overflow-y-auto" style={{ maxHeight: "70vh" }}>
            {/* Patient demographics */}
            <div className="mb-3 pb-3 border-b border-slate-100">
              <PatientDemographics info={patientInfo} />
            </div>

            {/* Narrative text */}
            <div className="prose prose-sm max-w-none text-slate-700 [&>p]:leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0 [&>p]:text-[0.85rem] [&_strong]:text-slate-900 [&_h3]:text-slate-800 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:tracking-wide [&_ul]:text-slate-600 [&_li]:text-[0.83rem]">
              <ReactMarkdown>{formatInfoBody(currentNode.body_md) || ""}</ReactMarkdown>
            </div>

            {/* Labs */}
            <LabsTable labs={labs} />

            {/* Gasometry */}
            <GasometryPanel gas={gasometry} />

            {/* Imaging */}
            <ImagingTags imaging={imaging} />

            {/* Ventilation */}
            <VentilationPanel vent={ventilation} />
          </div>

          {/* ── RIGHT: Action Panel ── */}
          <div className="md:col-span-4 p-4 bg-white">

            {/* ── INFO node action ── */}
            {currentNode.kind === 'info' && (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                {currentNodeId === startId && currentNode.auto_advance_to ? (
                  <button type="button"
                    onClick={() => setCurrentNodeId(currentNode.auto_advance_to)}
                    className="inline-flex items-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 tracking-wide">
                    {"\u25B6"} Comenzar caso
                  </button>
                ) : autoAdvanceActive ? (
                  <div className="text-center space-y-2">
                    <svg className="animate-spin h-5 w-5 text-blue-500 mx-auto" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    <p className="text-xs text-slate-400 font-medium">Cargando...</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Informaci&oacute;n cl&iacute;nica</p>
                )}
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

                {/* Question header */}
                <div className="border-b border-slate-100 pb-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-600 mb-1">Decisi&oacute;n cl&iacute;nica</p>
                  <div className="prose prose-sm max-w-none text-slate-800 font-medium leading-relaxed [&>p]:mb-0 [&>p]:text-[0.85rem] [&_strong]:text-amber-700">
                    <ReactMarkdown>{currentNode.body_md || ""}</ReactMarkdown>
                  </div>
                </div>

                {/* Options */}
                <div key={currentNodeId} className="grid gap-2">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
