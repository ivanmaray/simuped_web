// src/pages/Dashboard.jsx
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";
import { useAuth } from "../../../auth";
import { UsersIcon, DevicePhoneMobileIcon, ChartBarIcon, AcademicCapIcon, ArrowsRightLeftIcon } from "@heroicons/react/24/outline";

// Debug: marcar que Dashboard.jsx se ha cargado
console.debug("[Dashboard] componente cargado");

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
  const [summaryWarn, setSummaryWarn] = useState("");

  // Perfil
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Escenarios + filtros (si quieres mostrar un rápido conteo o futuras vistas)
  const [escenarios, setEscenarios] = useState([]);
  const [loadingEsc, setLoadingEsc] = useState(false);
  // Presencial: avisos por email (sin consultar sesiones hasta que esté el esquema)
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState("");

  useEffect(() => {
    let mounted = true;


    async function init() {
      if (!ready) return; // espera a que AuthProvider resuelva
      console.debug("[Dashboard] init: ready =", ready);
      try {
        if (!session) {
          setLoading(false);
          // Si se cayó la sesión, volvemos al inicio
          navigate("/", { replace: true });
          return;
        }
        console.debug("[Dashboard] init: session OK ->", session?.user?.id);

        // Cargar perfil (no bloqueante si falla)
        try {
          const { data: prof, error: pErr } = await supabase
            .from("profiles")
            .select("nombre, rol, is_admin")
            .eq("id", session.user.id)
            .maybeSingle();

          if (pErr) {
            console.warn("[Dashboard] profiles select error (no bloqueante):", pErr);
          }

          setNombre(prof?.nombre ?? session.user?.user_metadata?.nombre ?? "");
          setRol((prof?.rol ?? session.user?.user_metadata?.rol ?? "").toString());
          setIsAdmin(Boolean(prof?.is_admin ?? session.user?.user_metadata?.is_admin ?? session.user?.app_metadata?.is_admin ?? false));
        } catch (err) {
          console.warn("[Dashboard] profiles select throw (no bloqueante):", err);
        }

        await cargarEscenarios();
      } catch (e) {
        console.error("[Dashboard] init catch:", e);
        setErrorMsg(e?.message || "Error inicializando el panel");
      } finally {
        if (mounted) setLoading(false);
        console.debug("[Dashboard] init: finished");
      }
    }

    async function cargarEscenarios() {
      setLoadingEsc(true);
      setErrorMsg("");
      console.debug("[Dashboard] cargarEscenarios: fetching...");

      try {
        const [scRes, sumRes] = await Promise.all([
          supabase
            .from("scenarios")
            .select("id, title, summary, level, mode, created_at, estimated_minutes, max_attempts")
            .order("created_at", { ascending: false }),
          // Vista opcional; si no existe no rompemos la pantalla
          supabase
            .from("v_user_attempts_summary")
            .select("scenario_id, attempts_count, last_started_at")
        ]);

        if (scRes.error) {
          console.error("[Dashboard] scenarios error:", scRes.error);
          throw new Error(scRes.error.message || "No se pudieron cargar los escenarios");
        }

        if (sumRes.error) {
          // No bloquear: continuar sin resumen
          console.warn("[Dashboard] summary warning:", sumRes.error);
          setSummaryWarn("No se pudo cargar el resumen de intentos. Puedes seguir usando el panel sin ese dato.");
        }

        const scenarios = scRes.data || [];
        const summary = sumRes.data || [];
        const mapSummary = new Map(summary.map(r => [r.scenario_id, r]));

        const enriched = scenarios.map(sc => {
          const s = mapSummary.get(sc.id);
          return {
            ...sc,
            attempts_count: s?.attempts_count ?? 0,
            last_started_at: s?.last_started_at ?? null,
          };
        });

        // Solo mostrar escenarios empezados/completados por el usuario
        const started = enriched
          .filter(sc => (sc?.attempts_count ?? 0) > 0)
          .sort((a, b) => {
            const ta = a.last_started_at ? new Date(a.last_started_at).getTime() : 0;
            const tb = b.last_started_at ? new Date(b.last_started_at).getTime() : 0;
            return tb - ta; // más recientes primero
          });

        setEscenarios(started);
        console.debug("[Dashboard] cargarEscenarios: loaded", started.length);
      } catch (e) {
        console.error("[Dashboard] cargarEscenarios catch:", e);
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
      console.warn("[Dashboard] notify error:", e);
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
        {summaryWarn && (
          <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 px-4 py-2 text-sm">
            {summaryWarn}
          </div>
        )}

        {/* Hero */}
        <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] border-b border-white/20">
          <div className="max-w-6xl mx-auto px-5 py-10 text-white">
            <p className="opacity-95">Bienvenido{nombre ? `, ${nombre}` : ""}</p>
            <h1 className="text-3xl md:text-4xl font-semibold mt-1">Tu panel de simulación clínica</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 ring-1 ring-white/30 text-white/90">{email}</span>
              {rol ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ring-1 bg-white/10 ring-white/30">
                  {formatRole(rol)}
                </span>
              ) : null}
              {isAdmin ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ring-1 bg-white/10 ring-white/30">
                  Admin
                </span>
              ) : null}
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
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 h-10 w-10 rounded-xl grid place-items-center bg-gradient-to-br from-[#0A3D91]/10 via-[#1E6ACB]/10 to-[#4FA3E3]/10 ring-1 ring-[#0A3D91]/15">
                    <UsersIcon className="h-5 w-5 text-[#0A3D91]" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">Simulación presencial</h2>
                </div>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-xs ring-1 ring-emerald-200 bg-emerald-50 text-emerald-700">Versión para instructor</span>
                )}
              </div>

              {/* Body: two columns INSIDE the single card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna izquierda: explicación de modos */}
                <div>
                  <p className="text-slate-700 mb-3">Dos modos de simulación presencial:</p>

                  <div className="rounded-lg ring-1 ring-slate-200 p-3 mb-3">
                    <div className="font-medium">Dual · 2 pantallas</div>
                    <ul className="mt-1 list-disc ml-5 space-y-0.5 text-[15px]">
                      <li>El instructor crea una sesión y comparte un <span className="font-medium">código</span>.</li>
                      <li>Con ese código se proyecta la <span className="font-medium">pantalla de alumnos</span>.</li>
                      <li>Desde su consola, el instructor revela datos y cambia de fase en tiempo real.</li>
                    </ul>
                  </div>

                  <div className="rounded-lg ring-1 ring-slate-200 p-3">
                    <div className="font-medium">Clásico · 1 pantalla</div>
                    <ul className="mt-1 list-disc ml-5 space-y-0.5 text-[15px]">
                      <li>Una única <span className="font-medium">consola</span> para dirigir la simulación frente al equipo.</li>
                      <li>Solo el instructor ve esta vista de control. <span className="font-medium">No requiere código</span>.</li>
                    </ul>
                  </div>

                  <p className="text-[15px] mt-3 text-slate-700">Al finalizar se genera un <span className="font-medium">informe</span> con checklist, intervenciones y duración.</p>
                </div>

                {/* Columna derecha: acciones o próximo aviso */}
                <div>
                  {isAdmin ? (
                    <div>
                      <div className="text-sm text-slate-700 mb-3">Acciones del instructor</div>
                      <div className="grid grid-cols-1 gap-3">
                        {/* Clásico */}
                        <Link
                          to="/presencial"
                          className="group flex items-start gap-3 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 hover:ring-slate-300 hover:bg-white transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6ACB]"
                        >
                          <AcademicCapIcon className="h-5 w-5 text-slate-600 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-900">Instructor · Clásico (1 pantalla)</div>
                            <div className="text-xs text-slate-500">Toolkit completo en una única vista, sin código</div>
                          </div>
                        </Link>

                        {/* Dual */}
                        <Link
                          to="/presencial?flow=dual"
                          className="group flex items-start gap-3 rounded-xl px-4 py-3 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white shadow hover:shadow-md transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                          <ArrowsRightLeftIcon className="h-5 w-5 text-white/90 mt-0.5" />
                          <div>
                            <div className="font-semibold">Instructor · Dual (2 pantallas)</div>
                            <div className="text-xs text-white/90">Consola del instructor + pantalla de alumnos por código</div>
                          </div>
                        </Link>
                      </div>
                      {/* Nota pequeña para admins: Próxima sesión */}
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        <div className="font-medium text-slate-700 mb-1">Próxima sesión</div>
                        <p>
                          Al iniciar una sesión se generará un <span className="font-semibold">código público</span> para proyectar la pantalla del alumnado. 
                          Podrás copiarlo desde la barra superior del modo instructor.
                        </p>
                        <Link to="/presencial-info" className="inline-block mt-2 text-[#0A3D91] hover:underline">
                          Más info sobre la pantalla del alumno
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-slate-700">Próxima sesión</div>
                      <div className="mt-1 text-slate-900 font-medium">
                        El instructor anunciará el código en sala cuando inicie la sesión.
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleNotify}
                          disabled={notifyLoading}
                          className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 hover:bg-white"
                        >
                          {notifyLoading ? "Guardando..." : "Avisarme por correo"}
                        </button>
                        {notifyMsg && <span className="text-sm text-slate-600">{notifyMsg}</span>}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Te avisaremos por email cuando se programe una nueva sesión presencial.</p>
                    </div>
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
                  <article key={sc.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition">
                    <header className="mb-3">
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:underline">
                        <Link to={`/simulacion/${sc.id}/confirm`}>{sc.title}</Link>
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2">{sc.summary || ""}</p>
                    </header>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {sc.level ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] ring-1 ring-slate-200 bg-slate-50">
                          {formatLevel(sc.level)}
                        </span>
                      ) : null}
                      {sc.estimated_minutes ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] ring-1 ring-slate-200 bg-slate-50">
                          ~{sc.estimated_minutes} min
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] ring-1 ring-slate-200 bg-slate-50">
                        Intentos: {sc.attempts_count ?? 0}{typeof sc.max_attempts === 'number' ? `/${sc.max_attempts}` : ''}
                      </span>
                    </div>

                    <footer className="flex items-center justify-between">
                      <Link
                        to={`/simulacion/${sc.id}/confirm`}
                        className="text-sm font-medium text-[#0A3D91] hover:underline"
                      >
                        Continuar
                      </Link>
                      {sc.last_started_at ? (
                        <span className="text-xs text-slate-500">Último: {new Date(sc.last_started_at).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Sin intentos</span>
                      )}
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </ErrorBoundary>
  );
}

function Card({ title, description, to, stateObj, badge, badgeColor, icon: Icon, titleAttr }) {
  const content = (
    <div className="flex items-start gap-4">
      <div className="shrink-0 h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br from-[#0A3D91]/10 via-[#1E6ACB]/10 to-[#4FA3E3]/10 ring-1 ring-[#0A3D91]/15">
        {Icon ? <Icon className="h-6 w-6 text-[#0A3D91]" /> : null}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold group-hover:underline">{title}</h3>
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
    // Render as a non-clickable block
    return (
      <div
        className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm opacity-70 cursor-not-allowed"
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
      className="group block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
    >
      {content}
    </Link>
  );
}