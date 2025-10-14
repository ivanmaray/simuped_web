// Gamification: Badge & Milestone System for Medical Professionals
// Designed for SimuPed platform with focus on continuous learning and clinical excellence

export const MEDICAL_BADGES = {
  // Online Simulation Badges - Specific Medical Scenarios
  ONLINE_FIRST_SIMULATION: {
    id: 'online_first_simulation',
    title: 'Primer Pasos Clínicos',
    description: 'Completa tu primera simulación online',
    icon: '🎯',
    category: 'online',
    type: 'milestone',
    medicalContext: 'Inicial exploration of clinical environments',
    requirements: { onlineAttempts: 1 },
    color: 'bg-green-500 text-white'
  },

  ONLINE_EMERGENCY_RESPONSE: {
    id: 'online_emergency_response',
    title: 'Respuesta de Emergencia',
    description: 'Maneja 3 casos de emergencia pediátrica',
    icon: '🚑',
    category: 'online',
    type: 'scenario',
    medicalContext: 'Pediatric emergency management',
    requirements: { onlineAttempts: 3, scenarioTypes: ['emergency'] },
    color: 'bg-red-500 text-white'
  },

  ONLINE_CRITICAL_CARE_MASTER: {
    id: 'online_critical_care',
    title: 'Maestro en Cuidados Críticos',
    description: 'Completa 5 simulaciones de cuidados intensivos',
    icon: '🏥',
    category: 'online',
    type: 'scenario',
    medicalContext: 'Critical care and ICU management',
    requirements: { onlineAttempts: 5, scenarioTypes: ['critical_care'] },
    color: 'bg-blue-500 text-white'
  },

  // Presencial (Dual/Classic) Badges - Team Collaboration
  PRESENCIAL_TEAM_COLLAB: {
    id: 'presencial_team_leader',
    title: 'Líder del Equipo',
    description: 'Participa en 3 simulaciones presenciales como líder',
    icon: '👨‍⚕️',
    category: 'presencial',
    type: 'role',
    medicalContext: 'Interprofessional leadership',
    requirements: { presencialAttempts: 3, roles: ['instructor', 'leader'] },
    color: 'bg-purple-500 text-white'
  },

  PRESENCIAL_MEDICATION_SAFETY: {
    id: 'presencial_med_safety',
    title: 'Seguridad en Farmacia',
    description: 'Supera 5 simulaciones con protocolos de prescripción',
    icon: '💊',
    category: 'presencial',
    type: 'expertise',
    medicalContext: 'Medication safety and prescription protocols',
    requirements: { presencialAttempts: 5, checkListAccuracy: 90 },
    color: 'bg-teal-500 text-white'
  },

  // Achievement Level Badges - Based on Total Performance
  PROFESIONAL_CONSISTENTE: {
    id: 'profesional_consistente',
    title: 'Profesional Consistente',
    description: 'Mantiene promedio >80% en 10 simulaciones',
    icon: '⭐',
    category: 'achievement',
    type: 'performance',
    medicalContext: 'Clinical excellence and consistency',
    requirements: { totalAttempts: 10, avgScore: 80 },
    color: 'bg-yellow-500 text-yellow-900'
  },

  MAESTRO_INTERDISCIPLINAR: {
    id: 'maestro_interdisciplinar',
    title: 'Maestro Interdisciplinar',
    description: 'Excelencia en medicina, enfermería y farmacia',
    icon: '🏆',
    category: 'achievement',
    type: 'expertise',
    medicalContext: 'Interdisciplinary clinical mastery',
    requirements: { rolesDiverse: 3, performanceScore: 85 },
    color: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
  },

  PEDiatra_COMMITTED: {
    id: 'pediatra_committed',
    title: 'Pediatra Comprometido',
    description: 'Completa 20 simulaciones con mejora continua',
    icon: '🩺',
    category: 'achievement',
    type: 'dedication',
    medicalContext: 'Commitment to pediatric care excellence',
    requirements: { totalAttempts: 20, improvementRate: 5 },
    color: 'bg-blue-600 text-white'
  },

  // Special Recognition Badges - Innovative Features
  EARLY_ADOPTER: {
    id: 'early_adopter',
    title: 'Innovador Temprano',
    description: 'Primer usuario en probar nuevas funcionalidades',
    icon: '🌟',
    category: 'special',
    type: 'recognition',
    medicalContext: 'Technology adoption for medical education',
    requirements: { platformAdoption: true, feedbackProvided: 3 },
    color: 'bg-pink-500 text-white'
  },

  FEEDBACK_CHAMPION: {
    id: 'feedback_champion',
    title: 'Campeón de Retroalimentación',
    description: 'Proporciona feedback detallado en simulaciones',
    icon: '💬',
    category: 'special',
    type: 'engagement',
    medicalContext: 'Active contribution to teaching quality',
    requirements: { feedbackCount: 10, feedbackQuality: 4.5 },
    color: 'bg-indigo-500 text-white'
  }
};

export const BADGE_CATEGORIES = {
  online: { label: 'Simulaciones Online', icon: '💻', order: 1 },
  presencial: { label: 'Simulaciones Presenciales', icon: '🤝', order: 2 },
  achievement: { label: 'Logros de Rendimiento', icon: '🎖️', order: 3 },
  special: { label: 'Reconocimientos Especiales', icon: '✨', order: 4 }
};

// Badge Progress Calculator
export function calculateBadgeProgress(userStats, userProfile) {
  const earnedBadges = [];
  const inProgressBadges = [];

  Object.values(MEDICAL_BADGES).forEach(badge => {
    const progress = getBadgeProgress(badge, userStats, userProfile);

    if (progress.earned) {
      earnedBadges.push({
        ...badge,
        earnedDate: progress.earnedDate,
        progressValue: 100
      });
    } else {
      inProgressBadges.push({
        ...badge,
        progressValue: Math.min(progress.progress * 100, 99),
        remaining: progress.remaining
      });
    }
  });

  return { earnedBadges, inProgressBadges };
}

function getBadgeProgress(badge, userStats, userProfile) {
  const { requirements } = badge;

  // Default progress structure
  const progress = {
    earned: false,
    progress: 0,
    remaining: [],
    earnedDate: null
  };

  switch (badge.id) {
    case 'online_first_simulation':
      progress.earned = userStats.onlineAttempted >= 1;
      progress.progress = Math.min(userStats.onlineAttempted / 1, 1);
      if (!progress.earned) progress.remaining = ['Completa 1 simulación online'];
      break;

    case 'online_emergency_response':
      const emergencyCount = userStats.scenarioAttempts?.filter(a =>
        a.scenario_mode?.includes('emergency') ||
        a.title?.toLowerCase().includes('emergencia')
      ).length || 0;
      progress.earned = emergencyCount >= 3;
      progress.progress = Math.min(emergencyCount / 3, 1);
      if (!progress.earned) progress.remaining = [`Faltan ${3 - emergencyCount} casos de emergencia`];
      break;

    case 'online_critical_care':
      const criticalCount = userStats.scenarioAttempts?.filter(a =>
        a.scenario_mode?.includes('critical') ||
        a.title?.toLowerCase().includes('uci')
      ).length || 0;
      progress.earned = criticalCount >= 5;
      progress.progress = Math.min(criticalCount / 5, 1);
      if (!progress.earned) progress.remaining = [`Faltan ${5 - criticalCount} casos críticos`];
      break;

    case 'presencial_team_leader':
      const leaderRoles = userStats.presencialRoles?.filter(r =>
        ['instructor', 'leader'].includes(r)
      ).length || 0;
      progress.earned = leaderRoles >= 3;
      progress.progress = Math.min(leaderRoles / 3, 1);
      if (!progress.earned) progress.remaining = [`Faltan ${3 - leaderRoles} sesiones como líder`];
      break;

    case 'presencial_med_safety':
      const medSafetyCount = userStats.presencialAttempts || 0;
      const avgAccuracy = userStats.presencialAvgAccuracy || 0;
      const meetsAccuracy = avgAccuracy >= 90;
      progress.earned = medSafetyCount >= 5 && meetsAccuracy;
      progress.progress = meetsAccuracy ?
        Math.min(medSafetyCount / 5, 1) :
        Math.min(avgAccuracy / 90, 1);
      if (!progress.earned) {
        if (!meetsAccuracy) {
          progress.remaining = [`Necesitas ${90 - avgAccuracy}% más de precisión`];
        } else {
          progress.remaining = [`Faltan ${5 - medSafetyCount} simulaciones presenciales`];
        }
      }
      break;

    case 'profesional_consistente':
      const totalAttempts = (userStats.onlineAttempted || 0) + (userStats.presencialAttempted || 0);
      const avgScore = userStats.totalAvgScore || 0;
      const meetsScore = avgScore >= 80;
      progress.earned = totalAttempts >= 10 && meetsScore;
      progress.progress = meetsScore ?
        Math.min(totalAttempts / 10, 1) :
        Math.min(avgScore / 80, 1);
      if (!progress.earned) {
        if (!meetsScore) {
          progress.remaining = [`Necesitas ${80 - avgScore}% más en tu promedio`];
        } else {
          progress.remaining = [`Faltan ${10 - totalAttempts} simulaciones totales`];
        }
      }
      break;

    case 'maestro_interdisciplinar':
      const uniqueRoles = new Set(userStats.rolesPlayed || []);
      const roleDiversity = uniqueRoles.size;
      const meetsRoles = roleDiversity >= 3;
      const meetsPerformance = userStats.totalAvgScore >= 85;
      progress.earned = meetsRoles && meetsPerformance;
      progress.progress = meetsPerformance ?
        Math.min(roleDiversity / 3, 1) :
        Math.min((userStats.totalAvgScore || 0) / 85, 1);
      if (!progress.earned) {
        if (!meetsPerformance) {
          progress.remaining = [`Necesitas ${85 - (userStats.totalAvgScore || 0)}% más rendimiento`];
        } else {
          progress.remaining = [`Necesitas ${3 - roleDiversity} rol(es) más diverso(s)`];
        }
      }
      break;

    case 'pediatra_committed':
      const totalComplete = (userStats.onlineAttempted || 0) + (userStats.presencialAttempted || 0);
      const improvement = userStats.improvementRate || 0; // Percentage improvement over time
      progress.earned = totalComplete >= 20 && improvement >= 5;
      progress.progress = improvement >= 5 ?
        Math.min(totalComplete / 20, 1) :
        Math.min(improvement / 5, 1);
      if (!progress.earned) {
        if (improvement < 5) {
          progress.remaining = [`Necesitas ${5 - improvement}% más mejora`];
        } else {
          progress.remaining = [`Faltan ${20 - totalComplete} simulaciones`];
        }
      }
      break;

    case 'early_adopter':
      const platformUser = userStats.platformAdopter || false;
      const feedbackCount = userStats.feedbackCount || 0;
      progress.earned = platformUser && feedbackCount >= 3;
      progress.progress = platformUser ?
        Math.min(feedbackCount / 3, 1) :
        0; // Early adopters get binary platform access
      if (!progress.earned) {
        if (!platformUser) {
          progress.remaining = ['No eres early adopter de la plataforma'];
        } else {
          progress.remaining = [`Necesitas dar ${3 - feedbackCount} feedback(s) más`];
        }
      }
      break;

    case 'feedback_champion':
      const totalFeedback = userStats.feedbackCount || 0;
      const feedbackQuality = userStats.avgFeedbackRating || 0;
      progress.earned = totalFeedback >= 10 && feedbackQuality >= 4.5;
      progress.progress = feedbackQuality >= 4.5 ?
        Math.min(totalFeedback / 10, 1) :
        Math.min(feedbackQuality / 4.5, 1);
      if (!progress.earned) {
        if (feedbackQuality < 4.5) {
          progress.remaining = [`Necesitas ${4.5 - feedbackQuality} puntos más en rating`];
        } else {
          progress.remaining = [`Necesitas dar ${10 - totalFeedback} feedback(s) más`];
        }
      }
      break;

    default:
      break;
  }

  return progress;
}

// Badge Recommendations for User Engagement
export function getBadgeRecommendations(earnedBadges, inProgressBadges) {
  // Sort in-progress by completion percentage
  const sorted = [...inProgressBadges].sort((a, b) => b.progressValue - a.progressValue);

  // Get next 3 most achievable badges
  const nextBadges = sorted.slice(0, 3).map(badge => ({
    ...badge,
    nextSteps: getNextStepsForBadge(badge)
  }));

  return nextBadges;
}

function getNextStepsForBadge(badge) {
  const tips = {
    online_first_simulation: ['Inicia una simulación online desde la plataforma'],
    online_emergency_response: ['Busca escenarios de "emergencia pediátrica"', 'Practica manejo de urgencias'],
    online_critical_care: ['Enfócate en casos de UCI y cuidados intensivos', 'Revisa protocolos de ventilación'],
    presencial_team_leader: ['Únete a sesiones como instructor', 'Ofrece liderazgo en equipos'],
    presencial_med_safety: ['Mejora precisión en protocolos de medicación', 'Practica validación farmaceutica'],
    profesional_consistente: ['Mantén promedio >80%', 'Revisa retroalimentación detallada'],
    maestro_interdisciplinar: ['Participa en diferentes roles', 'Excel en todos los dominios'],
    pediatra_committed: ['Completa más simulaciones', 'Busca mejora continua'],
    early_adopter: ['Prueba nuevas funcionalidades', 'Da feedback temprano'],
    feedback_champion: ['Proporciona feedback detallado', 'Califica estrellas altas']
  };

  return tips[badge.id] || ['Continúa practicando'];
}

// Calculate user impact or contribution score
export function calculateUserImpact(userStats) {
  let impact = 0;

  // Base impact from attempts
  const totalAttempts = (userStats.onlineAttempted || 0) + (userStats.presencialAttempted || 0);
  impact += totalAttempts * 10;

  // Bonus for high scores
  if (userStats.totalAvgScore > 90) impact += 100;
  else if (userStats.totalAvgScore > 80) impact += 50;

  // Bonus for diverse roles
  const roleDiversity = new Set(userStats.rolesPlayed || []).size;
  impact += roleDiversity * 25;

  // Feedback contribution
  impact += (userStats.feedbackCount || 0) * 15;

  return Math.round(impact);
}
