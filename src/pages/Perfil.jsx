// src/pages/Perfil.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

const AREAS = [
  "Simulación clínica",
  "Uso seguro del medicamento",
  "Medicamentos de alto riesgo",
  "Prescripción",
  "Validación",
  "Administración",
  "Reanimación",
  "UCI pediátrica",
];

export default function Perfil() {
  const navigate = useNavigate();

  // Estado de usuario/sesión
  const [session, setSession] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Form (pre-cargable)
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [dni, setDni] = useState("");
  const [unidad, setUnidad] = useState("");
  const [hospital, setHospital] = useState("");
  const [categoria, setCategoria] = useState(""); // Adjunto / Residente / Estudiante
  const [areas, setAreas] = useState([]); // string[]
  const [rol, setRol] = useState("");

  // UI
  const [guardado, setGuardado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cargar sesión + perfil existente
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const { data: sData, error: sErr } = await supabase.auth.getSession();
        if (sErr) console.error("[Perfil] getSession error:", sErr);
        const sess = sData?.session ?? null;
        if (!mounted) return;
        setSession(sess);

        if (!sess) {
          setCargando(false);
          navigate("/", { replace: true });
          return;
        }

        // 1) Intentar leer de profiles
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("nombre, unidad, rol, dni, hospital, categoria_profesional, areas_interes")
          .eq("id", sess.user.id)
          .maybeSingle();

        if (pErr) {
          console.warn("[Perfil] load profile warning:", pErr);
        }

        // 2) Fallback a user_metadata si falta algo
        const meta = sess.user?.user_metadata || {};
        setNombreCompleto(p?.nombre ?? meta.nombre ?? "");
        setDni(p?.dni ?? "");
        setUnidad(p?.unidad ?? "");
        setHospital(p?.hospital ?? "");
        setCategoria(p?.categoria_profesional ?? "");
        setAreas(Array.isArray(p?.areas_interes) ? p.areas_interes : []);
        setRol(p?.rol ?? meta.rol ?? "");

        setCargando(false);
      } catch (e) {
        console.error("[Perfil] init error:", e);
        setCargando(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, [navigate]);

  const handleRol = (nuevoRol) => setRol(nuevoRol);
  const toggleArea = (a) =>
    setAreas((arr) => (arr.includes(a) ? arr.filter((x) => x !== a) : [...arr, a]));

  function dniValido(valor) {
    const v = (valor || "").trim().toUpperCase();
    // Validación simple DNI/NIE (sin cálculo de letra)
    return v === "" || /^[0-9XYZ][0-9]{7}[A-Z]$/.test(v);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setGuardado(false);

    try {
      // Usuario autenticado
      const { data: { user }, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;
      if (!user) {
        setError("No se encontró usuario autenticado.");
        setLoading(false);
        return;
      }

      if (!dniValido(dni)) {
        setError("DNI/NIE no tiene un formato válido.");
        setLoading(false);
        return;
      }

      // Guardar en profiles
      const payload = {
        id: user.id,
        nombre: nombreCompleto?.trim() || null,
        unidad: unidad?.trim() || null,
        rol: rol || null,
        dni: dni?.trim().toUpperCase() || null,
        hospital: hospital?.trim() || null,
        categoria_profesional: categoria || null,
        areas_interes: areas,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert([payload], { onConflict: "id" });

      if (upsertError) {
        setError(
          "Hubo un error al guardar los datos: " +
            (upsertError.message || upsertError.details || "")
        );
        setLoading(false);
        return;
      }

      // Sincronizar a user_metadata para chips del Dashboard
      const { error: mErr } = await supabase.auth.updateUser({
        data: { nombre: nombreCompleto || undefined, rol: rol || undefined },
      });
      if (mErr) {
        console.warn("[Perfil] update metadata warning:", mErr);
      }

      setGuardado(true);
      setLoading(false);

      // Redirigir tras breve confirmación
      setTimeout(() => navigate("/dashboard", { replace: true }), 900);
    } catch (e) {
      console.error("[Perfil] save error:", e);
      setError("Error inesperado.");
      setLoading(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando perfil…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Mi Perfil</h1>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            ← Volver al panel
          </button>
        </div>

        <p className="text-gray-700 text-base mb-6">
          Actualiza tu información básica, documento de identidad y rol.
        </p>

        <div className="bg-white shadow-md rounded-lg p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Datos básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                  placeholder="Ej. Ana Pérez"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">DNI / NIE (opcional)</label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                  placeholder="12345678Z o X1234567L"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidad / Servicio</label>
                <input
                  type="text"
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                  placeholder="UCI Pediátrica / UGC Farmacia"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hospital (opcional)</label>
                <input
                  type="text"
                  value={hospital}
                  onChange={(e) => setHospital(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                  placeholder="HUCA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría profesional</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                >
                  <option value="">Selecciona…</option>
                  <option value="Adjunto">Adjunto</option>
                  <option value="Residente">Residente</option>
                  <option value="Estudiante">Estudiante</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Áreas de interés</label>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleArea(a)}
                      className={`px-3 py-1 rounded-full text-sm border transition ${
                        areas.includes(a)
                          ? "bg-[#1a69b8] text-white border-[#1a69b8]"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rol */}
            <div>
              <label className="block mb-1 text-gray-700">Selecciona tu rol</label>
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleRol("Médico")}
                  className={`flex-1 py-2 rounded ${rol === "Médico" ? "bg-[#1a69b8] text-white" : "bg-gray-200 text-gray-700"} font-semibold`}
                >
                  Médico
                </button>
                <button
                  type="button"
                  onClick={() => handleRol("Farmacia")}
                  className={`flex-1 py-2 rounded ${rol === "Farmacia" ? "bg-[#1a69b8] text-white" : "bg-gray-200 text-gray-700"} font-semibold`}
                >
                  Farmacéutico
                </button>
                <button
                  type="button"
                  onClick={() => handleRol("Enfermería")}
                  className={`flex-1 py-2 rounded ${rol === "Enfermería" ? "bg-[#1a69b8] text-white" : "bg-gray-200 text-gray-700"} font-semibold`}
                >
                  Enfermería
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || !rol}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-[#1a69b8] hover:bg-[#165898] disabled:opacity-60"
              >
                {loading ? "Guardando…" : "Guardar cambios"}
              </button>
              {guardado && <span className="text-sm text-green-700">Guardado correctamente ✔</span>}
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}