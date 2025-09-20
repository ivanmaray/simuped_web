// src/pages/PresencialEscenario.jsx
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "../../../../supabaseClient";

const colors = {
  primary: "#0A3D91",
  primaryLight: "#4FA3E3",
  accent: "#1E6ACB",
};

function checklistStatusFromValue(val) {
  // Normalize input to one of: 'ok' | 'wrong' | 'missed' | 'na'
  if (val === 'ok' || val === 'wrong' || val === 'missed' || val === 'na') return val;
  if (val === true || val === 1 || val === '1' || val === 'true') return 'ok';
  if (val === false || val === 0 || val === '0' || val === 'false') return 'missed';
  return 'na';
}

function statusLabel(s) {
  switch (s) {
    case 'ok': return 'Realizado';
    case 'wrong': return 'Realizado mal';
    case 'missed': return 'No realizado';
    default: return 'N/A';
  }
}

export default function Presencial_Escenario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [sc, setSc] = useState(null);

  const [searchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [items, setItems] = useState([]); // scenario-specific items
  const [responses, setResponses] = useState({}); // { [item_id]: value }
  const [saving, setSaving] = useState(false);

  const [steps, setSteps] = useState([]);            // scenario_steps
  const [currentStepId, setCurrentStepId] = useState(null);
  const [variables, setVariables] = useState([]);    // scenario_variables
  const [sessionVars, setSessionVars] = useState({}); // { variable_id: { is_revealed, value } }
  const [rules, setRules] = useState([]);            // scenario_rules
  const [actionsTick, setActionsTick] = useState(0); // to refetch after actions
  const [sessionMeta, setSessionMeta] = useState({ started_at: null });
  const [elapsedSec, setElapsedSec] = useState(0);
  const [responsesLoaded, setResponsesLoaded] = useState(false);
  const [debriefMode, setDebriefMode] = useState(false);
  const [kpis, setKpis] = useState({ total_mlkg: 0, bolus_count: 0, time_to_abx_min: null });
  const noParticipants = !participants || participants.length === 0;

  const itemsForCurrentStep = useMemo(() => {
    if (!items || items.length === 0) return [];
    // Asignar los items sin step_id (null) al primer paso definido
    const firstStepId = steps && steps.length > 0 ? steps[0].id : null;
    const filtered = items.filter((it) => {
      const stepOfItem = it.step_id ?? firstStepId;
      return currentStepId ? stepOfItem === currentStepId : true;
    });
    // Orden + dedupe por id
    const sorted = filtered.sort(
      (a, b) =>
        (a.order_index ?? 0) - (b.order_index ?? 0) ||
        String(a.label || "").localeCompare(String(b.label || ""), "es")
    );
    const unique = [];
    const seenIds = new Set();
    for (const it of sorted) {
      if (!seenIds.has(it.id)) {
        seenIds.add(it.id);
        unique.push(it);
      }
    }
    return unique;
  }, [items, steps, currentStepId]);

  const itemsByStep = useMemo(() => {
    // Agrupar por paso asignando los items con step_id=null al primer paso
    const out = {};
    const firstStepId = steps && steps.length > 0 ? steps[0].id : 0;
    for (const it of items) {
      const key = it.step_id ?? firstStepId;
      if (!out[key]) out[key] = [];
      out[key].push(it);
    }
    // Dedupe y orden dentro de cada paso
    for (const k of Object.keys(out)) {
      const seen = new Set();
      const dedup = [];
      for (const it of out[k]) {
        if (!seen.has(it.id)) {
          seen.add(it.id);
          dedup.push(it);
        }
      }
      dedup.sort(
        (a, b) =>
          (a.order_index ?? 0) - (b.order_index ?? 0) ||
          String(a.label || "").localeCompare(String(b.label || ""), "es")
      );
      out[k] = dedup;
    }
    return out;
  }, [items, steps]);

  const varsByType = useMemo(() => {
    const out = { vital: [], lab: [], imagen: [], texto: [] };
    for (const v of variables) {
      (out[v.type] || (out[v.type] = [])).push(v);
    }
    return out;
  }, [variables]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("scenarios")
          .select("id, title, summary, level, estimated_minutes")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (mounted) setSc(data);

        // session param
        const sid = searchParams.get('session');
        if (sid) {
          setSessionId(sid);
          try {
            const { data: parts, error: perr } = await supabase
              .from('presencial_participants')
              .select('id, role, name')
              .eq('session_id', sid)
              .order('created_at', { ascending: true });
            if (!perr && parts) setParticipants(parts);
          } catch {}
          // load session meta (started_at, ended_at) to compute duration
          try {
            const { data: srow, error: serr } = await supabase
              .from('presencial_sessions')
              .select('id, started_at, ended_at')
              .eq('id', sid)
              .maybeSingle();
            if (!serr && srow) {
              // No iniciar automáticamente aquí: el inicio se controla desde PresencialInstructor
              setSessionMeta({ started_at: srow.started_at || null, ended_at: srow.ended_at || null });
              if (srow.ended_at) setDebriefMode(true);
            }
          } catch {}
        } else {
          // fallback local
          try {
            const key = `presencial:last_session:${id}`;
            const raw = localStorage.getItem(key);
            if (raw) {
              const obj = JSON.parse(raw);
              if (obj?.id) setSessionId(obj.id);
              if (Array.isArray(obj?.participants)) setParticipants(obj.participants);
            }
          } catch {}
        }

        // load scenario-specific items (DB-driven toolkit)
        try {
          const { data: it, error: ierr } = await supabase
            .from('scenario_items')
            .select('id, scenario_id, step_id, section, type, label, help, options, order_index')
            .eq('scenario_id', id)
            .order('section', { ascending: true })
            .order('order_index', { ascending: true });
          if (!ierr && it) {
            const seen = new Set();
            const dedup = [];
            for (const row of it) {
              if (row && !seen.has(row.id)) { seen.add(row.id); dedup.push(row); }
            }
            setItems(dedup);
          }
        } catch {}

        // load steps (phases) and variables and rules
        try {
          const { data: st, error: sterr } = await supabase
            .from('scenario_steps')
            .select('id, name, order_index')
            .eq('scenario_id', id)
            .order('order_index', { ascending: true });
          if (!sterr && st) {
            setSteps(st);
            if (!currentStepId && st.length > 0) setCurrentStepId(st[0].id);
          }
        } catch {}

        try {
          const { data: vars, error: verr } = await supabase
            .from('scenario_variables')
            .select('id, key, label, type, unit, initial_value')
            .eq('scenario_id', id)
            .order('id', { ascending: true });
          if (!verr && vars) setVariables(vars);
        } catch {}

        // load rules (optional)
        try {
          const { data: rs, error: rerr } = await supabase
            .from('scenario_rules')
            .select('id, applies_when, effects, order_index')
            .eq('scenario_id', id)
            .order('order_index', { ascending: true });
          if (!rerr && rs) setRules(rs);
        } catch {}

        // load session variable states if have session
        try {
          if (sid) {
            const { data: svars, error: sverr } = await supabase
              .from('session_variables')
              .select('variable_id, is_revealed, value')
              .eq('session_id', sid);
            if (!sverr && svars) {
              const map = {};
              for (const v of svars) map[v.variable_id] = { is_revealed: v.is_revealed, value: v.value };
              setSessionVars(map);
            }
          }
        } catch {}

        // load saved checklist responses for this session (mirror + normalized tri-state)
        try {
          if (sid) {
            const acc = {};
            // Legacy responses table (booleans / text)
            const { data: rws } = await supabase
              .from('session_item_responses')
              .select('item_id, value')
              .eq('session_id', sid);
            (rws || []).forEach(r => {
              acc[r.item_id] = checklistStatusFromValue(r.value);
            });
            // Canonical checklist statuses
            const { data: scl } = await supabase
              .from('session_checklist')
              .select('item_id, status')
              .eq('session_id', sid);
            (scl || []).forEach(r => {
              acc[r.item_id] = checklistStatusFromValue(r.status);
            });
            setResponses(acc);
            setResponsesLoaded(true);
          }
        } catch {}

      } catch (e) {
        setErrorMsg(e?.message || "No se pudo cargar el escenario");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, searchParams]);

  useEffect(() => {
    if (!sessionMeta?.started_at) return;
    const t0 = new Date(sessionMeta.started_at).getTime();
    // Si hay ended_at, fija la duración y no sigas tickeando
    if (sessionMeta?.ended_at) {
      const t1 = new Date(sessionMeta.ended_at).getTime();
      setElapsedSec(Math.max(0, Math.floor((t1 - t0) / 1000)));
      return;
    }
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - t0) / 1000)));
    tick();
    const h = setInterval(tick, 1000);
    return () => clearInterval(h);
  }, [sessionMeta?.started_at, sessionMeta?.ended_at]);
  // KPIs: suma de fluidos (ml/kg), nº de bolos, tiempo a antibiótico (min)
useEffect(() => {
  if (!sessionId) return;
  let mounted = true;
  (async () => {
    try {
      const { data: acts } = await supabase
        .from('session_actions')
        .select('action_key, payload, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      const a = acts || [];
      let total_mlkg = 0;
      let bolus_count = 0;
      let time_to_abx_min = null;
      for (const r of a) {
        if (r.action_key === 'bolo_cristaloide') {
          const n = Number(r.payload?.mlkg) || 0;
          if (n > 0) { total_mlkg += n; bolus_count += 1; }
        }
        if (r.action_key === 'inicio_antibiotico') {
          const m = Number(r.payload?.minutos);
          if (!Number.isNaN(m)) {
            time_to_abx_min = (time_to_abx_min == null) ? m : Math.min(time_to_abx_min, m);
          }
        }
      }
      if (mounted) setKpis({ total_mlkg, bolus_count, time_to_abx_min });
    } catch {}
  })();
  return () => { mounted = false; };
}, [sessionId, actionsTick, debriefMode]);

  function fmtDuration(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const p2 = (n) => String(n).padStart(2, '0');
    return hh > 0 ? `${hh}:${p2(mm)}:${p2(ss)}` : `${p2(mm)}:${p2(ss)}`;
  }

  function isChecked(v) {
    return v === true || v === 1 || v === '1' || v === 'true';
  }

  async function upsertSessionChecklistRows(rows) {
    if (!rows || rows.length === 0) return;
    try {
      // Remove duplicates by item_id (last wins)
      const map = new Map();
      for (const r of rows) map.set(r.item_id, r);
      const unique = Array.from(map.values());
      // We use upsert in case rows already exist
      await supabase
        .from('session_checklist')
        .upsert(unique, { onConflict: 'session_id,item_id' });
    } catch (e) {
      console.error('[Toolkit] upsertSessionChecklistRows error:', e);
    }
  }

  async function saveChecklistMark(itemId, rawVal) {
    if (!sessionId) return;
    const status = checklistStatusFromValue(rawVal);
    try {
      await supabase
        .from('session_checklist')
        .upsert({ session_id: sessionId, item_id: Number(itemId), status }, { onConflict: 'session_id,item_id' });
    } catch (e) {
      console.error('[Toolkit] saveChecklistMark error:', e);
    }
  }

  async function finalizeSimulation() {
    if (!sessionId) return;
    if (!participants || participants.length === 0) {
      alert('Debes añadir al menos un participante antes de finalizar. Vuelve a la pantalla de confirmación y añádelos.');
      return;
    }
    try {
      // ensure latest checklist saved
      await handleSave();

      // Ensure a last mirror of checkbox items into session_checklist
      try {
        const chkRows = (items || [])
          .filter(it => it && it.type === 'checkbox')
          .map(it => ({
            session_id: sessionId,
            item_id: Number(it.id),
            status: checklistStatusFromValue(responses[it.id])
          }));
        await upsertSessionChecklistRows(chkRows);
      } catch {}

      // fetch latest actions for report
      const { data: acts } = await supabase
        .from('session_actions')
        .select('id, step_id, action_key, payload, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      // build report object
      const nowIso = new Date().toISOString();
      const ended_at = nowIso;
      const report = {
        scenario_id: Number(id),
        session_id: sessionId,
        started_at: sessionMeta?.started_at,
        ended_at,
        duration_sec: elapsedSec,
        participants,
        checklist: responses,
        variables: Object.fromEntries(
          variables
            .filter(v => sessionVars[v.id]?.is_revealed)
            .map(v => [v.key, {
              label: v.label,
              unit: v.unit,
              value: sessionVars[v.id]?.value ?? v.initial_value
            }])
        ),
        actions: acts || [],
        kpis: kpis,
      };

      // 1) (opcional) guardar en reports (best-effort)
      try {
        await supabase
          .from('presencial_reports')
          .insert({
            session_id: sessionId,
            scenario_id: Number(id),
            duration_sec: elapsedSec,
            payload: report,
            created_at: ended_at
          });
      } catch { /* best-effort */ }

      // 2) Marcar la sesión como finalizada y guardar el informe en la propia sesión
      try {
        // 2) Marcar la sesión como finalizada y guardar el informe en la propia sesión
        const updatePayload = {
          ended_at: nowIso,
          report_json: report,
        };
        // Si la sesión nunca se inició (p.ej. flujo 1 pantalla), fija started_at = ahora
        if (!sessionMeta?.started_at) {
          updatePayload.started_at = nowIso;
          // también ajusta en memoria para que Evaluación vea duración coherente
          try {
            setSessionMeta((m) => ({ ...(m || {}), started_at: nowIso, ended_at: nowIso }));
          } catch {}
        }
        const { error: upErr } = await supabase
          .from('presencial_sessions')
          .update(updatePayload)
          .eq('id', sessionId);
        if (upErr) {
          console.error('[Toolkit] finalizeSimulation update error:', upErr);
          // como último recurso, intenta solo ended_at
          await supabase
            .from('presencial_sessions')
            .update({ ended_at: nowIso })
            .eq('id', sessionId);
        }
      } catch (e2) {
        console.error('[Toolkit] endSession fallback error:', e2);
      }

      // Redirigir al informe dedicado
      navigate(`/presencial/${id}/informe?session=${sessionId}`, { replace: true });
      return;
    } catch (e) {
      console.error('[Toolkit] finalizeSimulation error:', e);
      alert('No se pudo finalizar la simulación.');
    }
  }
  // Redirigir automáticamente al informe si ?debrief=1
  useEffect(() => {
    const dbg = searchParams.get('debrief');
    if (dbg === '1') {
      const sid = searchParams.get('session') || sessionId;
      if (sid) {
        navigate(`/presencial/${id}/informe?session=${sid}`, { replace: true });
      }
    }
  }, [searchParams, sessionId, id, navigate]);

  async function revealVariable(variableId) {
    if (!sessionId) return;
    const v = variables.find(x => x.id === variableId);
    if (!v) return;
    try {
      // upsert session_variables
      await supabase.from('session_variables').upsert({
        session_id: sessionId,
        variable_id: variableId,
        is_revealed: true,
        value: sessionVars[variableId]?.value ?? v.initial_value ?? null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_id,variable_id' });
      setSessionVars(s => ({ ...s, [variableId]: { is_revealed: true, value: s[variableId]?.value ?? v.initial_value ?? null } }));
    } catch (e) {
      console.error('[Toolkit] revealVariable error:', e);
    }
  }

  async function recordAction(action_key, payload = {}) {
    if (!sessionId) return;
    if (noParticipants) {
      alert('Añade al menos un participante antes de registrar intervenciones.');
      return;
    }
    try {
      await supabase.from('session_actions').insert({ session_id: sessionId, step_id: currentStepId, action_key, payload });
      setActionsTick(t => t + 1);
    } catch (e) {
      console.error('[Toolkit] recordAction error:', e);
    }
  }

  async function applyRules() {
    if (!sessionId || rules.length === 0) return;
    if (noParticipants) {
      alert('Añade al menos un participante antes de re-evaluar.');
      return;
    }
    try {
      // fetch actions for this session
      const { data: acts, error: aerr } = await supabase
        .from('session_actions')
        .select('id, action_key, payload, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (aerr) throw aerr;
      const actions = acts || [];

      // simple evaluators
      const hasAny = (cond) => actions.some(a => a.action_key === cond.action_key &&
        (cond["payload.mlkg_gte"] == null || (Number(a.payload?.mlkg) || 0) >= Number(cond["payload.mlkg_gte"])) &&
        (cond["payload.minutos_llegada_lte"] == null || (Number(a.payload?.minutos) || 9999) <= Number(cond["payload.minutos_llegada_lte"]))
      );
      const none = (cond) => !hasAny(cond);
      const sum = (cond) => actions.filter(a => a.action_key === cond.action_key)
        .reduce((acc, a) => acc + (Number(a.payload?.mlkg) || 0), 0);

      const effectsToApply = {};
      for (const r of rules) {
        const aw = r.applies_when || {};
        let ok = true;
        if (aw["actions.any"]) ok = ok && hasAny(aw["actions.any"]);
        if (aw["actions.none"]) ok = ok && none(aw["actions.none"]);
        if (aw["actions.sum"]) ok = ok && (sum(aw["actions.sum"]) < Number(aw["actions.sum"]["payload.mlkg_sum_lt"]))
        if (Array.isArray(aw.conditions)) {
          for (const c of aw.conditions) {
            if (c["actions.any"]) ok = ok && hasAny(c["actions.any"]);
            if (c["actions.none"]) ok = ok && none(c["actions.none"]);
            if (c["actions.sum"]) ok = ok && (sum(c["actions.sum"]) < Number(c["actions.sum"]["payload.mlkg_sum_lt"]))
          }
        }
        if (!ok) continue;
        const ef = r.effects || {};
        for (const [k, v] of Object.entries(ef)) {
          effectsToApply[k] = v; // last rule wins for same key
        }
      }

      // map variable key -> id
      const keyToVar = {};
      for (const v of variables) keyToVar[v.key] = v.id;

      // apply effects ("+10" / "-0.5" or absolute values)
      const upserts = [];
      for (const [key, change] of Object.entries(effectsToApply)) {
        const vid = keyToVar[key];
        if (!vid) continue;
        const curr = sessionVars[vid]?.value ?? variables.find(v => v.id === vid)?.initial_value ?? null;
        let next = curr;
        const numCurr = Number(curr);
        if (typeof change === 'string' && (change.startsWith('+') || change.startsWith('-'))) {
          const delta = Number(change);
          if (!Number.isNaN(delta) && !Number.isNaN(numCurr)) next = String(numCurr + delta);
        } else if (change != null) {
          next = String(change);
        }
        upserts.push({ session_id: sessionId, variable_id: vid, is_revealed: true, value: next, updated_at: new Date().toISOString() });
      }
      if (upserts.length > 0) {
        await supabase.from('session_variables').upsert(upserts, { onConflict: 'session_id,variable_id' });
        const map = { ...sessionVars };
        for (const u of upserts) map[u.variable_id] = { is_revealed: true, value: u.value };
        setSessionVars(map);
      }
    } catch (e) {
      console.error('[Toolkit] applyRules error:', e);
    }
  }

  async function handleSave() {
    if (!sessionId) return; // require a session to store responses
    if (noParticipants) {
      alert('Añade al menos un participante antes de guardar.');
      setSaving(false);
      return;
    }
    setSaving(true);
    try {
      const rows = Object.entries(responses).map(([item_id, value]) => ({
        session_id: sessionId,
        item_id: Number(item_id),
        value: typeof value === 'boolean' ? (value ? '1' : '0') : String(value ?? '')
      }));
      if (rows.length > 0) {
        const itemIds = rows.map(r => r.item_id);
        await supabase.from('session_item_responses').delete().eq('session_id', sessionId).in('item_id', itemIds);
        const { error: ierr } = await supabase.from('session_item_responses').insert(rows);
        if (ierr) console.error('[Toolkit] insert error:', ierr);
      }
      // Mirror checkbox-type items into session_checklist for reporting
      try {
        const chkRows = (items || [])
          .filter(it => it && it.type === 'checkbox')
          .map(it => ({
            session_id: sessionId,
            item_id: Number(it.id),
            status: checklistStatusFromValue(responses[it.id])
          }));
        await upsertSessionChecklistRows(chkRows);
      } catch (e2) {
        console.warn('[Toolkit] handleSave checklist mirror warning:', e2);
      }
    } catch (e) {
      console.error('[Toolkit] save error:', e);
    } finally {
      setSaving(false);
    }
  }

  function renderItem(it) {
    const val = responses[it.id];
    const on = (v) => setResponses((r) => ({ ...r, [it.id]: v }));
    const help = it.help ? <p className="text-xs text-slate-500 mt-1">{it.help}</p> : null;
    switch (it.type) {
      case 'heading':
        return <h4 className="text-xl font-semibold text-slate-900 mb-2">{it.label}</h4>;
      case 'text':
        return (
          <div>
            <label className="block text-sm text-slate-700 mb-1">{it.label}</label>
            <textarea rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]" value={val || ''} onChange={(e)=>on(e.target.value)} />
            {help}
          </div>
        );
      case 'checkbox': {
        const s = checklistStatusFromValue(val);
        const setStatus = (next) => {
          on(next);
          if (sessionId && !noParticipants) saveChecklistMark(it.id, next);
        };
        const btn = (code, text) => (
          <button
            type="button"
            onClick={() => setStatus(code)}
            className={`px-2.5 py-1 rounded-lg text-sm ring-1 transition ${
              s === code ? 'ring-[#1E6ACB] bg-[#4FA3E3]/10' : 'ring-slate-200 bg-white hover:bg-slate-50'
            }`}
          >{text}</button>
        );
        return (
          <div>
            <div className="text-slate-800 mb-1">{it.label}</div>
            <div className="flex flex-wrap gap-2">
              {btn('ok', 'Realizado')}
              {btn('wrong', 'Realizado mal')}
              {btn('missed', 'No realizado')}
              {btn('na', 'N/A')}
            </div>
            {help}
          </div>
        );
      }
      case 'number':
        return (
          <div>
            <label className="block text-sm text-slate-700 mb-1">{it.label}</label>
            <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]" value={val ?? ''} onChange={(e)=>on(e.target.value)} />
            {help}
          </div>
        );
      case 'choice': {
        const opts = Array.isArray(it.options) ? it.options : [];
        return (
          <div>
            <label className="block text-sm text-slate-700 mb-1">{it.label}</label>
            <div className="flex flex-wrap gap-2">
              {opts.map(opt => (
                <button key={String(opt)} type="button" onClick={() => on(String(opt))} className={`px-2.5 py-1 rounded-lg ring-1 ${val === String(opt) ? 'ring-[#1E6ACB] bg-[#4FA3E3]/10' : 'ring-slate-200 bg-white'}`}>{String(opt)}</button>
              ))}
            </div>
            {help}
          </div>
        );
      }
      default:
        return <p className="text-slate-600">{it.label}</p>;
    }
  }

  // Fallback tri-state (same UI as 2-pantallas) for hardcoded items (no DB)
  function renderTriState(label, respKey, helpText) {
    const val = responses[respKey];
    const s = checklistStatusFromValue(val);
    const setStatus = (next) => {
      setResponses((r) => ({ ...r, [respKey]: next }));
      // Ojo: estos ítems "fallback" no se guardan en DB (no hay item_id). Aparecerán en el informe local si se usa responses.
    };
    const btn = (code, text) => (
      <button
        type="button"
        onClick={() => setStatus(code)}
        className={`px-2.5 py-1 rounded-lg text-sm ring-1 transition ${s === code ? 'ring-[#1E6ACB] bg-[#4FA3E3]/10' : 'ring-slate-200 bg-white hover:bg-slate-50'}`}
      >{text}</button>
    );
    return (
      <div className="mb-2">
        <div className="text-slate-800 mb-1">{label}</div>
        <div className="flex flex-wrap gap-2">
          {btn('ok', 'Realizado')}
          {btn('wrong', 'Realizado mal')}
          {btn('missed', 'No realizado')}
          {btn('na', 'N/A')}
        </div>
        {helpText ? <p className="text-xs text-slate-500 mt-1">{helpText}</p> : null}
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-600">Cargando…</div>;
  }
  if (!sc) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="mb-3">No se encontró el escenario.</p>
          <Link to="/simulacion" className="text-[#0A3D91] underline">Volver a Simulación</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white print:hidden">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <p className="opacity-95">Toolkit presencial</p>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1">{sc.title}</h1>
          {!debriefMode ? (
            <div className="mt-2 text-white/90">
              {sc.estimated_minutes ? <span>~{sc.estimated_minutes} min</span> : null}
              {sc.summary ? <span className="ml-3 opacity-80">{sc.summary}</span> : null}
            </div>
          ) : (
            <div className="mt-2 text-white/90">Informe y debrief</div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {sessionMeta?.started_at && (
              <span className="px-3 py-1 rounded-full bg-white/15 ring-1 ring-white/30 text-sm">
                Tiempo de sesión: {fmtDuration(elapsedSec)}
              </span>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30 text-sm">
                Fluidos: {kpis.total_mlkg} ml/kg ({kpis.bolus_count} bolos)
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30 text-sm">
                ATB: {kpis.time_to_abx_min == null ? '—' : `${kpis.time_to_abx_min} min`}
              </span>
            </div>
            <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg border border-white/70 hover:bg-white/10">
              Volver
            </button>
          </div>
        </div>
      </section>

      {/* Toolkit */}
      <main className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {errorMsg && (
          <div className="lg:col-span-2 mb-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2">
            {errorMsg}
          </div>
        )}
        {!debriefMode && !sessionMeta?.started_at && (
          <div className="lg:col-span-2 mb-2 rounded-lg border border-sky-200 bg-sky-50 text-sky-900 px-4 py-2">
            La sesión aún no está iniciada. Pulsa <strong>Iniciar</strong> en la pantalla del instructor para comenzar el cronómetro.
          </div>
        )}
        {noParticipants && (
          <div className="lg:col-span-2 mb-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-4 py-2">
            Debes añadir al menos <strong>un participante</strong> antes de continuar. Vuelve a la pantalla de confirmación para añadirlos.
            <button
              type="button"
              onClick={() => navigate(`/presencial/${id}/confirm`)}
              className="ml-3 inline-flex items-center px-3 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700"
            >
              Añadir participantes
            </button>
          </div>
        )}
        {/* Participantes (si vienen de confirm) */}
        {participants && participants.length > 0 && (
          <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <h4 className="text-xl font-semibold text-slate-900 mb-3">Participantes</h4>
            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <span key={p.id || p.name + p.role} className="px-2.5 py-1 rounded-full text-[12px] ring-1 ring-slate-200 bg-slate-50 text-slate-800">
                  {(p.role === 'medico' ? 'Médico/a' : p.role === 'enfermeria' ? 'Enfermería' : p.role === 'farmacia' ? 'Farmacia' : 'Instructor/a')} · {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stepper */}
        {!debriefMode && steps && steps.length > 0 && (
          <div className="lg:col-span-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <div className="flex flex-wrap gap-2">
              {steps.map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCurrentStepId(st.id)}
                  className={`px-3 py-1.5 rounded-full text-sm ring-1 ${currentStepId === st.id ? 'ring-[#1E6ACB] bg-[#4FA3E3]/10' : 'ring-slate-200 bg-white'}`}
                >
                  {st.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Checklist del paso (dinámico) */}
        {!debriefMode && itemsForCurrentStep && itemsForCurrentStep.length > 0 && (
          <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <h4 className="text-xl font-semibold text-slate-900 mb-3">Checklist del paso</h4>
            <div className="space-y-3">
              {itemsForCurrentStep.map((it) => (
                <div key={it.id}>{renderItem(it)}</div>
              ))}
            </div>
            <div className="mt-4">
              <button
                onClick={handleSave}
                disabled={!sessionId || saving || noParticipants}
                className={`px-4 py-2 rounded-lg font-semibold transition hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6ACB] ${(!sessionId || saving || noParticipants) ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'text-slate-900'}`}
                style={!sessionId || saving || noParticipants ? undefined : { background: colors.primaryLight }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        )}

        {/* Solicitar información */}
        {!debriefMode && variables && variables.length > 0 && (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Solicitar información</h4>
            {['vital','lab','imagen','texto'].map(tp => (
              varsByType[tp] && varsByType[tp].length > 0 ? (
                <div key={tp} className="mb-3">
                  <div className="text-sm font-medium text-slate-700 mb-1">{tp === 'vital' ? 'Constantes' : tp === 'lab' ? 'Analíticas' : tp === 'imagen' ? 'Imagen' : 'Notas'}</div>
                  <div className="flex flex-wrap gap-2">
                    {varsByType[tp].map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { if (!noParticipants) revealVariable(v.id); }}
                        disabled={noParticipants}
                        className={`px-2.5 py-1 rounded-lg text-sm ring-1 ${sessionVars[v.id]?.is_revealed ? 'ring-[#1E6ACB] bg-[#4FA3E3]/10' : 'ring-slate-200 bg-white'} ${noParticipants ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        )}

        {/* Intervenciones rápidas */}
        {!debriefMode && sessionId && (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Intervenciones</h4>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (noParticipants) return;
                  const mlkg = window.prompt('Bolo cristaloide (ml/kg):', '20');
                  const n = Number(mlkg);
                  if (!Number.isNaN(n) && n > 0) recordAction('bolo_cristaloide', { mlkg: n });
                }}
                disabled={noParticipants}
                className={`px-3 py-2 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 ${noParticipants ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Registrar bolo (ml/kg)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (noParticipants) return;
                  const min = window.prompt('Minutos desde llegada para inicio de antibiótico:', '30');
                  const n = Number(min);
                  if (!Number.isNaN(n) && n >= 0) recordAction('inicio_antibiotico', { minutos: n });
                }}
                disabled={noParticipants}
                className={`px-3 py-2 rounded-lg ring-1 ring-slate-200 hover:bg-slate-50 ${noParticipants ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Iniciar antibiótico
              </button>
              <button
                type="button"
                onClick={() => { if (!noParticipants) applyRules(); }}
                disabled={noParticipants}
                className={`px-3 py-2 rounded-lg font-semibold text-slate-900 ${noParticipants ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
                style={{ background: colors.primaryLight }}
              >
                Re-evaluar (aplicar reglas)
              </button>
              <button
                type="button"
                onClick={finalizeSimulation}
                disabled={!participants || participants.length === 0}
                title={!participants || participants.length === 0 ? 'Añade al menos un participante en la confirmación' : undefined}
                className={`px-3 py-2 rounded-lg font-semibold ${(!participants || participants.length === 0) ? 'text-slate-500 cursor-not-allowed' : 'text-slate-900 hover:opacity-90'}`}
                style={{ background: '#E5F1FB' }}
              >
                Finalizar simulación
              </button>
            </div>
          </div>
        )}

        {/* Estado actual del paciente (variables reveladas) */}
        {!debriefMode && Object.keys(sessionVars).length > 0 && (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <h4 className="text-lg font-semibold text-slate-900 mb-2">Estado actual del paciente {sessionMeta?.started_at ? <span className="text-slate-500 text-sm">· {fmtDuration(elapsedSec)}</span> : null}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {variables.filter(v => sessionVars[v.id]?.is_revealed).map(v => (
                <div key={v.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                  <div className="text-slate-500 text-xs">{v.label}</div>
                  <div className="text-slate-900 text-lg font-mono">
                    {sessionVars[v.id]?.value ?? v.initial_value}
                    {v.unit ? <span className="text-slate-500 text-sm ml-1">{v.unit}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debrief screen (visible al finalizar) */}
        {debriefMode && (
          <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Informe y debrief</h2>
                <p className="text-slate-600">Escenario: {sc.title} · Duración: {fmtDuration(elapsedSec)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/presencial/${id}/informe?session=${sessionId}`)}
                  className="px-3 py-2 rounded-lg font-semibold text-slate-900 hover:opacity-90"
                  style={{ background: colors.primaryLight }}
                >
                  Abrir informe
                </button>
                <button
                  onClick={() => navigate(`/presencial/${id}/confirm`)}
                  className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  Nueva sesión
                </button>
                <button
                  onClick={() => navigate('/simulacion-presencial')}
                  className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  Volver al listado
                </button>
              </div>
            </div>

            {/* Resumen en pantalla (mismo contenido que el bloque imprimible, pero visible) */}
            <div className="mt-4 grid grid-cols-1 gap-6">
              <div>
               <h3 className="text-lg font-semibold">Resumen</h3>
               <div className="mt-2 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-sm">
                  Fluidos totales: {kpis.total_mlkg} ml/kg
                </span>
                 <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-sm">
                  N.º bolos: {kpis.bolus_count}
                 </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-sm">
                 Tiempo a antibiótico: {kpis.time_to_abx_min == null ? '—' : `${kpis.time_to_abx_min} min`}
                </span>
              </div>
              </div>
              {participants && participants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold">Participantes</h3>
                  <ul className="list-disc ml-6 text-slate-700">
                    {participants.map(p => (
                      <li key={p.id || p.name + p.role}>{(p.role === 'medico' ? 'Médico/a' : p.role === 'enfermeria' ? 'Enfermería' : p.role === 'farmacia' ? 'Farmacia' : 'Instructor/a')} · {p.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.keys(sessionVars).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold">Estado del paciente</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {variables.filter(v => sessionVars[v.id]?.is_revealed).map(v => (
                      <div key={v.id} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                        <div className="text-slate-500 text-xs">{v.label}</div>
                        <div className="text-slate-900 text-lg font-mono">
                          {sessionVars[v.id]?.value ?? v.initial_value}
                          {v.unit ? <span className="text-slate-500 text-sm ml-1">{v.unit}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {items && items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold">Checklist completa</h3>
                  {steps.length > 0 ? steps.map(st => (
                    <div key={st.id} className="mt-2">
                      <h4 className="font-semibold">{st.name}</h4>
                      <ul className="list-disc ml-6 text-slate-700">
                        {(itemsByStep[st.id] || []).map(it => (
                          <li key={it.id}>
                            <span className="font-medium">{it.label}:</span> {(() => {
                              const val = responses[it.id];
                              if (it.type === 'checkbox') {
                                const s = checklistStatusFromValue(val);
                                return s === 'ok' ? 'Realizado'
                                  : s === 'wrong' ? 'Realizado mal'
                                  : s === 'missed' ? 'No realizado'
                                  : 'N/A';
                              }
                              if (val === true) return 'Sí';
                              if (val === false) return 'No';
                              return val ?? '';
                            })()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )) : (
                    <ul className="list-disc ml-6 text-slate-700">
                      {items.map(it => (
                        <li key={it.id}>
                          <span className="font-medium">{it.label}:</span> {(() => {
                            const val = responses[it.id];
                            if (it.type === 'checkbox') {
                              const s = checklistStatusFromValue(val);
                              return s === 'ok' ? 'Realizado'
                                : s === 'wrong' ? 'Realizado mal'
                                : s === 'missed' ? 'No realizado'
                                : 'N/A';
                            }
                            if (val === true) return 'Sí';
                            if (val === false) return 'No';
                            return val ?? '';
                          })()}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold">Intervenciones registradas</h3>
                <ActionsTable sessionId={sessionId} />
              </div>
            </div>
          </div>
        )}

        {(!items || items.length === 0) && (
          <>
            {/* Roles */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
              <h4 className="text-xl font-semibold text-slate-900 mb-3">Roles del equipo</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["Médico/a","Enfermería","Farmacia","Instructor/a"].map((label) => (
                  <div key={label}>
                    <label className="block text-sm text-slate-600 mb-1">{label}</label>
                    <input className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]" placeholder="Nombre" />
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist ABCDE */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
              <h4 className="text-xl font-semibold text-slate-900 mb-3">Checklist rápida (ABCDE)</h4>
              <div className="space-y-2">
                {renderTriState('Vía aérea asegurada', 'fbk_abcde_airway')}
                {renderTriState('Ventilación / oxigenación', 'fbk_abcde_breathing')}
                {renderTriState('Circulación (acceso/FC/TA)', 'fbk_abcde_circulation')}
                {renderTriState('Neurológico (Glasgow, glucemia)', 'fbk_abcde_disability')}
                {renderTriState('Exposición (temperatura, lesiones)', 'fbk_abcde_exposure')}
              </div>
            </div>

            {/* Cronómetro */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
              <h4 className="text-xl font-semibold text-slate-900 mb-3">Cronómetro</h4>
              <Timer />
            </div>

            {/* Uso seguro del medicamento */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
              <h4 className="text-xl font-semibold text-slate-900 mb-2">Uso seguro del medicamento</h4>
              <p className="text-slate-600 mb-3">Marca los 5 correctos o documenta si no procede.</p>
              <div className="space-y-2">
                {renderTriState('Paciente correcto', 'fbk_5rights_patient')}
                {renderTriState('Medicamento correcto', 'fbk_5rights_drug')}
                {renderTriState('Dosis correcta', 'fbk_5rights_dose')}
                {renderTriState('Vía correcta', 'fbk_5rights_route')}
                {renderTriState('Hora correcta', 'fbk_5rights_time')}
              </div>
              <textarea className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]" rows={3} placeholder="Incidentes / riesgos detectados... (opcional)" />
            </div>

            {/* Debrief */}
            <div className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm print:hidden">
              <h4 className="text-xl font-semibold text-slate-900 mb-3">Debrief</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <textarea className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]" rows={4} placeholder="Qué salió bien" />
                <textarea className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]" rows={4} placeholder="Qué mejorar" />
                <textarea className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]" rows={4} placeholder="Acciones / compromisos" />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Timer() {
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);
  const reset = () => { setSec(0); setRunning(false); };
  const fmt = (n) => String(n).padStart(2, "0");
  const m = Math.floor(sec / 60);
  const s = sec % 60;

  return (
    <div className="flex items-center gap-3">
      <div className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-2xl font-mono tabular-nums">
        {fmt(m)}:{fmt(s)}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setRunning(true)} className="px-3 py-2 rounded-lg font-semibold text-slate-900" style={{ background: colors.primaryLight }}>Iniciar</button>
        <button onClick={() => setRunning(false)} className="px-3 py-2 rounded-lg font-semibold text-slate-900" style={{ background: "#E2E8F0" }}>Pausar</button>
        <button onClick={reset} className="px-3 py-2 rounded-lg font-semibold text-slate-900" style={{ background: "#F8FAFC" }}>Reiniciar</button>
      </div>
    </div>
  );
}
function ActionsTable({ sessionId }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('session_actions')
          .select('created_at, action_key, payload')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (mounted) setRows(data || []);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [sessionId]);
  return (
    <table className="w-full text-sm border border-slate-300 border-collapse">
      <thead>
        <tr className="bg-slate-100">
          <th className="border border-slate-300 text-left px-2 py-1">Hora</th>
          <th className="border border-slate-300 text-left px-2 py-1">Acción</th>
          <th className="border border-slate-300 text-left px-2 py-1">Detalles</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="border border-slate-300 px-2 py-1">{new Date(r.created_at).toLocaleTimeString()}</td>
            <td className="border border-slate-300 px-2 py-1">{r.action_key}</td>
            <td className="border border-slate-300 px-2 py-1">{JSON.stringify(r.payload)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}