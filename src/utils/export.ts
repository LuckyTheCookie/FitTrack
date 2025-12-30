// ============================================================================
// EXPORT JSON HEBDOMADAIRE - FitTrack App
// ============================================================================

import type { Entry, WeeklyExport, StreakInfo, HomeWorkoutEntry, RunEntry, MealEntry, MeasureEntry } from '../types';
import { getWeekExportRange, getCurrentWeekStart, getCurrentWeekEnd } from './date';
import { format } from 'date-fns';

export function generateWeeklyExport(
  entries: Entry[],
  streak: StreakInfo
): WeeklyExport {
  const { start, end } = getWeekExportRange();
  
  // Filtrer les entrées de la semaine
  const weekEntries = entries.filter(entry => {
    return entry.date >= start && entry.date <= end;
  });

  // Séparer par type
  const workouts = weekEntries.filter(
    (e): e is HomeWorkoutEntry | RunEntry => e.type === 'home' || e.type === 'run'
  );
  const meals = weekEntries.filter((e): e is MealEntry => e.type === 'meal');
  const measures = weekEntries.filter((e): e is MeasureEntry => e.type === 'measure');

  // Calculer les stats
  const runs = workouts.filter((w): w is RunEntry => w.type === 'run');
  const totalDistance = runs.reduce((sum, r) => sum + r.distanceKm, 0);

  return {
    weekStart: start,
    weekEnd: end,
    exportedAt: new Date().toISOString(),
    entries: {
      workouts,
      meals,
      measures,
    },
    stats: {
      totalWorkouts: workouts.length,
      totalRuns: runs.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      streak,
    },
  };
}

export function exportToJSON(data: WeeklyExport): string {
  return JSON.stringify(data, null, 2);
}

// Format d'affichage pour la semaine
export function getWeekDisplayRange(): string {
  const start = getCurrentWeekStart();
  const end = getCurrentWeekEnd();
  return `${format(start, 'dd/MM')} - ${format(end, 'dd/MM/yyyy')}`;
}
