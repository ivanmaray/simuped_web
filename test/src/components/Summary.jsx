import { descargarResultadoComoCSV } from '../utils/exporters.js';

const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) {
    return '--:--';
  }
  const minutos = Math.floor(seconds / 60);
  const segundos = seconds % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
};

const buildAggregate = (preguntas, respuestas, clave) => {
  return preguntas.reduce((acc, pregunta, index) => {
    const key = pregunta[clave] ?? 'Sin categoría';
    if (!acc[key]) {
      acc[key] = { total: 0, aciertos: 0 };
    }
    acc[key].total += 1;
    if (respuestas[index] === pregunta.respuestaCorrecta) {
      acc[key].aciertos += 1;
    }
    return acc;
  }, {});
};

const Summary = ({ resultado, onRestart }) => {
  const { respuestas, preguntas, aciertos, configuracion, tiempoTotal, tiempoEmpleado } = resultado;
  const totalPreguntas = preguntas.length;
  const sinResponder = respuestas.filter((respuesta) => respuesta === undefined).length;
  const fallos = totalPreguntas - aciertos - sinResponder;
  const porcentaje = Math.round((aciertos / totalPreguntas) * 100);

  const resumenPorCategoria = buildAggregate(preguntas, respuestas, 'categoria');
  const resumenPorDificultad = buildAggregate(preguntas, respuestas, 'dificultad');
  const resumenPorSubcategoria = buildAggregate(preguntas, respuestas, 'subcategoria');

  const tiempoMedio = tiempoEmpleado && totalPreguntas > 0 ? Math.round(tiempoEmpleado / totalPreguntas) : null;

  return (
    <section className="summary">
      <header className="summary__header">
        <h2>Resultado final</h2>
        <p>
          Puntuación: <strong>{aciertos}</strong> / {totalPreguntas} ({porcentaje}%)
        </p>
        <p>
          Configuración:{' '}
          {configuracion.modo === 'aleatorio'
            ? 'Test aleatorio'
            : configuracion.categoria ?? 'Sin categoría'}
          {configuracion.modo === 'personalizado' &&
          configuracion.subcategoria &&
          configuracion.subcategoria !== 'todas'
            ? ` · ${configuracion.subcategoria}`
            : ''}
          {' · '}
          {configuracion.mezclarDificultades
            ? 'Mezcla de dificultades'
            : configuracion.dificultad === 'Todas'
            ? 'Todas las dificultades'
            : configuracion.dificultad}
        </p>
        {tiempoEmpleado !== null && tiempoTotal !== null && (
          <p>
            Tiempo empleado: {formatTime(tiempoEmpleado)} de {formatTime(tiempoTotal)} · promedio {formatTime(tiempoMedio)} por
            pregunta
          </p>
        )}
        <div className="summary__stats">
          <div>
            <strong>Aciertos</strong>
            <span>{aciertos}</span>
          </div>
          <div>
            <strong>Fallos</strong>
            <span>{fallos}</span>
          </div>
          <div>
            <strong>Sin responder</strong>
            <span>{sinResponder}</span>
          </div>
        </div>
      </header>

      <section className="summary__aggregates">
        <div>
          <h3>Por categoría</h3>
          <ul>
            {Object.entries(resumenPorCategoria).map(([categoria, valores]) => (
              <li key={categoria}>
                {categoria}: {valores.aciertos}/{valores.total}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Por dificultad</h3>
          <ul>
            {Object.entries(resumenPorDificultad).map(([nivel, valores]) => (
              <li key={nivel}>
                {nivel}: {valores.aciertos}/{valores.total}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Por subcategoría</h3>
          <ul>
            {Object.entries(resumenPorSubcategoria).map(([sub, valores]) => (
              <li key={sub}>
                {sub}: {valores.aciertos}/{valores.total}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="summary__list">
        {preguntas.map((pregunta, index) => {
          const respuestaUsuario = respuestas[index];
          const correcta = respuestaUsuario === pregunta.respuestaCorrecta;

          return (
            <article
              key={pregunta.id}
              className={`summary__item ${correcta ? 'summary__item--correcta' : 'summary__item--incorrecta'}`}
            >
              <h3>{pregunta.pregunta}</h3>
              <p>
                <strong>Categoría:</strong> {pregunta.categoria}
                {pregunta.subcategoria ? ` · ${pregunta.subcategoria}` : ''}
              </p>
              <p>
                Tu respuesta: <strong>{pregunta.opciones[respuestaUsuario] ?? 'Sin responder'}</strong>
              </p>
              {!correcta && (
                <p>
                  Respuesta correcta: <strong>{pregunta.opciones[pregunta.respuestaCorrecta]}</strong>
                </p>
              )}
              <p className="summary__explicacion">{pregunta.explicacion}</p>
            </article>
          );
        })}
      </section>

      <footer className="summary__footer">
        <button type="button" onClick={() => descargarResultadoComoCSV(resultado)}>
          Descargar CSV
        </button>
        <button type="button" onClick={onRestart}>
          Volver al inicio
        </button>
      </footer>
    </section>
  );
};

export default Summary;
