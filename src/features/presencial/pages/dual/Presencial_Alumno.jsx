import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../../supabaseClient';

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
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [patientOverview, setPatientOverview] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [ended, setEnded] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [connected, setConnected] = useState(false);
  const [alarmVisible, setAlarmVisible] = useState(false);
  const lastAlarmRef = useRef(null);

  const [flash, setFlash] = useState({}); // { [variableId]: true }
  const [elapsedMs, setElapsedMs] = useState(0);

  function typeMeta(t) {
    switch (t) {
      case 'vital':  return { label: 'Constante', badge: '⚡', ring: 'ring-sky-300',    chip: 'bg-sky-50 text-sky-700 ring-sky-200' };
      case 'lab':    return { label: 'Analítica', badge: '🧪', ring: 'ring-emerald-300',chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
      case 'imagen': return { label: 'Imagen',    badge: '🖼️', ring: 'ring-violet-300', chip: 'bg-violet-50 text-violet-700 ring-violet-200' };
      case 'texto':  return { label: 'Nota',      badge: '📝', ring: 'ring-amber-300',  chip: 'bg-amber-50 text-amber-700 ring-amber-200' };
      default:       return { label: 'Dato',      badge: '•',  ring: 'ring-slate-300',  chip: 'bg-slate-50 text-slate-700 ring-slate-200' };
    }
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
        } catch {}
      }
    } catch {}

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
        } catch {}
      }
    } catch {}

    rest = rest
      .replace(/^\[\s*"?|"?\s*\]$/g, '')
      .replace(/\",\s*\"/g, '\n')
      .replace(/^\"|\"$/g, '')
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
        } catch {}
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
          } catch {}
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
          } catch {}
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
          } catch {}
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
                if (!next.started_at) setElapsedMs(0);
              }
              if (Object.prototype.hasOwnProperty.call(next, 'ended_at')) {
                setEnded(!!next.ended_at);
                if (!next.ended_at && !next.started_at) setElapsedMs(0);
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
                if (key.includes('publish') || key.includes('banner') || key.includes('step')) {
                  let txt = '';
                  const p = row.payload;
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

  // Cronómetro: cuenta desde started_at hasta ahora (o hasta ended_at si finalizó)
  useEffect(() => {
    let timerId;
    try {
      if (session?.started_at) {
        const startTs = new Date(session.started_at).getTime();
        const endTs = ended && session?.ended_at ? new Date(session.ended_at).getTime() : null;
        const tick = () => {
          const now = endTs ?? Date.now();
          setElapsedMs(Math.max(0, now - startTs));
        };
        tick();
        timerId = setInterval(tick, 250);
      } else {
        setElapsedMs(0);
      }
    } catch {}
    return () => { if (timerId) clearInterval(timerId); };
  }, [session?.started_at, session?.ended_at, ended]);

  // (Opcional) Auto-redirección al informe solo si ?autoinforme=1
  const autoInforme = searchParams.get('autoinforme') === '1' || searchParams.get('autoinforme') === 'true';
  useEffect(() => {
    if (autoInforme && ended && session?.id) {
      const t = setTimeout(() => {
        navigate(`/presencial/${session.id}/informe`, { replace: true });
      }, 800);
      return () => clearTimeout(t);
    }
  }, [autoInforme, ended, session?.id, navigate]);

  // Helper: recargar estado del alumno sin F5
  async function reloadAll(sessionId, scenarioId) {
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
            } catch {}
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
      } catch {}
      const fp = JSON.stringify({
        b: typeof bannerText === 'string' ? bannerText : '',
        step: currentStepId || null,
        start: sess?.started_at || null,
        end: !!ended,
        a: lastActionAtRef.current || ''
      });
      lastFingerprintRef.current = fp;
    } catch (e) {
      console.warn('[Alumno] reloadAll error:', e);
    }
  }

  // Fallback: polling suave para detectar cambios si Realtime no llega
  useEffect(() => {
    let timer;
    let active = true;
    const tick = async () => {
      try {
        if (!active) return;
        const sid = session?.id;
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
          await reloadAll(sid, session?.scenario_id);
          if (!sess?.started_at) setElapsedMs(0);
          lastFingerprintRef.current = fp;
          lastActionAtRef.current = a;
        }
      } catch (e) {
        // silencioso
      } finally {
        if (active) timer = setTimeout(tick, 3000);
      }
    };
    timer = setTimeout(tick, 3000);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [session?.id, session?.scenario_id]);

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
          <div className="max-w-6xl mx-auto px-5 py-8">
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

      <main className={`${clean ? 'max-w-7xl' : 'max-w-6xl'} mx-auto px-5 py-8`}>
        {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Cargando…</div>}
        {errorMsg && !loading && <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">{errorMsg}</div>}

        {/* Cronómetro (solo en contenido cuando clean=1); en modo normal está en el HERO */}
        {clean && (
          <div className="mb-6 flex justify-center">
            <div className={`rounded-3xl border border-slate-200 bg-white/80 backdrop-blur shadow-lg px-8 py-5`}>
              <div className={`text-5xl md:text-6xl font-mono tracking-tight text-slate-900`}
                   title={session?.started_at ? new Date(session.started_at).toLocaleString() : 'Esperando inicio'}>
                {session?.started_at ? fmtHMS(elapsedMs) : 'Esperando inicio'}
                {ended ? <span className="ml-3 align-middle text-sm text-slate-600">(finalizada)</span> : null}
              </div>
            </div>
          </div>
        )}

        {/* Finalizada */}
        {ended && (
          <div className={`mb-8 rounded-3xl border border-slate-200 bg-white/70 backdrop-blur ${clean ? 'p-10 md:p-12' : 'p-6'} shadow-lg`}>
            <div className={`font-semibold ${clean ? 'text-3xl md:text-4xl text-center' : 'text-2xl'}`}>Simulación terminada</div>
            <div className={`mt-4 ${clean ? 'text-center' : ''}`}>
              <button
                onClick={() => session?.id && navigate(`/presencial/${session.id}/informe`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
                title="Requiere iniciar sesión"
              >
                Ver informe
                <span className="text-xs opacity-80">(requiere login)</span>
              </button>
            </div>
            <p className={`mt-2 ${clean ? 'text-center text-lg' : 'text-slate-600'}`}>Redirigiendo al informe…</p>
          </div>
        )}

        {/* Banner de narrativa (texto del instructor) */}
        {bannerText && (
          <div className={`mb-8 rounded-3xl border border-slate-200 bg-white/70 backdrop-blur ${clean ? 'p-10 md:p-12' : 'p-6'} shadow-lg`}>
            <div className={`font-semibold leading-snug tracking-tight ${clean ? 'text-3xl md:text-5xl text-center' : 'text-2xl md:text-3xl'}`}>
              {String(bannerText).split(/\n{2,}/).map((para, i) => (
                <p key={i} className="mb-2 last:mb-0">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700">
                    {para}
                  </span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Fase actual */}
        {stepName && (
          <div className={`mb-6 ${clean ? 'flex justify-center' : ''}`}>
            <span className="px-3 py-1.5 rounded-full text-sm ring-1 ring-slate-200 bg-slate-50 text-slate-700">Fase actual: {stepName}</span>
          </div>
        )}

        {/* Layout con sidebar para ficha paciente y participantes */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
          {(patientOverview || (participants && participants.length > 0)) ? (
            <aside className="lg:sticky lg:top-4 h-fit space-y-4">
              {/* Ficha paciente */}
              {patientOverview ? (() => {
                const { chips, bullets, paragraphs } = parsePatientOverview(patientOverview);
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-700 mb-2">Ficha inicial del paciente</div>
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {chips.map(c => (
                          <span key={c.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                            {c.key === 'age' ? '🧒' : c.key === 'sex' ? '⚧' : c.key === 'weight' ? '⚖️' : '•'}{c.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {bullets.length > 0 && (
                      <ul className="list-disc pl-5 mb-3 space-y-1 text-sm text-slate-800">
                        {bullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                    {paragraphs.length > 0 ? (
                      <div className="space-y-2 text-sm text-slate-800 leading-[1.7]">
                        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                      </div>
                    ) : (!bullets.length ? <div className="text-sm text-slate-600">—</div> : null)}
                  </div>
                );
              })() : null}

              {/* Participantes (solo si no mostramos el hero) */}
              {participants && participants.length > 0 && clean ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            </aside>
          ) : <div className="hidden lg:block" />}

          {/* Contenido principal: variables compartidas */}
          <section>
            {vars.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {vars.map(v => {
                  const meta = typeMeta(v.type);
                  const isFlash = !!flash[v.id];
                  return (
                    <div key={v.id} className={`relative rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 shadow-sm transition-transform duration-200 ${isFlash ? `ring-2 ${meta.ring} animate-pulse` : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-slate-500 text-xs flex items-center gap-1">
                          <span aria-hidden>{meta.badge}</span><span>{meta.label}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ring-1 ${meta.chip}`}>{v.label}</span>
                      </div>
                      <div className="text-3xl md:text-4xl font-mono mt-2">
                        {v.value}{v.unit ? <span className="ml-1 text-slate-500 text-lg">{v.unit}</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (!loading && !errorMsg) ? (
              <div className={`rounded-2xl border border-dashed border-slate-300 bg-white ${clean ? 'p-12 text-center' : 'p-6'} text-slate-600`}>
                {ended ? <>No hay más datos que mostrar. La sesión ha finalizado.</> :
                 clean ? <div className="text-xl md:text-2xl">Esperando al instructor…</div> :
                 <>Cuando el instructor comparta datos, aparecerán aquí (constantes, analíticas, imágenes, notas…).</>}
              </div>
            ) : null}
          </section>
        </div>

        {!clean && !muted ? (
          <div className="mt-6 text-xs text-slate-500">
            Aviso sonoro: sonará una alerta breve al mostrar/ocultar datos o publicar mensajes.
            Si no se oye, haz clic en la página para activar el audio del navegador.
          </div>
        ) : null}

        {/* Controles rápidos */}
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

function toCards(rows = []) {
  return rows.map(r => ({ id: r.id ?? r.variable_id, label: r.label, unit: r.unit, type: r.type, value: r.value }));
}

function labelByType(t) {
  switch (t) {
    case 'vital': return 'Constante';
    case 'lab': return 'Analítica';
    case 'imagen': return 'Imagen';
    case 'texto': return 'Nota';
    default: return 'Dato';
  }
}