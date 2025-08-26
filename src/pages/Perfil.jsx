// src/pages/Perfil.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

const COLORS = {
  primary: "#1a69b8",
};


const UNIDADES = ["Farmacia", "UCI", "Urgencias"];

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
function safeStringifyJSON(value) {
  try {
    return JSON.stringify(value ?? []);
  } catch {
    return "[]";
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


export default function Perfil() {
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
  // Nuevo: flag para saber si areas_interes es jsonb
  const [isAreasJsonb, setIsAreasJsonb] = useState(false);

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
          .select("id, nombre, apellidos, dni, rol, unidad, areas_interes")
          .eq("id", sess.user.id)
          .maybeSingle();
        prof = res.data ?? null;
        pErr = res.error ?? null;

        // Si la columna no existe (42703), reintenta sin areas_interes
        if (pErr?.code === "42703" || (pErr?.message || "").toLowerCase().includes("areas_interes")) {
          console.warn("[Perfil] 'areas_interes' no existe aún. Reintentando sin esa columna.");
          const res2 = await supabase
            .from("profiles")
            .select("id, nombre, apellidos, dni, rol, unidad")
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
      setRol((prof?.rol ?? meta.rol ?? "").toString().toLowerCase());
      setUnidad((prof?.unidad ?? "").toString());

      // Normaliza areas_interes (jsonb o TEXT con JSON)
      const rawAI = prof?.areas_interes;
      const looksJsonb = rawAI && typeof rawAI === "object";
      setIsAreasJsonb(!!looksJsonb);
      const ai = safeParseJSON(rawAI) || [];
      setAreasInteres(Array.isArray(ai) ? ai : []);

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

    const payload = {
      id: session.user.id, // PK coincide con auth.users.id
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      dni: dniNorm,
      rol,                 // texto en minúsculas (medico|enfermeria|farmacia)
      unidad,              // Farmacia|UCI|Urgencias
      // Guardamos como array si es jsonb, si no como string JSON
      areas_interes: isAreasJsonb
        ? (Array.isArray(areasInteres) ? areasInteres : [])
        : safeStringifyJSON(Array.isArray(areasInteres) ? areasInteres : []),
      updated_at: new Date().toISOString(),
    };

    // Log para depuración de tipos enviados
    console.log("[Perfil] upsert payload types:", {
      rol: [payload.rol, typeof payload.rol],
      unidad: [payload.unidad, typeof payload.unidad],
      areas_interes: [payload.areas_interes, typeof payload.areas_interes],
    });

    const { error } = await supabase.from("profiles").upsert(payload);

    setSaving(false);
    if (error) {
      console.error("[Perfil] upsert error:", error);
      setOkMsg("");
      // Mensajes más claros según constraint o columna
      const code = error.code || "";
      const msg = (error.message || "").toLowerCase();
      // PG error 23514: check violation
      if (
        code === "23514" ||
        msg.includes("profiles_dni_check") ||
        msg.includes("dni")
      ) {
        setDniError("El DNI no cumple el formato requerido por el sistema.");
      } else if (
        msg.includes("profiles_rol_check") ||
        msg.includes("rol")
      ) {
        setErrorMsg("Rol inválido. Selecciona un rol permitido.");
      } else if (
        msg.includes("profiles_unidad_check") ||
        msg.includes("unidad")
      ) {
        setErrorMsg("Unidad inválida. Selecciona una unidad permitida.");
      } else if (code === "42703" || msg.includes("column")) {
        setErrorMsg("Falta alguna columna en la tabla de perfiles o el tipo no coincide. Revisa el esquema (areas_interes, rol, unidad…).");
      } else {
        setErrorMsg("Hubo un error al guardar los datos. Inténtalo de nuevo.");
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar isPrivate />

      <main className="max-w-5xl mx-auto px-5 py-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Mi perfil</h1>
          <p className="text-slate-600 mt-1">
            Gestiona tus datos personales y preferencias.
          </p>
        </header>

        {(errorMsg || okMsg) && (
          <div
            className={`mb-4 rounded-lg border px-4 py-2 text-sm ${
              errorMsg
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            {errorMsg || okMsg}
          </div>
        )}

        <form
          onSubmit={handleGuardar}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
        >
          {/* Nombre y Apellidos */}
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

          {/* Rol (botones) */}
          <div>
            <span className="block text-sm text-slate-700 mb-2">Rol</span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "medico", label: "Médico" },
                { value: "enfermera", label: "Enfermera" },
                { value: "farmaceutico", label: "Farmacéutico" },
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

          {/* Unidad (radio) */}
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

          {/* Áreas de interés (checkboxes) */}
          <div>
            <span className="block text-sm text-slate-700 mb-2">
              Áreas de interés
            </span>
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
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3">
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