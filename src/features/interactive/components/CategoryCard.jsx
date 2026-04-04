import React from "react";

const STATE_LABEL = {
  free: { text: "Disponible", tone: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  locked: { text: "Requiere suscripcion", tone: "text-slate-500 bg-slate-100 border-slate-200" }
};

export default function CategoryCard({ category, isActive, onSelect }) {
  const badge = STATE_LABEL[category.state] || STATE_LABEL.locked;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(category)}
      className={`card-modern w-full rounded-lg border p-5 text-left transition ${
        isActive
          ? "border-[#0A3D91] bg-blue-50 shadow-md"
          : "border-slate-200 hover:border-[#0A3D91]/50"
      } bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3D91]/70 focus-visible:ring-offset-2`}
      style={isActive ? { borderLeft: '4px solid #0A3D91' } : { borderLeft: '4px solid transparent' }}
    >
      <div className="flex items-start gap-4">
        <div
          className={`icon-box h-14 w-14 shrink-0 rounded-lg border text-lg font-semibold grid place-items-center transition ${
            isActive ? "border-[#0A3D91] text-[#0A3D91] bg-blue-100" : "border-slate-200 text-slate-600 bg-slate-100"
          }`}
        >
          {category.shortLabel}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{category.type === "unit" ? "Unidad" : "Especialidad"}</span>
            <h3 className="text-lg font-semibold text-slate-900">{category.label}</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{category.description}</p>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badge.tone}`}>
            {badge.text}
          </span>
        </div>
      </div>
    </button>
  );
}
