import { useEffect, useMemo, useState } from 'react';

const SetupForm = ({ categorias, dificultades, subcategoriasPorCategoria, usuario, onStart, deshabilitarInicio }) => {
  const [modo, setModo] = useState('personalizado');
  const [categoria, setCategoria] = useState(categorias[0] ?? '');
  const [dificultad, setDificultad] = useState(dificultades[0] ?? '');
  const [subcategoria, setSubcategoria] = useState('todas');
  const [mezclarDificultades, setMezclarDificultades] = useState(false);
  const [numeroPreguntas, setNumeroPreguntas] = useState(10);
  const [tiempoPorPregunta, setTiempoPorPregunta] = useState(60);

  const subcategoriasDisponibles = useMemo(() => {
    const lista = subcategoriasPorCategoria.get(categoria) ?? [];
    return lista.length > 0 ? ['todas', ...lista] : [];
  }, [categoria, subcategoriasPorCategoria]);

  useEffect(() => {
    setSubcategoria('todas');
  }, [categoria, modo]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onStart({
      modo,
      categoria,
      dificultad,
      mezclarDificultades,
      subcategoria,
      numeroPreguntas: Number(numeroPreguntas),
      tiempoPorPregunta: Number(tiempoPorPregunta),
    });
  };

  return (
    <section className="setup">
      <header className="setup__header">
        <h2>Configura tu test</h2>
        <p>
          Practica como <strong>{usuario}</strong>. Personaliza el simulacro según el temario que quieras reforzar o deja que
          sorprendamos a Chuli.
        </p>
      </header>

      <form className="setup__form" onSubmit={handleSubmit}>
        <fieldset className="setup__fieldset">
          <legend>Modo de cuestionario</legend>

          <div className="setup__options">
            <label className={`setup__card ${modo === 'personalizado' ? 'setup__card--active' : ''}`}>
              <input
                type="radio"
                name="modo"
                value="personalizado"
                checked={modo === 'personalizado'}
                onChange={() => setModo('personalizado')}
              />
              <div className="setup__card-icon" aria-hidden>
                🎯
              </div>
              <div className="setup__card-body">
                <strong>Dirigido</strong>
                <span>Elige categoría, subcategoría y dificultad específica.</span>
              </div>
            </label>

            <label className={`setup__card ${modo === 'aleatorio' ? 'setup__card--active' : ''}`}>
              <input
                type="radio"
                name="modo"
                value="aleatorio"
                checked={modo === 'aleatorio'}
                onChange={() => setModo('aleatorio')}
              />
              <div className="setup__card-icon" aria-hidden>
                🔀
              </div>
              <div className="setup__card-body">
                <strong>Aleatorio</strong>
                <span>Te mezclamos categorías y (si quieres) niveles de dificultad.</span>
              </div>
            </label>
          </div>
        </fieldset>

        <div className="setup__grid">
          <label className="setup__field">
            <span>Categoría</span>
            <select
              value={categoria}
              onChange={(event) => setCategoria(event.target.value)}
              required={modo === 'personalizado'}
              disabled={modo === 'aleatorio'}
            >
              {categorias.map((categoriaActual) => (
                <option key={categoriaActual} value={categoriaActual}>
                  {categoriaActual}
                </option>
              ))}
            </select>
          </label>

          <label className="setup__field">
            <span>Dificultad</span>
            <select
              value={dificultad}
              onChange={(event) => setDificultad(event.target.value)}
              disabled={mezclarDificultades}
              required
            >
              {dificultades.map((dificultadActual) => (
                <option key={dificultadActual} value={dificultadActual}>
                  {dificultadActual === 'Todas' ? 'Todas las dificultades' : dificultadActual}
                </option>
              ))}
            </select>
          </label>

          {modo === 'personalizado' && subcategoriasDisponibles.length > 0 && (
            <label className="setup__field setup__field--wide">
              <span>Subcategoría</span>
              <select value={subcategoria} onChange={(event) => setSubcategoria(event.target.value)}>
                {subcategoriasDisponibles.map((opcion) => (
                  <option key={opcion} value={opcion}>
                    {opcion === 'todas' ? 'Todas las subcategorías' : opcion}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="setup__field">
            <span>Número de preguntas</span>
            <input
              type="number"
              min={1}
              max={50}
              value={numeroPreguntas}
              onChange={(event) => setNumeroPreguntas(event.target.value)}
            />
          </label>

          <label className="setup__field">
            <span>Tiempo por pregunta (seg)</span>
            <input
              type="number"
              min={20}
              max={300}
              step={10}
              value={tiempoPorPregunta}
              onChange={(event) => setTiempoPorPregunta(event.target.value)}
            />
          </label>
        </div>

        <label className="setup__toggle">
          <input
            type="checkbox"
            checked={mezclarDificultades}
            onChange={(event) => setMezclarDificultades(event.target.checked)}
          />
          Mezclar preguntas de distintas dificultades
        </label>

        <footer className="setup__footer">
          <button type="submit" className="setup__submit" disabled={deshabilitarInicio}>
            Comenzar test
          </button>
        </footer>
      </form>
    </section>
  );
};

export default SetupForm;
