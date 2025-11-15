import { useEffect, useMemo, useState } from "react";
import Navbar from "../../../components/Navbar.jsx";
import AdminNav from "../components/AdminNav.jsx";
import { supabase } from "../../../supabaseClient";

function ScenarioRow({ scenario, onOpenEquip }) {
  const created = scenario?.created_at ? new Date(scenario.created_at) : null;
  const createdLabel = created && !Number.isNaN(created.valueOf()) ? created.toLocaleDateString() : "—";
  const steps = Array.isArray(scenario.scenario_steps) ? scenario.scenario_steps.length : 0;
  const modeStr = Array.isArray(scenario.mode) ? scenario.mode.join(", ") : scenario.mode || "—";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm hover:shadow-md transition">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">{scenario.title || "Escenario"}</h3>
          <p className="text-sm text-slate-600 line-clamp-3">{scenario.summary || "Sin descripción"}</p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Creado: {createdLabel}</span>
            <span>Modo: {modeStr}</span>
            <span>Pasos: {steps}</span>
            {scenario.presencial_meta?.dual_mode ? (
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">Dual</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200">{scenario.status || "Estado"}</span>
          <a
            href={`/admin/escenarios-presenciales/${scenario.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >Meta</a>
          <button
            type="button"
            onClick={() => onOpenEquip(scenario)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            Equipamiento
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Admin_ScenariosPresenciales() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scenarios, setScenarios] = useState([]);
  const [search, setSearch] = useState("");
  const [equipEditorScenario, setEquipEditorScenario] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [equipLoading, setEquipLoading] = useState(false);
  const [equipSaving, setEquipSaving] = useState(false);
  const [equipError, setEquipError] = useState("");
  const [equipDraft, setEquipDraft] = useState([]); // [{id?, name, quantity, location, category, required, notes}]

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
        const { data, error: listErr } = await supabase
          .from("scenarios")
          .select("id,title,summary,status,mode,created_at,scenario_steps:scenario_steps(id),presencial_meta:scenario_presencial_meta(dual_mode)")
          .contains("mode", ["presencial"])
          .order("created_at", { ascending: false });
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
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scenarios;
    return scenarios.filter((s) => {
      const haystack = [s.title, s.summary, s.status].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [scenarios, search]);

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
      // Basic validation
      for (const item of equipDraft) {
        if (!item.name.trim()) throw new Error("Todos los ítems deben tener nombre");
        if (item.quantity <= 0) throw new Error("Cantidad debe ser > 0");
      }
      const scenarioId = equipEditorScenario.id;
      // Strategy: delete all then insert new (simpler for first version)
      const { error: delErr } = await supabase.from("scenario_equipment").delete().eq("scenario_id", scenarioId);
      if (delErr) throw delErr;
      if (equipDraft.length > 0) {
        const rows = equipDraft.map(d => ({
          scenario_id: scenarioId,
          name: d.name.trim(),
          quantity: d.quantity,
          location: d.location?.trim() || null,
          category: d.category?.trim() || null,
          required: !!d.required,
          notes: d.notes?.trim() || null,
        }));
        const { error: insErr } = await supabase.from("scenario_equipment").insert(rows);
        if (insErr) throw insErr;
      }
      setEquipment(equipDraft.map(d => ({ ...d })));
    } catch (err) {
      setEquipError(err?.message || "Error guardando equipamiento");
    } finally {
      setEquipSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-6 space-y-6">
        <AdminNav />
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Simulación presencial</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Escenarios presenciales</h1>
          <p className="mt-3 text-sm text-slate-600">Gestiona el equipamiento asociado a cada escenario presencial.</p>
        </header>
        <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Buscar título o resumen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              disabled={loading}
            />
            <div className="ml-auto text-xs text-slate-500">{filtered.length} escenario{filtered.length === 1 ? "" : "s"}</div>
          </div>
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          {loading ? (
            <div className="text-sm text-slate-500">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-500">No hay escenarios presenciales.</div>
          ) : (
            <div className="grid gap-4">
              {filtered.map(s => (
                <ScenarioRow key={s.id} scenario={s} onOpenEquip={openEquipmentEditor} />
              ))}
            </div>
          )}
        </section>

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
                        placeholder="Nombre"
                        value={item.name}
                        onChange={(e) => updateDraft(idx, 'name', e.target.value)}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={1}
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
                      <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={(e) => updateDraft(idx, 'required', e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                        Imprescindible
                      </label>
                      <button
                        type="button"
                        onClick={() => removeDraft(idx)}
                        className="text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-100"
                      >Quitar</button>
                      <textarea
                        placeholder="Notas"
                        value={item.notes}
                        onChange={(e) => updateDraft(idx, 'notes', e.target.value)}
                        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-slate-400 focus:outline-none"
                        rows={2}
                      />
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addDraftItem}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                      disabled={equipSaving}
                    >Añadir ítem</button>
                    <button
                      type="button"
                      onClick={saveEquipment}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                      disabled={equipSaving}
                    >{equipSaving ? 'Guardando…' : 'Guardar equipamiento'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
