import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient.js";
import Navbar from "../../../components/Navbar.jsx";
import Spinner from "../../../components/Spinner.jsx";
import AdminNav from "../components/AdminNav.jsx";
import {
  ArrowPathIcon,
  FunnelIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

const DIFFICULTY_META = {
  facil:      { label: "Fácil",      cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  intermedio: { label: "Intermedio", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  avanzado:   { label: "Avanzado",   cls: "bg-red-100 text-red-700 border-red-200" },
};

const ROLE_LABELS = { medico: "Medicina", enfermeria: "Enfermería", farmacia: "Farmacia" };

const DIFFICULTY_OPTIONS = [
  { value: "facil",      label: "Fácil" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado",   label: "Avanzado" },
];

function diffBadge(difficulty) {
  const key = (difficulty || "").toLowerCase();
  const meta = DIFFICULTY_META[key];
  if (!meta) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

/* ── EditModal ─────────────────────────────────────────────────── */
function EditModal({ mc, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: mc.title || "",
    summary: mc.summary || "",
    difficulty: mc.difficulty || "facil",
    estimated_minutes: mc.estimated_minutes ?? "",
    recommended_roles: mc.recommended_roles || [],
    is_published: mc.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function toggleRole(role) {
    setForm(f => ({
      ...f,
      recommended_roles: f.recommended_roles.includes(role)
        ? f.recommended_roles.filter(r => r !== role)
        : [...f.recommended_roles, role],
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) { setErr("El título es obligatorio."); return; }
    setSaving(true);
    setErr("");
    const { error } = await supabase
      .from("micro_cases")
      .update({
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        difficulty: form.difficulty,
        estimated_minutes: form.estimated_minutes !== "" ? Number(form.estimated_minutes) : null,
        recommended_roles: form.recommended_roles,
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mc.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved({ ...mc, ...form });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Editar caso rápido</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-4 px-6 py-5">
          {err && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{err}</p>}

          <label className="block text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Título *</span>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>

          <label className="block text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Resumen</span>
            <textarea
              rows={3}
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Dificultad</span>
              <select
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {DIFFICULTY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Duración (min)</span>
              <input
                type="number"
                min={1}
                value={form.estimated_minutes}
                onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </label>
          </div>

          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Roles recomendados</span>
            <div className="mt-2 flex gap-2 flex-wrap">
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    form.recommended_roles.includes(role)
                      ? "bg-[#0A3D91] border-[#0A3D91] text-white"
                      : "border-slate-200 text-slate-600 hover:border-[#0A3D91]/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-[#0A3D91]"
            />
            <span className="text-sm text-slate-700">Publicado (visible para los usuarios)</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#0A3D91] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D91]/90 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── CasoRow ───────────────────────────────────────────────────── */
function CasoRow({ mc, nodeCount, stats, onEdit, onTogglePublished }) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    await onTogglePublished(mc.id, !mc.is_published);
    setToggling(false);
  }

  const roles = Array.isArray(mc.recommended_roles) ? mc.recommended_roles : [];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-slate-900 truncate">{mc.title}</h3>
            {diffBadge(mc.difficulty)}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full ${
              mc.is_published
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
              {mc.is_published ? "Publicado" : "No publicado"}
            </span>
          </div>
          {mc.summary && <p className="text-sm text-slate-500 line-clamp-2">{mc.summary}</p>}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {mc.estimated_minutes && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" />{mc.estimated_minutes} min
              </span>
            )}
            {nodeCount != null && (
              <span className="inline-flex items-center gap-1">
                <FunnelIcon className="h-3.5 w-3.5" />{nodeCount} nodos
              </span>
            )}
            {roles.length > 0 && (
              <span>{roles.map(r => ROLE_LABELS[r] || r).join(" · ")}</span>
            )}
            {stats && stats.attempts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                {stats.attempts} intento{stats.attempts === 1 ? "" : "s"} · media {stats.avgScore}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={mc.is_published ? "Ocultar caso" : "Publicar caso"}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
              mc.is_published
                ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            {mc.is_published
              ? <><EyeSlashIcon className="h-3.5 w-3.5" />Ocultar</>
              : <><EyeIcon className="h-3.5 w-3.5" />Publicar</>}
          </button>
          <Link
            to={`/admin/casos-rapidos/${mc.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0A3D91]/30 px-3 py-1.5 text-xs font-medium text-[#0A3D91] transition hover:bg-[#0A3D91]/5"
          >
            <PencilSquareIcon className="h-3.5 w-3.5" />
            Editar árbol
          </Link>
          <button
            onClick={() => onEdit(mc)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Editar
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── Admin_CasosRapidos ─────────────────────────────────────────── */
export default function Admin_CasosRapidos() {
  const [cases, setCases]           = useState([]);
  const [nodeCounts, setNodeCounts] = useState({});
  const [caseStats, setCaseStats]   = useState({});
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [diffFilter, setDiffFilter] = useState("all");
  const [pubFilter, setPubFilter]   = useState("all");
  const [editingMc, setEditingMc]   = useState(null);

  async function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [casesRes, nodesRes, attemptsRes] = await Promise.all([
        supabase.from("micro_cases").select("*").order("title", { ascending: true }),
        supabase.from("micro_case_nodes").select("case_id"),
        supabase.from("micro_case_attempts").select("case_id, score_total, status"),
      ]);
      if (casesRes.error) throw casesRes.error;
      setCases(casesRes.data || []);
      // Count nodes per case
      const counts = {};
      for (const n of nodesRes.data || []) {
        counts[n.case_id] = (counts[n.case_id] || 0) + 1;
      }
      setNodeCounts(counts);
      // Aggregate attempt stats per case (only completed)
      const agg = {};
      for (const a of attemptsRes?.data || []) {
        if (a.status !== "completed") continue;
        if (!agg[a.case_id]) agg[a.case_id] = { attempts: 0, sum: 0 };
        agg[a.case_id].attempts += 1;
        agg[a.case_id].sum += typeof a.score_total === "number" ? a.score_total : 0;
      }
      const statsMap = {};
      for (const [id, { attempts, sum }] of Object.entries(agg)) {
        statsMap[id] = { attempts, avgScore: attempts > 0 ? (sum / attempts).toFixed(1) : "0" };
      }
      setCaseStats(statsMap);
    } catch (err) {
      setError(err.message || "Error al cargar los casos rápidos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function handleTogglePublished(id, newValue) {
    const { error: err } = await supabase
      .from("micro_cases")
      .update({ is_published: newValue, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (err) { setError(err.message); return; }
    setCases(prev => prev.map(c => c.id === id ? { ...c, is_published: newValue } : c));
  }

  function handleSaved(updated) {
    setCases(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter(mc => {
      if (diffFilter !== "all" && (mc.difficulty || "").toLowerCase() !== diffFilter) return false;
      if (pubFilter === "published" && !mc.is_published) return false;
      if (pubFilter === "unpublished" && mc.is_published) return false;
      if (!q) return true;
      return (mc.title || "").toLowerCase().includes(q) ||
             (mc.summary || "").toLowerCase().includes(q);
    });
  }, [cases, search, diffFilter, pubFilter]);

  const busy = loading || refreshing;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6">
        <AdminNav />

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Casos rápidos</h1>
            <p className="mt-1 text-sm text-slate-500">
              Gestiona los microcasos clínicos del entrenamiento rápido.
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <input
            type="search"
            placeholder="Buscar por título o descripción…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={busy}
            className="w-64 max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <label htmlFor="diff-filter" className="text-xs font-medium text-slate-500">Dificultad</label>
            <select
              id="diff-filter"
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              value={diffFilter}
              onChange={e => setDiffFilter(e.target.value)}
              disabled={busy}
            >
              <option value="all">Todas</option>
              <option value="facil">Fácil</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="pub-filter" className="text-xs font-medium text-slate-500">Estado</label>
            <select
              id="pub-filter"
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              value={pubFilter}
              onChange={e => setPubFilter(e.target.value)}
              disabled={busy}
            >
              <option value="all">Todos</option>
              <option value="published">Publicados</option>
              <option value="unpublished">No publicados</option>
            </select>
          </div>
          <div className="ml-auto text-xs text-slate-500">
            {filtered.length} caso{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner centered /></div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
                {search || diffFilter !== "all" || pubFilter !== "all"
                  ? "No hay casos que coincidan con los filtros."
                  : "Aún no hay casos rápidos configurados."}
              </div>
            ) : (
              filtered.map(mc => (
                <CasoRow
                  key={mc.id}
                  mc={mc}
                  nodeCount={nodeCounts[mc.id] ?? null}
                  stats={caseStats[mc.id] ?? null}
                  onEdit={setEditingMc}
                  onTogglePublished={handleTogglePublished}
                />
              ))
            )}
          </div>
        )}
      </main>

      {editingMc && (
        <EditModal
          mc={editingMc}
          onClose={() => setEditingMc(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
