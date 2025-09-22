import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Navbar from "./components/Navbar.jsx"

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

  async function handleLogin(e) {
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
  }

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
    setMountedUI(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <style>{`
        .reveal { opacity: 0; transform: translateY(8px); transition: opacity .6s ease, transform .6s ease; }
        .reveal-in { opacity: 1; transform: none; }
        .float-blob { animation: floaty 10s ease-in-out infinite; }
        @keyframes floaty { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(10px) } }
      `}</style>
      {/* NAVBAR */}
      <Navbar />
      <div className="h-8 bg-white"></div>
    
      {/* HERO */}
      <section
        id="inicio"
        className="w-full overflow-visible md:overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
        }}
      >
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-16 sm:py-20 grid gap-10 md:gap-12 xl:gap-16 md:grid-cols-[1.2fr_0.8fr] items-center">
          {/* Marca de agua: logo en blanco para hero */}
          <img
            src="/logo-negative.png"
            alt=""
            aria-hidden
            className="
        hidden xl:block
        absolute
        top-14 xl:top-20 2xl:top-24
        -left-[8.6rem] xl:-left-[110.6em] 2xl:-left-[12.6rem]
        w-[20.4vw] xl:w-[18.7vw] 2xl:w-[17vw]
        max-w-none h-auto
        opacity-15 select-none pointer-events-none z-0
      "
            style={{ filter: 'none' }}
          />
          {/* Decorative background accents */}
          <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-20 float-blob z-0"
               style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.7), rgba(255,255,255,0))' }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-20 float-blob z-0"
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
            <div className="mt-6 flex gap-3 flex-wrap">
              <a
                href="#que-es"
                className="px-4 py-2 rounded-lg font-semibold text-slate-900 transition hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                style={{ background: colors.primaryLight }}
              >
                Cómo funciona
              </a>
              <a
                href="#login"
                className="px-4 py-2 rounded-lg border border-white/80 text-white hover:bg-white/10 transition hover:translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                Entrar
              </a>
            </div>
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

      {/* ¿QUÉ ES? */}
      <section id="que-es" className="bg-white">
        <Reveal>
          <div className="max-w-6xl mx-auto px-5 py-12 text-center">
            <h3 className="text-3xl font-bold mb-6 text-slate-900">¿Qué es SimuPed?</h3>
            <p className="text-lg text-slate-700 max-w-3xl mx-auto leading-relaxed">
              <strong>SimuPed</strong> es una plataforma de simulación clínica pediátrica que permite entrenar decisiones críticas —online y presencial— mediante escenarios interactivos. Nace en el HUCA y reúne a profesionales de UCI pediátrica, enfermería y farmacia hospitalaria con un objetivo claro: <strong>mejorar la seguridad del paciente pediátrico</strong> y la coordinación del equipo.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ¿QUÉ OFRECE? */}
      <section id="que-ofrece" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-3xl font-bold mb-10 text-center text-slate-900">¿Qué ofrece SimuPed?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Reveal>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D9120] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/60 border border-white/70 shadow-inner grid place-content-center mb-4 text-[#0A3D91]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v8A1.5 1.5 0 0 1 19.5 15h-15A1.5 1.5 0 0 1 3 13.5v-8Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20h6m-9-5h12" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold mb-2">Plataforma online (En desarrollo)</h4>
                  <p className="text-slate-600">Escenarios guiados con casos pediátricos paso a paso, preguntas interactivas y explicaciones detalladas.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D9120] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/60 border border-white/70 shadow-inner grid place-content-center mb-4 text-[#1E6ACB]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-6" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold mb-2">Evaluación del desempeño</h4>
                  <p className="text-slate-600">Métricas por escenario con fortalezas y áreas de mejora personalizadas para orientar la formación.</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D9120] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-white to-white/60 border border-white/70 shadow-inner grid place-content-center mb-4 text-[#0A3D91]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 14a4 4 0 1 1 5 3.87V19a2 2 0 0 1-2 2h-3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14a4 4 0 1 0-5 3.87V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.13A4 4 0 0 0 9 14Z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-semibold mb-2">Simulación presencial (próximamente)</h4>
                  <p className="text-slate-600">Simulación colaborativa entre médicos, enfermería y farmacia hospitalaria en UCI pediátrica.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* PROYECTO */}
      <section id="proyecto" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-3xl font-bold mb-6 text-slate-900 text-center">Proyecto</h3>
          <Reveal>
            <p className="text-lg text-slate-700 leading-relaxed max-w-5xl mx-auto text-center">
              <strong>SimuPed</strong> nace en el Hospital Universitario Central de Asturias con un objetivo principal:
              <strong> entrenar a los profesionales sanitarios para responder con rapidez y precisión en situaciones clínicas críticas,</strong>
              donde no hay margen de error ni de demora. Como objetivo transversal, la plataforma impulsa el
              <strong> uso seguro del medicamento</strong> (prescripción, validación y administración) a lo largo de los escenarios.
            </p>
          </Reveal>

          <Reveal>
            <p className="text-base text-slate-700 leading-relaxed max-w-3xl mx-auto text-center mt-4">
              Este trabajo ha sido reconocido con el <strong>Primer Premio en la 5ª edición del PharmaChallenge</strong>, organizado por Bayer, lo que avala su carácter innovador y su impacto en la práctica clínica.
            </p>
          </Reveal>

          {/* Dos líneas del proyecto */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Reveal>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D911A] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <h4 className="text-xl font-semibold mb-2 text-slate-900">Plataforma online</h4>
                  <p className="text-slate-700">
                    Escenarios interactivos con <strong>variantes por rol</strong> (médico, enfermería, farmacia) que plantean decisiones
                    paso a paso, con preguntas, feedback inmediato y métricas de desempeño.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D911A] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <h4 className="text-xl font-semibold mb-2 text-slate-900">Simulación presencial asistida</h4>
                  <p className="text-slate-700">
                    Entrenamiento en entorno real <strong>asistido por la herramienta SimuPed</strong> y un instructor, con checklist,
                    cronometraje y <em>debriefing</em> estructurado para consolidar aprendizajes y trabajo coordinado.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Etiquetas del proyecto */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 opacity-90">
            <span className="text-sm px-3 py-1 rounded border bg-slate-100 border-slate-200">HUCA — UGC Farmacia & UCI Pediátrica</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.primary + '14', borderColor: colors.primary }}>Pediatría</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.primaryLight + '22', borderColor: colors.primaryLight }}>Enfermería</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.primaryLight + '22', borderColor: colors.primaryLight }}>Farmacia hospitalaria</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.primary + '14', borderColor: colors.primary }}>UCI Pediátrica</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.muted, borderColor: '#E2E8F0' }}>Simulación clínica</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.muted, borderColor: '#E2E8F0' }}>Seguridad del paciente</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.primaryLight + '22', borderColor: colors.primaryLight }}>Uso seguro del medicamento</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.muted, borderColor: '#E2E8F0' }}>Medicamentos de alto riesgo</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.primary + '14', borderColor: colors.primary }}>Prescripción</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.primaryLight + '22', borderColor: colors.primaryLight }}>Administración de medicamentos</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.muted, borderColor: '#E2E8F0' }}>Validación farmacéutica</span>
          </div>
        </div>
      </section>
  {/* EQUIPO */}
      <section id="equipo" className="bg-white">
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
          {(() => {
            const miembros = [
              { foto: "/equipo/ivan-maray.jpg",   nombre: "Iván Maray",         rol: "Facultativo UGC Farmacia HUCA" },
              { foto: "/equipo/andres-concha.jpg",nombre: "Andrés Concha",      rol: "Jefe UCI Pediátrica HUCA" },
              { foto: "/equipo/laina-oyague.jpg", nombre: "Laina Oyague",        rol: "Residente UGC Farmacia HUCA" },
              { foto: "/equipo/mateo-eiroa.jpg",  nombre: "Mateo Eiroa",         rol: "Residente UGC Farmacia HUCA" },
              { foto: "/equipo/ana-vivanco.jpg",  nombre: "Ana Vivanco",         rol: "Facultativo UCI Pediátrica HUCA" },
              { foto: "/equipo/sara-ovalle.jpg",  nombre: "Sara Ovalle",         rol: "Residente UCI Pediátrica HUCA" },
              { foto: "/equipo/susana-perez.jpg", nombre: "Susana Pérez",        rol: "Supervisora UCI Pediátrica HUCA" },
              { foto: "/equipo/ana-lozano.jpg",   nombre: "Ana Lozano",          rol: "Directora UGC Farmacia HUCA" },
            ];
            return (
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
            );
          })()}
        </div>
      </section>

      {/* APOYOS */}
      <section id="apoyos" className="bg-white">
        <div className="max-w-6xl mx-auto
         px-5 py-10">
          <h3 className="text-3xl font-bold mb-6 text-center text-slate-900">Apoyos y colaboración</h3>
          <Reveal>
            <p className="text-center text-slate-600 mb-6">Proyecto desarrollado en el HUCA con la participación de UGC Farmacia y UCI Pediátrica, apoyo institucional del SESPA y el Principado de Asturias y fondos del premio Pharmachallange 5.0 otorgado por Bayer.</p>
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
      <section id="como-participar" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-3xl font-bold mb-10 text-center text-slate-900">¿Cómo participar?</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profesionales */}
            <Reveal>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D911A] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <h4 className="text-xl font-semibold mb-2 text-slate-900">Profesionales adjuntos (medicina, enfermería, farmacia)</h4>
                  <p className="text-slate-600 mb-4">
                    Puedes solicitar acceso individual para entrenar en la plataforma online y participar en sesiones presenciales.
                    La aprobación la realiza el equipo administrador de SimuPed.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a href="/registro" className="px-4 py-2 rounded-lg font-semibold text-slate-900 shadow-sm hover:shadow" style={{ background: colors.teal }}>
                      Solicitar acceso
                    </a>
                    <a href="#que-ofrece" className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white/60 transition">
                      Qué incluye
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D911A] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <h4 className="text-xl font-semibold mb-2 text-slate-900">Residentes y estudiantes</h4>
                  <p className="text-slate-600 mb-4">
                    El alta se tramita a través de tu centro/tutor. Si ya tienes invitación, entra con tus credenciales.
                    Si aún no la tienes, solicítala a tu responsable o escríbenos.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a href="#login" className="px-4 py-2 rounded-lg font-semibold text-slate-900 shadow-sm hover:shadow" style={{ background: colors.cyan }}>
                      Tengo invitación
                    </a>
                    <a href="mailto:contacto@simuped.com?subject=Alta%20SimuPed%20(Residentes/Estudiantes)" className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white/60 transition">
                      Pedir invitación
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="group relative h-full">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/45 via-[#4FA3E333] to-[#0A3D911A] opacity-0 group-hover:opacity-100 transition duration-500 blur-md" />
                <div className="relative h-full p-6 rounded-3xl border border-white/80 bg-white/95 backdrop-blur shadow-sm group-hover:shadow-xl transition-all duration-500 ease-out transform group-hover:-translate-y-1">
                  <h4 className="text-xl font-semibold mb-2 text-slate-900">Centros y unidades</h4>
                  <p className="text-slate-600 mb-4">
                    Implanta SimuPed en tu servicio (UCI pediátrica, enfermería, farmacia hospitalaria).
                    Ofrecemos demo, soporte de implantación, licencias y métricas de resultados.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <a href="mailto:contacto@simuped.com?subject=Solicitar%20demo%20SimuPed" className="px-4 py-2 rounded-lg font-semibold text-slate-900 shadow-sm hover:shadow" style={{ background: colors.apricot }}>
                      Solicitar demo
                    </a>
                    <a href="#proyecto" className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white/60 transition">
                      Ficha técnica
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
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
