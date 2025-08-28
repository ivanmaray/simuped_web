// src/pages/AttemptReview.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

function normalizeOptions(opts) {
  if (!opts) return [];
  if (typeof opts === "string") { try { opts = JSON.parse(opts); } catch { return []; } }
  if (Array.isArray(opts)) {
    if (opts.every(o => typeof o === "string")) return opts.map((label, i) => ({ key: String(i), label }));
    return opts.map((o, i) => ({ key: String(o.key ?? i), label: o.label ?? String(o) }));
  }
  return [];
}

export default function AttemptReview() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data?.session) { navigate("/", { replace: true }); return; }
      setSession(data.session);

      // Leer de la vista v_attempt_review (RLS te limita a tus intentos)
      const { data: rev, error } = await supabase
        .from("v_attempt_review")
        .select("*")
        .eq("attempt_id", attemptId)
        .order("step_order", { ascending: true });
      if (error) { setErr(error.message || "Error cargando intento"); setLoading(false); return; }
      setRows(rev || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [attemptId, navigate]);

  const head = rows[0] || null;
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!r?.step_id) continue;
      if (!map.has(r.step_id)) map.set(r.step_id, { step_id: r.step_id, step_order: r.step_order, step_title: r.step_title, items: [] });
      map.get(r.step_id).items.push(r);
    }
    return Array.from(map.values()).sort((a,b)=>a.step_order-b.step_order);
  }, [rows]);

  // Contar críticas
  const criticals = useMemo(() => {
    let total = 0, ok = 0;
    for (const r of rows) {
      if (r?.is_critical) {
        total++;
        if (r?.is_correct) ok++;
      }
    }
    return { total, ok, failed: Math.max(0, total - ok) };
  }, [rows]);

  if (loading) return <div className="min-h-screen grid place-items-center">Cargando intento…</div>;
  if (err) return <div className="min-h-screen grid place-items-center text-red-700">{err}</div>;
  if (!rows.length) return <div className="min-h-screen grid place-items-center">No se encontraron datos del intento.</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar isPrivate />
      <main className="max-w-6xl mx-auto px-5 py-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Revisión del intento</h1>
            <p className="text-slate-600">
              {head?.scenario_title} · Intento {String(head?.attempt_id).slice(0,8)}…
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border px-3 py-1.5 text-sm">
              <span className="text-slate-600 mr-2">Nota</span>
              <span className="font-semibold">{head?.score ?? 0}%</span>
            </div>
            {criticals.total > 0 && (
              <div className={`rounded-lg border px-3 py-1.5 text-sm ${criticals.failed ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                Críticas: {criticals.ok}/{criticals.total}
              </div>
            )}
          </div>
        </header>

        {grouped.map((step) => (
          <section key={step.step_id} className="mb-6">
            <h2 className="text-lg font-semibold mb-2">{step.step_order}. {step.step_title}</h2>
            <div className="space-y-3">
              {step.items.map((q) => {
                if (!q?.question_id) return null;
                const good = !!q.is_correct;
                return (
                  <article key={q.question_id} className={`rounded-xl border p-4 ${q.is_critical ? "border-amber-300 bg-amber-50/40" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{q.question_text}</p>
                      {q.is_critical && (
                        <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200">⚠️ Crítica</span>
                      )}
                    </div>

                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <div className={`rounded-lg px-3 py-2 text-sm border ${good ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                        <span className="font-semibold">{good ? "Tu respuesta" : "Tu respuesta (incorrecta)"}: </span>
                        <span>{q.selected_label ?? "—"}</span>
                        {typeof q.hints_used === "number" && q.hints_used > 0 && (
                          <span className="ml-2 text-xs text-slate-600">· Pistas usadas: {q.hints_used}</span>
                        )}
                      </div>
                      <div className="rounded-lg px-3 py-2 text-sm border bg-slate-50 text-slate-800 border-slate-200">
                        <span className="font-semibold">Correcta: </span>
                        <span>{q.correct_label ?? "—"}</span>
                      </div>
                    </div>

                    {q.explanation && (
                      <div className="mt-2 text-sm text-slate-700">
                        <span className="font-semibold">Explicación: </span>{q.explanation}
                      </div>
                    )}
                    {q.answered_at && (
                      <div className="mt-1 text-xs text-slate-500">Respondida: {new Date(q.answered_at).toLocaleString()}</div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <div className="mt-6 flex gap-3">
          <Link to="/evaluacion" className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">Volver a Evaluación</Link>
          <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-[#1a69b8] text-white hover:opacity-95">Panel</Link>
        </div>
      </main>
    </div>
  );
}