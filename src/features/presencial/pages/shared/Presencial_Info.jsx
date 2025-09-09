// /src/pages/PresencialInfo.jsx
import { Link } from "react-router-dom";
import Navbar from "../../../../components/Navbar.jsx";
import { useAuth } from "../../../../auth";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../../supabaseClient";

export default function Presencial_Info() {
  const { session } = useAuth() || {};
  const isAdmin = Boolean(
    session?.user?.user_metadata?.is_admin || session?.user?.app_metadata?.is_admin
  );

  // --- Próximas simulaciones (upcoming) ---
  const [upcoming, setUpcoming] = useState([]); // [{id, public_code, created_at, scenario: { title }}]
  const [loadingUp, setLoadingUp] = useState(true);
  const [errorUp, setErrorUp] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUp(true);
      setErrorUp("");
      try {
        // Consideramos "próximas" como sesiones aún no iniciadas (started_at IS NULL)
        // Traemos también el título del escenario.
        const { data, error } = await supabase
          .from("presencial_sessions")
          .select("id, public_code, created_at, started_at, scenarios:scenario_id(title)")
          .is("started_at", null)
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) throw error;
        if (!mounted) return;

        // Normalizamos datos
        const rows = (data || []).map((r) => ({
          id: r.id,
          code: r.public_code,
          created_at: r.created_at,
          title: r.scenarios?.title || "Escenario",
        }));
        setUpcoming(rows);
      } catch (e) {
        if (!mounted) return;
        setErrorUp(e?.message || "No se pudieron cargar las próximas simulaciones.");
      } finally {
        if (mounted) setLoadingUp(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const EmptyUpcoming = useMemo(() => (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-slate-600">
      {isAdmin ? (
        <>
          Aún no hay sesiones programadas. Puedes crear una desde{" "}
          <Link to="/presencial/instructor" className="text-[#0A3D91] underline">Instructor (dual)</Link>.
        </>
      ) : (
        <>Aún no hay sesiones anunciadas. Cuando el instructor cree una, verás aquí el código.</>
      )}
    </div>
  ), [isAdmin]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <h1 className="text-2xl md:text-3xl font-semibold">Simulación presencial</h1>
          <p className="opacity-90 mt-1">Información para alumnos e instructores</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Dual · 2 pantallas</h2>
          <ul className="list-disc ml-5 space-y-1 text-slate-700">
            <li>El instructor crea una sesión y comparte un <span className="font-medium">código</span>.</li>
            <li>Con ese código se abre la <span className="font-medium">pantalla de alumnos</span> que se proyecta en la sala.</li>
            <li>El instructor controla desde su consola qué revelar y en qué fase está el caso.</li>
          </ul>
          <p className="mt-3 text-sm text-slate-600">
            Al finalizar, se genera un informe con checklist, intervenciones y duración.
          </p>

          {isAdmin && (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/presencial/instructor"
                className="px-4 py-2 rounded-lg bg-[#0A3D91] text-white hover:opacity-90"
              >
                Abrir modo Instructor (dual)
              </Link>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Clásico · 1 pantalla</h2>
          <ul className="list-disc ml-5 space-y-1 text-slate-700">
            <li>Una sola vista con el <span className="font-medium">toolkit completo</span> para dirigir la simulación frente al equipo.</li>
            <li>Solo el instructor ve esta consola. <span className="font-medium">No requiere código</span>.</li>
          </ul>

          {isAdmin && (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/presencial"
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
              >
                Abrir modo Instructor (clásico)
              </Link>
            </div>
          )}
        </article>

        {/* Próximas simulaciones */}
        <article className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold mb-2">Próximas simulaciones</h3>

          {loadingUp && (
            <div className="text-slate-600">Cargando…</div>
          )}

          {!loadingUp && errorUp && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2">
              {errorUp}
            </div>
          )}

          {!loadingUp && !errorUp && upcoming.length === 0 && EmptyUpcoming}

          {!loadingUp && !errorUp && upcoming.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Creada: {fmtDate(u.created_at)}</div>
                  <div className="font-semibold">{u.title}</div>
                  <div className="mt-1 text-sm">
                    Código:{" "}
                    {u.code ? (
                      <code className="font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200">{u.code}</code>
                    ) : (
                      <span className="text-slate-500">Pendiente</span>
                    )}
                  </div>
                  {u.code && (
                    <div className="mt-2">
                      <Link
                        to={`/presencial-alumno/${u.code}`}
                        className="text-[#0A3D91] underline"
                      >
                        Abrir pantalla del alumnado
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold mb-1">¿Cómo se unen los alumnos?</h3>
          <p className="text-slate-700">
            Cuando el instructor inicie la sesión, anunciará un código (p. ej. <span className="font-mono">AB12CD</span>).
            Abre el enlace que comparta o entra en <span className="font-mono">/presencial-alumno/&lt;CÓDIGO&gt;</span>
            para ver la pantalla proyectada.
          </p>
        </article>
      </main>
    </div>
  );
}