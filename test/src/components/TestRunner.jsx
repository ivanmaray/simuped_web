const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined) {
    return '--:--';
  }
  const minutos = Math.floor(seconds / 60);
  const segundos = seconds % 60;
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
};

const TestRunner = ({
  pregunta,
  indiceActual,
  totalPreguntas,
  respuestaSeleccionada,
  onSeleccionRespuesta,
  onAnterior,
  onSiguiente,
  esPrimera,
  esUltima,
  onFinalizar,
  tiempoRestante,
  tiempoTotal,
}) => {
  const progreso = Math.round(((indiceActual + 1) / totalPreguntas) * 100);
  const tiempoConsumido = tiempoTotal && tiempoRestante !== null ? tiempoTotal - tiempoRestante : null;

  return (
    <section className="runner">
      <header className="runner__header">
        <div className="runner__header-top">
          <h2>
            Pregunta {indiceActual + 1} de {totalPreguntas}
          </h2>
          <div className="runner__timer">
            <span>Tiempo restante</span>
            <strong>{formatTime(tiempoRestante)}</strong>
          </div>
        </div>
        {tiempoConsumido !== null && (
          <p className="runner__timer-detail">
            Invertido: {formatTime(tiempoConsumido)} / {formatTime(tiempoTotal)}
          </p>
        )}
        <div className="runner__progress">
          <div className="runner__progress-bar" style={{ width: `${progreso}%` }} aria-valuenow={progreso} />
        </div>
        <p>
          <strong>Categoría:</strong> {pregunta.categoria}
          {pregunta.subcategoria ? ` · ${pregunta.subcategoria}` : ''}
          {' · '}<strong>Dificultad:</strong> {pregunta.dificultad}
        </p>
      </header>

      <article className="runner__card">
        <h3>{pregunta.pregunta}</h3>
        <ul className="runner__options">
          {pregunta.opciones.map((opcion, index) => {
            const seleccionada = respuestaSeleccionada === index;
            return (
              <li key={`${pregunta.id}-${opcion}`}>
                <button
                  type="button"
                  className={seleccionada ? 'runner__option--selected' : ''}
                  onClick={() => onSeleccionRespuesta(index)}
                >
                  {opcion}
                </button>
              </li>
            );
          })}
        </ul>
      </article>

      <footer className="runner__footer">
        <button type="button" onClick={onAnterior} disabled={esPrimera} className="runner__nav">
          Anterior
        </button>
        {!esUltima && (
          <button type="button" onClick={onSiguiente} className="runner__nav runner__nav--primary">
            Siguiente
          </button>
        )}
        {esUltima && (
          <button type="button" onClick={onFinalizar} className="runner__nav runner__nav--primary">
            Finalizar test
          </button>
        )}
      </footer>
    </section>
  );
};

export default TestRunner;
