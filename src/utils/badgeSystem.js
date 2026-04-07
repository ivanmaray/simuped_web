// Sistema de logros basado en métricas disponibles hoy en SimuPed.

const ROLE_ALIASES = {
  medico: ['medico', 'médico', 'doctor', 'facultativo'],
  enfermeria: ['enfermeria', 'enfermería', 'nurse'],
  farmacia: ['farmacia', 'farmaceutico', 'farmacéutico', 'pharmacist'],
  dual_leader: ['instructor', 'leader', 'lider', 'líder'],
  dual_collaborator: ['alumno', 'student', 'participante', 'team_member', 'equipo']
};

export const MEDICAL_BADGES = {
  ONLINE_FIRST_ATTEMPT: {
    id: 'online_first_attempt',
    title: 'Inicio en simulación online',
    description: 'Completa tu primera simulación online',
    icon: '💻',
    category: 'online',
    type: 'milestone',
    requirements: { onlineAttempts: 1 },
    color: 'bg-green-500 text-white'
  },
  PRESENCIAL_FIRST_ATTEMPT: {
    id: 'presencial_first_attempt',
    title: 'Inicio en simulación presencial',
    description: 'Completa tu primera simulación presencial',
    icon: '🤝',
    category: 'presencial',
    type: 'milestone',
    requirements: { presencialAttempts: 1 },
    color: 'bg-blue-500 text-white'
  },
  MEDICO_FIRST_CASE: {
    id: 'role_medico_first_case',
    title: 'Práctica en rol médico',
    description: 'Completa 1 simulación con rol médico',
    icon: '🩺',
    category: 'achievement',
    type: 'role',
    requirements: { role: 'medico', count: 1 },
    color: 'bg-indigo-500 text-white'
  },
  ENFERMERIA_FIRST_CASE: {
    id: 'role_enfermeria_first_case',
    title: 'Práctica en rol enfermería',
    description: 'Completa 1 simulación con rol enfermería',
    icon: '🧑‍⚕️',
    category: 'achievement',
    type: 'role',
    requirements: { role: 'enfermeria', count: 1 },
    color: 'bg-cyan-500 text-white'
  },
  FARMACIA_FIRST_CASE: {
    id: 'role_farmacia_first_case',
    title: 'Práctica en rol farmacia',
    description: 'Completa 1 simulación con rol farmacia',
    icon: '💊',
    category: 'achievement',
    type: 'role',
    requirements: { role: 'farmacia', count: 1 },
    color: 'bg-teal-500 text-white'
  },
  EXCELLENCE_STREAK_3: {
    id: 'excellence_streak_3',
    title: 'Desempeño sostenido',
    description: 'Consigue 3 intentos seguidos con nota ≥85',
    icon: '🔥',
    category: 'achievement',
    type: 'performance',
    requirements: { scoreStreak: 3, minScore: 85 },
    color: 'bg-amber-500 text-white'
  },
  CLINICAL_CONSISTENCY: {
    id: 'clinical_consistency_10_80',
    title: 'Consistencia clínica',
    description: 'Mantén promedio ≥80 en 10 simulaciones',
    icon: '⭐',
    category: 'achievement',
    type: 'performance',
    requirements: { totalAttempts: 10, avgScore: 80 },
    color: 'bg-yellow-500 text-yellow-900'
  },
  HIGH_PERFORMANCE: {
    id: 'high_performance_20_85',
    title: 'Alto rendimiento',
    description: 'Mantén promedio ≥85 en 20 simulaciones',
    icon: '🏆',
    category: 'achievement',
    type: 'performance',
    requirements: { totalAttempts: 20, avgScore: 85 },
    color: 'bg-orange-500 text-white'
  },
  CATEGORY_EXPLORER: {
    id: 'category_explorer_5',
    title: 'Cobertura clínica inicial',
    description: 'Participa en 5 categorías distintas',
    icon: '🧭',
    category: 'special',
    type: 'exploration',
    requirements: { categories: 5 },
    color: 'bg-fuchsia-500 text-white'
  },
  CATEGORY_MASTER: {
    id: 'category_master_8',
    title: 'Cobertura clínica avanzada',
    description: 'Participa en 8 categorías distintas',
    icon: '🧠',
    category: 'special',
    type: 'exploration',
    requirements: { categories: 8 },
    color: 'bg-purple-600 text-white'
  },
  DUAL_LEADER: {
    id: 'dual_leader_3',
    title: 'Coordinación dual',
    description: 'Participa en 3 sesiones duales como instructor/líder',
    icon: '🎛️',
    category: 'presencial',
    type: 'role',
    requirements: { dualRole: 'dual_leader', count: 3 },
    color: 'bg-sky-600 text-white'
  },
  DUAL_COLLABORATOR: {
    id: 'dual_collaborator_3',
    title: 'Participación dual',
    description: 'Participa en 3 sesiones duales como alumno/equipo',
    icon: '👥',
    category: 'presencial',
    type: 'role',
    requirements: { dualRole: 'dual_collaborator', count: 3 },
    color: 'bg-emerald-600 text-white'
  }
};

export const BADGE_CATEGORIES = {
  online: { label: 'Simulaciones Online', icon: '💻', order: 1 },
  presencial: { label: 'Simulaciones Presenciales', icon: '🤝', order: 2 },
  achievement: { label: 'Logros de Rendimiento', icon: '🎖️', order: 3 },
  special: { label: 'Exploración y participación', icon: '✨', order: 4 }
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getTotalAttempts(userStats) {
  return (userStats?.onlineAttempted || 0) + (userStats?.presencialAttempted || 0);
}

function getRolesPlayed(userStats) {
  const fromRolesPlayed = Array.isArray(userStats?.rolesPlayed) ? userStats.rolesPlayed : [];
  const fromProfileRole = userStats?.role ? [userStats.role] : [];
  return [...fromRolesPlayed, ...fromProfileRole].map(normalizeText).filter(Boolean);
}

function countRoleMatches(userStats, roleKey) {
  const roleAliases = ROLE_ALIASES[roleKey] || [];
  const roles = getRolesPlayed(userStats);
  return roles.filter((role) => roleAliases.some((alias) => role.includes(alias))).length;
}

function countDualRoleMatches(userStats, roleKey) {
  const roleAliases = ROLE_ALIASES[roleKey] || [];
  const roles = Array.isArray(userStats?.presencialRoles) ? userStats.presencialRoles : [];
  return roles
    .map(normalizeText)
    .filter((role) => roleAliases.some((alias) => role.includes(alias)))
    .length;
}

function getDistinctCategoryCount(userStats) {
  const attempts = Array.isArray(userStats?.scenarioAttempts) ? userStats.scenarioAttempts : [];
  const categories = new Set();

  for (const attempt of attempts) {
    const list = [
      ...(Array.isArray(attempt?.categories) ? attempt.categories : []),
      ...(Array.isArray(attempt?.scenario_categories) ? attempt.scenario_categories : []),
      attempt?.category,
      attempt?.scenario_category
    ];
    for (const value of list) {
      const normalized = normalizeText(value);
      if (normalized) categories.add(normalized);
    }
  }

  return categories.size;
}

function getScoreStreak(userStats, minScore) {
  const attempts = Array.isArray(userStats?.scenarioAttempts) ? [...userStats.scenarioAttempts] : [];
  const withScore = attempts.filter((attempt) => Number.isFinite(Number(attempt?.score)));
  if (withScore.length === 0) return 0;

  withScore.sort((a, b) => {
    const aTime = new Date(a?.started_at || a?.finished_at || 0).getTime();
    const bTime = new Date(b?.started_at || b?.finished_at || 0).getTime();
    return aTime - bTime;
  });

  let current = 0;
  let best = 0;
  for (const attempt of withScore) {
    if (Number(attempt.score) >= minScore) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

// Badge Progress Calculator
export function calculateBadgeProgress(userStats, userProfile) {
  const earnedBadges = [];
  const inProgressBadges = [];

  Object.values(MEDICAL_BADGES).forEach((badge) => {
    const progress = getBadgeProgress(badge, userStats, userProfile);
    if (progress.earned) {
      earnedBadges.push({
        ...badge,
        earnedDate: progress.earnedDate,
        progressValue: 100
      });
      return;
    }

    inProgressBadges.push({
      ...badge,
      progressValue: Math.min(progress.progress * 100, 99),
      remaining: progress.remaining
    });
  });

  return { earnedBadges, inProgressBadges };
}

function getBadgeProgress(badge, userStats) {
  const progress = {
    earned: false,
    progress: 0,
    remaining: [],
    earnedDate: null
  };

  const totalAttempts = getTotalAttempts(userStats);
  const avgScore = Number(userStats?.totalAvgScore || 0);

  switch (badge.id) {
    case 'online_first_attempt': {
      const count = userStats?.onlineAttempted || 0;
      progress.earned = count >= 1;
      progress.progress = Math.min(count / 1, 1);
      if (!progress.earned) progress.remaining = ['Completa 1 simulación online'];
      break;
    }
    case 'presencial_first_attempt': {
      const count = userStats?.presencialAttempted || 0;
      progress.earned = count >= 1;
      progress.progress = Math.min(count / 1, 1);
      if (!progress.earned) progress.remaining = ['Completa 1 simulación presencial'];
      break;
    }
    case 'role_medico_first_case': {
      const count = countRoleMatches(userStats, 'medico');
      progress.earned = count >= 1;
      progress.progress = Math.min(count / 1, 1);
      if (!progress.earned) progress.remaining = ['Completa una simulación con rol médico'];
      break;
    }
    case 'role_enfermeria_first_case': {
      const count = countRoleMatches(userStats, 'enfermeria');
      progress.earned = count >= 1;
      progress.progress = Math.min(count / 1, 1);
      if (!progress.earned) progress.remaining = ['Completa una simulación con rol enfermería'];
      break;
    }
    case 'role_farmacia_first_case': {
      const count = countRoleMatches(userStats, 'farmacia');
      progress.earned = count >= 1;
      progress.progress = Math.min(count / 1, 1);
      if (!progress.earned) progress.remaining = ['Completa una simulación con rol farmacia'];
      break;
    }
    case 'excellence_streak_3': {
      const streak = getScoreStreak(userStats, 85);
      progress.earned = streak >= 3;
      progress.progress = Math.min(streak / 3, 1);
      if (!progress.earned) progress.remaining = [`Lleva tu racha a 3 intentos seguidos con nota ≥85 (actual ${streak}/3)`];
      break;
    }
    case 'clinical_consistency_10_80': {
      const meetsScore = avgScore >= 80;
      progress.earned = totalAttempts >= 10 && meetsScore;
      progress.progress = meetsScore ? Math.min(totalAttempts / 10, 1) : Math.min(avgScore / 80, 1);
      if (!progress.earned) {
        if (!meetsScore) progress.remaining = [`Sube tu promedio clínico a 80 (actual ${avgScore.toFixed(1)})`];
        else progress.remaining = [`Faltan ${Math.max(10 - totalAttempts, 0)} simulaciones`];
      }
      break;
    }
    case 'high_performance_20_85': {
      const meetsScore = avgScore >= 85;
      progress.earned = totalAttempts >= 20 && meetsScore;
      progress.progress = meetsScore ? Math.min(totalAttempts / 20, 1) : Math.min(avgScore / 85, 1);
      if (!progress.earned) {
        if (!meetsScore) progress.remaining = [`Sube tu promedio clínico a 85 (actual ${avgScore.toFixed(1)})`];
        else progress.remaining = [`Faltan ${Math.max(20 - totalAttempts, 0)} simulaciones`];
      }
      break;
    }
    case 'category_explorer_5': {
      const count = getDistinctCategoryCount(userStats);
      progress.earned = count >= 5;
      progress.progress = Math.min(count / 5, 1);
      if (!progress.earned) progress.remaining = [`Participa en ${Math.max(5 - count, 0)} categoría(s) más`];
      break;
    }
    case 'category_master_8': {
      const count = getDistinctCategoryCount(userStats);
      progress.earned = count >= 8;
      progress.progress = Math.min(count / 8, 1);
      if (!progress.earned) progress.remaining = [`Participa en ${Math.max(8 - count, 0)} categoría(s) más`];
      break;
    }
    case 'dual_leader_3': {
      const count = countDualRoleMatches(userStats, 'dual_leader');
      progress.earned = count >= 3;
      progress.progress = Math.min(count / 3, 1);
      if (!progress.earned) progress.remaining = [`Faltan ${Math.max(3 - count, 0)} sesión(es) dual como instructor/líder`];
      break;
    }
    case 'dual_collaborator_3': {
      const count = countDualRoleMatches(userStats, 'dual_collaborator');
      progress.earned = count >= 3;
      progress.progress = Math.min(count / 3, 1);
      if (!progress.earned) progress.remaining = [`Faltan ${Math.max(3 - count, 0)} sesión(es) dual como alumno/equipo`];
      break;
    }
    default:
      break;
  }

  return progress;
}

// Badge Recommendations for User Engagement
export function getBadgeRecommendations(earnedBadges, inProgressBadges) {
  const sorted = [...inProgressBadges].sort((a, b) => b.progressValue - a.progressValue);
  return sorted.slice(0, 3).map((badge) => ({
    ...badge,
    nextSteps: getNextStepsForBadge(badge)
  }));
}

function getNextStepsForBadge(badge) {
  const tips = {
    online_first_attempt: ['Inicia una simulación online desde la plataforma'],
    presencial_first_attempt: ['Inicia una simulación presencial'],
    role_medico_first_case: ['Completa un caso con rol médico'],
    role_enfermeria_first_case: ['Completa un caso con rol enfermería'],
    role_farmacia_first_case: ['Completa un caso con rol farmacia'],
    excellence_streak_3: ['Busca 3 intentos consecutivos con nota alta'],
    clinical_consistency_10_80: ['Acumula más casos manteniendo promedio ≥80'],
    high_performance_20_85: ['Aumenta volumen y sostén promedio ≥85'],
    category_explorer_5: ['Explora escenarios de distintas categorías'],
    category_master_8: ['Amplía tu cobertura de categorías clínicas'],
    dual_leader_3: ['Participa como instructor/líder en sesiones duales'],
    dual_collaborator_3: ['Participa como alumno/equipo en sesiones duales']
  };

  return tips[badge.id] || ['Continúa practicando'];
}

// Calculate user impact score
export function calculateUserImpact(userStats) {
  let impact = 0;
  const totalAttempts = getTotalAttempts(userStats);
  const roleDiversity = new Set(getRolesPlayed(userStats)).size;
  const categoryDiversity = getDistinctCategoryCount(userStats);
  const avgScore = Number(userStats?.totalAvgScore || 0);

  impact += totalAttempts * 10;
  impact += roleDiversity * 20;
  impact += categoryDiversity * 10;

  if (avgScore >= 90) impact += 120;
  else if (avgScore >= 85) impact += 80;
  else if (avgScore >= 80) impact += 40;

  return Math.round(impact);
}
