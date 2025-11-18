import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";
import AdminNav from "../components/AdminNav.jsx";
import { supabase } from "../../../supabaseClient";

function JsonTextarea({ label, value, onChange, placeholder, rows = 6 }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono leading-relaxed focus:border-slate-400 focus:outline-none"
      />
    </label>
  );
}

export default function Admin_ScenarioPresencialEditor() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scenario, setScenario] = useState(null);
  const [meta, setMeta] = useState(null);

  // Form state
  const [dualMode, setDualMode] = useState(false);
  const [instructorBrief, setInstructorBrief] = useState("");
  const [studentBrief, setStudentBrief] = useState("");
  const [roomLayout, setRoomLayout] = useState("");
  const [rolesRequired, setRolesRequired] = useState("");
  const [structuredRoom, setStructuredRoom] = useState([]);
  const [structuredRoles, setStructuredRoles] = useState([]);
  const [structuredRoomError, setStructuredRoomError] = useState("");
  const [structuredRolesError, setStructuredRolesError] = useState("");
  const [checklistTemplate, setChecklistTemplate] = useState("");
  const [structuredChecklist, setStructuredChecklist] = useState([]);
  const [structuredChecklistError, setStructuredChecklistError] = useState("");
  const [triggers, setTriggers] = useState("");
  const [jsonError, setJsonError] = useState("");

  const SAMPLE_META = {
    dual_mode: true,
    instructor_brief: "Niño de 8 años con traumatismo craneoencefálico tras caída. Ingreso al área de reanimación; equipo debe priorizar ABC y preparación para intervenciones avanzadas si empeora. Objetivos instructor: supervisión de la priorización y manejo del equipo.",
    student_brief: "Breve: participante del equipo de reanimación pediátrica; estabiliza ABC y decide intervenciones prioritarias.",
    room_layout: { stations: [{ id: "A", label: "Reanimación" }, { id: "B", label: "Farmacología" }, { id: "C", label: "Monitorización" }] },
    roles_required: [ { role: "medico", min: 1, max: 2 }, { role: "enfermeria", min: 1, max: 2 }, { role: "farmacia", min: 1, max: 1 } ],
    checklist_template: [
      { group: "Primario", items: [ { type: "bool", label: "Asegurar protección cervical" }, { type: "bool", label: "Evaluar Glasgow inicial" }, { type: "bool", label: "Valoración pupilas" }, { type: "bool", label: "Plan intubación si Glasgow ≤8" } ] },
      { group: "Ventilación", items: [ { type: "bool", label: "Preparar secuencia rápida" }, { type: "bool", label: "Capnografía post intubación" }, { type: "bool", label: "Mantener EtCO2 35-40" } ] },
      { group: "Neuroprotección", items: [ { type: "bool", label: "Evitar hipotensión (PA > P5)" }, { type: "bool", label: "Sat > 94%" }, { type: "bool", label: "Considerar manitol/SS hipertónica si anisocoria" } ] }
    ],
    triggers: [
      { event: "time_elapsed", action: "show_alert", message: "Revalúa Glasgow y pupilas", minutes: 5 },
      { event: "time_elapsed", action: "show_alert", message: "Verifica parámetros ventilatorios", minutes: 10 },
      { event: "variable_change", action: "show_alert", message: "Optimiza oxigenación", variable: "sat", condition: "<92" },
      { event: "variable_change", action: "show_alert", message: "Prepara tratamiento osmótico", variable: "glasgow", condition: "<=5" }
    ]
  };

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) throw new Error("Sin sesión");
        const { data: me, error: meErr } = await supabase.from("profiles").select("id,is_admin").eq("id", user.id).maybeSingle();
        if (meErr) throw meErr;
        if (!me?.is_admin) throw new Error("Acceso restringido");
        const { data: scenarioRow, error: sErr } = await supabase
          .from("scenarios")
          .select("id,title,summary,status,mode,created_at")
          .eq("id", scenarioId)
          .maybeSingle();
        if (sErr) throw sErr;
        if (!scenarioRow) throw new Error("Escenario no encontrado");
        const { data: metaRow, error: mErr } = await supabase
          .from("scenario_presencial_meta")
          .select("scenario_id,dual_mode,instructor_brief,student_brief,room_layout,roles_required,checklist_template,triggers")
          .eq("scenario_id", scenarioId)
          .maybeSingle();
        if (mErr) throw mErr;
        if (!active) return;
        setScenario(scenarioRow);
        setMeta(metaRow || null);
        if (metaRow) {
          setDualMode(Boolean(metaRow.dual_mode));
          setInstructorBrief(metaRow.instructor_brief || "");
          setStudentBrief(metaRow.student_brief || "");
          setRoomLayout(metaRow.room_layout ? JSON.stringify(metaRow.room_layout, null, 2) : "");
          setStructuredRoom((metaRow.room_layout && metaRow.room_layout.stations) ? metaRow.room_layout.stations : []);
          setRolesRequired(metaRow.roles_required ? JSON.stringify(metaRow.roles_required, null, 2) : "");
          setStructuredRoles(metaRow.roles_required || []);
          setChecklistTemplate(metaRow.checklist_template ? JSON.stringify(metaRow.checklist_template, null, 2) : "");
          setStructuredChecklist(metaRow.checklist_template || []);
          setTriggers(metaRow.triggers ? JSON.stringify(metaRow.triggers, null, 2) : "");
        }
      } catch (err) {
        if (active) setError(err?.message || "Error cargando datos");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [scenarioId]);

  function parseJsonField(text, fieldName) {
    const raw = (text || "").trim();
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`JSON inválido en ${fieldName}`);
    }
  }

  function validateJsonFields() {
    try {
      // validate room_layout via structuredRoom or raw JSON
      if (structuredRoom && structuredRoom.length > 0) {
        if (!Array.isArray(structuredRoom)) throw new Error('room_layout.stations debe ser un array');
        const seen = new Set();
        for (const s of structuredRoom) {
          if (!s || !String(s.id || '').trim()) throw new Error('Cada estación debe tener un id');
          if (!String(s.label || '').trim()) throw new Error('Cada estación debe tener un label');
          if (seen.has(String(s.id).trim())) throw new Error('IDs de estaciones duplicados');
          seen.add(String(s.id).trim());
        }
      } else {
        parseJsonField(roomLayout, 'room_layout');
      }
      // validate roles_required via structuredRoles or raw JSON
      if (structuredRoles && structuredRoles.length > 0) {
        if (!Array.isArray(structuredRoles)) throw new Error('roles_required debe ser un array');
        for (const r of structuredRoles) {
          if (!r || !String(r.role || '').trim()) throw new Error('Cada rol debe tener un nombre');
          const minV = Number.parseInt(r.min, 10);
          const maxV = Number.parseInt(r.max, 10);
          if (!Number.isFinite(minV) || !Number.isFinite(maxV)) throw new Error('min/max deben ser enteros');
          if (minV > maxV) throw new Error('min no puede ser mayor que max');
        }
      } else {
        parseJsonField(rolesRequired, 'roles_required');
      }
      // If we use structuredChecklist, we validate it; otherwise parse the text area content.
      if (structuredChecklist && structuredChecklist.length > 0) {
        // Ensure it's a valid array structure
        if (!Array.isArray(structuredChecklist)) throw new Error('checklist_template debe ser un array');
        // Validate groups and items
        for (const g of structuredChecklist) {
          if (!g || !g.group || !String(g.group).trim()) throw new Error('Cada grupo debe tener un nombre');
          if (!Array.isArray(g.items)) throw new Error('Cada grupo debe tener un array `items`');
          for (const it of g.items) {
            if (!it || !String(it.label || '').trim()) throw new Error('Cada ítem debe tener una etiqueta');
            if (it.type === 'score' && (it.weight === undefined || it.weight === null || isNaN(Number(it.weight)))) throw new Error('Ítems tipo score deben llevar peso numérico');
          }
        }
      } else {
        parseJsonField(checklistTemplate, 'checklist_template');
      }
      parseJsonField(triggers, 'triggers');
      setJsonError("");
      setStructuredChecklistError("");
      return true;
    } catch (err) {
      setJsonError(err?.message || "JSON inválido");
      setStructuredChecklistError(err?.message || "JSON inválido");
      return false;
    }
  }

  function moveGroup(gi, direction) {
    setStructuredChecklist(prev => {
      const out = [...prev];
      const ni = gi + direction;
      if (ni < 0 || ni >= out.length) return prev;
      const tmp = out[ni];
      out[ni] = out[gi];
      out[gi] = tmp;
      return out;
    });
  }

  function moveItem(gi, ii, direction) {
    setStructuredChecklist(prev => {
      const out = prev.map(g => ({ ...g, items: Array.isArray(g.items) ? [...g.items] : [] }));
      const group = out[gi];
      if (!group) return prev;
      const ni = ii + direction;
      if (ni < 0 || ni >= group.items.length) return prev;
      const tmp = group.items[ni];
      group.items[ni] = group.items[ii];
      group.items[ii] = tmp;
      return out;
    });
  }

  function moveStation(idx, direction) {
    setStructuredRoom(prev => {
      const out = [...prev];
      const ni = idx + direction;
      if (ni < 0 || ni >= out.length) return prev;
      const tmp = out[ni];
      out[ni] = out[idx];
      out[idx] = tmp;
      return out;
    });
  }

  function addStation() {
    setStructuredRoom(prev => [...prev, { id: '', label: '' }]);
  }

  function removeStation(idx) {
    setStructuredRoom(prev => prev.filter((_, i) => i !== idx));
  }

  function moveRole(idx, direction) {
    setStructuredRoles(prev => {
      const out = [...prev];
      const ni = idx + direction;
      if (ni < 0 || ni >= out.length) return prev;
      const tmp = out[ni];
      out[ni] = out[idx];
      out[idx] = tmp;
      return out;
    });
  }

  function addRole() {
    setStructuredRoles(prev => [...prev, { role: '', min: 1, max: 1 }]);
  }

  function removeRole(idx) {
    setStructuredRoles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const scenarioIdNum = Number.parseInt(scenarioId, 10);
      if (!Number.isFinite(scenarioIdNum)) throw new Error("ID inválido");
      if (!validateJsonFields()) throw new Error('Corrige los JSON antes de guardar');
      // Build payload using structuredChecklist when available
      const payload = {
        scenario_id: scenarioIdNum,
        dual_mode: dualMode,
        instructor_brief: instructorBrief || null,
        student_brief: studentBrief || null,
        room_layout: parseJsonField(roomLayout, "room_layout"),
        roles_required: parseJsonField(rolesRequired, "roles_required"),
        checklist_template: (structuredChecklist && structuredChecklist.length > 0) ? structuredChecklist : parseJsonField(checklistTemplate, "checklist_template"),
        triggers: parseJsonField(triggers, "triggers"),
      };
      setJsonError("");
      if (meta) {
        const { error: upErr } = await supabase
          .from("scenario_presencial_meta")
          .update(payload)
          .eq("scenario_id", scenarioIdNum);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("scenario_presencial_meta").insert(payload);
        if (insErr) throw insErr;
        setMeta(payload);
      }
      setSuccess("Metadatos guardados");
    } catch (err) {
      setError(err?.message || "Error guardando metadatos");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 space-y-6">
        <AdminNav />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >Volver</button>
          <h1 className="text-xl font-semibold text-slate-900">Meta presencial</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!confirm('Poblar con el ejemplo de TCE pediátrico? Se reemplazarán los valores actuales.')) return;
                setDualMode(Boolean(SAMPLE_META.dual_mode));
                setInstructorBrief(SAMPLE_META.instructor_brief);
                setStudentBrief(SAMPLE_META.student_brief);
                setRoomLayout(JSON.stringify(SAMPLE_META.room_layout, null, 2));
                setRolesRequired(JSON.stringify(SAMPLE_META.roles_required, null, 2));
                setChecklistTemplate(JSON.stringify(SAMPLE_META.checklist_template, null, 2));
                setTriggers(JSON.stringify(SAMPLE_META.triggers, null, 2));
                setJsonError("");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >Poblar ejemplo</button>
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-slate-600">Cargando…</div>
        ) : error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">Configuración</h2>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={dualMode}
                  onChange={(e) => setDualMode(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                />
                Modo dual (alumno/instructor)
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Brief instructor</span>
                  <textarea
                    value={instructorBrief}
                    onChange={(e) => setInstructorBrief(e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs leading-relaxed focus:border-slate-400 focus:outline-none"
                    placeholder="Contexto detallado para instructor"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-slate-600">Brief alumnos</span>
                  <textarea
                    value={studentBrief}
                    onChange={(e) => setStudentBrief(e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs leading-relaxed focus:border-slate-400 focus:outline-none"
                    placeholder="Información visible para participantes"
                  />
                </label>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-semibold text-slate-700">Estructura avanzada</h2>
              {jsonError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{jsonError}</div>}
              {/* Structured room layout editor */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Room layout</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => { setRoomLayout(JSON.stringify({ stations: structuredRoom }, null, 2)); alert('Room layout JSON copiado al textarea para exportar.'); }}>Exportar JSON</button>
                    <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => {
                      try {
                        const parsed = parseJsonField(roomLayout, 'room_layout');
                        setStructuredRoom(parsed?.stations || []);
                        setStructuredRoomError("");
                        alert('Room layout importado');
                      } catch (err){ setStructuredRoomError(err?.message || 'Error'); }
                    }}>Importar JSON</button>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {structuredRoom.length === 0 && <div className="text-xs text-slate-500">No hay estaciones. Añade una para empezar.</div>}
                  {structuredRoom.map((st, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <input className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Id" value={st.id || ''} onChange={(e) => setStructuredRoom(prev => prev.map((g, i) => i === si ? { ...g, id: e.target.value } : g))} />
                      <input className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Label" value={st.label || ''} onChange={(e) => setStructuredRoom(prev => prev.map((g, i) => i === si ? { ...g, label: e.target.value } : g))} />
                      <div className="flex gap-2">
                        <button type="button" title="Subir" onClick={() => moveStation(si, -1)} className="text-xs px-2 py-1 bg-slate-100 rounded">▲</button>
                        <button type="button" title="Bajar" onClick={() => moveStation(si, 1)} className="text-xs px-2 py-1 bg-slate-100 rounded">▼</button>
                      </div>
                      <button type="button" className="text-xs text-rose-600" onClick={() => removeStation(si)}>Eliminar</button>
                    </div>
                  ))}
                  <div className="mt-1">
                    <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs text-white hover:bg-green-700" onClick={addStation}>Añadir estación</button>
                  </div>
                </div>
              </div>
              {/* Hidden JSON textarea for room_layout */}
              <div className="mt-3 hidden">
                <JsonTextarea label="room_layout (JSON)" value={roomLayout} onChange={setRoomLayout} placeholder='{"stations":[{"id":"A","label":"Vía aérea"}]}' />
              </div>
              {(() => {
                try {
                  const rl = roomLayout ? JSON.parse(roomLayout) : null;
                  if (rl && Array.isArray(rl.stations) && rl.stations.length > 0) {
                    return (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {rl.stations.map((s, i) => (
                          <span key={i} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 border border-slate-200">{s.id} · {s.label}</span>
                        ))}
                      </div>
                    );
                  }
                } catch (err) {
                  return null;
                }
                return null;
              })()}
              {/* Structured roles editor */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Roles requeridos</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => { setRolesRequired(JSON.stringify(structuredRoles, null, 2)); alert('Roles JSON copiado'); }}>Exportar JSON</button>
                    <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => {
                      try {
                        const parsed = parseJsonField(rolesRequired, 'roles_required');
                        if (!Array.isArray(parsed)) throw new Error('roles_required debe ser un array');
                        setStructuredRoles(parsed);
                        setStructuredRolesError("");
                        alert('Roles importados');
                      } catch (err) { setStructuredRolesError(err?.message || 'Error'); }
                    }}>Importar JSON</button>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {structuredRoles.length === 0 && <div className="text-xs text-slate-500">No hay roles. Añade uno para empezar.</div>}
                  {structuredRoles.map((r, ri) => (
                    <div key={ri} className="flex items-center gap-2">
                      <input className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Role" value={r.role || ''} onChange={(e) => setStructuredRoles(prev => prev.map((g, i) => i === ri ? { ...g, role: e.target.value } : g))} />
                      <input className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Min" type="number" value={r.min || 0} onChange={(e) => setStructuredRoles(prev => prev.map((g, i) => i === ri ? { ...g, min: Number(e.target.value) } : g))} />
                      <input className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Max" type="number" value={r.max || 0} onChange={(e) => setStructuredRoles(prev => prev.map((g, i) => i === ri ? { ...g, max: Number(e.target.value) } : g))} />
                      <div className="flex gap-2">
                        <button type="button" title="Subir" onClick={() => moveRole(ri, -1)} className="text-xs px-2 py-1 bg-slate-100 rounded">▲</button>
                        <button type="button" title="Bajar" onClick={() => moveRole(ri, 1)} className="text-xs px-2 py-1 bg-slate-100 rounded">▼</button>
                      </div>
                      <button type="button" className="text-xs text-rose-600" onClick={() => removeRole(ri)}>Eliminar</button>
                    </div>
                  ))}
                  <div className="mt-1">
                    <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs text-white hover:bg-green-700" onClick={addRole}>Añadir rol</button>
                  </div>
                </div>
              </div>
              {/* Structured checklist editor */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Checklist</span>
                  <div className="flex items-center gap-2">
                    <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => {
                      // export JSON
                      setChecklistTemplate(JSON.stringify(structuredChecklist, null, 2));
                      alert('El JSON del checklist se ha enviado al área JSON para copiar/exportar.');
                    }}>Exportar JSON</button>
                    <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => {
                      // import JSON from textarea
                      try {
                        const parsed = parseJsonField(checklistTemplate, 'checklist_template');
                        if (!Array.isArray(parsed)) throw new Error('checklist_template debe ser un array');
                        setStructuredChecklist(parsed);
                        setStructuredChecklistError("");
                        alert('Checklist importado');
                      } catch (err) {
                        setStructuredChecklistError(err?.message || 'Error importando JSON');
                      }
                    }}>Importar JSON</button>
                  </div>
                </div>
                {structuredChecklist.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">No hay grupos. Añade uno para empezar.</div>
                ) : null}
                {structuredChecklistError ? (
                  <div className="text-xs text-rose-600 py-2">{structuredChecklistError}</div>
                ) : null}
                <div className="space-y-3 mt-3">
                  <div className="text-xs text-slate-500">Consejo: usa las flechas ▲/▼ para reordenar grupos e ítems. Los ítems tipo <code>score</code> requieren un peso numérico.</div>
                  {structuredChecklist.map((group, gi) => (
                    <div key={gi} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                      <div className="flex items-start gap-3">
                            <input className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Nombre del grupo" value={group.group || ''} onChange={(e) => {
                              const value = e.target.value;
                              setStructuredChecklist(prev => prev.map((g, i) => i === gi ? { ...g, group: value } : g));
                            }} />
                            <div className="flex items-center gap-2">
                              <button type="button" title="Subir grupo" onClick={() => moveGroup(gi, -1)} className="text-xs px-2 py-1 bg-slate-100 rounded">▲</button>
                              <button type="button" title="Bajar grupo" onClick={() => moveGroup(gi, 1)} className="text-xs px-2 py-1 bg-slate-100 rounded">▼</button>
                            </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="text-xs text-rose-600" onClick={() => setStructuredChecklist(prev => prev.filter((_, i) => i !== gi))}>Eliminar grupo</button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                          {(group.items || []).map((it, ii) => (
                          <div key={ii} className="flex items-center gap-2">
                            <select className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs" value={it.type} onChange={(e) => setStructuredChecklist(prev => prev.map((g, i) => i === gi ? { ...g, items: g.items.map((x, j) => j === ii ? { ...x, type: e.target.value } : x) } : g))}>
                              <option value="bool">bool</option>
                              <option value="text">text</option>
                              <option value="score">score</option>
                            </select>
                            <input className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Etiqueta" value={it.label || ''} onChange={(e) => setStructuredChecklist(prev => prev.map((g, i) => i === gi ? { ...g, items: g.items.map((x, j) => j === ii ? { ...x, label: e.target.value } : x) } : g))} />
                            <input className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm" placeholder="Peso" value={it.weight || ''} onChange={(e) => setStructuredChecklist(prev => prev.map((g, i) => i === gi ? { ...g, items: g.items.map((x, j) => j === ii ? { ...x, weight: e.target.value } : x) } : g))} />
                            <div className="flex gap-2">
                              <button type="button" title="Subir ítem" onClick={() => moveItem(gi, ii, -1)} className="text-xs px-2 py-1 bg-slate-100 rounded">▲</button>
                              <button type="button" title="Bajar ítem" onClick={() => moveItem(gi, ii, 1)} className="text-xs px-2 py-1 bg-slate-100 rounded">▼</button>
                            </div>
                            <button type="button" className="text-xs text-rose-600" onClick={() => setStructuredChecklist(prev => prev.map((g, i) => i === gi ? { ...g, items: g.items.filter((_, j) => j !== ii) } : g))}>Eliminar</button>
                          </div>
                        ))}
                        <div>
                          <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white hover:bg-indigo-700" onClick={() => setStructuredChecklist(prev => prev.map((g, i) => i === gi ? { ...g, items: [...(g.items || []), { type: 'bool', label: '' }] } : g))}>Añadir ítem</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs text-white hover:bg-green-700" onClick={() => setStructuredChecklist(prev => [...prev, { group: 'Nuevo grupo', items: [] }])}>Añadir grupo</button>
                </div>
                {/* Hidden JSON area if user wants to inspect */}
                <div className="mt-3 hidden">
                  <JsonTextarea label="checklist_template (JSON)" value={checklistTemplate} onChange={setChecklistTemplate} placeholder='[{"group":"ABC","items":[{"label":"Valora vía aérea","type":"bool"}]}]' />
                </div>
              </div>
              <JsonTextarea label="triggers (JSON)" value={triggers} onChange={setTriggers} placeholder='[{"event":"variable_change","variable":"sat","condition":"<90","action":"show_alert"}]' />
            </div>
            {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">{success}</div>}
            {error && !loading && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</div>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >{saving ? "Guardando…" : "Guardar metadatos"}</button>
              <button
                type="button"
                onClick={() => navigate(`/admin/escenarios-presenciales`)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >Listado</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
