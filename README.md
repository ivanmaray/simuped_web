# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## QA rápida: simulación presencial

- **Arranque instructor:** acceder a `/presencial/instructor/:escenarioId/:sessionId`, pulsar `Iniciar` y comprobar que los controles dejan de estar atenuados.
- **Estado pendiente:** abrir `🫁 Ventilación mecánica`, confirmar que el alumnado muestra la tarjeta “Pendiente” sin valores y que el banner de estado del instructor lo indica.
- **Publicar parámetros:** aplicar una configuración y validar que el resumen de estado cambia a “El alumnado ve los parámetros publicados”.
- **Ocultar y detener:** usar `⛔ Ocultar ventilación` y `Detener ventilación` desde el modal; revisa que el resumen describe lo que ve el alumno y que el panel del alumno refleja cada cambio.
- **Checklist y datos:** publicar/ocultar constantes y banner, asegurándote de que el alumno recibe los cambios y aparece la alerta sonora si no está en modo `mute`.
- **Cierre de sesión:** pulsar `Finalizar`, verificar que ya no se pueden enviar acciones y que el enlace a `📄 Informe` queda disponible.
