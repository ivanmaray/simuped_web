import { useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
// Sonido: usaremos Web Audio API para un ping corto al revelar/ocultar variables.

export default function PresencialAlumno() {
  // Admite tanto ":public_code" como ":code" en la ruta
  const { public_code, code: codeParam } = useParams();
  const code = public_code || codeParam;

  // Opcional: modo proyección limpio ?clean=1 para ocultar Navbar/Hero
  const [searchParams] = useSearchParams();
  const clean = searchParams.get('clean') === '1' || searchParams.get('clean') === 'true';
  // Permite silenciar desde UI además de ?mute=1
  const [muted, setMuted] = useState(searchParams.get('mute') === '1' || searchParams.get('mute') === 'true');

  const [session, setSession] = useState(null); // {id, banner_text, current_step_id, scenario_id, ...}
  const [vars, setVars] = useState([]); // variables reveladas [{id,label,unit,type,value}]
  const [stepName, setStepName] = useState('');
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [patientOverview, setPatientOverview] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [ended, setEnded] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [connected, setConnected] = useState(false);

  // Pequeños destellos cuando llega/actualiza un dato
  const [flash, setFlash] = useState({}); // { [variableId]: true }

  // Estética por tipo
  function typeMeta(t) {
    switch (t) {
      case 'vital':
        return { label: 'Constante', badge: '⚡', ring: 'ring-sky-300', chip: 'bg-sky-50 text-sky-700 ring-sky-200' };
      case 'lab':
        return { label: 'Analítica', badge: '🧪', ring: 'ring-emerald-300', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
      case 'imagen':
        return { label: 'Imagen', badge: '🖼️', ring: 'ring-violet-300', chip: 'bg-violet-50 text-violet-700 ring-violet-200' };
      case 'texto':
        return { label: 'Nota', badge: '📝', ring: 'ring-amber-300', chip: 'bg-amber-50 text-amber-700 ring-amber-200' };
      default:
        return { label: 'Dato', badge: '•', ring: 'ring-slate-300', chip: 'bg-slate-50 text-slate-700 ring-slate-200' };
    }
  }

  // Utilidad: formatea la ficha inicial del paciente (puede empezar con JSON, array, etc.)
  function parsePatientOverview(pov) {
    if (!pov || typeof pov !== 'string') {
      return { chips: [], bullets: [], paragraphs: [] };
    }

    let chips = [];
    let bullets = [];
    let rest = pov.trim();

    // 1) Demographics JSON al inicio: { ... }
    try {
      const m = rest.match(/^\s*\{[\s\S]*?\}\s*(?:\n+|$)/);
      if (m && m[0]) {
        const jsonTxt = m[0].trim().replace(/,+\s*$/,'');
        try {
          const demo = JSON.parse(jsonTxt);
          const age = demo.age || demo.edad;
          const sex = demo.sex || demo.sexo;
          const weight = demo.weightKg || demo.weight_kg || demo.peso;
          if (age) chips.push({ label: String(age), key: 'age' });
          if (sex) chips.push({ label: String(sex), key: 'sex' });
          if (weight) chips.push({ label: `${weight} kg`, key: 'weight' });
          rest = rest.slice(m[0].length).trim();
        } catch (_) {}
      }
    } catch (_) {}

    // 2) Bloque tipo array JSON al inicio: ["...","...", ...]
    try {
      const a = rest.match(/^\s*\[[\s\S]*?\]\s*(?:\n+|$)/);
      if (a && a[0]) {
        const arrTxt = a[0].trim();
        try {
          const arr = JSON.parse(arrTxt);
          if (Array.isArray(arr)) {
            bullets = arr.map(x => String(x)).filter(Boolean);
            rest = rest.slice(a[0].length).trim();
          }
        } catch (_) {
          // si no parsea, seguimos con limpieza genérica
        }
      }
    } catch (_) {}

    // 3) Limpieza genérica de comillas/residuos si quedó algo del array/JSON
    rest = rest
      .replace(/^\[\s*"?|"?\s*\]$/g, '')
      .replace(/\",\s*\"/g, '\n')
      .replace(/^\"|\"$/g, '')
      .trim();

    // 4) Párrafos por líneas en blanco
    const paragraphs = rest
      ? rest.split(/\n{2,}/).map(s => s.replace(/^\s+|\s+$/g, '')).filter(Boolean)
      : [];

    return { chips, bullets, paragraphs };
  }

  const varMetaRef = useRef({});
  const varsMapRef = useRef(new Map());

  const audioCtxRef = useRef(null);
  const lastBannerRef = useRef(null);
  // Helper: load participants via RPC by public code (uuid[] participants on presencial_sessions)
  async function loadParticipantsByCode(pcode) {
    if (!pcode) return;
    try {
      const { data: parts, error } = await supabase.rpc('get_session_participants_by_code', { p_code: pcode });
      if (error) throw error;
      const rows = Array.isArray(parts) ? parts.map(r => ({ id: r.id, name: r.display_name || 'Participante', role: r.role || null })) : [];
      setParticipants(rows);
    } catch (e) {
      console.warn('[Alumno] loadParticipantsByCode error:', e);
      setParticipants([]);
    }
  }

  function playAlert(kind = 'reveal') {
    if (muted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new AudioCtx();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Helpers
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
        // barrido ascendente y descenso rápido (sirena corta)
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
        // Doble bip rápido (estilo alerta)
        beep(now, 1000, 120, 0.28);
        beep(now + 0.16, 1200, 120, 0.24);
      } else if (kind === 'hide') {
        // Bip grave corto
        beep(now, 440, 100, 0.22);
      } else if (kind === 'banner') {
        // Sirena corta/"emergencia" cuando aparece/actualiza texto
        whoop(now, 900);
      }
    } catch (e) {
      console.debug('[Alumno] playAlert error (ignorable):', e);
    }
  }

  useEffect(() => {
    let mounted = true;
    let channel;
    const safety = setTimeout(() => {
      if (mounted) {
        console.warn('[Alumno] safety timeout: forcing loading=false');
        setLoading(false);
      }
    }, 5000);
    (async () => {
      try {
        if (!code) {
          console.debug('[Alumno] missing code detected');
          setErrorMsg('Falta el código público de la sesión.');
          setLoading(false);
          return;
        }
        // 1) Resolver sesión por public_code (mínimo imprescindible)
        const baseRes = await supabase
          .from('presencial_sessions')
          .select('id, scenario_id, started_at')
          .eq('public_code', code)
          .maybeSingle();
        if (baseRes.error) {
          console.error('[Alumno] error leyendo presencial_sessions:', baseRes.error);
          throw baseRes.error;
        }
        const s = baseRes.data;
        if (!s) {
          setErrorMsg('No se encontró ninguna sesión con ese código.');
          setLoading(false);
          return;
        }
        if (!mounted) return;
        setSession(s);
        console.debug('[Alumno] session resolved', s);
        loadParticipantsByCode(code);

        // Pre-cargar metadatos de variables del escenario para evitar joins al refrescar
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

        // 1a) Intentar leer columnas opcionales de forma separada y tolerante
        // current_step_id
        try {
          const { data: cur } = await supabase
            .from('presencial_sessions')
            .select('current_step_id')
            .eq('id', s.id)
            .maybeSingle();
          if (cur && typeof cur.current_step_id !== 'undefined') {
            setSession(prev => ({ ...(prev || s), current_step_id: cur.current_step_id }));
            if (cur.current_step_id) {
              const { data: st } = await supabase
                .from('scenario_steps')
                .select('name')
                .eq('id', cur.current_step_id)
                .maybeSingle();
              if (st?.name && mounted) setStepName(st.name);
            }
          }
        } catch {}

        // banner_text
        try {
          const { data: ban } = await supabase
            .from('presencial_sessions')
            .select('banner_text')
            .eq('id', s.id)
            .maybeSingle();
          if (ban && typeof ban.banner_text !== 'undefined') {
            setSession(prev => ({ ...(prev || s), banner_text: ban.banner_text }));
            lastBannerRef.current = ban?.banner_text ?? null;
          }
        } catch {}

        // ended_at
        try {
          const { data: sEnded } = await supabase
            .from('presencial_sessions')
            .select('ended_at')
            .eq('id', s.id)
            .maybeSingle();
          if (sEnded && sEnded.ended_at) setEnded(true);
        } catch {}

        // 1b) Cargar título del escenario + ficha paciente desde función SQL
        if (s.scenario_id) {
          try {
            const [scRes, povRes] = await Promise.all([
              supabase
                .from('scenarios')
                .select('title')
                .eq('id', s.scenario_id)
                .maybeSingle(),
              supabase
                .rpc('get_patient_overview', { p_scenario_id: s.scenario_id })
            ]);
            const sc = scRes?.data;
            const pov = povRes?.data;
            if (mounted) {
              if (sc?.title) setScenarioTitle(sc.title);
              if (typeof pov === 'string' && pov.trim()) setPatientOverview(pov);
              else setPatientOverview('');
            }
          } catch {}
        }

        // 2) Cargar variables (solo reveladas en servidor)
        const { data: sv, error: svErr } = await supabase
          .from('session_variables')
          .select('variable_id, value')
          .eq('session_id', s.id)
          .eq('is_revealed', true);
        if (svErr) {
          console.error('[Alumno] error cargando session_variables:', svErr);
          throw svErr;
        }
        if (!mounted) return;
        const cards1 = await mergeVarsWithMeta(s.scenario_id, sv || []);
        console.debug('[Alumno] carga inicial vars ->', (sv||[]).length);
        setVars(cards1);
        varsMapRef.current = new Map((cards1 || []).map(c => [c.id, c]));

        // 2b) Si hay paso actual, intenta traer el nombre del paso
        if (s.current_step_id) {
          try {
            const { data: st, error: stErr } = await supabase
              .from('scenario_steps')
              .select('name')
              .eq('id', s.current_step_id)
              .maybeSingle();
            if (!stErr && st?.name && mounted) setStepName(st.name);
          } catch {}
        }

        // 3) Suscripciones realtime (sesión y variables)
        channel = supabase
          .channel(`sess:${code}`)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'presencial_sessions', filter: `public_code=eq.${code}` },
            (payload) => {
              const next = payload.new;
              if (!next || !mounted) return;
              // Detectar aparición/actualización del banner y reproducir alerta
              if (Object.prototype.hasOwnProperty.call(next, 'banner_text')) {
                const prevBanner = lastBannerRef.current;
                const newBanner = next.banner_text ?? null;
                if (newBanner && newBanner !== prevBanner) {
                  playAlert('banner');
                }
                lastBannerRef.current = newBanner;
              }
              setSession(prev => ({ ...prev, ...next }));
              // Marcar finalización si llega ended_at
              if (Object.prototype.hasOwnProperty.call(next, 'ended_at') && next.ended_at) {
                setEnded(true);
              }
              // Si cambia el escenario, refrescar el título y ficha del paciente
              if (next.scenario_id && next.scenario_id !== session?.scenario_id) {
                Promise.all([
                  supabase
                    .from('scenarios')
                    .select('title')
                    .eq('id', next.scenario_id)
                    .maybeSingle(),
                  supabase
                    .rpc('get_patient_overview', { p_scenario_id: next.scenario_id })
                ]).then(([scRes, povRes]) => {
                  const sc = scRes?.data;
                  const pov = povRes?.data;
                  if (sc?.title) setScenarioTitle(sc.title);
                  if (typeof pov === 'string' && pov.trim()) setPatientOverview(pov); else setPatientOverview('');
                });
              }
              if (next.current_step_id && next.current_step_id !== session?.current_step_id) {
                // refresh step name cuando cambie el paso
                supabase
                  .from('scenario_steps')
                  .select('name')
                  .eq('id', next.current_step_id)
                  .maybeSingle()
                  .then(({ data }) => { if (data?.name && mounted) setStepName(data.name); });
              }
              loadParticipantsByCode(code);
            }
          )
          .on('postgres_changes',
            { event: '*', schema: 'public', table: 'session_variables', filter: `session_id=eq.${s.id}` },
            (payload) => {
              if (!mounted) return;
              try {
                const { eventType, new: newRow, old: oldRow } = payload || {};
                if (eventType === 'INSERT' || eventType === 'UPDATE') {
                  const id = newRow?.variable_id;
                  if (!id) return;
                  const isRevealed = newRow?.is_revealed === true;
                  const wasRevealed = oldRow ? oldRow.is_revealed === true : false;

                  if (!isRevealed) {
                    // Ocultar en UPDATE → eliminar del mapa
                    if (varsMapRef.current.has(id)) {
                      varsMapRef.current.delete(id);
                      setVars(Array.from(varsMapRef.current.values()));
                      // destello visual: limpiar
                      setFlash(prev => { const n = { ...prev }; delete n[id]; return n; });
                      playAlert('hide');
                    }
                    return;
                  }

                  // Revelado o sigue revelado → actualizar/insertar tarjeta
                  const meta = varMetaRef.current[id] || {};
                  const item = { id, label: meta.label, unit: meta.unit, type: meta.type, value: newRow?.value };
                  varsMapRef.current.set(id, item);
                  setVars(Array.from(varsMapRef.current.values()));
                  // destello visual
                  setFlash(prev => ({ ...prev, [id]: true }));
                  setTimeout(() => setFlash(prev => { const n = { ...prev }; delete n[id]; return n; }), 900);

                  // Sonido: si pasó de oculto→visible o cambia el valor estando visible
                  if (!wasRevealed && isRevealed) {
                    playAlert('reveal');
                  } else if (isRevealed && oldRow && oldRow.value !== newRow.value) {
                    playAlert('reveal');
                  }
                } else if (eventType === 'DELETE') {
                  const id = oldRow?.variable_id;
                  if (!id) return;
                  // destello visual: limpiar
                  setFlash(prev => { const n = { ...prev }; delete n[id]; return n; });
                  if (varsMapRef.current.has(id)) {
                    varsMapRef.current.delete(id);
                    setVars(Array.from(varsMapRef.current.values()));
                    playAlert('hide');
                  }
                }
              } catch (e) {
                console.warn('[Alumno] realtime incremental update failed, falling back:', e);
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

  useEffect(() => {
    if (muted) return;
    const handler = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
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
      {/* HERO proyectable */}
      {!clean && (
        <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white">
          <div className="max-w-6xl mx-auto px-5 py-8">
            <h1 className="text-2xl md:text-3xl font-semibold">Simulación presencial</h1>
            <p className="opacity-90 mt-1 flex items-center gap-3 flex-wrap">
              <span>
                Código: <span className="font-mono bg-white/15 px-2 py-0.5 rounded">{code || '—'}</span>
              </span>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1 ${connected ? 'bg-emerald-100/20 ring-emerald-300 text-emerald-50' : 'bg-white/10 ring-white/30 text-white/80'}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-300' : 'bg-white/50'}`} />
                {connected ? 'Conectado' : 'Reconectando…'}
              </span>
            </p>
            {participants.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {participants.map(p => (
                  <span key={p.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs ring-1 ring-white/30 bg-white/10">
                    <span className="font-medium">{p.name}</span>
                    {p.role ? <span className="opacity-80">· {p.role}</span> : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <main className={`${clean ? 'max-w-7xl' : 'max-w-6xl'} mx-auto px-5 py-8`}>
        { /* evita duplicar participantes si ya se muestran en el hero */ }
        {(() => { /* no render, solo marca */ })()}
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Cargando…</div>
        )}
        {errorMsg && !loading && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">{errorMsg}</div>
        )}

        {/* Sesión finalizada */}
        {ended && (
          <div className={`mb-8 rounded-3xl border border-slate-200 bg-white/70 backdrop-blur ${clean ? 'p-10 md:p-12' : 'p-6'} shadow-lg`}>
            <div className={`font-semibold ${clean ? 'text-3xl md:text-4xl text-center' : 'text-2xl'}`}>
              Sesión finalizada
            </div>
            <p className={`mt-2 ${clean ? 'text-center text-lg' : 'text-slate-600'}`}>
              Gracias por participar. El equipo docente iniciará el debriefing.
            </p>
          </div>
        )}

        {/* Banner de narrativa del caso */}
        {session?.banner_text && (
          <div className={`mb-8 rounded-3xl border border-slate-200 bg-white/70 backdrop-blur ${clean ? 'p-10 md:p-12' : 'p-6'} shadow-lg`}>
            <div className={`font-semibold leading-snug tracking-tight ${clean ? 'text-3xl md:text-5xl text-center' : 'text-2xl md:text-3xl'}`}>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700">
                {session.banner_text}
              </span>
            </div>
          </div>
        )}

        {/* Fase actual, visible aunque no haya banner */}
        {stepName && (
          <div className={`mb-6 ${clean ? 'flex justify-center' : ''}`}>
            <span className="px-3 py-1.5 rounded-full text-sm ring-1 ring-slate-200 bg-slate-50 text-slate-700">
              Fase actual: {stepName}
            </span>
          </div>
        )}

        {/* Layout con sidebar sticky para ficha del paciente y participantes */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
          {/* Sidebar sticky (solo si hay contenido) */}
          {(patientOverview || (participants && participants.length > 0)) ? (
            <aside className="lg:sticky lg:top-4 h-fit space-y-4">
              {/* Ficha inicial del paciente (formateada) */}
              {patientOverview ? (() => {
                const { chips, bullets, paragraphs } = parsePatientOverview(patientOverview);
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-semibold text-slate-700 mb-2">Ficha inicial del paciente</div>
                    {chips.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {chips.map(c => (
                          <span key={c.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                            {c.key === 'age' ? '🧒' : c.key === 'sex' ? '⚧' : c.key === 'weight' ? '⚖️' : '•'}
                            {c.label}
                          </span>
                        ))}
                      </div>
                    )}
                    {bullets.length > 0 && (
                      <ul className="list-disc pl-5 mb-3 space-y-1 text-sm text-slate-800">
                        {bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {paragraphs.length > 0 ? (
                      <div className="space-y-2 text-sm text-slate-800 leading-[1.7]">
                        {paragraphs.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    ) : (!bullets.length ? (
                      <div className="text-sm text-slate-600">—</div>
                    ) : null)}
                  </div>
                );
              })() : null}

              {/* Participantes: solo si no se muestran ya en el hero */}
              {participants && participants.length > 0 && clean ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold text-slate-700 mb-2">Participantes</div>
                  <ul className="space-y-1">
                    {participants.map(p => (
                      <li key={p.id} className="text-sm text-slate-800 flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span className="font-medium">{p.name}</span>
                        {p.role ? <span className="text-slate-500">· {p.role}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          ) : (
            <div className="hidden lg:block" />
          )}

          {/* Contenido principal: variables/constantes reveladas */}
          <section>
            {/* Variables/constantes reveladas por el instructor */}
            {vars.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {vars.map(v => {
                  const meta = typeMeta(v.type);
                  const isFlash = !!flash[v.id];
                  return (
                    <div
                      key={v.id}
                      className={`relative rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 shadow-sm transition-transform duration-200 ${isFlash ? `ring-2 ${meta.ring} animate-pulse` : ''}`}
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
                })}
              </div>
            ) : (!loading && !errorMsg) ? (
              <div className={`rounded-2xl border border-dashed border-slate-300 bg-white ${clean ? 'p-12 text-center' : 'p-6'} text-slate-600`}>
                {ended ? (
                  <>No hay más datos que mostrar. La sesión ha finalizado.</>
                ) : clean ? (
                  <div className="text-xl md:text-2xl">Esperando al instructor…</div>
                ) : (
                  <>Cuando el instructor comparta datos, aparecerán aquí (constantes, analíticas, imágenes, notas…).</>
                )}
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

        {/* Controles rápidos: silenciar y pantalla completa */}
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
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen?.();
                  } else {
                    document.exitFullscreen?.();
                  }
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
  // Back-compat: if already enriched, just normalize keys
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

/* Proyección/impresión: oculta navbar/hero en print si existieran */