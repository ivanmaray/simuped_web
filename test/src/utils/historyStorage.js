const STORAGE_KEY = 'simuped-test-history-v2';

const leerHistorialCompleto = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const previo = localStorage.getItem('simuped-test-history');
      if (!previo) return {};
      const historialPrevio = JSON.parse(previo);
      if (Array.isArray(historialPrevio)) {
        return { Raquel: historialPrevio };
      }
      return {};
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { Raquel: parsed };
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return {};
  } catch (error) {
    console.error('No se pudo leer el historial completo desde localStorage', error);
    return {};
  }
};

const escribirHistorialCompleto = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('No se pudo guardar el historial completo en localStorage', error);
  }
};

export const guardarResultado = (usuario, resultado) => {
  try {
    const todo = leerHistorialCompleto();
    const nombreUsuario = usuario || 'Invitado';
    const historialPrevio = Array.isArray(todo[nombreUsuario]) ? todo[nombreUsuario] : [];
    const nuevoHistorial = [resultado, ...historialPrevio].slice(0, 20);
    todo[nombreUsuario] = nuevoHistorial;
    escribirHistorialCompleto(todo);
  } catch (error) {
    console.error('No se pudo guardar el resultado en localStorage', error);
  }
};

export const cargarHistorial = (usuario) => {
  try {
    const todo = leerHistorialCompleto();
    const nombreUsuario = usuario || 'Invitado';
    const historialUsuario = todo[nombreUsuario];
    return Array.isArray(historialUsuario) ? historialUsuario : [];
  } catch (error) {
    console.error('No se pudo leer el historial desde localStorage', error);
    return [];
  }
};

export const listarUsuariosConHistorial = () => {
  const todo = leerHistorialCompleto();
  return Object.keys(todo)
    .filter((usuario) => Array.isArray(todo[usuario]) && todo[usuario].length > 0)
    .sort();
};

export const eliminarHistorial = (usuario) => {
  try {
    const todo = leerHistorialCompleto();
    const nombreUsuario = usuario || 'Invitado';
    if (nombreUsuario in todo) {
      delete todo[nombreUsuario];
      escribirHistorialCompleto(todo);
    }
  } catch (error) {
    console.error('No se pudo eliminar el historial del usuario', error);
  }
};
