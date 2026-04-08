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
          .select("id, mode")
          .abortSignal(AbortSignal.timeout(8000));

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

          <div className="max-w-6xl mx-auto px-5 py-14 text-white relative">
            {/* Greeting */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-white/50 uppercase tracking-widest font-medium" style={{letterSpacing: '0.15em'}}>Panel</span>
              <span className="text-white/20">·</span>
              <span className="text-sm text-white/60">SimuPed</span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-semibold text-white leading-tight"
              style={{letterSpacing: '-0.03em'}}
            >
              {nombre ? `Hola, ${nombre}` : "Tu panel clínico"}
            </h1>
            <p className="mt-2 text-white/60 text-lg" style={{letterSpacing: '-0.01em'}}>
              Simulación clínica interprofesional pediátrica
            </p>

            {/* Pills de identidad */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs bg-white/8 ring-1 ring-white/15 text-white/70 backdrop-blur-sm"
                style={{background: 'rgba(255,255,255,0.08)'}}>
                {email}
              </span>
              {roleLabel ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ring-1 text-white/90"
                  style={{background: 'rgba(79,163,227,0.18)', borderColor: 'rgba(79,163,227,0.35)'}}>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-300/80" />
                  {formatRole(roleLabel)}
                </span>
              ) : null}
              {isAdmin ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1"
                  style={{background: 'rgba(250,204,21,0.15)', borderColor: 'rgba(250,204,21,0.35)', color: 'rgba(253,224,71,0.95)'}}>
                  Admin
                </span>
              ) : null}
            </div>

            <div className="mt-8">
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
            <h2 className="text-lg font-semibold text-slate-900" style={{letterSpacing: '-0.02em'}}>Accesos rápidos</h2>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card
              title="Simulación online"
              description="Escoge un escenario y practica con casos interactivos."
              to="/simulacion"
              icon={DevicePhoneMobileIcon}
            />
            <Card
              title="Evaluación del desempeño"
              description="Consulta tus resultados y evolución por escenarios."
              to="/evaluacion"
              stateObj={{ forceSelf: true }}
              icon={ChartBarIcon}
            />
            {isAdmin ? (
              <Card
                title="Entrenamiento rápido"
                description="Microcasos interactivos con decisiones que impactan la evolución."
                to="/entrenamiento-rapido"
                badge="En desarrollo"
                badgeColor="bg-amber-100 text-amber-700"
                secondaryBadge="No disponible para alumnos"
                secondaryBadgeColor="bg-slate-200 text-slate-600"
                icon={ArrowsRightLeftIcon}
              />
            ) : null}
            {isAdmin ? (
              <Card
                title="Entrenamiento interactivo"
                description="Escenarios con motor 3D y evaluación paso a paso aún en construcción."
                to="/entrenamiento-interactivo"
                badge="En desarrollo"
                badgeColor="bg-amber-100 text-amber-700"
                secondaryBadge="No disponible para alumnos"
                secondaryBadgeColor="bg-slate-200 text-slate-600"
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
              <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 h-10 w-10 rounded-xl grid place-items-center" style={{background: 'rgba(10,61,145,0.08)'}}>
                    <UsersIcon className="h-5 w-5 text-[#0A3D91]" />
                  </div>
                  <p className="text-sm text-slate-500">Organiza y ejecuta sesiones duales o clásicas con un solo vistazo.</p>
                </div>
                {isAdmin && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700">Versión instructor</span>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="space-y-3">
                  <div className="rounded-xl border p-4" style={{borderColor: 'rgba(0,0,0,0.07)', background: '#fafafa'}}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-slate-800">Dual</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-50 text-sky-700 ring-1 ring-sky-200">2 pantallas</span>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-500">
                      <li className="flex gap-2"><span className="text-slate-300 mt-0.5">—</span>El instructor crea la sesión y comparte el <span className="font-medium text-slate-600">código</span> con el equipo.</li>
                      <li className="flex gap-2"><span className="text-slate-300 mt-0.5">—</span>Los alumnos ven la sesión en una pantalla sincronizada en tiempo real.</li>
                      <li className="flex gap-2"><span className="text-slate-300 mt-0.5">—</span>Checklist, cronómetro y variables desde la consola.</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border p-4" style={{borderColor: 'rgba(0,0,0,0.07)', background: '#fafafa'}}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-slate-800">Clásico</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200">1 pantalla</span>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-500">
                      <li className="flex gap-2"><span className="text-slate-300 mt-0.5">—</span>Consola central sin dispositivos adicionales.</li>
                      <li className="flex gap-2"><span className="text-slate-300 mt-0.5">—</span>Sin códigos de acceso, ideal para formaciones rápidas.</li>
                      <li className="flex gap-2"><span className="text-slate-300 mt-0.5">—</span>Genera checklist y notas para el debrief.</li>
                    </ul>
                  </div>

                  <p className="text-sm text-slate-400">Ambos modos generan un <span className="font-medium text-slate-500">informe detallado</span> con checklist, intervenciones y tiempos.</p>
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
                    <div className="rounded-xl border p-4 space-y-3" style={{borderColor: 'rgba(0,0,0,0.08)'}}>
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
            <div className="rounded-xl border bg-white p-5 flex items-center justify-between gap-4" style={{borderColor: 'rgba(0,0,0,0.08)', boxShadow: 'rgba(0,0,0,0.04) 0px 2px 8px'}}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{background: 'rgba(10,61,145,0.07)'}}>
                  <AcademicCapIcon className="h-5 w-5 text-[#0A3D91]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Tu perfil</p>
                  <p className="text-xs text-slate-400">Nombre, unidad y rol profesional</p>
                </div>
              </div>
              <Link
                to="/perfil"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition hover:bg-slate-50"
                style={{borderColor: 'rgba(0,0,0,0.12)', color: '#334155'}}
              >
                Ir a Perfil <ChevronRightIcon className="h-3.5 w-3.5 opacity-50" />
              </Link>
            </div>
          </section>

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
