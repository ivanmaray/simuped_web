import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Navbar from "./components/Navbar.jsx"

// Hero videos disponibles
const heroVideos = ['/videohero1.gif', '/videohero2.gif', '/videohero3.gif']

// Paleta SimuPed (alineada al logo)
const colors = {
  primary: '#0A3D91',      // azul corporativo del logo
  primaryLight: '#4FA3E3', // azul claro para degradados/CTAs
  accent: '#1E6ACB',       // punto medio para hover/focos
  muted: '#F3F6FA',        // fondos suaves
  teal: '#6ED3C2',         // CTA para profesionales
  cyan: '#8FD6FF',         // CTA para residentes/estudiantes
  apricot: '#F9C891'       // CTA para centros/unidades
}

// Micro-animaciones de entrada y blobs flotantes
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new window.IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        obs.disconnect();
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${visible ? 'reveal-in' : ''}`}>
      {children}
    </div>
  );
}

export default function App() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [mountedUI, setMountedUI] = useState(false)
  const [heroVideo, setHeroVideo] = useState('/videohero1.gif')

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setResetMsg('');
    setLoading(true);

    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        const notConfirmed =
          error.code === 'email_not_confirmed' ||
          msg.includes('email not confirmed') ||
          msg.includes('confirm your email') ||
          msg.includes('email no verificado') ||
          msg.includes('no verificado') ||
          msg.includes('confirma tu correo');

        if (notConfirmed) {
          try { localStorage.setItem('pending_email', email); } catch {}
          navigate('/pendiente?reason=email', { replace: true });
          return;
        }

        // Otros errores: mostrarlos en la tarjeta de login
        setErrorMsg(error.message || 'Error al iniciar sesión');
        return;
      }

      // Login correcto: ir al dashboard (ProtectedRoute validará "approved")
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleForgotPassword = useCallback(async () => {
    if (loading || resetLoading) return;
    setErrorMsg('');
    setResetMsg('');

    try {
      const form = document.getElementById('login-form');
      const emailInput = form?.elements?.namedItem?.('email');
      const email = (emailInput?.value || '').toString().trim();
      if (!email) {
        setResetMsg('Introduce tu email y te enviaremos un enlace.');
        return;
      }
      setResetLoading(true);

      // Build canonical redirect URL — always use production domain or explicit env var
      const redirectBase = (
        import.meta.env.VITE_SITE_URL?.trim() ||
        import.meta.env.VITE_APP_URL?.trim() ||
        (typeof window !== 'undefined' ? window.location.origin : 'https://www.simuped.com')
      ).replace(/\/$/, '');
      const redirectTo = `${redirectBase}/perfil?set_password=1`;

      // Intentar enviar correo bonito desde el backend (Resend).
      let backendOk = false;
      try {
        const resp = await fetch('/api/reset_password?action=send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const json = await resp.json().catch(() => ({}));
        if (resp.ok && json && json.ok === true) {
          backendOk = true;
        } else {
          console.debug('[Reset] backend response:', json);
        }
      } catch (err) {
        console.debug('[Reset] backend unavailable, using Supabase fallback:', err.message);
      }

      if (backendOk) {
        setResetMsg('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.');
        return;
      }

      // Fallback: usar email por defecto de Supabase
      console.debug('[Reset] using Supabase fallback, redirectTo:', redirectTo);
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        console.warn('[Reset] Supabase resetPasswordForEmail error:', error);
        // Don't leak whether the email exists
        setResetMsg('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.');
        return;
      }
      setResetMsg('Si el correo existe, te enviamos un enlace para restablecer tu contraseña.');
    } finally {
      setResetLoading(false);
    }
  }, [loading, resetLoading]);

useEffect(() => {
  let mounted = true;

  (async () => {
    const { data } = await supabase.auth.getSession();
    if (mounted && data?.session) {
      navigate("/dashboard", { replace: true });
    }
  })();

  const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
    if (sess) navigate("/dashboard", { replace: true });
  });

  return () => {
    mounted = false;
    try { sub?.subscription?.unsubscribe?.(); } catch {}
  };
}, [navigate]);

  useEffect(() => {
    // Generar un video aleatorio al cargar el componente
    const randomVideo = heroVideos[Math.floor(Math.random() * heroVideos.length)];
    setHeroVideo(randomVideo);

    setMountedUI(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <style>{`
        .reveal { opacity: 0; transform: translateY(8px); transition: opacity .6s ease, transform .6s ease; }
        .reveal-in { opacity: 1; transform: none; }
        .float-blob { animation: floaty 10s ease-in-out infinite; }
        @keyframes floaty { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(10px) } }
        
        /* Icon animations */
        .icon-box {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .icon-box:hover {
          transform: translateY(-4px) scale(1.08);
        }
        .icon-box svg {
          transition: all 0.3s ease;
        }
        .card-modern:hover .icon-box svg {
          filter: drop-shadow(0 4px 12px rgba(10, 61, 145, 0.25));
        }
        
        /* Card hover */
        .card-modern {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          border-left: 4px solid transparent;
        }
        .card-modern:hover {
          border-left-color: #0A3D91;
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(10, 61, 145, 0.1);
        }
        
      `}</style>
      {/* NAVBAR */}
      <Navbar variant="public" />
      <div className="h-8 bg-white"></div>
    
      {/* HERO */}
      <section
        id="inicio"
        className="relative w-full overflow-visible md:overflow-hidden scroll-mt-28"
      >
        {/* Background GIF */}
        <img
          src={heroVideo}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        {/* Overlay for contrast */}
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}BB 0%, ${colors.primaryLight}CC 100%)`
          }}
        />
        <div className="relative z-[2] max-w-6xl mx-auto px-6 lg:px-8 py-16 sm:py-20 grid gap-10 md:gap-12 xl:gap-16 md:grid-cols-[1.2fr_0.8fr] items-center min-h-[50vh]">

          {/* Decorative background accents */}
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-20 float-blob z-[1]"
               style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.7), rgba(255,255,255,0))' }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 float-blob z-[1]"
               style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.55), rgba(255,255,255,0))' }} />

          {/* Left: headline and actions */}
          <div className={`relative z-[1] text-white md:pl-10 lg:pl-16 xl:pl-28 2xl:pl-36 transition-all duration-700 ease-out ${mountedUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
              Plataforma de simulación pediátrica
            </h1>
            <p className="mt-4 text-lg/7 text-white/95">
              Entrena escenarios clínicos, protocolos y toma de decisiones con
              feedback inmediato y evaluación del desempeño.
            </p>
          </div>

          {/* Right: login card */}
          <div
            id="login"
            className={`relative z-[1] bg-white border border-slate-200 rounded-lg p-6 sm:p-7 shadow-lg md:justify-self-end w-full max-w-[24.5rem] mr-0 xl:mr-2 2xl:mr-4 transition-all duration-700 ease-out ${mountedUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          >
            <h3 className="text-2xl font-bold mb-4 text-slate-900">Acceso</h3>
            <form id="login-form" onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                name="email"
                type="email"
                required
                placeholder="Email"
                autoComplete="username"
                autoFocus
                disabled={loading}
                className="px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-[#1E6ACB] transition-shadow"
              />
              <input
                name="password"
                type="password"
                required
                placeholder="Contraseña"
                autoComplete="current-password"
                disabled={loading}
                className="px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-[#1E6ACB] transition-shadow"
              />
              <div aria-live="assertive" className="min-h-0">
                {errorMsg && (
                  <div className="text-sm text-red-600 mb-2" role="alert">
                    {errorMsg}
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-600">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || resetLoading}
                  className="underline text-[#0A3D91] hover:text-[#1E6ACB] disabled:opacity-60"
                >
                  Olvidé mi contraseña
                </button>
              </div>
              {resetMsg ? (
                <div className="text-xs text-slate-600">{resetMsg}</div>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading ? "true" : "false"}
                className="px-4 py-2 rounded-lg font-semibold text-slate-900 disabled:opacity-60 transition hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6ACB]"
                style={{ background: colors.primaryLight }}
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
              <p className="text-xs text-slate-500">
                * Los usuarios han de ser aprobados por el administrador.
              </p>
              <p className="text-sm text-slate-700">
                ¿No tienes cuenta?{" "}
                <Link to="/registro" className="text-[#0A3D91] hover:underline">
                  Solicita acceso
                </Link>
                .
              </p>
            </form>
          </div>
        </div>
      </section>


      {/* PROYECTO */}
      <section id="proyecto" className="bg-white scroll-mt-28">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-3xl font-bold mb-6 text-slate-900 text-center">El proyecto SimuPed</h3>
          <Reveal>
            <p className="text-lg text-slate-700 leading-relaxed max-w-5xl mx-auto text-center">
              <strong>SimuPed</strong> es una plataforma de <strong>simulación clínica pediátrica</strong> desarrollada en el Hospital Universitario Central de Asturias (HUCA) que combina <strong>entrenamiento online</strong> y <strong>simulación presencial</strong> para entrenar competencias técnicas y no técnicas del equipo. Integra el <strong>diagnóstico y tratamiento</strong> médicos, los <strong>cuidados y protocolos</strong> de enfermería y la <strong>gestión segura del medicamento</strong>, con participación activa del <strong>farmacéutico hospitalario</strong> (prescripción, validación y administración), reforzando la coordinación interprofesional en escenarios críticos.
            </p>
          </Reveal>

          <Reveal>
            <p className="text-base text-slate-700 leading-relaxed max-w-3xl mx-auto text-center mt-4">
              Galardonado y financiado con el <strong>Primer Premio PharmaChallenge 5.0</strong> (Bayer) por su innovación e impacto en seguridad del paciente pediátrico.
            </p>
          </Reveal>

          {/* Tres áreas del proyecto: Plataforma, Evaluación, Presencial */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Reveal>
              <div className="card-modern h-full p-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="icon-box h-12 w-12 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 grid place-content-center mb-4 text-[#0A3D91]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v8A1.5 1.5 0 0 1 19.5 15h-15A1.5 1.5 0 0 1 3 13.5v-8Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20h6m-9-5h12" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-3 text-slate-900">Plataforma online</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Entrena con <strong>casos pediátricos interactivos</strong>, guiados paso a paso y adaptados a distintos niveles de complejidad. Cada escenario combina preguntas clínicas, toma de decisiones y explicación razonada.</p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="card-modern h-full p-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="icon-box h-12 w-12 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 grid place-content-center mb-4 text-[#0A3D91]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-6" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-3 text-slate-900">Evaluación del desempeño</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Recibe <strong>retroalimentación inmediata y personalizada</strong> en cada escenario: fortalezas, áreas de mejora y evolución competencial, con métricas orientadas al aprendizaje.</p>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="card-modern h-full p-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="icon-box h-12 w-12 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 grid place-content-center mb-4 text-[#0A3D91]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="8" cy="9" r="2.5" />
                    <circle cx="16" cy="9" r="2.5" />
                    <path d="M5 20h4v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1h4" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-3 text-slate-900">Simulación presencial</h4>
                <p className="text-sm text-slate-600 leading-relaxed">Participa en <strong>sesiones colaborativas</strong> entre medicina, enfermería y farmacia, que integran diagnóstico, tratamiento, cuidados y gestión segura del medicamento.</p>
              </div>
            </Reveal>
          </div>

          {/* Etiquetas del proyecto */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 opacity-95">
            {/* Ámbito y metodología */}
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border" style={{ background: colors.primary + '12', borderColor: colors.primary, color: colors.primary }}>
              Pediatría crítica
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border" style={{ background: colors.primary + '12', borderColor: colors.primary, color: colors.primary }}>
              Atención urgente
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border" style={{ background: colors.primaryLight + '18', borderColor: colors.primaryLight, color: colors.primary }}>
              Simulación clínica
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-slate-50 border-slate-200 text-slate-700">
              Diagnóstico clínico
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-slate-50 border-slate-200 text-slate-700">
              Entrenamiento interprofesional
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-slate-50 border-slate-200 text-slate-700">
              Trabajo en equipo
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-slate-50 border-slate-200 text-slate-700">
              Comunicación clínica
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-slate-50 border-slate-200 text-slate-700">
              Protocolos
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-slate-50 border-slate-200 text-slate-700">
              Checklists
            </span>

            {/* Seguridad del paciente y medicamento */}
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border" style={{ background: colors.primary + '12', borderColor: colors.primary, color: colors.primary }}>
              Seguridad del paciente
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border" style={{ background: colors.primaryLight + '18', borderColor: colors.primaryLight, color: colors.primary }}>
              Uso seguro del medicamento
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-white/70 border-slate-200 text-slate-700">
              Medicamentos de alto riesgo
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-white/70 border-slate-200 text-slate-700">
              Validación farmacéutica
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-white/70 border-slate-200 text-slate-700">
              Prescripción
            </span>
            <span className="inline-flex items-center text-sm px-3 py-1.5 rounded-full border bg-white/70 border-slate-200 text-slate-700">
              Administración de medicamentos
            </span>
          </div>
        </div>
      </section>
      {/* CÓMO PARTICIPAR */}
      <section id="como-participar" className="bg-white scroll-mt-28">
        <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-[clamp(1.8rem,3vw,2.25rem)] font-bold tracking-tight mb-10 text-center text-slate-900">
            ¿Cómo participar?
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profesionales */}
            <Reveal>
              <div className="card-modern h-full p-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="icon-box h-12 w-12 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 grid place-content-center mb-4 text-[#0A3D91]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-3 text-slate-900">Profesionales</h4>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Solicita acceso individual para entrenar en la plataforma online y participar en sesiones de simulación presencial.
                </p>
                <a href="/registro" className="inline-block px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition" style={{ background: '#0A3D91' }}>
                  Solicitar acceso
                </a>
              </div>
            </Reveal>

            {/* Residentes y estudiantes */}
            <Reveal delay={100}>
              <div className="card-modern h-full p-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="icon-box h-12 w-12 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 grid place-content-center mb-4 text-[#0A3D91]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-5 9 5-9 5-9-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 12v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-3 text-slate-900">Residentes y estudiantes</h4>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Si tienes invitación, accede con tus credenciales. Si no, solicítala a tu tutor o centro.
                </p>
                <a href="#login" className="inline-block px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition" style={{ background: '#0A3D91' }}>
                  Acceder con invitación
                </a>
              </div>
            </Reveal>

            {/* Centros y unidades */}
            <Reveal delay={200}>
              <div className="card-modern h-full p-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="icon-box h-12 w-12 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 grid place-content-center mb-4 text-[#0A3D91]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V7a2 2 0 012-2h8a2 2 0 012 2v14M9 10h2M13 10h2M9 14h2M13 14h2" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold mb-3 text-slate-900">Centros y unidades</h4>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Implanta SimuPed en tu servicio: demo, soporte de implantación, licencias y métricas.
                </p>
                <a href="mailto:contacto@simuped.com?subject=Solicitar%20demo%20SimuPed" className="inline-block px-4 py-2 rounded-lg font-semibold text-white hover:opacity-90 transition" style={{ background: '#0A3D91' }}>
                  Próximamente
                </a>
              </div>
            </Reveal>
          </div>

          {/* CTA final - Mejorado */}
          <Reveal>
            <div className="mt-16 bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg border border-slate-200 p-8 sm:p-10 text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                ¿Listo para comenzar?
              </h3>
              <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                Solicita acceso a SimuPed y únete a profesionales de salud que ya están mejorando su desempeño clínico.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="/registro"
                  className="nav-cta px-6 py-3 rounded-lg font-semibold text-white"
                  style={{ background: '#0A3D91' }}>
                  Solicitar acceso
                </a>
                <a
                  href="mailto:contacto@simuped.com?subject=Consulta%20SimuPed"
                  className="px-6 py-3 rounded-lg font-semibold text-slate-900 border-2 border-slate-300 hover:border-slate-400 transition">
                  Contactar equipo
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <h3 className="text-lg font-bold mb-3">SimuPed</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Plataforma innovadora de simulación clínica pediátrica para el entrenamiento de profesionales de salud.
              </p>
            </div>
            
            {/* Enlaces rápidos */}
            <div>
              <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-300">Navegación</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/#proyecto" className="text-slate-400 hover:text-white transition">Proyecto</a></li>
                <li><a href="/#como-participar" className="text-slate-400 hover:text-white transition">Cómo participar</a></li>
                <li><Link to="/privacidad" className="text-slate-400 hover:text-white transition">Privacidad</Link></li>
                <li><Link to="/cookies" className="text-slate-400 hover:text-white transition">Cookies</Link></li>
              </ul>
            </div>
            
            {/* Acciones */}
            <div>
              <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-300">Acciones</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/registro" className="text-slate-400 hover:text-white transition">Solicitar acceso</Link></li>
                <li><a href="#login" className="text-slate-400 hover:text-white transition">Iniciar sesión</a></li>
                <li><a href="mailto:contacto@simuped.com" className="text-slate-400 hover:text-white transition">Contactar</a></li>
              </ul>
            </div>
            
            {/* Contacto */}
            <div>
              <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-slate-300">Contacto</h4>
              <p className="text-slate-400 text-sm">
                <a href="mailto:contacto@simuped.com" className="hover:text-white transition">
                  contacto@simuped.com
                </a>
              </p>
            </div>
          </div>
          
          {/* Divider */}
          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-400">
              © {new Date().getFullYear()} SimuPed. Todos los derechos reservados.
            </span>
            <a href="#inicio" className="text-sm text-slate-400 hover:text-white transition">
              ↑ Volver arriba
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
