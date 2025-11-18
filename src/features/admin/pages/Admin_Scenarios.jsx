import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";
import Spinner from "../../../components/Spinner.jsx";
import AdminNav from "../components/AdminNav.jsx";
import { formatLevel } from "../../../utils/formatUtils.js";
import {
  PlusCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  CalendarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

function mapScenarios(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const stepCount = Array.isArray(row?.scenario_steps) ? row.scenario_steps.length : null;
    const itemCount = Array.isArray(row?.scenario_items) ? row.scenario_items.length : null;
    return {
      ...row,
      step_count: stepCount,
      item_count: itemCount,
    };
  });
}

async function fetchScenarioList() {
    const select = `
      id,
      title,
      summary,
      status,
      mode,
      level,
      difficulty,
      estimated_minutes,
      created_at,
      scenario_steps:scenario_steps(id),
      scenario_items:scenario_items(id)
    `;
  // Try the extended select first; fallback if the DB doesn't have the new column.
  let data, error;
  ({ data, error } = await supabase
    .from("scenarios")
    .select(select)
    .contains("mode", ["online"]) 
    .order("created_at", { ascending: false }));
  if (error) {
    const m = String(error?.message || "").toLowerCase();
    if (m.includes("time_limit_minutes") || m.includes("column")) {
      const fallback = `
      id,
      title,
      summary,
      status,
      mode,
      level,
      difficulty,
      estimated_minutes,
      created_at,
      scenario_steps:scenario_steps(id),
      scenario_items:scenario_items(id)
      `;
      ({ data, error } = await supabase
        .from("scenarios")
        .select(fallback)
        .contains("mode", ["online"]) 
        .order("created_at", { ascending: false }));
    }
  }

  if (error) throw error;
  return mapScenarios(data);
}

function statusBadge(status) {
  const palette = {
    "disponible": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "en construcción: en proceso": "bg-amber-100 text-amber-800 border-amber-200",
    "en construcción: sin iniciar": "bg-rose-100 text-rose-700 border-rose-200",
    "borrador": "bg-slate-100 text-slate-700 border-slate-200",
    "archivado": "bg-slate-100 text-slate-400 border-slate-200",
    "publicado": "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  const key = (status || "").trim().toLowerCase();
  const cls = palette[key] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${cls}`}>
      {status || "—"}
    </span>
  );
}

function ScenarioRow({ scenario, onOpen }) {
  const modes = Array.isArray(scenario?.mode) ? scenario.mode.join(", ") : scenario?.mode || "—";
  const created = scenario?.created_at ? new Date(scenario.created_at) : null;
  const createdLabel = created && !Number.isNaN(created.valueOf())
    ? created.toLocaleDateString()
    : "Fecha no disponible";
  const levelLabel = formatLevel(scenario?.level) || "Sin definir";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">{scenario.title || "Escenario sin título"}</h3>
          <p className="text-sm text-slate-600">{scenario.summary || "Sin descripción"}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><FunnelIcon className="h-4 w-4" />Nivel {levelLabel}</span>
            <span className="inline-flex items-center gap-1"><CalendarIcon className="h-4 w-4" />{createdLabel}</span>
            <span className="inline-flex items-center gap-1"><ClockIcon className="h-4 w-4" />{`${scenario.estimated_minutes || "—"} min`}</span>
            <span className="inline-flex items-center gap-1">Modo: {modes}</span>
            {scenario.step_count != null ? (
              <span className="inline-flex items-center gap-1">{scenario.step_count} paso{scenario.step_count === 1 ? "" : "s"}</span>
            ) : null}
            {scenario.item_count != null ? (
              <span className="inline-flex items-center gap-1">{scenario.item_count} ítem{scenario.item_count === 1 ? "" : "s"}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {statusBadge(scenario.status)}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={onOpen}
          >
            Abrir editor
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Admin_Scenarios() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scenarios, setScenarios] = useState([]);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      setLoading(true);
      setError("");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user || null;
        if (!active) return;
        if (!user) {
          setError("No hay sesión activa");
          setLoading(false);
          return;
        }
        const { data: me, error: meErr } = await supabase
          .from("profiles")
          .select("id, nombre, apellidos, is_admin")
          .eq("id", user.id)
          .maybeSingle();
        if (!active) return;
        if (meErr) throw meErr;
        if (!me?.is_admin) {
          setError("Acceso restringido: esta sección es solo para administradores.");
          setLoading(false);
          return;
        }
        setProfile(me);
        await loadScenarios(active);
      } catch (err) {
        console.error("[Admin_Scenarios] init", err);
        if (!active) return;
        setError(err?.message || "Error cargando información");
      } finally {
        if (active) setLoading(false);
      }
    }
    async function loadScenarios(activeFlag = true) {
      try {
        const list = await fetchScenarioList();
        if (!activeFlag) return;
        setScenarios(list);
      } catch (err) {
        console.error("[Admin_Scenarios] load", err);
        if (!activeFlag) return;
        setError(err?.message || "No se pudieron cargar los escenarios");
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      const list = await fetchScenarioList();
      setScenarios(list);
    } catch (err) {
      console.error("[Admin_Scenarios] refresh", err);
      setError(err?.message || "No se pudieron recargar los escenarios");
    } finally {
      setRefreshing(false);
    }
  }

  async function createNewScenario() {
    setCreating(true);
    setError("");
    try {
      async function attemptInsert(statusValue) {
        return await supabase
          .from("scenarios")
          .insert({
            title: "Nuevo escenario",
            summary: "Descripción pendiente",
            status: statusValue,
            mode: ["online"],
            level: "basico",
            difficulty: "Básico",
            estimated_minutes: 15,
            max_attempts: 3,
          })
          .select("id")
          .single();
      }

      // Prefer 'Borrador'; fallback if constraint not yet migrated.
      let { data, error: insertError } = await attemptInsert("Borrador");
      if (insertError && String(insertError.message).includes("scenarios_status_check")) {
        ({ data, error: insertError } = await attemptInsert("En construcción: en proceso"));
      }
      if (insertError) throw insertError;
      if (!data?.id) throw new Error("No se recibió ID del nuevo escenario");

      navigate(`/admin/escenarios/${data.id}`);
    } catch (err) {
      console.error("[Admin_Scenarios] create", err);
      setError(err?.message || "No se pudo crear el escenario");
    } finally {
      setCreating(false);
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scenarios.filter((scenario) => {
      if (statusFilter !== "all") {
        const statusValue = (scenario.status || "").trim().toLowerCase();
        if (statusValue !== statusFilter) return false;
      }
      if (!query) return true;
      const levelLabel = formatLevel(scenario.level);
      const haystack = [
        scenario.title,
        scenario.summary,
  scenario.level,
        levelLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [scenarios, search, statusFilter]);

  const busy = loading || refreshing || creating;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6">
        <AdminNav />
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Escenarios online</h1>
            <p className="text-sm text-slate-600">
              Gestiona los escenarios interactivos disponibles para el alumnado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
              onClick={() => refresh()}
              disabled={busy}
            >
              <ArrowPathIcon className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
              Refrescar
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={createNewScenario}
              disabled={busy}
            >
              <PlusCircleIcon className="h-5 w-5" />
              Nuevo escenario
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="grid place-items-center py-16">
            <Spinner centered />
          </div>
        ) : null}

        {!loading && profile?.is_admin ? (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  placeholder="Buscar por título, resumen…"
                  className="w-64 max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="status-filter" className="text-xs font-medium text-slate-500">Estado</label>
                <select
                  id="status-filter"
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  disabled={busy}
                >
                  <option value="all">Todos</option>
                  <option value="disponible">Disponible</option>
                  <option value="en construcción: en proceso">En construcción: en proceso</option>
                  <option value="en construcción: sin iniciar">En construcción: sin iniciar</option>
                  <option value="borrador">Borrador</option>
                  <option value="archivado">Archivado</option>
                  <option value="publicado">Publicado</option>
                </select>
              </div>
              <div className="ml-auto text-xs text-slate-500">
                {filtered.length} escenario{filtered.length === 1 ? "" : "s"}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
                {search || statusFilter !== "all"
                  ? "No hay escenarios que coincidan con los filtros."
                  : "Aún no hay escenarios configurados."}
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((scenario) => (
                  <ScenarioRow
                    key={scenario.id}
                    scenario={scenario}
                    onOpen={() => navigate(`/admin/escenarios/${scenario.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
