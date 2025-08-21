// src/pages/Perfil.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx";

export default function Perfil() {
  const navigate = useNavigate();

  // Estado de usuario/sesión
  const [session, setSession] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Form (pre-cargable)
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [unidad, setUnidad] = useState("");
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
          .select("nombre, unidad, rol")
          .eq("id", sess.user.id)
          .maybeSingle();

        if (pErr) {
          console.warn("[Perfil] load profile warning:", pErr);
        }

        // 2) Fallback a user_metadata si falta algo
        const meta = sess.user?.user_metadata || {};
        setNombreCompleto(p?.nombre ?? meta.nombre ?? "");
        setUnidad(p?.unidad ?? "");
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

      // Guardar en profiles
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert([
          {
            id: user.id,
            nombre: nombreCompleto?.trim() || null,
            unidad: unidad?.trim() || null,
            rol: rol || null,
          }
        ], { onConflict: "id" });

      if (upsertError) {
        setError("Hubo un error al guardar los datos: " + (upsertError.message || upsertError.details || ""));
        setLoading(false);
        return;
      }

      // Sincronizar a user_metadata para chips del Dashboard
      const { error: mErr } = await supabase.auth.updateUser({
        data: { nombre: nombreCompleto || undefined, rol: rol || undefined }
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

      <div className="max-w-xl mx-auto px-5 py-8">
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
          Actualiza tu información y elige tu rol.
        </p>

        <div className="bg-white shadow-md rounded-lg p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Nombre completo"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
              required
            />
            <input
              type="text"
              placeholder="Unidad"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
              required
            />
            <div>
              <label className="block mb-1 text-gray-700">Selecciona tu rol:</label>
              <div className="flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleRol("médico")}
                  className={`flex-1 py-2 rounded ${rol === "médico" ? "bg-[#1a69b8] text-white" : "bg-gray-200 text-gray-700"} font-semibold`}
                >
                  Médico
                </button>
                <button
                  type="button"
                  onClick={() => handleRol("farmacéutico")}
                  className={`flex-1 py-2 rounded ${rol === "farmacéutico" ? "bg-[#1a69b8] text-white" : "bg-gray-200 text-gray-700"} font-semibold`}
                >
                  Farmacéutico
                </button>
                <button
                  type="button"
                  onClick={() => handleRol("enfermera")}
                  className={`flex-1 py-2 rounded ${rol === "enfermera" ? "bg-[#1a69b8] text-white" : "bg-gray-200 text-gray-700"} font-semibold`}
                >
                  Enfermera
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#1a69b8] text-white py-2 rounded hover:bg-[#165898] disabled:opacity-50"
              disabled={loading || !rol}
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>

            {guardado && (
              <div className="text-green-700 text-center font-semibold mt-2">
                Guardado correctamente ✔
              </div>
            )}
            {error && (
              <div className="text-red-600 text-center font-semibold mt-2">
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}