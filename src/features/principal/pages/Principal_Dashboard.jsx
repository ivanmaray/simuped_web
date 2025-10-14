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

  useEffect(() => {
    let mounted = true;


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

        await Promise.all([cargarEscenarios(), cargarSesionesProgramadas()]);
      } catch (e) {
        reportError("Dashboard.init", e, { userId: session?.user?.id });
        setErrorMsg(e?.message || "Error inicializando el panel");
      } finally {
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

        // Get participant counts for each session
        const sessionsWithCounts = await Promise.all(
          (sessions || []).map(async (session) => {
            try {
              const { count } = await supabase
                .from("scheduled_session_participants")
                .select("id", { count: "exact" })
                .eq("session_id", session.id);

              return {
                ...session,
                registered_count: count || 0,
                scheduled_at: new Date(session.scheduled_at)
              };
            } catch (err) {
              console.warn("Error getting participants for session:", err);
              return {
                ...session,
                registered_count: 0,
                scheduled_at: new Date(session.scheduled_at)
              };
            }
          })
        );

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
          .order("started_at", { ascending: false });

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
          .select("id, mode");

        if (totalError) {
          reportWarning("Dashboard.scenarioTotals", totalError);
        }

        const allScenarios = (totalScenarios || []).map((row) => normalizeMode(row.mode));
        const onlineTotal = allScenarios.filter((modes) => modes.includes('online')).length;
        const presencialTotal = allScenarios.filter((modes) => modes.includes('presencial')).length;

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando panel…</div>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-slate-800">No has iniciado sesión</h1>
          <p className="text-slate-600 mt-2">Por favor, vuelve a la página de inicio para acceder.</p>
          <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100">Ir al inicio</a>
        </div>
      </div>
    );
  }

  const email = session?.user?.email ?? "";

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {errorMsg && (
          <div className="bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 text-sm">
            {errorMsg}
          </div>
        )}

        <Navbar />
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
          <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
          <div className="max-w-6xl mx-auto px-5 py-12 text-white relative">
            <p className="opacity-95">Bienvenido{nombre ? `, ${nombre}` : ""}</p>
            <h1 className="text-3xl md:text-4xl font-semibold mt-1">Tu panel de simulación clínica</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/30 text-white/90">{email}</span>
              {roleLabel ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ring-1 bg-white/10 ring-white/30">
                  {formatRole(roleLabel)}
                </span>
              ) : null}
              {isAdmin ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ring-1 bg-white/10 ring-white/30">
                  Admin
                </span>
              ) : null}
            </div>
            <div className="mt-6 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

        <main className="max-w-6xl mx-auto px-5 py-8">
          {/* Accesos rápidos */}
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Accesos rápidos</h2>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              title="Simulación online"
              description="Escoge un escenario y practica con casos interactivos."
              to="/simulacion"
              badge="Nuevo"
              badgeColor="bg-emerald-100 text-emerald-700"
              icon={DevicePhoneMobileIcon}
            />
            <Card
              title="Evaluación del desempeño"
              description="Consulta tus resultados y evolución por escenarios."
              to="/evaluacion"
              stateObj={{ forceSelf: true }}
              icon={ChartBarIcon}
            />
          </section>

          {/* Simulación presencial (modos + acciones) */}
          <section id="presencial" className="mt-8">
            <article className="relative rounded-[28px] border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.7)]">
              <div className="absolute inset-0 rounded-[28px] border border-white/40 pointer-events-none" />
              <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 h-12 w-12 rounded-2xl grid place-items-center bg-gradient-to-br from-[#0A3D91]/20 via-[#1E6ACB]/15 to-[#4FA3E3]/20 shadow-inner">
                    <UsersIcon className="h-6 w-6 text-[#0A3D91]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Simulación presencial</h2>
                    <p className="text-sm text-slate-600">Organiza y ejecuta tus sesiones duales o clásicas con un solo vistazo.</p>
                  </div>
                </div>
                {isAdmin && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700">Versión instructor</span>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/70 bg-white/75 backdrop-blur-sm p-4 shadow-[0_15px_30px_-25px_rgba(15,23,42,0.5)]">
                    <div className="font-medium">Dual · 2 pantallas</div>
                    <ul className="mt-2 list-disc ml-5 space-y-1 text-[15px] text-slate-600">
                      <li>El instructor crea la sesión y comparte el <span className="font-medium">código</span> con el equipo.</li>
                      <li>Los alumnos ven la sesión en una pantalla sincronizada en tiempo real.</li>
                      <li>Checklist, cronómetro y variables se controlan desde la consola.</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/70 bg-white/75 backdrop-blur-sm p-4 shadow-[0_15px_30px_-25px_rgba(15,23,42,0.5)]">
                    <div className="font-medium">Clásico · 1 pantalla</div>
                    <ul className="mt-2 list-disc ml-5 space-y-1 text-[15px] text-slate-600">
                      <li>Una consola central permite guiar la sesión sin dispositivos adicionales.</li>
                      <li>No requiere códigos de acceso: ideal para formaciones rápidas.</li>
                      <li>Genera checklist y notas para el debrief al finalizar.</li>
                    </ul>
                  </div>

                  <p className="text-[15px] mt-4 text-slate-600">Ambos modos generan un <span className="font-medium">informe detallado</span> con checklist, intervenciones y tiempos.</p>
                </div>

                <div className="space-y-4">
                  <AdvancedCalendar
                    sessions={scheduledSessions}
                    compact={true}
                    onDateClick={(date) => console.log('Date clicked:', date)}
                    onEventClick={(session) => navigate('/sesiones-programadas')}
                  />

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowNotificationSettings(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition text-sm"
                    >
                      <BellIcon className="w-4 h-4" />
                      Configurar notificaciones
                    </button>
                  </div>

                  {isAdmin ? (
                    <div className="rounded-2xl border border-white/70 bg-white/80 backdrop-blur p-5 space-y-4 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.55)]">
                      <Link
                        to="/presencial/flow/dual"
                        className="block w-full px-4 py-2.5 rounded-xl text-center font-semibold text-white bg-gradient-to-r from-[#0A3D91] to-[#1E6ACB] shadow hover:shadow-lg hover:-translate-y-0.5 transition"
                      >
                        Crear sesión dual
                      </Link>
                      <p className="text-sm text-slate-600">
                        Configura fases, checklist y cronómetro. Al finalizar, comparte el informe desde la consola.
                      </p>
                      <div className="flex gap-3">
                        <Link
                          to="/sesiones-programadas"
                          className="flex-1 px-4 py-2 rounded-lg text-center font-medium text-white bg-[#0A3D91] hover:bg-[#0A3D91]/90 transition shadow text-sm"
                        >
                          Gestión de sesiones
                        </Link>
                        <Link
                          to="/presencial"
                          className="flex-1 px-4 py-2 rounded-lg text-center font-medium text-[#0A3D91] ring-1 ring-[#0A3D91]/20 bg-white hover:bg-[#0A3D91]/5 hover:-translate-y-0.5 transition text-sm"
                        >
                          Consola clásica
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Link
                        to="/sesiones-programadas"
                        className="block w-full px-4 py-2.5 rounded-lg text-center font-medium text-white bg-[#0A3D91] hover:bg-[#0A3D91]/90 transition shadow"
                      >
                        Ver sesiones programadas
                      </Link>
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-600 text-sm">
                        Si deseas participar en simulaciones presenciales, avisa al equipo y te enviaremos el código cuando haya nuevas sesiones.
                      </div>
                    </div>
                  )}
                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={handleNotify}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#0A3D91] hover:bg-[#0A3D91]/90 transition shadow"
                      disabled={notifyLoading}
                    >
                      {notifyLoading ? "Activando aviso…" : "Avísame de próximas sesiones"}
                    </button>
                  )}
                  {notifyMsg && (
                    <p className="text-sm text-slate-600">{notifyMsg}</p>
                  )}
                </div>
              </div>
            </article>
          </section>

          {/* Perfil CTA */}
          <section className="mt-10">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">Tu perfil</h2>
                  <p className="text-slate-700">Gestiona tu nombre, unidad y rol.</p>
                </div>
                <Link
                  to="/perfil"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition"
                >
                  Ir a Perfil
                </Link>
              </div>
            </div>
          </section>

          {/* Tus escenarios (solo empezados/completados) */}
          {loadingEsc ? (
            <section className="mt-10">
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Cargando escenarios…</div>
            </section>
          ) : escenarios.length > 0 ? (
            <section className="mt-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800">Tus escenarios recientes</h2>
                <Link to="/simulacion" className="text-[#0A3D91] hover:underline text-sm">Ver todos</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {escenarios.slice(0, 6).map((sc) => (
                  <article key={sc.id} className="group relative rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.6)] hover:shadow-[0_20px_44px_-28px_rgba(15,23,42,0.6)] hover:-translate-y-1 transition">
                    <Link to={`/simulacion/${sc.id}/confirm`} className="absolute inset-0" aria-hidden="true" tabIndex={-1} />
                    <div className="relative z-10">
                      <header className="mb-3 flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#0A3D91]/15 via-[#1E6ACB]/10 to-[#4FA3E3]/15 grid place-items-center">
                          <PlayCircleIcon className="h-5 w-5 text-[#0A3D91]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 group-hover:underline decoration-[#0A3D91]/40">
                            {sc.title}
                          </h3>
                          <p className="text-sm text-slate-600 line-clamp-2">{sc.summary || ""}</p>
                        </div>
                      </header>

                      <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-slate-600">
                        {sc.level ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                            {formatLevel(sc.level)}
                          </span>
                        ) : null}
                        {sc.estimated_minutes ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                            ~{sc.estimated_minutes} min
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                          Intentos: {sc.attempts_count ?? 0}{typeof sc.max_attempts === 'number' ? `/${sc.max_attempts}` : ''}
                        </span>
                      </div>

                      <footer className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1 font-medium text-[#0A3D91]">
                          Continuar
                          <ChevronRightIcon className="h-4 w-4" />
                        </span>
                        {sc.last_started_at ? (
                          <span className="text-xs text-slate-500">Último intento: {formatDateHuman(sc.last_started_at)}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Sin intentos</span>
                        )}
                      </footer>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="mt-10">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                <p>Aún no has comenzado ningún escenario. Empieza en "Simulación online" para ver aquí tu progreso.</p>
                <Link
                  to="/simulacion"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white bg-[#0A3D91] hover:bg-[#0A3D91]/90 transition shadow"
                >
                  Ir a simulaciones
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

function Card({ title, description, to, stateObj, badge, badgeColor, icon: Icon, titleAttr }) {
  const content = (
    <div className="flex items-start gap-4">
      <div className="shrink-0 h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-[#0A3D91]/15 via-[#1E6ACB]/10 to-[#4FA3E3]/15 shadow-inner">
        {Icon ? <Icon className="h-6 w-6 text-[#0A3D91] drop-shadow-sm" /> : null}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold group-hover:underline decoration-2 decoration-[#0A3D91]/40">{title}</h3>
          {badge ? (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-black/10 ${badgeColor}`}>
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-slate-600 mt-1">{description}</p>
      </div>
    </div>
  );
  if (!to) {
    return (
      <div
        className="group block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm opacity-70 cursor-not-allowed"
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
      className="group block rounded-3xl border border-transparent bg-white p-6 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.4)] hover:shadow-[0_25px_45px_-25px_rgba(15,23,42,0.35)] hover:-translate-y-0.5 transition"
    >
      {content}
    </Link>
  );
}

function MetricCard({ icon: Icon, label, value, helper, chart }) {
  return (
    <div className="rounded-2xl border border-white/25 bg-white/10 backdrop-blur-sm px-4 py-3 shadow-[0_10px_25px_-20px_rgba(15,23,42,0.6)]">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-white/15 grid place-items-center">
          {Icon ? <Icon className="h-5 w-5 text-white/90" /> : null}
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
          <p className="text-lg font-semibold text-white leading-tight">{value}</p>
          {chart && <div className="mt-2">{chart}</div>}
          {helper && <p className="text-[11px] text-white/70 mt-0.5">{helper}</p>}
        </div>
      </div>
    </div>
  );
}

// Progress Chart Component
function ProgressChart({ progress }) {
  return (
    <div className="space-y-1">
      <div className="w-full bg-white/20 rounded-full h-1.5">
        <div
          className="bg-white/70 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-[10px] text-white/60 text-right">{Math.round(progress)}%</p>
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
