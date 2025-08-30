// src/pages/Admin.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

import Navbar from "../components/Navbar.jsx";

function fmtDateShort(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }); } catch { return "—"; }
}

function StatusPills({ verified, approved, notifiedAt, verifiedAt }) {
  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <Badge ok={!!verified} labelTrue="Verif." labelFalse="Sin verif." />
      <Badge ok={!!approved} labelTrue="Aprob." labelFalse="Pend." />
      <span className="text-[11px] text-slate-500">{verifiedAt ? `Verif. ${fmtDateShort(verifiedAt)}` : "Verif. —"}</span>
      <span className="text-[11px] text-slate-500">{notifiedAt ? `Notif. ${fmtDateShort(notifiedAt)}` : "Notif. —"}</span>
    </div>
  );
}

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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
  const navigate = useNavigate();
  function verIntentos(u) {
    if (!u?.id) return;
    // Redirige a Evaluación con el user query param para ver sus intentos
    navigate(`/evaluacion?user=${encodeURIComponent(u.id)}`);
  }
  const [loading, setLoading] = useState(true);
  const [yo, setYo] = useState(null);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState(""); // debounced query
  const qTimerRef = useRef(null);
  const [processingIds, setProcessingIds] = useState({}); // { [userId]: true }
  const [mailStatus, setMailStatus] = useState({}); // { [userId]: "ok" | "fail" }
  const [authMap, setAuthMap] = useState({}); // { [userId]: { email_confirmed: bool, email_confirmed_at: string|null } }
  const [mailTime, setMailTime] = useState({}); // { [userId]: ISOString when notified }

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
        setErr("Acceso restringido: esta sección es solo para administradores.");
        setLoading(false);
        return;
      }

      // 3) Usuarios (usar RPC admin_list_users para evitar RLS sobre profiles)
      let cleaned = [];
      let authRows = [];
      try {
        const { data: rpcRows, error: rpcErr } = await supabase.rpc("admin_list_users");
        if (rpcErr) {
          throw rpcErr;
        }
        // rpcRows ya trae: id, email, nombre, apellidos, dni, rol, unidad,
        // areas_interes, created_at, updated_at, approved, approved_at, is_admin,
        // email_confirmed, email_confirmed_at, last_sign_in_at
        authRows = rpcRows || [];
        cleaned = authRows.filter((r) => r?.id);
      } catch (e) {
        setErr(e?.message || "Error cargando usuarios (admin_list_users).");
        setLoading(false);
        return;
      }

      setRows(cleaned);

      // 4) Mapa de verificación (desde la propia RPC)
      const map = {};
      for (const r of authRows) {
        if (r && r.id) map[r.id] = { email_confirmed: !!r.email_confirmed, email_confirmed_at: r.email_confirmed_at || null };
      }
      setAuthMap(map);

      setLoading(false);
    }

    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (qTimerRef.current) clearTimeout(qTimerRef.current);
    qTimerRef.current = setTimeout(() => {
      setDq(q.trim());
    }, 250);
    return () => {
      if (qTimerRef.current) clearTimeout(qTimerRef.current);
    };
  }, [q]);

  const { pendientes, aprobados } = useMemo(() => {
    const norm = (s) => (s ?? "").toString().toLowerCase();
    const query = norm(dq);
    const filt = (arr) =>
      arr.filter((r) => {
        if (!query) return true;
        const em = norm(r?.email);
        const nm = norm(r?.nombre);
        const ap = norm(r?.apellidos);
        const rl = norm(r?.rol);
        const un = norm(r?.unidad);
        const dn = norm(r?.dni);
        return em.includes(query) || nm.includes(query) || ap.includes(query) || rl.includes(query) || un.includes(query) || dn.includes(query);
      });

    const pend = filt(rows.filter((r) => !r?.approved));
    const apr = filt(rows.filter((r) => !!r?.approved));
    return { pendientes: pend, aprobados: apr };
  }, [rows, dq]);

  async function aprobar(u) {
    if (!u?.id) return;
    if (processingIds[u.id]) return; // evita dobles clics

    setErr("");
    setOk("");
    setProcessingIds((prev) => ({ ...prev, [u.id]: true }));

    try {
      // 1) Marca aprobado via RPC para evitar choques de RLS
      const nowIso = new Date().toISOString();
      const { error: e1 } = await supabase.rpc("admin_approve_user", { _user_id: u.id });
      if (e1) throw e1;

      // 2) Notifica por email (endpoint Vercel). Enviamos nombre y email.
      let mailOk = false;
      try {
        const res = await fetch("/api/notify_user_approved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: u.email,
            nombre: u.nombre || "",
          }),
        });
        if (res.ok) {
          mailOk = true;
        } else {
          // intenta leer error para mostrarlo
          try {
            const j = await res.json();
            console.warn("[Admin] notify_user_approved response:", j);
          } catch (_) {}
        }
      } catch (e) {
        console.error("[Admin] notify_user_approved fetch error:", e);
      }

      // 2b) Si se notificó por email correctamente, persistimos notified_at
      if (mailOk) {
        try {
          await supabase
            .from("profiles")
            .update({ notified_at: nowIso, updated_at: nowIso })
            .eq("id", u.id);
        } catch (_) {
          // si falla, lo reflejaremos al menos en el estado local más abajo
        }
      }

      // 3) Actualiza UI
      setRows((prev) =>
        prev.map((r) =>
          r.id === u.id
            ? { ...r, approved: true, approved_at: nowIso, updated_at: nowIso, notified_at: mailOk ? nowIso : r.notified_at }
            : r
        )
      );
      setMailStatus((prev) => ({ ...prev, [u.id]: mailOk ? "ok" : "fail" }));
      if (mailOk) {
        setMailTime((prev) => ({ ...prev, [u.id]: nowIso }));
      }
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
      setMailStatus((prev) => ({ ...prev, [u.id]: "ok" }));
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
        <div className="max-w-7xl mx-auto px-5 py-6">
          <div className="text-xs opacity-90">Admin</div>
          <h1 className="text-2xl font-bold">Panel de administración</h1>
          <p className="opacity-90 mt-1">Aprobación de usuarios y notificaciones.</p>
        </div>
      </header>

      <main className="max-w-[110rem] mx-auto px-5 py-8 space-y-6">
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
          <p className="mt-1 text-xs text-slate-500">La búsqueda se aplica automáticamente.</p>
        </div>

        {/* Pendientes */}
        <Card title="Solicitudes pendientes" count={pendientes.length}>
          {pendientes.length === 0 ? (
            <div className="text-slate-500 text-sm">No hay solicitudes pendientes ahora mismo.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col style={{ width: "12rem" }} />  {/* Email */}
                  <col style={{ width: "8rem" }} />   {/* Nombre */}
                  <col style={{ width: "9rem" }} />   {/* Rol / Unidad */}
                  <col style={{ width: "8rem" }} />   {/* DNI */}
                  <col style={{ width: "8rem" }} />   {/* Alta */}
                  <col style={{ width: "8rem" }} />   {/* Estado */}
                  <col style={{ width: "10rem" }} />  {/* Acciones */}
                </colgroup>
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Nombre</th>
                    <th className="text-left px-3 py-2">Rol / Unidad</th>
                    <th className="text-left px-3 py-2">DNI</th>
                    <th className="text-left px-3 py-2">Alta</th>
                    <th className="text-left px-3 py-2">Estado</th>
                    <th className="text-left px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pendientes.map((u) => {
                    const verif = authMap[u.id]?.email_confirmed ?? null;
                    const fullName = [u.nombre, u.apellidos].filter(Boolean).join(" ") || "—";
                    return (
                      <tr key={u.id} className="border-t align-top">
                        <td className="px-3 py-2">
                          <div className="truncate" title={u.email || "—"}>{u.email || "—"}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="truncate" title={fullName}>{fullName}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="truncate" title={`${u.rol || "—"} / ${u.unidad || "—"}`}>
                            {(u.rol || "—")} / {(u.unidad || "—")}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{u.dni || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDateShort(u.created_at)}</td>
                        <td className="px-3 py-2">
                          <StatusPills
                            verified={verif ?? false}
                            approved={false}
                            notifiedAt={null}
                            verifiedAt={authMap[u.id]?.email_confirmed_at || null}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => aprobar(u)}
                              disabled={!!processingIds[u.id]}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-xs"
                            >
                              {processingIds[u.id] ? "…" : "Aprobar"}
                            </button>
                            {(() => {
                              const isVerified = !!(authMap[u.id]?.email_confirmed);
                              return (
                                <button
                                  onClick={() => reenviarVerificacion(u)}
                                  disabled={!!processingIds[u.id] || isVerified}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-xs"
                                  title={isVerified ? "Ya verificado" : "Reenviar correo de verificación"}
                                >
                                  {isVerified ? "Verif. OK" : "Reenviar verif."}
                                </button>
                              );
                            })()}
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
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col style={{ width: "13rem" }} />  {/* Email */}
                  <col style={{ width: "9rem" }} />   {/* Nombre */}
                  <col style={{ width: "10rem" }} />  {/* Rol / Unidad */}
                  <col style={{ width: "9rem" }} />   {/* DNI */}
                  <col style={{ width: "12rem" }} />  {/* Fechas */}
                  <col style={{ width: "9rem" }} />   {/* Estado */}
                  <col style={{ width: "7.5rem" }} />   {/* Resultados */}
                </colgroup>
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Nombre</th>
                    <th className="text-left px-3 py-2">Rol / Unidad</th>
                    <th className="text-left px-3 py-2">DNI</th>
                    <th className="text-left px-3 py-2">Fechas</th>
                    <th className="text-left px-3 py-2">Estado</th>
                    <th className="text-left px-3 py-2">Resultados</th>
                  </tr>
                </thead>
                <tbody>
                  {aprobados.map((u) => {
                    const verif = authMap[u.id]?.email_confirmed ?? null;
                    const fullName = [u.nombre, u.apellidos].filter(Boolean).join(" ") || "—";
                    return (
                      <tr key={u.id} className="border-t align-top">
                        <td className="px-3 py-2"><div className="truncate" title={u.email || "—"}>{u.email || "—"}</div></td>
                        <td className="px-3 py-2"><div className="truncate" title={fullName}>{fullName}</div></td>
                        <td className="px-3 py-2">
                          <div className="truncate" title={`${u.rol || "—"} / ${u.unidad || "—"}`}>
                            {(u.rol || "—")} / {(u.unidad || "—")}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{u.dni || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-[11px] leading-tight">
                            <div>Aprob.: {fmtDateShort(u.approved_at || u.updated_at)}</div>
                            <div>Alta: {fmtDateShort(u.created_at)}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <StatusPills
                            verified={verif ?? false}
                            approved={true}
                            notifiedAt={u.notified_at || mailTime[u.id]}
                            verifiedAt={authMap[u.id]?.email_confirmed_at || null}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => verIntentos(u)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs"
                            title="Ver intentos del usuario"
                          >
                            Ver
                          </button>
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