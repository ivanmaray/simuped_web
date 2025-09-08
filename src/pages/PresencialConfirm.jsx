// src/pages/PresencialConfirm.jsx
import { Link, useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

const estadoStyles = {
  "Disponible": { label: "Disponible", color: "bg-[#0A3D91]/10 text-[#0A3D91] ring-[#0A3D91]/20" },
  "En construcción: en proceso": { label: "En construcción: en proceso", color: "bg-[#4FA3E3]/10 text-[#1E6ACB] ring-[#1E6ACB]/20" },
  "En construcción: sin iniciar": { label: "En construcción: sin iniciar", color: "bg-slate-200 text-slate-600 ring-slate-300" },
};

export default function PresencialConfirm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sc, setSc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [submitErr, setSubmitErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [users, setUsers] = useState([]); // perfiles (profiles) de Supabase
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // Si vienes por la ruta de 1 pantalla (/presencial/..), el flujo por defecto es 'single'.
  // Si vienes por rutas de instructor (/presencial/instructor/..), el defecto es 'dual'.
  const defaultFlow = (location.pathname.startsWith('/presencial/') && !location.pathname.includes('/presencial/instructor'))
    ? 'single'
    : 'dual';
  const rawFlow = (searchParams.get('flow') || searchParams.get('mode') || defaultFlow).toLowerCase();
  const flow = (rawFlow === 'dual' || rawFlow === 'single') ? rawFlow : 'single';
  console.debug('[PresencialConfirm] flow:', flow, 'path:', location.pathname);

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
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">
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
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="text-lg font-semibold text-slate-900">Participantes</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setParticipants(arr => [...arr, { role: 'medico', name: '' }])} className="px-2.5 py-1 rounded-lg text-sm ring-1 ring-slate-200 hover:bg-slate-50">+ Médico/a</button>
              <button type="button" onClick={() => setParticipants(arr => [...arr, { role: 'enfermeria', name: '' }])} className="px-2.5 py-1 rounded-lg text-sm ring-1 ring-slate-200 hover:bg-slate-50">+ Enfermería</button>
              <button type="button" onClick={() => setParticipants(arr => [...arr, { role: 'farmacia', name: '' }])} className="px-2.5 py-1 rounded-lg text-sm ring-1 ring-slate-200 hover:bg-slate-50">+ Farmacia</button>
              <button type="button" onClick={() => setParticipants(arr => [...arr, { role: 'instructor', name: '' }])} className="px-2.5 py-1 rounded-lg text-sm ring-1 ring-slate-200 hover:bg-slate-50">+ Instructor/a</button>
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-3">
            Añade tantas personas como quieras. Puedes dejarlo vacío si aún no están asignados.
            Para <span className="font-medium">Médico/Enfermería/Farmacia</span> el listado muestra sólo usuarios con ese rol en su perfil.
            En <span className="font-medium">Instructor</span> puedes elegir a cualquier usuario.
          </p>
          <div className="space-y-3">
            {participants.map((p, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2 items-center">
                <select
                  value={p.role}
                  onChange={e => setParticipants(arr => arr.map((it, i) => i === idx ? { ...it, role: e.target.value } : it))}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="medico">Médico/a</option>
                  <option value="enfermeria">Enfermería</option>
                  <option value="farmacia">Farmacia</option>
                  <option value="instructor">Instructor/a</option>
                </select>
                <input
                  value={p.name}
                  onChange={e => setParticipants(arr => arr.map((it, i) => i === idx ? { ...it, name: e.target.value, user_id: undefined } : it))}
                  placeholder="Nombre y apellidos"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]"
                />
                <div>
                  <select
                    value={p.user_id || ''}
                    onChange={e => {
                      const val = e.target.value;
                      setParticipants(arr => arr.map((it, i) => {
                        if (i !== idx) return it;
                        if (!val) return { ...it, user_id: undefined };
                        const u = users.find(x => x.id === val);
                        const label = u?.nameLabel || u?.label || '';
                        const urol = normalizeRole(u?.rol);
                        const current = normalizeRole(it.role);
                        // Si la fila es "instructor", mantenemos el rol tal cual (no lo forzamos por el perfil)
                        const nextRole = current === 'instructor'
                          ? it.role
                          : (urol && ['medico','enfermeria','farmacia','instructor'].includes(urol) ? urol : it.role);
                        return { ...it, user_id: val, name: label || it.name, role: nextRole };
                      }));
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="">Elegir usuario (opcional)</option>
                    {usersForRole(p.role).map(u => (
                      <option key={u.id} value={u.id}>
                        {u.label}{u.email ? ` — ${u.email}` : ''}
                      </option>
                    ))}
                  </select>
                  {p.user_id && (() => { const u = users.find(x => x.id === p.user_id); return u?.email ? <div className="sm:col-span-2"><span className="text-xs text-slate-500">{u.email}</span></div> : null; })()}
                </div>
                <button
                  type="button"
                  onClick={() => setParticipants(arr => arr.filter((_, i) => i !== idx))}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Eliminar
                </button>
              </div>
            ))}
            <div>
              <button
                type="button"
                onClick={() => setParticipants(arr => [...arr, { role: 'medico', name: '' }])}
                className="w-full sm:w-auto px-3 py-2 rounded-lg font-semibold text-slate-900"
                style={{ background: '#4FA3E3' }}
              >
                Añadir participante
              </button>
            </div>
          </div>
          {users.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">No pudimos cargar usuarios. Puede que falte una política de lectura en <code className="font-mono">profiles</code> o que aún no existan perfiles. Puedes escribir los nombres manualmente.</p>
          )}
        </section>

        {/* ¿Cómo funciona? */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <Card title="1) Roles del equipo">
            Asigna roles (opcional) y nombres para tener a todos identificados desde el inicio.
          </Card>
          <Card title="2) Seguridad y cronómetro">
            En el Toolkit tendrás <strong>checklist ABCDE</strong> y <strong>cronómetro</strong> para guiar la sesión.
          </Card>
          <Card title="3) Medicación y debrief">
            También encontrarás <strong>5 correctos de medicación</strong> y <strong>debrief</strong> con notas exportables.
          </Card>
        </section>

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
      <p className="text-slate-700 text-sm">{children}</p>
    </article>
  );
}