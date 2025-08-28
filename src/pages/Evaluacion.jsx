// src/pages/Evaluacion.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

function formatRole(rol) {
  const k = String(rol || "").toLowerCase();
  if (k.includes("medic")) return "Médico";
  if (k.includes("enfer")) return "Enfermería";
  if (k.includes("farm")) return "Farmacia";
  return k ? k[0].toUpperCase() + k.slice(1) : "";
}

// Gráfico de barras simple con SVG (sin dependencias)
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
                <rect x={150} y={y} width={Math.max(2, w)} height={barH} rx="6" fill="#1d99bf" opacity="0.9" />
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

export default function Evaluacion() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [attempts, setAttempts] = useState([]);
  const [role, setRole] = useState("");
  const [critMap, setCritMap] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) setErr(error.message || "Error sesión");
      const sess = data?.session ?? null;
      setSession(sess);
      if (!sess) { setLoading(false); navigate("/", { replace: true }); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", sess.user.id)
        .maybeSingle();
      setRole(prof?.rol ?? sess.user?.user_metadata?.rol ?? "");

      // Trae intentos del usuario + título del escenario
      const { data: rows, error: e2 } = await supabase
        .from("attempts")
        .select(`
          id, user_id, scenario_id, started_at, finished_at, correct_count, total_count, score,
          scenarios ( title )
        `)
        .eq("user_id", sess.user.id)
        .order("started_at", { ascending: false });
      if (e2) {
        console.error("[Evaluacion] attempts select error:", e2);
        setErr(e2.message || "Error cargando intentos");
        setAttempts([]);
      } else {
        setAttempts(rows || []);
        // Cargar resumen de críticas para esos attempts (si hay)
        const ids = (rows || []).map(r => r.id);
        if (ids.length > 0) {
          const { data: crits, error: e3 } = await supabase
            .from("v_attempt_criticals")
            .select("attempt_id, total_criticals, criticals_ok, criticals_failed")
            .in("attempt_id", ids);
          if (e3) {
            console.warn("[Evaluacion] v_attempt_criticals error:", e3);
            setCritMap({});
          } else {
            const map = {};
            for (const c of (crits || [])) map[c.attempt_id] = c;
            setCritMap(map);
          }
        } else {
          setCritMap({});
        }
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!sess) navigate("/", { replace: true });
    });
    return () => { mounted = false; try { sub?.subscription?.unsubscribe?.(); } catch {} };
  }, [navigate]);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-slate-600">Cargando…</div></div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <section className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1] text-white">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <p className="text-white/80 text-sm">Evaluación del desempeño • {formatRole(role)}</p>
          <h1 className="text-2xl md:text-3xl font-semibold">Tus resultados</h1>
          <p className="opacity-95">Resumen de intentos y medias por escenario.</p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8">
        <BarChart
          data={summaryByScenario.map(d => ({ label: d.label, value: d.value }))}
          title="Media de puntuación por escenario"
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Intentos</h3>
            <Link to="/dashboard" className="text-sm underline text-slate-700">Volver al panel</Link>
          </div>
          {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
          {attempts.length === 0 ? (
            <p className="text-slate-600 mt-2">Aún no has realizado ningún intento.</p>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2">Fecha</th>
                    <th className="text-left px-4 py-2">Escenario</th>
                    <th className="text-left px-4 py-2">Resultado</th>
                    <th className="text-left px-4 py-2">Estado</th>
                    <th className="text-left px-4 py-2">Críticas</th>
                    <th className="text-left px-4 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => {
                    const date = new Date(a.started_at).toLocaleString();
                    const estado = a.finished_at ? "Finalizado" : "En curso";
                    const res = a.finished_at ? `${a.correct_count}/${a.total_count} (${a.score ?? 0}%)` : "—";
                    const title = a.scenarios?.title || `Escenario ${a.scenario_id}`;
                    const crit = critMap[a.id];
                    const critText = crit ? `${crit.criticals_ok}/${crit.total_criticals}` : "—";
                    return (
                      <tr key={a.id} className="border-t">
                        <td className="px-4 py-2">{date}</td>
                        <td className="px-4 py-2">{title}</td>
                        <td className="px-4 py-2">{res}</td>
                        <td className="px-4 py-2">{estado}</td>
                        <td className="px-4 py-2">{critText}</td>
                        <td className="px-4 py-2">
                          <Link to={`/evaluacion/attempt/${a.id}`} className="text-blue-600 underline">Revisar</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}