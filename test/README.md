# Simuped Onco Test

Simulador de preguntas tipo test para preparar el BS de oncología. Construido con React + Vite.

## Requisitos

- Node.js 20
- npm 10 (o superior)

## Instalación

```bash
npm install
```

## Scripts

- `npm run dev`: levanta Vite en modo desarrollo.
- `npm run build`: genera el build de producción en `dist/`.
- `npm run preview`: sirve el build generado para validarlo.
- `npm run lint`: ejecuta ESLint sobre `src/`.

## Flujo de trabajo

1. Ajusta filtros (categoría, subcategoría, dificultad y tiempo) y lanza el test.
2. Navega entre preguntas, consulta tiempo restante y finaliza cuando quieras.
3. Revisa el resumen con estadísticas por categoría/dificultad, descarga el CSV y consulta el historial reciente.

## CI/CD

Existe un workflow en `.github/workflows/ci.yml` que al hacer push o abrir PR:

1. Instala dependencias con `npm ci`.
2. Lanza `npm run lint` para asegurar calidad de código.
3. Ejecuta `npm run build` y guarda el artefacto `dist/` como adjunto.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Selecciona framework **Vite** (Vercel detecta automáticamente los scripts).
3. Comandos por defecto: `npm run build` y directorio de salida `dist`.
4. (Opcional) Activa despliegues previos (Preview) para ramas/PR que ejecutan la acción de GitHub.

## Historial local

Los resultados del simulacro se guardan en `localStorage` (máximo 20 intentos recientes). Puedes limpiar el historial desde el inspector del navegador o extendiendo la UI con un botón de borrado.
