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

function HeroStat({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-sm min-w-[12rem]">
      <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
      <p className="text-xl font-semibold text-white leading-tight">{value}</p>
      {helper ? <p className="text-[11px] text-white/70 mt-1">{helper}</p> : null}
    </div>
  );
}

const ROLE_BADGE = {
  medico: { text: 'Médico/a', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  enfermeria: { text: 'Enfermería', color: 'bg-sky-50 text-sky-700 ring-sky-200' },
  farmacia: { text: 'Farmacia', color: 'bg-violet-50 text-violet-700 ring-violet-200' },
  instructor: { text: 'Instructor/a', color: 'bg-amber-50 text-amber-700 ring-amber-200' },
};

const ROLE_ORDER = ['instructor', 'medico', 'enfermeria', 'farmacia'];

function getRoleLabel(role) {
  return ROLE_BADGE[role]?.text || role;
}

function formatLevelLabel(raw) {
  const key = String(raw || '').toLowerCase();
  if (!key) return '—';
  if (key.includes('bas')) return 'Básico';
  if (key.includes('med')) return 'Intermedio';
  if (key.includes('avan')) return 'Avanzado';
  return key[0].toUpperCase() + key.slice(1);
}

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
  const [existingSession, setExistingSession] = useState(null); // sesión abierta (no finalizada)
  const lockActive = !!existingSession; // bloquear edición si hay sesión en curso
  const [roleToAdd, setRoleToAdd] = useState('medico');
  const [searchText, setSearchText] = useState('');
  const LS_FLOW_KEY = 'presencial:confirm:flow';

  function addParticipantFromSearch() {
    if (lockActive) return; // bloqueado por sesión en curso
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
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id || !userId) return; // necesitamos escenario y usuario
      // Busca una sesión abierta (sin finalizar) creada por este usuario para este escenario
      const { data: sess, error: sErr } = await supabase
        .from('presencial_sessions')
        .select('id, public_code')
        .eq('scenario_id', id)
        .eq('user_id', userId)
        .is('ended_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!mounted) return;
      if (!sErr && sess) setExistingSession(sess);
      else setExistingSession(null);
    })();
    return () => { mounted = false; };
  }, [id, userId]);
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

  const participantCounts = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = participants.filter((p) => p.role === role).length;
    return acc;
  }, {});

  const totalParticipants = participants.length;
  const missingRoles = ROLE_ORDER.filter((role) => role !== 'instructor' && participantCounts[role] === 0);
  const instructorMissing = participantCounts['instructor'] === 0;
  const estimatedLabel = typeof sc.estimated_minutes === 'number' ? `~${sc.estimated_minutes} min` : 'Variable';
  const heroStats = [
    {
      key: 'mode',
      label: 'Modo seleccionado',
      value: flow === 'dual' ? 'Dual · 2 pantallas' : 'Clásico · 1 pantalla',
      helper: lockActive ? 'Hay una sesión en curso' : 'Puedes cambiarlo en cualquier momento',
    },
    {
      key: 'estado',
      label: 'Estado del escenario',
      value: badge.label,
      helper: 'Disponibilidad actual del caso',
    },
    {
      key: 'duracion',
      label: 'Duración estimada',
      value: estimatedLabel,
      helper: 'Incluye briefing y checklist',
    },
    {
      key: 'equipo',
      label: 'Equipo preparado',
      value: `${totalParticipants} participante${totalParticipants === 1 ? '' : 's'}`,
      helper: missingRoles.length
        ? `Pendiente: ${missingRoles.map((r) => getRoleLabel(r)).join(', ')}`
        : instructorMissing
        ? 'Añade quién actuará como instructor'
        : 'Roles principales cubiertos',
    },
  ];

  const participantSummaryChips = ROLE_ORDER.map((role) => (
    <span
      key={role}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ring-1 ${ROLE_BADGE[role]?.color || 'bg-slate-100 text-slate-700 ring-slate-200'}`}
    >
      {getRoleLabel(role)}: {participantCounts[role] || 0}
    </span>
  ));

  const steps = [
    {
      title: '1) Configura el equipo',
      body: 'Selecciona quién asumirá cada rol. Puedes escribir nombres manualmente o vincular perfiles existentes.',
    },
    {
      title: '2) Revisa el escenario',
      body: 'El instructor controla la consola: cronómetro, checklist, mensajes del guion y publicaciones en pantalla.',
    },
    {
      title: '3) Ejecuta y registra',
      body: 'Durante la simulación marca actuaciones ABCDE, intervenciones farmacológicas y seguridad del medicamento.',
    },
    {
      title: '4) Obtén el informe',
      body: 'Al finalizar se genera un informe con tiempos, checklist y participantes que puedes guardar o imprimir.',
    },
  ];

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
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-6xl mx-auto px-5 py-12 text-white relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-white/70 text-sm uppercase tracking-wide">Simulación presencial</p>
              <h1 className="text-3xl md:text-4xl font-semibold leading-snug">{sc.title}</h1>
              <p className="opacity-95 max-w-3xl text-lg">{sc.summary || 'Prepara tu equipo y confirma la sesión antes de comenzar.'}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">Escenario presencial</span>
                <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">Nivel {formatLevelLabel(sc.level)}</span>
                <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30">{flow === 'dual' ? 'Dual · 2 pantallas' : 'Clásico · 1 pantalla'}</span>
                {lockActive && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 ring-1 ring-amber-300">Sesión en curso</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm lg:max-w-md">
              {heroStats.map((stat) => (
                <HeroStat key={stat.key} label={stat.label} value={stat.value} helper={stat.helper} />
              ))}
            </div>
          </div>
          <div className="mt-6 inline-flex rounded-lg ring-1 ring-white/30 overflow-hidden" role="tablist" aria-label="Selector de modo">
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

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        {submitErr && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3">
            {submitErr}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InfoCard title="Resumen del escenario">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <ul className="space-y-2 text-sm text-slate-600 leading-relaxed">
              <li><strong>Duración estimada:</strong> {estimatedLabel}</li>
              <li><strong>Nivel:</strong> {formatLevelLabel(sc.level)}</li>
              <li>
                <strong>Modo actual:</strong> {flow === 'dual' ? 'Dual · 2 pantallas' : 'Clásico · 1 pantalla'}.
                {flow === 'dual'
                  ? ' Se generará un código para la pantalla del alumnado y esta consola quedará para la persona instructora.'
                  : ' Instructor y caso comparten el mismo dispositivo, sin código adicional.'}
              </li>
              <li>Revisa el equipo y pulsa <em>Comenzar</em> para generar una nueva sesión.</li>
            </ul>
          </InfoCard>

          <InfoCard title="Equipo planificado">
            <div className="flex flex-wrap gap-2 mb-3">
              {participantSummaryChips}
            </div>
            <p className="text-sm text-slate-600">
              {totalParticipants === 0
                ? 'Añade los roles que participarán en la simulación.'
                : missingRoles.length
                ? `Aún faltan: ${missingRoles.map((r) => getRoleLabel(r)).join(', ')}.`
                : instructorMissing
                ? 'Añade quién actuará como instructor.'
                : 'Roles principales cubiertos.'}
            </p>
            {lockActive && (
              <p className="text-sm text-amber-600 mt-2">
                Tienes una sesión abierta para este escenario. Puedes retomarla o iniciar una nueva desde este panel.
              </p>
            )}
          </InfoCard>
        </section>

        {lockActive && existingSession && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold">Sesión en curso detectada</p>
              <p className="text-sm opacity-90">Mientras esté activa no podrás editar el equipo. Puedes retomarla o crear una nueva si lo necesitas.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (flow === 'single') navigate(`/presencial/${sc.id}/escenario?session=${existingSession.id}`);
                else navigate(`/presencial/instructor/${sc.id}/${existingSession.id}`);
              }}
              className="px-4 py-2 rounded-lg font-semibold text-white bg-[#1E6ACB] hover:opacity-90"
            >
              Ir a la sesión en curso
            </button>
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.35)] px-6 py-6 space-y-5" aria-labelledby="titulo-participantes">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h2 id="titulo-participantes" className="text-xl font-semibold text-slate-900">Equipo participante</h2>
              <p className="text-sm text-slate-600 mt-1">Asigna quién actuará en cada rol. Puedes vincular usuarios reales o escribir un nombre manualmente.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                {totalParticipants} participante{totalParticipants === 1 ? '' : 's'} en la lista
              </span>
              {missingRoles.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                  Faltan: {missingRoles.map((r) => getRoleLabel(r)).join(', ')}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Selecciona el rol a añadir">
              {ROLE_ORDER.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { if (!lockActive) setRoleToAdd(r); }}
                  className={`px-3 py-1 rounded-full text-sm ring-1 transition ${
                    lockActive
                      ? 'bg-slate-100 text-slate-400 ring-slate-200 cursor-not-allowed'
                      : (roleToAdd === r ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50')
                  }`}
                >
                  {getRoleLabel(r)}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <input
                  list={`users-${roleToAdd}`}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={`Escribe un nombre o elige un usuario de ${getRoleLabel(roleToAdd).toLowerCase()}`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={lockActive}
                />
                <datalist id={`users-${roleToAdd}`}>
                  {usersForRole(roleToAdd).map((u) => (
                    <option key={u.id} value={u.label} />
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={addParticipantFromSearch}
                disabled={lockActive}
                className={`px-3 py-2 rounded-lg font-semibold text-white ${lockActive ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#1E6ACB] hover:opacity-90'}`}
              >
                Añadir
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {participants.length === 0 && (
              <p className="text-sm text-slate-600">Aún no hay participantes. Añade al menos a la persona instructora y, si lo deseas, al equipo clínico.</p>
            )}
            {participants.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ring-1 ${ROLE_BADGE[p.role]?.color || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{getRoleLabel(p.role)}</span>
                    <span className="font-medium text-slate-900 truncate">{p.name || '—'}</span>
                  </div>
                  {p.user_id && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {(users.find((u) => u.id === p.user_id)?.email) || ''}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={p.user_id || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setParticipants((arr) => arr.map((it, i) => {
                        if (i !== idx) return it;
                        if (!val) return { ...it, user_id: undefined };
                        const u = users.find((x) => x.id === val);
                        const label = u?.nameLabel || u?.label || '';
                        return { ...it, user_id: val, name: label || it.name };
                      }));
                    }}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={lockActive}
                  >
                    <option value="">(sin usuario)</option>
                    {usersForRole(p.role).map((u) => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setParticipants((arr) => arr.filter((_, i) => i !== idx))}
                    disabled={lockActive}
                    className={`px-2.5 py-1.5 rounded-lg border text-slate-700 text-sm ${lockActive ? 'border-slate-200 bg-slate-100 cursor-not-allowed' : 'border-slate-300 hover:bg-slate-50'}`}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, idx) => (
            <StepCard key={step.title} title={step.title} number={idx + 1}>
              {step.body}
            </StepCard>
          ))}
        </section>

        <p className="text-sm text-slate-600">
          Al pulsar <strong>Comenzar</strong> se creará una nueva sesión. En modo <em>clásico</em> verás la consola y la pantalla del caso en el mismo dispositivo; en modo <em>dual</em> se generará un <strong>código</strong> para compartir la vista del alumnado.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              if (lockActive && existingSession) {
                if (flow === 'single') navigate(`/presencial/${sc.id}/escenario?session=${existingSession.id}`);
                else navigate(`/presencial/instructor/${sc.id}/${existingSession.id}`);
              } else {
                handleStart();
              }
            }}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg font-semibold transition hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6ACB] ${
              submitting ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'text-white'
            }`}
            style={submitting ? undefined : { background: lockActive ? '#0A3D91' : '#4FA3E3' }}
          >
            {submitting ? 'Creando sesión…' : (lockActive ? 'Ir a la sesión en curso' : 'Comenzar')}
          </button>
          <Link to={flow === 'dual' ? '/presencial/instructor' : '/presencial'} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white">
            Volver al listado
          </Link>
        </div>
      </main>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white shadow-[0_18px_36px_-28px_rgba(15,23,42,0.35)] px-6 py-5 space-y-3" role="region" aria-label={title}>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
    </article>
  );
}

function StepCard({ title, number, children }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm" role="region" aria-label={title}>
      <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0A3D91]/10 text-[#0A3D91] text-xs font-bold">{number}</span>
        {title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </article>
  );
}
