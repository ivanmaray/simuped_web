import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";
import Spinner from "../../../components/Spinner.jsx";
import AdminNav from "../components/AdminNav.jsx";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

const statusOptions = [
  { value: "Disponible", label: "Disponible" },
  { value: "Borrador", label: "Borrador" },
  { value: "Archivado", label: "Archivado" },
  { value: "Publicado", label: "Publicado" },
];

const difficultyOptions = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

const baseModeOptions = [
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "dual", label: "Dual" },
];

function normalizeMode(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value ? [value] : [];
  return [];
}

export default function Admin_ScenarioEditor() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scenario, setScenario] = useState(null);
  const [form, setForm] = useState(null);
  const [customMode, setCustomMode] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const { data, error: fetchErr } = await supabase
          .from("scenarios")
          .select(`
            id,
            title,
            summary,
            status,
            mode,
            level,
            difficulty,
            estimated_minutes,
            max_attempts,
            created_at,
            updated_at
          `)
          .eq("id", scenarioId)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!active) return;
        if (!data) {
          setError("Escenario no encontrado");
          setScenario(null);
          setForm(null);
          return;
        }
        setScenario(data);
        setForm({
          title: data.title || "",
          summary: data.summary || "",
          status: data.status || "Disponible",
          mode: normalizeMode(data.mode),
          level: data.level || "",
          difficulty: data.difficulty || "",
          estimated_minutes: data.estimated_minutes ?? 10,
          max_attempts: data.max_attempts ?? 3,
        });
      } catch (err) {
        console.error("[Admin_ScenarioEditor] load", err);
        if (!active) return;
        setError(err?.message || "No se pudo cargar el escenario");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [scenarioId]);

  useEffect(() => {
    setSuccess("");
  }, [form]);

  const modeOptions = useMemo(() => {
    const current = form?.mode || [];
    const extras = current
      .filter((value) => !baseModeOptions.some((option) => option.value === value))
      .map((value) => ({ value, label: value }));
    const merged = [...baseModeOptions];
    extras.forEach((option) => {
      if (!merged.some((item) => item.value === option.value)) {
        merged.push(option);
      }
    });
    return merged;
  }, [form?.mode]);

  function handleFieldChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function toggleMode(value) {
    setForm((prev) => {
      const current = new Set(prev?.mode || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return {
        ...prev,
        mode: Array.from(current),
      };
    });
  }

  function addCustomMode(event) {
    event.preventDefault();
    const value = customMode.trim();
    if (!value) return;
    setForm((prev) => {
      const current = new Set(prev?.mode || []);
      current.add(value);
      return {
        ...prev,
        mode: Array.from(current),
      };
    });
    setCustomMode("");
  }

  async function handleSave() {
    if (!form) return;
    setError("");
    setSuccess("");
    if (!form.title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    if (!form.mode || form.mode.length === 0) {
      setError("Selecciona al menos un modo");
      return;
    }
    setSaving(true);
    try {
      const estimated = Number.parseInt(form.estimated_minutes, 10);
      const attempts = Number.parseInt(form.max_attempts, 10);
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        status: form.status || null,
        mode: form.mode,
        level: form.level.trim() || null,
        difficulty: form.difficulty || null,
        estimated_minutes: Number.isFinite(estimated) ? estimated : 10,
        max_attempts: Number.isFinite(attempts) ? attempts : 3,
      };
      const { data, error: updateErr } = await supabase
        .from("scenarios")
        .update(payload)
        .eq("id", scenarioId)
        .select()
        .maybeSingle();
      if (updateErr) throw updateErr;
      setScenario(data);
      setSuccess("Escenario actualizado correctamente");
    } catch (err) {
      console.error("[Admin_ScenarioEditor] save", err);
      setError(err?.message || "No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto flex h-[60vh] max-w-4xl items-center justify-center px-4">
          <Spinner centered />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-12">
          <AdminNav />
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Volver
          </button>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-rose-700">
            {error || "No se encontró el escenario solicitado."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-6 space-y-6">
        <AdminNav />
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Volver a la lista
        </button>

        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Editor de escenario</p>
              <h1 className="text-2xl font-semibold text-slate-900">{form.title || "Escenario sin título"}</h1>
              <p className="text-sm text-slate-500">ID {scenario?.id} · creado {scenario?.created_at ? new Date(scenario.created_at).toLocaleString() : "—"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setSaving(true);
                  supabase
                    .from("scenarios")
                    .select(
                      `
                        id,
                        title,
                        summary,
                        status,
                        mode,
                        level,
                        difficulty,
                        estimated_minutes,
                        max_attempts,
                        created_at,
                        updated_at
                      `
                    )
                    .eq("id", scenarioId)
                    .maybeSingle()
                    .then(({ data, error: fetchErr }) => {
                      if (fetchErr) throw fetchErr;
                      if (data) {
                        setScenario(data);
                        setForm({
                          title: data.title || "",
                          summary: data.summary || "",
                          status: data.status || "Disponible",
                          mode: normalizeMode(data.mode),
                          level: data.level || "",
                          difficulty: data.difficulty || "",
                          estimated_minutes: data.estimated_minutes ?? 10,
                          max_attempts: data.max_attempts ?? 3,
                        });
                      }
                    })
                    .catch((err) => {
                      console.error("[Admin_ScenarioEditor] refresh", err);
                      setError(err?.message || "No se pudo recargar el escenario");
                    })
                    .finally(() => setSaving(false));
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                disabled={saving}
              >
                <ArrowPathIcon className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} /> Recargar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
          {success ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircleIcon className="h-4 w-4" /> {success}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <ExclamationCircleIcon className="h-4 w-4" /> {error}
            </div>
          ) : null}
        </header>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Información general</h2>
            <div className="mt-4 grid gap-4">
              <label className="block text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">Título</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => handleFieldChange("title", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Título del escenario"
                />
              </label>
              <label className="block text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">Resumen / briefing</span>
                <textarea
                  rows={4}
                  value={form.summary}
                  onChange={(event) => handleFieldChange("summary", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Descripción corta que verán los alumnos"
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Estado</span>
                  <select
                    value={form.status}
                    onChange={(event) => handleFieldChange("status", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-600">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Dificultad</span>
                  <select
                    value={form.difficulty || ""}
                    onChange={(event) => handleFieldChange("difficulty", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">Sin definir</option>
                    {difficultyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-slate-600">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Nivel</span>
                  <input
                    type="text"
                    value={form.level || ""}
                    onChange={(event) => handleFieldChange("level", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Ej. R1 pediatría, Residente avanzada…"
                  />
                </label>
                <div className="block text-sm text-slate-600">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Modo</span>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {modeOptions.map((option) => {
                      const checked = form.mode?.includes(option.value);
                      return (
                        <label key={option.value} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMode(option.value)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                  <form onSubmit={addCustomMode} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customMode}
                      onChange={(event) => setCustomMode(event.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      placeholder="Añadir modo personalizado"
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                    >
                      Añadir
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Parámetros de intento</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">Duración estimada (minutos)</span>
                <input
                  type="number"
                  min="1"
                  value={form.estimated_minutes}
                  onChange={(event) => handleFieldChange("estimated_minutes", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
              <label className="block text-sm text-slate-600">
                <span className="text-xs uppercase tracking-wide text-slate-400">Intentos máximos</span>
                <input
                  type="number"
                  min="1"
                  value={form.max_attempts}
                  onChange={(event) => handleFieldChange("max_attempts", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-100 px-6 py-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Próximos pasos</p>
            <p className="mt-2">
              Desde aquí ya puedes actualizar los metadatos principales del escenario. El siguiente paso será construir un editor visual
              para pasos, ítems, checklist y reglas. Mientras tanto, cualquier cambio manual en la base de datos se respetará.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
