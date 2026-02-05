// src/pages/Evaluacion.jsx
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
// Slug del microcaso de status epiléptico
const STATUS_EPI_SLUG = "status-epileptico-pediatrico-refractario";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";
import {
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
  SparklesIcon,
  ClipboardDocumentListIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

function formatRole(rol) {
  const k = String(rol || "").toLowerCase();
  if (k.includes("medic")) return "Médico";
  if (k.includes("enfer")) return "Enfermería";
  if (k.includes("farm")) return "Farmacia";
  return k ? k[0].toUpperCase() + k.slice(1) : "";
}

// Chips homogéneos para roles y resultados
function RoleChip({ role }) {
  if (!role) return <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200 px-2 py-0.5 text-[12px]">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 px-2 py-0.5 text-[12px]">
      {formatRole(role)}
    </span>
  );
}

function ScoreChip({ ok, total, pct }) {
  const has = typeof total === 'number' && total > 0;
  const percent = typeof pct === 'number' ? Math.round(pct) : (has ? Math.round((ok / total) * 100) : null);
  let cls = 'bg-slate-100 text-slate-700 ring-slate-200';
  if (typeof percent === 'number') {
    if (percent >= 80) cls = 'bg-emerald-100 text-emerald-700 ring-emerald-200';
    else if (percent >= 50) cls = 'bg-amber-100 text-amber-700 ring-amber-200';
    else cls = 'bg-rose-100 text-rose-700 ring-rose-200';
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ring-1 ${cls}`}>
      {has ? (<>
        <strong className="tabular-nums">{ok}</strong>
        <span className="opacity-60">/</span>
        <span className="tabular-nums">{total}</span>
        {typeof percent === 'number' && <span className="ml-1 opacity-80">({percent}%)</span>}
      </>) : '—'}
    </span>
  );
}

function HeroCard({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-10 w-10 rounded-xl bg-white/15 grid place-items-center">
          {Icon ? <Icon className="h-5 w-5 text-white/90" /> : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
          <p className="text-2xl font-semibold text-white leading-tight">{value}</p>
          {helper ? <p className="text-[11px] text-white/70 mt-1">{helper}</p> : null}
        </div>
      </div>
    </div>
  );
}

// Gráfico de barras simple con SVG (sin dependencias)
function pct(ok, total) {
  const t = Number(total || 0);
  const k = Number(ok || 0);
  if (!t) return 0;
  return Math.round((k / t) * 100);
}

function BarChart({ data, title = "Media por escenario" }) {
  const sorted = (data || []).slice().sort((a, b) => (b.value || 0) - (a.value || 0));
  const max = Math.max(100, ...sorted.map((d) => Number(d.value) || 0));
  const barH = 32;
  const gap = 12;
  const paddingY = 24;
  const labelSpace = 210;
  const paddingRight = 28;
  const width = 900;
  const usable = width - labelSpace - paddingRight;
  const height = sorted.length > 0 ? paddingY * 2 + sorted.length * (barH + gap) - gap : paddingY * 2 + barH;
  const tickStep = max <= 120 ? 20 : 25;
  const ticks = [];
  for (let v = 0; v <= max; v += tickStep) ticks.push(v);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.4)] px-6 py-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {sorted.length > 0 && <p className="text-xs text-slate-500 mt-0.5">Ordenado de mayor a menor</p>}
        </div>
        {sorted.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[12px] font-medium text-slate-600 ring-1 ring-slate-200">
            {sorted.length} escenario{sorted.length !== 1 ? 's' : ''}
          </span>
        )}
      </header>
      {sorted.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Aún no hay datos suficientes. Completa algunos simulacros para ver tu comparativa.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[560px] h-auto">
            <defs>
              <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0A3D91" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#4FA3E3" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {ticks.map((v) => {
              const x = labelSpace + (v / max) * usable;
              return (
                <g key={`tick-${v}`}>
                  <line x1={x} x2={x} y1={paddingY - 6} y2={height - paddingY + 6} stroke="#E2E8F0" strokeWidth="1" />
                  <text x={x} y={paddingY - 10} fontSize="11" fill="#94A3B8" textAnchor="middle">{v}%</text>
                </g>
              );
            })}

            {sorted.map((d, i) => {
              const y = paddingY + i * (barH + gap);
              const w = Math.max(8, (Number(d.value) / max) * usable);
              const labelY = y + barH * 0.65;
              const label = d.label || `Escenario ${i + 1}`;
              const pctLabel = `${Math.round(Number(d.value) || 0)}%`;
              const textInside = w > 110;
              return (
                <g key={label}>
                  <rect x={labelSpace} y={y - 4} width={usable} height={barH + 8} fill={i % 2 === 0 ? '#F8FAFC' : '#FFFFFF'} rx="10" />
                  <text x={0} y={labelY} fontSize="13" fill="#0f172a">{label}</text>
                  <rect x={labelSpace} y={y} width={w} height={barH} rx="10" fill="url(#barFill)" />
                  <text
                    x={textInside ? labelSpace + w - 10 : labelSpace + w + 10}
                    y={labelY}
                    fontSize="12"
                    fill={textInside ? '#FFFFFF' : '#0f172a'}
                    textAnchor={textInside ? 'end' : 'start'}
                    fontWeight="600"
                  >
                    {pctLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
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
  // --- Microcasos (entrenamiento rápido) ---
  const [microRows, setMicroRows] = useState([]);           // [{id, case_id, case_title, score_total, duration_seconds, status, completed_at, attempt_role, created_at}]
  const [microLoading, setMicroLoading] = useState(false);
  const [microErr, setMicroErr] = useState("");
  const [microFeatureAvailable, setMicroFeatureAvailable] = useState(true);

  const [attemptSearch, setAttemptSearch] = useState("");
  const [scenarioFilter, setScenarioFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scoreFilter, setScoreFilter] = useState("");

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
      const { data: myProf, error: _myErr } = await supabase
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
              .select("id, scenario_id, title, source, url, year")
              .in("scenario_id", scenarioIdsStr)
              .order("title", { ascending: true })
              .order("id", { ascending: true });

            if (resErr) {
              console.warn("[Evaluacion] resources select error:", resErr);
              setResourcesByScenario({});
            } else {
              const map = {};
              for (const r of (resRows || [])) {
                const sid = r.scenario_id;
                if (!map[sid]) map[sid] = { title: titleByScenario[sid] || `Escenario ${sid}`, items: [] };
                map[sid].items.push({ id: r.id, title: r.title, source: r.source, url: r.url, year: r.year, access: r.access });
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
            // Pedimos todas para ser compatibles con nombres antiguos (criticas_*) y nuevos (criticals_*)
            .select("*")
            .in("attempt_id", ids);
          if (e3) {
            console.warn("[Evaluacion] v_attempt_criticals error:", e3);
            setCritMap({});
            setCritFeatureAvailable(false);
          } else {
            const map = {};
            for (const c of (crits || [])) {
              const attempt_id = c.attempt_id;
              const total_criticals = (
                c.total_criticals ?? c.total_criticas ?? null
              );
              const criticals_ok = (
                c.criticals_ok ?? c.criticas_ok ?? null
              );
              const criticals_failed = (
                c.criticals_failed ?? c.criticas_failed ?? null
              );
              map[attempt_id] = { attempt_id, total_criticals, criticals_ok, criticals_failed };
            }
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

          let items = Array.isArray(parts) ? parts.filter(x => !!x.presencial_sessions) : [];
          // Deduplicar por session_id para evitar filas repetidas y warnings de keys duplicadas
          const seenItems = new Set();
          items = items.filter((row) => {
            const sid = row?.presencial_sessions?.id;
            if (!sid) return false;
            if (seenItems.has(sid)) return false;
            seenItems.add(sid);
            return true;
          });
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
      // --- Cargar microcasos del usuario ---
      async function loadMicroCasesFor(userId) {
        setMicroLoading(true);
        setMicroErr("");
        try {
          const { data: attempts, error: attErr } = await supabase
            .from("micro_case_attempts")
            .select(`
              id, case_id, score_total, duration_seconds, status, completed_at, attempt_role, started_at,
              micro_cases ( title, slug )
            `)
            .eq("user_id", userId)
            .order("started_at", { ascending: false });
          if (attErr) {
            if (String(attErr?.code) === "42P01") {
              setMicroFeatureAvailable(false);
              setMicroRows([]);
              setMicroLoading(false);
              return;
            }
            throw attErr;
          }
          const results = (attempts || []).map((att) => ({
            id: att.id,
            case_id: att.case_id,
            case_title: att.micro_cases?.title || `Microcaso ${att.case_id}`,
            case_slug: att.micro_cases?.slug || "",
            score_total: att.score_total || 0,
            duration_seconds: att.duration_seconds || null,
            status: att.status || "in_progress",
            completed_at: att.completed_at || null,
            attempt_role: att.attempt_role || "",
            created_at: att.created_at || att.started_at || null
          }));
          setMicroRows(results);
          setMicroFeatureAvailable(true);
        } catch (e) {
          console.warn("[Evaluacion] microcasos error:", e);
          setMicroErr(e?.message || "No se pudieron cargar los microcasos.");
          setMicroRows([]);
        } finally {
          setMicroLoading(false);
        }
      }
      try {
        if (targetUserId) await loadMicroCasesFor(targetUserId);
      } catch {}
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!sess) navigate("/", { replace: true });
    });
    return () => { mounted = false; try { sub?.subscription?.unsubscribe?.(); } catch {} };
  }, [navigate, location.search, location.state, searchParams]);

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

  const heroMetrics = useMemo(() => {
    const total = attempts.length;
    const finished = attempts.filter((a) => !!a.finished_at).length;
    const avgScoreRaw = total ? attempts.reduce((acc, a) => acc + Number(a.score || 0), 0) / total : 0;
    const avgScore = total ? Math.round(avgScoreRaw * 10) / 10 : null;
    const sortedScenarios = summaryByScenario.slice().sort((a, b) => b.value - a.value);
    const bestScenario = sortedScenarios[0] ?? null;
    const worstScenario = sortedScenarios.length > 1 ? sortedScenarios[sortedScenarios.length - 1] : sortedScenarios[0] ?? null;
    const completionPct = total ? Math.round((finished / total) * 100) : null;
    const scenariosCompleted = new Set(attempts.map((a) => a.scenario_id)).size;

    return [
      {
        key: 'avg',
        label: 'Media global',
        value: total ? `${avgScore}` : '—',
        helper: total ? 'Sobre 100 puntos' : 'Sin intentos aún',
        icon: TrophyIcon,
      },
      {
        key: 'scenarios-completed',
        label: 'Escenarios realizados',
        value: `${scenariosCompleted}`,
        helper: total ? `Intentos realizados: ${total}${completionPct != null ? ` · ${completionPct}% completados` : ''}` : 'Aún no hay intentos registrados',
        icon: ClockIcon,
      },
      {
        key: 'worst',
        label: 'Peor escenario',
        value: worstScenario ? worstScenario.label : '—',
        helper: worstScenario ? `${Math.round(worstScenario.value)}% de media (${worstScenario.n} intento${worstScenario.n !== 1 ? 's' : ''})` : 'Aún sin intentos comparables',
        icon: ClipboardDocumentListIcon,
      },
      {
        key: 'best',
        label: 'Mejor escenario',
        value: bestScenario ? bestScenario.label : '—',
        helper: bestScenario ? `${Math.round(bestScenario.value)}% de media (${bestScenario.n} intento${bestScenario.n !== 1 ? 's' : ''})` : 'Practica para desbloquear',
        icon: SparklesIcon,
      },
    ];
  }, [attempts, summaryByScenario]);

  const scenarioOptions = useMemo(() => {
    const seen = new Map();
    for (const a of attempts) {
      const label = a.scenarios?.title || `Escenario ${a.scenario_id}`;
      if (!seen.has(label) && label) {
        seen.set(label, { label, value: String(a.scenario_id ?? label) });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [attempts]);

  const filteredAttempts = useMemo(() => {
    const query = attemptSearch.trim().toLowerCase();
    return attempts.filter((a) => {
      const title = (a.scenarios?.title || `Escenario ${a.scenario_id}`).toLowerCase();
      const summaryMatch = !query || title.includes(query);

      const scenarioMatch = !scenarioFilter || String(a.scenario_id ?? '') === scenarioFilter || (a.scenarios?.title === scenarioFilter);

      let statusMatch = true;
      if (statusFilter === 'completed') statusMatch = !!a.finished_at;
      else if (statusFilter === 'pending') statusMatch = !a.finished_at && !a.started_at;
      else if (statusFilter === 'in-progress') statusMatch = !!a.started_at && !a.finished_at;

      let scoreMatch = true;
      const score = Number(a.score || 0);
      if (scoreFilter === '80+') scoreMatch = score >= 80;
      else if (scoreFilter === '50-79') scoreMatch = score >= 50 && score < 80;
      else if (scoreFilter === '<50') scoreMatch = score < 50;

      return summaryMatch && scenarioMatch && statusMatch && scoreMatch;
    });
  }, [attempts, attemptSearch, scenarioFilter, statusFilter, scoreFilter]);

  // Intentos previos del microcaso de status epiléptico
  const statusEpiAttempts = useMemo(() => {
    return attempts.filter((a) => {
      // Filtra por slug, título o id si lo tienes
      const title = (a.scenarios?.title || "").toLowerCase();
      return title.includes("status epiléptico") || title.includes("epileptico pediatrico") || title.includes("epiléptico") || (a.scenarios?.slug === STATUS_EPI_SLUG);
    });
  }, [attempts]);

  const resetAttemptFilters = () => {
    setAttemptSearch("");
    setScenarioFilter("");
    setStatusFilter("");
    setScoreFilter("");
  };

  const presSummary = useMemo(() => {
    const total = presRows.length;
    const finalizados = presRows.filter((r) => r.endedFlag).length;
    const avgScore = total ? Math.round((presRows.reduce((sum, r) => sum + (Number(r.score || 0)), 0) / total)) : null;
    return { total, finalizados, avgScore };
  }, [presRows]);

  const microSummary = useMemo(() => {
    const total = microRows.length;
    const completados = microRows.filter((r) => r.status === "completed").length;
    const avgScore = total ? Math.round((microRows.reduce((sum, r) => sum + (Number(r.score_total || 0)), 0) / total)) : null;
    return { total, completados, avgScore };
  }, [microRows]);

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
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-6xl mx-auto px-5 py-12 text-white relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-white/70 text-sm uppercase tracking-wide">Evaluación del desempeño</p>
              <h1 className="text-3xl md:text-4xl font-semibold">
                {viewUserId && session?.user?.id && viewUserId !== session.user.id
                  ? `Resultados de ${viewUserEmail || viewUserId}`
                  : "Tus resultados"}
              </h1>
              <p className="opacity-95 max-w-2xl text-lg">
                Analiza tus simulacros online y presenciales, identifica puntos críticos y vuelve a intentarlo con recursos seleccionados.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/80">
                {formatRole(role) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                    Rol: {formatRole(role)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1">
                  Intentos registrados: {attempts.length}
                </span>
                {isAdmin && viewUserId && session?.user?.id && viewUserId !== session.user.id && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 underline decoration-white/60 hover:decoration-white"
                    onClick={() => {
                      try { sessionStorage.removeItem("eval_last_user_id"); } catch {}
                      navigate("/evaluacion", { replace: true });
                    }}
                  >
                    Quitar filtro de {viewUserEmail || viewUserId}
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {heroMetrics.map((m) => (
                <HeroCard key={m.key} icon={m.icon} label={m.label} value={m.value} helper={m.helper} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        {/* Menú de navegación interna */}
        <nav className="flex items-center gap-3 overflow-x-auto pb-2">
          <a
            href="#simulacros-online"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <ChartBarIcon className="h-4 w-4" />
            Simulacros online
          </a>
          <a
            href="#simulacros-presenciales"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
            Simulacros presenciales
          </a>
          {isAdmin && (
            <a
              href="#entrenamiento-rapido"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 whitespace-nowrap"
            >
              <SparklesIcon className="h-4 w-4" />
              Entrenamiento rápido
              <span className="text-xs uppercase tracking-wide text-amber-600">(Dev)</span>
            </a>
          )}
          <a
            href="#lecturas-recomendadas"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Lecturas recomendadas
          </a>
        </nav>

        <BarChart
          data={summaryByScenario.map(d => ({ label: d.label, value: d.value }))}
          title="Media de puntuación por escenario"
        />

        <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.4)]">
          <header className="flex flex-col gap-2 px-6 pt-6 md:flex-row md:items-start md:justify-between">
            <div id="simulacros-online">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-[#0A3D91]" />
                {viewUserId && session?.user?.id && viewUserId !== session.user.id
                  ? "Simulacros online del usuario"
                  : "Simulacros online"}
              </h3>
              <p className="text-sm text-slate-600 mt-1">Explora tus intentos, revisa críticos y vuelve a practicar.</p>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#0A3D91] hover:underline"
            >
              Volver al panel
            </Link>
          </header>

          {err && <div className="mx-6 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{err}</div>}

          {attempts.length === 0 ? (
            <div className="px-6 pb-6">
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-slate-600 text-sm">
                {viewUserId && session?.user?.id && viewUserId !== session.user.id
                  ? "Este usuario no tiene intentos registrados."
                  : "Aún no has realizado ningún intento. Vuelve a Simulación para iniciar tu primer escenario."}
              </div>
            </div>
          ) : (
            <div className="px-6 pb-6 flex flex-col gap-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[#0A3D91]/10 text-[#0A3D91] grid place-items-center">
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">Filtrar intentos</h4>
                    <p className="text-xs text-slate-500">Combina búsqueda, estado y notas para centrarte en lo importante.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_1fr] gap-4">
                  <label className="block text-sm text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Buscar</span>
                    <div className="mt-1 relative flex items-center">
                      <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-slate-400" />
                      <input
                        type="search"
                        value={attemptSearch}
                        onChange={(e) => setAttemptSearch(e.target.value)}
                        placeholder="Escenario, fecha, nota…"
                        className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/60"
                      />
                    </div>
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Escenario</span>
                    <select
                      value={scenarioFilter}
                      onChange={(e) => setScenarioFilter(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/60"
                    >
                      <option value="">Todos</option>
                      {scenarioOptions.map((opt) => (
                        <option key={opt.value} value={String(opt.value)}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Estado</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/60"
                    >
                      <option value="">Todos</option>
                      <option value="completed">Completados</option>
                      <option value="in-progress">En curso</option>
                      <option value="pending">Pendientes</option>
                    </select>
                  </label>
                  <label className="block text-sm text-slate-600">
                    <span className="text-xs uppercase tracking-wide text-slate-400">Nota</span>
                    <select
                      value={scoreFilter}
                      onChange={(e) => setScoreFilter(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/60"
                    >
                      <option value="">Todas</option>
                      <option value="80+">≥ 80%</option>
                      <option value="50-79">50% – 79%</option>
                      <option value="<50">&lt; 50%</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={resetAttemptFilters}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                    Limpiar filtros
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80">
                {filteredAttempts.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-slate-600">
                    No hay intentos que coincidan con los filtros activos.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {filteredAttempts.map((a) => {
                      const title = a.scenarios?.title || `Escenario ${a.scenario_id}`;
                      const date = a.started_at ? fmtDate(a.started_at) : '—';
                      const scoreValue = Number(a.score || 0);
                      const crit = critMap[a.id];
                      const totalCrit = crit?.total_criticals ?? 0;
                      const critOk = crit?.criticals_ok ?? 0;
                      const critFailed = crit?.criticals_failed ?? 0;
                      const statusLabel = a.finished_at ? 'Completado' : (a.started_at ? 'En curso' : 'Pendiente');
                      const statusClass = a.finished_at
                        ? 'bg-emerald-100 text-emerald-700 ring-emerald-200'
                        : (a.started_at ? 'bg-amber-100 text-amber-700 ring-amber-200' : 'bg-slate-100 text-slate-700 ring-slate-200');
                      const highlight = scoreValue < 60 || (totalCrit > 0 && critFailed > 0);
                    return (
                      <div
                        key={a.id}
                        className={`flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between ${highlight ? 'bg-amber-50/40' : ''}`}
                      >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-medium text-slate-600">{date}</span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ${statusClass}`}>
                                {statusLabel}
                              </span>
                              {hasCritData && totalCrit > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                  Críticas {critOk}/{totalCrit}
                                </span>
                              )}
                              {highlight && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                                  Reforzar
                                </span>
                              )}
                            </div>
                            <h4 className="mt-1 text-base font-semibold text-slate-900 truncate">{title}</h4>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span>Inicio: {a.started_at ? fmtDate(a.started_at) : '—'}</span>
                              <span>Fin: {a.finished_at ? fmtDate(a.finished_at) : 'Pendiente'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <ScoreChip ok={a.correct_count} total={a.total_count} pct={a.score} />
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/evaluacion/attempt/${a.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Revisar
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        {/* Simulacros presenciales (dual) */}
        {presFeatureAvailable && (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.4)] px-6 py-6">
            <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div id="simulacros-presenciales">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-[#0A3D91]" />
                  Simulacros presenciales
                </h3>
                <p className="text-sm text-slate-600">Checklist y resultados del equipo en sesiones duales o clásicas.</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  Total: {presSummary.total}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1">
                  Finalizados: {presSummary.finalizados}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  Nota media: {presSummary.avgScore != null ? `${presSummary.avgScore}%` : '—'}
                </span>
              </div>
            </header>
            {presErr && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{presErr}</div>}
            {presLoading && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={`pres-skeleton-${idx}`} className="h-40 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
                ))}
              </div>
            )}
            {!presLoading && (!presRows || presRows.length === 0) ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                {viewUserId && session?.user?.id && viewUserId !== session.user.id
                  ? "Este usuario no tiene simulacros presenciales registrados."
                  : "Aún no figuran simulacros presenciales."}
              </div>
            ) : null}

            {!presLoading && presRows.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {presRows.map((r) => {
                  const dateStr = r.started_at ? fmtDate(r.started_at) : '—';
                  return (
                    <article
                      key={r.session_id}
                      className="relative overflow-hidden rounded-3xl border border-white/80 bg-white px-5 py-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.45)]"
                    >
                      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-[#0A3D91]/10 via-transparent to-transparent" aria-hidden="true" />
                      <div className="relative z-10 flex flex-col gap-4">
                        <header className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">{dateStr}</p>
                            <h4 className="mt-1 text-lg font-semibold text-slate-900 line-clamp-2">{r.scenario_title}</h4>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <RoleChip role={r.role} />
                              <PresEstadoBadge endedFlag={r.endedFlag} started_at={r.started_at} />
                            </div>
                          </div>
                          <ScoreChip ok={r.ok} total={r.total} pct={r.score} />
                        </header>

                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                          <div>
                            <p className="font-medium text-slate-500">Checklist</p>
                            <p>OK: {r.ok ?? 0}</p>
                            <p>Errores: {r.wrong ?? 0}</p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-500">Pendientes</p>
                            <p>Missed: {r.missed ?? 0}</p>
                            <p>N/A: {r.na ?? 0}</p>
                          </div>
                        </div>

                        <footer className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">Sesión {r.endedFlag ? 'finalizada' : 'en curso'}</span>
                          {r.endedFlag ? (
                            <Link
                              to={`/evaluacion/informe/${r.session_id}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0A3D91] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0A3D91]/90"
                            >
                              Ver informe
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">Informe disponible al finalizar</span>
                          )}
                        </footer>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <p className="mt-6 text-xs text-slate-500">
              Nota: el resultado resume la checklist del equipo (ok/wrong/missed). Los ítems "N/A" no puntúan.
            </p>
          </section>
        )}
        {/* Entrenamiento Rápido (Microcasos) */}
        {microFeatureAvailable && isAdmin && (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.4)] px-6 py-6">
            <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div id="entrenamiento-rapido">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5 text-[#0A3D91]" />
                  Entrenamiento Rápido (Microcasos)
                </h3>
                <p className="text-sm text-slate-600">Tus intentos en microcasos interactivos de toma de decisiones clínicas.</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  Total: {microSummary.total}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1">
                  Completados: {microSummary.completados}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                  Nota media: {microSummary.avgScore != null ? `${microSummary.avgScore} pts` : '—'}
                </span>
              </div>
            </header>
            {microErr && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{microErr}</div>}
            {microLoading && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={`micro-skeleton-${idx}`} className="h-40 rounded-2xl border border-slate-200 bg-slate-50 animate-pulse" />
                ))}
              </div>
            )}
            {!microLoading && (!microRows || microRows.length === 0) ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
                {viewUserId && session?.user?.id && viewUserId !== session.user.id
                  ? "Este usuario no tiene microcasos registrados."
                  : "Aún no has completado ningún microcaso. Visita Entrenamiento Rápido para empezar."}
              </div>
            ) : null}

            {!microLoading && microRows.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                {microRows.map((r) => {
                  const dateStr = r.completed_at ? fmtDate(r.completed_at) : (r.created_at ? fmtDate(r.created_at) : '—');
                  const statusLabel = r.status === "completed" ? "Completado" : "En progreso";
                  const statusClass = r.status === "completed"
                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                    : "bg-amber-100 text-amber-700 ring-amber-200";
                  return (
                    <article
                      key={r.id}
                      className="relative overflow-hidden rounded-3xl border border-white/80 bg-white px-5 py-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.45)]"
                    >
                      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent" aria-hidden="true" />
                      <div className="relative z-10 flex flex-col gap-4">
                        <header className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-400">{dateStr}</p>
                            <h4 className="mt-1 text-lg font-semibold text-slate-900 line-clamp-2">{r.case_title}</h4>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <RoleChip role={r.attempt_role} />
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1 ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-wide text-slate-400">Puntuación</p>
                            <p className="text-2xl font-semibold text-slate-900">{r.score_total}</p>
                          </div>
                        </header>

                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                          <div>
                            <p className="font-medium text-slate-500">Duración</p>
                            <p>{r.duration_seconds ? `${r.duration_seconds}s` : "—"}</p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-500">Estado</p>
                            <p>{statusLabel}</p>
                          </div>
                        </div>

                        <footer className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">{r.status === "completed" ? "Intento finalizado" : "Puedes continuar"}</span>
                          <Link
                            to={`/quicktraining?case=${r.case_slug || r.case_id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0A3D91] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0A3D91]/90"
                          >
                            {r.status === "completed" ? "Reintentar" : "Continuar"}
                          </Link>
                        </footer>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <p className="mt-6 text-xs text-slate-500">
              Nota: los microcasos son escenarios cortos de toma de decisiones rápida. La puntuación refleja la calidad de tus elecciones clínicas.
            </p>
          </section>
        )}
        {/* Lecturas recomendadas por escenario (a partir de escenarios con intentos) */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.4)] px-6 py-6">
          <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div id="lecturas-recomendadas">
              <h3 className="text-lg font-semibold text-slate-900">Lecturas recomendadas</h3>
              <p className="text-sm text-slate-600">Refuerza tus decisiones con bibliografía asociada a cada escenario.</p>
            </div>
            {resourcesLoading && <span className="text-xs uppercase tracking-wide text-slate-400">Cargando…</span>}
          </header>
          {Object.keys(resourcesByScenario).length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
              De momento no hay bibliografía asociada a tus escenarios. Cuando completes más simulacros aparecerán aquí las lecturas clave.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {Object.entries(resourcesByScenario).map(([sid, group]) => (
                <article key={sid} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <h4 className="text-base font-semibold text-slate-900 mb-2">{group.title}</h4>
                  <ul className="space-y-2 text-sm">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex flex-col">
                        <a
                          href={item.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#0A3D91] hover:underline font-medium"
                        >
                          {item.title || item.source || 'Recurso'}
                        </a>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          {item.year ? <span>Año: {item.year}</span> : null}
                          {item.source ? <span>Fuente: {item.source}</span> : null}
                          {item.access ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5">
                              {item.access}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
