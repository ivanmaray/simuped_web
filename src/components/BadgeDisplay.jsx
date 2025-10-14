import React, { useState, useEffect } from 'react';
import { calculateBadgeProgress, getBadgeRecommendations, BADGE_CATEGORIES } from '../utils/badgeSystem';
import {
  TrophyIcon,
  StarIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { TrophyIcon as TrophySolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';

// Professional Badge Display Component
export default function BadgeDisplay({ userStats, userId, compact = false }) {
  const [badgeData, setBadgeData] = useState({
    earnedBadges: [],
    inProgressBadges: [],
    recommendations: []
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    if (userStats) {
      const { earnedBadges, inProgressBadges } = calculateBadgeProgress(userStats, {});
      const recommendations = getBadgeRecommendations(earnedBadges, inProgressBadges);

      setBadgeData({
        earnedBadges,
        inProgressBadges,
        recommendations
      });
    }
  }, [userStats]);

  if (compact) {
    return <CompactBadgeSummary earnedCount={badgeData.earnedBadges.length} />;
  }

  const filteredBadges = selectedCategory === 'all'
    ? badgeData.earnedBadges
    : badgeData.earnedBadges.filter(badge => badge.category === selectedCategory);

  const getCategoryIcon = (category) => {
    return BADGE_CATEGORIES[category]?.icon || '🏆';
  };

  return (
    <div className="w-full">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 grid place-items-center">
            <TrophySolid className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Sistema de Logros Médicos</h3>
            <p className="text-sm text-slate-600">
              {badgeData.earnedBadges.length} conquistados, {badgeData.inProgressBadges.length} en progreso
            </p>
          </div>
        </div>

        {/* Show recommendations toggle */}
        <button
          onClick={() => setShowRecommendations(!showRecommendations)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm"
        >
          <FireIcon className="h-4 w-4" />
          Próximos logros
        </button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            selectedCategory === 'all'
              ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Todos ({badgeData.earnedBadges.length})
        </button>
        {Object.entries(BADGE_CATEGORIES).map(([key, category]) => {
          const count = badgeData.earnedBadges.filter(b => b.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                selectedCategory === key
                  ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{category.icon}</span>
              {category.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Recommendations Panel */}
      {showRecommendations && badgeData.recommendations.length > 0 && (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-indigo-900 mb-3">
            <StarIcon className="h-4 w-4" />
            Próximos logros recomendados
          </h4>
          <div className="grid gap-3">
            {badgeData.recommendations.map(badge => (
              <RecommendationCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {/* Earned Badges Grid */}
      {filteredBadges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBadges.map(badge => (
            <EarnedBadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      ) : (
        <EmptyBadgeState selectedCategory={selectedCategory} />
      )}

      {/* Progress Badges Section */}
      {badgeData.inProgressBadges.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-slate-600" />
            Logros en progreso
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {badgeData.inProgressBadges.slice(0, 4).map(badge => (
              <ProgressBadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact summary for dashboard
function CompactBadgeSummary({ earnedCount }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 ring-1 ring-yellow-200">
      <TrophySolid className="h-4 w-4" />
      <span className="text-sm font-medium">{earnedCount} logros conquistados</span>
    </div>
  );
}

// Individual earned badge card
function EarnedBadgeCard({ badge }) {
  return (
    <div className={`relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all group ${badge.color}`}>
      <div className="absolute top-3 right-3">
        <CheckCircleIcon className="h-5 w-5 text-green-600 bg-white rounded-full" />
      </div>

      <div className="text-4xl mb-3 opacity-80">{badge.icon}</div>

      <h4 className="text-lg font-semibold text-slate-900 mb-1">{badge.title}</h4>
      <p className="text-sm text-slate-700 mb-3 leading-tight">{badge.description}</p>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="px-2 py-1 rounded bg-slate-100 text-slate-600">
          {badge.type}
        </span>
        <span>Conquistado</span>
      </div>

      {/* Medical context tooltip on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 to-slate-300 rounded-b-2xl opacity-50" />
    </div>
  );
}

// Progress badge card
function ProgressBadgeCard({ badge }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-3xl mb-3 opacity-70">{badge.icon}</div>

      <h4 className="text-lg font-semibold text-slate-900 mb-1">{badge.title}</h4>
      <p className="text-sm text-slate-600 mb-3 leading-tight">{badge.description}</p>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Progreso</span>
          <span>{Math.round(badge.progressValue)}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${badge.progressValue}%` }}
          />
        </div>
      </div>

      {/* Remaining requirements */}
      {badge.remaining?.length > 0 && (
        <div className="space-y-1">
          {badge.remaining.slice(0, 2).map((req, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
              <div className="h-1 w-1 bg-slate-400 rounded-full" />
              {req}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Recommendation card
function RecommendationCard({ badge }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-white/60 hover:bg-white/80 transition border border-white/50">
      <div className="text-2xl opacity-75">{badge.icon}</div>
      <div className="flex-1">
        <h5 className="font-medium text-indigo-900 text-sm">{badge.title}</h5>
        <p className="text-xs text-indigo-700">{badge.description}</p>
      </div>
      <div className="text-right">
        <div className="text-xs text-indigo-600">Progreso</div>
        <div className="text-sm font-semibold text-indigo-900">{Math.round(badge.progressValue)}%</div>
      </div>
      {badge.nextSteps?.length > 0 && (
        <div className="text-xs text-indigo-600">
          💡 {badge.nextSteps[0]}
        </div>
      )}
    </div>
  );
}

// Empty state
function EmptyBadgeState({ selectedCategory }) {
  const messages = {
    all: { title: "Aún no tienes logros conquistados", subtitle: "Completa simulaciones para desbloquear badges" },
    online: { title: "Ningún logro online conquistado", subtitle: "Practica con escenarios online para conseguir tu primer badge" },
    presencial: { title: "Ningún logro presencial conquistado", subtitle: "Únete a sesiones presenciales para comenzar" },
    achievement: { title: "Ningún logro de rendimiento conquistado", subtitle: "Mantén un desempeño consistente" },
    special: { title: "Ningún reconocimiento especial", subtitle: "Sigue participando para obtener badges especiales" }
  };

  const message = messages[selectedCategory] || messages.all;

  return (
    <div className="text-center py-12">
      <StarIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{message.title}</h3>
      <p className="text-slate-600">{message.subtitle}</p>
    </div>
  );
}
