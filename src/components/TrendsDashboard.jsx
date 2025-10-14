import React, { useState, useMemo } from 'react';
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon,
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

// Analytics dashboard with trends and peer comparison
export default function TrendsDashboard({ userStats, peerData = [] }) {
  const [timeRange, setTimeRange] = useState('30d'); // '7d', '30d', '90d', '1y'

  // Sample data - in real implementation this would come from analytics API
  const trendData = useMemo(() => {
    const periods = {
      '7d': { label: 'Última semana', days: 7 },
      '30d': { label: 'Últimas 4 semanas', days: 30 },
      '90d': { label: 'Últimas 3 meses', days: 90 },
      '1y': { label: 'Último año', days: 365 }
    };

    const days = periods[timeRange].days;
    const now = new Date();

    // Generate sample trend data
    const trendPoints = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const baseScore = 75;
      const randomVariance = (Math.random() - 0.5) * 20;
      const improvement = (days - i) * 0.5; // Slight improvement over time

      trendPoints.push({
        date: date.toISOString().split('T')[0],
        score: Math.max(0, Math.min(100, baseScore + randomVariance + improvement)),
        attempts: Math.floor(Math.random() * 3) + 1,
        completed: Math.random() > 0.2
      });
    }

    const avgScore = trendPoints.reduce((sum, p) => sum + p.score, 0) / trendPoints.length;
    const totalAttempts = trendPoints.reduce((sum, p) => sum + p.attempts, 0);
    const recentAvg = trendPoints.slice(-7).reduce((sum, p) => sum + p.score, 0) / 7;
    const improvement = recentAvg - avgScore;

    return {
      trendPoints,
      avgScore,
      totalAttempts,
      improvement,
      period: periods[timeRange]
    };
  }, [timeRange]);

  // Calculate peer comparison data
  const peerComparison = useMemo(() => {
    if (!peerData.length) {
      // Generate sample peer data
      const samplePeers = [
        { score: 78, role: 'Medicina', label: 'Médicos' },
        { score: 82, role: 'Enfermería', label: 'Enfermería' },
        { score: 76, role: 'Farmacia', label: 'Farmacia' }
      ];
      return samplePeers;
    }
    return peerData;
  }, [peerData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Tendencias y análisis</h3>
          <p className="text-sm text-slate-600">Monitorea tu progreso y compáralo con colegas</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {[
            { key: '7d', label: '7 días' },
            { key: '30d', label: '30 días' },
            { key: '90d', label: '3 meses' },
            { key: '1y', label: '1 año' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeRange(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                timeRange === key
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Promedio general"
          value={`${Math.round(trendData.avgScore)}%`}
          change={Math.round(trendData.improvement * 10) / 10}
          icon={ChartBarIcon}
          trend={trendData.improvement > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Intentos totales"
          value={trendData.totalAttempts}
          change={null}
          icon={ClockIcon}
        />
        <MetricCard
          title="Mejora semanal"
          value={`${Math.round(trendData.improvement * 10) / 10}%`}
          change={trendData.improvement}
          icon={TrendingUpIcon}
          trend={trendData.improvement > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Ranking peer"
          value="Top 25%"
          change={null}
          icon={UsersIcon}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUpIcon className="h-5 w-5 text-blue-600" />
            <h4 className="text-base font-semibold text-slate-900">
              Evolución del rendimiento - {trendData.period.label}
            </h4>
          </div>

          <div className="h-64">
            <PerformanceChart data={trendData.trendPoints} />
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Muestra tu evolución de puntuación por día
          </div>
        </div>

        {/* Peer Comparison */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-4">
            <UsersIcon className="h-5 w-5 text-purple-600" />
            <h4 className="text-base font-semibold text-slate-900">
              Comparación con colegas
            </h4>
          </div>

          <PeerComparisonChart data={peerComparison} userScore={trendData.avgScore} />

          <div className="mt-4 space-y-2">
            {peerComparison.map((peer, index) => (
              <div key={peer.role} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{peer.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${peer.score}%` }}
                    />
                  </div>
                  <span className="text-slate-900 font-medium w-10 text-right">
                    {peer.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Datos agregados por especialidad
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <CalendarDaysIcon className="h-5 w-5 text-green-600" />
          <h4 className="text-base font-semibold text-slate-900">Actividad reciente</h4>
        </div>

        <RecentActivityFeed activities={[
          { type: 'scenario_complete', scenario: 'Caso Traumatismo Craneoencefálico', score: 88, date: 'Hace 2 días' },
          { type: 'badge_earned', badge: 'Respuesta de Emergencia', date: 'Hace 5 días' },
          { type: 'scenario_complete', scenario: 'Gestión de Shock Séptico', score: 92, date: 'Hace 1 semana' },
          { type: 'feedback_submitted', scenario: 'Caso de Neumonía Comunitaria', date: 'Hace 1 semana' }
        ]} />
      </div>
    </div>
  );
}

// Individual metric card
function MetricCard({ title, value, change, icon: Icon, trend }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 text-slate-600" />
        <div className="flex items-center gap-1">
          {change !== null && trend === 'up' && (
            <TrendingUpIcon className="h-4 w-4 text-green-600" />
          )}
          {change !== null && trend === 'down' && (
            <TrendingDownIcon className="h-4 w-4 text-red-600" />
          )}
          {change !== null && (
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-600'}`}>
              {change > 0 ? '+' : ''}{change}
            </span>
          )}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{title}</div>
    </div>
  );
}

// Simple SVG-based performance chart
function PerformanceChart({ data }) {
  const padding = 20;
  const width = 300;
  const height = 200;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-500">No hay datos disponibles</div>;
  }

  const scores = data.map(d => d.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore || 1;

  const points = data.map((d, i) => {
    const x = padding + (i * chartWidth) / (data.length - 1);
    const y = padding + chartHeight - ((d.score - minScore) * chartHeight) / range;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="w-full h-full">
      {/* Grid lines */}
      {[20, 40, 60, 80, 100].map(score => {
        const y = padding + chartHeight - ((score - minScore) * chartHeight) / range;
        return (
          <g key={score}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={5} y={y + 4} fontSize="10" fill="#64748b">{score}%</text>
          </g>
        );
      })}

      {/* Area under the line */}
      <polygon
        points={`${padding},${padding + chartHeight} ${points} ${width - padding},${padding + chartHeight}`}
        fill="rgba(99, 102, 241, 0.1)"
      />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {data.map((d, i) => {
        const x = padding + (i * chartWidth) / (data.length - 1);
        const y = padding + chartHeight - ((d.score - minScore) * chartHeight) / range;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill="#6366f1"
            className="hover:r-6"
            style={{ transition: 'r 0.2s' }}
          />
        );
      })}
    </svg>
  );
}

// Peer comparison chart
function PeerComparisonChart({ data, userScore }) {
  const maxScore = Math.max(...data.map(d => d.score), userScore, 100);
  const chartHeight = 120;

  return (
    <div className="space-y-4">
      {data.map((peer, index) => (
        <div key={peer.role} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{peer.label}</span>
            <span className="font-medium text-slate-900">{peer.score}%</span>
          </div>
          <div className="relative">
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${(peer.score / maxScore) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="border-t border-slate-200 pt-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-900 font-medium">Tu promedio</span>
          <span className="font-medium text-blue-600">{Math.round(userScore)}%</span>
        </div>
        <div className="relative">
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(userScore / maxScore) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Recent activity feed
function RecentActivityFeed({ activities }) {
  const getActivityIcon = (type) => {
    const icons = {
      scenario_complete: '🎯',
      badge_earned: '🏆',
      feedback_submitted: '💬',
      milestone_reached: '⭐'
    };
    return icons[type] || '📌';
  };

  const getActivityText = (activity) => {
    switch (activity.type) {
      case 'scenario_complete':
        return `${activity.scenario} - ${activity.score} puntos`;
      case 'badge_earned':
        return `Ganaste el logro "${activity.badge}"`;
      case 'feedback_submitted':
        return `Feedback enviado para ${activity.scenario}`;
      case 'milestone_reached':
        return activity.message;
      default:
        return activity.description || 'Actividad realizada';
    }
  };

  return (
    <div className="space-y-4">
      {activities.slice(0, 5).map((activity, index) => (
        <div key={index} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-b-0">
          <div className="text-xl">{getActivityIcon(activity.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-900">{getActivityText(activity)}</p>
            <p className="text-xs text-slate-500">{activity.date}</p>
          </div>
        </div>
      ))}

      {activities.length === 0 && (
        <p className="text-center text-slate-500 py-8">No hay actividad reciente</p>
      )}
    </div>
  );
}
