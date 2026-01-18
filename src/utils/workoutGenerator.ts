// ============================================================================
// GÉNÉRATEUR DE SÉANCE "CHAMBRE" - Spix App
// V1 simple : génère une liste d'exercices selon durée/focus/intensité
// ============================================================================

import type { 
  FocusArea, 
  Intensity, 
  Duration, 
  GeneratedExercise, 
  GeneratedWorkout 
} from '../types';

// Base d'exercices par zone
const exercisesByFocus: Record<FocusArea, { name: string; hasReps: boolean }[]> = {
  upper: [
    { name: 'Pompes classiques', hasReps: true },
    { name: 'Pompes diamant', hasReps: true },
    { name: 'Pompes larges', hasReps: true },
    { name: 'Dips sur chaise', hasReps: true },
    { name: 'Pike push-ups', hasReps: true },
    { name: 'Pompes inclinées', hasReps: true },
    { name: 'Planche', hasReps: false },
    { name: 'Superman', hasReps: false },
    { name: 'Pompes archer', hasReps: true },
  ],
  abs: [
    { name: 'Crunchs', hasReps: true },
    { name: 'Leg raises', hasReps: true },
    { name: 'Russian twists', hasReps: true },
    { name: 'Mountain climbers', hasReps: false },
    { name: 'Planche', hasReps: false },
    { name: 'Planche latérale', hasReps: false },
    { name: 'Bicycle crunchs', hasReps: true },
    { name: 'Dead bug', hasReps: true },
    { name: 'Hollow hold', hasReps: false },
    { name: 'Flutter kicks', hasReps: false },
  ],
  legs: [
    { name: 'Squats', hasReps: true },
    { name: 'Lunges', hasReps: true },
    { name: 'Jump squats', hasReps: true },
    { name: 'Glute bridge', hasReps: true },
    { name: 'Wall sit', hasReps: false },
    { name: 'Calf raises', hasReps: true },
    { name: 'Sumo squats', hasReps: true },
    { name: 'Step-ups', hasReps: true },
    { name: 'Single leg deadlift', hasReps: true },
  ],
  full: [
    { name: 'Burpees', hasReps: true },
    { name: 'Jumping jacks', hasReps: false },
    { name: 'High knees', hasReps: false },
    { name: 'Pompes', hasReps: true },
    { name: 'Squats', hasReps: true },
    { name: 'Mountain climbers', hasReps: false },
    { name: 'Planche', hasReps: false },
    { name: 'Lunges', hasReps: true },
    { name: 'Bear crawl', hasReps: false },
  ],
};

// Exercices abdos pour le bloc optionnel
const absExercises = exercisesByFocus.abs;

// Paramètres selon intensité
const intensityParams: Record<Intensity, { sets: number; repsMultiplier: number; secMultiplier: number }> = {
  easy: { sets: 2, repsMultiplier: 0.7, secMultiplier: 0.7 },
  medium: { sets: 3, repsMultiplier: 1, secMultiplier: 1 },
  hard: { sets: 4, repsMultiplier: 1.3, secMultiplier: 1.2 },
};

// Reps/durées de base
const baseReps = 12;
const baseDurationSec = 30;

// Nombre d'exercices selon durée
const exerciseCountByDuration: Record<Duration, number> = {
  10: 3,
  20: 5,
  30: 7,
};

// Shuffle array (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Générer une séance
export function generateWorkout(
  focusArea: FocusArea,
  intensity: Intensity,
  duration: Duration,
  includeAbs: boolean = true
): GeneratedWorkout {
  const params = intensityParams[intensity];
  const exerciseCount = exerciseCountByDuration[duration];
  
  // Sélectionner les exercices
  const available = shuffle(exercisesByFocus[focusArea]);
  const selected = available.slice(0, exerciseCount);
  
  const exercises: GeneratedExercise[] = selected.map(ex => {
    if (ex.hasReps) {
      return {
        name: ex.name,
        sets: params.sets,
        reps: Math.round(baseReps * params.repsMultiplier),
      };
    } else {
      return {
        name: ex.name,
        sets: params.sets,
        durationSec: Math.round(baseDurationSec * params.secMultiplier),
      };
    }
  });

  // Bloc abdos optionnel (si pas déjà focus abs)
  let absBlock: GeneratedExercise[] | undefined;
  if (includeAbs && focusArea !== 'abs') {
    const absSelection = shuffle(absExercises).slice(0, 3);
    absBlock = absSelection.map(ex => {
      if (ex.hasReps) {
        return {
          name: ex.name,
          sets: Math.max(2, params.sets - 1),
          reps: Math.round(15 * params.repsMultiplier),
        };
      } else {
        return {
          name: ex.name,
          sets: Math.max(2, params.sets - 1),
          durationSec: Math.round(25 * params.secMultiplier),
        };
      }
    });
  }

  return {
    focusArea,
    intensity,
    duration,
    exercises,
    absBlock,
  };
}

// Formater une séance en texte (pour pré-remplir le log)
export function formatWorkoutAsText(workout: GeneratedWorkout): { exercises: string; absBlock: string } {
  const formatExercise = (ex: GeneratedExercise): string => {
    if (ex.reps) {
      return `${ex.name}: ${ex.sets}x${ex.reps}`;
    } else {
      return `${ex.name}: ${ex.sets}x${ex.durationSec}s`;
    }
  };

  const exercises = workout.exercises.map(formatExercise).join('\n');
  const absBlock = workout.absBlock 
    ? workout.absBlock.map(formatExercise).join('\n')
    : '';

  return { exercises, absBlock };
}

// Labels pour l'UI
export const focusLabels: Record<FocusArea, string> = {
  upper: 'Haut du corps',
  abs: 'Abdos',
  legs: 'Jambes',
  full: 'Full body',
};

export const intensityLabels: Record<Intensity, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

export const durationLabels: Record<Duration, string> = {
  10: '10 min',
  20: '20 min',
  30: '30 min',
};
