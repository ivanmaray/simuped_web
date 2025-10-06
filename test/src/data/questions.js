import bancoPreguntas from './questions.json';

export const preguntasDisponibles = bancoPreguntas;

export const categoriasDisponibles = Array.from(
  new Set(bancoPreguntas.map((pregunta) => pregunta.categoria)),
);

export const dificultadesDisponibles = Array.from(
  new Set(bancoPreguntas.map((pregunta) => pregunta.dificultad)),
);

export const subcategoriasDisponibles = Array.from(
  new Set(bancoPreguntas.map((pregunta) => pregunta.subcategoria).filter(Boolean)),
);
