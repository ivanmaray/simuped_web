import React from "react";
import { useNavigate } from "react-router-dom";
import { formatLevel } from "../../../utils/formatUtils.js";

const LEVEL_TONE = {
  basico: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medio: "bg-amber-50 text-amber-700 border-amber-200",
  intermedio: "bg-amber-50 text-amber-700 border-amber-200",
  avanzado: "bg-red-50 text-red-700 border-red-200",
  experto: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_CONFIG = {
  free: {
    badge: "Acceso libre",
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    button: {
      label: "Iniciar caso",
      variant: "bg-[#0A3D91] text-white hover:bg-[#0A3D91]/90"
    }
  },
  locked: {
    badge: "Suscripcion requerida",
    tone: "text-slate-500 bg-slate-100 border-slate-200",
    button: {
      label: "Ver opciones",
      variant: "bg-slate-900 text-white hover:bg-slate-800"
    }
  }
};

export default function ScenarioCard({ scenario }) {
  const navigate = useNavigate();
  const status = STATUS_CONFIG[scenario.status] || STATUS_CONFIG.locked;
  const levelKey = scenario.level ? String(scenario.level).trim().toLowerCase() : null;
  const levelLabel = levelKey ? formatLevel(levelKey) : "";

  function handleAction() {
    if (scenario.status === "locked") {
      navigate("/entrenamiento-interactivo", { replace: false, state: { highlightCase: scenario.id } });
      return;
    }
    navigate(`/entrenamiento-interactivo/${scenario.id}`);
  }

  return (
    <article
      data-scenario={scenario.id}
      className="relative flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-[0_24px_48px_-32px_rgba(10,61,145,0.35)]"
    >
      {scenario.status === "locked" ? (
        <div className="absolute right-6 top-6 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          Bloqueado
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-slate-900">{scenario.title}</h3>
          {scenario.subtitle ? <p className="text-sm text-slate-500">{scenario.subtitle}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {levelLabel ? (
            <span className={`rounded-full border px-3 py-1 font-semibold ${LEVEL_TONE[levelKey] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
              Nivel {levelLabel}
            </span>
          ) : null}
          {scenario.duration ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">{scenario.duration}</span>
          ) : null}
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${status.tone}`}>
            {status.badge}
          </span>
        </div>

        {scenario.summary ? (
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{scenario.summary}</p>
        ) : null}

        {scenario.tags?.length ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {scenario.tags.map((tag) => (
              <span
                key={`${scenario.id}-${tag}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={handleAction}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${status.button.variant}`}
        >
          {status.button.label}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" strokeLinecap="round" />
            <path d="m12 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {scenario.status === "locked" ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            Contenido premium. Solicita acceso a tu coordinador o suscribete para desbloquearlo.
          </p>
        ) : null}
      </div>
    </article>
  );
}
