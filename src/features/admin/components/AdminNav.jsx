import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/admin", label: "Usuarios", end: true },
  { to: "/admin/escenarios", label: "Escenarios online" },
  { to: "/admin/escenarios-presenciales", label: "Escenarios presenciales" },
];

function tabClasses(isActive) {
  return [
    "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
    isActive
      ? "bg-slate-900 text-white shadow"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
  ].join(" ");
}

export default function AdminNav() {
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => tabClasses(isActive)}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
