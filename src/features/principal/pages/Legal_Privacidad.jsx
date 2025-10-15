import { Link } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";

export default function LegalPrivacidad() {
  const updatedAt = "15 de octubre de 2025";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 py-10 space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Política de privacidad</h1>
          <p className="text-slate-600 text-sm">Última actualización: {updatedAt}</p>
          <p className="text-slate-700 leading-relaxed text-justify">
            En SimuPed tratamos los datos personales conforme al RGPD y a la Ley
            Orgánica 3/2018. Aquí resumimos qué datos usamos, para qué y cómo
            ejercer tus derechos.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Responsable del tratamiento</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            SimuPed · contacto@simuped.com.
          </p>
          <p className="text-slate-700 leading-relaxed text-justify">
            Para consultas o derechos de protección de datos, escríbenos con el
            asunto “Protección de datos”.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Datos que tratamos</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            Los datos proceden del registro y del uso de la plataforma:
          </p>
          <ul className="list-disc pl-6 text-slate-700 space-y-2 leading-relaxed text-justify">
            <li>Identificación: nombre, apellidos, documento oficial.</li>
            <li>Contacto: email y datos facilitados en el registro.</li>
            <li>Perfil profesional: rol, unidad y áreas de interés.</li>
            <li>
              Uso de la plataforma: progreso, feedback, métricas y comunicaciones
              con el equipo de SimuPed.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Finalidades y legitimación</h2>
          <ul className="list-disc pl-6 text-slate-700 space-y-2 leading-relaxed text-justify">
            <li>
              Gestionar tu alta, acceso y participación en la plataforma (base
              legal: prestación del servicio solicitado).
            </li>
            <li>
              Ofrecer seguimiento formativo y métricas al equipo autorizado (base
              legal: relación contractual e interés legítimo en mejorar la
              calidad asistencial y docente).
            </li>
            <li>
              Enviar comunicaciones operativas sobre sesiones y cambios del
              servicio (base legal: interés legítimo en informar).
            </li>
            <li>
              Cumplir obligaciones legales y atender requerimientos (base legal:
              cumplimiento normativo).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Destinatarios y encargados</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            No cedemos datos a terceros salvo obligación legal. Contamos con
            proveedores que actúan como encargados, con contratos que aseguran la
            confidencialidad y las medidas necesarias. Actualmente el alojamiento
            y autenticación corre a cargo de Supabase (ver
            <a
              className="text-[#0A3D91] hover:underline ml-1"
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              su política de privacidad
            </a>
            ).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Conservación de los datos</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            Conservamos tu información mientras tengas acceso activo. Al causar
            baja bloqueamos los datos y los mantenemos solo el tiempo exigido por
            obligaciones legales o reclamaciones.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Tus derechos</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            Puedes ejercer acceso, rectificación, supresión, oposición,
            limitación y portabilidad escribiendo a contacto@simuped.com. Te
            solicitaremos la información necesaria para verificar tu identidad.
            Si consideras que el tratamiento no se ajusta al RGPD, puedes acudir
            a la Agencia Española de Protección de Datos.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cambios en la política</h2>
          <p className="text-slate-700 leading-relaxed text-justify">
            Revisamos esta política cuando añadimos nuevas funcionalidades o
            proveedores y publicamos la versión vigente en esta página.
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
