// src/pages/Registro.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

const COLORS = { primary: "#1a69b8" };
const UNIDADES = ["Farmacia", "UCI", "Urgencias"];

// Helpers DNI
function normalizarDNI(v) {
  return (v || "").toString().toUpperCase().replace(/\s|-/g, "");
}
function validarDNI(v) {
  const dni = normalizarDNI(v);
  return /^[XYZ]?\d{7,8}[A-Z]$/.test(dni);
}

export default function Registro() {
  const navigate = useNavigate();

  // Campos del formulario
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dni, setDni] = useState("");
  const [rol, setRol] = useState(""); // pediatra | enfermera | farmaceutico
  const [unidad, setUnidad] = useState(""); // Farmacia | UCI | Urgencias

  // Categorías → para áreas de interés (opcional en registro)
  const [categorias, setCategorias] = useState([]);
  const [areasInteres, setAreasInteres] = useState([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [dniError, setDniError] = useState("");
  const [catsError, setCatsError] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadCats() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("[Registro] error cargando categorías:", error);
        setCatsError(true);
        setCategorias([]);
      } else {
        setCatsError(false);
        setCategorias(data || []);
      }
    }
    loadCats();
    return () => { mounted = false; };
  }, []);

  function toggleArea(name) {
    setAreasInteres((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setOkMsg("");
    setDniError("");

    // Validaciones
    const dniNorm = normalizarDNI(dni);
    if (!nombre.trim()) return setErrorMsg("El nombre es obligatorio.");
    if (!apellidos.trim()) return setErrorMsg("Los apellidos son obligatorios.");
    if (!email.trim()) return setErrorMsg("El email es obligatorio.");
    if (!password || password.length < 6)
      return setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
    if (!rol) return setErrorMsg("Selecciona tu rol.");
    if (!unidad) return setErrorMsg("Selecciona tu unidad.");
    if (!dniNorm) {
      setDniError("El DNI es obligatorio.");
      return;
    }
    if (!validarDNI(dniNorm)) {
      setDniError("El DNI no tiene un formato válido (ej.: 12345678Z o X1234567L).");
      return;
    }

    setLoading(true);
    console.debug("[Registro] intentando signUp + upsert profiles");

    // 1) Alta en auth con metadatos básicos
    const { data: signData, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: nombre.trim(), apellidos: apellidos.trim(), rol, unidad },
        emailRedirectTo: window.location.origin, // opcional: dónde volver tras confirmar email
      },
    });

    if (signErr) {
      setLoading(false);
      const m = (signErr.message || "").toLowerCase();
      if (m.includes("user already registered")) {
        setErrorMsg("Ya existe una cuenta con ese email.");
      } else {
        setErrorMsg(signErr.message || "No se pudo crear la cuenta.");
      }
      return;
    }

    // 1.5) Verificar si hay sesión activa (si hay confirmación por email, NO la habrá)
    const { data: sessData } = await supabase.auth.getSession();
    const session = sessData?.session || null;

    if (!session) {
      // No hay sesión todavía -> no podemos escribir en 'profiles' por RLS.
      // Mostramos mensaje y vamos a "pendiente".
      setLoading(false);
      setOkMsg("Te hemos enviado un correo para confirmar tu email. Tras confirmarlo, un administrador aprobará tu acceso.");
      setTimeout(() => navigate("/pendiente"), 700);
      return;
    }

    const userId = session.user.id;

    // 2) Crear fila en profiles con approved=false
    const { error: upErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          nombre: nombre.trim(),
          apellidos: apellidos.trim(),
          dni: dniNorm,
          rol,
          unidad,
          areas_interes: Array.isArray(areasInteres) ? areasInteres : [],
          approved: false,
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    setLoading(false);

    if (upErr) {
      console.error("[Registro] upsert profiles error:", upErr);
      const code = upErr.code || "";
      const msg = (upErr.message || "").toLowerCase();

      if (code === "23505" || msg.includes("duplicate")) {
        setErrorMsg("Ya existe un perfil con datos duplicados (DNI o email).");
      } else if (code === "23514" && msg.includes("dni")) {
        setDniError("El DNI no cumple el formato requerido por el sistema.");
      } else if (code === "42501" || msg.includes("rls")) {
        setErrorMsg("No se pudo guardar tu perfil por permisos. Contacta con soporte.");
      } else {
        setErrorMsg(upErr.message || "No se pudo guardar tu perfil. Inténtalo de nuevo.");
      }
      return;
    }

    setOkMsg("Registro enviado. Tu cuenta está pendiente de aprobación.");
    // Redirige a la pantalla de pendiente
    setTimeout(() => navigate("/pendiente"), 700);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar /> {/* navbar público */}
      <main className="max-w-5xl mx-auto px-5 py-8">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Crear cuenta</h1>
          <p className="text-slate-600 mt-1">
            Regístrate para acceder a la plataforma. Tu cuenta deberá ser aprobada por un administrador.
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

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          {/* Nombre y Apellidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-700">Nombre</span>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre"
                autoComplete="given-name"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-700">Apellidos</span>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Apellidos"
                autoComplete="family-name"
              />
            </label>
          </div>

          {/* Email y Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-700">Email</span>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-700">Contraseña</span>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </label>
          </div>

          {/* DNI */}
          <label className="block">
            <span className="text-sm text-slate-700">DNI</span>
            <input
              type="text"
              inputMode="text"
              autoCorrect="off"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
              value={dni}
              onChange={(e) => {
                setDni(e.target.value.toUpperCase());
                if (dniError) setDniError("");
              }}
              placeholder="12345678A"
              autoComplete="off"
            />
            {dniError && <p className="text-xs text-red-600 mt-1">{dniError}</p>}
          </label>

          {/* Rol (botones) */}
          <div>
            <span className="block text-sm text-slate-700 mb-2">Rol</span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "pediatra", label: "Pediatra" },
                { value: "enfermera", label: "Enfermera" },
                { value: "farmaceutico", label: "Farmacéutico" },
              ].map((r) => {
                const active = rol === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
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
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                    unidad === u
                      ? "border-transparent text-white"
                      : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                  }`}
                  style={unidad === u ? { backgroundColor: COLORS.primary } : {}}
                >
                  <input
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

          {/* Áreas de interés (opcional) */}
          <div>
            <span className="block text-sm text-slate-700 mb-2">Áreas de interés (opcional)</span>
            {catsError ? (
              <div className="text-slate-500 text-sm">
                No se pudieron cargar las categorías en este momento.
              </div>
            ) : categorias.length === 0 ? (
              <div className="text-slate-500 text-sm">
                No hay categorías disponibles.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {categorias.map((cat) => {
                  const checked = areasInteres.includes(cat.name);
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                        checked
                          ? "border-transparent text-white"
                          : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                      }`}
                      style={checked ? { backgroundColor: COLORS.primary } : {}}
                    >
                      <input
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
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg text-white disabled:opacity-70"
              style={{ backgroundColor: COLORS.primary }}
            >
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>
            <Link
              to="/"
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Link>
          </div>

          <p className="text-sm text-slate-600">
            ¿Ya tienes cuenta?{" "}
            <Link to="/" className="text-[#1a69b8] underline underline-offset-2 hover:opacity-80">
              Inicia sesión
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}