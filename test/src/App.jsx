import { useCallback, useEffect, useMemo, useState } from 'react';
import SetupForm from './components/SetupForm.jsx';
import TestRunner from './components/TestRunner.jsx';
import Summary from './components/Summary.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import UserSelector from './components/UserSelector.jsx';
import {
  preguntasDisponibles,
  categoriasDisponibles,
  dificultadesDisponibles,
  subcategoriasDisponibles,
} from './data/questions.js';
import { guardarResultado, cargarHistorial, eliminarHistorial } from './utils/historyStorage.js';

const mezclarPreguntas = (lista) => [...lista].sort(() => Math.random() - 0.5);

const calcularAciertos = (preguntas, respuestas) =>
  preguntas.reduce((total, pregunta, index) => total + (respuestas[index] === pregunta.respuestaCorrecta ? 1 : 0), 0);

const App = () => {
  const [paso, setPaso] = useState('config');
  const [configuracion, setConfiguracion] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestas, setRespuestas] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('Raquel');
  const [nombreInvitado, setNombreInvitado] = useState('');
  const usuarioActivo = useMemo(() => {
    if (usuarioSeleccionado === 'Invitado') {
      return nombreInvitado.trim();
    }
    return usuarioSeleccionado;
  }, [usuarioSeleccionado, nombreInvitado]);
  const [historial, setHistorial] = useState(() => cargarHistorial('Raquel'));
  const [mensaje, setMensaje] = useState('');
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [tiempoTotal, setTiempoTotal] = useState(null);

  const subcategoriasPorCategoria = useMemo(() => {
    const mapa = new Map();

    categoriasDisponibles.forEach((categoria) => {
      const lista = subcategoriasDisponibles
        .filter((subcategoria) =>
          preguntasDisponibles.some(
            (pregunta) => pregunta.categoria === categoria && pregunta.subcategoria === subcategoria,
          ),
        )
        .sort();
      mapa.set(categoria, lista);
    });

    return mapa;
  }, []);

  const dificultadesConDatos = useMemo(() => {
    const base = dificultadesDisponibles.filter((dificultad) =>
      preguntasDisponibles.some((pregunta) => pregunta.dificultad === dificultad),
    );
    return ['Todas', ...base];
  }, []);

  useEffect(() => {
    const nombreValidado = usuarioActivo || 'Invitado';
    setHistorial(cargarHistorial(nombreValidado));
  }, [usuarioActivo]);

  const estadisticasHistorial = useMemo(() => {
    if (historial.length === 0) {
      return null;
    }

    let totalAciertos = 0;
    let totalPreguntas = 0;
    const agregadosPorCategoria = new Map();

    historial.forEach((registro) => {
      totalAciertos += registro.aciertos;
      totalPreguntas += registro.preguntas.length;

      registro.preguntas.forEach((pregunta, index) => {
        const categoria = pregunta.categoria ?? 'Sin categoría';
        const contenedor = agregadosPorCategoria.get(categoria) ?? { total: 0, aciertos: 0 };
        contenedor.total += 1;
        if (registro.respuestas[index] === pregunta.respuestaCorrecta) {
          contenedor.aciertos += 1;
        }
        agregadosPorCategoria.set(categoria, contenedor);
      });
    });

    const mediaGeneral = totalPreguntas === 0 ? null : totalAciertos / totalPreguntas;
    const categorias = Array.from(agregadosPorCategoria.entries())
      .map(([categoria, datos]) => ({
        categoria,
        aciertos: datos.aciertos,
        total: datos.total,
        porcentaje: datos.total === 0 ? 0 : datos.aciertos / datos.total,
      }))
      .sort((a, b) => b.porcentaje - a.porcentaje);

    return { mediaGeneral, categorias };
  }, [historial]);

  const iniciarTest = ({
    modo,
    categoria,
    dificultad,
    mezclarDificultades,
    subcategoria,
    numeroPreguntas,
    tiempoPorPregunta,
  }) => {
    const nombreUsuario = usuarioActivo || 'Invitado';

    if (usuarioSeleccionado === 'Invitado' && !usuarioActivo) {
      setMensaje('Introduce un nombre para el modo invitado antes de comenzar.');
      return;
    }

    let pool = [];

    if (modo === 'aleatorio') {
      pool = mezclarDificultades
        ? preguntasDisponibles
        : dificultad === 'Todas'
          ? preguntasDisponibles
          : preguntasDisponibles.filter((pregunta) => pregunta.dificultad === dificultad);
    } else {
      const filtroBase = preguntasDisponibles.filter((pregunta) => pregunta.categoria === categoria);

      const filtroPorSubcategoria =
        subcategoria && subcategoria !== 'todas'
          ? filtroBase.filter((pregunta) => pregunta.subcategoria === subcategoria)
          : filtroBase;

      const filtradas =
        mezclarDificultades || dificultad === 'Todas'
          ? filtroPorSubcategoria
          : filtroPorSubcategoria.filter((pregunta) => pregunta.dificultad === dificultad);

      pool = filtradas.length > 0 ? filtradas : filtroPorSubcategoria;
    }

    const preguntasFinales = mezclarPreguntas(pool).slice(0, numeroPreguntas);

    if (preguntasFinales.length === 0) {
      setMensaje('No hay preguntas disponibles para la selección elegida todavía.');
      return;
    }

    setMensaje('');
    setConfiguracion({
      modo,
      categoria,
      dificultad,
      mezclarDificultades,
      subcategoria,
      numeroPreguntas: preguntasFinales.length,
      tiempoPorPregunta,
      usuario: nombreUsuario,
    });
    setPreguntas(preguntasFinales);
    setIndiceActual(0);
    setRespuestas(Array(preguntasFinales.length).fill(undefined));
    setResultado(null);
    const totalTiempo = preguntasFinales.length * tiempoPorPregunta;
    setTiempoTotal(totalTiempo);
    setTiempoRestante(totalTiempo);
    setPaso('quiz');
  };

  const seleccionarRespuesta = (indiceRespuesta) => {
    setRespuestas((respuestasPrevias) => {
      const nuevasRespuestas = [...respuestasPrevias];
      nuevasRespuestas[indiceActual] = indiceRespuesta;
      return nuevasRespuestas;
    });
  };

  const irASiguiente = () => {
    setIndiceActual((indicePrevio) => Math.min(indicePrevio + 1, preguntas.length - 1));
  };

  const irAnterior = () => {
    setIndiceActual((indicePrevio) => Math.max(indicePrevio - 1, 0));
  };

  const finalizarTest = useCallback(
    (respuestasCompletas) => {
      const respuestasFinales = respuestasCompletas ?? respuestas;
      const aciertos = calcularAciertos(preguntas, respuestasFinales);
      const nombreHistorial = usuarioActivo || 'Invitado';

      const nuevoResultado = {
        id: `resultado-${Date.now()}`,
        fecha: new Date().toISOString(),
        configuracion,
        preguntas,
        respuestas: respuestasFinales,
        aciertos,
        tiempoTotal,
        tiempoEmpleado: configuracion ? tiempoTotal - (tiempoRestante ?? 0) : null,
      };

      guardarResultado(nombreHistorial, nuevoResultado);
      setHistorial((historialPrevio) => [nuevoResultado, ...historialPrevio].slice(0, 20));
      setResultado(nuevoResultado);
      setPaso('summary');
    },
    [configuracion, preguntas, respuestas, tiempoRestante, tiempoTotal, usuarioActivo],
  );

  const finalizarDesdeUI = () => {
    finalizarTest([...respuestas]);
  };

  useEffect(() => {
    if (paso !== 'quiz' || tiempoRestante === null) {
      return undefined;
    }

    if (tiempoRestante <= 0) {
      finalizarTest([...respuestas]);
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTiempoRestante((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [paso, tiempoRestante, respuestas, finalizarTest]);

  useEffect(() => {
    if (paso === 'summary') {
      setTiempoRestante(null);
      setTiempoTotal(null);
    }
  }, [paso]);

  const reiniciar = () => {
    setPaso('config');
    setConfiguracion(null);
    setPreguntas([]);
    setIndiceActual(0);
    setRespuestas([]);
    setResultado(null);
    setTiempoRestante(null);
    setTiempoTotal(null);
  };

  const puedeComenzar = usuarioSeleccionado !== 'Invitado' || Boolean(usuarioActivo);

  const limpiarHistorial = () => {
    const nombre = usuarioActivo || 'Invitado';
    const confirmacion = window.confirm(`Se eliminará el historial local de ${nombre}. ¿Quieres continuar?`);
    if (!confirmacion) {
      return;
    }
    eliminarHistorial(nombre);
    setHistorial([]);
    setMensaje('Historial local eliminado.');
  };

  return (
    <main className="app">
      <header className="hero">
        <p className="hero__dedication">Para Chuli, para que saque un 10 en el BPS (preparación) que se lo merece.</p>
        <h1 className="hero__title">Preparación BPS Oncología</h1>
        <p className="hero__subtitle">
          Entrena con preguntas tipo test, controla tu tiempo y lleva registro de tus resultados para conquistar el examen.
          {usuarioActivo ? ` Sesión activa: ${usuarioActivo}.` : ''}
        </p>
      </header>

      <div className="app__content">
        <section className="storage-note">
          <div>
            <strong>Nota:</strong> El historial se guarda únicamente en este navegador. Si cambias de dispositivo, móvil u ordenador,
            el progreso no se sincroniza automáticamente.
          </div>
          <button type="button" className="storage-note__button" onClick={limpiarHistorial}>
            Borrar historial local
          </button>
        </section>

        {paso === 'config' && (
          <>
            <UserSelector
              usuarioSeleccionado={usuarioSeleccionado}
              onSeleccionar={setUsuarioSeleccionado}
              nombreInvitado={nombreInvitado}
              onCambiarNombre={setNombreInvitado}
            />

            <SetupForm
              categorias={categoriasDisponibles}
              dificultades={dificultadesConDatos}
              subcategoriasPorCategoria={subcategoriasPorCategoria}
              usuario={usuarioActivo || 'Invitado'}
              onStart={iniciarTest}
              deshabilitarInicio={!puedeComenzar}
            />

            {mensaje && (
              <section className="setup__alert">
                <p>{mensaje}</p>
              </section>
            )}

            {historial.length > 0 && (
              <HistoryPanel
                historial={historial}
                estadisticas={estadisticasHistorial}
                usuario={usuarioActivo || 'Invitado'}
              />
            )}
          </>
        )}

        {paso === 'quiz' && preguntas[indiceActual] && (
          <TestRunner
            pregunta={preguntas[indiceActual]}
            indiceActual={indiceActual}
            totalPreguntas={preguntas.length}
            respuestaSeleccionada={respuestas[indiceActual]}
            onSeleccionRespuesta={seleccionarRespuesta}
            onSiguiente={irASiguiente}
            onAnterior={irAnterior}
            esPrimera={indiceActual === 0}
            esUltima={indiceActual === preguntas.length - 1}
            onFinalizar={finalizarDesdeUI}
            tiempoRestante={tiempoRestante}
            tiempoTotal={tiempoTotal}
          />
        )}

        {paso === 'summary' && resultado && <Summary resultado={resultado} onRestart={reiniciar} />}
      </div>
    </main>
  );
};

export default App;
