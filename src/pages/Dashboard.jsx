import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import logo from '../assets/logo.png'
import Navbar from "../components/Navbar.jsx"

// Paleta de SimuPed
const colors = {
  coral: '#f6a9a3',      // color1
  apricot: '#f2c28c',    // color2
  blue: '#1a69b8',       // color3 (principal)
  cyan: '#1d99bf',       // color4
  teal: '#1fced1'        // color5
}

export default function Dashboard() {
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

    if (error) {
      setErrorMsg(error.message)
      return
    }
    navigate('/dashboard')
  }

  const navLinkStyle = {
    color: '#fff',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: 8,
    opacity: 0.95
  }

  return (
    <div style={{ background: '#f9fbfd', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* NAVBAR */}
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: colors.blue, color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={logo} alt="SimuPed" style={{ height: 36, width: 36, objectFit: 'contain' }} />
            <strong style={{ fontSize: 18 }}>SimuPed</strong>
          </div>
          <nav style={{ display: 'flex', gap: 8 }}>
            <a href="#inicio" style={navLinkStyle}>Inicio</a>
            <a href="#que-es" style={navLinkStyle}>¿Qué es?</a>
            <a href="#equipo" style={navLinkStyle}>Equipo</a>
            <a href="#proyecto" style={navLinkStyle}>Proyecto</a>
            <a href="#login" style={{ ...navLinkStyle, background: colors.teal, color: '#00323b' }}>Entrar</a>
          </nav>
        </div>
      </header>

      {/* HERO / INICIO */}
      <section id="inicio" style={{ background: `linear-gradient(135deg, ${colors.blue}, ${colors.cyan})`, color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 28 }}>
          <div>
            <h1 style={{ fontSize: 42, lineHeight: 1.1, marginBottom: 12 }}>Entrena escenarios clínicos pediátricos</h1>
            <p style={{ fontSize: 18, opacity: 0.95, marginBottom: 24 }}>
              SimuPed te ayuda a practicar toma de decisiones, protocolos y trabajo en equipo con casos clínicos guiados.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#que-es" style={{ background: colors.teal, color: '#00323b', textDecoration: 'none', padding: '12px 16px', borderRadius: 10, fontWeight: 600 }}>Cómo funciona</a>
              <a href="#login" style={{ border: '2px solid #fff', color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 10 }}>Entrar</a>
            </div>
          </div>

          {/* Card de login en el hero */}
          <div id="login" style={{ background: '#ffffff', border: '1px solid #eef1f4', borderRadius: 14, padding: 20, color: '#1a1a1a', boxShadow: '0 10px 30px rgba(0,0,0,0.10)' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Iniciar sesión</h3>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input name="email" type="email" placeholder="Email" required style={{ padding: 12, border: '1px solid #cfd7df', borderRadius: 8 }} />
              <input name="password" type="password" placeholder="Contraseña" required style={{ padding: 12, border: '1px solid #cfd7df', borderRadius: 8 }} />
              {errorMsg && (
                <div style={{ color: '#b00020', fontSize: 14 }}>{errorMsg}</div>
              )}
              <button type="submit" disabled={loading} style={{ padding: 12, borderRadius: 10, border: 'none', background: colors.cyan, color: '#08303a', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
            <p style={{ fontSize: 12, marginTop: 8, color: '#6b7785' }}>* Los usuarios los crea el administrador.</p>
          </div>
        </div>
      </section>

      {/* ¿QUÉ ES? */}
      <section id="que-es" style={{ background: '#ffffff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <div style={{ background: '#f7fafc', border: '1px solid #eef1f4', borderRadius: 12, padding: 20 }}>
            <h4 style={{ marginTop: 0 }}>Escenarios guiados</h4>
            <p style={{ margin: 0 }}>Casos pediátricos con pasos, preguntas y feedback inmediato.</p>
          </div>
          <div style={{ background: '#f7fafc', border: '1px solid #eef1f4', borderRadius: 12, padding: 20 }}>
            <h4 style={{ marginTop: 0 }}>Evaluación del desempeño</h4>
            <p style={{ margin: 0 }}>Métricas por escenario y análisis de mejoras.</p>
          </div>
          <div style={{ background: '#f7fafc', border: '1px solid #eef1f4', borderRadius: 12, padding: 20 }}>
            <h4 style={{ marginTop: 0 }}>Pronto: trabajo en equipo</h4>
            <p style={{ margin: 0 }}>Simulación colaborativa para roles de UCI pediátrica y farmacia.</p>
          </div>
        </div>
      </section>

      {/* EQUIPO */}
      <section id="equipo" style={{ background: colors.apricot + '22' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Equipo SimuPed</h3>
          <p style={{ margin: 0, maxWidth: 800 }}>
            Profesionales del HUCA (UGC de Farmacia y UCI Pediátrica) con experiencia en simulación clínica y diseño instruccional.
          </p>
        </div>
      </section>

      {/* PROYECTO */}
      <section id="proyecto" style={{ background: '#ffffff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Proyecto</h3>
          <p style={{ margin: 0, maxWidth: 800 }}>
            Construimos una plataforma ligera para entrenar competencias en contextos reales: medicación segura, soporte vital, comunicación y toma de decisiones.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #eef1f4', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#708090' }}>© {new Date().getFullYear()} SimuPed</span>
          <a href="#inicio" style={{ color: colors.blue, textDecoration: 'none' }}>Volver arriba</a>
        </div>
      </footer>
    </div>
  )
}