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
  const mute = searchParams.get('mute') === '1' || searchParams.get('mute') === 'true';

  const [session, setSession] = useState(null); // {id, banner_text, current_step_id, scenario_id, ...}
  const [vars, setVars] = useState([]); // variables reveladas [{id,label,unit,type,value}]
  const [stepName, setStepName] = useState('');
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [ended, setEnded] = useState(false);
  const [participants, setParticipants] = useState([]);

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
    if (mute) return;
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

        // 1b) Cargar título del escenario si existe escenario_id
        if (s.scenario_id) {
          try {
            const { data: sc } = await supabase
              .from('scenarios')
              .select('title')
              .eq('id', s.scenario_id)
              .maybeSingle();
            if (sc?.title && mounted) setScenarioTitle(sc.title);
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
              // Si cambia el escenario, refrescar el título
              if (next.scenario_id && next.scenario_id !== session?.scenario_id) {
                supabase
                  .from('scenarios')
                  .select('title')
                  .eq('id', next.scenario_id)
                  .maybeSingle()
                  .then(({ data }) => {
                    if (data?.title) setScenarioTitle(data.title);
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
                  const meta = varMetaRef.current[id] || {};
                  const item = {
                    id,
                    label: meta.label,
                    unit: meta.unit,
                    type: meta.type,
                    value: newRow?.value
                  };
                  varsMapRef.current.set(id, item);
                  setVars(Array.from(varsMapRef.current.values()));
                  // Sonido: alerta al mostrar por primera vez o al insertar
                  const becameRevealed = (eventType === 'INSERT') ||
                    (oldRow && oldRow.is_revealed === false && newRow && newRow.is_revealed === true);
                  if (becameRevealed) playAlert('reveal');
                } else if (eventType === 'DELETE') {
                  const id = oldRow?.variable_id;
                  if (!id) return;
                  varsMapRef.current.delete(id);
                  setVars(Array.from(varsMapRef.current.values()));
                  // Sonido: alerta grave al ocultar
                  playAlert('hide');
                }
              } catch (e) {
                console.warn('[Alumno] realtime incremental update failed, falling back:', e);
              }
            }
          )
          .subscribe();
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [public_code, codeParam]);

  useEffect(() => {
    if (mute) return;
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
  }, [mute]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HERO proyectable */}
      {!clean && (
        <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white">
          <div className="max-w-6xl mx-auto px-5 py-8">
            <h1 className="text-2xl md:text-3xl font-semibold">Simulación presencial · Pantalla del alumnado</h1>
            <p className="opacity-90 mt-1">
              Código de sesión: <span className="font-mono bg-white/15 px-2 py-0.5 rounded">{code || '—'}</span>
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
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Cargando…</div>
        )}
        {errorMsg && !loading && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">{errorMsg}</div>
        )}

        {/* Sesión finalizada */}
        {ended && (
          <div className={`mb-8 rounded-2xl border border-slate-200 bg-white ${clean ? 'p-10 md:p-12' : 'p-6'} shadow-sm`}>
            <div className={`font-semibold ${clean ? 'text-3xl md:text-4xl text-center' : 'text-2xl'}`}>
              Sesión finalizada
            </div>
            <p className={`mt-2 ${clean ? 'text-center text-lg' : 'text-slate-600'}`}>
              Gracias por participar. El instructor puede compartir ahora el debriefing.
            </p>
          </div>
        )}

        {/* Banner de narrativa del caso */}
        {session?.banner_text && (
          <div className={`mb-8 rounded-2xl border border-slate-200 bg-white ${clean ? 'p-10 md:p-12' : 'p-6'} shadow-sm`}>
            <div className={`font-semibold leading-snug ${clean ? 'text-3xl md:text-5xl text-center' : 'text-2xl md:text-3xl'}`}>
              {session.banner_text}
            </div>
          </div>
        )}

        {/* Fase actual, visible aunque no haya banner */}
        {stepName && (
          <div className={`mb-6 ${clean ? 'flex justify-center' : ''}`}>
            <span className="px-3 py-1.5 rounded-full text-sm ring-1 ring-slate-200 bg-slate-50 text-slate-700">
              Fase: {stepName}
            </span>
          </div>
        )}

        {/* Variables/constantes reveladas por el instructor */}
        {vars.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vars.map(v => (
              <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-slate-500 text-xs">{labelByType(v.type)} · {v.label}</div>
                <div className="text-2xl md:text-3xl font-mono mt-1">
                  {v.value}{v.unit ? <span className="ml-1 text-slate-500 text-lg">{v.unit}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (!loading && !errorMsg) ? (
          <div className={`rounded-2xl border border-dashed border-slate-300 bg-white ${clean ? 'p-12 text-center' : 'p-6'} text-slate-600`}>
            {ended ? (
              <>No hay más datos que mostrar. La sesión ha finalizado.</>
            ) : clean ? (
              <div className="text-xl md:text-2xl">Esperando instrucciones del instructor…</div>
            ) : (
              <>A medida que el instructor revele información, aparecerá aquí (constantes, analíticas, imagen, etc.).</>
            )}
          </div>
        ) : null}
        {!clean && !mute ? (
          <div className="mt-6 text-xs text-slate-500">
            Sonido: se reproducirá una alerta breve (estilo emergencia) al revelar/ocultar datos o al mostrar texto de caso.
            Si no oyes nada, haz clic en la página para habilitar el audio del navegador.
          </div>
        ) : null}
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