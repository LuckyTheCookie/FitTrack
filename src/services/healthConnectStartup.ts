// ============================================================================
// HEALTH CONNECT STARTUP CHECK - Handles sync mode behavior on app launch
// ============================================================================

import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as healthConnect from './healthConnect';
import { useAppStore } from '../stores';
import type { HealthConnectSyncMode } from '../types';
import i18n from '../i18n';

// Store for tracking if startup check has been done this session
let hasCheckedThisSession = false;

// Callback for showing the custom modal
let showHealthConnectModalCallback: ((count: number) => void) | null = null;

export const resetStartupCheck = () => {
    hasCheckedThisSession = false;
};

export const setHealthConnectModalCallback = (callback: ((count: number) => void) | null) => {
    showHealthConnectModalCallback = callback;
};

export const navigateToHealthConnect = () => {
    router.push('/health-connect');
};

export const checkHealthConnectOnStartup = async (): Promise<void> => {
    // Only run on Android
    if (Platform.OS !== 'android') return;
    
    // Only run once per session
    if (hasCheckedThisSession) return;
    hasCheckedThisSession = true;

    // Note: Les fonctions add* gèrent automatiquement la gamification (XP + quêtes)
    const { settings, entries, addHomeWorkout, addRun, addBeatSaber } = useAppStore.getState();
    const syncMode: HealthConnectSyncMode = settings.healthConnectSyncMode || 'manual';
    
    // Skip if manual mode
    if (syncMode === 'manual') return;

    try {
        // Check if Health Connect is available
        const { available } = await healthConnect.checkHealthConnectAvailability();
        if (!available) return;

        // Initialize Health Connect
        const initialized = await healthConnect.initializeHealthConnect();
        if (!initialized) return;

        // Check/request permissions
        const hasPermissions = await healthConnect.requestHealthConnectPermissions();
        if (!hasPermissions) return;

        // Get recent workouts (last 7 days)
        const rawWorkouts = await healthConnect.getRecentWorkouts(7);
        
        // Filter out already imported workouts
        const alreadyImportedIds = new Set(
            entries
                .filter(entry => entry.healthConnectId)
                .map(entry => entry.healthConnectId!)
        );
        
        const newWorkouts = rawWorkouts.filter(workout => !alreadyImportedIds.has(workout.id));
        
        // No new workouts
        if (newWorkouts.length === 0) return;

        if (syncMode === 'notify') {
            // Show custom modal via callback
            if (showHealthConnectModalCallback) {
                showHealthConnectModalCallback(newWorkouts.length);
            } else {
                // Fallback: navigate directly if no callback set
                router.push('/health-connect');
            }
        } else if (syncMode === 'auto') {
            // Auto-import workouts with distance fetching for runs
            let importCount = 0;
            
            for (const workout of newWorkouts) {
                const defaultType = healthConnect.getDefaultFitTrackType(workout.exerciseType);
                if (defaultType === 'skip') continue;
                
                const date = new Date(workout.startTime).toISOString().split('T')[0];
                
                switch (defaultType) {
                    case 'home':
                        addHomeWorkout({
                            name: workout.title || workout.exerciseTypeName,
                            exercises: i18n.t('healthConnect.importedFrom'),
                            durationMinutes: workout.durationMinutes,
                            healthConnectId: workout.id,
                        }, date);
                        importCount++;
                        break;
                    case 'run':
                        // Try to get real distance from Health Connect
                        let distanceKm = 5; // Default fallback
                        try {
                            const distance = await healthConnect.getDistanceForWorkout(
                                workout.startTime,
                                workout.endTime
                            );
                            if (distance > 0) {
                                distanceKm = distance / 1000;
                            }
                        } catch (e) {
                            console.warn('Could not fetch distance for workout:', e);
                        }
                        addRun({
                            distanceKm,
                            durationMinutes: workout.durationMinutes,
                            healthConnectId: workout.id,
                        }, date);
                        importCount++;
                        break;
                    case 'beatsaber':
                        addBeatSaber({
                            durationMinutes: workout.durationMinutes,
                            healthConnectId: workout.id,
                        }, date);
                        importCount++;
                        break;
                }
            }
            // Note: Les fonctions add* gèrent automatiquement la gamification
        }
    } catch (error) {
        console.error('Health Connect startup check error:', error);
    }
};
