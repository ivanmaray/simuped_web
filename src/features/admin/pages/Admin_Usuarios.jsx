// src/features/admin/pages/Admin_Usuarios.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";

import Navbar from "../../../components/Navbar.jsx";
import {
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
  CheckBadgeIcon,
  EnvelopeOpenIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

function fmtDateShort(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }); } catch { return "—"; }
}

function isApprovedUser(u) {
  return Boolean(u?.approved || u?.approved_at);
}

function verifiedTimestamp(u) {
  return u?.verified_at || u?.email_verified_at || u?.email_confirmed_at || null;
}

function isVerifiedUser(u) {
  return Boolean(verifiedTimestamp(u));
}

function notifiedTimestamp(u, fallback = null) {
  return u?.notified_at || u?.last_notified_at || fallback || null;
}

function getDni(u) {
  const value = u?.dni ?? u?.documento ?? u?.document ?? u?.nif ?? u?.nie ?? null;
  if (!value) return "";
  return String(value).trim();
}

function StatusPills({ verified, approved, notifiedAt, verifiedAt, isAdmin = false }) {
  return (
    <div className="flex flex-col gap-1 min-w-[110px]">
      {isAdmin ? <Badge tone="info" icon="A" labelTrue="Admin" /> : null}
      <Badge ok={!!verified} labelTrue="Verif." labelFalse="Sin verif." />
      <Badge ok={!!approved} labelTrue="Aprob." labelFalse="Pend." />
      <span className="text-[11px] text-slate-500">{verifiedAt ? `Verif. ${fmtDateShort(verifiedAt)}` : "Verif. —"}</span>
      <span className="text-[11px] text-slate-500">{notifiedAt ? `Notif. ${fmtDateShort(notifiedAt)}` : "Notif. —"}</span>
    </div>
  );
}

function Badge({ ok, labelTrue = "Verificado", labelFalse = "No verificado", tone = null, icon }) {
  const palette = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  };

  if (tone) {
    const toneCls = palette[tone] || palette.success;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${toneCls}`}>
        {(icon ?? (tone === "info" ? "i" : "✔"))} {labelTrue}
      </span>
    );
  }

  const okCls = ok ? palette.success : palette.warning;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${okCls}`}>
      {ok ? "✔" : "!"} {ok ? labelTrue : labelFalse}
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

function Card({ title, count, icon: Icon, children, accent = "" }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-2xl grid place-items-center ${accent || 'bg-slate-900/5 text-slate-900'}`}>
            {Icon ? <Icon className="h-5 w-5" /> : null}
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {typeof count === "number" && (
          <span className="text-sm text-slate-500">{count} usuario{count === 1 ? '' : 's'}</span>
        )}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export default function Admin_Usuarios() {
  const navigate = useNavigate();
  function verIntentos(u) {
    if (!u?.id) return;
    // Redirige a Evaluación con el user query param para ver sus intentos
    navigate(`/evaluacion?user=${encodeURIComponent(u.id)}`);
  }
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState(""); // debounced query
  const qTimerRef = useRef(null);
  const [processingIds, setProcessingIds] = useState({}); // { [userId]: true }
  const [, setMailStatus] = useState({}); // { [userId]: "ok" | "fail" }
  const [mailTime, setMailTime] = useState({}); // { [userId]: ISOString when notified via our API }
  const [rolFilter, setRolFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [adminFilter, setAdminFilter] = useState("");

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
      if (!me?.is_admin) {
        setErr("Acceso restringido: esta sección es solo para administradores.");
        setLoading(false);
        return;
      }

      // 3) Usuarios (usar RPC admin_list_users para evitar RLS sobre profiles)
      try {
        const { data, error: listErr } = await supabase
          .from("profiles")
          .select(`
            id, email, nombre, apellidos, rol, unidad, dni, approved, approved_at,
            is_admin, created_at, updated_at, verified_at, notified_at
          `)
          .order("created_at", { ascending: false });

        if (listErr) throw listErr;

        setRows((data || []).filter((r) => r?.id));
      } catch (e) {
        setErr(e?.message || "Error cargando usuarios (profiles).");
        setLoading(false);
        return;
      }
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

  const rolesDisponibles = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const raw = (r?.rol || "").toString().trim();
      if (!raw) continue;
      const value = raw.toLowerCase();
      if (!map.has(value)) {
        map.set(value, { value, label: raw });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [rows]);

  const { pendientes, aprobados } = useMemo(() => {
    const norm = (s) => (s ?? "").toString().toLowerCase();
    const query = norm(dq);
    const filt = (arr) =>
      arr.filter((r) => {
        const em = norm(r?.email);
        const nm = norm(r?.nombre);
        const ap = norm(r?.apellidos);
        const rl = norm(r?.rol);
        const un = norm(r?.unidad);
        const dn = norm(getDni(r));
        const isAdminUser = !!r?.is_admin;
        const matchText = !query || em.includes(query) || nm.includes(query) || ap.includes(query) || rl.includes(query) || un.includes(query) || dn.includes(query);
        if (!matchText) return false;
        if (rolFilter) {
          if (norm(r?.rol) !== rolFilter) return false;
        }
        if (verifiedFilter) {
          const isVerified = isVerifiedUser(r);
          if (verifiedFilter === 'verified' && !isVerified) return false;
          if (verifiedFilter === 'unverified' && isVerified) return false;
        }
        if (adminFilter === 'admins' && !isAdminUser) return false;
        if (adminFilter === 'nonadmins' && isAdminUser) return false;
        return true;
      });

    const pend = filt(rows.filter((r) => !isApprovedUser(r)));
    const apr = filt(rows.filter((r) => isApprovedUser(r)));
    return { pendientes: pend, aprobados: apr };
  }, [rows, dq, rolFilter, verifiedFilter, adminFilter]);

  const heroMetrics = useMemo(() => {
    const total = rows.length;
    const pendingCount = pendientes.length;
    const approvedCount = aprobados.length;
    const verifiedCount = rows.filter((r) => isVerifiedUser(r)).length;
    const notifiedCount = rows.filter((r) => notifiedTimestamp(r)).length;
    return [
      {
        key: "total",
        icon: UserGroupIcon,
        label: "Usuarios totales",
        value: total,
        helper: pendingCount ? `${pendingCount} pendientes` : "Todo al día",
      },
      {
        key: "approved",
        icon: ClipboardDocumentCheckIcon,
        label: "Aprobados",
        value: approvedCount,
        helper: total ? `${Math.round((approvedCount / total) * 100)}% del total` : "Sin registros",
      },
      {
        key: "verified",
        icon: CheckBadgeIcon,
        label: "Verificados",
        value: verifiedCount,
        helper: total ? `${Math.round((verifiedCount / total) * 100)}% con email verificado` : "Pendiente",
      },
      {
        key: "notified",
        icon: EnvelopeOpenIcon,
        label: "Notificados",
        value: notifiedCount,
        helper: total ? `${Math.round((notifiedCount / total) * 100)}% avisados por email` : "—",
      },
    ];
  }, [rows, pendientes.length, aprobados.length]);

  async function aprobar(u) {
    if (!u?.id) return;
    if (processingIds[u.id]) return; // evita dobles clics

    setErr("");
    setOk("");
    setProcessingIds((prev) => ({ ...prev, [u.id]: true }));

    try {
      // 1) Marca aprobado via RPC para evitar choques de RLS
      const nowIso = new Date().toISOString();
      const { data: rpcRes, error: e1 } = await supabase.rpc("admin_approve_user", { _user_id: u.id });
      if (e1) throw e1;
      if (rpcRes && rpcRes.ok === false) {
        throw new Error(rpcRes.msg || "No se pudo aprobar al usuario");
      }

      // 2) Notifica por email (endpoint Vercel). Enviamos nombre y email (no usamos auth.users).
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
          try {
            const j = await res.json();
            console.warn("[Admin] notify_user_approved response:", j);
          } catch {}
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
        } catch {
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

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-[110rem] mx-auto px-5 py-12 text-white relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-white/70 text-sm uppercase tracking-wide">Administración</p>
              <h1 className="text-3xl md:text-4xl font-semibold">Gestión de usuarios</h1>
              <p className="opacity-95 max-w-3xl text-lg">
                Revisa solicitudes pendientes, aprueba perfiles verificados y controla el estado de notificaciones en un solo lugar.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
              {heroMetrics.map((metric) => (
                <HeroCard key={metric.key} icon={metric.icon} label={metric.label} value={metric.value} helper={metric.helper} />
              ))}
            </div>
          </div>
        </div>
      </section>

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

        {/* Filtros */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_40px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-slate-900/5 text-slate-900 grid place-items-center">
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Filtrar usuarios</h2>
                <p className="text-sm text-slate-500">Refina la búsqueda por rol, estado, verificación y tipo de usuario.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr] gap-4 px-5 py-5">
            <label className="block text-sm text-slate-600">
              <span className="text-xs uppercase tracking-wide text-slate-400">Buscar</span>
              <div className="mt-1 relative flex items-center">
                <MagnifyingGlassIcon className="absolute left-3 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Email, nombre, rol, unidad…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
                />
              </div>
            </label>
            <label className="block text-sm text-slate-600">
              <span className="text-xs uppercase tracking-wide text-slate-400">Rol</span>
              <select
                value={rolFilter}
                onChange={(e) => setRolFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
              >
                <option value="">Todos los roles</option>
                {rolesDisponibles.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-600">
              <span className="text-xs uppercase tracking-wide text-slate-400">Verificación</span>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="verified">Verificados</option>
                <option value="unverified">Sin verificar</option>
              </select>
            </label>
            <label className="block text-sm text-slate-600">
              <span className="text-xs uppercase tracking-wide text-slate-400">Tipo de usuario</span>
              <select
                value={adminFilter}
                onChange={(e) => setAdminFilter(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6ACB]/70 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="admins">Solo administradores</option>
                <option value="nonadmins">Solo no administradores</option>
              </select>
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            <span>Usuarios mostrados: {pendientes.length + aprobados.length}</span>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setRolFilter("");
                setVerifiedFilter("");
                setAdminFilter("");
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Restablecer filtros
            </button>
          </div>
        </section>

        {/* Pendientes */}
        <Card
          title="Solicitudes pendientes"
          count={pendientes.length}
          icon={ClipboardDocumentCheckIcon}
          accent="bg-amber-100 text-amber-700"
        >
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
                <thead className="bg-slate-50/80 sticky top-0 z-10">
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
                    const verif = isVerifiedUser(u);
                    const fullName = [u.nombre, u.apellidos].filter(Boolean).join(" ") || "—";
                    return (
                      <tr key={u.id} className="border-t align-top hover:bg-slate-50">
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
                        <td className="px-3 py-2 whitespace-nowrap">{getDni(u) || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDateShort(u.created_at)}</td>
                        <td className="px-3 py-2">
                          <StatusPills
                            verified={verif}
                            approved={false}
                            notifiedAt={null}
                            verifiedAt={verifiedTimestamp(u)}
                            isAdmin={!!u.is_admin}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => aprobar(u)}
                              disabled={!!processingIds[u.id] || !!u.approved}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-xs"
                            >
                              {processingIds[u.id] ? "…" : "Aprobar"}
                            </button>
                            {(() => {
                              const isVerified = isVerifiedUser(u);
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
        <Card
          title="Usuarios aprobados"
          count={aprobados.length}
          icon={UserGroupIcon}
          accent="bg-emerald-100 text-emerald-700"
        >
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
                <thead className="bg-slate-50/80 sticky top-0 z-10">
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
                    const verif = isVerifiedUser(u);
                    const fullName = [u.nombre, u.apellidos].filter(Boolean).join(" ") || "—";
                    return (
                      <tr key={u.id} className="border-t align-top hover:bg-slate-50">
                        <td className="px-3 py-2"><div className="truncate" title={u.email || "—"}>{u.email || "—"}</div></td>
                        <td className="px-3 py-2"><div className="truncate" title={fullName}>{fullName}</div></td>
                        <td className="px-3 py-2">
                          <div className="truncate" title={`${u.rol || "—"} / ${u.unidad || "—"}`}>
                            {(u.rol || "—")} / {(u.unidad || "—")}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{getDni(u) || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="text-[11px] leading-tight">
                            <div>Aprob.: {fmtDateShort(u.approved_at || u.updated_at)}</div>
                            <div>Alta: {fmtDateShort(u.created_at)}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <StatusPills
                            verified={verif}
                            approved={true}
                            notifiedAt={notifiedTimestamp(u, mailTime[u.id])}
                            verifiedAt={verifiedTimestamp(u)}
                            isAdmin={!!u.is_admin}
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
