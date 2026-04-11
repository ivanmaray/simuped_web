// src/pages/Dashboard.jsx
import React from "react";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";
import BadgeDisplay from "../../../components/BadgeDisplay.jsx";
import { useAuth } from "../../../auth";
import { reportError, reportWarning } from "../../../utils/reporting.js";
import { calculateBadgeProgress, MEDICAL_BADGES } from "../../../utils/badgeSystem.js";
import {
  UsersIcon,
  DevicePhoneMobileIcon,
  ChartBarIcon,
  AcademicCapIcon,
  ArrowsRightLeftIcon,
  PlayCircleIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  TrophyIcon,
  UsersIcon as UsersIconOutline,
  BellIcon
} from "@heroicons/react/24/outline";
import AdvancedCalendar from "../../../components/AdvancedCalendar.jsx";
import NotificationSettings from "../../../components/NotificationSettings.jsx";
import {
  showToastNotification,
  getNotificationPreferences,
  notifyBadgeEarned,
  notifyFeedbackAvailable,
  notifyActivityReminder,
  scheduleNotification
} from "../../../utils/notificationService.js";

/* -------------------- formatters -------------------- */
export function formatLevel(level) {
  const key = String(level || '').toLowerCase();
  const map = { basico: 'Básico', básico: 'Básico', medio: 'Medio', avanzado: 'Avanzado' };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : '');
}
export function formatMode(mode) {
  const key = String(mode || '').toLowerCase();
  const map = { online: 'Online', presencial: 'Presencial' };
  return map[key] || (key ? key[0].toUpperCase() + key.slice(1) : '');
}
export function formatRole(rol) {
  const key = String(rol || '').toLowerCase();
  if (key.includes('medic')) return 'Médico';
  if (key.includes('enfer')) return 'Enfermería';
  if (key.includes('farm')) return 'Farmacia';
  return key ? key[0].toUpperCase() + key.slice(1) : '';
}

function formatDateHuman(dateISO) {
  if (!dateISO) return "Sin registros";
  try {
    const date = new Date(dateISO);
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return "Sin registros";
  }
}
/* ---------------------------------------------------- */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[Dashboard ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="max-w-xl mx-auto p-6 rounded-xl border border-red-200 bg-red-50 text-red-800">
            <h2 className="text-lg font-semibold mb-2">Se ha producido un error en el panel</h2>
            <p className="text-sm">{String(this.state.error?.message || "Error inesperado")}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Principal_Dashboard() {
  const navigate = useNavigate();
  const { ready, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Perfil
  const [nombre, setNombre] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLabel, setRoleLabel] = useState("");

  // Escenarios + filtros (si quieres mostrar un rápido conteo o futuras vistas)
  const [escenarios, setEscenarios] = useState([]);
  const [loadingEsc, setLoadingEsc] = useState(false);
  const [stats, setStats] = useState({
    onlineAttempted: 0,
    onlineTotal: 0,
    presencialAttempted: 0,
    presencialTotal: 0,
    recentScenario: null,
    recentDate: null,
  });
  // Presencial: avisos por email (sin consultar sesiones hasta que esté el esquema)
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [scheduledSessions, setScheduledSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showPresencialModal, setShowPresencialModal] = useState(false);
  const [levelStats, setLevelStats] = useState({ basico: { attempted: 0, total: 0 }, medio: { attempted: 0, total: 0 }, avanzado: { attempted: 0, total: 0 } });

  useEffect(() => {
    let mounted = true;

    // Seguro anti-cuelgue: si algo tarda más de 12 s, limpia el spinner
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false);
        setErrorMsg("No se pudo cargar el panel. Comprueba tu conexión e intenta recargar.");
      }
    }, 12000);

    async function init() {
      if (!ready) return; // espera a que AuthProvider resuelva
      try {
        if (!session) {
          setLoading(false);
          // Si se cayó la sesión, volvemos al inicio
          navigate("/", { replace: true });
          return;
        }

        // Cargar perfil (no bloqueante si falla)
        try {
          const { data: prof, error: pErr } = await supabase
            .from("profiles")
            .select("nombre, rol, is_admin")
            .eq("id", session.user.id)
            .maybeSingle();

          if (pErr) {
            reportWarning("Dashboard.profile", pErr, { userId: session.user.id });
          }

          setNombre(prof?.nombre ?? session.user?.user_metadata?.nombre ?? "");
          const roleValue = (prof?.rol ?? session.user?.user_metadata?.rol ?? "").toString();
          setRoleLabel(roleValue);
          setIsAdmin(Boolean(prof?.is_admin ?? session.user?.user_metadata?.is_admin ?? session.user?.app_metadata?.is_admin ?? false));
        } catch (err) {
          reportWarning("Dashboard.profile.catch", err, { userId: session.user.id });
        }

        await cargarEscenarios();
        cargarSesionesProgramadas(); // no bloqueante — carga el calendario en segundo plano
      } catch (e) {
        reportError("Dashboard.init", e, { userId: session?.user?.id });
        setErrorMsg(e?.message || "Error inicializando el panel");
      } finally {
        clearTimeout(safetyTimer);
        if (mounted) setLoading(false);
      }
    }

    async function cargarSesionesProgramadas() {
      setLoadingSessions(true);
      try {
        // Load upcoming sessions for calendar display
        const { data: sessions, error } = await supabase
          .from("scheduled_sessions")
          .select(`
            id,
            title,
            description,
            scheduled_at,
            location,
            max_participants,
            mode,
            scenario_id,
            is_active,
            enrollment_deadline
          `)
          .eq("is_active", true)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(10); // Limitar resultados para performance

        if (error) throw error;

        // Get participant counts in a single query instead of N+1
        const sessionIds = (sessions || []).map(s => s.id);
        let countMap = {};
        if (sessionIds.length > 0) {
          try {
            const { data: countRows } = await supabase
              .from("scheduled_session_participants")
              .select("session_id, count:id.count()")
              .in("session_id", sessionIds);
            countMap = Object.fromEntries(
              (countRows || []).map(r => [r.session_id, Number(r.count) || 0])
            );
          } catch (err) {
            console.warn("Error getting participant counts:", err);
          }
        }
        const sessionsWithCounts = (sessions || []).map(s => ({
          ...s,
          registered_count: countMap[s.id] ?? 0,
          scheduled_at: new Date(s.scheduled_at)
        }));

        setScheduledSessions(sessionsWithCounts);
      } catch (e) {
        console.warn("Dashboard.cargarSesionesProgramadas:", e);
        setScheduledSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    }

    async function cargarEscenarios() {
      setLoadingEsc(true);
      setErrorMsg("");

      try {
    const normalizeMode = (mode) => {
      const arr = Array.isArray(mode) ? mode : mode ? [mode] : [];
      return arr.map((m) => String(m || '').toLowerCase());
    };

        const { data: attemptsRaw, error: attemptsError } = await supabase
          .from("attempts")
          .select(`
            id,
            scenario_id,
            started_at,
            finished_at,
            status,
            scenarios (
              title,
              summary,
              level,
              mode,
              estimated_minutes,
              max_attempts
            )
          `)
          .eq("user_id", session.user.id)
          .order("started_at", { ascending: false })
          .abortSignal(AbortSignal.timeout(8000));

        if (attemptsError) {
          reportError("Dashboard.attempts", attemptsError);
          throw attemptsError;
        }

        const attemptsByScenario = new Map();
        for (const row of attemptsRaw || []) {
          const scenarioId = row?.scenario_id;
          if (!scenarioId) continue;
          const scenario = row?.scenarios || {};
          const modeNormalized = normalizeMode(scenario.mode);

          if (!attemptsByScenario.has(scenarioId)) {
            attemptsByScenario.set(scenarioId, {
              id: scenarioId,
              scenario_id: scenarioId,
              title: scenario.title ?? `Escenario ${scenarioId}`,
              summary: scenario.summary ?? "",
              level: scenario.level ?? null,
              mode: scenario.mode ?? null,
              mode_normalized: modeNormalized,
              estimated_minutes: scenario.estimated_minutes ?? null,
              max_attempts: scenario.max_attempts ?? null,
              attempts_count: 0,
              last_started_at: null,
            });
          }

          const entry = attemptsByScenario.get(scenarioId);
          entry.mode_normalized = modeNormalized;
          entry.attempts_count = (entry.attempts_count ?? 0) + 1;

          const attemptTime = row?.started_at || row?.finished_at || null;
          if (attemptTime) {
            const current = entry.last_started_at ? new Date(entry.last_started_at) : null;
            const next = new Date(attemptTime);
            if (!current || next > current) {
              entry.last_started_at = attemptTime;
            }
          }
        }

        const attemptsWithData = Array.from(attemptsByScenario.values())
          .filter((row) => (row?.attempts_count ?? 0) > 0)
          .sort((a, b) => {
            const aDate = a.last_started_at ? new Date(a.last_started_at).getTime() : 0;
            const bDate = b.last_started_at ? new Date(b.last_started_at).getTime() : 0;
            return bDate - aDate;
          });

        setEscenarios(attemptsWithData);

        const onlineAttempted = attemptsWithData.filter((row) => (row.mode_normalized || []).includes('online')).length;
        const presencialAttempted = attemptsWithData.filter((row) => (row.mode_normalized || []).includes('presencial')).length;
        const recentRow = attemptsWithData[0] ?? null;

        const { data: totalScenarios, error: totalError } = await supabase
          .from("scenarios")
          .select("id, mode, level")
          .abortSignal(AbortSignal.timeout(8000));

        if (totalError) {
          reportWarning("Dashboard.scenarioTotals", totalError);
        }

        const allScenarios = (totalScenarios || []).map((row) => normalizeMode(row.mode));
        const onlineTotal = allScenarios.filter((modes) => modes.includes('online')).length;
        const presencialTotal = allScenarios.filter((modes) => modes.includes('presencial')).length;

        // Level stats
        const normalizeLevel = (lvl) => {
          const k = String(lvl || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (k === 'basico') return 'basico';
          if (k === 'medio') return 'medio';
          if (k === 'avanzado') return 'avanzado';
          return null;
        };
        const levelTotals = { basico: 0, medio: 0, avanzado: 0 };
        for (const row of totalScenarios || []) {
          const lvl = normalizeLevel(row.level);
          if (lvl) levelTotals[lvl]++;
        }
        const levelAttempted = { basico: 0, medio: 0, avanzado: 0 };
        for (const sc of attemptsWithData) {
          const lvl = normalizeLevel(sc.level);
          if (lvl) levelAttempted[lvl]++;
        }
        setLevelStats({
          basico:   { attempted: levelAttempted.basico,   total: levelTotals.basico   },
          medio:    { attempted: levelAttempted.medio,    total: levelTotals.medio    },
          avanzado: { attempted: levelAttempted.avanzado, total: levelTotals.avanzado },
        });

        setStats({
          onlineAttempted,
          onlineTotal: onlineTotal || onlineAttempted,
          presencialAttempted,
          presencialTotal: presencialTotal || presencialAttempted,
          recentScenario: recentRow?.title ?? null,
          recentDate: recentRow?.last_started_at ?? null,
        });
      } catch (e) {
        reportError("Dashboard.cargarEscenarios", e);
        setEscenarios([]);
        setErrorMsg(e?.message || "Error cargando el panel");
      } finally {
        setLoadingEsc(false);
      }
    }

    init();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, [ready, session, navigate]);

  async function handleNotify() {
    setNotifyLoading(true);
    setNotifyMsg("");
    try {
      const { error } = await supabase
        .from("presencial_notifications")
        .upsert(
          { user_id: session.user.id, email: session?.user?.email ?? "", created_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      setNotifyMsg("¡Listo! Te avisaremos por email cuando se programe la próxima sesión.");
    } catch (e) {
      reportWarning("Dashboard.notify", e, { userId: session?.user?.id });
      setNotifyMsg("No pude activar el aviso (puede faltar la tabla 'presencial_notifications').");
    } finally {
      setNotifyLoading(false);
    }
  }

  if (!ready || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: '#f8f9fb'}}>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="h-4 w-4 border-2 border-slate-300 border-t-[#0A3D91]/60 rounded-full animate-spin" />
          Cargando panel…
        </div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: '#f8f9fb'}}>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-800" style={{letterSpacing: '-0.02em'}}>No has iniciado sesión</h1>
          <p className="text-slate-400 text-sm mt-2">Por favor, vuelve a la página de inicio para acceder.</p>
          <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg text-sm border border-slate-200 hover:bg-slate-50 transition text-slate-600">Ir al inicio</a>
        </div>
      </div>
    );
  }

  const email = session?.user?.email ?? "";

  return (
    <ErrorBoundary>
      <div className="min-h-screen text-slate-900" style={{background: '#f8f9fb'}}>
        {errorMsg && (
          <div className="bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 text-sm">
            {errorMsg}
          </div>
        )}

        <Navbar />
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/10">
          {/* Fondo degradado enriquecido con noise sutil */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_45%)]" />

          <div className="max-w-6xl mx-auto px-5 py-6 text-white relative">
            {/* Greeting compacto */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <div>
                <p className="text-[11px] text-white/45 uppercase tracking-widest font-medium mb-0.5" style={{letterSpacing:'0.14em'}}>Panel · SimuPed</p>
                <h1 className="text-2xl font-semibold text-white leading-tight" style={{letterSpacing:'-0.02em'}}>
                  {nombre ? `Hola, ${nombre}` : "Tu panel clínico"}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                {roleLabel ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ring-1 text-white/90"
                    style={{background:'rgba(79,163,227,0.18)', borderColor:'rgba(79,163,227,0.35)'}}>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-300/80" />
                    {formatRole(roleLabel)}
                  </span>
                ) : null}
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1"
                    style={{background:'rgba(250,204,21,0.15)', borderColor:'rgba(250,204,21,0.35)', color:'rgba(253,224,71,0.95)'}}>
                    Admin
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-0">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <MetricCard
                icon={ChartBarIcon}
                label="Online realizados"
                value={`${stats.onlineAttempted}/${stats.onlineTotal || stats.onlineAttempted || 0}`}
                helper={stats.onlineAttempted ? `${stats.onlineAttempted} escenarios completados` : "Sin intentos aún"}
                chart={<ProgressChart progress={stats.onlineTotal ? (stats.onlineAttempted / stats.onlineTotal) * 100 : 0} />}
              />
              <MetricCard
                icon={UsersIcon}
                label="Presenciales realizados"
                value={`${stats.presencialAttempted}/${stats.presencialTotal || stats.presencialAttempted || 0}`}
                helper={stats.presencialAttempted ? `${stats.presencialAttempted} escenarios completados` : "Sin intentos aún"}
                chart={<ProgressChart progress={stats.presencialTotal ? (stats.presencialAttempted / stats.presencialTotal) * 100 : 0} />}
              />
              <MetricCard
                icon={CalendarDaysIcon}
                label="Último escenario"
                value={stats.recentScenario || "—"}
                helper={stats.recentDate ? formatDateHuman(stats.recentDate) : "Sin intentos todavía"}
              />
              <MetricCard
                icon={TrophyIcon}
                label="Logros"
                value={getAchievementLevel(stats.onlineAttempted, stats.presencialAttempted).icon + " " + getAchievementLevel(stats.onlineAttempted, stats.presencialAttempted).title}
                helper={getAchievementLevel(stats.onlineAttempted, stats.presencialAttempted).description}
              />
            </div>


            </div>
          </div>
        </section>

        <main className="max-w-6xl mx-auto px-5 py-10">
          {/* Accesos rápidos */}
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-semibold text-slate-900" style={{letterSpacing: '-0.02em'}}>Simulación online</h2>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Card
              title="Casos clínicos"
              description="Elige un escenario pediátrico y practica la toma de decisiones a tu ritmo."
              to="/simulacion"
              icon={DevicePhoneMobileIcon}
            />
            {isAdmin ? (
              <Card
                title="Casos rápidos"
                description="Microcasos breves adaptados a tu rol profesional. Decisiones clínicas con feedback inmediato."
                to="/entrenamiento-rapido"
                badge="En desarrollo"
                badgeColor="bg-amber-100 text-amber-700"
                icon={ArrowsRightLeftIcon}
              />
            ) : null}
            {isAdmin ? (
              <Card
                title="Simulación virtual"
                description="Simulación completa por fases: exploración, hipótesis, intervenciones y alta. Con vitales y puntuación."
                to="/entrenamiento-interactivo"
                badge="En desarrollo"
                badgeColor="bg-amber-100 text-amber-700"
                icon={PlayCircleIcon}
              />
            ) : null}
          </section>

          {/* Simulación presencial (modos + acciones) */}
          <section id="presencial" className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-semibold text-slate-900" style={{letterSpacing: '-0.02em'}}>Simulación presencial</h2>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <article className="relative rounded-2xl border bg-white p-6 shadow-sm" style={{borderColor: 'rgba(0,0,0,0.08)', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 4px 16px, rgba(0,0,0,0.03) 0px 16px 32px -8px'}}>
              <div className="flex items-center gap-3 mb-6">
                <div className="shrink-0 h-10 w-10 rounded-xl grid place-items-center" style={{background: 'rgba(10,61,145,0.08)'}}>
                  <UsersIcon className="h-5 w-5 text-[#0A3D91]" />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-700">Sesiones del mes</p>
                  {isAdmin && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700">Instructor</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_310px] gap-6 items-start">
                {/* Acciones */}
                <div className="space-y-3">
                  {isAdmin ? (
                    <>
                      <Link
                        to="/presencial/flow/dual"
                        className="block w-full px-4 py-2.5 rounded-xl text-center font-semibold text-white bg-gradient-to-r from-[#0A3D91] to-[#1E6ACB] shadow hover:shadow-lg hover:-translate-y-0.5 transition"
                      >
                        Nueva simulación
                      </Link>
                      <div className="flex flex-col gap-2">
                        <Link
                          to="/sesiones-programadas"
                          className="w-full px-4 py-2 rounded-lg text-center font-medium text-white bg-[#0A3D91] hover:bg-[#0A3D91]/90 transition shadow text-sm"
                        >
                          Gestión de sesiones
                        </Link>
                        <Link
                          to="/presencial"
                          className="w-full px-4 py-2 rounded-lg text-center font-medium text-[#0A3D91] ring-1 ring-[#0A3D91]/20 bg-white hover:bg-[#0A3D91]/5 transition text-sm"
                        >
                          Consola clásica
                        </Link>
                        <button
                          onClick={() => setShowNotificationSettings(true)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-sm text-slate-600"
                        >
                          <BellIcon className="w-4 h-4" />
                          Notificaciones
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/sesiones-programadas"
                        className="block w-full px-4 py-2.5 rounded-lg text-center font-medium text-white bg-[#0A3D91] hover:bg-[#0A3D91]/90 transition shadow"
                      >
                        Ver sesiones programadas
                      </Link>
                      <button
                        type="button"
                        onClick={handleNotify}
                        className="w-full px-4 py-2 rounded-lg text-center font-medium text-[#0A3D91] ring-1 ring-[#0A3D91]/20 bg-white hover:bg-[#0A3D91]/5 transition text-sm"
                        disabled={notifyLoading}
                      >
                        {notifyLoading ? "Activando aviso…" : "Avísame de nuevas sesiones"}
                      </button>
                    </>
                  )}
                  {notifyMsg && <p className="text-xs text-slate-500">{notifyMsg}</p>}
                </div>

                {/* Calendario compacto */}
                <MiniCalendar sessions={scheduledSessions} onEventClick={() => navigate('/sesiones-programadas')} />
              </div>
            </article>
          </section>


          {/* Progreso por nivel */}
          <LevelProgress levelStats={levelStats} />

          {/* Tus escenarios (solo empezados/completados) */}
          {loadingEsc ? (
            <section className="mt-10">
              <div className="rounded-xl border bg-white p-6 text-slate-400 text-sm" style={{borderColor: 'rgba(0,0,0,0.08)'}}>Cargando escenarios…</div>
            </section>
          ) : escenarios.length > 0 ? (
            <section className="mt-10">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-lg font-semibold text-slate-900" style={{letterSpacing: '-0.02em'}}>Escenarios recientes</h2>
                <div className="flex-1 h-px bg-slate-100" />
                <Link to="/simulacion" className="text-xs font-medium text-[#0A3D91]/70 hover:text-[#0A3D91] flex items-center gap-1 transition">
                  Ver todos <ChevronRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {escenarios.slice(0, 6).map((sc) => (
                  <article key={sc.id} className="group relative rounded-xl border bg-white p-5 hover:-translate-y-0.5 transition-all duration-200"
                    style={{borderColor: 'rgba(0,0,0,0.08)', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 8px'}}>
                    <Link to={`/simulacion/${sc.id}/confirm`} className="absolute inset-0 rounded-xl" aria-hidden="true" tabIndex={-1} />
                    <div className="relative z-10">
                      <header className="mb-4 flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0" style={{background: 'rgba(10,61,145,0.08)'}}>
                          <PlayCircleIcon className="h-4 w-4 text-[#0A3D91]" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#0A3D91] transition-colors" style={{letterSpacing: '-0.01em'}}>
                            {sc.title}
                          </h3>
                          {sc.summary && <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{sc.summary}</p>}
                        </div>
                      </header>

                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        {sc.level ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                            {formatLevel(sc.level)}
                          </span>
                        ) : null}
                        {sc.estimated_minutes ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                            {sc.estimated_minutes} min
                          </span>
                        ) : null}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                          {sc.attempts_count ?? 0}{typeof sc.max_attempts === 'number' ? `/${sc.max_attempts}` : ''} intentos
                        </span>
                      </div>

                      <footer className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0A3D91]">
                          Continuar <ChevronRightIcon className="h-3.5 w-3.5" />
                        </span>
                        {sc.last_started_at ? (
                          <span className="text-[10px] text-slate-400">{formatDateHuman(sc.last_started_at)}</span>
                        ) : null}
                      </footer>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="mt-10">
              <div className="rounded-xl border bg-white p-8 text-center" style={{borderColor: 'rgba(0,0,0,0.08)'}}>
                <div className="h-12 w-12 rounded-xl grid place-items-center mx-auto mb-4" style={{background: 'rgba(10,61,145,0.07)'}}>
                  <PlayCircleIcon className="h-6 w-6 text-[#0A3D91]" />
                </div>
                <p className="text-sm text-slate-500 mb-4">Aún no has comenzado ningún escenario. Empieza en "Simulación online" para ver aquí tu progreso.</p>
                <Link
                  to="/simulacion"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#0A3D91] hover:bg-[#0A3D91]/90 transition shadow-sm"
                >
                  Ir a simulaciones <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </section>
          )}
        </main>

        {/* Notification Settings Modal */}
        {showNotificationSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <NotificationSettings
              onClose={() => setShowNotificationSettings(false)}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

/* ── MINI CALENDAR ── */
function MiniCalendar({ sessions = [], onEventClick = () => {} }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  // Start on Monday
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const monthName = firstDay.toLocaleString('es-ES', { month: 'long' });
  const today = new Date();

  // Days with sessions
  const sessionDays = new Set(
    sessions.map(s => {
      const d = new Date(s.scheduled_at);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const hasSession = (d) => sessionDays.has(`${year}-${month}-${d}`);

  // Build grid cells
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const upcoming = sessions
    .filter(s => new Date(s.scheduled_at) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 3);

  return (
    <div className="rounded-xl border bg-white overflow-hidden" style={{borderColor:'rgba(0,0,0,0.08)', boxShadow:'rgba(0,0,0,0.04) 0px 2px 8px'}}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-700 capitalize">{monthName} {year}</span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 transition text-slate-400 text-xs"
          >‹</button>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 transition text-slate-400 text-xs"
          >›</button>
        </div>
      </div>

      {/* Grid */}
      <div className="px-3 pt-2 pb-1">
        <div className="grid grid-cols-7 mb-0.5">
          {['L','M','X','J','V','S','D'].map(d => (
            <div key={d} className="text-center text-[9px] font-semibold text-slate-400 py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} className="aspect-square" />;
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            const hasDot = hasSession(d);
            return (
              <div
                key={d}
                onClick={hasDot ? onEventClick : undefined}
                className={`relative flex items-center justify-center aspect-square rounded text-xs font-medium transition
                  ${isToday ? 'bg-[#0A3D91] text-white font-semibold' : hasDot ? 'cursor-pointer hover:bg-[#eff6ff] text-slate-700' : 'text-slate-500 hover:bg-slate-50'}
                `}
              >
                {d}
                {hasDot && !isToday && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1E6ACB]" />
                )}
                {hasDot && isToday && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/70" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="border-t border-slate-100 px-3 py-2 space-y-1">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Próximas sesiones</p>
          {upcoming.map((s) => {
            const dt = new Date(s.scheduled_at);
            return (
              <button
                key={s.id}
                onClick={onEventClick}
                className="w-full flex items-center gap-2 text-left hover:bg-slate-50 rounded-lg px-1.5 py-1 transition group"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded bg-[#eff6ff] flex flex-col items-center justify-center">
                  <span className="text-[11px] font-bold text-[#0A3D91] leading-none">{dt.getDate()}</span>
                  <span className="text-[7px] font-semibold text-slate-400 uppercase">{dt.toLocaleString('es-ES',{month:'short'})}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-800 truncate group-hover:text-[#0A3D91] transition-colors">{s.title}</p>
                  <p className="text-[9px] text-slate-400">
                    {dt.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}{s.location ? ` · ${s.location}` : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {upcoming.length === 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">Sin sesiones programadas próximamente.</p>
        </div>
      )}
    </div>
  );
}

/* ── LEVEL PROGRESS ── */
function LevelProgress({ levelStats }) {
  const levels = [
    { key: 'basico',   label: 'Nivel 1 · Básico',    color: '#059669', track: '#d1fae5' },
    { key: 'medio',    label: 'Nivel 2 · Medio',      color: '#d97706', track: '#fef3c7' },
    { key: 'avanzado', label: 'Nivel 3 · Avanzado',   color: '#dc2626', track: '#fee2e2' },
  ];

  const hasAny = levels.some(l => (levelStats[l.key]?.total ?? 0) > 0);
  if (!hasAny) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold text-slate-900" style={{letterSpacing:'-0.02em'}}>Mi progreso</h2>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{borderColor:'rgba(0,0,0,0.08)', boxShadow:'rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 8px'}}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {levels.map(({ key, label, color, track }) => {
            const { attempted = 0, total = 0 } = levelStats[key] || {};
            const pct = total > 0 ? Math.round((attempted / total) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">{label}</span>
                  <span className="text-xs font-semibold" style={{color}}>
                    {attempted}<span className="text-slate-400 font-normal">/{total}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{background: track}}>
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{width: `${pct}%`, background: color}}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">{pct}% completado</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Card({ title, description, to, stateObj, badge, badgeColor, secondaryBadge, secondaryBadgeColor, icon: Icon, titleAttr }) {
  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 h-9 w-9 rounded-xl grid place-items-center" style={{background: 'rgba(10,61,145,0.08)'}}>
          {Icon ? <Icon className="h-5 w-5 text-[#0A3D91]" /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 group-hover:text-[#0A3D91] transition-colors leading-snug" style={{letterSpacing: '-0.01em'}}>{title}</h3>
        </div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed flex-1">{description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {badge ? (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 ring-black/10 ${badgeColor}`}>
            {badge}
          </span>
        ) : null}
        {secondaryBadge ? (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ring-1 ring-black/10 ${secondaryBadgeColor || "bg-slate-200 text-slate-700"}`}>
            {typeof secondaryBadge === "string" && secondaryBadge.trim().toLowerCase() === "no disponible para alumnos" ? "Solo admin" : secondaryBadge}
          </span>
        ) : null}
        {!badge && !secondaryBadge && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0A3D91]/70 group-hover:text-[#0A3D91] transition-colors mt-1">
            Acceder <ChevronRightIcon className="h-3 w-3" />
          </span>
        )}
      </div>
    </div>
  );
  if (!to) {
    return (
      <div
        className="group flex rounded-xl border bg-white p-5 opacity-60 cursor-not-allowed"
        style={{borderColor: 'rgba(0,0,0,0.08)'}}
        title={titleAttr || "Disponible próximamente"}
      >
        {content}
      </div>
    );
  }
  return (
    <Link
      to={to}
      state={stateObj}
      title={titleAttr || title}
      className="group flex rounded-xl border bg-white p-5 hover:-translate-y-0.5 transition-all duration-200"
      style={{borderColor: 'rgba(0,0,0,0.08)', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 8px'}}
    >
      {content}
    </Link>
  );
}

function MetricCard({ icon: Icon, label, value, helper, chart }) {
  return (
    <div className="rounded-xl px-4 py-3.5 backdrop-blur-sm"
      style={{background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)'}}>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-lg grid place-items-center" style={{background: 'rgba(255,255,255,0.1)'}}>
          {Icon ? <Icon className="h-4 w-4 text-white/80" /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1" style={{letterSpacing: '0.1em'}}>{label}</p>
          <p className="text-base font-semibold text-white leading-tight truncate" style={{letterSpacing: '-0.02em'}}>{value}</p>
          {chart && <div className="mt-2">{chart}</div>}
          {helper && <p className="text-[10px] text-white/40 mt-1 leading-relaxed">{helper}</p>}
        </div>
      </div>
    </div>
  );
}

// Progress Chart Component
function ProgressChart({ progress }) {
  return (
    <div className="space-y-1 mt-1">
      <div className="w-full rounded-full h-1" style={{background: 'rgba(255,255,255,0.12)'}}>
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%`, background: 'rgba(255,255,255,0.55)' }}
        />
      </div>
      <p className="text-[9px] text-white/35 text-right">{Math.round(progress)}%</p>
    </div>
  );
}

function getAchievementLevel(onlineAttempted, presencialAttempted) {
  const total = onlineAttempted + presencialAttempted;

  // Achievement levels - universal for all healthcare professionals
  if (total >= 25) return {
    icon: "🏆",
    title: "Experto Profesional",
    description: "Especialista multidisciplinar consolidado",
    color: "bg-yellow-500 text-yellow-900"
  };

  if (total >= 20) return {
    icon: "⭐",
    title: "Coordinador Experto",
    description: "Gestión avanzada de equipos de crisis",
    color: "bg-red-500 text-white"
  };

  if (total >= 15) return {
    icon: "👨‍💼",
    title: "Jefe de Equipo",
    description: "Líder reconocido en simulación multimodal",
    color: "bg-purple-500 text-purple-900"
  };

  if (total >= 12) return {
    icon: "👥",
    title: "Supervisor Senior",
    description: "Experiencia en múltiples escenarios críticos",
    color: "bg-orange-500 text-orange-900"
  };

  if (total >= 8) return {
    icon: "🔬",
    title: "Especialista Avanzado",
    description: "Dominio en protocolos de alta complejidad",
    color: "bg-blue-500 text-blue-900"
  };

  if (total >= 5) return {
    icon: "⚡",
    title: "Profesional Competente",
    description: "Habilidades sólidas en situaciones críticas",
    color: "bg-green-500 text-green-900"
  };

  if (total >= 3) return {
    icon: "📚",
    title: "Profesional en Formación",
    description: "Desarrollo de destrezas técnicas avanzadas",
    color: "bg-indigo-500 text-indigo-900"
  };

  if (total >= 1) return {
    icon: "🎯",
    title: "Nuevos Compromisos",
    description: "Iniciativa y motivación profesional activa",
    color: "bg-teal-500 text-teal-900"
  };

  return {
    icon: "🌱",
    title: "Primeros Pasos",
    description: "Inicio del camino profesional en simulación",
    color: "bg-gray-500 text-gray-900"
  };
}

// Achievement Badge Component
function AchievementBadge({ level }) {
  // TODO: We need to get user role from session to customize achievements
  // For now using a generic set - can be enhanced later with role-specific badges
  const achievement = getAchievementLevel(level.onlineAttempted, level.presencialAttempted);

  return (
    <div className="rounded-2xl border border-white/25 bg-white/10 backdrop-blur-sm px-4 py-3 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.6)]">
      <div className="flex flex-col items-center gap-2">
        <div className="text-2xl">{achievement.icon}</div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-white/70">Logro</p>
          <p className="text-sm font-semibold text-white leading-tight text-center">{achievement.title}</p>
          <p className="text-[10px] text-white/60 text-center">{achievement.description}</p>
        </div>
      </div>
    </div>
  );
}

// Activity Timeline Component
function ActivityTimeline({ scenarios }) {
  return (
    <div className="rounded-2xl border border-white/25 bg-white/10 backdrop-blur-sm p-4 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.6)]">
      <h3 className="text-lg font-semibold text-white mb-4">Actividad reciente</h3>
      <div className="space-y-3">
        {scenarios.length > 0 ? (
          scenarios.map((scenario, index) => (
            <div key={scenario.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
              <div className="shrink-0 w-8 h-8 rounded-full bg-white/15 grid place-items-center text-sm text-white">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm truncate">{scenario.title}</h4>
                <p className="text-white/70 text-xs">
                  {formatDateHuman(scenario.last_started_at)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-white/70 text-sm">No hay actividad reciente</p>
        )}
      </div>
    </div>
  );
}

// Session Calendar Component
function SessionCalendar() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const days = [];

  // Fill empty cells for the beginning of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }

  // Fill the days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 backdrop-blur-sm p-4 shadow-[0_15px_30px_-25px_rgba(15,23,42,0.5)]">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Próximas sesiones</h3>
      <div className="space-y-2">
        {/* Month header */}
        <div className="text-center text-sm text-slate-600 font-medium">
          {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayNames.map((day, index) => (
            <div key={index} className="text-xs text-slate-500 font-bold">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid - only show today highlight, events will come from real data */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.slice(0, 35).map((day, index) => {
            const isToday = day === currentDate.getDate();

            return (
              <div
                key={index}
                className={`h-8 w-8 text-xs rounded-full grid place-items-center ${
                  isToday
                    ? 'bg-[#0A3D91] text-white font-bold'
                    : day
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-slate-300'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-[#1E6ACB] rounded-full"></div>
            <span className="text-slate-600">Sesiones programadas</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 bg-[#0A3D91] rounded-full"></div>
            <span className="text-slate-600">Día actual</span>
          </div>
        </div>
      </div>
    </div>
  );
}
