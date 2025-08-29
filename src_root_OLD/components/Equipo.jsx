// src/components/Equipo.jsx
const BASE = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "") + "/";

const equipo = [
  { foto: "equipo/ivan-maray.jpg",   nombre: "Iván Maray",         rol: "Facultativo UGC Farmacia HUCA" },
  { foto: "equipo/andres-concha.jpg",nombre: "Andrés Concha",      rol: "Jefe UCI Pediátrica HUCA" },
  { foto: "equipo/laina-oyague.jpg", nombre: "Laina Oyague",        rol: "Residente UGC Farmacia HUCA" },
  { foto: "equipo/mateo-eiroa.jpg",  nombre: "Mateo Eiroa",         rol: "Residente UGC Farmacia HUCA" },
  { foto: "equipo/ana-vivanco.jpg",  nombre: "Ana Vivanco",         rol: "Facultativo UCI Pediátrica HUCA" },
  { foto: "equipo/sara-ovalle.jpg",  nombre: "Sara Ovalle",         rol: "Residente UCI Pediátrica HUCA" },
  { foto: "equipo/susana-perez.jpg", nombre: "Susana Pérez",        rol: "Supervisora UCI Pediátrica HUCA" },
  { foto: "equipo/ana-lozano.jpg",   nombre: "Ana Lozano",          rol: "Directora UGC Farmacia HUCA" },
];

function Grid({ items }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {items.map((m) => {
        const src = BASE + m.foto.replace(/^\//, "");
        return (
          <article
            key={m.nombre}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
          >
            <img
              src={src}
              alt={m.nombre}
              className="h-16 w-16 object-cover bg-slate-200"
              onError={(e) => {
                // Si no encuentra la imagen, muestra un círculo gris
                e.currentTarget.style.display = "none";
              }}
            />
            <div>
              <h3 className="text-xl font-semibold text-slate-900 leading-tight">{m.nombre}</h3>
              <p className="text-slate-600">{m.rol}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function Equipo() {
  return (
    <div className="py-0">
      <Grid items={equipo} />
    </div>
  );
}