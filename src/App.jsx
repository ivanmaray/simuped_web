import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
  const [mountedUI, setMountedUI] = useState(false)
  const [heroVideo, setHeroVideo] = useState('/videohero1.gif')

  const miembros = useMemo(() => [
    { foto: "/equipo/ivan-maray.jpg",   nombre: "Iván Maray",         rol: "Facultativo UGC Farmacia HUCA" },
    { foto: "/equipo/andres-concha.jpg",nombre: "Andrés Concha",      rol: "Jefe UCI Pediátrica HUCA" },
    { foto: "/equipo/laina-oyague.jpg", nombre: "Laina Oyague",        rol: "Residente UGC Farmacia HUCA" },
    { foto: "/equipo/mateo-eiroa.jpg",  nombre: "Mateo Eiroa",         rol: "Residente UGC Farmacia HUCA" },
    { foto: "/equipo/ana-vivanco.jpg",  nombre: "Ana Vivanco",         rol: "Facultativa UCI Pediátrica HUCA" },
    { foto: "/equipo/sara-ovalle.jpg",  nombre: "Sara Ovalle",         rol: "Residente UCI Pediátrica HUCA" },
    { foto: "/equipo/susana-perez.jpg", nombre: "Susana Pérez",        rol: "Supervisora UCI Pediátrica HUCA" },
    { foto: "/equipo/ana-lozano.jpg",   nombre: "Ana Lozano",          rol: "Directora UGC Farmacia HUCA" },
  ], []);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setErrorMsg('');
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
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 justify-all">
      <style>{`
        .reveal { opacity: 0; transform: translateY(8px); transition: opacity .6s ease, transform .6s ease; }
        .reveal-in { opacity: 1; transform: none; }
        .float-blob { animation: floaty 10s ease-in-out infinite; }
        @keyframes floaty { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(10px) } }
        /* Justificar textos por defecto en áreas de contenido */
        .justify-all p,
        .justify-all .justify-text {
          text-align: justify;
          text-justify: inter-word;
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
            className={`relative z-[1] bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xl ring-1 ring-slate-900/5 md:justify-self-end w-full max-w-[24.5rem] mr-0 xl:mr-2 2xl:mr-4 transition-all duration-700 ease-out ${mountedUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          >
            <h3 className="text-xl font-semibold mb-3">Iniciar sesión</h3>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
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
              <div aria-live="assertive" className="min-h-[1.25rem]">
                {errorMsg && (
                  <div className="text-sm text-red-600" role="alert">
                    {errorMsg}
                  </div>
                )}
              </div>
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
              Galardonado con el <strong>Primer Premio PharmaChallenge 5.0</strong> (Bayer) por su innovación e impacto en seguridad del paciente pediátrico.
            </p>
          </Reveal>

          {/* Tres áreas del proyecto: Plataforma, Evaluación, Presencial */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Reveal>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D9120] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/60 border border-white/70 shadow-inner grid place-content-center mb-4 text-[#0A3D91]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v8A1.5 1.5 0 0 1 19.5 15h-15A1.5 1.5 0 0 1 3 13.5v-8Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20h6m-9-5h12" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold mb-2 text-[#0A3D91]">Plataforma online</h4>
                  <p className="text-slate-600">Entrena con <strong>casos pediátricos interactivos</strong>, guiados paso a paso y adaptados a distintos niveles de complejidad. Cada escenario combina preguntas clínicas, toma de decisiones y explicación razonada de cada respuesta.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D9120] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/60 border border-white/70 shadow-inner grid place-content-center mb-4 text-[#0A3D91]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-6" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold mb-2 text-[#0A3D91]">Evaluación del desempeño</h4>
                  <p className="text-slate-600">Recibe <strong>retroalimentación inmediata y personalizada</strong> en cada escenario: fortalezas, áreas de mejora y evolución competencial, con métricas orientadas al aprendizaje y la práctica asistencial.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D9120] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/60 border border-white/70 shadow-inner grid place-content-center mb-4 text-[#0A3D91]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      {/* Cabezas */}
                      <circle cx="8" cy="9" r="3" />
                      <circle cx="16" cy="9" r="3" />
                      {/* Hombros/bases */}
                      <path d="M4 20v-1a4 4 0 0 1 8 0v1H4z" />
                      <path d="M12 20v-1a4 4 0 0 1 8 0v1h-8z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold mb-2 text-[#0A3D91]">Simulación presencial asistida</h4>
                  <p className="text-slate-600">Participa en <strong>sesiones colaborativas de simulación clínica</strong> entre profesionales de medicina, enfermería y farmacia hospitalaria, que integran el <strong>diagnóstico, tratamiento, cuidados y gestión segura del medicamento</strong>, fortaleciendo la coordinación y comunicación en el equipo asistencial.</p>
                </div>
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
  {/* EQUIPO */}
      <section id="equipo" className="bg-white scroll-mt-28">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-3xl font-bold mb-6 text-slate-900 text-center">Equipo SimuPed</h3>
          {/* Logos institucionales (HUCA / SESPA) */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-6 opacity-90">
            <img
              src="/logos/huca.png"
              alt="HUCA"
              className="h-16 w-auto object-contain grayscale hover:grayscale-0 transition"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <img
              src="/logos/sespa.png"
              alt="SESPA"
              className="h-14 w-auto object-contain grayscale hover:grayscale-0 transition"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {miembros.map((m, idx) => (
                <Reveal delay={idx * 60} key={m.nombre}>
                  <article
                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
                  >
                    <img
                      src={m.foto}
                      alt={m.nombre}
                      className="h-16 w-16 object-cover bg-slate-200"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 leading-tight">{m.nombre}</h3>
                      <p className="text-slate-600">{m.rol}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* APOYOS */}
      <section id="apoyos" className="bg-white scroll-mt-28">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <h3 className="text-3xl font-bold mb-6 text-center text-slate-900">Apoyos y colaboración</h3>
          <Reveal>
            <p className="text-center text-slate-600 mb-6">Proyecto desarrollado en el HUCA con la participación de la UGC de Farmacia y la UCI Pediátrica, con el apoyo institucional del SESPA y del Principado de Asturias, y financiado con los fondos del premio Pharmachallenge 5.0 otorgado por Bayer.</p>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex flex-col items-center gap-4">
              {/* Fila de logos */}
              <div className="flex flex-wrap items-center justify-center gap-6 opacity-95">
                <img
                  src="/logos/huca.png"
                  alt="HUCA"
                  className="h-16 w-auto object-contain grayscale hover:grayscale-0 transition"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <img
                  src="/logos/sespa.png"
                  alt="SESPA"
                  className="h-14 w-auto object-contain grayscale hover:grayscale-0 transition"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                <img
                  src="/logos/bayer.png"
                  alt="Bayer"
                  className="h-12 w-auto object-contain grayscale hover:grayscale-0 transition"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
              {/* Badges de texto como apoyo/backup visual */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 opacity-90">
                <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">HUCA — UGC Farmacia</span>
                <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">HUCA — UCI Pediátrica</span>
                <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">SESPA</span>
                <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">Principado de Asturias</span>
                <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">Bayer (Premio Pharmachallenge v5.0)</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CÓMO PARTICIPAR */}
      <section id="como-participar" className="bg-white scroll-mt-28">
        <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-[clamp(1.8rem,3vw,2.25rem)] font-bold tracking-tight mb-10 text-center text-slate-900">
            ¿Cómo participar?
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 snap-x snap-mandatory overflow-x-auto">
            {/* Profesionales */}
            <div className="group relative h-full snap-center">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D911A] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
              <div className="relative h-full p-[1px] rounded-3xl bg-gradient-to-br from-white via-slate-200 to-white/60">
                <div className="h-full p-6 rounded-[calc(1.5rem-1px)] border border-white/80 bg-white/95 backdrop-blur shadow-sm transition-all duration-500 ease-out group-hover:shadow-xl group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/60 border border-white/70 shadow-inner grid place-content-center mb-4 text-[#0A3D91]">
                    {/* Cruz médica */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold mb-2 text-[#0A3D91]">Profesionales</h4>
                  <p className="text-slate-600 mb-4">
                    Solicita acceso individual para entrenar en la plataforma online y participar en sesiones de simulación presencial.
                  </p>
                  <a href="/registro" className="inline-block px-4 py-2 rounded-lg font-semibold text-slate-900 shadow-sm hover:shadow transition hover:-translate-y-[1px]" style={{ background: '#6ED3C2' }}>
                    Solicitar acceso
                  </a>
                </div>
              </div>
            </div>

            {/* Residentes y estudiantes */}
            <div className="group relative h-full">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D911A] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
              <div className="relative h-full p-[1px] rounded-3xl bg-gradient-to-br from-white via-slate-200 to-white/60">
                <div className="h-full p-6 rounded-[calc(1.5rem-1px)] border border-white/80 bg-white/95 backdrop-blur shadow-sm transition-all duration-500 ease-out group-hover:shadow-xl group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/60 border border-white/70 shadow-inner grid place-content-center mb-4 text-[#0A3D91]">
                    {/* Birrete */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10l9-5 9 5-9 5-9-5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 12v5a2 2 0 01-2 2H7a2 2 0 01-2-2v-5" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold mb-2 text-[#0A3D91]">Residentes y estudiantes</h4>
                  <p className="text-slate-600 mb-4">
                    Si tienes invitación, accede con tus credenciales. Si no, solicítala a tu tutor o centro.
                  </p>
                  <a href="#login" className="inline-block px-4 py-2 rounded-lg font-semibold text-slate-900 shadow-sm hover:shadow transition hover:-translate-y-[1px]" style={{ background: '#8FD6FF' }}>
                    Acceder con invitación
                  </a>
                </div>
              </div>
            </div>

            {/* Centros y unidades */}
            <div className="group relative h-full">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D911A] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
              <div className="relative h-full p-[1px] rounded-3xl bg-gradient-to-br from-white via-slate-200 to-white/60">
                <div className="h-full p-6 rounded-[calc(1.5rem-1px)] border border-white/80 bg-white/95 backdrop-blur shadow-sm transition-all duration-500 ease-out group-hover:shadow-xl group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/60 border border-white/70 shadow-inner grid place-content-center mb-4 text-[#0A3D91]">
                    {/* Edificio */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M6 21V7a2 2 0 012-2h8a2 2 0 012 2v14M9 10h2M13 10h2M9 14h2M13 14h2" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold mb-2 text-[#0A3D91]">Centros y unidades</h4>
                  <p className="text-slate-600 mb-4">
                    Implanta SimuPed en tu servicio: demo, soporte de implantación, licencias y métricas.
                  </p>
                  <a href="mailto:contacto@simuped.com?subject=Solicitar%20demo%20SimuPed" className="inline-block px-4 py-2 rounded-lg font-semibold text-slate-900 shadow-sm hover:shadow transition hover:-translate-y-[1px]" style={{ background: '#F9C891' }}>
                    Próximamente
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CTA final */}
          <div className="mt-10 text-center">
            <a
              href="mailto:contacto@simuped.com?subject=Contacto%20SimuPed"
              className="inline-block px-5 py-3 rounded-lg font-semibold text-white transition hover:-translate-y-[1px] hover:shadow"
              style={{ background: '#0A3D91' }}>
              Contactar con el equipo
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200">
        <Reveal>
          <div className="max-w-6xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-slate-500">
              © {new Date().getFullYear()} SimuPed
            </span>
            <div className="flex gap-4 items-center">
              <a
                href="mailto:contacto@simuped.com"
                className="text-[#0A3D91] hover:underline"
              >
                contacto@simuped.com
              </a>
              <Link
                to="/privacidad"
                className="text-[#0A3D91] hover:underline"
              >
                Privacidad
              </Link>
              <Link
                to="/cookies"
                className="text-[#0A3D91] hover:underline"
              >
                Cookies
              </Link>
              <a
                href="#inicio"
                className="text-[#0A3D91] hover:underline"
              >
                Volver arriba
              </a>
            </div>
          </div>
        </Reveal>
      </footer>
    </div>
  )
}
