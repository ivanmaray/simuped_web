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
  const [checklistTemplate, setChecklistTemplate] = useState("");
  const [triggers, setTriggers] = useState("");

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
          setRolesRequired(metaRow.roles_required ? JSON.stringify(metaRow.roles_required, null, 2) : "");
          setChecklistTemplate(metaRow.checklist_template ? JSON.stringify(metaRow.checklist_template, null, 2) : "");
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

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const scenarioIdNum = Number.parseInt(scenarioId, 10);
      if (!Number.isFinite(scenarioIdNum)) throw new Error("ID inválido");
      const payload = {
        scenario_id: scenarioIdNum,
        dual_mode: dualMode,
        instructor_brief: instructorBrief || null,
        student_brief: studentBrief || null,
        room_layout: parseJsonField(roomLayout, "room_layout"),
        roles_required: parseJsonField(rolesRequired, "roles_required"),
        checklist_template: parseJsonField(checklistTemplate, "checklist_template"),
        triggers: parseJsonField(triggers, "triggers"),
      };
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
              <JsonTextarea label="room_layout (JSON)" value={roomLayout} onChange={setRoomLayout} placeholder='{"stations":[{"id":"A","label":"Vía aérea"}]}' />
              <JsonTextarea label="roles_required (JSON)" value={rolesRequired} onChange={setRolesRequired} placeholder='[{"role":"medico","min":1,"max":2}]' />
              <JsonTextarea label="checklist_template (JSON)" value={checklistTemplate} onChange={setChecklistTemplate} placeholder='[{"group":"ABC","items":[{"label":"Valora vía aérea","type":"bool"}]}]' />
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
