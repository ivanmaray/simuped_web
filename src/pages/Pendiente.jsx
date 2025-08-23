// src/auth.jsx
import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleLogin() {
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Si el correo no está confirmado, mandamos a Pendiente
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed") || msg.includes("email not verified")) {
        navigate("/pendiente", { replace: true });
        return;
      }
      // Otros errores: setError y salir
      setError(error.message || "Error al iniciar sesión");
      return;
    }

    // Tras login correcto, comprobamos si está aprobado
    try {
      const userId = data?.user?.id;
      if (userId) {
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("approved")
          .eq("id", userId)
          .maybeSingle();
        if (!profErr) {
          if (prof?.approved === false) {
            navigate("/pendiente", { replace: true });
            return;
          }
        }
      }
    } catch (e) {
      // si falla la consulta, no bloqueamos, continuamos al flujo normal
      console.warn("[Auth] No se pudo comprobar 'approved':", e);
    }

    navigate("/dashboard");
  }

  return (
    <div>
      {/* UI for login form */}
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>
      {error && <p>{error}</p>}
    </div>
  );
}

// src/MainRouter.jsx
import { Routes, Route } from "react-router-dom";
import Pendiente from "./pages/Pendiente.jsx";
import Auth from "./auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
// other imports

export default function MainRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Auth />} />
      <Route path="/pendiente" element={<Pendiente />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<Dashboard />} />
      {/* other routes */}
    </Routes>
  );
}

// src/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

export default function ProtectedRoute({ children }) {
  const { user, profile } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (location.pathname !== "/pendiente" && profile?.approved === false) {
    return <Navigate to="/pendiente" replace />;
  }

  return children;
}