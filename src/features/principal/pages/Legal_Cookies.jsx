import { Link } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";

export default function LegalCookies() {
  const updatedAt = "15 de octubre de 2025";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 py-10 space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Política de cookies</h1>
          <p className="text-slate-600 text-sm">Última actualización: {updatedAt}</p>
          <p className="text-slate-700 leading-relaxed text-justify">
            Esta web utiliza únicamente cookies técnicas para permitir la
            navegación y el inicio de sesión. No activamos cookies analíticas,
            de personalización ni de marketing mientras no sean imprescindibles
            o nos des tu consentimiento expreso.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">¿Qué es una cookie?</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            Una cookie es un fichero que se guarda en tu dispositivo cuando
            visitas una web. Ayuda a recordar preferencias o mantener sesiones
            abiertas. En SimuPed solo usamos cookies esenciales cuando son
            necesarias para que la plataforma funcione.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cookies que usamos actualmente</h2>
          <ul className="list-disc pl-6 text-slate-700 space-y-2 leading-relaxed text-justify">
            <li>
              Cookies técnicas de sesión (solo si se habilitan por motivos de
              seguridad) para mantener tu sesión iniciada hasta que cierres el
              navegador.
            </li>
            <li>
              No instalamos cookies analíticas, publicitarias ni de terceros en
              este momento.
            </li>
          </ul>
          <p className="text-slate-700 leading-relaxed text-justify">
            Si añadimos analítica o marketing, lo avisaremos en esta página y te
            pediremos consentimiento antes de cargar cualquier cookie no
            esencial.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cómo gestionar cookies en tu navegador</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            Puedes bloquear o eliminar cookies desde la configuración del
            navegador. Estas guías explican cómo hacerlo:
          </p>
          <ul className="list-disc pl-6 text-slate-700 space-y-2 leading-relaxed text-justify">
            <li>
              <a
                className="text-[#0A3D91] hover:underline"
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noreferrer"
              >
                Google Chrome
              </a>
            </li>
            <li>
              <a
                className="text-[#0A3D91] hover:underline"
                href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                target="_blank"
                rel="noreferrer"
              >
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a
                className="text-[#0A3D91] hover:underline"
                href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                target="_blank"
                rel="noreferrer"
              >
                Safari
              </a>
            </li>
            <li>
              <a
                className="text-[#0A3D91] hover:underline"
                href="https://support.microsoft.com/es-es/topic/eliminar-y-gestionar-cookies-168dab11-0753-043d-7c16-ede5947fc64d"
                target="_blank"
                rel="noreferrer"
              >
                Microsoft Edge
              </a>
            </li>
          </ul>
          <p className="text-slate-700 leading-relaxed text-justify">
            Ten en cuenta que, si bloqueas las cookies imprescindibles, el
            servicio puede dejar de funcionar correctamente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Actualizaciones</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            Revisamos este aviso cada vez que cambiamos el uso de cookies o
            incorporamos nuevos proveedores y publicamos la versión vigente en
            esta misma página.
          </p>
        </section>

        <div className="pt-6">
          <Link to="/" className="text-[#0A3D91] hover:underline">
            Volver a SimuPed
          </Link>
        </div>
      </main>
    </div>
  );
}
