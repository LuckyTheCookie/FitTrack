// ============================================================================
// SESSION RECOVERY SERVICE - Sauvegarde automatique des séances en cours
// Permet de reprendre une séance après un crash ou fermeture inattendue
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExerciseType } from '../utils/poseDetection';

const SESSION_STORAGE_KEY = '@spix_active_session';
const SAVE_INTERVAL_MS = 10000; // Sauvegarde toutes les 10 secondes

export interface ActiveSession {
    exerciseId: ExerciseType;
    exerciseName: string;
    exerciseEmoji: string;
    detectionMode: 'sensor' | 'camera' | 'manual';
    repCount: number;
    plankSeconds: number;
    ellipticalSeconds: number;
    elapsedTime: number;
    startedAt: string;
    lastSavedAt: string;
    isTimeBased: boolean;
}

let saveIntervalId: ReturnType<typeof setInterval> | null = null;
let currentSessionData: ActiveSession | null = null;

/**
 * Démarre la sauvegarde automatique d'une session
 */
export const startSessionTracking = (session: Omit<ActiveSession, 'startedAt' | 'lastSavedAt'>): void => {
    currentSessionData = {
        ...session,
        startedAt: new Date().toISOString(),
        lastSavedAt: new Date().toISOString(),
    };
    
    // Sauvegarde initiale
    saveSession(currentSessionData);
    
    // Nettoyer l'ancien intervalle si existant
    if (saveIntervalId) {
        clearInterval(saveIntervalId);
    }
    
    // Démarrer la sauvegarde périodique
    saveIntervalId = setInterval(() => {
        if (currentSessionData) {
            saveSession(currentSessionData);
        }
    }, SAVE_INTERVAL_MS);
    
    console.log('[SessionRecovery] Started tracking session:', session.exerciseName);
};

/**
 * Met à jour les données de la session en cours
 */
export const updateSessionData = (updates: Partial<Pick<ActiveSession, 'repCount' | 'plankSeconds' | 'ellipticalSeconds' | 'elapsedTime'>>): void => {
    if (!currentSessionData) return;
    
    currentSessionData = {
        ...currentSessionData,
        ...updates,
        lastSavedAt: new Date().toISOString(),
    };
};

/**
 * Arrête le tracking et supprime la session sauvegardée
 */
export const stopSessionTracking = async (): Promise<void> => {
    if (saveIntervalId) {
        clearInterval(saveIntervalId);
        saveIntervalId = null;
    }
    
    currentSessionData = null;
    
    try {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        console.log('[SessionRecovery] Session cleared');
    } catch (error) {
        console.error('[SessionRecovery] Error clearing session:', error);
    }
};

/**
 * Sauvegarde la session dans AsyncStorage
 */
const saveSession = async (session: ActiveSession): Promise<void> => {
    try {
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
        console.error('[SessionRecovery] Error saving session:', error);
    }
};

/**
 * Récupère une session non terminée si elle existe
 */
export const getUnfinishedSession = async (): Promise<ActiveSession | null> => {
    try {
        const sessionJson = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!sessionJson) return null;
        
        const session = JSON.parse(sessionJson) as ActiveSession;
        
        // Vérifier que la session n'est pas trop vieille (max 24h)
        const savedAt = new Date(session.lastSavedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            // Session trop vieille, la supprimer
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
            console.log('[SessionRecovery] Session too old, discarded');
            return null;
        }
        
        console.log('[SessionRecovery] Found unfinished session:', session.exerciseName);
        return session;
    } catch (error) {
        console.error('[SessionRecovery] Error reading session:', error);
        return null;
    }
};

/**
 * Arrondit les données à la dernière sauvegarde (ex: 8min39 -> 8min30)
 */
export const getRoundedSessionData = (session: ActiveSession): { 
    roundedTime: number; 
    roundedReps: number;
    roundedPlankSeconds: number;
    roundedEllipticalSeconds: number;
} => {
    // Arrondir à la dizaine inférieure pour les secondes (ex: 519 -> 510)
    const roundedTime = Math.floor(session.elapsedTime / 10) * 10;
    const roundedPlankSeconds = Math.floor(session.plankSeconds / 10) * 10;
    const roundedEllipticalSeconds = Math.floor(session.ellipticalSeconds / 10) * 10;
    
    // Les reps sont gardées telles quelles (pas de raison de les arrondir)
    const roundedReps = session.repCount;
    
    return {
        roundedTime,
        roundedReps,
        roundedPlankSeconds,
        roundedEllipticalSeconds,
    };
};

/**
 * Formate le temps pour l'affichage dans le modal
 */
export const formatSessionTime = (session: ActiveSession): string => {
    const { roundedTime, roundedPlankSeconds, roundedEllipticalSeconds } = getRoundedSessionData(session);
    
    if (session.exerciseId === 'elliptical') {
        const minutes = Math.floor(roundedEllipticalSeconds / 60);
        const seconds = roundedEllipticalSeconds % 60;
        return `${minutes}min${seconds > 0 ? seconds + 's' : ''}`;
    }
    
    if (session.isTimeBased) {
        return `${roundedPlankSeconds}s`;
    }
    
    const minutes = Math.floor(roundedTime / 60);
    const seconds = roundedTime % 60;
    return `${minutes}min${seconds > 0 ? seconds + 's' : ''}`;
};
