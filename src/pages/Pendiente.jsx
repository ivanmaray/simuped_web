

// src/pages/Pendiente.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import Navbar from "../components/Navbar.jsx"; // si no existe, puedes quitar esta línea

export default function Pendiente() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const sess = data?.session ?? null;
      setEmail(sess?.user?.email || "");
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (e) {
      console.error("[Pendiente] signOut error", e);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-700">Cargando…</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar pública/compartida (si prefieres, elimina esta línea) */}
      <Navbar variant="public" />

      {/* Hero */}
      <section className="bg-gradient-to-r from-[#1a69b8] via-[#1d99bf] to-[#1fced1]">
        <div className="max-w-3xl mx-auto px-5 py-10 text-white">
          <h1 className="text-3xl md:text-4xl font-semibold">Cuenta pendiente de aprobación</h1>
          <p className="opacity-95 mt-2">Hemos recibido tu solicitud. Un administrador revisará tu cuenta en breve.</p>
        </div>
      </section>

      {/* Card principal */}
      <main className="max-w-3xl mx-auto px-5 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {email && (
              <p className="text-slate-700">
                Estás registrado con el correo <span className="font-medium">{email}</span>.
              </p>
            )}
            <p className="text-slate-700">
              Te enviaremos un email cuando tu acceso sea aprobado. Si necesitas acelerar el proceso o hubo algún error,
              puedes contactar con el equipo de SimuPed.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition"
              >
                Volver al inicio
              </Link>
              <a
                href="mailto:ivanmaray@gmail.com?subject=Alta%20SimuPed%20pendiente"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a69b8] text-white hover:opacity-95 transition"
              >
                Contactar
              </a>
              <button
                onClick={handleSignOut}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>

        {/* Nota informativa */}
        <p className="text-sm text-slate-500 mt-6">
          Si ya has sido aprobado, vuelve a iniciar sesión para acceder al panel.
        </p>
      </main>
    </div>
  );
}