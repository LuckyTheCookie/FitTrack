// ============================================================================
// TYPES PRINCIPAUX - FitTrack App
// ============================================================================

// Types de base
export type WorkoutType = 'home' | 'run' | 'beatsaber';
export type EntryType = 'home' | 'run' | 'meal' | 'measure' | 'beatsaber';
export type FocusArea = 'upper' | 'abs' | 'legs' | 'full';
export type Intensity = 'easy' | 'medium' | 'hard';
export type Duration = 10 | 20 | 30;

// ============================================================================
// ENTRÉES (Logs)
// ============================================================================

export interface BaseEntry {
  id: string;
  type: EntryType;
  createdAt: string; // ISO date
  date: string; // YYYY-MM-DD pour regroupement
  healthConnectId?: string; // ID de la séance Health Connect si importée
}

// Séance à la maison
export interface HomeWorkoutEntry extends BaseEntry {
  type: 'home';
  name?: string;
  exercises: string; // Texte libre: "Pompes: 3x10\nSquats: 3x20"
  absBlock?: string; // Bloc abdos optionnel
  totalReps?: number; // Total des répétitions pour le tracking des quêtes
  durationMinutes?: number; // Durée de la séance en minutes
}

// Course
export interface RunEntry extends BaseEntry {
  type: 'run';
  distanceKm: number;
  durationMinutes: number;
  avgSpeed?: number; // Calculé automatiquement
  bpmAvg?: number;
  bpmMax?: number;
  cardiacLoad?: number; // Charge cardiaque optionnelle
}

// Beat Saber
export interface BeatSaberEntry extends BaseEntry {
  type: 'beatsaber';
  durationMinutes: number;
  cardiacLoad?: number; // Charge cardiaque optionnelle
  bpmAvg?: number;
  bpmMax?: number;
}

// Repas
export interface MealEntry extends BaseEntry {
  type: 'meal';
  mealName: string;
  description: string; // Texte libre
}

// Mensurations
export interface MeasureEntry extends BaseEntry {
  type: 'measure';
  weight?: number; // kg
  waist?: number; // cm - tour de taille
  arm?: number; // cm - tour de bras
  hips?: number; // cm - hanches
}

export type Entry = HomeWorkoutEntry | RunEntry | BeatSaberEntry | MealEntry | MeasureEntry;
export type SportEntry = HomeWorkoutEntry | RunEntry | BeatSaberEntry;

// ============================================================================
// GAMIFICATION
// ============================================================================

export type BadgeId = 
  | 'first_workout'
  | 'streak_7'
  | 'streak_30'
  | 'workouts_10'
  | 'workouts_50'
  | 'workouts_100'
  | 'runner_10km'
  | 'runner_50km'
  | 'consistent_month';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string; // ISO date si débloqué
}

export interface StreakInfo {
  current: number; // Streak actuel en jours
  best: number; // Meilleur streak
  lastActivityDate?: string; // Dernière date d'activité (YYYY-MM-DD)
}

// ============================================================================
// GÉNÉRATEUR DE SÉANCE
// ============================================================================

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps?: number;
  durationSec?: number;
  isRest?: boolean;
}

export interface GeneratedWorkout {
  focusArea: FocusArea;
  intensity: Intensity;
  duration: Duration;
  exercises: GeneratedExercise[];
  absBlock?: GeneratedExercise[];
}

// ============================================================================
// SETTINGS
// ============================================================================

// Health Connect sync modes
export type HealthConnectSyncMode = 'manual' | 'notify' | 'auto';

// Onboarding responses
export type FitnessGoal = 'loseWeight' | 'buildMuscle' | 'improveCardio' | 'stayHealthy';
export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserSettings {
  weeklyGoal: number; // Nombre de séances sport par semaine (défaut: 4)
  units: {
    weight: 'kg' | 'lbs';
    distance: 'km' | 'miles';
  };
  hiddenTabs: {
    tools: boolean;
    workout: boolean;
  };
  // Labs settings
  debugCamera?: boolean; // Afficher les points de pose sur la caméra
  preferCameraDetection?: boolean; // Préférer la caméra à l'accéléromètre
  debugPlank?: boolean; // Afficher les infos de debug pour la détection de planche
  // Notifications de rappel de série
  streakReminderEnabled?: boolean;
  streakReminderHour?: number; // Heure du rappel (0-23)
  streakReminderMinute?: number; // Minute du rappel (0-59)
  // Navigation bar opacity
  fullOpacityNavbar?: boolean; // Navbar avec opacité complète (sans glassmorphism)
  // Health Connect sync settings
  healthConnectSyncMode?: HealthConnectSyncMode; // 'manual' (default), 'notify', or 'auto'
  // Onboarding
  onboardingCompleted?: boolean; // Si l'onboarding a été complété
  fitnessGoal?: FitnessGoal; // Objectif fitness choisi
  fitnessLevel?: FitnessLevel; // Niveau fitness choisi
  // Motivation interval for long exercises (elliptical, etc.)
  keepGoingIntervalMinutes?: number; // Minutes between "keep going" sounds (default: 5)
  // Developer mode (hidden by default, activated by tapping About 10 times)
  developerMode?: boolean;
}

// ============================================================================
// STATS & PROGRESS
// ============================================================================

export interface WeekStats {
  weekStart: string; // YYYY-MM-DD (lundi)
  workoutsCount: number;
  runDistance: number;
  runDuration: number;
  homeWorkouts: number;
  runs: number;
}

export interface MonthStats {
  month: string; // YYYY-MM
  workoutsCount: number;
  goalProgress: number; // 0-1
}

// ============================================================================
// EXPORT
// ============================================================================

export interface WeeklyExport {
  weekStart: string;
  weekEnd: string;
  exportedAt: string;
  entries: {
    workouts: (HomeWorkoutEntry | RunEntry | BeatSaberEntry)[];
    meals: MealEntry[];
    measures: MeasureEntry[];
  };
  stats: {
    totalWorkouts: number;
    totalRuns: number;
    totalDistance: number;
    streak: StreakInfo;
  };
}
