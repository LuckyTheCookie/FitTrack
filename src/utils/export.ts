// ============================================================================
// EXPORT JSON HEBDOMADAIRE - Spix App
// ============================================================================

import type { Entry, WeeklyExport, StreakInfo, HomeWorkoutEntry, RunEntry, BeatSaberEntry, MealEntry, MeasureEntry, BadgeId, SportConfig } from '../types';
import type { GamificationLog, Quest } from '../stores/gamificationStore';
import { getWeekExportRange, getCurrentWeekStart, getCurrentWeekEnd } from './date';
import { format } from 'date-fns';

// ============================================================================
// FULL BACKUP TYPES
// ============================================================================

export interface FullBackup {
    version: number;
    exportedAt: string;
    app: {
        entries: Entry[];
        settings: {
            weeklyGoal: number;
            includeAbsBlock?: boolean;
            hiddenTabs: {
                workout: boolean;
                tools: boolean;
                gamification: boolean;
            };
            preferCameraDetection?: boolean;
            debugCamera?: boolean;
            units?: {
                weight: 'kg' | 'lbs';
                distance: 'km' | 'miles';
            };
        };
        unlockedBadges: BadgeId[];
        sportsConfig?: SportConfig[]; // Custom sports configuration
    };
    gamification: {
        xp: number;
        level: number;
        history: GamificationLog[];
        quests: Quest[];
    };
}

// ============================================================================
// FULL BACKUP/RESTORE
// ============================================================================

export function generateFullBackup(
    appState: {
        entries: Entry[];
        settings: any;
        unlockedBadges: BadgeId[];
        sportsConfig?: SportConfig[];
    },
    gamificationState: {
        xp: number;
        level: number;
        history: GamificationLog[];
        quests: Quest[];
    }
): FullBackup {
    return {
        version: 2, // Incremented version for sportsConfig support
        exportedAt: new Date().toISOString(),
        app: {
            entries: appState.entries,
            settings: {
                weeklyGoal: appState.settings?.weeklyGoal ?? 4,
                hiddenTabs: {
                    workout: appState.settings?.hiddenTabs?.workout ?? false,
                    tools: appState.settings?.hiddenTabs?.tools ?? true,
                    gamification: appState.settings?.hiddenTabs?.gamification ?? false,
                },
                preferCameraDetection: appState.settings?.preferCameraDetection,
                debugCamera: appState.settings?.debugCamera,
                units: appState.settings?.units,
            },
            unlockedBadges: appState.unlockedBadges,
            sportsConfig: appState.sportsConfig, // Include custom sports
        },
        gamification: {
            xp: gamificationState.xp,
            level: gamificationState.level,
            history: gamificationState.history,
            quests: gamificationState.quests,
        },
    };
}

export function exportFullBackup(backup: FullBackup): string {
    return JSON.stringify(backup, null, 2);
}

export function parseBackup(jsonString: string): FullBackup | null {
    try {
        const data = JSON.parse(jsonString);
        
        // Validate structure
        if (!data.version || !data.app || !data.gamification) {
            console.error('Invalid backup format: missing required fields');
            return null;
        }
        
        // Validate entries array
        if (!Array.isArray(data.app.entries)) {
            console.error('Invalid backup format: entries is not an array');
            return null;
        }
        
        return data as FullBackup;
    } catch (error) {
        console.error('Failed to parse backup:', error);
        return null;
    }
}

// ============================================================================
// WEEKLY EXPORT (existing functionality)
// ============================================================================

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
    (e): e is HomeWorkoutEntry | RunEntry | BeatSaberEntry => e.type === 'home' || e.type === 'run' || e.type === 'beatsaber'
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
