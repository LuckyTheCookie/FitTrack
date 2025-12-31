// ============================================================================
// CALCULATEUR DE QUÊTES - Calcule les totaux pour les quêtes de gamification
// ============================================================================

import type { Entry, HomeWorkoutEntry, BeatSaberEntry, RunEntry } from '../types';

export interface QuestTotals {
    exercises: number;
    workouts: number;
    duration: number;
    distance: number;
}

/**
 * Calcule les totaux pour toutes les quêtes basé sur les entrées
 * @param entries Liste des entrées
 * @returns Les totaux pour chaque type de quête
 */
export function calculateQuestTotals(entries: Entry[]): QuestTotals {
    let exercises = 0;
    let workouts = 0;
    let duration = 0;
    let distance = 0;

    entries.forEach(entry => {
        switch (entry.type) {
            case 'home':
                workouts += 1;
                // Utiliser totalReps si disponible
                if ((entry as HomeWorkoutEntry).totalReps) {
                    exercises += (entry as HomeWorkoutEntry).totalReps!;
                }
                // Ajouter la durée si disponible
                if ((entry as HomeWorkoutEntry).durationMinutes) {
                    duration += (entry as HomeWorkoutEntry).durationMinutes!;
                }
                break;
            case 'run':
                workouts += 1;
                duration += (entry as RunEntry).durationMinutes || 0;
                distance += (entry as RunEntry).distanceKm || 0;
                break;
            case 'beatsaber':
                workouts += 1;
                duration += (entry as BeatSaberEntry).durationMinutes || 0;
                break;
        }
    });

    return { exercises, workouts, duration, distance };
}
