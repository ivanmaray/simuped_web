// src/pages/Evaluacion.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";

function formatRole(rol) {
  const k = String(rol || "").toLowerCase();
  if (k.includes("medic")) return "Médico";
  if (k.includes("enfer")) return "Enfermería";
  if (k.includes("farm")) return "Farmacia";
  return k ? k[0].toUpperCase() + k.slice(1) : "";
}

// Gráfico de barras simple con SVG (sin dependencias)
function pct(ok, total) {
  const t = Number(total || 0);
  const k = Number(ok || 0);
  if (!t) return 0;
  return Math.round((k / t) * 100);
}

function BarChart({ data, title = "Media por escenario" }) {
  const max = Math.max(100, ...data.map(d => d.value || 0));
  const barH = 28, gap = 10, padding = 20, width = 700;
  const height = padding * 2 + data.length * (barH + gap) - gap;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {data.length === 0 ? (
        <p className="text-slate-600">Aún no hay datos suficientes.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {data.map((d, i) => {
            const y = padding + i * (barH + gap);
            const w = (d.value / max) * (width - padding * 2 - 80);
            return (
              <g key={d.label}>
                <text x={0} y={y + barH * 0.7} fontSize="12" fill="#334155">{d.label}</text>
                <rect x={150} y={y} width={Math.max(2, w)} height={barH} rx="6" fill="#4FA3E3" opacity="0.9" />
                <text x={150 + Math.max(2, w) + 8} y={y + barH * 0.7} fontSize="12" fill="#0f172a">
                  {Math.round(d.value)}%
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export default function Evaluacion_Main() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [role, setRole] = useState("");
  const [critMap, setCritMap] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewUserId, setViewUserId] = useState(null);      // usuario sobre el que se muestra la evaluación
  const [viewUserEmail, setViewUserEmail] = useState("");  // email del usuario visto (si admin está filtrando)
  const [critFeatureAvailable, setCritFeatureAvailable] = useState(true);
  const [resourcesByScenario, setResourcesByScenario] = useState({});
  const [resourcesLoading, setResourcesLoading] = useState(false);
  // --- Simulacros presenciales (dual) ---
  const [presRows, setPresRows] = useState([]);             // [{session_id, scenario_title, role, started_at, ended_at, ok, wrong, missed, na, total, score}]
  const [presLoading, setPresLoading] = useState(false);
  const [presErr, setPresErr] = useState("");
  const [presFeatureAvailable, setPresFeatureAvailable] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Lee ?user=... o ?user_id=... del querystring (modo admin para revisar a otra persona)
      const requestedUserId = searchParams.get("user") || searchParams.get("user_id");
      const storedUserId = sessionStorage.getItem("eval_last_user_id");
      const forceSelf = !!(location.state && location.state.forceSelf);

      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) setErr(error.message || "Error sesión");
      const sess = data?.session ?? null;
      setSession(sess);
      if (!sess) { setLoading(false); navigate("/", { replace: true }); return; }

      // Perfil del usuario actual (para saber si es admin)
      const { data: myProf, error: myErr } = await supabase
        .from("profiles")
        .select("rol, is_admin")
        .eq("id", sess.user.id)
        .maybeSingle();

      const amIAdmin = !!(myProf?.is_admin);
      setIsAdmin(amIAdmin);

      // Si soy admin y no viene user ni user_id pero hay uno guardado, navegar a ese,
      // excepto si venimos desde Dashboard forzando "mis propios datos".
      if (amIAdmin && !forceSelf && !requestedUserId && storedUserId) {
        navigate(`/evaluacion?user=${storedUserId}`, { replace: true });
      }

      // Determina qué usuario vamos a visualizar
      const targetUserId = (amIAdmin && !forceSelf && (requestedUserId || storedUserId))
        ? (requestedUserId || storedUserId)
        : sess.user.id;
      setViewUserId(targetUserId);
      // Guarda última vista si miras a otro usuario (modo admin)
      try {
        if (amIAdmin && !forceSelf && targetUserId !== sess.user.id) {
          sessionStorage.setItem("eval_last_user_id", targetUserId);
        }
      } catch {}

      // Si venimos forzados desde Dashboard a ver "mis" resultados, limpia el último filtro guardado
      if (forceSelf) {
        try { sessionStorage.removeItem("eval_last_user_id"); } catch {}
      }

      // Si estoy viendo a otro (admin), carga su rol/email para cabecera.
      if (targetUserId !== sess.user.id) {
        const { data: other, error: oErr } = await supabase
          .from("profiles")
          .select("email, rol")
          .eq("id", targetUserId)
          .maybeSingle();
        if (!oErr && other) {
          setViewUserEmail(other.email || "");
          setRole(other.rol || "");
        } else {
          setViewUserEmail("");
          setRole("");
        }
      } else {
        // Viéndome a mí mismo
        setViewUserEmail(sess.user.email || "");
        setRole(myProf?.rol ?? sess.user?.user_metadata?.rol ?? "");
      }

      // Trae intentos del usuario objetivo + título del escenario
      const { data: rows, error: e2 } = await supabase
        .from("attempts")
        .select(`
          id, user_id, scenario_id, started_at, finished_at, correct_count, total_count, score,
          scenarios ( title )
        `)
        .eq("user_id", targetUserId)
        .order("started_at", { ascending: false });

      if (e2) {
        console.error("[Evaluacion] attempts select error:", e2);
        setErr(e2.message || "Error cargando intentos");
        setAttempts([]);
        setCritMap({});
      } else {
        setAttempts(rows || []);
        // Cargar lecturas recomendadas (bibliografía) de los escenarios con intentos
        // Cargar lecturas recomendadas (bibliografía) de los escenarios con intentos
        try {
          // Construir mapa de títulos a partir de los attempts ya cargados
          const titleByScenario = {};
          for (const r of (rows || [])) {
            const sid = r.scenario_id;
            if (!sid) continue;
            // Prioriza el primero visto (o el más reciente), normalmente es el mismo título
            if (!titleByScenario[sid]) {
              titleByScenario[sid] = r.scenarios?.title || `Escenario ${sid}`;
            }
          }

          // Reunir IDs de escenarios de los intentos.
          // ⚠️ Algunos entornos pueden tener case_resources.scenario_id como TEXT.
          // Conviértelos a string para que el .in(...) no falle por tipos.
          const scenarioIdsRaw = Array.from(new Set((rows || [])
            .map(r => r.scenario_id)
            .filter((v) => v !== null && v !== undefined)));
          const scenarioIdsStr = scenarioIdsRaw.map(String);
          if (scenarioIdsStr.length > 0) {
            setResourcesLoading(true);
            // ⚠️ Importante: no hacemos embed a scenarios para evitar restricciones RLS adicionales
            const { data: resRows, error: resErr } = await supabase
              .from("case_resources")
              .select("id, scenario_id, source, url, year, weight")
              .in("scenario_id", scenarioIdsStr)
              .order("weight", { ascending: true })
              .order("id", { ascending: true });

            if (resErr) {
              console.warn("[Evaluacion] resources select error:", resErr);
              setResourcesByScenario({});
            } else {
              const map = {};
              for (const r of (resRows || [])) {
                const sid = r.scenario_id;
                if (!map[sid]) map[sid] = { title: titleByScenario[sid] || `Escenario ${sid}`, items: [] };
                map[sid].items.push({ id: r.id, source: r.source, url: r.url, year: r.year, access: r.access });
              }
              console.debug("[Evaluacion] loaded resources:", { scenarioIdsRaw, scenarioIdsStr, count: (resRows || []).length });
              setResourcesByScenario(map);
            }
          } else {
            setResourcesByScenario({});
          }
        } catch (e) {
          console.warn("[Evaluacion] resources load exception:", e);
          setResourcesByScenario({});
        } finally {
          setResourcesLoading(false);
        }
        // Cargar resumen de críticas para esos attempts (si hay)
        const ids = (rows || []).map(r => r.id);
        if (ids.length > 0) {
          const { data: crits, error: e3 } = await supabase
            .from("v_attempt_criticals")
            .select("attempt_id, total_criticas, criticas_ok, criticas_failed")
            .in("attempt_id", ids);
          if (e3) {
            console.warn("[Evaluacion] v_attempt_criticals error:", e3);
            setCritMap({});
            setCritFeatureAvailable(false);
          } else {
            const map = {};
            for (const c of (crits || [])) map[c.attempt_id] = c;
            setCritMap(map);
            setCritFeatureAvailable(true);
          }
        } else {
          setCritMap({});
        }
      }
      // --- Cargar simulacros presenciales del usuario (si la tabla existe) ---
      async function loadPresencialesFor(userId) {
        setPresLoading(true);
        setPresErr("");
        try {
          // 1) Obtener sesiones en las que participó el usuario
          let parts = [];
          let pErr = null;
          try {
            // Construimos la query base
            const baseQ = supabase
              .from("presencial_participants")
              .select(`
                user_id, role,
                presencial_sessions:session_id (
                  id, scenario_id, started_at, ended_at, banner_text,
                  scenarios ( title )
                )
              `)
              .eq("user_id", userId);

            // Intento 1: ordenar en el servidor usando foreignTable
            let res = await baseQ.order("started_at", { ascending: false, foreignTable: "presencial_sessions" });
            if (res.error) {
              // Si el backend no soporta foreignTable o da 42703, reintenta sin order
              pErr = res.error;
              const res2 = await baseQ; // sin .order
              parts = res2.data || [];
              // Ordena en cliente por la fecha embebida
              parts.sort((a, b) => new Date(b?.presencial_sessions?.started_at || 0) - new Date(a?.presencial_sessions?.started_at || 0));
            } else {
              parts = res.data || [];
            }
          } catch (e) {
            pErr = e;
          }
          if (pErr) {
            // Si la tabla no existe o no hay permisos, deshabilita la sección de simulacros
            if (String(pErr?.code) === "42P01") {
              setPresFeatureAvailable(false);
              setPresRows([]);
              setPresLoading(false);
              return;
            }
            throw pErr;
          }

          // Además, incluir sesiones donde este usuario es el creador/instructor
          // (presencial_sessions.user_id = userId), por si no fue añadido a participants
          try {
            const { data: instr, error: instrErr } = await supabase
              .from("presencial_sessions")
              .select(`
                id, scenario_id, started_at, ended_at, banner_text,
                scenarios ( title )
              `)
              .eq("user_id", userId);
            if (!instrErr && Array.isArray(instr) && instr.length > 0) {
              // Mapear al mismo formato que `parts`
              const mapped = instr.map(s => ({
                user_id: userId,
                role: "instructor",
                presencial_sessions: s,
              }));
              // Evitar duplicados por id
              const seen = new Set((parts || []).map(r => r?.presencial_sessions?.id).filter(Boolean));
              for (const m of mapped) {
                const sid = m?.presencial_sessions?.id;
                if (!sid || seen.has(sid)) continue;
                parts.push(m);
                seen.add(sid);
              }
            }
          } catch (e) {
            console.warn("[Evaluacion] cargar sesiones como instructor falló:", e);
          }

          const items = Array.isArray(parts) ? parts.filter(x => !!x.presencial_sessions) : [];
          // 2) Para cada sesión, traer su checklist y calcular resumen
          const results = [];
          for (const row of items) {
            const sess = row.presencial_sessions;
            // Checklist (puede fallar si no existe la tabla)
            let ok = 0, wrong = 0, missed = 0, na = 0, total = 0;
            try {
              const { data: chk } = await supabase
                .from("session_checklist")
                .select("item_id, status")
                .eq("session_id", sess.id);
              for (const c of (chk || [])) {
                switch ((c.status || "").toLowerCase()) {
                  case "ok": ok += 1; total += 1; break;
                  case "wrong": wrong += 1; total += 1; break;
                  case "missed": missed += 1; total += 1; break;
                  case "na": na += 1; break;
                }
              }
            } catch {
              // si no existe la tabla, mostramos sin desglose
            }
            const endedFlag = !!sess?.ended_at;

            results.push({
              session_id: sess.id,
              scenario_id: sess.scenario_id,
              scenario_title: (sess.scenarios || {})?.title || `Escenario ${sess.scenario_id}`,
              role: row.role || "",
              started_at: sess.started_at || null,
              ended_at: sess.ended_at || null,
              endedFlag,
              ok, wrong, missed, na, total,
              score: pct(ok, total)
            });

            console.debug("[Evaluacion] pres fila", {
              id: sess.id,
              started_at: sess.started_at,
              ended_at: sess.ended_at,
              endedFlag
            });
          }
          setPresRows(results);
          setPresFeatureAvailable(true);
        } catch (e) {
          console.warn("[Evaluacion] presenciales error:", e);
          setPresErr(e?.message || "No se pudieron cargar los simulacros presenciales.");
          setPresRows([]);
        } finally {
          setPresLoading(false);
        }
      }
      try {
        if (targetUserId) await loadPresencialesFor(targetUserId);
      } catch {}
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!sess) navigate("/", { replace: true });
    });
    return () => { mounted = false; try { sub?.subscription?.unsubscribe?.(); } catch {} };
  }, [navigate, location.search, searchParams]);

  function fmtDate(d) {
    try {
      return new Date(d).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return new Date(d).toLocaleString();
    }
  }
  const hasCritData = critFeatureAvailable && Object.keys(critMap || {}).length > 0;

  const summaryByScenario = useMemo(() => {
    const acc = new Map();
    for (const a of attempts) {
      const title = a.scenarios?.title || `Escenario ${a.scenario_id}`;
      const cur = acc.get(title) || { sum: 0, n: 0 };
      cur.sum += Number(a.score || 0);
      cur.n += 1;
      acc.set(title, cur);
    }
    return Array.from(acc.entries()).map(([label, { sum, n }]) => ({
      label, value: n ? sum / n : 0, n
    })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [attempts]);

  function PresEstadoBadge({ endedFlag, started_at }) {
    const estado = endedFlag ? 'Finalizada' : (started_at ? 'En curso' : 'Pendiente');
    const cls = endedFlag
      ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
      : (started_at ? 'bg-amber-100 text-amber-700 ring-amber-200' : 'bg-slate-100 text-slate-700 ring-slate-200');
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ring-1 ${cls}`}>
        {estado}
      </span>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-slate-600">Cargando…</div></div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <section className="bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3] text-white">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <p className="text-white/80 text-sm">
            Evaluación del desempeño{formatRole(role) ? " • " + formatRole(role) : ""}
          </p>
          <h1 className="text-2xl md:text-3xl font-semibold">
            {viewUserId && session?.user?.id && viewUserId !== session.user.id
              ? `Resultados de ${viewUserEmail || viewUserId}`
              : "Tus resultados"}{attempts?.length ? ` · ${attempts.length} intento${attempts.length !== 1 ? "s" : ""}` : ""}
          </h1>
          <p className="opacity-95">
            Medias de los simulacros online, resultados de simulacros online,  y resultados de simulacros presenciales.
          </p>
          {isAdmin && viewUserId && session?.user?.id && viewUserId !== session.user.id && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm">
                Filtrando por usuario: {viewUserEmail || viewUserId}
                <button
                  className="underline decoration-white/70 hover:decoration-white"
                  aria-label="Quitar filtro de usuario"
                  onClick={() => {
                    try { sessionStorage.removeItem("eval_last_user_id"); } catch {}
                    navigate("/evaluacion", { replace: true });
                  }}
                >
                  Quitar filtro
                </button>
              </span>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        <BarChart
          data={summaryByScenario.map(d => ({ label: d.label, value: d.value }))}
          title="Media de puntuación por escenario"
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {viewUserId && session?.user?.id && viewUserId !== session.user.id
                ? "Intentos del usuario"
                : "Simulacros online"}
            </h3>
            <Link to="/dashboard" className="text-sm underline text-slate-700">Volver al panel</Link>
          </div>
          {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
          {attempts.length === 0 ? (
            <p className="text-slate-600 mt-2">
              {viewUserId && session?.user?.id && viewUserId !== session.user.id
                ? "Este usuario no tiene intentos registrados."
                : "Aún no has realizado ningún intento."}
            </p>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2">Fecha</th>
                    <th className="text-left px-4 py-2">Escenario</th>
                    <th className="text-left px-4 py-2">Resultado</th>
                    <th className="text-left px-4 py-2">Estado</th>
                    {hasCritData ? <th className="text-left px-4 py-2">Críticas</th> : null}
                    <th className="text-left px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const date = fmtDate(a.started_at);
                    const estado = a.finished_at ? "Finalizado" : "En curso";
                    const res = a.finished_at ? (typeof a.score === "number" ? `${a.correct_count}/${a.total_count} (${a.score}%)` : `${a.correct_count}/${a.total_count} (—)`) : "—";
                    const title = a.scenarios?.title || `Escenario ${a.scenario_id}`;
                    const crit = critMap[a.id];
                    const critText = crit ? `${crit.criticals_ok}/${crit.total_criticals}` : "—";
                    return (
                      <tr key={a.id} className="border-t">
                        <td className="px-4 py-2">{date}</td>
                        <td className="px-4 py-2">{title}</td>
                        <td className="px-4 py-2">{res}</td>
                        <td className="px-4 py-2">{estado}</td>
                        {hasCritData ? <td className="px-4 py-2">{critText}</td> : null}
                        <td className="px-4 py-2">
                          <Link to={`/evaluacion/attempt/${a.id}`} className="text-[#0A3D91] underline">Revisar</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Simulacros presenciales (dual) */}
        {presFeatureAvailable && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Simulacros presenciales</h3>
              {presLoading && <span className="text-xs text-slate-500">Cargando…</span>}
            </div>
            {presErr && <div className="mt-2 text-sm text-red-600">{presErr}</div>}
            {(!presRows || presRows.length === 0) ? (
              <p className="text-slate-600 mt-2">
                {viewUserId && session?.user?.id && viewUserId !== session.user.id
                  ? "Este usuario no tiene simulacros presenciales registrados."
                  : "Aún no figuran simulacros presenciales."}
              </p>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2">Fecha</th>
                      <th className="text-left px-4 py-2">Escenario</th>
                      <th className="text-left px-4 py-2">Rol</th>
                      <th className="text-left px-4 py-2">Resultado</th>
                      <th className="text-left px-4 py-2">Estado</th>
                      <th className="text-left px-4 py-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presRows.map((r) => {
                      const dateStr = r.started_at
                        ? new Date(r.started_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })
                        : "—";
                      const res = r.total ? `${r.ok}/${r.total} (${r.score}%)` : "—";
                      return (
                        <tr key={r.session_id} className="border-t">
                          <td className="px-4 py-2">{dateStr}</td>
                          <td className="px-4 py-2">{r.scenario_title}</td>
                          <td className="px-4 py-2">{formatRole(r.role)}</td>
                          <td className="px-4 py-2">{res}</td>
                          <td className="px-4 py-2">
                            <PresEstadoBadge endedFlag={r.endedFlag} started_at={r.started_at} />
                          </td>
                          <td className="px-4 py-2">
                            {r.endedFlag ? (
                              <Link to={`/evaluacion/informe/${r.session_id}`} className="text-[#0A3D91] underline">
                                Ver informe
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Nota: el resultado resume la checklist del equipo (ok/wrong/missed). Los ítems "N/A" no puntúan.
            </p>
          </section>
        )}
        {/* Lecturas recomendadas por escenario (a partir de escenarios con intentos) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h3 className="text-lg font-semibold">Lecturas recomendadas</h3>
            {resourcesLoading && <span className="text-xs text-slate-500">Cargando…</span>}
          </div>
          {Object.keys(resourcesByScenario).length === 0 ? (
            <p className="text-slate-600 mt-2">De momento no hay bibliografía asociada a tus escenarios.</p>
          ) : (
            <div className="mt-3 space-y-6">
              {Object.entries(resourcesByScenario).map(([sid, group]) => (
                <div key={sid}>
                  <h4 className="font-medium text-slate-800 mb-2">{group.title}</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {group.items.map(item => (
                      <li key={item.id} className="text-sm">
                        <a href={item.url || "#"} target="_blank" rel="noreferrer" className="text-[#0A3D91] hover:underline">
                          {item.source}
                        </a>
                        {item.year ? <span className="text-slate-500"> · {item.year}</span> : null}
                        {item.access ? <span className="ml-1 inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">{item.access}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}