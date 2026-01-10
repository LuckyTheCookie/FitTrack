// ============================================================================
// CONSTANTES DE VALEURS - FitTrack App
// Valeurs configurables centralisées (pas de magic numbers)
// ============================================================================

// ============================================================================
// TYPES D'ENTRÉES
// ============================================================================

/** Types d'entrées considérées comme des activités sportives */
export const SPORT_ENTRY_TYPES = ['home', 'run', 'beatsaber'] as const;
export type SportEntryType = typeof SPORT_ENTRY_TYPES[number];

/** Tous les types d'entrées possibles */
export const ALL_ENTRY_TYPES = ['home', 'run', 'beatsaber', 'meal', 'measure'] as const;
export type EntryType = typeof ALL_ENTRY_TYPES[number];

/** Helper pour vérifier si un type est un sport */
export const isSportEntryType = (type: string): type is SportEntryType => {
    return SPORT_ENTRY_TYPES.includes(type as SportEntryType);
};

// ============================================================================
// LIMITES & PAGINATION
// ============================================================================

/** Nombre maximum d'entrées d'historique gamification à conserver */
export const MAX_GAMIFICATION_HISTORY_ENTRIES = 50;

/** Nombre maximum d'entrées à afficher dans les listes récentes */
export const MAX_RECENT_ENTRIES = 10;

/** Nombre maximum de résultats pour le leaderboard */
export const MAX_LEADERBOARD_RESULTS = 100;

/** Nombre maximum de workouts à lire depuis Health Connect en une fois */
export const MAX_HEALTH_CONNECT_WORKOUTS = 500;

/** Nombre maximum d'entrées avant archivage suggéré */
export const MAX_ENTRIES_BEFORE_ARCHIVE_WARNING = 5000;

// ============================================================================
// ANIMATIONS
// ============================================================================

/** Durée standard des animations UI (ms) */
export const ANIMATION_DURATION_MS = 250;

/** Durée des animations rapides (ms) */
export const ANIMATION_DURATION_FAST_MS = 150;

/** Durée des animations lentes (ms) */
export const ANIMATION_DURATION_SLOW_MS = 400;

// ============================================================================
// GAMIFICATION
// ============================================================================

/** XP de base par type de séance */
export const XP_PER_WORKOUT = {
    home: 50,
    run: 30, // + bonus par km
    beatsaber: 15, // + bonus par durée
    runPerKm: 5,
    beatSaberPer5Min: 1,
} as const;

/** XP moyen estimé par séance (pour recalcul) */
export const AVERAGE_XP_PER_WORKOUT = 40;

/** Formule: XP requis pour niveau suivant = niveau * XP_MULTIPLIER_PER_LEVEL */
export const XP_MULTIPLIER_PER_LEVEL = 100;

// ============================================================================
// REP COUNTER
// ============================================================================

/** Cooldown entre les répétitions détectées (ms) */
export const REP_DETECTION_COOLDOWN_MS = 400;

/** Seuil de confiance minimum pour valider un landmark */
export const POSE_VISIBILITY_THRESHOLD = 0.3;

/** Nombre de samples pour calibration vélo elliptique */
export const ELLIPTICAL_CALIBRATION_SAMPLES = 30;

// ============================================================================
// RÉSEAU & TIMEOUTS
// ============================================================================

/** Timeout pour les requêtes API (ms) */
export const API_TIMEOUT_MS = 10000;

/** Délai de debounce pour la recherche d'utilisateurs (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Délai de retry pour les push notifications (ms) */
export const PUSH_TOKEN_RETRY_DELAY_MS = 2000;

/** Nombre maximum de tentatives pour obtenir le push token */
export const PUSH_TOKEN_MAX_RETRIES = 3;

// ============================================================================
// STOCKAGE
// ============================================================================

/** Clés de stockage pour les stores Zustand */
export const STORAGE_KEYS = {
    appStore: 'fittrack-app-store',
    gamificationStore: 'fittrack-gamification-store',
    socialStore: 'fittrack-social-store',
} as const;

// ============================================================================
// VALIDATION
// ============================================================================

/** Longueur minimum du nom d'utilisateur */
export const MIN_USERNAME_LENGTH = 3;

/** Longueur maximum du nom d'utilisateur */
export const MAX_USERNAME_LENGTH = 20;

/** Longueur minimum du mot de passe */
export const MIN_PASSWORD_LENGTH = 6;
