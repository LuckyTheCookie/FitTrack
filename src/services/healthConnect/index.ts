// ============================================================================
// HEALTH CONNECT SERVICE - Import workouts from Health Connect (Android)
// ============================================================================

import { Platform } from 'react-native';
import { healthConnectLogger, errorLogger } from '../../utils/logger';
import { MAX_HEALTH_CONNECT_WORKOUTS } from '../../constants/values';

// Lazy load to prevent crashes on non-Android
let healthConnectModule: typeof import('react-native-health-connect') | null = null;

async function getHealthConnectModule() {
    if (Platform.OS !== 'android') return null;
    if (!healthConnectModule) {
        try {
            healthConnectModule = await import('react-native-health-connect');
        } catch (error) {
            errorLogger.error('Failed to load Health Connect module:', error);
            return null;
        }
    }
    return healthConnectModule;
}

// ============================================================================
// TYPES
// ============================================================================

export interface HealthConnectWorkout {
    id: string;
    startTime: Date;
    endTime: Date;
    exerciseType: number;
    exerciseTypeName: string;
    title?: string;
    notes?: string;
    durationMinutes: number;
    distance?: number;
    calories?: number;
}

export type FitTrackWorkoutType = 'home' | 'run' | 'beatsaber' | 'skip';

// ============================================================================
// EXERCISE TYPE MAPPINGS (ADAPTÉ À VOS LOGS)
// ============================================================================

export const DEFAULT_EXERCISE_MAPPINGS: Record<number, FitTrackWorkoutType> = {
    // RUNNING & WALKING
    56: 'run',   // RUNNING
    57: 'run',   // RUNNING_TREADMILL
    79: 'run',   // WALKING
    
    // VR / DANCE
    16: 'beatsaber', // DANCING
    26: 'beatsaber', // FENCING
    
    // HOME / GYM
    0: 'home',   // AUTRE (Votre "Sport")
    74: 'home',  // WORKOUT
    31: 'home',  // HIIT (Officiel)
    36: 'beatsaber',  // HIIT (Votre "HIIT")
    // ... Par défaut le reste va en 'home'
};

// Noms lisibles pour l'affichage - PERSONNALISÉ SELON VOS RETOURS
export const EXERCISE_TYPE_NAMES: Record<number, string> = {
    // CORRECTION #1 : ID 0 devient "Sport" pour vous
    0: 'Sport', 
    
    // CORRECTION #2 : ID 36 devient "HIIT" pour vous
    36: 'HIIT', 

    2: 'Badminton',
    4: 'Vélo',
    5: 'Vélo d\'appartement',
    8: 'Boot Camp',
    9: 'Boxe',
    10: 'Callisthénie',
    11: 'Cricket',
    13: 'Vélo elliptique',
    14: 'Exercice',
    16: 'Danse',
    19: 'Cours de fitness',
    26: 'Aérobic',
    29: 'Gymnastique',
    30: 'Handball',
    31: 'HIIT', 
    32: 'Randonnée',
    37: 'Méditation',
    39: 'Paddle',
    41: 'Escalade',
    42: 'Pilates',
    46: 'Aviron',
    52: 'Pilates',
    55: 'Rameur',
    56: 'Course',
    57: 'Tapis de course',
    58: 'Volley-ball',
    59: 'Marche (tapis)',
    61: 'Yoga',
    67: 'Musculation',
    68: 'Étirements',
    73: 'Haltérophilie',
    74: 'Entraînement',
    75: 'Yoga',
    79: 'Marche', // ID 79 est bien la marche
    80: 'Tennis',
    82: 'Natation',
};

// ============================================================================
// HEALTH CONNECT STATUS & PERMISSIONS
// ============================================================================

export async function checkHealthConnectAvailability(): Promise<{
    available: boolean;
    needsInstall: boolean;
    status: number | null;
}> {
    if (Platform.OS !== 'android') return { available: false, needsInstall: false, status: null };

    try {
        const hc = await getHealthConnectModule();
        if (!hc) return { available: false, needsInstall: false, status: null };
        const status = await hc.getSdkStatus();
        return {
            available: status === hc.SdkAvailabilityStatus.SDK_AVAILABLE,
            needsInstall: status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED,
            status,
        };
    } catch (error) {
        errorLogger.error('Check avail error:', error);
        return { available: false, needsInstall: false, status: null };
    }
}

export async function initializeHealthConnect(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
        const hc = await getHealthConnectModule();
        if (!hc) return false;
        await hc.initialize();
        return true;
    } catch (error) {
        errorLogger.error('Init error:', error);
        return false;
    }
}

export async function requestHealthConnectPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
        const hc = await getHealthConnectModule();
        if (!hc) return false;
        try { await hc.initialize(); } catch (e) { }

        const granted = await hc.requestPermission([
            { accessType: 'read', recordType: 'ExerciseSession' },
            { accessType: 'read', recordType: 'Distance' },
            { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        ]);

        return granted.some(p => p.recordType === 'ExerciseSession' && p.accessType === 'read');
    } catch (error) {
        errorLogger.error('Perms error:', error);
        return false;
    }
}

// ============================================================================
// READ WORKOUTS
// ============================================================================

export async function getRecentWorkouts(daysBack: number = 7): Promise<HealthConnectWorkout[]> {
    if (Platform.OS !== 'android') return [];

    try {
        const hc = await getHealthConnectModule();
        if (!hc) return [];

        // CORRECTION DATE : On prend large pour éviter les problèmes de fuseau horaire
        // On va chercher jusqu'au début de la journée il y a X jours
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - daysBack);
        startTime.setHours(0, 0, 0, 0); // Début de journée

        const result = await hc.readRecords('ExerciseSession', {
            timeRangeFilter: {
                operator: 'between',
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            },
        });

        // Debug: log received workouts
        healthConnectLogger.debug(`Received ${result.records.length} workouts`);
        result.records.forEach((r) => {
             healthConnectLogger.debug(`- ${EXERCISE_TYPE_NAMES[r.exerciseType as number] || r.exerciseType} | Date: ${new Date(r.startTime).toLocaleDateString()} ${new Date(r.startTime).toLocaleTimeString()}`);
        });

        return result.records
            .slice(0, MAX_HEALTH_CONNECT_WORKOUTS) // Apply pagination limit
            .map((record) => {
            const start = new Date(record.startTime);
            const end = new Date(record.endTime);
            const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
            const rawType = record.exerciseType as number;

            // Mapping du nom
            let typeName = EXERCISE_TYPE_NAMES[rawType] || `Autre (${rawType})`;
            
            // Si c'est null ou "null" string, on prend le typeName
            const displayTitle = (record.title && record.title !== "null") ? record.title : typeName;

            return {
                id: record.metadata?.id || `hc-${start.getTime()}`,
                startTime: start,
                endTime: end,
                exerciseType: rawType,
                exerciseTypeName: typeName,
                title: displayTitle,
                notes: record.notes,
                durationMinutes,
            };
        });
    } catch (error) {
        errorLogger.error('Error reading workouts:', error);
        return [];
    }
}

// ============================================================================
// MAPPING HELPERS
// ============================================================================

export function getDefaultFitTrackType(exerciseType: number): FitTrackWorkoutType {
    const mapping = DEFAULT_EXERCISE_MAPPINGS[exerciseType];
    if (mapping) return mapping;
    // Si ID inconnu mais commence par 79 (marche), etc.
    if (exerciseType === 79) return 'run';
    return 'home';
}

export function getExerciseTypeName(exerciseType: number): string {
    return EXERCISE_TYPE_NAMES[exerciseType] || 'Sport';
}
