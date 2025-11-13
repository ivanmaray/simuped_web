import Navbar from "../../../components/Navbar.jsx";
import AdminNav from "../components/AdminNav.jsx";

const roadmapItems = [
  {
    title: "Reglas y cronogramas",
  description: "Construccion de flujos condicionales para activar eventos, parametros fisiologicos y variaciones de guion segun el desempeno del grupo.",
  },
  {
    title: "Checklists colaborativos",
  description: "Evaluadores podran registrar checklist en vivo, asignar responsables y sincronizar observaciones con el informe final.",
  },
  {
    title: "Recursos físicos y roles",
  description: "Inventario de equipamiento, asignacion de roles por estacion y briefings personalizados para cada perfil presencial.",
  },
  {
  title: "Analiticas de sesion",
  description: "Resumen automatico de hallazgos, metricas de respuesta y exportacion para comites de simulacion clinica.",
  },
];

export default function Admin_ScenariosPresenciales() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 pb-12 pt-6 space-y-6">
        <AdminNav />
        <header className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Simulacion presencial</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Escenarios presenciales</h1>
          <p className="mt-3 text-sm text-slate-600">
            Estamos consolidando un modulo dedicado a la gestion de escenarios presenciales. Aqui centralizaremos reglas avanzadas,
            checklists colaborativos y recursos de aula para que puedas orquestar sesiones con el mismo nivel de control que en la
            simulacion online.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {roadmapItems.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </article>
          ))}
        </section>

        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-100 px-6 py-6 text-sm text-slate-600">
          <p className="font-semibold text-slate-700">Quieres participar en la beta?</p>
          <p className="mt-2">
            Si tu equipo ya trabaja con escenarios presenciales y quieres ayudarnos a priorizar funcionalidades, escribenos a soporte o
            agenda una sesion rapida con el equipo de producto.
          </p>
        </div>
      </div>
    </div>
  );
}
