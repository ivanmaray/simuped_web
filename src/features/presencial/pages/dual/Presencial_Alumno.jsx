import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../../../supabaseClient';
import { reportError, reportWarning } from '../../../../utils/reporting.js';

// Sonido: Web Audio API para alertas
export default function Presencial_Alumno() {
  const { public_code, code: codeParam } = useParams();
  const code = public_code || codeParam;

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clean = searchParams.get('clean') === '1' || searchParams.get('clean') === 'true';
  const [muted, setMuted] = useState(searchParams.get('mute') === '1' || searchParams.get('mute') === 'true');
  const mutedRef = useRef(muted);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const [session, setSession] = useState(null); // {id, scenario_id, ...}
  const [vars, setVars] = useState([]); // [{id,label,unit,type,value}]
  const [stepName, setStepName] = useState('');
  const [bannerText, setBannerText] = useState('');           // ← NUEVO
  const [currentStepId, setCurrentStepId] = useState(null);   // ← NUEVO
  const [, setScenarioTitle] = useState('');
  const [patientOverview, setPatientOverview] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [ended, setEnded] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [connected, setConnected] = useState(false);
  const [alarmVisible, setAlarmVisible] = useState(false);
  const lastAlarmRef = useRef(null);

  const sessionIdValue = session?.id ?? null;
  const sessionScenarioId = session?.scenario_id ?? null;
  const sessionStartAt = session?.started_at ?? null;
  const sessionEndedAt = session?.ended_at ?? null;

  const [flash, setFlash] = useState({}); // { [variableId]: true }
  const [elapsedMs, setElapsedMs] = useState(0);

  const [ventilationState, setVentilationState] = useState(null);

  const categorizedVars = useMemo(() => {
    const result = { vital: [], lab: [], images: [], others: [] };
    for (const v of vars) {
      const meta = typeMeta(v.type);
      const richValue = parseRichValue(v.value);
      const isImage = richValue?.kind === 'image' && richValue.src;
      const isFlash = !!flash[v.id];
      const item = { v, meta, richValue, isImage, isFlash };
      if (isImage) result.images.push(item);
      else if (v.type === 'vital') result.vital.push(item);
      else if (v.type === 'lab') result.lab.push(item);
      else result.others.push(item);
    }
    return result;
  }, [vars, flash]);

  const renderDataCard = ({ v, meta, isFlash }) => (
    <div
      key={v.id}
      className={`relative rounded-2xl border border-slate-200 bg-white/90 shadow-sm p-5 transition-transform duration-200 ${
        isFlash ? `ring-2 ${meta.ring} animate-pulse` : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-slate-500 text-xs flex items-center gap-1">
          <span aria-hidden>{meta.badge}</span>
          <span>{meta.label}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] ring-1 ${meta.chip}`}>{v.label}</span>
      </div>
      <div className="text-3xl md:text-4xl font-mono mt-2">
        {v.value}
        {v.unit ? <span className="ml-1 text-slate-500 text-lg">{v.unit}</span> : null}
      </div>
    </div>
  );

  const mainHeightOffset = clean ? 120 : 190;
  const mainStyle = useMemo(() => ({ height: `calc(100vh - ${mainHeightOffset}px)` }), [mainHeightOffset]);
  const mainImageItem = categorizedVars.images[0] || null;
  const extraImages = categorizedVars.images.slice(1);

  const ventWaveData = useMemo(() => {
    if (!ventilationState?.generated?.waveforms) return null;
    const { pressure = [], volume = [], flow = [] } = ventilationState.generated.waveforms;
    const build = (values, width = 220, height = 90) => {
      if (!Array.isArray(values) || values.length === 0) return null;
      let minVal = values[0];
      let maxVal = values[0];
      for (let i = 1; i < values.length; i += 1) {
        const val = values[i];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      const range = Math.max(0.0001, maxVal - minVal);
      const zeroY = minVal <= 0 && maxVal >= 0
        ? (height - ((0 - minVal) / range) * height)
        : null;
      return {
        path: buildSvgPath(values, width, height),
        min: minVal,
        max: maxVal,
        zeroY,
        height,
        width
      };
    };
    return {
      pressure: build(pressure),
      volume: build(volume),
      flow: build(flow)
    };
  }, [ventilationState]);

  const ventilationCard = useMemo(() => {
    if (!ventilationState) return null;
    const state = ventilationState;
    const status = state.active;
    const pending = status === 'pending';
    const stopped = status === false;
    const showPublishedParams = status === true;
    const active = showPublishedParams;
    const paramsSource = showPublishedParams ? (state.parameters || {}) : {};
    const metrics = showPublishedParams ? (state.generated?.metrics || {}) : {};
    const meta = state.meta && typeof state.meta === 'object' ? state.meta : {};
    const weightKg = typeof meta.weightKg === 'number' && Number.isFinite(meta.weightKg) ? meta.weightKg : null;
    const tidalPerKg = showPublishedParams && typeof meta.tidalPerKg === 'number' && Number.isFinite(meta.tidalPerKg) ? meta.tidalPerKg : null;
    const templateInfo = meta.template && meta.template.name ? meta.template : null;
    const modeLabel = showPublishedParams ? (state.mode || null) : (state.mode || state.draft?.mode || null);
    const recommendedBase = meta.recommendedTidal;
    const recommended = recommendedBase || (weightKg ? {
      minMl: Math.round(weightKg * 6),
      maxMl: Math.round(weightKg * 8),
      minMlPerKg: 6,
      maxMlPerKg: 8
    } : null);
    const recommendedRangeLabel = recommended
      ? `${recommended.minMl}-${recommended.maxMl} mL (${recommended.minMlPerKg}–${recommended.maxMlPerKg} ml/kg)`
      : null;
    const recommendedWithin = recommended && tidalPerKg != null
      ? tidalPerKg >= recommended.minMlPerKg && tidalPerKg <= recommended.maxMlPerKg
      : null;
    const formattedWeight = weightKg != null ? (Number.isInteger(weightKg) ? weightKg : weightKg.toFixed(1)) : null;
    const tidalPerKgLabel = tidalPerKg != null ? tidalPerKg.toFixed(2) : null;
    const updatedLabel = (() => {
      if (!state.timestamp) return null;
      const dt = new Date(state.timestamp);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    })();
    const buildValue = (value, formatter) => {
      if (!showPublishedParams) return '—';
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      return formatter(value);
    };
    const paramItems = [
      { label: 'Volumen tidal', value: buildValue(paramsSource.tidalVolume, (v) => `${Math.round(v)} mL`) },
      ...(showPublishedParams && tidalPerKgLabel ? [{ label: 'Volumen/kg', value: `${tidalPerKgLabel} ml/kg` }] : []),
      { label: 'Frecuencia', value: buildValue(paramsSource.rate, (v) => `${Math.round(v)} rpm`) },
      { label: 'PEEP', value: buildValue(paramsSource.peep, (v) => `${v.toFixed(1)} cmH₂O`) },
      { label: 'FiO₂', value: buildValue(paramsSource.fio2, (v) => `${Math.round(v * 100)}%`) },
      { label: 'Tiempo insp.', value: buildValue(paramsSource.inspiratoryTime, (v) => `${v.toFixed(1)} s`) }
    ];
    if (showPublishedParams && modeLabel === 'PC') {
      paramItems.push({ label: 'Presión control', value: buildValue(paramsSource.pressureControl, (v) => `${v.toFixed(1)} cmH₂O`) });
    }
    if (showPublishedParams && modeLabel === 'PSV') {
      paramItems.push({ label: 'Presión soporte', value: buildValue(paramsSource.pressureSupport, (v) => `${v.toFixed(1)} cmH₂O`) });
    }
    const formattedMetrics = [
      { key: 'plateauPressure', label: 'Presión plateau', unit: 'cmH₂O', decimals: 1 },
      { key: 'peakPressure', label: 'Presión pico', unit: 'cmH₂O', decimals: 1 },
      { key: 'drivingPressure', label: 'Presión de conducción', unit: 'cmH₂O', decimals: 1 },
      { key: 'etco2', label: 'EtCO₂ estimado', unit: 'mmHg', decimals: 1 },
      { key: 'spo2', label: 'SpO₂ estimada', unit: '%', decimals: 1 }
    ]
      .map(item => {
        const value = metrics[item.key];
        if (typeof value !== 'number' || !Number.isFinite(value)) return null;
        return {
          label: item.label,
          text: `${value.toFixed(item.decimals)} ${item.unit}`
        };
      })
      .filter(Boolean);
    const waveEntries = !ventWaveData ? [] : [
      { key: 'pressure', label: 'Presión', unit: 'cmH₂O', color: '#1E6ACB', data: ventWaveData.pressure, digits: 1 },
      { key: 'volume', label: 'Volumen', unit: 'L', color: '#0F766E', data: ventWaveData.volume, digits: 2 },
      { key: 'flow', label: 'Flujo', unit: 'L/s', color: '#EA580C', data: ventWaveData.flow, digits: 2 }
    ].filter(entry => entry.data && entry.data.path);
    const formatRange = (value, digits = 1) => (
      typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : null
    );
    const showDetails = showPublishedParams && waveEntries.length > 0;
    const badgeClass = pending
      ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
      : showPublishedParams
        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
        : 'bg-slate-200 text-slate-600 ring-1 ring-slate-300';
    const badgeLabel = pending ? '◌ Pendiente' : showPublishedParams ? '● Activa' : stopped ? '◦ Detenida' : '◦ Inactiva';

    return (
      <div className="flex max-h-[80vh] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-700">Ventilación mecánica</h4>
            <p className="text-xs text-slate-500">
              {pending
                ? 'El instructor está preparando los parámetros.'
                : active
                  ? 'Parámetros enviados por el instructor.'
                  : 'El ventilador está en pausa.'}
              {updatedLabel ? ` · Actualizado ${updatedLabel}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {formattedWeight ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                ⚖️ {formattedWeight} kg
              </span>
            ) : null}
            {templateInfo ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                ⚙️ {templateInfo.name}
              </span>
            ) : null}
            {modeLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Modo {modeLabel}
              </span>
            ) : null}
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
              {badgeLabel}
            </span>
          </div>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {pending ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            <p>Parámetros pendientes de configurar.</p>
            {templateInfo ? (
              <span className="mt-1 block text-xs text-slate-500">Plantilla seleccionada: {templateInfo.name}</span>
            ) : null}
            {recommendedRangeLabel ? (
              <span className="mt-2 block text-xs text-slate-500">
                Referencia 6–8 ml/kg: {recommendedRangeLabel}
              </span>
            ) : null}
            {paramItems.length > 0 && (
              <div className="mt-2 grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4 text-[11px]">
                {paramItems.map(item => (
                  <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
                    <div className="mt-0.5 text-[12px] font-semibold text-slate-700">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
            {updatedLabel ? (
              <span className="mt-3 block text-xs text-slate-500">Última interacción {updatedLabel}</span>
            ) : null}
          </div>
        ) : showDetails ? (
          <>
            {recommendedRangeLabel ? (
              <div
                className={`mt-4 rounded-xl border px-3 py-2 text-xs font-medium ${
                  recommendedWithin === false
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                <div className="uppercase tracking-wide text-[11px] font-semibold">Guía por peso</div>
                <div className="mt-0.5">Rango recomendado: {recommendedRangeLabel}</div>
                {tidalPerKgLabel ? (
                  <div className="mt-0.5">Actual: {tidalPerKgLabel} ml/kg</div>
                ) : null}
                {templateInfo ? (
                  <div className="mt-0.5 text-[11px] text-slate-500">Plantilla aplicada: {templateInfo.name}</div>
                ) : null}
              </div>
            ) : null}
            {paramItems.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-[12px] sm:grid-cols-3 lg:grid-cols-4">
                {paramItems.map(item => (
                  <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
                    <div className="mt-0.5 text-[12px] font-semibold text-slate-800">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
            {formattedMetrics.length > 0 && (
              <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <h5 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Indicadores simulados</h5>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[12px] sm:grid-cols-3">
                  {formattedMetrics.map(item => (
                    <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                      <div className="text-[10px] text-slate-500">{item.label}</div>
                      <div className="mt-0.5 text-[12px] font-semibold text-slate-900">{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {waveEntries.length > 0 && (
              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {waveEntries.map(entry => (
                  <div key={entry.key} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold uppercase tracking-wide">{entry.label}</span>
                      {typeof entry.data.min === 'number' && typeof entry.data.max === 'number' ? (
                        <span className="font-mono text-[10px]">
                          {formatRange(entry.data.min, entry.digits)} – {formatRange(entry.data.max, entry.digits)} {entry.unit}
                        </span>
                      ) : null}
                    </div>
                    <svg
                      viewBox={`0 0 ${entry.data.width} ${entry.data.height}`}
                      className="mt-1 h-14 w-full text-slate-300"
                      preserveAspectRatio="none"
                      role="presentation"
                    >
                      <rect x="0" y="0" width={entry.data.width} height={entry.data.height} fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="6 6" />
                      {typeof entry.data.zeroY === 'number' && entry.data.zeroY >= 0 && entry.data.zeroY <= entry.data.height ? (
                        <line x1="0" x2={entry.data.width} y1={entry.data.zeroY} y2={entry.data.zeroY} stroke="#cbd5f5" strokeWidth="1" strokeDasharray="4 4" />
                      ) : null}
                      <path d={entry.data.path} fill="none" stroke={entry.color} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : stopped ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            Ventilación detenida por el instructor.
            {recommendedRangeLabel ? (
              <span className="mt-2 block text-xs text-slate-500">
                Referencia 6–8 ml/kg: {recommendedRangeLabel}
              </span>
            ) : null}
            {updatedLabel ? (
              <span className="mt-1 block text-xs text-slate-500">Última actualización {updatedLabel}</span>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
            No hay datos de ventilación disponibles todavía.
            {recommendedRangeLabel ? (
              <span className="mt-2 block text-xs text-slate-500">
                Referencia 6–8 ml/kg: {recommendedRangeLabel}
              </span>
            ) : null}
          </div>
        )}
        </div>
      </div>
    );
  }, [ventilationState, ventWaveData]);

function typeMeta(t) {
  switch (t) {
    case 'vital':  return { label: 'Constante', badge: '⚡', ring: 'ring-sky-300',    chip: 'bg-sky-50 text-sky-700 ring-sky-200' };
    case 'lab':    return { label: 'Analítica', badge: '🧪', ring: 'ring-emerald-300',chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
    case 'imagen': return { label: 'Imagen',    badge: '🖼️', ring: 'ring-violet-300', chip: 'bg-violet-50 text-violet-700 ring-violet-200' };
    case 'texto':  return { label: 'Nota',      badge: '📝', ring: 'ring-amber-300',  chip: 'bg-amber-50 text-amber-700 ring-amber-200' };
    default:       return { label: 'Dato',      badge: '•',  ring: 'ring-slate-300',  chip: 'bg-slate-50 text-slate-700 ring-slate-200' };
  }
}

function parseRichValue(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (parsed.kind === 'image' && parsed.src && !parsed.alt) {
        parsed.alt = parsed.label || 'Imagen clínica';
      }
      return parsed;
    }
  } catch {}
  return null;
}

function normalizeVentPayload(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== 'object') return null;
  if (payload.active === 'pending') {
    const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : undefined;
    const draft = payload.draft && typeof payload.draft === 'object' ? payload.draft : undefined;
    const base = {
      active: 'pending',
      timestamp: payload.timestamp || new Date().toISOString(),
      mode: payload.mode || draft?.mode || null,
      draft
    };
    if (meta) base.meta = meta;
    return base;
  }
  if (payload.active === false) {
    const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : undefined;
    const base = { active: false, timestamp: payload.timestamp || new Date().toISOString() };
    if (meta) base.meta = meta;
    return base;
  }
  if (!payload.generated || !payload.generated.waveforms) return null;
  return payload;
}

function buildSvgPath(values = [], width = 260, height = 140) {
  if (!Array.isArray(values) || values.length === 0) return '';
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  let minVal = values[0];
  let maxVal = values[0];
  for (let i = 1; i < values.length; i += 1) {
    const val = values[i];
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }
  const range = Math.max(0.0001, maxVal - minVal);
  const denom = Math.max(values.length - 1, 1);
  return values
    .map((val, idx) => {
      const x = (idx / denom) * w;
      const normalized = (val - minVal) / range;
      const y = h - normalized * h;
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

  // Ficha paciente → chips + bullets + párrafos
  function parsePatientOverview(pov) {
    if (!pov || typeof pov !== 'string') return { chips: [], bullets: [], paragraphs: [] };
    let chips = [], bullets = [], rest = pov.trim();

    // Demografía JSON al inicio
    try {
      const m = rest.match(/^\s*\{[\s\S]*?\}\s*(?:\n+|$)/);
      if (m && m[0]) {
        const jsonTxt = m[0].trim().replace(/,+\s*$/, '');
        try {
          const demo = JSON.parse(jsonTxt);
          const age = demo.age || demo.edad;
          const sex = demo.sex || demo.sexo;
          const weight = demo.weightKg || demo.weight_kg || demo.peso;
          if (age)    chips.push({ label: String(age),   key: 'age' });
          if (sex)    chips.push({ label: String(sex),   key: 'sex' });
          if (weight) chips.push({ label: `${weight} kg`, key: 'weight' });
          rest = rest.slice(m[0].length).trim();
        } catch (error) {
          reportWarning('PresencialAlumno.parseDemographics', error);
        }
      }
    } catch (error) {
      reportWarning('PresencialAlumno.parseOverview.demographics', error);
    }

    // Array JSON al inicio
    try {
      const a = rest.match(/^\s*\[[\s\S]*?\]\s*(?:\n+|$)/);
      if (a && a[0]) {
        try {
          const arr = JSON.parse(a[0].trim());
          if (Array.isArray(arr)) {
            bullets = arr.map(x => String(x)).filter(Boolean);
            rest = rest.slice(a[0].length).trim();
          }
        } catch (error) {
          reportWarning('PresencialAlumno.parseOverview.bulletArray', error);
        }
      }
    } catch (error) {
      reportWarning('PresencialAlumno.parseOverview', error);
    }

    rest = rest
      .replace(/^\[\s*"?|"?\s*\]$/g, '')
      .replace(/",\s*"/g, '\n')
      .replace(/^"|"$/g, '')
      .trim();

    const paragraphs = rest ? rest.split(/\n{2,}/).map(s => s.trim()).filter(Boolean) : [];
    return { chips, bullets, paragraphs };
  }

  const varMetaRef = useRef({});
  const varsMapRef = useRef(new Map());
  const audioCtxRef = useRef(null);
  const lastBannerRef = useRef(null);
  const lastActionAtRef = useRef(null);
  const lastFingerprintRef = useRef(null);

  const navigationPanelRef = useRef(null);

  async function loadParticipantsByCode(pcode) {
    if (!pcode) return;
    try {
      const { data: parts, error } = await supabase.rpc('get_session_participants_by_code', { p_code: pcode });
      if (error) throw error;
      const rows = Array.isArray(parts)
        ? parts.map(r => ({ id: r.id, name: r.display_name || 'Participante', role: r.role || null }))
        : [];
      setParticipants(rows);
    } catch (e) {
      console.warn('[Alumno] loadParticipantsByCode error:', e);
      setParticipants([]);
    }
  }

  function playAlert(kind = 'reveal') {
    if (mutedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new AudioCtx();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const beep = (t0, freq = 880, ms = 120, gainPeak = 0.25) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
        osc.connect(g).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + ms / 1000 + 0.03);
      };

      const whoop = (t0, durMs = 900) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        const t1 = t0 + durMs / 1000;
        osc.frequency.setValueAtTime(600, t0);
        osc.frequency.exponentialRampToValueAtTime(1200, t0 + (durMs * 0.7) / 1000);
        osc.frequency.exponentialRampToValueAtTime(700, t1);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t1);
        osc.connect(g).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t1 + 0.05);
      };

      const now = ctx.currentTime;
      if (kind === 'reveal') {
        beep(now, 1000, 120, 0.28);
        beep(now + 0.16, 1200, 120, 0.24);
      } else if (kind === 'hide') {
        beep(now, 440, 100, 0.22);
      } else if (kind === 'banner') {
        whoop(now, 900);
      }
    } catch (e) {
      console.debug('[Alumno] playAlert error (ignorable):', e);
    }
  }

  useEffect(() => {
    let mounted = true;
    let channel;
    const safety = setTimeout(() => { if (mounted) setLoading(false); }, 5000);

    (async () => {
      try {
        if (!code) {
          setErrorMsg('Falta el código público de la sesión.');
          setLoading(false);
          return;
        }
        // 1) Resolver sesión por código con campos que usamos en UI
        const baseRes = await supabase
          .from('presencial_sessions')
          .select('id, scenario_id, started_at, ended_at, banner_text, current_step_id')
          .eq('public_code', code)
          .maybeSingle();
        if (baseRes.error) throw baseRes.error;
        const s = baseRes.data;
        if (!s) {
          setErrorMsg('No se encontró ninguna sesión con ese código.');
          setLoading(false);
          return;
        }
        if (!mounted) return;
        setSession(s);
        // Si el seed trae started_at sin ended_at, limpiar ended por si veníamos de una sesión previa
        if (s?.started_at && !s?.ended_at) {
          setEnded(false);
        }
        // Inicializar fingerprint basada en estado + última acción
        try {
          const { data: lastAct } = await supabase
            .from('session_actions')
            .select('created_at')
            .eq('session_id', s.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          lastActionAtRef.current = lastAct?.created_at || null;
        } catch (error) {
          reportWarning('PresencialAlumno.loadLastAction', error, { sessionId: s.id });
        }
        const fp0 = JSON.stringify({
          b: s?.banner_text || '',
          step: s?.current_step_id || null,
          end: !!s?.ended_at,
          a: lastActionAtRef.current || ''
        });
        lastFingerprintRef.current = fp0;

        // Seed de estado derivado
        setBannerText(s?.banner_text || '');
        setCurrentStepId(s?.current_step_id || null);
        if (s?.current_step_id) {
          try {
            const { data: st } = await supabase
              .from('scenario_steps')
              .select('name')
              .eq('id', s.current_step_id)
              .maybeSingle();
            if (st?.name && mounted) setStepName(st.name);
          } catch (error) {
            reportWarning('PresencialAlumno.loadStepName', error, { stepId: s.current_step_id });
          }
        }
        setEnded(!!s?.ended_at);
        if (!s?.started_at) setElapsedMs(0);
        lastBannerRef.current = s?.banner_text ?? null;

        loadParticipantsByCode(code);

        // Metadatos de variables
        if (s.scenario_id) {
          try {
            const { data: allVars } = await supabase
              .from('scenario_variables')
              .select('id, label, unit, type')
              .eq('scenario_id', s.scenario_id);
            if (Array.isArray(allVars)) {
              const map = {};
              for (const v of allVars) map[v.id] = { label: v.label, unit: v.unit, type: v.type };
              varMetaRef.current = map;
            }
          } catch (error) {
            reportWarning('PresencialAlumno.loadVariablesMeta', error, { scenarioId: s.scenario_id });
          }
        }

        // Título + ficha paciente
        if (s.scenario_id) {
          try {
            const [scRes, povRes] = await Promise.all([
              supabase.from('scenarios').select('title').eq('id', s.scenario_id).maybeSingle(),
              supabase.rpc('get_patient_overview', { p_scenario_id: s.scenario_id })
            ]);
            const sc = scRes?.data;
            const pov = povRes?.data;
            if (sc?.title) setScenarioTitle(sc.title);
            if (typeof pov === 'string' && pov.trim()) setPatientOverview(pov); else setPatientOverview('');
          } catch (error) {
            reportWarning('PresencialAlumno.loadScenarioMeta', error, { scenarioId: s.scenario_id });
          }
        }

        // Variables reveladas
        const { data: sv, error: svErr } = await supabase
          .from('session_variables')
          .select('variable_id, value')
          .eq('session_id', s.id)
          .eq('is_revealed', true);
        if (svErr) throw svErr;
        const cards1 = await mergeVarsWithMeta(s.scenario_id, sv || []);
        setVars(cards1);
        varsMapRef.current = new Map((cards1 || []).map(c => [c.id, c]));

        // 2c) Cargar último banner publicado vía session_events (si existe)
        try {
          const { data: lastBannerEv } = await supabase
            .from('session_events')
            .select('kind, payload, at')
            .eq('session_id', s.id)
            .eq('kind', 'banner')
            .order('at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastBannerEv && lastBannerEv.payload) {
            const p = lastBannerEv.payload;
            const txt = (typeof p === 'object' && p !== null)
              ? (p.text || p.message || p.banner || '')
              : String(p || '');
            if (txt && mounted) setBannerText(txt);
          }
        } catch (e) {
          console.warn('[Alumno] carga inicial banner via session_events falló:', e);
        }

        // Fallback: último publish en session_actions (por si el instructor usa acciones)
        try {
          const { data: lastAct } = await supabase
            .from('session_actions')
            .select('action_key, payload, created_at')
            .eq('session_id', s.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastAct) {
            const k = (lastAct.action_key || '').toLowerCase();
            if (k.includes('publish') || k.includes('banner') || k.includes('step')) {
              const pay = lastAct.payload;
              const txt = (pay && typeof pay === 'object')
                ? (pay.text || pay.message || pay.banner || pay.content || '')
                : (typeof pay === 'string' ? pay : '');
              if (txt) setBannerText(txt);
            }
          }
        } catch (e) {
          console.warn('[Alumno] fallback banner via session_actions failed:', e);
        }

        // Suscripciones realtime: sesión + variables
        channel = supabase
          .channel(`sess:${code}`)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'presencial_sessions', filter: `public_code=eq.${code}` },
            (payload) => {
              const next = payload.new;
              if (!next || !mounted) return;

              // Banner actualizado
              if (Object.prototype.hasOwnProperty.call(next, 'banner_text')) {
                const prevBanner = lastBannerRef.current;
                const newBanner = next.banner_text ?? null;
                if (newBanner && newBanner !== prevBanner) playAlert('banner');
                lastBannerRef.current = newBanner;
                setBannerText(newBanner || '');
              }

              // Alarma
              if (Object.prototype.hasOwnProperty.call(next, 'alarm_ping') && next.alarm_ping && next.alarm_ping !== lastAlarmRef.current) {
                lastAlarmRef.current = next.alarm_ping;
                setAlarmVisible(true);
                playAlert('banner');
                setTimeout(() => setAlarmVisible(false), 4000);
              }

              // Paso actual
              if (Object.prototype.hasOwnProperty.call(next, 'current_step_id')) {
                setCurrentStepId(next.current_step_id || null);
                if (next.current_step_id) {
                  supabase.from('scenario_steps').select('name').eq('id', next.current_step_id).maybeSingle()
                    .then(({ data }) => { if (data?.name && mounted) setStepName(data.name); });
                } else {
                  setStepName('');
                }
              }

              // Inicio/Fin: si cambian, sincroniza estados y cronómetro
              if (Object.prototype.hasOwnProperty.call(next, 'started_at')) {
                if (next.started_at) {
                  // al iniciar, aseguramos que no quede marcado como finalizada
                  setEnded(false);
                } else {
                  // sin inicio => 0
                  setElapsedMs(0);
                }
              }
              if (Object.prototype.hasOwnProperty.call(next, 'ended_at')) {
                const finished = !!next.ended_at;
                setEnded(finished);
                if (!finished && !next.started_at) setElapsedMs(0);
              }

              // Escenario puede cambiar (raro, pero tolerante)
              if (next.scenario_id && next.scenario_id !== session?.scenario_id) {
                Promise.all([
                  supabase.from('scenarios').select('title').eq('id', next.scenario_id).maybeSingle(),
                  supabase.rpc('get_patient_overview', { p_scenario_id: next.scenario_id })
                ]).then(([scRes, povRes]) => {
                  const sc = scRes?.data;
                  const pov = povRes?.data;
                  if (sc?.title) setScenarioTitle(sc.title);
                  if (typeof pov === 'string' && pov.trim()) setPatientOverview(pov); else setPatientOverview('');
                });
              }

              setSession(prev => ({ ...prev, ...next }));
              loadParticipantsByCode(code);
            }
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'session_variables', filter: `session_id=eq.${s.id}` },
            (payload) => {
              if (!mounted) return;
              try {
                const { eventType, new: newRow, old: oldRow } = payload || {};
                const id = (newRow?.variable_id) ?? (oldRow?.variable_id);
                if (!id) return;

                if (eventType === 'DELETE') {
                  // Eliminación directa
                  setFlash(prev => { const n = { ...prev }; delete n[id]; return n; });
                  if (varsMapRef.current.has(id)) {
                    varsMapRef.current.delete(id);
                    setVars(Array.from(varsMapRef.current.values()));
                    playAlert('hide');
                  }
                  return;
                }

                // Para INSERT/UPDATE unificar lógica
                const isRevealed = newRow?.is_revealed === true;
                const prevRevealed = oldRow ? oldRow.is_revealed === true : varsMapRef.current.has(id);

                if (!isRevealed) {
                  if (varsMapRef.current.has(id)) {
                    varsMapRef.current.delete(id);
                    setVars(Array.from(varsMapRef.current.values()));
                    setFlash(prev => { const n = { ...prev }; delete n[id]; return n; });
                    playAlert('hide');
                  }
                  return;
                }

                // Revelado o actualización de valor
                const meta = varMetaRef.current[id] || {};
                const nextItem = { id, label: meta.label, unit: meta.unit, type: meta.type, value: newRow?.value };
                varsMapRef.current.set(id, nextItem);
                setVars(Array.from(varsMapRef.current.values()));
                setFlash(prev => ({ ...prev, [id]: true }));
                setTimeout(() => setFlash(prev => { const n = { ...prev }; delete n[id]; return n; }), 900);

                if (!prevRevealed) playAlert('reveal');
                else if (oldRow && oldRow.value !== newRow.value) playAlert('reveal');
              } catch (e) {
                console.warn('[Alumno] realtime update failed:', e);
              }
            }
          )
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'session_events', filter: `session_id=eq.${s.id}` },
            (payload) => {
              if (!mounted) return;
              try {
                const ev = payload?.new;
                if (!ev) return;
                if (ev.kind === 'banner') {
                  // payload puede ser {text: "..."} o un string directo
                  let txt = '';
                  if (ev.payload && typeof ev.payload === 'object') {
                    txt = ev.payload.text || ev.payload.message || ev.payload.banner || '';
                  } else if (typeof ev.payload === 'string') {
                    txt = ev.payload;
                  }
                  if (txt) {
                    setBannerText(txt);
                    playAlert('banner');
                  }
                }
              } catch (e) {
                console.warn('[Alumno] evento session_events no procesado:', e);
              }
            }
          )
          .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'session_actions', filter: `session_id=eq.${s.id}` },
            (payload) => {
              if (!mounted) return;
              try {
                const row = payload?.new;
                if (!row) return;
                const key = (row.action_key || '').toLowerCase();
                const p = row.payload;

                if (key === 'ventilation.update') {
                  const vent = normalizeVentPayload(p);
                  if (vent) setVentilationState(vent);
                  return;
                }

                if (key.includes('publish') || key.includes('banner') || key.includes('step')) {
                  let txt = '';
                  if (p && typeof p === 'object') {
                    txt = p.text || p.message || p.banner || p.content || '';
                  } else if (typeof p === 'string') {
                    txt = p;
                  }
                  if (txt) {
                    setBannerText(txt);
                    playAlert('banner');
                  }
                }
              } catch (e) {
                console.warn('[Alumno] session_actions INSERT parse failed:', e);
              }
            }
          )
          .subscribe();

        setConnected(true);
      } catch (e) {
        setErrorMsg(e?.message || 'No se pudo cargar la pantalla de alumnos.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(safety);
      if (channel) supabase.removeChannel(channel);
      setConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [public_code, codeParam]);

  // Cronómetro: vive solo de los timestamps del servidor
  useEffect(() => {
    let timerId;
    try {
      const hasStart = !!sessionStartAt;
      const hasEnd   = !!sessionEndedAt || ended;

      if (!hasStart) {
        // sin inicio: siempre 0
        setElapsedMs(0);
        return () => {};
      }

      const startTs = new Date(sessionStartAt).getTime();

      // Si ya terminó, fija el tiempo y no abras intervalos
      if (hasEnd) {
        const endTs = new Date(sessionEndedAt).getTime();
        setElapsedMs(Math.max(0, endTs - startTs));
        return () => {};
      }

      // En curso: interval basado en hora local + timestamps del server
      const tick = () => setElapsedMs(Math.max(0, Date.now() - startTs));
      tick();
      timerId = setInterval(tick, 500);
    } catch (error) {
      reportWarning('PresencialAlumno.timer', error, { sessionId: sessionIdValue });
    }
    return () => { if (timerId) clearInterval(timerId); };
  }, [sessionStartAt, sessionEndedAt, sessionIdValue, ended]);

  // (Opcional) Auto-redirección al informe solo si ?autoinforme=1
  const autoInforme = searchParams.get('autoinforme') === '1' || searchParams.get('autoinforme') === 'true';
  useEffect(() => {
    if (autoInforme && ended && sessionIdValue) {
      const t = setTimeout(() => {
        navigate(`/presencial/${sessionIdValue}/informe`, { replace: true });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [autoInforme, ended, sessionIdValue, navigate]);

  // Helper: recargar estado del alumno sin F5
  const reloadAll = useCallback(async (sessionId, scenarioId) => {
    try {
      const [{ data: sess }, { data: sv } ] = await Promise.all([
        supabase
          .from('presencial_sessions')
          .select('banner_text, current_step_id, started_at, ended_at')
          .eq('id', sessionId)
          .maybeSingle(),
        supabase
          .from('session_variables')
          .select('variable_id, value, is_revealed')
          .eq('session_id', sessionId)
      ]);

      if (sess) {
        if (typeof sess.banner_text !== 'undefined') setBannerText(sess.banner_text || '');
        if (typeof sess.ended_at !== 'undefined' && sess.ended_at) setEnded(true);
        if (typeof sess.current_step_id !== 'undefined') {
          setCurrentStepId(sess.current_step_id || null);
          if (sess.current_step_id) {
            try {
              const { data: st } = await supabase
                .from('scenario_steps')
                .select('name')
                .eq('id', sess.current_step_id)
                .maybeSingle();
              if (st?.name) setStepName(st.name);
            } catch (error) {
              reportWarning('PresencialAlumno.reload.stepName', error, { stepId: sess.current_step_id });
            }
          } else {
            setStepName('');
          }
        }
        if (typeof sess.started_at !== 'undefined' && !sess.started_at) {
          setElapsedMs(0);
        }
      }

      const revealed = (sv || []).filter(r => r.is_revealed);
      const cards = await mergeVarsWithMeta(scenarioId, revealed);
      varsMapRef.current = new Map(cards.map(c => [c.id, c]));
      setVars(cards);

      // Recalcular fingerprint tras recargar
      try {
        const { data: lastAct2 } = await supabase
          .from('session_actions')
          .select('created_at')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        lastActionAtRef.current = lastAct2?.created_at || lastActionAtRef.current || null;
      } catch (error) {
        reportWarning('PresencialAlumno.reload.lastAction', error, { sessionId });
      }
      const fp = JSON.stringify({
        b: typeof bannerText === 'string' ? bannerText : '',
        step: currentStepId || null,
        start: sess?.started_at || null,
        end: !!ended,
        a: lastActionAtRef.current || ''
      });
      lastFingerprintRef.current = fp;
    } catch (error) {
      reportError('PresencialAlumno.reloadAll', error, { sessionId, scenarioId });
    }
  }, [bannerText, currentStepId, ended]);

  // Fallback: polling suave para detectar cambios si Realtime no llega
  useEffect(() => {
    let timer;
    let active = true;
    const tick = async () => {
      try {
        if (!active) return;
        const sid = sessionIdValue;
        if (!sid) return;
        // 1) Leer campos básicos de sesión
        const { data: sess } = await supabase
          .from('presencial_sessions')
          .select('banner_text, current_step_id, started_at, ended_at')
          .eq('id', sid)
          .maybeSingle();
        // 2) Leer última acción
        const { data: lastAct } = await supabase
          .from('session_actions')
          .select('created_at')
          .eq('session_id', sid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const a = lastAct?.created_at || lastActionAtRef.current || '';
        const fp = JSON.stringify({
          b: sess?.banner_text || '',
          step: sess?.current_step_id || null,
          start: sess?.started_at || null,
          end: !!sess?.ended_at,
          a
        });
        if (fp !== lastFingerprintRef.current) {
          await reloadAll(sid, sessionScenarioId);
          if (!sess?.started_at) setElapsedMs(0);
          lastFingerprintRef.current = fp;
          lastActionAtRef.current = a;
        }
      } catch (error) {
        reportWarning('PresencialAlumno.pollFallback', error, { sessionId: sessionIdValue });
      } finally {
        if (active) timer = setTimeout(tick, 3000);
      }
    };
    timer = setTimeout(tick, 3000);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [sessionIdValue, sessionScenarioId, reloadAll]);

  useEffect(() => {
    if (muted) return;
    const handler = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {});
      } catch {}
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [muted]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      {/* Overlay de alarma */}
      {alarmVisible && (
        <div className="fixed top-3 right-3 z-50">
          <div className="animate-pulse rounded-xl bg-red-600 text-white shadow-lg px-4 py-2 ring-1 ring-red-300">
            <div className="flex items-center gap-2">
              <span role="img" aria-label="bell">🔔</span>
              <span className="font-semibold">¡Alarma!</span>
            </div>
            <div className="text-xs text-red-50/90 mt-0.5">Aviso del instructor</div>
          </div>
        </div>
      )}

      {/* HERO (se oculta con ?clean=1) */}
      {!clean && (
        <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white">
          <div className="w-full px-5 sm:px-8 lg:px-12 py-5">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold">Simulación presencial</h1>
                <p className="opacity-90 mt-1 flex items-center gap-3 flex-wrap">
                  <span>
                    Código: <span className="font-mono bg-white/15 px-2 py-0.5 rounded">{code || '—'}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1 ${connected ? 'bg-emerald-100/20 ring-emerald-300 text-emerald-50' : 'bg-white/10 ring-white/30 text-white/80'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-300' : 'bg-white/50'}`} />
                    {connected ? 'Conectado' : 'Reconectando…'}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1 ${ended ? 'bg-rose-50 ring-rose-200 text-rose-700' : (session?.started_at ? 'bg-emerald-50 ring-emerald-200 text-emerald-700' : 'bg-amber-50 ring-amber-200 text-amber-700')}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ended ? '#f43f5e' : (session?.started_at ? '#10b981' : '#f59e0b') }} />
                    {ended ? 'Simulación terminada' : (session?.started_at ? 'En curso' : 'Esperando a iniciar')}
                  </span>
                </p>
              </div>
              {/* Cronómetro en HERO */}
              <div className="shrink-0 rounded-3xl ring-1 ring-white/30 bg-white/10 backdrop-blur px-4 py-2 md:px-6 md:py-3">
                <div className="font-mono tracking-tight text-white text-3xl md:text-5xl" title={session?.started_at ? new Date(session.started_at).toLocaleString() : 'Esperando inicio'}>
                  {session?.started_at ? fmtHMS(elapsedMs) : 'Esperando inicio'}
                  {ended ? <span className="ml-3 align-middle text-sm text-white/80">(finalizada)</span> : null}
                </div>
              </div>
            </div>
            {participants.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {participants.map(p => (
                  <span key={p.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs ring-1 ring-white/30 bg-white/10">
                    <span className="font-medium">{p.name}</span>
                    {p.role ? <span className="opacity-80">· {p.role.charAt(0).toUpperCase() + p.role.slice(1)}</span> : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <main style={mainStyle} className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 pt-4 pb-6 flex flex-col gap-4 overflow-hidden">
        {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Cargando…</div>}
        {errorMsg && !loading && <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">{errorMsg}</div>}

        {clean && (
          <div className="shrink-0 flex justify-center">
            <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur px-8 py-4 shadow-lg">
              <div className="text-5xl font-mono tracking-tight text-slate-900"
                   title={session?.started_at ? new Date(session.started_at).toLocaleString() : 'Esperando inicio'}>
                {session?.started_at ? fmtHMS(elapsedMs) : 'Esperando inicio'}
                {ended ? <span className="ml-3 align-middle text-sm text-slate-600">(finalizada)</span> : null}
              </div>
            </div>
          </div>
        )}

        {bannerText && (
          <div className="shrink-0 rounded-3xl border border-slate-200 bg-white/80 backdrop-blur px-6 py-4 shadow-lg">
            <div className="text-2xl md:text-3xl font-semibold leading-snug tracking-tight text-slate-800">
              {String(bannerText).split(/\n{2,}/).map((para, i) => (
                <p key={i} className="mb-2 last:mb-0">{para}</p>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(420px,520px)] xl:grid-cols-[minmax(0,0.7fr)_minmax(480px,600px)]">
         <section className="flex flex-col gap-4 overflow-hidden">
            {patientOverview ? (() => {
              const { chips, bullets, paragraphs } = parsePatientOverview(patientOverview);
              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col overflow-hidden">
                  <div className="text-sm font-semibold text-slate-700 mb-2">Ficha inicial del paciente</div>
                  <div className="space-y-3 overflow-auto pr-2 max-h-[28vh]">
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {chips.map(c => (
                          <span key={c.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                            {c.key === 'age' ? '🧒' : c.key === 'sex' ? '⚧' : c.key === 'weight' ? '⚖️' : '•'}{c.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {bullets.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-800">
                        {bullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                    {paragraphs.length > 0 ? (
                      <div className="space-y-2 text-sm text-slate-800 leading-[1.7]">
                        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                      </div>
                    ) : (!bullets.length ? <div className="text-sm text-slate-600">—</div> : null)}
                  </div>
                </div>
              );
            })() : null}

            {categorizedVars.vital.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col overflow-hidden">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Constantes</h4>
                <div className="grid auto-rows-fr grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 overflow-auto pr-1 max-h-[18vh]">
                  {categorizedVars.vital.map(({ v, meta, isFlash }) => (
                    <div
                      key={v.id}
                      className={`rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm ${
                        isFlash ? `ring-2 ${meta.ring} animate-pulse` : ''
                      }`}
                    >
                      <div className="text-xs font-medium text-slate-600 flex items-center gap-1 truncate">
                        <span aria-hidden>{meta.badge}</span>
                        <span className="truncate">{v.label || meta.label}</span>
                      </div>
                      <div className="mt-1 text-2xl font-mono">
                        {v.value}
                        {v.unit ? <span className="ml-1 text-slate-500 text-sm">{v.unit}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {categorizedVars.lab.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col overflow-hidden">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Analíticas</h4>
                <div className="grid auto-rows-fr grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 overflow-auto pr-1 max-h-[18vh]">
                  {categorizedVars.lab.map(({ v, meta, isFlash }) => (
                    <div
                      key={v.id}
                      className={`rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm ${
                        isFlash ? `ring-2 ${meta.ring} animate-pulse` : ''
                      }`}
                    >
                      <div className="text-xs font-medium text-slate-600 flex items-center gap-1 truncate">
                        <span aria-hidden>{meta.badge}</span>
                        <span className="truncate">{v.label || meta.label}</span>
                      </div>
                      <div className="mt-1 text-lg font-medium text-slate-800">
                        {v.value}
                        {v.unit ? <span className="ml-1 text-slate-500 text-sm">{v.unit}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {categorizedVars.others.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col overflow-hidden">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Otros datos</h4>
                <div className="grid auto-rows-fr grid-cols-4 gap-3 overflow-auto pr-1 max-h-[18vh]">
                  {categorizedVars.others.map(renderDataCard)}
                </div>
              </div>
            )}

            {participants && participants.length > 0 && clean ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-auto max-h-[14vh]">
                <div className="text-sm font-semibold text-slate-700 mb-2">Participantes</div>
                <ul className="space-y-1">
                  {participants.map(p => (
                    <li key={p.id} className="text-sm text-slate-800 flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <span className="font-medium">{p.name}</span>
                      {p.role ? <span className="text-slate-500">· {p.role.charAt(0).toUpperCase() + p.role.slice(1)}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <aside className="flex flex-col items-stretch gap-4 overflow-hidden">
            {mainImageItem ? (() => {
              const { v, meta, richValue, isFlash } = mainImageItem;
              return (
                <figure
                  className={`w-full max-w-[1350px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl ${isFlash ? 'ring-2 ring-violet-300 animate-pulse' : ''}`}
                >
                  <figcaption className="flex items-center justify-between bg-slate-900 px-5 py-3 text-xs uppercase tracking-[0.2em] text-slate-200">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span aria-hidden>{meta.badge}</span>
                      {meta.label}
                    </span>
                    <span className="text-[0.65rem] font-semibold tracking-[0.28em] text-slate-200/80">
                      {v.label}
                    </span>
                  </figcaption>
                  <img
                    src={richValue?.src}
                    alt={richValue?.alt || `Radiografía ${v.label}`}
                    className="w-full h-auto max-h-[78vh] object-contain bg-black"
                  />
                  {richValue?.description ? (
                    <figcaption className="px-5 py-4 text-sm leading-relaxed text-slate-700">
                      {richValue.description}
                    </figcaption>
                  ) : null}
                </figure>
              );
            })() : null}
            {ventilationCard}
          </aside>
        </div>

        <div className="fixed right-4 bottom-4 z-30">
          <div className="flex gap-2">
            <button
              onClick={() => setMuted(m => !m)}
              className={`px-3 py-2 rounded-full shadow-md ring-1 text-sm transition ${muted ? 'bg-slate-800 text-white ring-slate-700' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}
              title={muted ? 'Activar sonido' : 'Silenciar sonido'}
            >
              {muted ? '🔇 Silencio' : '🔊 Sonido'}
            </button>
            <button
              onClick={() => {
                try {
                  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
                  else document.exitFullscreen?.();
                } catch {}
              }}
              className="px-3 py-2 rounded-full shadow-md ring-1 text-sm bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              title="Alternar pantalla completa"
            >
              ⛶ Pantalla completa
            </button>
          </div>
        </div>
      </main>

      {!clean && !muted ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 text-xs text-slate-500">
          Aviso sonoro: sonará una alerta breve al mostrar/ocultar datos o publicar mensajes. Si no se oye, haz clic en la página para activar el audio del navegador.
        </div>
      ) : null}

    </div>
  );
}

function fmtHMS(ms) {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

async function mergeVarsWithMeta(scenarioId, svRows) {
  try {
    const ids = Array.from(new Set((svRows || []).map(r => r.variable_id))).filter(Boolean);
    if (!scenarioId || ids.length === 0) {
      return (svRows || []).map(r => ({ id: r.variable_id, label: undefined, unit: undefined, type: undefined, value: r.value }));
    }
    const { data: meta, error: metaErr } = await supabase
      .from('scenario_variables')
      .select('id, label, unit, type')
      .eq('scenario_id', scenarioId)
      .in('id', ids);
    if (metaErr) console.warn('[Alumno] meta query warn:', metaErr);
    const m = new Map((meta || []).map(v => [v.id, v]));
    return (svRows || []).map(r => {
      const v = m.get(r.variable_id) || {};
      return { id: r.variable_id, label: v.label, unit: v.unit, type: v.type, value: r.value };
    });
  } catch (e) {
    console.warn('[Alumno] mergeVarsWithMeta error:', e);
    return (svRows || []).map(r => ({ id: r.variable_id, label: undefined, unit: undefined, type: undefined, value: r.value }));
  }
}
