import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient.js";
import Navbar from "../../../components/Navbar.jsx";
import Spinner from "../../../components/Spinner.jsx";
import AdminNav from "../components/AdminNav.jsx";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

/* ── helpers ────────────────────────────────────────────────────── */
const KIND_META = {
  info:     { label: "Información",  cls: "bg-blue-100 text-blue-700 border-blue-200" },
  decision: { label: "Decisión",     cls: "bg-amber-100 text-amber-700 border-amber-200" },
  outcome:  { label: "Desenlace",    cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

function kindBadge(kind) {
  const m = KIND_META[kind] || { label: kind, cls: "bg-slate-100 text-slate-500 border-slate-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${m.cls}`}>
      {m.label}
    </span>
  );
}

function scoreCls(delta) {
  if (delta > 0) return "text-emerald-600 font-semibold";
  if (delta < 0) return "text-rose-600 font-semibold";
  return "text-slate-500";
}

function NodeSelector({ value, nodes, onChange, placeholder = "— ninguno —" }) {
  return (
    <select
      value={value || ""}
      onChange={e => onChange(e.target.value || null)}
      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {nodes.map(n => (
        <option key={n.id} value={n.id}>
          [{n.order_index}] {KIND_META[n.kind]?.label || n.kind} — {(n.body_md || "").replace(/#+\s?/g, "").slice(0, 70)}…
        </option>
      ))}
    </select>
  );
}

/* ── OptionCard ─────────────────────────────────────────────────── */
function OptionCard({ opt, nodes, onChange, onDelete }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Texto de la opción</label>
            <textarea
              rows={2}
              value={opt.label || ""}
              onChange={e => onChange({ ...opt, label: e.target.value })}
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none resize-none"
              placeholder="Texto que ve el usuario al elegir esta opción…"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Feedback (tras seleccionar)</label>
            <textarea
              rows={2}
              value={opt.feedback_md || ""}
              onChange={e => onChange({ ...opt, feedback_md: e.target.value })}
              className="mt-0.5 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-slate-400 focus:outline-none resize-none"
              placeholder="Explicación que se muestra al usuario después de elegir…"
            />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Puntuación</label>
              <input
                type="number"
                value={opt.score_delta ?? 0}
                onChange={e => onChange({ ...opt, score_delta: Number(e.target.value) })}
                className="mt-0.5 block w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono focus:border-slate-400 focus:outline-none"
              />
              <span className={`text-xs mt-0.5 block ${scoreCls(opt.score_delta)}`}>
                {opt.score_delta > 0 ? `+${opt.score_delta} pts` : opt.score_delta < 0 ? `${opt.score_delta} pts` : "0 pts"}
              </span>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={opt.is_critical || false}
                onChange={e => onChange({ ...opt, is_critical: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              <span className="text-xs text-slate-600">Acción crítica</span>
            </label>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Lleva al nodo →</label>
            <div className="mt-0.5">
              <NodeSelector
                value={opt.next_node_id}
                nodes={nodes}
                onChange={val => onChange({ ...opt, next_node_id: val })}
                placeholder="— fin de rama —"
              />
            </div>
          </div>
        </div>
        <button
          onClick={onDelete}
          title="Eliminar opción"
          className="flex-shrink-0 mt-1 rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ── NodeCard ───────────────────────────────────────────────────── */
function NodeCard({ node, allNodes, onChange, onSave, onDelete, onAddOption, onDeleteOption, onChangeOption, saving }) {
  const [open, setOpen]           = useState(node.kind !== "outcome");
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex flex-1 items-center gap-3 text-left hover:opacity-80 transition min-w-0"
        >
          <span className="text-xs font-mono text-slate-400 w-6 flex-shrink-0">{node.order_index}</span>
          {kindBadge(node.kind)}
          <span className="flex-1 text-sm text-slate-700 truncate min-w-0">
            {(node.body_md || "").replace(/#+\s?/g, "").slice(0, 90)}
          </span>
          {node.is_terminal && (
            <span className="text-[10px] rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-500 flex-shrink-0">
              Terminal
            </span>
          )}
          {open ? <ChevronUpIcon className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDownIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />}
        </button>

        {/* Delete with confirmation */}
        {confirmDel ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-rose-600">¿Eliminar?</span>
            <button
              onClick={() => onDelete(node.id)}
              className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700 transition"
            >Sí</button>
            <button
              onClick={() => setConfirmDel(false)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 transition"
            >No</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            title="Eliminar nodo"
            className="flex-shrink-0 rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          {/* Kind selector */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
              Tipo de nodo
            </label>
            <select
              value={node.kind || "info"}
              onChange={e => onChange({ ...node, kind: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="info">Información</option>
              <option value="decision">Decisión</option>
              <option value="outcome">Desenlace</option>
            </select>
          </div>

          {/* order_index */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
              Orden (posición en el árbol)
            </label>
            <input
              type="number"
              min={0}
              value={node.order_index ?? ""}
              onChange={e => onChange({ ...node, order_index: Number(e.target.value) })}
              className="mt-1 w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
              Contenido (Markdown)
            </label>
            <textarea
              rows={node.kind === "info" ? 6 : 4}
              value={node.body_md || ""}
              onChange={e => onChange({ ...node, body_md: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-y"
              placeholder="Markdown del nodo…"
            />
          </div>

          {/* Auto-advance (info nodes) */}
          {node.kind === "info" && (
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                Avanza automáticamente a →
              </label>
              <div className="mt-1">
                <NodeSelector
                  value={node.auto_advance_to}
                  nodes={allNodes.filter(n => n.id !== node.id)}
                  onChange={val => onChange({ ...node, auto_advance_to: val })}
                  placeholder="— no avanza —"
                />
              </div>
            </div>
          )}

          {/* Terminal checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={node.is_terminal || false}
              onChange={e => onChange({ ...node, is_terminal: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-600">Nodo terminal (finaliza el caso)</span>
          </label>

          {/* Options (decision nodes) */}
          {node.kind === "decision" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                  Opciones ({node._options?.length || 0})
                </label>
                <button
                  onClick={() => onAddOption(node.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-[#0A3D91] hover:text-[#0A3D91] transition"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Añadir opción
                </button>
              </div>
              {(node._options || []).map(opt => (
                <OptionCard
                  key={opt.id}
                  opt={opt}
                  nodes={allNodes.filter(n => n.id !== node.id)}
                  onChange={updated => onChangeOption(node.id, updated)}
                  onDelete={() => onDeleteOption(node.id, opt.id)}
                />
              ))}
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={() => onSave(node)}
              disabled={saving === node.id}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A3D91] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A3D91]/90 disabled:opacity-50 transition"
            >
              {saving === node.id
                ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Guardando…</>
                : <><CheckIcon className="h-4 w-4" />Guardar nodo</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Admin_CasoRapidoEditor ─────────────────────────────────────── */
export default function Admin_CasoRapidoEditor() {
  const { caseId } = useParams();
  const navigate   = useNavigate();

  const [caseData, setCaseData]     = useState(null);
  const [nodes, setNodes]           = useState([]);     // merged with _options
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(null);   // node id being saved
  const [toast, setToast]           = useState("");
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNode, setNewNode]         = useState({ kind: "info", body_md: "", order_index: "" });
  const [addingNode, setAddingNode]   = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  /* ── Load ── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [caseRes, nodesRes, optsRes] = await Promise.all([
          supabase.from("micro_cases").select("*").eq("id", caseId).single(),
          supabase.from("micro_case_nodes").select("*").eq("case_id", caseId).order("order_index"),
          supabase.from("micro_case_options").select("*").in(
            "node_id",
            // We'll refetch once we have node IDs — for now fetch all for this case via join
            (await supabase.from("micro_case_nodes").select("id").eq("case_id", caseId)).data?.map(n => n.id) || []
          ),
        ]);
        if (caseRes.error) throw caseRes.error;
        if (nodesRes.error) throw nodesRes.error;

        const optsByNode = {};
        for (const o of optsRes.data || []) {
          if (!optsByNode[o.node_id]) optsByNode[o.node_id] = [];
          optsByNode[o.node_id].push(o);
        }
        const merged = (nodesRes.data || []).map(n => ({
          ...n,
          _options: optsByNode[n.id] || [],
        }));

        setCaseData(caseRes.data);
        setNodes(merged);
      } catch (err) {
        setError(err.message || "Error al cargar el caso.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [caseId]);

  /* ── Local state updates ── */
  const handleNodeChange = useCallback((updated) => {
    setNodes(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n));
  }, []);

  const handleOptionChange = useCallback((nodeId, updatedOpt) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId
        ? { ...n, _options: n._options.map(o => o.id === updatedOpt.id ? updatedOpt : o) }
        : n
    ));
  }, []);

  const handleAddOption = useCallback((nodeId) => {
    const tempId = `new-${Date.now()}`;
    setNodes(prev => prev.map(n =>
      n.id === nodeId
        ? { ...n, _options: [...(n._options || []), {
            id: tempId, node_id: nodeId, label: "", feedback_md: "",
            score_delta: 0, is_critical: false, next_node_id: null, _isNew: true
          }] }
        : n
    ));
  }, []);

  const handleDeleteOption = useCallback(async (nodeId, optId) => {
    if (!optId.startsWith("new-")) {
      const { error: err } = await supabase.from("micro_case_options").delete().eq("id", optId);
      if (err) { setError(err.message); return; }
    }
    setNodes(prev => prev.map(n =>
      n.id === nodeId
        ? { ...n, _options: n._options.filter(o => o.id !== optId) }
        : n
    ));
  }, []);

  /* ── Save node + its options ── */
  const handleSaveNode = useCallback(async (node) => {
    setSaving(node.id);
    setError("");
    try {
      // 1. Update node
      const { error: nodeErr } = await supabase.from("micro_case_nodes").update({
        kind:            node.kind,
        body_md:         node.body_md,
        order_index:     node.order_index,
        is_terminal:     node.is_terminal,
        auto_advance_to: node.auto_advance_to || null,
      }).eq("id", node.id);
      if (nodeErr) throw nodeErr;

      // 2. Upsert options (for decision nodes)
      for (const opt of node._options || []) {
        if (opt._isNew) {
          const { data: inserted, error: insErr } = await supabase
            .from("micro_case_options")
            .insert({
              node_id:      node.id,
              label:        opt.label,
              feedback_md:  opt.feedback_md || null,
              score_delta:  opt.score_delta ?? 0,
              is_critical:  opt.is_critical ?? false,
              next_node_id: opt.next_node_id || null,
            })
            .select("id")
            .single();
          if (insErr) throw insErr;
          // Replace temp id with real id
          setNodes(prev => prev.map(n =>
            n.id === node.id
              ? { ...n, _options: n._options.map(o => o.id === opt.id ? { ...o, id: inserted.id, _isNew: false } : o) }
              : n
          ));
        } else {
          const { error: upErr } = await supabase
            .from("micro_case_options")
            .update({
              label:        opt.label,
              feedback_md:  opt.feedback_md || null,
              score_delta:  opt.score_delta ?? 0,
              is_critical:  opt.is_critical ?? false,
              next_node_id: opt.next_node_id || null,
            })
            .eq("id", opt.id);
          if (upErr) throw upErr;
        }
      }

      showToast("Nodo guardado ✓");
    } catch (err) {
      setError(err.message || "Error al guardar el nodo.");
    } finally {
      setSaving(null);
    }
  }, []);

  /* ── Delete node ── */
  const handleDeleteNode = useCallback(async (nodeId) => {
    setError("");
    // Delete options first (in case no cascade)
    await supabase.from("micro_case_options").delete().eq("node_id", nodeId);
    const { error: err } = await supabase.from("micro_case_nodes").delete().eq("id", nodeId);
    if (err) { setError(err.message); return; }
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    showToast("Nodo eliminado ✓");
  }, []);

  /* ── Create node ── */
  const handleCreateNode = useCallback(async () => {
    if (!newNode.body_md.trim()) { setError("El contenido no puede estar vacío."); return; }
    setAddingNode(true);
    setError("");
    const maxOrder = nodes.reduce((m, n) => Math.max(m, n.order_index ?? 0), 0);
    const orderIdx = newNode.order_index !== "" ? Number(newNode.order_index) : maxOrder + 1;
    const { data, error: err } = await supabase
      .from("micro_case_nodes")
      .insert({
        case_id:     caseId,
        kind:        newNode.kind,
        body_md:     newNode.body_md.trim(),
        order_index: orderIdx,
        is_terminal: newNode.kind === "outcome",
      })
      .select()
      .single();
    setAddingNode(false);
    if (err) { setError(err.message); return; }
    setNodes(prev => [...prev, { ...data, _options: [] }].sort((a, b) => a.order_index - b.order_index));
    setNewNode({ kind: "info", body_md: "", order_index: "" });
    setShowAddNode(false);
    showToast("Nodo creado ✓");
  }, [newNode, nodes, caseId]);

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6">
        <AdminNav />

        {/* Back + title */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/casos-rapidos")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {caseData?.title || "Cargando…"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {nodes.length} nodo{nodes.length !== 1 ? "s" : ""} en el árbol de decisión
            </p>
          </div>
        </div>

        {/* Leyenda */}
        {!loading && nodes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="font-medium">Tipos:</span>
            {Object.entries(KIND_META).map(([k, m]) => (
              <span key={k} className={`rounded-full border px-2 py-0.5 ${m.cls}`}>{m.label}</span>
            ))}
            <span className="ml-4 text-slate-400">Los nodos se guardan individualmente.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Spinner centered /></div>
        ) : (
          <div className="space-y-2">
            {nodes.map(node => (
              <NodeCard
                key={node.id}
                node={node}
                allNodes={nodes}
                onChange={handleNodeChange}
                onSave={handleSaveNode}
                onDelete={handleDeleteNode}
                onAddOption={handleAddOption}
                onDeleteOption={handleDeleteOption}
                onChangeOption={handleOptionChange}
                saving={saving}
              />
            ))}

            {/* ── Añadir nodo ── */}
            {showAddNode ? (
              <div className="rounded-2xl border border-dashed border-[#0A3D91]/40 bg-white px-4 py-4 space-y-3 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-700">Nuevo nodo</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Tipo</label>
                    <select
                      value={newNode.kind}
                      onChange={e => setNewNode(n => ({ ...n, kind: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    >
                      <option value="info">Información</option>
                      <option value="decision">Decisión</option>
                      <option value="outcome">Desenlace</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
                      Orden (dejar vacío = al final)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newNode.order_index}
                      onChange={e => setNewNode(n => ({ ...n, order_index: e.target.value }))}
                      placeholder="Auto"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Contenido (Markdown) *</label>
                  <textarea
                    rows={4}
                    value={newNode.body_md}
                    onChange={e => setNewNode(n => ({ ...n, body_md: e.target.value }))}
                    placeholder="Texto del nodo en Markdown…"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-slate-400 focus:outline-none resize-y"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddNode(false); setNewNode({ kind: "info", body_md: "", order_index: "" }); }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 transition"
                  >Cancelar</button>
                  <button
                    onClick={handleCreateNode}
                    disabled={addingNode}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0A3D91] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0A3D91]/90 disabled:opacity-50 transition"
                  >
                    {addingNode
                      ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creando…</>
                      : <><PlusIcon className="h-4 w-4" />Crear nodo</>}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddNode(true)}
                className="w-full rounded-2xl border border-dashed border-slate-300 py-3 text-sm text-slate-400 hover:border-[#0A3D91]/50 hover:text-[#0A3D91] transition flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Añadir nodo
              </button>
            )}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
