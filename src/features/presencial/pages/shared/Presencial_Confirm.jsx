// src/pages/PresencialConfirm.jsx
import { Link, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import Navbar from "../../../../components/Navbar.jsx";

const estadoStyles = {
  "Disponible": { label: "Disponible", color: "bg-[#0A3D91]/10 text-[#0A3D91] ring-[#0A3D91]/20" },
  "En construcción: en proceso": { label: "En construcción: en proceso", color: "bg-[#4FA3E3]/10 text-[#1E6ACB] ring-[#1E6ACB]/20" },
  "En construcción: sin iniciar": { label: "En construcción: sin iniciar", color: "bg-slate-200 text-slate-600 ring-slate-300" },
};

export default function Presencial_Confirm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sc, setSc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [submitErr, setSubmitErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [users, setUsers] = useState([]); // perfiles (profiles) de Supabase
  const [roleToAdd, setRoleToAdd] = useState('medico');
  const [searchText, setSearchText] = useState('');
  const LS_FLOW_KEY = 'presencial:confirm:flow';

  function addParticipantFromSearch() {
    const pool = usersForRole(roleToAdd);
    const found = pool.find(u => (u.label || '').toLowerCase() === searchText.toLowerCase());
    if (found) {
      setParticipants(arr => [...arr, { role: roleToAdd, name: found.nameLabel || found.label, user_id: found.id }]);
      setSearchText('');
    } else if (searchText.trim().length >= 2) {
      setParticipants(arr => [...arr, { role: roleToAdd, name: searchText.trim() }]);
      setSearchText('');
    }
  }
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // Si vienes por la ruta de 1 pantalla (/presencial/..), el flujo por defecto es 'single'.
  // Si vienes por rutas de instructor (/presencial/instructor/..), el defecto es 'dual'.
  const defaultFlow = (location.pathname.startsWith('/presencial/') && !location.pathname.includes('/presencial/instructor'))
    ? 'single'
    : 'dual';
  const stored = (typeof window !== 'undefined' && window.localStorage) ? (localStorage.getItem(LS_FLOW_KEY) || '') : '';
  const rawFlow = (searchParams.get('flow') || searchParams.get('mode') || stored || defaultFlow).toLowerCase();
  const flow = (rawFlow === 'dual' || rawFlow === 'single') ? rawFlow : 'single';
  console.debug('[PresencialConfirm] flow:', flow, 'path:', location.pathname);

  function setFlow(newFlow) {
    const f = (newFlow === 'dual') ? 'dual' : 'single';
    try { localStorage.setItem(LS_FLOW_KEY, f); } catch {}
    const basePath = `/presencial/${id}/confirm`;
    // Preservamos ?flow
    navigate(`${basePath}?flow=${f}`, { replace: true });
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("scenarios")
        .select("id, title, summary, level, status, estimated_minutes, mode")
        .eq("id", id)
        .maybeSingle();
      if (!mounted) return;
      if (!error) setSc(data);

      // Get current user id for session ownership
      try {
        const { data: authData, error: authErr } = await supabase.auth.getSession();
        if (!authErr && authData?.session?.user?.id && mounted) {
          setUserId(authData.session.user.id);
        }
      } catch {}

      // Cargar usuarios (profiles) para el selector de participantes
      try {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id, email, rol, nombre, apellidos, is_admin')
          .order('apellidos', { ascending: true, nullsFirst: false })
          .order('nombre', { ascending: true, nullsFirst: false });
        if (!pErr) {
          const mapped = (profs || []).map(p => {
            const rol = normalizeRole(p.rol);
            const nameLabel = [p.nombre, p.apellidos].filter(Boolean).join(' ').trim();
            const display = nameLabel || p.email || '';
            return { id: p.id, rol, label: display, nameLabel, email: p.email || '', is_admin: !!p.is_admin };
          }).filter(u => u.label);
          if (mounted) setUsers(mapped);
        } else {
          console.warn('[PresencialConfirm] No se pudieron cargar profiles:', pErr);
        }
      } catch (e) {
        console.warn('[PresencialConfirm] error cargando profiles:', e);
      }

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-600">Cargando…</div>;
  }
  if (!sc) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="mb-3">No se encontró el escenario.</p>
          <Link to={flow === 'dual' ? '/presencial/instructor' : '/presencial'} className="text-[#0A3D91] underline">Volver al listado</Link>
        </div>
      </div>
    );
  }

  const badge = estadoStyles[sc.status] || { label: sc.status || "Estado", color: "bg-slate-100 text-slate-700 ring-slate-200" };

  // Normaliza textos de rol a valores canónicos sin tildes
  function normalizeRole(txt) {
    const s = String(txt || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (!s) return '';
    if (s.includes('medic')) return 'medico';          // medico, médica, médico
    if (s.includes('enfer')) return 'enfermeria';      // enfermera, enfermería
    if (s.includes('farm')) return 'farmacia';         // farmacia, farmacéutic-
    if (s.includes('instr') || s.includes('tutor') || s.includes('docent')) return 'instructor';
    return '';
  }

  function usersForRole(role) {
    const r = normalizeRole(role);
    const list = users.map(u => ({ ...u, rol: normalizeRole(u.rol) }));
    if (r === 'instructor') {
      // Solo usuarios con is_admin=true pueden actuar como instructor
      return list.filter(u => u.is_admin);
    }
    // Filtro estricto: sólo usuarios cuyo rol coincide exactamente
    return list.filter(u => u.rol === r);
  }

  const ROLE_BADGE = {
    medico: { text: 'Médico/a', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    enfermeria: { text: 'Enfermería', color: 'bg-sky-50 text-sky-700 ring-sky-200' },
    farmacia: { text: 'Farmacia', color: 'bg-violet-50 text-violet-700 ring-violet-200' },
    instructor: { text: 'Instructor/a', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
  };

  const MIN_NAME = 2;
  const cleanParticipants = () => participants
    .map(p => ({
      role: String(p.role || '').toLowerCase(),
      name: (p.name || '').trim(),
      user_id: p.user_id || null,
    }))
    .filter(p => p.name.length >= MIN_NAME && ['medico','enfermeria','farmacia','instructor'].includes(p.role));

  async function handleStart() {
    setSubmitErr("");
    setSubmitting(true);
    // Defensive: if someone llega aquí con flow=dual pero no tiene sesión, simplemente seguimos;
    // la ruta protegida de instructor ya valida admin, esto es solo log de ayuda.
    console.debug('[PresencialConfirm] starting creation, flow =', flow);
    try {
      // 0) Preparar participantes limpios
      const pts = cleanParticipants();

      // 0.1) Extraer solo los user_id válidos para el array de la sesión
      // (ignoramos filas sin user_id; sirve para mostrar nombres manuales en instructor)
      const sessionParticipantIds = Array.from(
        new Set(
          pts
            .map(p => p.user_id)
            .filter(Boolean) // quita null/undefined
        )
      );

      // 1) Crear sesión con public_code y participants[]
      const public_code = Array(6)
        .fill(0)
        .map(() => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(Math.floor(Math.random() * 36)))
        .join("");

      const base = {
        scenario_id: sc.id,
        user_id: userId || null,
        public_code,
        // NUEVO: guardamos los UUIDs seleccionados en la propia sesión
        participants: sessionParticipantIds,
      };

      const { data: sdata, error: serr } = await supabase
        .from('presencial_sessions')
        .insert(base)
        .select('id, public_code')
        .single();
      if (serr) throw serr;
      const sessionId = sdata?.id;

      // 2) Insertar participantes detallados (nombre/rol) en tabla hija (opcional pero útil para informes)
      if (sessionId && pts.length > 0) {
        // intentar con user_id; si falla, reintentamos sin user_id
        let rows = pts.map(p => ({ session_id: sessionId, role: p.role, name: p.name, user_id: p.user_id || null }));
        let perr = null;
        try {
          const res = await supabase.from('presencial_participants').insert(rows);
          perr = res.error || null;
        } catch (e) { perr = e; }
        if (perr) {
          console.warn('[PresencialConfirm] insertar participantes con user_id falló; reintentando sin user_id:', perr);
          rows = pts.map(p => ({ session_id: sessionId, role: p.role, name: p.name }));
          const res2 = await supabase.from('presencial_participants').insert(rows);
          if (res2.error) console.warn('[PresencialConfirm] insertar participantes warning:', res2.error);
        }
      }

      // 3) Persistir localmente para recuperación
      const key = `presencial:last_session:${sc.id}`;
      try { localStorage.setItem(key, JSON.stringify({ ...base, id: sessionId, participants: pts })); } catch {}

      // 4) Navegar según flujo: 'single' (una pantalla) o 'dual' (instructor + alumnos)
      if (sessionId) {
        if (flow === 'single') {
          navigate(`/presencial/${sc.id}/escenario?session=${sessionId}`);
        } else {
          navigate(`/presencial/instructor/${sc.id}/${sessionId}`);
        }
        return;
      }

      // Fallback si no hay sessionId (muy raro)
      if (flow === 'single') {
        navigate(`/presencial/${sc.id}/escenario`);
      } else {
        navigate('/presencial/instructor');
      }
    } catch (e) {
      console.error('[PresencialConfirm] handleStart error:', e);
      setSubmitErr('No se pudo crear la sesión. ' + (e?.message || 'Puedes volver a intentarlo.'));
      // Fallback: guardar participantes locales y navegar al selector según flujo
      console.warn('[PresencialConfirm] fallback navigation due to error, flow =', flow);
      const key = `presencial:last_session:${sc.id}`;
      const pts = cleanParticipants();
      try { localStorage.setItem(key, JSON.stringify({ scenario_id: sc.id, participants: pts, user_id: userId || null })); } catch {}
      if (flow === 'single') { navigate(`/presencial/${sc.id}/escenario`); } else { navigate('/presencial/instructor'); }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      {/* Hero */}
      <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <p className="opacity-95">Simulación presencial · Confirmación</p>
          <h1 className="text-3xl md:text-4xl font-semibold">{sc.title}</h1>
          <p className="opacity-90 mt-1 max-w-3xl">{sc.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {typeof sc.estimated_minutes === "number" && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">~{sc.estimated_minutes} min</span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">Presencial</span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">
              {flow === 'dual' ? 'Dual · 2 pantallas' : 'Clásico · 1 pantalla'}
            </span>
          </div>
          <div className="mt-4 inline-flex rounded-lg ring-1 ring-white/30 overflow-hidden" role="tablist" aria-label="Selector de modo">
            <button
              type="button"
              role="tab"
              aria-selected={flow === 'single'}
              onClick={() => setFlow('single')}
              className={`px-3 py-1.5 text-sm font-medium transition ${flow === 'single' ? 'bg-white/90 text-[#0A3D91]' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              Clásico · 1 pantalla
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={flow === 'dual'}
              onClick={() => setFlow('dual')}
              className={`px-3 py-1.5 text-sm font-medium transition border-l border-white/30 ${flow === 'dual' ? 'bg-white/90 text-[#0A3D91]' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              Dual · 2 pantallas
            </button>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="mb-6 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {flow === 'dual' ? (
            <p><span className="font-semibold">Modo dual:</span> se generará un <em>código</em> para la pantalla del alumnado. Esta pantalla (consola) queda sólo para el instructor.</p>
          ) : (
            <p><span className="font-semibold">Modo clásico:</span> instructor y caso comparten el mismo dispositivo. No se genera código de proyección.</p>
          )}
        </div>
        {submitErr && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2">
            {submitErr}
          </div>
        )}
        {/* Estado */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        {/* Participantes */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-slate-900">Participantes</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Añade a tu equipo. Puedes escribir nombres libres o vincular usuarios del centro por rol.
          </p>

          {/* Selector rápido */}
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex items-center gap-2">
              {(['medico','enfermeria','farmacia','instructor']).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleToAdd(r)}
                  className={`px-3 py-1 rounded-full text-sm ring-1 transition ${roleToAdd===r ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'}`}
                >
                  {ROLE_BADGE[r]?.text || r}
                </button>
              ))}
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <div>
                <input
                  list={`users-${roleToAdd}`}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder={`Escribe un nombre o elige un usuario de ${ROLE_BADGE[roleToAdd]?.text.toLowerCase()}`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                />
                <datalist id={`users-${roleToAdd}`}>
                  {usersForRole(roleToAdd).map(u => (
                    <option key={u.id} value={u.label} />
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={addParticipantFromSearch}
                className="px-3 py-2 rounded-lg font-semibold text-white bg-[#1E6ACB] hover:opacity-90"
              >
                Añadir
              </button>
            </div>
          </div>

          {/* Lista actual con tarjetas compactas */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {participants.length === 0 && (
              <p className="text-sm text-slate-600">Aún no hay participantes. Añade al menos al instructor y, si lo deseas, al equipo clínico.</p>
            )}
            {participants.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ring-1 ${ROLE_BADGE[p.role]?.color || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{ROLE_BADGE[p.role]?.text || p.role}</span>
                    <span className="font-medium text-slate-900 truncate">{p.name || '—'}</span>
                  </div>
                  {p.user_id && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {(users.find(u => u.id === p.user_id)?.email) || ''}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={p.user_id || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setParticipants(arr => arr.map((it, i) => {
                        if (i !== idx) return it;
                        if (!val) return { ...it, user_id: undefined };
                        const u = users.find(x => x.id === val);
                        const label = u?.nameLabel || u?.label || '';
                        return { ...it, user_id: val, name: label || it.name };
                      }));
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="">(sin usuario)</option>
                    {usersForRole(p.role).map(u => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setParticipants(arr => arr.filter((_, i) => i !== idx))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ¿Cómo funciona? */}
        <h2 className="sr-only">Flujo de la sesión</h2>
        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <Card title="1) Equipo y roles">
            Define quién hará de <strong>médico</strong>, <strong>enfermería</strong> y de <strong>farmacéutico</strong>. 
            Puedes escribir nombres o vincular usuarios del centro. Los participantes quedarán reflejados en el informe.
          </Card>
          <Card title="2) Ejecución">
            Al comenzar irás a la consola del instructor: podrás <strong>iniciar/parar el cronómetro</strong>, 
            <strong> publicar mensajes del guion</strong> y <strong>mostrar/ocultar</strong> constantes, analíticas e imágenes (con aviso sonoro).
          </Card>
          <Card title="3) Desarrollo y checklist">
            Registra el circuito <strong>ABCDE</strong> (común a todos los casos), el <strong>paquete terapéutico específico</strong> de la patología y la 
            <strong> seguridad de medicación</strong> (5 correctos, dilución, velocidad…). Todo queda guardado para el informe.
          </Card>
          <Card title="4) Informe final">
            Al finalizar la sesión se genera un informe con <strong>participantes</strong>, <strong>cronometraje</strong>, 
            <strong> línea temporal de eventos</strong> y los resultados del <strong>checklist</strong>. Podrás imprimirlo o guardarlo como PDF.
          </Card>
        </section>

        <p className="mb-4 text-sm text-slate-600">
          Al pulsar <strong>Comenzar</strong> se creará una nueva sesión. 
          En modo <em>clásico</em> (1 pantalla) verás la consola y la pantalla del caso en el mismo dispositivo; 
          en modo <em>dual</em> (2 pantallas) se generará un <strong>código</strong> para proyectar la vista del alumnado.
        </p>
        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleStart}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg font-semibold transition hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6ACB] ${submitting ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'text-slate-900'}`}
            style={submitting ? undefined : { background: '#4FA3E3' }}
          >
            {submitting ? 'Creando sesión…' : 'Comenzar'}
          </button>
          <Link to={flow === 'dual' ? '/presencial/instructor' : '/presencial'} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white">
            Volver al listado
          </Link>
        </div>
      </main>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" role="region" aria-label={title}>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-700 text-sm text-justify leading-relaxed">{children}</p>
    </article>
  );
}