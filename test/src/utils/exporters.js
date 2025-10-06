const sanitizeForCsv = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
};

export const descargarResultadoComoCSV = (resultado) => {
  if (!resultado) return;

  const encabezados = [
    'Pregunta',
    'Categoría',
    'Subcategoría',
    'Dificultad',
    'Respuesta correcta',
    'Respuesta usuario',
    'Acierto',
  ];

  const filas = resultado.preguntas.map((pregunta, index) => {
    const respuestaUsuario = resultado.respuestas[index];
    const respuestaCorrecta = pregunta.opciones[pregunta.respuestaCorrecta];
    const respuestaMarcada = respuestaUsuario !== undefined ? pregunta.opciones[respuestaUsuario] : 'Sin responder';
    const acierto = respuestaUsuario === pregunta.respuestaCorrecta ? 'Sí' : 'No';

    return [
      sanitizeForCsv(pregunta.pregunta),
      sanitizeForCsv(pregunta.categoria),
      sanitizeForCsv(pregunta.subcategoria ?? ''),
      sanitizeForCsv(pregunta.dificultad),
      sanitizeForCsv(respuestaCorrecta),
      sanitizeForCsv(respuestaMarcada),
      sanitizeForCsv(acierto),
    ].join(',');
  });

  const contenido = [encabezados.join(','), ...filas].join('\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${resultado.id}.csv`;
  enlace.style.display = 'none';
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  window.URL.revokeObjectURL(url);
};
