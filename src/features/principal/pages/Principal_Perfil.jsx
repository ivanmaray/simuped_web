// src/pages/Perfil.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";

const COLORS = {
  primary: "#1E6ACB",
};

const UNIDADES = ["Farmacia", "UCI", "Urgencias"];

function formatRoleLabel(rol) {
  const key = String(rol || "").toLowerCase();
  if (key.includes("farm")) return "Farmacia";
  if (key.includes("enfer")) return "Enfermería";
  if (key.includes("med")) return "Medicina";
  return key ? key[0].toUpperCase() + key.slice(1) : "—";
}

function formatDateShort(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function HeroStat({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
        <p className="text-xl font-semibold text-white leading-tight">{value || "—"}</p>
        {helper ? <p className="text-[11px] text-white/70 mt-1">{helper}</p> : null}
      </div>
    </div>
  );
}

// Helpers seguros para JSON (compatibles si la columna es TEXT o JSONB)
function safeParseJSON(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}
// Helpers DNI
function normalizarDNI(v) {
  return (v || "").toString().toUpperCase().replace(/\s|-/g, "");
}

// Valida DNI (12345678Z) o NIE (X1234567L, Y..., Z...) con letra de control correcta
function validarDNI(v) {
  const dni = normalizarDNI(v);

  const isDNI = /^\d{8}[A-Z]$/.test(dni);
  const isNIE = /^[XYZ]\d{7}[A-Z]$/.test(dni);
  if (!isDNI && !isNIE) return false;

  // Obtiene número sin la letra final
  let num = dni.slice(0, -1);
  const letter = dni.slice(-1);

  // Para NIE, sustituye la inicial X/Y/Z por 0/1/2
  if (/^[XYZ]/.test(num)) {
    const map = { X: "0", Y: "1", Z: "2" };
    num = map[num[0]] + num.slice(1);
  }

  const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
  const expected = letters[parseInt(num, 10) % 23];
  return expected === letter;
}

export default function Principal_Perfil() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [dniError, setDniError] = useState("");

  // Campos de perfil
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [dni, setDni] = useState("");
  const [rol, setRol] = useState(""); // "medico" | "enfermeria" | "farmacia"
  const [unidad, setUnidad] = useState(""); // Farmacia | UCI | Urgencias
  const [areasInteres, setAreasInteres] = useState([]); // array de strings
  const [categorias, setCategorias] = useState([]); // categories desde Supabase
  const [statusInfo, setStatusInfo] = useState({
    approved: false,
    approvedAt: null,
    verified: false,
    verifiedAt: null,
    notified: false,
    notifiedAt: null,
  });

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        console.error("[Perfil] getSession error:", error);
        setErrorMsg(error.message || "Error obteniendo sesión");
      }
      const sess = data?.session ?? null;
      setSession(sess);
      if (!sess) {
        setLoading(false);
        navigate("/", { replace: true });
        return;
      }

      // Cargar perfil desde 'profiles' con fallback si falta areas_interes
      let prof = null;
      let pErr = null;
      {
        const res = await supabase
          .from("profiles")
          .select("id, nombre, apellidos, dni, rol, unidad, areas_interes, approved, approved_at, verified_at, notified_at")
          .eq("id", sess.user.id)
          .maybeSingle();
        prof = res.data ?? null;
        pErr = res.error ?? null;

        // Si la columna no existe (42703), reintenta sin areas_interes
        if (pErr?.code === "42703" || (pErr?.message || "").toLowerCase().includes("areas_interes")) {
          console.warn("[Perfil] 'areas_interes' no existe aún. Reintentando sin esa columna.");
          const res2 = await supabase
            .from("profiles")
            .select("id, nombre, apellidos, dni, rol, unidad, approved, approved_at, verified_at, notified_at")
            .eq("id", sess.user.id)
            .maybeSingle();
          prof = res2.data ?? null;
          pErr = res2.error ?? null;
        }
      }

      if (pErr) {
        console.warn("[Perfil] profiles select error:", pErr);
      }

      const meta = sess.user?.user_metadata || {};

      setNombre(prof?.nombre ?? meta.nombre ?? "");
      setApellidos(prof?.apellidos ?? meta.apellidos ?? "");
      setEmail(sess.user?.email ?? "");
      setDni(prof?.dni ?? "");
      setDniError("");
      const newRol = (prof?.rol ?? meta.rol ?? "").toString().toLowerCase();
      setRol(newRol);
      setUnidad((prof?.unidad ?? "").toString());

      // Normaliza areas_interes (jsonb o TEXT con JSON)
      const rawAI = prof?.areas_interes;
      const ai = safeParseJSON(rawAI) || [];
      setAreasInteres(Array.isArray(ai) ? ai : []);

      const approvedAt = prof?.approved_at ?? null;
      const verifiedAt = prof?.verified_at ?? sess?.user?.email_confirmed_at ?? meta.email_verified_at ?? null;
      const notifiedAt = prof?.notified_at ?? null;
      setStatusInfo({
        approved: Boolean(prof?.approved),
        approvedAt,
        verified: Boolean(verifiedAt),
        verifiedAt,
        notified: Boolean(notifiedAt),
        notifiedAt,
      });

      // ⤵️ Backfill: si faltan campos clave en profiles, persistir desde user_metadata
      try {
        if (prof && sess?.user?.id) {
          const patch = {};

          // DNI desde metadata si falta en profiles
          if (!prof.dni && meta.dni) {
            patch.dni = normalizarDNI(meta.dni);
          }

          // Rol: normalizar variaciones de UI a valores del modelo
          if (!prof.rol && meta.rol) {
            const raw = String(meta.rol || "").toLowerCase();
            const roleMap = {
              pediatra: "medico",
              medico: "medico",
              enfermera: "enfermeria",
              enfermeria: "enfermeria",
              farmaceutico: "farmacia",
              farmacia: "farmacia",
            };
            const mapped = roleMap[raw] || null;
            if (mapped) patch.rol = mapped;
          }

          // Unidad
          if (!prof.unidad && meta.unidad) {
            patch.unidad = String(meta.unidad);
          }

          // Áreas de interés (si en profiles está vacío y en meta hay valores)
          if (
            (prof.areas_interes == null ||
              (Array.isArray(prof.areas_interes) && prof.areas_interes.length === 0)) &&
            Array.isArray(meta.areas_interes) &&
            meta.areas_interes.length
          ) {
            patch.areas_interes = meta.areas_interes;
          }

          if (Object.keys(patch).length > 0) {
            patch.updated_at = new Date().toISOString();
            await supabase.from("profiles").update(patch).eq("id", sess.user.id);
          }
        }
      } catch (e) {
        console.warn("[Perfil] backfill metadata→profiles omitido:", e);
      }

      // Cargar categorías dinámicamente desde public.categories
      const { data: cats, error: cErr } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
      if (cErr) {
        console.error("[Perfil] error cargando categorías:", cErr);
        setCategorias([]);
      } else {
        setCategorias(cats || []);
      }

      setLoading(false);
    }

    init();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleGuardar(e) {
    e.preventDefault();
    if (!session?.user?.id) return;

    setSaving(true);
    setErrorMsg("");
    setOkMsg("");
    setDniError("");

    // Si el email cambió, intentamos actualizarlo en auth
    const currentEmail = session?.user?.email ?? "";
    if (email && email !== currentEmail) {
      const { error: emailErr } = await supabase.auth.updateUser({ email });
      if (emailErr) {
        setSaving(false);
        setErrorMsg("No se pudo actualizar el email: " + (emailErr.message || ""));
        return;
      }
    }
    // Validaciones
    const dniNorm = normalizarDNI(dni);
    if (!dniNorm) {
      setDniError("El DNI es obligatorio.");
      setSaving(false);
      return;
    }
    if (!validarDNI(dniNorm)) {
      setDniError("El DNI no tiene un formato válido (ej.: 12345678Z o X1234567L).");
      setSaving(false);
      return;
    }

    if (!nombre.trim()) {
      setErrorMsg("El nombre es obligatorio.");
      setSaving(false);
      return;
    }
    if (!rol) {
      setErrorMsg("Selecciona tu rol.");
      setSaving(false);
      return;
    }
    if (!unidad) {
      setErrorMsg("Selecciona tu unidad.");
      setSaving(false);
      return;
    }

    // Payload SOLO con campos editables (sin id)
    const payload = {
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      dni: dniNorm,
      rol,                 // 'medico' | 'enfermeria' | 'farmacia'
      unidad,              // Farmacia | UCI | Urgencias
      // Guardamos como jsonb array
      areas_interes: Array.isArray(areasInteres) ? areasInteres : [],
      updated_at: new Date().toISOString(),
    };

    // Log para depuración de tipos enviados y payload
    console.log("[Perfil] payload enviado:", payload);

    // UPDATE en vez de UPSERT para no chocar con RLS de INSERT
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", session.user.id)
      .select()
      .single();

    setSaving(false);
    if (error) {
      console.error("[Perfil] update error:", error);
      setOkMsg("");
      // Mensajes más claros según constraint o columna
      const code = error.code || "";
      const msg = (error.message || "").toLowerCase();

      // Detectores por constraint/campo
      const isDniCheck = msg.includes("profiles_dni_check");
      const isDniUnique = msg.includes("profiles_dni_unique");
      const isAreasCheck = msg.includes("areas_interes_valid") || msg.includes("areas_interes");
      const isRolCheck = msg.includes("profiles_rol_check");
      const isUnidadCheck = msg.includes("profiles_unidad_check");

      // Log crudo para depuración
      console.error("[Perfil] update failed raw:", error);

      if (code === "23514") {
        if (isDniCheck) {
          setDniError("El DNI no cumple el formato requerido por el sistema.");
        } else if (isAreasCheck) {
          setErrorMsg("Formato de 'Áreas de interés' no válido. Vuelve a seleccionar las áreas e inténtalo de nuevo.");
        } else if (isRolCheck) {
          setErrorMsg("Rol inválido. Selecciona un rol permitido.");
        } else if (isUnidadCheck) {
          setErrorMsg("Unidad inválida. Selecciona una unidad permitida.");
        } else {
          setErrorMsg("Hay un dato que no cumple las reglas del sistema. Revisa los campos e inténtalo de nuevo.");
        }
      } else if (code === "23505" && isDniUnique) {
        setDniError("Este DNI ya está registrado en otro perfil.");
      } else if (code === "42703" || msg.includes("column")) {
        setErrorMsg("Falta alguna columna en la tabla de perfiles o el tipo no coincide. Revisa el esquema (areas_interes, rol, unidad…).");
      } else {
        setErrorMsg(error.message || "Hubo un error al guardar los datos. Inténtalo de nuevo.");
      }
      return;
    }

    setErrorMsg("");
    setOkMsg("Guardado correctamente ✔");
    setTimeout(() => navigate("/dashboard"), 600);
  }

  function toggleArea(area) {
    setAreasInteres((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando perfil…</div>
      </div>
    );
  }

  if (!session) return null;

  const heroStats = [
    {
      key: "estado",
      label: "Estado",
      value: statusInfo.approved ? "Aprobado" : "Pendiente",
      helper: statusInfo.approvedAt ? `Desde ${formatDateShort(statusInfo.approvedAt)}` : "Esperando revisión",
    },
    {
      key: "verificacion",
      label: "Verificación",
      value: statusInfo.verified ? "Email verificado" : "Sin verificar",
      helper: statusInfo.verifiedAt ? `Verificado ${formatDateShort(statusInfo.verifiedAt)}` : "Confirma tu email si aún no lo hiciste",
    },
    {
      key: "rol",
      label: "Rol profesional",
      value: formatRoleLabel(rol),
      helper: unidad ? `Unidad: ${unidad}` : "Selecciona tu unidad",
    },
  ];

  const heroClasses = {
    grid: "grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm",
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar isPrivate />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-5xl mx-auto px-5 py-12 text-white relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-white/70 text-sm uppercase tracking-wide">Perfil profesional</p>
              <h1 className="text-3xl md:text-4xl font-semibold">Hola, {nombre || session.user?.email}</h1>
              <p className="opacity-95 max-w-2xl text-lg">
                Completa tu información para personalizar escenarios, checklist y notificaciones.
              </p>
            </div>
            <div className={heroClasses.grid}>
              {heroStats.map((item) => (
                <HeroStat key={item.key} icon={null} label={item.label} value={item.value} helper={item.helper} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {(errorMsg || okMsg) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              errorMsg
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            {errorMsg || okMsg}
          </div>
        )}

        <form
          onSubmit={handleGuardar}
          className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.35)] px-6 py-7 space-y-8"
        >
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Datos personales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-slate-700">Nombre</span>
                <input
                  id="campo-nombre"
                  type="text"
                  autoComplete="given-name"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre"
              />
              </label>

              <label className="block">
                <span className="text-sm text-slate-700">Apellidos</span>
                <input
                  id="campo-apellidos"
                  type="text"
                  autoComplete="family-name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Apellidos"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-slate-700">Email</span>
                <input
                  id="campo-email"
                  type="email"
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
                <p className="text-xs text-slate-500 mt-1">
                  Al cambiar el email puede requerirse verificación por correo.
                </p>
              </label>

              <label className="block">
                <span className="text-sm text-slate-700">DNI</span>
                <input
                  id="campo-dni"
                  type="text"
                  autoComplete="off"
                  inputMode="text"
                  maxLength={10}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                  value={dni}
                  onChange={(e) => {
                    setDni(e.target.value.toUpperCase());
                    if (dniError) setDniError("");
                  }}
                  placeholder="12345678A"
                />
                {dniError && (
                  <p className="text-xs text-red-600 mt-1">{dniError}</p>
                )}
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Rol y unidad</h2>
            <div>
              <span className="block text-sm text-slate-700 mb-2">Rol</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "medico", label: "Médico" },
                  { value: "enfermeria", label: "Enfermería" },
                  { value: "farmacia", label: "Farmacia" },
                ].map((r) => {
                const active = rol === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    id={`rol-${r.value}`}
                    onClick={() => setRol(r.value)}
                    className={`px-4 py-2 rounded-lg border transition ${
                      active
                        ? "border-transparent text-white"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                    style={active ? { backgroundColor: COLORS.primary } : {}}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            </div>

            <div>
              <span className="block text-sm text-slate-700 mb-2">Unidad</span>
              <div className="flex flex-wrap gap-3">
              {UNIDADES.map((u) => (
                <label
                  key={u}
                  htmlFor={`unidad-${u}`}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                    unidad === u
                      ? "border-transparent text-white"
                      : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                  }`}
                  style={unidad === u ? { backgroundColor: COLORS.primary } : {}}
                >
                  <input
                    id={`unidad-${u}`}
                    type="radio"
                    name="unidad"
                    value={u}
                    checked={unidad === u}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="sr-only"
                  />
                  <span>{u}</span>
                </label>
              ))}
            </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Áreas de interés</h2>
              <span className="text-xs text-slate-500">Selecciona las que mejor describan tu práctica habitual</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {categorias.map((cat) => {
                const checked = areasInteres.includes(cat.name);
                return (
                  <label
                    key={cat.id}
                    htmlFor={`area-${cat.id}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                      checked
                        ? "border-transparent text-white"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                    style={checked ? { backgroundColor: COLORS.primary } : {}}
                  >
                    <input
                      id={`area-${cat.id}`}
                      type="checkbox"
                      value={cat.name}
                      checked={checked}
                      onChange={() => toggleArea(cat.name)}
                      className="sr-only"
                    />
                    <span className="text-sm">{cat.name}</span>
                  </label>
                );
              })}
              {categorias.length === 0 && (
                <div className="text-slate-500 text-sm col-span-full">
                  No hay categorías disponibles.
                </div>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-white disabled:opacity-70"
              style={{ backgroundColor: COLORS.primary }}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
