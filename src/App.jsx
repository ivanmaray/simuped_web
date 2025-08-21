import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import logo from './assets/logo.png'
import Equipo from './components/Equipo.jsx'

// Paleta SimuPed
const colors = {
  coral: '#f6a9a3',
  apricot: '#f2c28c',
  blue: '#1a69b8',
  cyan: '#1d99bf',
  teal: '#1fced1',
}

export default function App() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    const email = e.target.email.value.trim()
    const password = e.target.password.value
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setErrorMsg(error.message)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-[rgb(26,105,184)] to-[rgb(29,153,191)] text-white shadow">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="SimuPed" className="h-18 w-18 md:h-18 md:w-18 object-contain" />
            <strong className="text-2xl tracking-wide">SimuPed</strong>
          </div>
          <nav className="hidden sm:flex gap-2">
            {[
              ['Inicio', '#inicio'],
              ['¿Qué es?', '#que-es'],
              ['Equipo', '#equipo'],
              ['Proyecto', '#proyecto'],
              ['¿Cómo participar?', '#como-participar'],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="px-3 py-1.5 rounded-md hover:bg-white/10 transition"
              >
                {label}
              </a>
            ))}
            <a
              href="#login"
              className="px-3 py-1.5 rounded-md font-semibold text-slate-900"
              style={{ background: colors.teal }}
            >
              Entrar
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section
        id="inicio"
        className="w-full"
        style={{
          background: `linear-gradient(135deg, ${colors.blue} 0%, ${colors.cyan} 100%)`,
        }}
      >
        <div className="max-w-6xl mx-auto px-5 py-14 sm:py-20 grid gap-10 md:grid-cols-[1.2fr_1fr] items-center">
          <div className="text-white">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Plataforma de simulación pediátrica
            </h1>
            <p className="mt-3 text-lg/7 text-white/95">
              Entrena escenarios clínicos, protocolos y toma de decisiones con
              feedback inmediato y evaluación del desempeño.
            </p>
            <div className="mt-6 flex gap-3 flex-wrap">
              <a
                href="#que-es"
                className="px-4 py-2 rounded-lg font-semibold text-slate-900"
                style={{ background: colors.teal }}
              >
                Cómo funciona
              </a>
              <a
                href="#login"
                className="px-4 py-2 rounded-lg border border-white/70 text-white hover:bg-white/10 transition"
              >
                Entrar
              </a>
            </div>
          </div>

          {/* LOGIN CARD */}
          <div
            id="login"
            className="bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xl"
          >
            <h3 className="text-xl font-semibold mb-3">Iniciar sesión</h3>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                name="email"
                type="email"
                required
                placeholder="Email"
                className="px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-[rgb(31,206,209)]"
              />
              <input
                name="password"
                type="password"
                required
                placeholder="Contraseña"
                className="px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-[rgb(31,206,209)]"
              />
              {errorMsg && (
                <div className="text-sm text-red-600">{errorMsg}</div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg font-semibold text-slate-900 disabled:opacity-60"
                style={{ background: colors.cyan }}
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
              <p className="text-xs text-slate-500">
                * Los usuarios los crea el administrador.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ¿QUÉ ES? */}
      <section id="que-es" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-12 text-center">
          <h3 className="text-3xl font-bold mb-6 text-slate-900">¿Qué es SimuPed?</h3>
          <p className="text-lg text-slate-700 max-w-3xl mx-auto leading-relaxed">
            <strong>SimuPed</strong> es una plataforma de simulación clínica pediátrica que permite entrenar decisiones críticas —online y presencial— mediante escenarios interactivos. Nace en el HUCA y reúne a profesionales de UCI pediátrica, enfermería y farmacia hospitalaria con un objetivo claro: <strong>mejorar la seguridad del paciente pediátrico</strong> y la coordinación del equipo.
          </p>
        </div>
      </section>

      {/* ¿QUÉ OFRECE? */}
      <section id="que-ofrece" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-3xl font-bold mb-10 text-center text-slate-900">¿Qué ofrece SimuPed?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-2xl shadow-sm hover:shadow-md transition border border-slate-200">
              <div className="h-10 w-10 rounded-lg bg-white/70 border border-slate-200 grid place-content-center mb-3 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v8A1.5 1.5 0 0 1 19.5 15h-15A1.5 1.5 0 0 1 3 13.5v-8Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20h6m-9-5h12" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">Plataforma online (En desarrollo)</h4>
              <p className="text-slate-600">Escenarios guiados con casos pediátricos paso a paso, preguntas interactivas y explicaciones detalladas.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl shadow-sm hover:shadow-md transition border border-slate-200">
              <div className="h-10 w-10 rounded-lg bg-white/70 border border-slate-200 grid place-content-center mb-3 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m0 14h16M8 17V9m4 8V7m4 10v-6" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">Evaluación del desempeño</h4>
              <p className="text-slate-600">Métricas por escenario con fortalezas y áreas de mejora personalizadas para orientar la formación.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl shadow-sm hover:shadow-md transition border border-slate-200">
              <div className="h-10 w-10 rounded-lg bg-white/70 border border-slate-200 grid place-content-center mb-3 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 14a4 4 0 1 1 5 3.87V19a2 2 0 0 1-2 2h-3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14a4 4 0 1 0-5 3.87V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.13A4 4 0 0 0 9 14Z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">Simulación presencial (próximamente)</h4>
              <p className="text-slate-600">Simulación colaborativa entre médicos, enfermería y farmacia hospitalaria en UCI pediátrica.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PROYECTO */}
      <section id="proyecto" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-3xl font-bold mb-6 text-slate-900 text-center">Proyecto</h3>

          <p className="text-lg text-slate-700 leading-relaxed max-w-5xl mx-auto text-center">
            <strong>SimuPed</strong> nace en el Hospital Universitario Central de Asturias con un objetivo principal:
            <strong> entrenar a los profesionales sanitarios para responder con rapidez y precisión en situaciones clínicas críticas,</strong>
            donde no hay margen de error ni de demora. Como objetivo transversal, la plataforma impulsa el
            <strong> uso seguro del medicamento</strong> (prescripción, validación y administración) a lo largo de los escenarios.
          </p>

          {/* Dos líneas del proyecto */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-xl font-semibold mb-2">Plataforma online</h4>
              <p className="text-slate-700">
                Escenarios interactivos con <strong>variantes por rol</strong> (médico, enfermería, farmacia) que plantean decisiones
                paso a paso, con preguntas, feedback inmediato y métricas de desempeño.
              </p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-xl font-semibold mb-2">Simulación presencial asistida</h4>
              <p className="text-slate-700">
                Entrenamiento en entorno real <strong>asistido por la herramienta SimuPed</strong> y un instructor, con checklist,
                cronometraje y <em>debriefing</em> estructurado para consolidar aprendizajes y trabajo coordinado.
              </p>
            </div>
          </div>

          {/* Etiquetas del proyecto */}
          <div className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3 opacity-90 justify-start md:justify-end">
            <span className="text-sm px-3 py-1 rounded border bg-slate-100 border-slate-200">HUCA — UGC Farmacia & UCI Pediátrica</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.blue + '14', borderColor: colors.blue }}>Pediatría</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.cyan + '14', borderColor: colors.cyan }}>Enfermería</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.teal + '14', borderColor: colors.teal }}>Farmacia hospitalaria</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.blue + '14', borderColor: colors.blue }}>UCI Pediátrica</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.apricot + '33', borderColor: colors.apricot }}>Simulación clínica</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.coral + '33', borderColor: colors.coral }}>Seguridad del paciente</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.teal + '20', borderColor: colors.teal }}>Uso seguro del medicamento</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.coral + '20', borderColor: colors.coral }}>Medicamentos de alto riesgo</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.blue + '14', borderColor: colors.blue }}>Prescripción</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.cyan + '14', borderColor: colors.cyan }}>Administración</span>
            <span className="text-sm px-3 py-1 rounded border" style={{ background: colors.apricot + '33', borderColor: colors.apricot }}>Validación</span>
          </div>
        </div>
      </section>

      {/* APOYOS */}
      <section id="apoyos" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <h3 className="text-3xl font-bold mb-6 text-center text-slate-900">Apoyos y colaboración</h3>
          <p className="text-center text-slate-600 mb-6">Proyecto desarrollado en el HUCA con la participación de UGC Farmacia y UCI Pediátrica, y apoyo institucional del SESPA y el Principado de Asturias.</p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 opacity-95">
            <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">HUCA — UGC Farmacia</span>
            <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">HUCA — UCI Pediátrica</span>
            <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">SESPA</span>
            <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">Principado de Asturias</span>
            <span className="text-sm px-3 py-1.5 rounded border bg-slate-50 border-slate-200">Bayer (fondos)</span>
          </div>
        </div>
      </section>

      {/* CÓMO PARTICIPAR */}
      <section id="como-participar" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-3xl font-bold mb-10 text-center text-slate-900">¿Cómo participar?</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profesionales */}
            <div className="p-6 bg-slate-50 rounded-2xl shadow hover:shadow-md transition">
              <h4 className="text-xl font-semibold mb-2">Médicos adjuntos, enfermería y farmacéuticos hospitalarios</h4>
              <p className="text-slate-600 mb-4">
                Profesionales adjuntos de medicina, enfermería y farmacia hospitalaria pueden solicitar acceso para
                entrenar en la plataforma online y participar en sesiones presenciales de simulación clínica.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#login" className="px-4 py-2 rounded-lg font-semibold text-slate-900" style={{ background: colors.teal }}>Solicitar acceso</a>
                <a href="#proyecto" className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white">Más info</a>
              </div>
            </div>

            {/* Residentes y estudiantes */}
            <div className="p-6 bg-slate-50 rounded-2xl shadow hover:shadow-md transition">
              <h4 className="text-xl font-semibold mb-2">Residentes y estudiantes</h4>
              <p className="text-slate-600 mb-4">
                El alta se gestiona a través de tu centro. Si ya dispones de
                invitación, accede con tus credenciales para comenzar los
                escenarios guiados y el seguimiento de desempeño.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#login" className="px-4 py-2 rounded-lg font-semibold text-slate-900" style={{ background: colors.cyan }}>Tengo invitación</a>
                <a href="#que-ofrece" className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white">Ver qué ofrece</a>
              </div>
            </div>

            {/* Centros y Unidades */}
            <div className="p-6 bg-slate-50 rounded-2xl shadow hover:shadow-md transition">
              <h4 className="text-xl font-semibold mb-2">Centros y unidades</h4>
              <p className="text-slate-600 mb-4">
                ¿Quieres implantar SimuPed en tu servicio (UCI pediátrica,
                enfermería, farmacia hospitalaria)? Ofrecemos demo, soporte de
                implantación, licencias y métricas de resultados.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#login" className="px-4 py-2 rounded-lg font-semibold text-slate-900" style={{ background: colors.apricot }}>Concertar demo</a>
                <a href="#inicio" className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white">Contactar</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <span className="text-slate-500">
            © {new Date().getFullYear()} SimuPed
          </span>
          <a
            href="#inicio"
            className="text-[rgb(26,105,184)] hover:underline"
          >
            Volver arriba
          </a>
        </div>
      </footer>
    </div>
  )
}