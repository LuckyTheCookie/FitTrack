// ============================================================================
// SYSTÈME DE BADGES - FitTrack App
// ============================================================================

import type { Badge, BadgeId, Entry } from '../types';

// Définitions des badges
export const BADGE_DEFINITIONS: Record<BadgeId, Omit<Badge, 'unlockedAt'>> = {
  first_workout: {
    id: 'first_workout',
    name: 'Premier pas',
    description: 'Complète ta première séance',
    icon: '🎯',
  },
  streak_7: {
    id: 'streak_7',
    name: 'Semaine de feu',
    description: '7 jours consécutifs',
    icon: '🔥',
  },
  streak_30: {
    id: 'streak_30',
    name: 'Mois de fer',
    description: '30 jours consécutifs',
    icon: '💪',
  },
  workouts_10: {
    id: 'workouts_10',
    name: 'Régulier',
    description: '10 séances complétées',
    icon: '⭐',
  },
  workouts_50: {
    id: 'workouts_50',
    name: 'Déterminé',
    description: '50 séances complétées',
    icon: '🌟',
  },
  workouts_100: {
    id: 'workouts_100',
    name: 'Légende',
    description: '100 séances complétées',
    icon: '👑',
  },
  runner_10km: {
    id: 'runner_10km',
    name: 'Coureur',
    description: '10 km parcourus au total',
    icon: '🏃',
  },
  runner_50km: {
    id: 'runner_50km',
    name: 'Marathon',
    description: '50 km parcourus au total',
    icon: '🥇',
  },
  consistent_month: {
    id: 'consistent_month',
    name: 'Constant',
    description: 'Objectif hebdo atteint 4 semaines de suite',
    icon: '📅',
  },
};

// Vérifier quels badges sont débloqués
export function checkBadges(
  entries: Entry[],
  currentStreak: number,
  bestStreak: number,
  weeklyGoalsMet: number // Nombre de semaines consécutives avec objectif atteint
): BadgeId[] {
  const unlockedBadges: BadgeId[] = [];
  
  // Inclure beatsaber dans les entrées sport
  const sportEntries = entries.filter(e => e.type === 'home' || e.type === 'run' || e.type === 'beatsaber');
  const runEntries = entries.filter(e => e.type === 'run');
  
  const totalWorkouts = sportEntries.length;
  const totalRunDistance = runEntries.reduce((sum, e) => {
    if (e.type === 'run') return sum + e.distanceKm;
    return sum;
  }, 0);

  // Première séance
  if (totalWorkouts >= 1) {
    unlockedBadges.push('first_workout');
  }

  // Streaks
  if (currentStreak >= 7 || bestStreak >= 7) {
    unlockedBadges.push('streak_7');
  }
  if (currentStreak >= 30 || bestStreak >= 30) {
    unlockedBadges.push('streak_30');
  }

  // Nombre de séances
  if (totalWorkouts >= 10) {
    unlockedBadges.push('workouts_10');
  }
  if (totalWorkouts >= 50) {
    unlockedBadges.push('workouts_50');
  }
  if (totalWorkouts >= 100) {
    unlockedBadges.push('workouts_100');
  }

  // Distance course
  if (totalRunDistance >= 10) {
    unlockedBadges.push('runner_10km');
  }
  if (totalRunDistance >= 50) {
    unlockedBadges.push('runner_50km');
  }

  // Objectifs hebdo
  if (weeklyGoalsMet >= 4) {
    unlockedBadges.push('consistent_month');
  }

  return unlockedBadges;
}

// Obtenir les badges avec leur état
export function getBadgesWithState(unlockedIds: BadgeId[]): Badge[] {
  return Object.values(BADGE_DEFINITIONS).map(badge => ({
    ...badge,
    unlockedAt: unlockedIds.includes(badge.id) ? new Date().toISOString() : undefined,
  }));
}
