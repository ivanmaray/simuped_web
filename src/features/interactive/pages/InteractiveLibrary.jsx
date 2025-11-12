import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";
import CategoryCard from "../components/CategoryCard.jsx";
import ScenarioCard from "../components/ScenarioCard.jsx";
import {
  CATEGORY_TYPES,
  interactiveTabs,
  interactiveCategories,
  interactiveCases,
  getInteractiveCasesByCategory
} from "../../../utils/interactiveTrainingData.js";

function filterCases(cases, term) {
  if (!term) return cases;
  const normalized = term.trim().toLowerCase();
  if (!normalized) return cases;
  return cases.filter((scenario) => {
    const tagText = (scenario.tags || []).join(" ");
    const categoryText = (scenario.categoryIds || [])
      .map((id) => interactiveCategories.find((category) => category.id === id)?.label || "")
      .join(" ");
    const pool = [scenario.title, scenario.subtitle, scenario.summary, tagText, categoryText]
      .join(" ")
      .toLowerCase();
    return pool.includes(normalized);
  });
}

export default function InteractiveLibrary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(CATEGORY_TYPES.UNIT);
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    const firstUnit = interactiveCategories.find((category) => category.type === CATEGORY_TYPES.UNIT);
    return firstUnit?.id ?? null;
  });
  const [search, setSearch] = useState("");

  const tabCategories = useMemo(() => {
    if (activeTab === CATEGORY_TYPES.ALL) return interactiveCategories;
    return interactiveCategories.filter((category) => category.type === activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === CATEGORY_TYPES.ALL) {
      setSelectedCategoryId(null);
      return;
    }
    if (tabCategories.length === 0) {
      setSelectedCategoryId(null);
      return;
    }
    const contains = tabCategories.some((category) => category.id === selectedCategoryId);
    if (!contains) {
      setSelectedCategoryId(tabCategories[0].id);
    }
  }, [activeTab, tabCategories, selectedCategoryId]);

  useEffect(() => {
    const highlightId = location.state?.highlightCase;
    if (!highlightId) return;
    const match = interactiveCases.find((scenario) => scenario.id === highlightId);
    if (!match) return;
    setActiveTab(CATEGORY_TYPES.ALL);
    setTimeout(() => {
      const element = document.querySelector(`[data-scenario="${highlightId}"]`);
      if (element) {
        element.classList.add("ring", "ring-[#0A3D91]", "ring-offset-2");
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => element.classList.remove("ring", "ring-[#0A3D91]", "ring-offset-2"), 1500);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }, 80);
  }, [location.pathname, location.state, navigate]);

  const visibleCases = useMemo(() => {
    const sortCases = (cases) => {
      return [...cases].sort((a, b) => {
        if (a.status === b.status) {
          return a.title.localeCompare(b.title);
        }
        return a.status === "free" ? -1 : 1;
      });
    };
    if (activeTab === CATEGORY_TYPES.ALL) {
      return sortCases(filterCases(interactiveCases, search));
    }
    if (!selectedCategoryId) return [];
    const cases = getInteractiveCasesByCategory(selectedCategoryId);
    return sortCases(filterCases(cases, search));
  }, [activeTab, selectedCategoryId, search]);

  function handleRandomCase() {
    const pool = visibleCases.filter((scenario) => scenario.status !== "locked");
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) {
      navigate(`/entrenamiento-interactivo/${pick.id}`);
    }
  }

  const hasUnlocked = visibleCases.some((scenario) => scenario.status !== "locked");

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar variant="private" />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-6xl mx-auto px-5 py-12 text-white relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-white/70 text-sm uppercase tracking-wide">Entrenamiento interactivo</p>
              <span className="mt-2 inline-flex flex-col items-center rounded-full border border-white/40 bg-white/20 px-3 py-1 text-center text-xs font-semibold uppercase leading-tight tracking-[0.2em] text-white/80">
                <span>No disponible</span>
                <span>para alumnos</span>
              </span>
              <h1 className="text-3xl md:text-4xl font-semibold mt-1">Simulaciones guiadas con feedback inmediato</h1>
              <p className="opacity-95 mt-3 text-lg max-w-xl">
                Navega por bibliotecas de casos, elige un escenario y sumate a un circuito de practica donde cada decision actualiza los sistemas del paciente en tiempo real.
              </p>
            </div>
            <div className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">Panel de busqueda</h2>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar caso, tecnica o palabra clave"
                    className="w-full rounded-2xl border border-white/40 bg-white/20 px-4 py-3 text-sm text-white placeholder:text-white/70 focus:border-white focus:outline-none"
                  />
                  <svg className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-xs text-white/75">
                  Usa filtros rapidos por unidad o especialidad. Cada categoria resalta el caso destacado para comenzar.
                </p>
                <button
                  type="button"
                  onClick={handleRandomCase}
                  disabled={!hasUnlocked}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    hasUnlocked
                      ? "bg-white/90 text-[#0A3D91] hover:bg-white"
                      : "cursor-not-allowed bg-white/40 text-white/70"
                  }`}
                >
                  {hasUnlocked ? "Caso aleatorio disponible" : "Sin casos disponibles para iniciar"}
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5" strokeLinecap="round" />
                    <path d="m12 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-5 py-8">

        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {interactiveTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-[#0A3D91] bg-[#0A3D91] text-white shadow"
                      : "border-slate-200 bg-white text-slate-600 hover:border-[#0A3D91]/40"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab !== CATEGORY_TYPES.ALL ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tabCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isActive={selectedCategoryId === category.id}
                  onSelect={(item) => setSelectedCategoryId(item.id)}
                />
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {activeTab === CATEGORY_TYPES.ALL
                ? "Todos los casos disponibles"
                : selectedCategoryId
                ? `Casos vinculados a ${tabCategories.find((cat) => cat.id === selectedCategoryId)?.label || "la categoria"}`
                : "Selecciona una categoria"}
            </h2>
            <span className="text-sm text-slate-500">{visibleCases.length} casos</span>
          </div>

          {visibleCases.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600">
              No hay escenarios visibles con el filtro actual. Ajusta la busqueda o selecciona otra categoria.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {visibleCases.map((scenario) => (
                <ScenarioCard key={scenario.id} scenario={scenario} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
