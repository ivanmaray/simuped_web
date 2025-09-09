// /src/pages/PresencialInforme.jsx
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../supabaseClient";
import Navbar from "../../../../components/Navbar.jsx";

const STATUS_LABEL = { ok: "Bien", wrong: "Mal", missed: "No hecho", na: "N/A" };
const STATUS_EMOJI = { ok: "✅", wrong: "❌", missed: "⬜", na: "∅" };

// Normalizador robusto para estados provenientes de distintas tablas/idiomas
function normalizeStatusAny(x) {
  const s = String(x || "").toLowerCase().trim();
  if (!s) return undefined;
  if (["ok", "correcto", "bien", "hecho", "realizado"].includes(s)) return "ok";
  if (["wrong", "incorrecto", "mal", "error"].includes(s)) return "wrong";
  if (["missed", "no hecho", "pendiente", "omitido", "no realizado"].includes(s)) return "missed";
  if (["na", "n/a", "no aplica", "no aplicable"].includes(s)) return "na";
  return undefined;
}

// Versión optimizada y bonita del informe presencial
export default function Presencial_Informe() {
  const { sessionId: sessionIdParam, id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const qpSession = searchParams.get('session') || searchParams.get('sid') || searchParams.get('s');
  // Resolvemos el sessionId a usar:
  const [resolvedSessionId, setResolvedSessionId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [session, setSession] = useState(null);         // presencial_sessions
  const [scenario, setScenario] = useState(null);       // scenarios
  const [participants, setParticipants] = useState([]); // presencial_participants
  const [checkRows, setCheckRows] = useState([]);       // join scenario_checklist + session_checklist
  const [vars, setVars] = useState([]);                 // variables reveladas finales
  const [hasChecklistStructure, setHasChecklistStructure] = useState(false); // hay items definidos en el escenario
  const [events, setEvents] = useState([]); // cronología de la sesión (session_events)

  // Resolver sessionId: acepta :sessionId directo, query ?session=, o si solo viene :id (scenario_id) buscamos la última finalizada
  useEffect(() => {
    const sid = sessionIdParam || qpSession;
    if (sid) { setResolvedSessionId(sid); return; }
    // Si no hay sid y tenemos routeId, intentar buscar la última sesión finalizada de ese escenario
    if (!routeId) { setResolvedSessionId(null); return; }
    let cancelled = false;
    (async () => {
      try {
        // Detectar si routeId es numérico (bigint) o uuid/texto
        const scenarioFilter = /^\d+$/.test(routeId) ? Number(routeId) : routeId;

        // Primero: última finalizada
        const { data: fin, error: finErr } = await supabase
          .from('presencial_sessions')
          .select('id')
          .eq('scenario_id', scenarioFilter)
          .not('ended_at', 'is', null)
          .order('ended_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && !finErr && fin?.id) {
          setResolvedSessionId(fin.id);
          return;
        }

        // Fallback: si no hay finalizadas, tomar la última iniciada
        const { data: anyLast } = await supabase
          .from('presencial_sessions')
          .select('id')
          .eq('scenario_id', scenarioFilter)
          .order('started_at', { ascending: false, nullsFirst: true })
          .limit(1)
          .maybeSingle();

        if (!cancelled) setResolvedSessionId(anyLast?.id || null);
      } catch {
        if (!cancelled) setResolvedSessionId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionIdParam, qpSession, routeId]);

  const duration = useMemo(() => {
    if (!session?.started_at) return null;
    const t0 = new Date(session.started_at).getTime();
    const t1 = new Date(session.ended_at || Date.now()).getTime();
    const s = Math.max(0, Math.floor((t1 - t0) / 1000));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const p2 = (n) => String(n).padStart(2, "0");
    return hh > 0 ? `${hh}:${p2(mm)}:${p2(ss)}` : `${p2(mm)}:${p2(ss)}`;
  }, [session?.started_at, session?.ended_at]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!resolvedSessionId) {
          setErr('Falta el identificador de la sesión.');
          setLoading(false);
          return;
        }
        setLoading(true);
        setErr("");

        // 1) Sesión
        const { data: s, error: sErr } = await supabase
          .from("presencial_sessions")
          .select("id, scenario_id, started_at, ended_at, public_code, banner_text")
          .eq("id", resolvedSessionId)
          .maybeSingle();
        if (sErr) throw sErr;
        if (!mounted) return;
        setSession(s);

        // 2) Escenario
        if (s?.scenario_id) {
          const { data: sc } = await supabase
            .from("scenarios")
            .select("id, title, summary")
            .eq("id", s.scenario_id)
            .maybeSingle();
          if (!mounted) return;
          setScenario(sc || null);
        }

        // 3) Participantes (si existe la tabla)
        try {
          const { data: pts } = await supabase
            .from("presencial_participants")
            .select("id, role, name, user_id")
            .eq("session_id", resolvedSessionId)
            .order("role", { ascending: true });
          if (!mounted) return;
          const ordered = (pts || []).slice().sort((a,b) => {
            const ra = roleOrder(a.role);
            const rb = roleOrder(b.role);
            if (ra !== rb) return ra - rb;
            const na = (a.name || "").toString();
            const nb = (b.name || "").toString();
            return na.localeCompare(nb, "es", { sensitivity: "base" });
          });
          setParticipants(ordered);
        } catch {
          /* sin participantes -> ignoramos */
        }

        // 4) Checklist: usar la vista extendida (incluye quién y cuándo marcó)
        try {
          const { data: rows, error: rowsErr } = await supabase
            .from("vw_session_checklist_ext")
            .select("item_id, item_label, status, status_text, note, updated_at, updated_by_display, item_order")
            .eq("session_id", resolvedSessionId)
            .order("item_order", { ascending: true });

          if (rowsErr) throw rowsErr;

          const mapped = (rows || []).map(r => ({
            item_id: r.item_id,
            label: r.item_label,
            status: normalizeStatusAny(r.status) || normalizeStatusAny(r.status_text) || "na",
            note: r.note || "",
            updated_at: r.updated_at || null,
            updated_by_display: r.updated_by_display || ""
          }));

          setHasChecklistStructure((rows || []).length > 0);
          setCheckRows(mapped);
        } catch {
          // Fallback: si la vista no existe o falla, dejamos vacío (y el resto del informe sigue funcionando)
          setHasChecklistStructure(false);
          setCheckRows([]);
        }

        // 5) Variables reveladas (estado final)
        try {
          const { data: sv } = await supabase
            .from("session_variables")
            .select("variable_id, is_revealed, value, variables:variable_id(label,unit,type)")
            .eq("session_id", resolvedSessionId)
            .eq("is_revealed", true);
          const cards = (sv || []).map(r => ({
            id: r.variable_id,
            label: r.variables?.label,
            unit: r.variables?.unit,
            type: r.variables?.type,
            value: r.value
          }));
          if (!mounted) return;
          setVars(cards);
        } catch { setVars([]); }

        // 6) Cronología de la sesión (si existe la tabla)
        try {
          const { data: evs } = await supabase
            .from("session_events")
            .select("at, kind, payload")
            .eq("session_id", resolvedSessionId)
            .order("at", { ascending: true });
          if (mounted) setEvents(evs || []);
        } catch {
          if (mounted) setEvents([]);
        }

      } catch (e) {
        setErr(e?.message || "No se pudo generar el informe.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [resolvedSessionId]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-600">Generando informe…</div>;
  }
  if (err || !session) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="mb-3">{err || "No se encontró la sesión."}</p>
          <Link to="/evaluacion" className="text-[#0A3D91] underline">Volver</Link>
        </div>
      </div>
    );
  }

  // Indicadores rápidos para cabecera
  const indicators = [
    { label: "Participantes", value: participants.length },
    { label: "Eventos", value: events.length },
    { label: "Checklist", value: checkRows.length },
    { label: "Datos revelados", value: vars.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="print:hidden"><Navbar /></div>
      {/* Cabecera del informe */}
      <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white print:bg-white print:text-slate-900 print:from-white print:via-white print:to-white shadow-lg print:shadow-none">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">
                Informe de Simulación
              </h1>
              <div className="text-lg font-medium mt-2">
                {scenario?.title
                  ? <>Escenario: <span className="font-semibold">{scenario.title}</span></>
                  : "Escenario"}
              </div>
              <div className="text-sm opacity-90 mt-1">
                Sesión: <span className="font-mono">{resolvedSessionId}</span>
                {session.public_code && (
                  <> · Código: <span className="font-mono">{session.public_code}</span></>
                )}
              </div>
              {scenario?.summary && (
                <div className="mt-2 text-sm opacity-80 italic">{scenario.summary}</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-white/15 ring-1 ring-white/30 hover:bg-white/20 transition print:hidden"
                  title="Imprimir o guardar como PDF"
                >
                  Imprimir / PDF
                </button>
                <Link
                  to="/evaluacion"
                  className="px-3 py-1.5 rounded-lg bg-white/15 ring-1 ring-white/30 hover:bg-white/20 transition print:hidden"
                >
                  Volver
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {indicators.map((ind, idx) => (
                  <span key={ind.label} className="inline-block px-2 py-0.5 text-xs rounded-full bg-white/20 ring-1 ring-white/30 print:bg-slate-100 print:ring-slate-200 text-white print:text-slate-700 font-semibold">
                    {ind.label}: <span className="font-mono">{ind.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30 print:bg-slate-100 print:ring-slate-200 text-white print:text-slate-700">
              Inicio: {session.started_at ? new Date(session.started_at).toLocaleString() : "—"}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30 print:bg-slate-100 print:ring-slate-200 text-white print:text-slate-700">
              Fin: {session.ended_at ? new Date(session.ended_at).toLocaleString() : "—"}
            </span>
            {duration && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 ring-1 ring-white/30 print:bg-slate-100 print:ring-slate-200 text-white print:text-slate-700">
                Duración: {duration}
              </span>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-10 space-y-10 print:space-y-6">
        {/* Participantes */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md print:shadow-none print:border print:bg-white">
          <h2 className="text-xl font-semibold mb-4 border-b border-slate-100 pb-2">Participantes</h2>
          {participants.length === 0 ? (
            <div className="text-slate-600">Sin participantes registrados.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {participants.map(p => (
                <div key={p.id} className="rounded-lg shadow-sm border border-slate-100 bg-slate-50 p-4 flex flex-col gap-1">
                  <div className="text-slate-500 text-xs uppercase tracking-wide">{prettyRole(p.role)}</div>
                  <div className="font-medium text-base">{p.name || "—"}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Mensaje final en pantalla */}
        {session.banner_text && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md print:shadow-none print:border print:bg-white">
            <h2 className="text-xl font-semibold mb-3 border-b border-slate-100 pb-2">Mensaje final en pantalla</h2>
            <div className="whitespace-pre-wrap text-slate-800 bg-slate-50 border border-slate-100 rounded-lg p-4 mt-2 shadow-sm">{session.banner_text}</div>
          </section>
        )}

        {/* Cronología */}
        {events.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md print:shadow-none print:border print:bg-white">
            <h2 className="text-xl font-semibold mb-3 border-b border-slate-100 pb-2">Cronología</h2>
            <div className="space-y-2">
              {events.map((ev, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 group hover:bg-slate-50 rounded-lg px-2 py-1 transition-all"
                >
                  <div className="shrink-0 font-mono text-xs text-slate-500 mt-0.5 min-w-[70px]">
                    {fmtTime(ev.at)}
                  </div>
                  <div className="grow text-sm leading-snug">
                    {renderEvent(ev)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Checklist */}
        {checkRows.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md print:shadow-none print:border print:bg-white">
            <h2 className="text-xl font-semibold mb-3 border-b border-slate-100 pb-2">Checklist</h2>
            <ChecklistSummary rows={checkRows} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-1 print:text-xs">
                <thead>
                  <tr className="text-slate-500 text-sm">
                    <th className="px-3 py-1.5 rounded-tl-lg">Ítem</th>
                    <th className="px-3 py-1.5">Estado</th>
                    <th className="px-3 py-1.5">Marcado por</th>
                    <th className="px-3 py-1.5 rounded-tr-lg">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {checkRows.map(row => (
                    <tr key={row.item_id} className="bg-slate-50 rounded-lg shadow-sm">
                      <td className="px-3 py-2 rounded-l-lg">{row.label}</td>
                      <td className="px-3 py-2">
                        {STATUS_EMOJI[row.status]}{" "}
                        <span className="font-medium">{STATUS_LABEL[row.status]}</span>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">
                        {row.updated_by_display ? (
                          <>
                            <span className="font-medium">{row.updated_by_display}</span>
                            {row.updated_at ? (
                              <span className="ml-1 text-slate-400">
                                · {new Date(row.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 rounded-r-lg">{row.note || <span className="text-slate-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : hasChecklistStructure ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md print:shadow-none print:border print:bg-white">
            <h2 className="text-xl font-semibold mb-3 border-b border-slate-100 pb-2">Checklist</h2>
            <div className="text-slate-600">Sin marcas registradas para esta sesión.</div>
          </section>
        ) : null}

        {/* Datos revelados */}
        {vars.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md print:shadow-none print:border print:bg-white">
            <h2 className="text-xl font-semibold mb-3 border-b border-slate-100 pb-2">Datos revelados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vars.map(v => (
                <div key={v.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm flex flex-col gap-1">
                  <div className="text-slate-500 text-xs">{labelByType(v.type)} · {v.label}</div>
                  <div className="text-2xl font-mono mt-0.5">
                    {v.value}{v.unit ? <span className="ml-1 text-slate-500 text-lg">{v.unit}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ChecklistSummary({ rows }) {
  const counts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const pill = (status, color) => (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ring-1
        ${color.bg} ${color.text} ${color.ring} `}
    >
      {STATUS_EMOJI[status]} {STATUS_LABEL[status]}: <span className="font-mono">{counts[status] || 0}</span>
    </span>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {pill('ok',     { bg: "bg-green-100", text: "text-green-800", ring: "ring-green-200" })}
      {pill('wrong',  { bg: "bg-rose-100",  text: "text-rose-700",  ring: "ring-rose-200" })}
      {pill('missed', { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-200" })}
      {pill('na',     { bg: "bg-slate-50",  text: "text-slate-400", ring: "ring-slate-100" })}
    </div>
  );
}

function roleOrder(r) {
  const m = String(r || "").toLowerCase();
  if (m.includes("instructor")) return 0;
  if (m.includes("medic")) return 1;
  if (m.includes("enfer")) return 2;
  if (m.includes("farm")) return 3;
  return 9;
}

function prettyRole(r) {
  const m = String(r || "").toLowerCase();
  if (m.includes("medic")) return "Médico/a";
  if (m.includes("enfer")) return "Enfermería";
  if (m.includes("farm")) return "Farmacia";
  if (m.includes("instructor")) return "Instructor/a";
  return r || "—";
}
function labelByType(t) {
  switch (t) {
    case "vital": return "Constante";
    case "lab": return "Analítica";
    case "imagen": return "Imagen";
    case "texto": return "Nota";
    default: return "Dato";
  }
}

function fmtTime(ts) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return String(ts);
  }
}

function renderEvent(ev) {
  const k = ev?.kind || "";
  const p = ev?.payload || {};
  const safe = (v) => (v === null || v === undefined) ? "" : String(v);
  const statusText = (v) => STATUS_LABEL?.[v] || v || "";
  // Compacto y claro para cronología
  switch (k) {
    case "session.start":
      return <span className="font-semibold text-green-700">Inicio de la sesión.</span>;
    case "session.end":
      return <span className="font-semibold text-rose-700">Fin de la sesión.</span>;
    case "banner.update":
    case "script.publish":
      return (
        <span>
          <span className="text-blue-700 font-medium">Mensaje en pantalla:</span>{" "}
          <span className="italic text-slate-700">{safe(p.text || p.banner_text) || <span className="text-slate-400">—</span>}</span>
        </span>
      );
    case "step.change":
      return <span>Fase actual: <span className="font-medium">{safe(p.step_name || p.step || p.step_id || p.stepId || "—")}</span></span>;
    case "variable.show":
      return (
        <span>
          <span className="text-green-700 font-medium">Mostrar dato:</span>{" "}
          <span className="font-medium">{safe(p.label || `#${p.variable_id || ""}`)}</span>
          {p.value !== undefined ? <> <span className="text-slate-500">→</span> <span className="font-mono">{safe(p.value)}{p.unit ? ` ${p.unit}` : ""}</span></> : null}
        </span>
      );
    case "variable.hide":
      return <span className="text-rose-700">Ocultar dato: <span className="font-medium">{safe(p.label || `#${p.variable_id || ""}`)}</span></span>;
    case "variable.update":
      return (
        <span>
          <span className="text-blue-700 font-medium">Actualizar dato:</span>{" "}
          <span className="font-medium">{safe(p.label || `#${p.variable_id || ""}`)}</span>
          {" "}
          <span className="text-slate-500">→</span>{" "}
          <span className="font-mono">{safe(p.value)}{p.unit ? ` ${p.unit}` : ""}</span>
        </span>
      );
    case "variable.clear_all":
      return <span className="text-rose-700">Ocultar todas las variables.</span>;
    case "check.update":
      return (
        <span>
          <span className="text-slate-700">Checklist:</span>{" "}
          <span className="font-medium">{safe(p.label || `#${p.item_id || ""}`)}</span>
          {" "}
          <span className="text-slate-500">→</span>{" "}
          <span className="font-semibold">{statusText(p.status)}</span>
          {p.note ? <> <span className="text-slate-400">—</span> <em className="text-slate-600">{safe(p.note)}</em></> : null}
        </span>
      );
    case "check.note":
      return (
        <span>
          <span className="text-slate-700">Nota en checklist:</span>{" "}
          <span className="font-medium">{safe(p.label || `#${p.item_id || ""}`)}</span>
          {p.note ? <> <span className="text-slate-400">—</span> <em className="text-slate-600">{safe(p.note)}</em></> : null}
        </span>
      );
    case "alarm":
      return <span className="text-rose-700 font-semibold">Alarma: <span className="font-medium">{safe(p.message || p.text || "—")}</span></span>;
    default:
      // Fallback genérico para eventos no previstos
      return (
        <span>
          <span className="font-mono bg-slate-100 text-slate-700 px-1 rounded">{safe(k)}</span>
          {Object.keys(p || {}).length ? <span className="ml-1 text-slate-500">{safe(JSON.stringify(p))}</span> : null}
        </span>
      );
  }
}