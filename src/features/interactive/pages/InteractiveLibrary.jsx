import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../../components/Navbar.jsx";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const handleRandomCase = () => {
    const pool = visibleCases.filter((scenario) => scenario.status !== "locked");
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) {
      navigate(`/entrenamiento-interactivo/${pick.id}`);
    }
  };

  const hasUnlocked = visibleCases.some((scenario) => scenario.status !== "locked");

  // Contar casos por categoría
  const casesByCategory = useMemo(() => {
    const counts = {};
    interactiveCases.forEach((scenario) => {
      (scenario.categoryIds || []).forEach((catId) => {
        counts[catId] = (counts[catId] || 0) + 1;
      });
    });
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar variant="private" />

      {/* Hero - Simplificado */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]">
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-7xl mx-auto px-5 py-10 text-white relative">
          <div>
            <p className="text-white/70 text-sm uppercase tracking-wide">Entrenamiento interactivo</p>
            <h1 className="text-3xl md:text-4xl font-semibold mt-2">Simulaciones guiadas con feedback inmediato</h1>
            <p className="opacity-90 mt-2 text-base max-w-2xl">
              Navega por bibliotecas de casos, elige un escenario y sumate a un circuito de práctica donde cada decisión actualiza los sistemas del paciente en tiempo real.
            </p>
          </div>
        </div>
      </section>

      {/* Main layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "w-64" : "w-0"} bg-white border-r border-slate-200 transition-all duration-300 overflow-y-auto flex-shrink-0`}>
          {sidebarOpen && (
            <div className="p-5 space-y-6">
              {/* Tabs */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500 px-2">Filtrar por tipo</p>
                {interactiveTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "bg-blue-100 text-[#0A3D91]"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Categorías */}
              {activeTab !== CATEGORY_TYPES.ALL && tabCategories.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-semibold uppercase text-slate-500 px-2">Categorías</p>
                  {tabCategories.map((category) => {
                    const count = casesByCategory[category.id] || 0;
                    const isActive = selectedCategoryId === category.id;
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategoryId(category.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          isActive
                            ? "bg-blue-100 text-[#0A3D91] font-semibold"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{category.shortLabel} {category.label}</span>
                          <span className="text-xs bg-slate-200 px-2 py-1 rounded-full flex-shrink-0">{count}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Random case */}
              <div className="border-t pt-4">
                <button
                  onClick={handleRandomCase}
                  disabled={!hasUnlocked}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition ${
                    hasUnlocked
                      ? "bg-[#0A3D91] text-white hover:opacity-90"
                      : "cursor-not-allowed bg-slate-200 text-slate-400"
                  }`}
                >
                  Caso aleatorio
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="max-w-5xl mx-auto px-5 py-8 w-full">
            {/* Header con toggle sidebar */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {activeTab === CATEGORY_TYPES.ALL
                  ? "Todos los casos"
                  : selectedCategoryId
                  ? tabCategories.find((cat) => cat.id === selectedCategoryId)?.label || "Casos"
                  : "Selecciona una categoría"}
              </h2>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar caso, técnica o palabra clave..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0A3D91]/50"
                />
                <svg className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Casos */}
            {visibleCases.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600">
                No hay escenarios disponibles. Intenta otra búsqueda o categoría.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {visibleCases.map((scenario) => (
                  <ScenarioCard key={scenario.id} scenario={scenario} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
