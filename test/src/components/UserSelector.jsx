const usuariosPredefinidos = [
  { id: 'Raquel', label: 'Raquel', descripcion: 'Historial personalizado y seguimiento continuo.' },
  { id: 'Iván', label: 'Iván', descripcion: 'Entrenamiento avanzado con estadísticas propias.' },
  { id: 'Invitado', label: 'Invitado', descripcion: 'Comparte el simulacro. Introduce tu nombre para guardar progreso.' },
];

const UserSelector = ({ usuarioSeleccionado, onSeleccionar, nombreInvitado, onCambiarNombre }) => {
  return (
    <section className="user-selector">
      <header className="user-selector__header">
        <h2>Selecciona quién practica</h2>
        <p>El historial y las estadísticas se guardan por usuario. Elige uno de los perfiles o usa modo invitado.</p>
      </header>

      <div className="user-selector__options">
        {usuariosPredefinidos.map((usuario) => {
          const activo = usuarioSeleccionado === usuario.id;
          return (
            <label key={usuario.id} className={`user-card ${activo ? 'user-card--active' : ''}`}>
              <input
                type="radio"
                name="usuario"
                value={usuario.id}
                checked={activo}
                onChange={() => onSeleccionar(usuario.id)}
              />
              <div className="user-card__icon" aria-hidden>
                {usuario.id === 'Raquel' ? '🌸' : usuario.id === 'Iván' ? '🚀' : '⭐️'}
              </div>
              <div className="user-card__body">
                <strong>{usuario.label}</strong>
                <span>{usuario.descripcion}</span>
              </div>
            </label>
          );
        })}
      </div>

      {usuarioSeleccionado === 'Invitado' && (
        <div className="user-selector__input">
          <label>
            <span>Nombre del invitado</span>
            <input
              type="text"
              value={nombreInvitado}
              onChange={(event) => onCambiarNombre(event.target.value)}
              placeholder="Escribe tu nombre"
              maxLength={30}
            />
          </label>
          <p>Se guardará el historial bajo este nombre.</p>
        </div>
      )}
    </section>
  );
};

export default UserSelector;
