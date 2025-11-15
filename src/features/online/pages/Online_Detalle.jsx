// src/pages/SimulacionDetalle.jsx antes
// src/features/online/pages/OnlineDetalle.jsx ahora
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { getNowUtcCached } from "../../../utils/supabaseCache.js";
import Navbar from "../../../components/Navbar.jsx";
import Spinner from "../../../components/Spinner.jsx";
import FadeTransition from "../../../components/FadeTransition.jsx";
import ErrorModal from "../../../components/ErrorModal.jsx";
import { reportWarning } from "../../../utils/reporting.js";
import { getProfileCached, getScenarioCached, getCaseBriefCached } from "../../../utils/supabaseCache.js";
import { formatLevel, formatMode, formatRole } from "../../../utils/formatUtils.js";


const HINT_PENALTY_POINTS = 5; // puntos que se restan por cada pista usada (puedes ajustar)

// Sync client with server time (drift correction)
function useServerTime(opts = {}) {
  const [driftMs, setDriftMs] = useState(0);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getNowUtcCached(supabase);
        if (!mounted) return;
        if (data) {
          const server = new Date(data).getTime();
          const client = Date.now();
          setDriftMs(server - client);
        }
      } catch (error) {
        try { opts.onError?.('Error sincronizando hora con el servidor'); } catch {}
        reportWarning('OnlineDetalle.nowUtc.initial', error);
      }
    })();
    const id = setInterval(async () => {
      try {
        const data = await getNowUtcCached(supabase);
        if (data) {
          const server = new Date(data).getTime();
          const client = Date.now();
          setDriftMs(server - client);
        }
      } catch (error) {
        try { opts.onError?.('Error sincronizando hora con el servidor'); } catch {}
        reportWarning('OnlineDetalle.nowUtc.interval', error);
      }
    }, 120000); // cada 2 min
    return () => { mounted = false; clearInterval(id); };
  }, []);
  const now = () => Date.now() + driftMs;
  return { driftMs, now };
}

// ...existing code...

function isTimedStep(step) {
  if (!step) return false;
  // Si cualquier pregunta del paso tiene time_limit definido, el paso es cronometrado
  if (Array.isArray(step.questions) && step.questions.some((q) => Number(q?.time_limit) > 0)) {
    return true;
  }
  // Compatibilidad hacia atrás: permitir activar por texto en la descripción
  const desc = String(step.description || "").toLowerCase();
  return (
    desc.includes("intervención urgente") ||
    desc.includes("tiempo limitado") ||
    desc.includes("timebox")
  );
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


function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === 'string') {
    try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  if (typeof v === 'object') return Object.values(v);
  return [];
}


function joinItems(val) {
  if (val == null) return '—';
  if (Array.isArray(val)) return val.map(String).join('; ');
  return String(val);
}

function labelizeKey(k) {
  const s = String(k || '').trim();
  if (!s) return '';
  // Reemplaza guiones/underscores por espacios y capitaliza palabras
  return s
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(\p{L})(\p{L}*)/gu, (_, a, b) => a.toUpperCase() + b);
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

// Donut timer for time remaining (compact visual)
function TimeDonut({ totalSecs = 0, remainSecs = 0, size = 72, title = "Tiempo restante" }) {
  const total = Math.max(1, Number(totalSecs) || 0);
  const remain = Math.max(0, Math.min(total, Number(remainSecs) || 0));
  const pct = Math.round((remain / total) * 100);
  const angle = pct * 3.6;
  const ringStyle = {
    width: `${size}px`,
    height: `${size}px`,
    background: `conic-gradient(#1E6ACB ${angle}deg, #e2e8f0 0)`, // brand blue + softer track
    borderRadius: "9999px",
    transition: "background 0.4s ease",
    boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.7), 0 1px 2px rgba(0,0,0,0.06)",
    border: "1px solid rgba(15, 23, 42, 0.06)",
  };
  const innerSize = size - 12;

  function mmss(s) {
    s = Math.max(0, Math.floor(s));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} title={title}>
      <div style={ringStyle} aria-hidden="true" />
      <div
        className="absolute rounded-full bg-white grid place-items-center text-slate-900 font-mono tabular-nums shadow-sm"
        style={{ width: innerSize, height: innerSize, fontSize: Math.max(11, Math.floor(size / 4.6)) }}
      >
        {mmss(remain)}
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

// AccordionSection: reusable accordion for interactive briefing
function AccordionSection({ title, subtitle, open, onToggle, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white mb-4 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-3 text-left ${open ? "bg-slate-50" : "hover:bg-slate-50"}`}
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <span className={`text-slate-100/90 text-sm inline-flex items-center gap-1`}>
          <span className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
          {open ? "Ocultar" : "Ver"}
        </span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}

// ChipButton: interactive chip for selection
function ChipButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs mr-2 mb-2 ${
        active ? "border-[#1E6ACB] bg-[#4FA3E3]/10 text-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
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

// Skeleton helper
function Sk({ w = "100%", h = 12, className = "" }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} style={{ width: w, height: h }} />;
}

// Triángulo de Evaluación Pediátrica (TEP) como SVG (más visible, nunca recortado)
function TEPTriangle({ appearance, breathing, circulation, onToggle }) {
  function norm(v) {
    const k = String(v || '').toLowerCase();
    if (['verde', 'green', 'normal'].includes(k)) return 'green';
    if (['amarillo', 'ámbar', 'ambar', 'amber', 'sospechoso'].includes(k)) return 'amber';
    if (['rojo', 'red', 'anormal', 'alterado'].includes(k)) return 'red';
    return null;
  }
  const A = norm(appearance);
  const B = norm(breathing);
  const C = norm(circulation);

  const colorMapFill = {
    green: '#d1fae5',
    amber: '#fde68a',
    red:   '#fecaca',
    null:  '#e5e7eb',
  };
  const colorMapStroke = {
    green: '#059669',
    amber: '#b45309',
    red:   '#b91c1c',
    null:  '#9ca3af',
  };

  // Más área útil para que no se recorten textos
  const width = 840;      // sólo afecta al viewBox (responsive)
  const height = 540;     // espacio extra bajo para los rótulos de la base
  const padding = 110;    // margen interno generoso
  const top = { x: width / 2, y: padding };
  const left = { x: padding, y: height - padding };
  const right = { x: width - padding, y: height - padding };

  const NODE_R = 22;      // tamaño del nodo
  const NODE_DOT = 5;     // punto interior
  const FONT = 18;        // tamaño de letra de las etiquetas
  const LABEL_OFFSET = 36; // desplaza etiquetas de los extremos hacia dentro

  function node({ x, y }, status, label, keyName) {
    const fill = colorMapFill[status ?? 'null'];
    const stroke = colorMapStroke[status ?? 'null'];
    const has = status !== null;
    const ringR = NODE_R + 4;
    const ringAnim = `${ringR};${ringR + 2};${ringR}`;
    const statusText = status === 'green' ? 'Normal' : status === 'amber' ? 'Sospechoso' : status === 'red' ? 'Alterado' : 'Sin seleccionar';
    const coreFill = status === 'green' ? 'url(#coreGreen)' : status === 'amber' ? 'url(#coreAmber)' : status === 'red' ? 'url(#coreRed)' : '#fff';
    const ringWidth = has ? 4 : 3;
    const dotSize = has ? NODE_DOT + 1.5 : NODE_DOT;
    const handle = () => { if (typeof onToggle === 'function' && keyName) onToggle(keyName); };
    const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handle(); } };
    return (
      <g onClick={handle} onKeyDown={onKey} role={onToggle ? 'button' : undefined} tabIndex={onToggle ? 0 : undefined} style={{ cursor: onToggle ? 'pointer' : 'default' }}>
        <title>{`${label}: ${statusText}`}</title>
        {has && (
          <g>
            <circle cx={x} cy={y} r={NODE_R + 16} fill={fill} opacity="0.35" filter="url(#halo)">
              <animate attributeName="opacity" values="0.35;0.18;0.35" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* halo de trazo para reforzar el color */}
            <circle cx={x} cy={y} r={ringR + 7} fill="none" stroke={stroke} strokeOpacity="0.22" strokeWidth="8">
              <animate attributeName="stroke-opacity" values="0.22;0.12;0.22" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
        <circle cx={x} cy={y} r={ringR} fill="#fff" stroke={stroke} strokeWidth={ringWidth}>
          {has && <animate attributeName="r" values={ringAnim} dur="2.4s" repeatCount="indefinite" />}
        </circle>
        <circle cx={x} cy={y} r={NODE_R} fill={coreFill} stroke="#e2e8f0" strokeWidth="1.5" />
        <circle cx={x} cy={y} r={dotSize} fill={stroke} />
      </g>
    );
  }

  return (
    <div className="w-full grid place-items-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: 640 }}
        role="img"
        aria-label="Triángulo de Evaluación Pediátrica"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="tepShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#94a3b8" floodOpacity="0.35" />
          </filter>
          <filter id="halo" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <linearGradient id="triGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="100%" stopColor="#eaf4ff" stopOpacity="0.9" />
          </linearGradient>
          {/* Gradientes para el núcleo según estado */}
          <radialGradient id="coreGreen" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#a7f3d0" />
            <stop offset="100%" stopColor="#d1fae5" />
          </radialGradient>
          <radialGradient id="coreAmber" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#fef3c7" />
          </radialGradient>
          <radialGradient id="coreRed" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#fecaca" />
            <stop offset="100%" stopColor="#fee2e2" />
          </radialGradient>
        </defs>
        {/* triángulo base */}
        <polygon
          points={`${top.x},${top.y} ${left.x},${left.y} ${right.x},${right.y}`}
          fill="url(#triGrad)"
          stroke="#cbd5e1"
          strokeWidth="2"
          filter="url(#tepShadow)"
        />
  {/* vértices modernos */}
  {node(top, A, 'Apariencia', 'appearance')}
  {node(left, B, 'Respiración', 'breathing')}
  {node(right, C, 'Circulación cutánea', 'circulation')}

        {/* etiquetas (posicionadas y divididas en líneas para evitar recortes) */}
        <text x={top.x} y={top.y + NODE_R + 26} textAnchor="middle" fontSize={FONT} fontWeight="700" fill={A ? colorMapStroke[A] : "#334155"}>
          Apariencia
        </text>
        <text textAnchor="start" fontSize={FONT} fontWeight="700" fill={B ? colorMapStroke[B] : "#334155"}>
          <tspan x={left.x + LABEL_OFFSET} y={left.y + NODE_R + 18}>Respiración</tspan>
          <tspan x={left.x + LABEL_OFFSET} dy={22}>Trabajo resp.</tspan>
        </text>
        <text textAnchor="end" fontSize={FONT} fontWeight="700" fill={C ? colorMapStroke[C] : "#334155"}>
          <tspan x={right.x - LABEL_OFFSET} y={right.y + NODE_R + 18}>Circulación</tspan>
          <tspan x={right.x - LABEL_OFFSET} dy={22}>cutánea</tspan>
        </text>
      </svg>

      {/* leyenda moderna */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-slate-700">
        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full ring-1 ring-emerald-200 bg-emerald-50">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: colorMapFill.green, border: `2px solid ${colorMapStroke.green}` }}></span>
          Normal
        </span>
        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full ring-1 ring-amber-200 bg-amber-50">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: colorMapFill.amber, border: `2px solid ${colorMapStroke.amber}` }}></span>
          Sospechoso
        </span>
        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full ring-1 ring-rose-200 bg-rose-50">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: colorMapFill.red, border: `2px solid ${colorMapStroke.red}` }}></span>
          Alterado
        </span>
      </div>
    </div>
  );
}

// Mensaje por defecto si no hay motivo específico en el briefing
export default function Online_Detalle() {
  const [errorMsg, setErrorMsg] = useState("");
  const [showError, setShowError] = useState(false);
  const { now: nowDrifted } = useServerTime({ onError: (msg) => { setErrorMsg(msg); setShowError(true); } });
  const { id, attemptId: attemptParam } = useParams(); // id de escenario y (opcional) attemptId por ruta /resumen/:attemptId
  const scenarioIdParam = String(id ?? "");
  const scenarioIdNumeric = /^\d+$/.test(scenarioIdParam) ? Number(scenarioIdParam) : null;
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const initialAttemptId = query.get("attempt") || attemptParam || null;
  const forceSummaryRoute = location.pathname.includes("/resumen/");

  // Debug: trace route and mode
  try {
    console.debug("[Detalle] route=", location.pathname, "attempt=", initialAttemptId, "forceSummaryRoute=", forceSummaryRoute);
  } catch {}

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setErr] = useState("");
  const [showSkeleton, setShowSkeleton] = useState(false);

  // Escenario + pasos + preguntas
  const [scenario, setScenario] = useState(null);
  const [brief, setBrief] = useState(null);
  const [resources, setResources] = useState([]);
  const [, setLoadingResources] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [steps, setSteps] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [rol, setRol] = useState("");

  // answers: { [questionId]: { selectedKey, isCorrect } }
  const [answers, setAnswers] = useState({});
  const [hintsUsed, setHintsUsed] = useState({}); // { [questionId]: number }
  const [revealedHints, setRevealedHints] = useState({}); // { [questionId]: string[] }
  const [qTimers, setQTimers] = useState({}); // { [qid]: { start: number, remaining: number, expired: boolean } }
  const [, setQTick] = useState(0);
  function requestHint(q) {
    const t = Date.now();
    if (!Number.isFinite(t)) return;
    if (!requestHint.last) requestHint.last = 0;
    if (t - requestHint.last < 600) return; // antirrebote 600ms
    requestHint.last = t;
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

  // Briefing interactivo (accordion + quizzes)
  const [accordionOpen, setAccordionOpen] = useState([true, false, false, false, false]);
  const [tepAnswer, setTepAnswer] = useState({ appearance: null, breathing: null, circulation: null });
  const [tepChecked, setTepChecked] = useState(false);
  const tepOptions = [
    { k: "green", label: "Normal" },
    { k: "amber", label: "Sospechoso" },
    { k: "red", label: "Anormal" },
  ];
  function normBrief(v) {
    const k = String(v || '').toLowerCase();
    if (["verde", "green", "normal"].includes(k)) return "green";
    if (["amarillo", "ámbar", "ambar", "amber", "sospechoso"].includes(k)) return "amber";
    if (["rojo", "red", "anormal", "alterado"].includes(k)) return "red";
    return null;
  }
  const correctTep = useMemo(() => ({
    appearance: normBrief(brief?.triangle?.appearance),
    breathing:  normBrief(brief?.triangle?.breathing),
    circulation: normBrief(brief?.triangle?.circulation),
  }), [brief]);
  const tepComplete = !!(tepAnswer.appearance && tepAnswer.breathing && tepAnswer.circulation);

  // Signos de alarma (multi-selección)
  const [selectedRedFlags, setSelectedRedFlags] = useState([]);
  const redFlagBase = useMemo(() => (Array.isArray(brief?.red_flags) ? brief.red_flags : []), [brief]);
  const redFlagCandidates = useMemo(() => {
    const distractors = [
      "Fiebre aislada sin repercusión",
      "Erupción leve autolimitada",
      "Dolor leve bien localizado",
    ];
    const set = new Set([...(redFlagBase || []), ...distractors]);
    return Array.from(set);
  }, [redFlagBase]);
  const redFlagsCorrect = useMemo(() => {
    const base = new Set(redFlagBase || []);
    if (!base.size) return null;
    const sel = new Set(selectedRedFlags);
    if (sel.size !== Array.from(sel).filter((v) => base.has(v)).length) return false; // hay seleccionados que no son correctos
    return redFlagBase.every((r) => sel.has(r));
  }, [selectedRedFlags, redFlagBase]);

  // Intento actual
  const [attemptId, setAttemptId] = useState(null);
  const [attemptTimeLimit, setAttemptTimeLimit] = useState(null); // segundos (global del intento)
  const [initialExpiresAt, setInitialExpiresAt] = useState(null); // lo que venga de DB (si ya estaba arrancado)
  const [expiresAt, setExpiresAt] = useState(null);               // ISO string (empieza al salir del briefing)
  const [remainingSecs, setRemainingSecs] = useState(null);       // number in seconds
  const [timeUp, setTimeUp] = useState(false);

  // Arranca el contador del intento (y fija expires_at si no estaba)
  const startAttemptCountdown = useCallback(async () => {
    if (!attemptId) {
      return; // no ocultes el briefing por falta temporal de attemptId
    }

    try {
      let expISO = initialExpiresAt;

      // Si el intento aún no tenía expires_at en DB, lo fijamos ahora usando time_limit
      if (!expISO && attemptTimeLimit && Number(attemptTimeLimit) > 0) {
        const now = new Date();
        const exp = new Date(now.getTime() + Number(attemptTimeLimit) * 1000);
        expISO = exp.toISOString();

        // Persistimos inicio/expiración/status
        const { error: upErr } = await supabase
          .from("attempts")
          .update({
            started_at: now.toISOString(),
            expires_at: expISO,
            status: "en curso",
          })
          .eq("id", attemptId);

        if (upErr) {
          console.warn("[SimulacionDetalle] No se pudo fijar expires_at al iniciar:", upErr);
        }
      }

      // Si ya existía expires_at (p.ej. porque el usuario ya había comenzado antes), usamos ese valor
      if (expISO) {
        setExpiresAt(expISO);
        const diff = Math.max(0, Math.floor((new Date(expISO).getTime() - nowDrifted()) / 1000));
        setRemainingSecs(diff);
        setTimeUp(diff === 0);
      } else {
        // Intento sin límite global -> sin contador
        setExpiresAt(null);
        setRemainingSecs(null);
        setTimeUp(false);
      }
    } catch (e) {
      console.error("[SimulacionDetalle] startAttemptCountdown error:", e);
    } finally {
      // no cerramos el briefing automáticamente; el usuario continúa con el botón
    }
  }, [attemptId, attemptTimeLimit, initialExpiresAt, nowDrifted]);

  // Auto-iniciar el contador si no hay briefing (una vez que tenemos el intento)
  useEffect(() => {
    if (loading) return;
    if (showSummary) return;            // si estamos en resumen, no arrancar
    if (showBriefing) return;           // mientras se muestra briefing, no arrancar
    if (!attemptId) return;
    if (expiresAt) return;              // ya arrancado
    if (initialExpiresAt || (attemptTimeLimit && Number(attemptTimeLimit) > 0)) {
      startAttemptCountdown();
    }
  }, [loading, showSummary, showBriefing, attemptId, initialExpiresAt, attemptTimeLimit, expiresAt, startAttemptCountdown]);

  // ⏱️ Nuevo: si el briefing está visible, cuenta como parte de la simulación.
  // Arrancamos el contador al entrar al briefing si hay límite y aún no existe expires_at.
  useEffect(() => {
    if (loading) return;
    if (showSummary) return;
    if (!showBriefing) return;         // solo cuando se muestra el briefing
    if (!attemptId) return;
    if (expiresAt) return;             // ya había contador arrancado en memoria

    const hasServerExpiry = !!initialExpiresAt;
    const hasTimeLimit = Number(attemptTimeLimit) > 0;
    if (!hasServerExpiry && !hasTimeLimit) return;

    startAttemptCountdown();
    if (!hasServerExpiry && hasTimeLimit) {
      setRemainingSecs((prev) => (prev == null ? Number(attemptTimeLimit) : prev));
    }
  }, [loading, showSummary, showBriefing, attemptId, attemptTimeLimit, expiresAt, initialExpiresAt, startAttemptCountdown]);

  const currentStep = steps[currentIdx] || null;

  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }, [currentIdx]);

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

  const finishAttempt = useCallback(async (statusOverride) => {
    if (!attemptId) return;
  
    const correctCount = Object.values(answers).filter((a) => a?.isCorrect).length;
    const total = totalQuestions || 0;
    const base = total ? (correctCount / total) * 100 : 0;
    const hintCount = Object.values(hintsUsed).reduce((a, b) => a + (b || 0), 0);
    const penalty = hintCount * HINT_PENALTY_POINTS;
    const score = Math.max(0, Math.round(base - penalty));
  
    try {
      const safeStatus = typeof statusOverride === "string" && statusOverride.trim() ? statusOverride.trim() : "finalizado";
      const { error: updErr } = await supabase
        .from("attempts")
        .update({
          finished_at: new Date().toISOString(),
          correct_count: correctCount,
          total_count: total,
          score,
          status: safeStatus,
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
  }, [answers, attemptId, hintsUsed, totalQuestions]);

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
        .select("id, user_id, scenario_id, status, started_at, finished_at, expires_at, time_limit")
        .eq("id", initialAttemptId)
        .maybeSingle();

      const sameScenario = String(att?.scenario_id ?? "") === scenarioIdParam;
      const shouldRedirectToConfirm =
        !forceSummaryRoute && (attErr || !att || att.user_id !== sess.user.id || !sameScenario);
      if (shouldRedirectToConfirm) {
        console.debug("[Detalle] Redirijo a confirm por validación:", {
          attErr: !!attErr, hasAtt: !!att, sameUser: att?.user_id === sess.user.id, sameScenario, forceSummaryRoute
        });
        navigate(`/simulacion/${id}/confirm`, { replace: true });
        return;
      }
      // --- comprobación de expiración o estado cerrado ---
      // Preferimos hora del servidor para evitar desajustes de reloj del cliente
      let nowServer = null;
      try {
        const { data: nowData } = await supabase.rpc('now_utc');
        nowServer = nowData ? new Date(nowData) : null;
      } catch {}
      const nowRef = nowServer || new Date();
      const expiresAtRef = att.expires_at ? new Date(att.expires_at) : null;
      const isExpiredByTime = !!(expiresAtRef && nowRef >= expiresAtRef);
      const statusStr = String(att.status || '').toLowerCase();
      const isClosedStatus = statusStr === 'finalizado' || !!att.finished_at;

      // Si está expirado por tiempo y aún aparece como abierto, cerrarlo de forma idempotente
      if (isExpiredByTime && !isClosedStatus) {
        try {
          await supabase
            .from("attempts")
            .update({
              status: "finalizado",
              finished_at: new Date().toISOString()
            })
            .eq("id", att.id)
            .is("finished_at", null);
        } catch { /* noop */ }
      }
      // si está expirado o ya cerrado, prepara vista de resumen (sin montar simulación)
      const shouldShowSummary = isExpiredByTime || isClosedStatus;

      setAttemptId(att.id);
      // Guardamos info pero NO arrancamos el contador hasta que el usuario pulse "Comenzar simulación"
      setAttemptTimeLimit(typeof att.time_limit === "number" ? att.time_limit : null);
      if (att.expires_at) {
        const exp = new Date(att.expires_at);
        setInitialExpiresAt(exp.toISOString());
      } else {
        setInitialExpiresAt(null);
      }

      if (shouldShowSummary || forceSummaryRoute) {
        // Activamos resumen, pero NO hacemos return: necesitamos cargar scenario, steps y respuestas
        setShowBriefing(false);
        setTimeUp(true);
        setRemainingSecs(0);
        setShowSummary(true);
      }
      // Aún no seteamos expiresAt/remainingSecs si no hay resumen; se hará al salir del briefing

      // Rol del usuario
      let userRole = "";
      if (sess?.user?.id) {
        const prof = await getProfileCached(supabase, sess.user.id);
        userRole = normalizeRole((prof?.rol) ?? sess.user?.user_metadata?.rol);
      }
      setRol(userRole);

      // Cargar escenario
      const esc = await getScenarioCached(supabase, scenarioIdNumeric ?? scenarioIdParam);
      if (!esc) {
        setErr("Escenario no encontrado");
        setLoading(false);
        return;
      }
      setScenario(esc);
      // Cargar briefing del caso (Pantalla 0)
      try {
        const b = await getCaseBriefCached(supabase, esc.id);
        if (b) {
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

      // Cargar lecturas/bibliografía para el debrief
      try {
        setLoadingResources(true);
        const { data: res, error: rErr } = await supabase
          .from("case_resources")
          .select("id, title, url, source, type, year, free_access, weight")
          .eq("scenario_id", esc.id)
          .order("weight", { ascending: true })
          .order("title", { ascending: true });
        if (!rErr) {
          setResources(res || []);
        } else {
          console.warn("[SimulacionDetalle] case_resources error:", rErr);
          setResources([]);
        }
      } catch (e) {
        console.warn("[SimulacionDetalle] excepción cargando case_resources:", e);
        setResources([]);
      } finally {
        setLoadingResources(false);
      }

      // Cargar pasos + preguntas en UNA sola consulta (evita N+1)
      performance.mark('sim:data:start');
      const { data: stepsFull, error: relErr } = await supabase
        .from("steps")
        .select(`
          id, description, step_order, role_specific, roles, narrative,
          questions:questions (
            id, question_text, options, correct_option, explanation, roles, is_critical, hints, time_limit
          )
        `)
        .eq("scenario_id", esc.id)
        .order("step_order", { ascending: true });

      if (relErr) {
        setErr(relErr.message || "Error cargando pasos/preguntas");
        setLoading(false);
        return;
      }

      const stepsWithQs = (stepsFull || [])
        .filter((s) => isVisibleForRole(s.roles, userRole))
        .map((s) => {
          const qs = (s.questions || [])
            .filter((q) => isVisibleForRole(q.roles, userRole))
            .map((q) => ({
              id: q.id,
              text: q.question_text, // alias local para mantener el resto del componente
              options: q.options,
              correct_option: q.correct_option,
              explanation: q.explanation,
              roles: q.roles,
              is_critical: q.is_critical,
              hints: q.hints,
              time_limit: q.time_limit,
              _options: normalizeOptions(q.options),
            }));
          return { ...s, questions: qs };
        });

      setSteps(stepsWithQs);
      // Si estamos en resumen, cargar respuestas guardadas para pintar la corrección
      if (att?.id && (shouldShowSummary || forceSummaryRoute)) {
        try {
          const { data: savedAns, error: ansErr } = await supabase
            .from("attempt_answers")
            .select("question_id, selected_option, is_correct")
            .eq("attempt_id", att.id);
          if (!ansErr && Array.isArray(savedAns)) {
            const map = {};
            // Construimos un indice de preguntas por id para poder evaluar etiquetas
            const qIndex = new Map(stepsWithQs.flatMap(s => s.questions || []).map(q => [q.id, q]));
            for (const row of savedAns) {
              const q = qIndex.get(row.question_id);
              const idx = typeof row.selected_option === "number" ? row.selected_option : Number(row.selected_option);
              const ok = typeof row.is_correct === "boolean"
                ? row.is_correct
                : (q ? Number(q.correct_option) === Number(idx) : false);
              map[row.question_id] = {
                selectedKey: idx,           // usamos el índice como key para mantener compatibilidad
                selectedIndex: idx,
                isCorrect: !!ok,
              };
            }
            setAnswers(map);
          } else if (ansErr) {
            console.warn("[Detalle] cargar respuestas guardadas error:", ansErr);
          }
        } catch (e) {
          console.warn("[Detalle] excepción cargando respuestas guardadas:", e);
        }
      }
      performance.mark('sim:data:end');
      try {
        performance.measure('sim:data:steps+questions', 'sim:data:start', 'sim:data:end');
        const m = performance.getEntriesByName('sim:data:steps+questions')[0];
        if (m) console.log('[Perf] steps+questions ms =', Math.round(m.duration));
      } catch {}
      setLoading(false);
    }

    init();
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSess) => {
      if (!mounted) return;
      setSession(newSess ?? null);
      // Solo redirigir a inicio si el usuario se desloguea realmente
      if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        navigate("/", { replace: true });
      } else {
        // Evitar redirecciones en TOKEN_REFRESHED o INITIAL_SESSION
        try { console.debug("[Detalle] auth state:", event, !!newSess); } catch {}
      }
    });
    return () => {
      mounted = false;
      try {
        sub?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, [id, navigate, initialAttemptId, forceSummaryRoute, scenarioIdParam, scenarioIdNumeric]);

  // Ticker para countdown (moved to top-level)
  useEffect(() => {
    if (!expiresAt) return;
    if (timeUp) return;

    const expMs = new Date(expiresAt).getTime();
    const idInt = setInterval(() => {
      const remain = Math.max(0, Math.floor((expMs - nowDrifted()) / 1000));
      setRemainingSecs(remain);
      if (remain === 0) {
        setTimeUp(true);
      }
    }, 1000);

    return () => clearInterval(idInt);
  }, [expiresAt, timeUp, nowDrifted]);

  useEffect(() => {
    if (!currentStep || showSummary || !isTimedStep(currentStep)) return;
    const int = setInterval(() => {
      setQTick((t) => t + 1);
      setQTimers((prev) => {
        const next = { ...prev };
        const now = nowDrifted();
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
  }, [currentStep, showSummary, nowDrifted]);

  // Skeleton show delay effect
  useEffect(() => {
    if (!loading) { setShowSkeleton(false); return; }
    const t = setTimeout(() => setShowSkeleton(true), 300); // muestra skeleton si tarda >300ms
    return () => clearTimeout(t);
  }, [loading]);

  // Auto-finalizar cuando se acaba el tiempo (moved to top-level)


  useEffect(() => {
    if (!timeUp || showSummary) return;
    // Si se agota el tiempo, finalizamos como "abandonado" salvo que ya estén todas respondidas (entonces "finalizado")
    const handler = async () => {
      await finishAttempt(allAnswered ? "finalizado" : "abandonado");
    };
    handler();
  }, [timeUp, showSummary, allAnswered, finishAttempt]);

  // 🔒 Asegurar cierre en BD cuando estamos en resumen (evita reanudar en bucle)
  useEffect(() => {
    if (!showSummary || !attemptId) return;
    (async () => {
      try {
        const { data: attRow, error: attErr } = await supabase
          .from("attempts")
          .select("id, status, finished_at")
          .eq("id", attemptId)
          .maybeSingle();
        if (attErr) {
          console.warn("[Resumen] no se pudo leer attempt para cierre:", attErr);
          return;
        }
        if (attRow && String(attRow.status || "").toLowerCase() === "en curso") {
          // si aún aparece abierto, cerramos con la mejor inferencia posible
          await finishAttempt("finalizado");
        } else if (attRow && !attRow.finished_at) {
          // si no tiene finished_at, actualizamos mínimos para no dejarlo abierto
          const { error: updErr } = await supabase
            .from("attempts")
            .update({ finished_at: new Date().toISOString() })
            .eq("id", attemptId);
          if (updErr) console.warn("[Resumen] fallo ajustando finished_at:", updErr);
        }
      } catch (e) {
        console.warn("[Resumen] excepción al asegurar cierre:", e);
      }
    })();
  }, [showSummary, attemptId, allAnswered, finishAttempt]);

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


  function nextStep() {
    setCurrentIdx((i) => Math.min(i + 1, steps.length - 1));
  }
  function prevStep() {
    setCurrentIdx((i) => Math.max(i - 1, 0));
  }

  if (loading) {
    if (!showSkeleton) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-slate-600">Cargando…</div>
        </div>
      );
    }
    // Skeleton page while se cargan pasos + preguntas
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <ErrorModal message={showError ? errorMsg : ""} onClose={() => setShowError(false)} />
        {loading && (
          <FadeTransition>
      <div className="min-h-screen flex items-center justify-center md:px-10 md:py-24 px-5 py-16" role="main" aria-label="Detalle de simulación">
              <Spinner size={48} />
              <div className="text-slate-600 mt-4">Cargando…</div>
            </div>
          </FadeTransition>
        )}
        <main className="max-w-6xl mx-auto px-5 py-6 mt-2 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar skeleton */}
          <aside className="md:col-span-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Sk w="40%" h={16} className="mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg border border-slate-200">
                    <Sk w="80%" h={12} />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Sk w={80} h={32} />
                <Sk w={80} h={32} />
              </div>
            </div>
          </aside>

          {/* Main skeleton */}
          <section className="md:col-span-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <Sk w="50%" h={20} />
                <Sk w={140} h={14} />
              </div>

              <div className="mt-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <Sk w="70%" h={16} className="mb-3" />
                    <div className="space-y-2">
                      {[...Array(4)].map((__, j) => (
                        <div key={j} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100">
                          <Sk w={16} h={16} className="rounded-full" />
                          <Sk w="60%" h={12} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <Sk w={120} h={40} />
                <Sk w={160} h={40} />
                <Sk w={160} h={40} />
              </div>
            </div>
          </section>
        </main>
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

  // Early render: Briefing Pantalla 0 (interactive accordion version)
  if (!showSummary && showBriefing) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
  <Navbar />
  <ErrorModal message={showError ? errorMsg : ""} onClose={() => setShowError(false)} />
        <main className="max-w-6xl mx-auto px-5 py-6 mt-2">
          {/* HERO */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] p-6 text-white shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{brief?.title || scenario?.title}</h1>
                {brief?.context && <p className="text-white/90 mt-1">{brief.context}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {toArray(brief?.chips).map((c, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-white/20 ring-1 ring-white/50 px-2 py-0.5 text-[11px] tracking-wide">{c}</span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xs opacity-90">Modo · Duración</div>
                <div className="text-sm font-medium">
                  {formatMode(scenario?.mode || "online")} · ~{(scenario?.estimated_minutes ?? brief?.estimated_minutes ?? 10)} min
                </div>
                {/* Cronómetro visible (cuenta durante briefing) */}
                {Number(attemptTimeLimit) > 0 && (
                  <div className="mt-3 flex items-center justify-end">
                    <div className="text-right">
                      <TimeDonut
                        totalSecs={Number(attemptTimeLimit)}
                        remainSecs={remainingSecs != null ? remainingSecs : Number(attemptTimeLimit)}
                        size={64}
                        title="Tiempo restante"
                      />
                      <div className="mt-1 text-[11px] opacity-90">Tiempo restante</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACCORDION: 1. Datos del paciente */}
          <AccordionSection
            title="1) Datos del paciente"
            subtitle="Lee con atención los datos clínicos iniciales."
            open={accordionOpen[0]}
            onToggle={() => setAccordionOpen((a) => a.map((v, i) => (i === 0 ? !v : v)))}
          >
            {/* Si demographics es texto plano */}
            {typeof brief?.demographics === "string" && brief.demographics && (
              <p className="text-sm text-slate-800 mb-3">{brief.demographics}</p>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                {brief?.demographics && typeof brief.demographics === "object" && (
                  <>
                    {brief.demographics.age && <Row label="Edad" value={brief.demographics.age} />}
                    {brief.demographics.weightKg != null && (
                      <Row label="Peso" value={`${brief.demographics.weightKg} kg`} />
                    )}
                    {brief.demographics.sex && <Row label="Sexo" value={brief.demographics.sex} />}
                  </>
                )}
                {brief?.chief_complaint && (
                  <Row label="Motivo de consulta" value={brief.chief_complaint} />
                )}
              </div>
              <div>
                {brief?.history ? (
                  typeof brief.history === 'object' && !Array.isArray(brief.history) ? (
                    <ul className="list-disc pl-5 text-sm text-slate-700">
                      {Object.entries(brief.history).map(([key, val]) => (
                        <li key={key}>
                          <span className="font-medium">{labelizeKey(key)}: </span>
                          {joinItems(val)}
                        </li>
                      ))}
                    </ul>
                  ) : Array.isArray(brief.history) ? (
                    <ul className="list-disc pl-5 text-sm text-slate-700">
                      {brief.history.map((item, i) => (<li key={i}>{String(item)}</li>))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-700">{String(brief.history)}</p>
                  )
                ) : (
                  <p className="text-slate-500 text-sm">—</p>
                )}
              </div>
            </div>
          </AccordionSection>

          {/* ACCORDION: 2. Constantes y exploración (lectura rápida) */}
          <AccordionSection
            title="2) Constantes y exploración"
            subtitle="Repasa constantes y hallazgos al examen físico."
            open={accordionOpen[1]}
            onToggle={() => setAccordionOpen((a) => a.map((v, i) => (i === 1 ? !v : v)))}
          >
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
                  {toArray(brief?.exam).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {!brief?.exam?.length && <li className="text-slate-500">—</li>}
                </ul>
              </div>
            </div>
          </AccordionSection>

          {/* ACCORDION: 3. Pruebas complementarias (señala indicadas) */}
          <AccordionSection
            title="3) Pruebas complementarias"
            subtitle="Identifica qué está indicado ahora mismo."
            open={accordionOpen[2]}
            onToggle={() => setAccordionOpen((a) => a.map((v, i) => (i === 2 ? !v : v)))}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">Analítica rápida</h4>
                <ul className="text-sm text-slate-700">
                  {toArray(brief?.quick_labs).map((q, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 border-b py-1">
                      <span>{q.name}</span>
                      <span className="font-medium">{q.value ?? "—"}</span>
                    </li>
                  ))}
                  {!brief?.quick_labs?.length && <li className="text-slate-500">—</li>}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-600 mb-2">Imagen</h4>
                <ul className="text-sm text-slate-700">
                  {toArray(brief?.imaging).map((im, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 border-b py-1">
                      <span>{im.name}</span>
                      <span className="font-medium">{im.status === "ordered" ? "Solicitada" : "Disponible"}</span>
                    </li>
                  ))}
                  {!brief?.imaging?.length && <li className="text-slate-500">—</li>}
                </ul>
              </div>
            </div>
          </AccordionSection>

          {/* ACCORDION: 4. Triángulo de evaluación pediátrica (interactivo) */}
          <AccordionSection
            title="4) Triángulo de evaluación pediátrica (TEP)"
            subtitle="Marca tu impresión inicial; esta fase ya cuenta tiempo."
            open={accordionOpen[3]}
            onToggle={() => setAccordionOpen((a) => a.map((v, i) => (i === 3 ? !v : v)))}
          >
            <div className="grid lg:grid-cols-2 gap-4 items-start">
              <div>
                <TEPTriangle
                  appearance={tepAnswer.appearance}
                  breathing={tepAnswer.breathing}
                  circulation={tepAnswer.circulation}
                  onToggle={(k) => {
                    setTepAnswer((t) => {
                      const current = t[k];
                      const next = current === null ? 'green' : current === 'green' ? 'amber' : current === 'amber' ? 'red' : null;
                      return { ...t, [k]: next };
                    });
                    setTepChecked(false);
                  }}
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <div className="font-semibold text-slate-700 mb-2">Selecciona tu valoración</div>
                <div className="text-xs text-slate-500 mb-2">
                  El triángulo se muestra en gris hasta que elijas una opción. Marca cada vértice (Apariencia, Respiración, Circulación) y luego pulsa <strong>Comprobar</strong>.
                </div>
                <div className="mb-3 flex items-center gap-2">
                  {tepAnswer.appearance && tepAnswer.breathing && tepAnswer.circulation ? (
                    <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700">TEP completo ✅</span>
                  ) : (
                    <span className="text-xs text-slate-500">Pulsa en cada vértice o usa los botones.</span>
                  )}
                  <button
                    type="button"
                    className="ml-auto text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                    onClick={() => { setTepAnswer({ appearance: null, breathing: null, circulation: null }); setTepChecked(false); }}
                  >
                    Reset TEP
                  </button>
                </div>
                {(["appearance", "breathing", "circulation"]).map((k) => (
                  <div key={k} className="mb-3">
                    <div className="text-xs text-slate-500 mb-1">
                      {k === "appearance" ? "Apariencia" : k === "breathing" ? "Respiración / Trabajo resp." : "Circulación cutánea"}
                    </div>
                    <div>
                      {tepOptions.map((op) => (
                        <ChipButton key={op.k} active={tepAnswer[k] === op.k} onClick={() => { setTepAnswer((t) => ({ ...t, [k]: op.k })); setTepChecked(false); }}>
                          {op.label}
                        </ChipButton>
                      ))}
                    </div>
                    {tepChecked && tepAnswer[k] && (
                      <div className={`inline-flex items-center text-xs px-2 py-0.5 rounded border mt-2 ${
                        tepAnswer[k] === correctTep[k]
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-800"
                      }`}>
                        {tepAnswer[k] === correctTep[k] ? "Correcto" : "Incorrecto"}
                      </div>
                    )}
                  </div>
                ))}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setTepChecked(true)}
                    disabled={!tepComplete}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40"
                  >
                    Comprobar
                  </button>
                  {tepChecked && (
                    <span className="text-xs text-slate-600">
                      {tepAnswer.appearance === correctTep.appearance && tepAnswer.breathing === correctTep.breathing && tepAnswer.circulation === correctTep.circulation
                        ? "Todas correctas"
                        : "Revisa los apartados en rojo"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* ACCORDION: 5. Signos de alarma (elige los preocupantes) */}
          <AccordionSection
            title="5) Signos de alarma"
            subtitle="Selecciona los signos que realmente sugieren gravedad."
            open={accordionOpen[4]}
            onToggle={() => setAccordionOpen((a) => a.map((v, i) => (i === 4 ? !v : v)))}
          >
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700">
              {redFlagCandidates.map((rf) => {
                const checked = selectedRedFlags.includes(rf);
                return (
                  <label key={rf} className={`rounded-lg border px-3 py-2 flex items-center gap-2 cursor-pointer ${checked ? "border-[#1E6ACB] bg-[#4FA3E3]/10" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input
                      type="checkbox"
                      className="accent-[#1E6ACB]"
                      checked={checked}
                      onChange={(e) => setSelectedRedFlags((prev) => (
                        e.target.checked ? [...prev, rf] : prev.filter((x) => x !== rf)
                      ))}
                    />
                    <span>{rf}</span>
                  </label>
                );
              })}
            </ul>
            {redFlagsCorrect !== null && (
              <div className={`mt-3 inline-flex items-center text-xs px-2 py-0.5 rounded border ${
                redFlagsCorrect ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
              }`}>
                {redFlagsCorrect ? "Selección correcta" : "Hay elementos incorrectos o faltan signos clave"}
              </div>
            )}
          </AccordionSection>

          {/* BARRA inferior de acción */}
          <div className="sticky bottom-4 flex items-center justify-between rounded-2xl border border-slate-300 bg-white/90 backdrop-blur p-4 shadow-lg">
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{scenario?.title}</span>
              <span className="mx-2">·</span>
              <span>~{(scenario?.estimated_minutes ?? brief?.estimated_minutes ?? 10)} min</span>
            </div>
            <button
              onClick={() => {
                setShowBriefing(false);
                try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
              }}
              disabled={showSummary || !tepComplete}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:opacity-90 disabled:opacity-50"
              title={!tepComplete ? "Completa el TEP para continuar" : (showSummary ? "El intento ya está finalizado o expirado" : "Continuar a preguntas")}
            >
              Continuar
            </button>
            <p className="ml-3 text-xs text-slate-500">
              ⏱️ El tiempo corre durante el briefing interactivo.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
  <Navbar />
  <ErrorModal message={showError ? errorMsg : ""} onClose={() => setShowError(false)} />

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

            {/* Acciones críticas del caso (debrief) */}
            {brief?.critical_actions?.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4">
                <div className="font-semibold mb-2">Acciones críticas del caso</div>
                <ul className="grid sm:grid-cols-2 gap-2 text-sm text-amber-900">
                  {brief.critical_actions.map((txt, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                    >
                      ⚠️ {txt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
                      {failed.map(q => (
                        <li key={q.id}>{q.text}</li>
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
                className="px-4 py-2 rounded-lg text-slate-900 font-semibold transition hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6ACB]"
                style={{ background: '#4FA3E3' }}
              >
                Volver al panel
              </button>
            </div>

            {/* Lecturas recomendadas (debrief, al final) */}
            {resources.length > 0 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                <div className="font-semibold mb-2">Lecturas recomendadas</div>
                <ul className="divide-y">
                  {resources.map((r) => (
                    <li key={r.id} className="py-2 flex items-start justify-between gap-3">
                      <div>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0A3D91] hover:underline font-medium"
                        >
                          {r.title}
                        </a>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {r.source ? `${r.source} · ` : ""}
                          {r.type ? `${r.type}` : ""}
                          {r.year ? ` · ${r.year}` : ""}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {r.free_access ? (
                          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800">
                            Acceso libre
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">
                            Puede requerir acceso
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* Header del escenario (fijo bajo el Navbar) */}
          <header className="sticky top-[72px] z-30">
            <div className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]">
              <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3 text-white">
                {/* Chips */}
                <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
            {formatMode(scenario?.mode)}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
            {formatLevel(scenario?.level)}
          </span>
          {scenario?.estimated_minutes && (
            <span className="text-xs px-2 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
              ~{scenario.estimated_minutes} min
            </span>
          )}
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
                {remainingSecs !== null && Number(attemptTimeLimit) > 0 && (
                  <div className="shrink-0" title="Tiempo restante">
                    <TimeDonut
                      totalSecs={Number(attemptTimeLimit)}
                      remainSecs={remainingSecs}
                      size={48}
                      title="Tiempo restante"
                    />
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-5 py-6 mt-2 grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar de bloques */}
            <aside className="md:col-span-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Bloques</h2>
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
                                ? "border-[#1E6ACB] bg-[#4FA3E3]/10"
                                : "border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                          <div className="text-sm font-medium">{s.description || `Bloque ${idx + 1}`}</div>
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
                    {currentStep?.description || "Bloque"}
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
                    <div className="text-xs font-semibold text-slate-500 mb-1">Historia del caso</div>
                    <p className="text-sm text-slate-800 whitespace-pre-line">{currentStep.narrative}</p>
                  </div>
                )}

                {/* Preguntas */}
                <div className="mt-4 space-y-6">
                  {(currentStep?.questions || []).map((q) => {
                    const opts = Array.isArray(q._options) ? q._options : [];
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
                                    ? "border-[#1E6ACB] bg-[#4FA3E3]/10"
                                    : "border-transparent hover:bg-slate-50"
                                }
                                ${answers[q.id]?.selectedKey != null ? " opacity-70 cursor-not-allowed" : ""}
                              `}
                              >
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  className="accent-[#1E6ACB]"
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
                      className="px-4 py-2 rounded-lg text-slate-900 font-semibold disabled:opacity-40 transition hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6ACB]"
                      style={{ background: currentIdx >= steps.length - 1 ? '#1E6ACB' : '#4FA3E3' }}
                    >
                      {currentIdx >= steps.length - 1 ? "Fin" : "Siguiente bloque"}
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
                <AttemptsList scenarioId={scenario?.id} userId={session?.user?.id} />
              </section>
            </section>
          </main>
        </>
      )}
    </div>
  );
}

function AttemptsList({ scenarioId, userId }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!scenarioId || !userId) { setRows([]); return; }
        // Nota: seleccionamos sólo columnas seguras (sin 'rol' si la columna no existe)
        const { data, error } = await supabase
          .from("attempts")
          .select("id, started_at, finished_at, correct_count, total_count, score")
          .eq("scenario_id", scenarioId)
          .eq("user_id", userId)
          .order("started_at", { ascending: false });
        if (!mounted) return;
        if (error) {
          console.warn('[AttemptsList] error:', error);
          setRows([]);
        } else {
          setRows(data || []);
        }
      } catch (e) {
        console.warn('[AttemptsList] exception:', e);
        if (mounted) setRows([]);
      }
    })();
    return () => { mounted = false; };
  }, [scenarioId, userId]);

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
            const roleLabel = ""; // no se muestra si la columna no existe
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
