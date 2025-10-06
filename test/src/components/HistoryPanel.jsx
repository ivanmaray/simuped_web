import {
  SparklesIcon,
  ClockIcon,
  AcademicCapIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const formatPercent = (value) => {
  if (value === null || value === undefined) {
    return '--';
  }
  return `${Math.round(value * 100)}%`;
};

const formatDate = (value) => {
  try {
    return new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const HistoryPanel = ({ historial, estadisticas, usuario }) => {
  const mediaGeneral = estadisticas?.mediaGeneral ?? null;
  const categoriasDestacadas = estadisticas?.categorias.slice(0, 5) ?? [];
  const intentosRecientes = historial.slice(0, 6);
  const ultimaNota = historial[0]
    ? historial[0].aciertos / (historial[0].preguntas.length || 1)
    : null;

  return (
    <section className="history">
      <header className="history__header">
        <div>
          <h2>Historial y progreso</h2>
          <p>
            {usuario
              ? `Resumen de resultados para ${usuario}.`
              : 'Analiza cómo evolucionas y qué categorías tienes mejor preparadas.'}
          </p>
        </div>
      </header>

      <div className="history__stats">
        <article className="history__stats-card">
          <SparklesIcon aria-hidden className="history__stats-icon" />
          <div>
            <span>Media global</span>
            <strong>{formatPercent(mediaGeneral)}</strong>
          </div>
        </article>
        <article className="history__stats-card">
          <AcademicCapIcon aria-hidden className="history__stats-icon" />
          <div>
            <span>Último intento</span>
            <strong>{formatPercent(ultimaNota)}</strong>
          </div>
        </article>
        <article className="history__stats-card">
          <ClockIcon aria-hidden className="history__stats-icon" />
          <div>
            <span>Intentos guardados</span>
            <strong>{historial.length}</strong>
          </div>
        </article>
      </div>

      {categoriasDestacadas.length > 0 && (
        <div className="history__categories">
          <header>
            <ChartBarIcon aria-hidden className="history__categories-icon" />
            <h3>Rendimiento por categoría</h3>
          </header>
          <ul>
            {categoriasDestacadas.map((categoria) => (
              <li key={categoria.categoria}>
                <div className="history__categories-meta">
                  <span>{categoria.categoria}</span>
                  <span>{formatPercent(categoria.porcentaje)}</span>
                </div>
                <div className="history__progress">
                  <div
                    className="history__progress-bar"
                    style={{ width: `${Math.round((categoria.porcentaje || 0) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="history__list">
        {intentosRecientes.map((registro) => {
          const nota = registro.aciertos / (registro.preguntas.length || 1);
          const dificultad = registro.configuracion?.mezclarDificultades
            ? 'Mezcla de dificultades'
            : registro.configuracion?.dificultad === 'Todas'
              ? 'Todas las dificultades'
              : registro.configuracion?.dificultad ?? 'N/A';

          return (
            <article className="history__item" key={registro.id}>
              <div className="history__item-header">
                <h4>
                  {registro.configuracion?.modo === 'aleatorio'
                    ? 'Test aleatorio'
                    : registro.configuracion?.categoria ?? 'Práctica personalizada'}
                </h4>
                <span className="history__badge">{formatPercent(nota)}</span>
              </div>
              <p className="history__item-meta">
                {registro.configuracion?.modo === 'personalizado' &&
                registro.configuracion?.subcategoria &&
                registro.configuracion.subcategoria !== 'todas'
                  ? `${registro.configuracion.subcategoria} · `
                  : ''}
                {dificultad}
              </p>
              <footer className="history__item-footer">
                <span>{formatDate(registro.fecha)}</span>
                <span>
                  {registro.aciertos}/{registro.preguntas.length} aciertos
                </span>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default HistoryPanel;
