import { useState } from 'react'
import Hero from './components/Hero.jsx'
import Simulacion from './components/Simulacion.jsx'
import About from './components/About.jsx'
import Equipo from './components/Equipo.jsx'

function App() {
  const [showSimulacion, setShowSimulacion] = useState(false)

  return (
    <>
      <Hero onStart={() => setShowSimulacion(true)} />
      {showSimulacion && <Simulacion />}
      <About />
      {/* EQUIPO */}
      <section id="equipo" className="bg-white">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <h3 className="text-3xl font-bold mb-6 text-slate-900 text-center">Equipo</h3>
          <Equipo />
        </div>
      </section>
    </>
  )
}

export default App
