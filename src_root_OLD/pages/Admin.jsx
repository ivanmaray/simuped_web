// src/pages/Admin.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

function Badge({ ok, labelTrue = "Verificado", labelFalse = "No verificado" }) {
  const okCls = ok
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${okCls}`}>
      {ok ? "✔" : "!"} {ok ? labelTrue : labelFalse}
    </span>
  );
}

function Card({ title, count, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {typeof count === "number" && (
          <span className="text-sm text-slate-500">{count} usuario(s)</span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [yo, setYo] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");
  const [processingIds, setProcessingIds] = useState({}); // { [userId]: true }
  const [authMap, setAuthMap] = useState({}); // { [userId]: { email_confirmed: bool } }

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setErr("");
      setOk("");

      // 1) Sesión
      const { data: s } = await supabase.auth.getSession();
      const user = s?.session?.user || null;
      if (!mounted) return;

      if (!user) {
        setErr("No hay sesión activa.");
        setLoading(false);
        return;
      }

      // 2) Perfil para saber si es admin
      const { data: me, error: meErr } = await supabase
        .from("profiles")
        .select("id, email, nombre, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;
      if (meErr) {
        setErr(meErr.message || "Error cargando tu perfil.");
        setLoading(false);
        return;
      }
      setYo(me);

      if (!me?.is_admin) {
        setErr("No tienes permisos para acceder a esta sección.");
        setLoading(false);
        return;
      }

      // 3) Usuarios (se asume RLS que permite al admin leer todos)
      const { data: all, error: uErr } = await supabase
        .from("profiles")
        .select("id, email, nombre, rol, approved, created_at")
        .order("created_at", { ascending: false });

      if (uErr) {
        setErr(uErr.message || "Error cargando usuarios.");
        setLoading(false);
        return;
      }

      // filtra registros raros sin id
      const cleaned = (all || []).filter((r) => r?.id);
      setRows(cleaned);

      // 4) Cargar estado de verificación (RPC segura en el backend). Si no existe, se ignora.
      try {
        const { data: authRows, error: aErr } = await supabase.rpc("admin_list_users");
        if (!aErr && Array.isArray(authRows)) {
          const map = {};
          for (const r of authRows) {
            if (r && r.id) map[r.id] = { email_confirmed: !!r.email_confirmed };
          }
          setAuthMap(map);
        }
      } catch (_) {
        // No pasa nada si no existe la RPC todavía.
      }

      setLoading(false);
    }

    init();
    return () => { mounted = false; };
  }, []);

  const { pendientes, aprobados } = useMemo(() => {
    const norm = (s) => (s || "").toString().toLowerCase();
    const query = norm(q);
    const filt = (arr) =>
      arr.filter((r) => {
        if (!query) return true;
        return (
          norm(r.email).includes(query) ||
          norm(r.nombre).includes(query) ||
          norm(r.rol).includes(query)
        );
      });

    const pend = filt(rows.filter((r) => !r.approved));
    const apr = filt(rows.filter((r) => r.approved));
    return { pendientes: pend, aprobados: apr };
  }, [rows, q]);

  async function aprobar(u) {
    if (!u?.id) return;
    if (processingIds[u.id]) return; // evita dobles clics

    setErr("");
    setOk("");
    setProcessingIds((prev) => ({ ...prev, [u.id]: true }));

    try {
      // 1) Marca aprobado
      const { error: e1 } = await supabase
        .from("profiles")
        .update({ approved: true, updated_at: new Date().toISOString() })
        .eq("id", u.id);

      if (e1) throw e1;

      // 2) Notifica por email (tu endpoint local de Vercel/Node)
      let mailOk = true;
      try {
        const res = await fetch("/api/notify_user_approved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: u.email, nombre: u.nombre }),
        });
        if (!res.ok) mailOk = false;
      } catch {
        mailOk = false;
      }

      // 3) Actualiza UI
      setRows((prev) =>
        prev.map((r) => (r.id === u.id ? { ...r, approved: true } : r))
      );
      setOk(mailOk ? "Usuario aprobado y notificado ✔" : "Usuario aprobado ✔ (no se pudo enviar el email)");
    } catch (e) {
      console.error("[Admin] aprobar error:", e);
      setErr(e?.message || "No se pudo aprobar al usuario. Revisa permisos RLS.");
    } finally {
      setProcessingIds((prev) => {
        const n = { ...prev };
        delete n[u.id];
        return n;
      });
    }
  }

  async function reenviarVerificacion(u) {
    if (!u?.email) return;
    setErr("");
    setOk("");
    try {
      const res = await fetch("/api/resend_verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email }),
      });
      if (!res.ok) throw new Error("No se pudo reenviar la verificación");
      setOk("Correo de verificación reenviado ✔");
    } catch (e) {
      console.error("[Admin] resend verify error:", e);
      setErr(e?.message || "No se pudo reenviar la verificación");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar isPrivate />
        <div className="max-w-5xl mx-auto px-5 py-10 text-slate-600">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar isPrivate />
      <header className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1] text-white">
        <div className="max-w-6xl mx-auto px-5 py-6">
          <div className="text-xs opacity-90">Admin</div>
          <h1 className="text-2xl font-bold">Panel de administración</h1>
          <p className="opacity-90 mt-1">Aprobación de usuarios y notificaciones.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-6">
        {(err || ok) && (
          <div
            className={`rounded-lg border px-4 py-2 text-sm ${
              err
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            {err || ok}
          </div>
        )}

        {/* Buscador */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-sm text-slate-700">Buscar por email, nombre o rol</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="p. ej. ana@, ivan, farmacia…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
          />
        </div>

        {/* Pendientes */}
        <Card title="Solicitudes pendientes" count={pendientes.length}>
          {pendientes.length === 0 ? (
            <div className="text-slate-500 text-sm">No hay solicitudes pendientes ahora mismo.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Nombre</th>
                    <th className="text-left px-3 py-2">Rol</th>
                    <th className="text-left px-3 py-2">Verificación</th>
                    <th className="text-left px-3 py-2">Alta</th>
                    <th className="text-left px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((u) => {
                    const verif = authMap[u.id]?.email_confirmed ?? null; // null -> desconocido
                    return (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">{u.email || "—"}</td>
                        <td className="px-3 py-2">{u.nombre || "—"}</td>
                        <td className="px-3 py-2">{u.rol || "—"}</td>
                        <td className="px-3 py-2">
                          {verif === null ? (
                            <span className="text-xs text-slate-500">—</span>
                          ) : (
                            <Badge ok={!!verif} />
                          )}
                        </td>
                        <td className="px-3 py-2">{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => aprobar(u)}
                              disabled={!!processingIds[u.id]}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {processingIds[u.id] ? "Procesando…" : "Aprobar y notificar"}
                            </button>
                            <button
                              onClick={() => reenviarVerificacion(u)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                              title="Reenviar correo de verificación"
                            >
                              Reenviar verificación
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Aprobados */}
        <Card title="Usuarios aprobados" count={aprobados.length}>
          {aprobados.length === 0 ? (
            <div className="text-slate-500 text-sm">Aún no hay usuarios aprobados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Nombre</th>
                    <th className="text-left px-3 py-2">Rol</th>
                    <th className="text-left px-3 py-2">Verificación</th>
                    <th className="text-left px-3 py-2">Aprobado</th>
                  </tr>
                </thead>
                <tbody>
                  {aprobados.map((u) => {
                    const verif = authMap[u.id]?.email_confirmed ?? null;
                    return (
                      <tr key={u.id} className="border-t">
                        <td className="px-3 py-2">{u.email || "—"}</td>
                        <td className="px-3 py-2">{u.nombre || "—"}</td>
                        <td className="px-3 py-2">{u.rol || "—"}</td>
                        <td className="px-3 py-2">
                          {verif === null ? (
                            <span className="text-xs text-slate-500">—</span>
                          ) : (
                            <Badge ok={!!verif} />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge ok={true} labelTrue="Aprobado" labelFalse="Pendiente" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}