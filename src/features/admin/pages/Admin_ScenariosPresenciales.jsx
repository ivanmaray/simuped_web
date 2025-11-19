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

function ScenarioRow({ scenario, onOpenEquip, onOpenEditor }) {
  const modes = Array.isArray(scenario?.mode) ? scenario.mode.join(", ") : scenario?.mode || "—";
  const created = scenario?.created_at ? new Date(scenario.created_at) : null;
  const createdLabel = created && !Number.isNaN(created.valueOf())
    ? created.toLocaleDateString()
    : "Fecha no disponible";
  const levelLabel = formatLevel(scenario?.level) || "Sin definir";
  const steps = Array.isArray(scenario.scenario_steps) ? scenario.scenario_steps.length : 0;
  const dmeta = scenario.presencial_meta || {};
  const rolesCount = Array.isArray(dmeta.roles_required) ? dmeta.roles_required.length : (Array.isArray(dmeta.roles_required?.[0]) ? dmeta.roles_required.length : 0);
  const checklistGroupsCount = Array.isArray(dmeta.checklist_template) ? dmeta.checklist_template.length : 0;
  const triggersCount = Array.isArray(dmeta.triggers) ? dmeta.triggers.length : 0;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">{scenario.title || "Escenario sin título"} {dmeta?.dual_mode ? <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ml-2">Dual</span> : null}</h3>
          <p className="text-sm text-slate-600">{scenario.summary || "Sin descripción"}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><FunnelIcon className="h-4 w-4" />Nivel {levelLabel}</span>
            <span className="inline-flex items-center gap-1"><CalendarIcon className="h-4 w-4" />{createdLabel}</span>
            <span className="inline-flex items-center gap-1"><ClockIcon className="h-4 w-4" />{`${scenario.estimated_minutes || "—"} min`}</span>
            <span className="inline-flex items-center gap-1">Modo: {modes}</span>
            {steps != null ? (
              <span className="inline-flex items-center gap-1">{steps} paso{steps === 1 ? "" : "s"}</span>
            ) : null}
            {rolesCount ? (
              <span className="inline-flex items-center gap-1">{rolesCount} rol{rolesCount === 1 ? "" : "es"}</span>
            ) : null}
            {checklistGroupsCount ? (
              <span className="inline-flex items-center gap-1">{checklistGroupsCount} checklist</span>
            ) : null}
            {triggersCount ? (
              <span className="inline-flex items-center gap-1">{triggersCount} trigger{triggersCount === 1 ? "" : "s"}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {statusBadge(scenario.status)}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={() => onOpenEditor?.(scenario)}
          >
            Abrir editor
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={() => onOpenEquip?.(scenario)}
          >
            Equipamiento
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Admin_ScenariosPresenciales() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scenarios, setScenarios] = useState([]);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [equipEditorScenario, setEquipEditorScenario] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [equipLoading, setEquipLoading] = useState(false);
  const [equipSaving, setEquipSaving] = useState(false);
  const [equipError, setEquipError] = useState("");
  const [equipDraft, setEquipDraft] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) throw new Error("No hay sesión");
        const { data: me, error: meErr } = await supabase
          .from("profiles")
          .select("id,is_admin")
          .eq("id", user.id)
          .maybeSingle();
        if (meErr) throw meErr;
        if (!me?.is_admin) throw new Error("Acceso restringido");
        setProfile(me || null);

        let data, listErr;
        ({ data, error: listErr } = await supabase
          .from("scenarios")
          .select(
            "id,title,summary,status,mode,created_at,estimated_minutes,scenario_steps:scenario_steps(id),presencial_meta:scenario_presencial_meta(dual_mode,instructor_brief,student_brief,room_layout,roles_required,checklist_template,triggers)"
          )
          .contains("mode", ["presencial"])
          .order("created_at", { ascending: false }));

        if (listErr) throw listErr;
        if (!active) return;
        setScenarios(data || []);
      } catch (err) {
        if (active) setError(err?.message || "Error cargando escenarios");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scenarios.filter((s) => {
      if (statusFilter !== "all") {
        const statusValue = (s.status || "").trim().toLowerCase();
        if (statusValue !== statusFilter) return false;
      }
      if (!q) return true;
      const levelLabel = formatLevel(s.level);
      const haystack = [s.title, s.summary, s.level, levelLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [scenarios, search, statusFilter]);

  const busy = loading || refreshing || creating;

  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      let data, listErr;
      ({ data, listErr } = await supabase
        .from("scenarios")
        .select("id,title,summary,status,mode,created_at,estimated_minutes,scenario_steps:scenario_steps(id),presencial_meta:scenario_presencial_meta(dual_mode)")
        .contains("mode", ["presencial"])
        .order("created_at", { ascending: false }));
      if (listErr) throw listErr;
      setScenarios(data || []);
    } catch (err) {
      setError(err?.message || "Error cargando escenarios");
    } finally {
      setRefreshing(false);
    }
  }

  async function createNewScenario() {
    setCreating(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("scenarios")
        .insert({
          title: "Nuevo escenario presencial",
          summary: "Descripción pendiente",
          status: "Borrador",
          mode: ["presencial"],
          level: "basico",
          estimated_minutes: 15,
        })
        .select("id");
      if (error) throw error;
      const newId = Array.isArray(data) ? data[0]?.id : data?.id;
      navigate(`/admin/escenarios-presenciales/${newId}`);
    } catch (err) {
      setError(err?.message || "No se pudo crear el escenario");
    } finally {
      setCreating(false);
    }
  }

  async function openEquipmentEditor(scenario) {
    setEquipEditorScenario(scenario);
    setEquipLoading(true);
    setEquipError("");
    try {
      const { data, error: eqErr } = await supabase
        .from("scenario_equipment")
        .select("id,name,quantity,location,category,required,notes")
        .eq("scenario_id", scenario.id)
        .order("name", { ascending: true });
      if (eqErr) throw eqErr;
      setEquipment(data || []);
      setEquipDraft((data || []).map(e => ({ ...e })));
    } catch (err) {
      setEquipError(err?.message || "No se pudo cargar el equipamiento");
    } finally {
      setEquipLoading(false);
    }
  }

  function addDraftItem() {
    setEquipDraft(prev => [...prev, { name: "", quantity: 1, location: "", category: "", required: true, notes: "" }]);
  }

  function updateDraft(idx, field, value) {
    setEquipDraft(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeDraft(idx) {
    setEquipDraft(prev => prev.filter((_, i) => i !== idx));
  }

  async function saveEquipment() {
    if (!equipEditorScenario) return;
    setEquipSaving(true);
    setEquipError("");
    try {
      // validations
      for (const it of equipDraft) {
        if (!it.name?.trim()) throw new Error("Todos los ítems deben tener nombre");
        if ((it.quantity || 0) <= 0) throw new Error("Cantidad debe ser > 0");
      }
      const scenarioId = equipEditorScenario.id;
      // delete existing
      const { error: delErr } = await supabase.from("scenario_equipment").delete().eq("scenario_id", scenarioId);
      if (delErr) throw delErr;
      // insert new
      if (equipDraft.length > 0) {
        const rows = equipDraft.map(it => ({ scenario_id: scenarioId, name: it.name.trim(), quantity: it.quantity, location: it.location?.trim() || null, category: it.category?.trim() || null, required: !!it.required, notes: it.notes?.trim() || null }));
        const { error: insErr } = await supabase.from("scenario_equipment").insert(rows);
        if (insErr) throw insErr;
      }
      setEquipment(equipDraft.map(it => ({...it})));
      setEquipEditorScenario(null);
      setEquipDraft([]);
    } catch (err) {
      setEquipError(err?.message || "Error guardando equipamiento");
    } finally {
      setEquipSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6">
        <AdminNav />
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Escenarios presenciales</h1>
              <p className="text-sm text-slate-600">Gestiona los escenarios presenciales con detalles y equipamiento.</p>
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
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="grid place-items-center py-16"><Spinner centered /></div>
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
                <div className="ml-auto text-xs text-slate-500">{filtered.length} escenario{filtered.length === 1 ? "" : "s"}</div>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-500">{search || statusFilter !== "all" ? "No hay escenarios que coincidan con los filtros." : "Aún no hay escenarios configurados."}</div>
              ) : (
                <div className="grid gap-4">
                  {filtered.map((scenario) => (
                    <ScenarioRow key={scenario.id} scenario={scenario} onOpenEditor={() => navigate(`/admin/escenarios-presenciales/${scenario.id}`)} onOpenEquip={openEquipmentEditor} />
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </main>

        {equipEditorScenario && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-6 overflow-y-auto">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200 p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Equipamiento · {equipEditorScenario.title}</h2>
                  <p className="text-xs text-slate-500">Define los recursos físicos requeridos para la sesión.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setEquipEditorScenario(null); setEquipDraft([]); }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  disabled={equipSaving}
                >Cerrar</button>
              </div>
              {equipError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{equipError}</div>}
              {equipLoading ? (
                <div className="text-sm text-slate-500">Cargando equipamiento…</div>
              ) : (
                <div className="space-y-3">
                  {equipDraft.map((item, idx) => (
                    <div key={item.id || idx} className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3 md:flex-row md:items-center">
                      <input
                        type="text"
                        placeholder="Nombre del recurso"
                        value={item.name}
                        onChange={(e) => updateDraft(idx, 'name', e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Cantidad"
                        value={item.quantity}
                        onChange={(e) => updateDraft(idx, 'quantity', Number(e.target.value) || 1)}
                        className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Ubicación"
                        value={item.location}
                        onChange={(e) => updateDraft(idx, 'location', e.target.value)}
                        className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Categoría"
                        value={item.category}
                        onChange={(e) => updateDraft(idx, 'category', e.target.value)}
                        className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <textarea
                        placeholder="Notas adicionales"
                        value={item.notes || ''}
                        onChange={(e) => updateDraft(idx, 'notes', e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={(e) => updateDraft(idx, 'required', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                        Imprescindible
                      </label>
                      <button type="button" className="ml-auto text-sm text-rose-600" onClick={() => removeDraft(idx)}>Eliminar</button>
                    </div>
                  ))}
                  <div className="flex gap-3 items-center">
                    <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700" onClick={addDraftItem}>Añadir ítem</button>
                    <div className="flex-1" />
                    <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setEquipEditorScenario(null); setEquipDraft([]); }}>Cancelar</button>
                    <button type="button" disabled={equipSaving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700" onClick={saveEquipment}>{equipSaving ? 'Guardando…' : 'Guardar'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      
    </div>
  );
}
