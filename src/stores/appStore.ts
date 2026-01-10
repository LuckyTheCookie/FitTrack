// ============================================================================
// STORE PRINCIPAL - FitTrack App
// Zustand avec persistance MMKV
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid/non-secure';
import type {
    Entry,
    HomeWorkoutEntry,
    RunEntry,
    BeatSaberEntry,
    MealEntry,
    MeasureEntry,
    UserSettings,
    BadgeId,
} from '../types';
import { zustandStorage } from '../storage';
import {
    getTodayDateString,
    getNowISO,
    calculateStreak,
    isInCurrentWeek,
    getLastSixMonths,
} from '../utils/date';
import { checkBadges } from '../utils/badges';
import { calculateQuestTotals } from '../utils/questCalculator';
import { useGamificationStore } from './gamificationStore';
import { storeLogger } from '../utils/logger';
import { 
    SPORT_ENTRY_TYPES, 
    isSportEntryType,
    STORAGE_KEYS,
    MAX_RECENT_ENTRIES,
} from '../constants/values';
import { 
    analyzeArchivable, 
    separateForArchive, 
    type ArchiveAnalysis, 
    type ArchiveResult 
} from '../utils/archive';
import { validateBackup, type ValidationResult } from '../utils/validation';

// ============================================================================
// TYPES DU STORE
// ============================================================================

interface AppState {
    // Données
    entries: Entry[];
    settings: UserSettings;
    unlockedBadges: BadgeId[];

    // Actions - Entries (optional customDate for Health Connect imports)
    addHomeWorkout: (data: Omit<HomeWorkoutEntry, 'id' | 'type' | 'createdAt' | 'date'>, customDate?: string) => void;
    addRun: (data: Omit<RunEntry, 'id' | 'type' | 'createdAt' | 'date' | 'avgSpeed'>, customDate?: string) => void;
    addMeal: (data: Omit<MealEntry, 'id' | 'type' | 'createdAt' | 'date'>, customDate?: string) => void;
    addMeasure: (data: Omit<MeasureEntry, 'id' | 'type' | 'createdAt' | 'date'>, customDate?: string) => void;
    addBeatSaber: (data: Omit<BeatSaberEntry, 'id' | 'type' | 'createdAt' | 'date'>, customDate?: string) => void;
    deleteEntry: (id: string) => void;
    updateEntry: (id: string, updates: Partial<Entry>) => void;

    // Actions - Settings
    updateWeeklyGoal: (goal: number) => void;
    updateSettings: (settings: Partial<UserSettings>) => void;

    // Actions - Data management
    resetAllData: () => void;
    restoreFromBackup: (data: { entries: Entry[]; settings: Partial<UserSettings>; unlockedBadges: BadgeId[] }) => void;
    
    // Actions - Archivage
    getArchiveAnalysis: () => ArchiveAnalysis;
    performArchive: () => ArchiveResult;
    
    // Gamification sync helper
    syncGamificationAfterChange: (entries: Entry[]) => void;
    recheckBadges: (entries: Entry[]) => void;

    // Computed (recalculées à chaque appel)
    getStreak: () => { current: number; best: number };
    getWeekWorkoutsCount: () => number;
    getRecentEntries: (limit?: number) => Entry[];
    getSportEntries: () => (HomeWorkoutEntry | RunEntry | BeatSaberEntry)[];
    getMonthlyStats: () => { month: string; count: number }[];
    getLastMeasure: () => MeasureEntry | undefined;
}

// ============================================================================
// VALEURS PAR DÉFAUT
// ============================================================================

const defaultSettings: UserSettings = {
    weeklyGoal: 4,
    units: {
        weight: 'kg',
        distance: 'km',
    },
    hiddenTabs: {
        tools: true, // Tools hidden by default
        workout: false,
    },
    debugCamera: false,
    preferCameraDetection: false,
    debugPlank: false,
    developerMode: false,
};

// ============================================================================
// STORE
// ============================================================================

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            // État initial
            entries: [],
            settings: defaultSettings,
            unlockedBadges: [],

            // ========================================
            // ACTIONS - AJOUT D'ENTRÉES
            // ========================================

            addHomeWorkout: (data, customDate) => {
                const entry: HomeWorkoutEntry = {
                    id: nanoid(),
                    type: 'home',
                    createdAt: getNowISO(),
                    date: customDate || getTodayDateString(),
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    return { entries: newEntries };
                });
                
                // Sync gamification synchronously after state update
                const currentEntries = get().entries;
                get().syncGamificationAfterChange(currentEntries);
                storeLogger.debug('Added home workout', entry.id);
            },

            addRun: (data, customDate) => {
                // Calculer la vitesse moyenne
                const avgSpeed = data.durationMinutes > 0
                    ? Math.round((data.distanceKm / (data.durationMinutes / 60)) * 10) / 10
                    : 0;

                const entry: RunEntry = {
                    id: nanoid(),
                    type: 'run',
                    createdAt: getNowISO(),
                    date: customDate || getTodayDateString(),
                    avgSpeed,
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    return { entries: newEntries };
                });
                
                // Sync gamification synchronously after state update
                const currentEntries = get().entries;
                get().syncGamificationAfterChange(currentEntries);
                storeLogger.debug('Added run', entry.id);
            },

            addBeatSaber: (data, customDate) => {
                const entry: BeatSaberEntry = {
                    id: nanoid(),
                    type: 'beatsaber',
                    createdAt: getNowISO(),
                    date: customDate || getTodayDateString(),
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    return { entries: newEntries };
                });
                
                // Sync gamification synchronously after state update
                const currentEntries = get().entries;
                get().syncGamificationAfterChange(currentEntries);
                storeLogger.debug('Added BeatSaber session', entry.id);
            },

            addMeal: (data, customDate) => {
                const entry: MealEntry = {
                    id: nanoid(),
                    type: 'meal',
                    createdAt: getNowISO(),
                    date: customDate || getTodayDateString(),
                    ...data,
                };

                set((state) => ({
                    entries: [entry, ...state.entries],
                }));
            },

            addMeasure: (data, customDate) => {
                const entry: MeasureEntry = {
                    id: nanoid(),
                    type: 'measure',
                    createdAt: getNowISO(),
                    date: customDate || getTodayDateString(),
                    ...data,
                };

                set((state) => ({
                    entries: [entry, ...state.entries],
                }));
            },

            deleteEntry: (id) => {
                // Get the entry before deletion to check if it affects gamification
                const entryToDelete = get().entries.find(e => e.id === id);
                const affectsGamification = entryToDelete && isSportEntryType(entryToDelete.type);
                
                set((state) => ({
                    entries: state.entries.filter((e) => e.id !== id),
                }));
                
                // Sync gamification if deleted entry was a sport entry
                if (affectsGamification) {
                    const currentEntries = get().entries;
                    get().syncGamificationAfterChange(currentEntries);
                    storeLogger.debug('Deleted sport entry, synced gamification', id);
                }
            },

            updateEntry: (id, updates) => {
                // Check if entry is a sport entry before update
                const entryToUpdate = get().entries.find(e => e.id === id);
                const affectsGamification = entryToUpdate && isSportEntryType(entryToUpdate.type);
                
                set((state) => ({
                    entries: state.entries.map((e) => 
                        e.id === id ? { ...e, ...updates } as Entry : e
                    ),
                }));
                
                // Sync gamification if updated entry was a sport entry
                // This handles cases like editing totalReps in a home workout
                if (affectsGamification) {
                    const currentEntries = get().entries;
                    get().syncGamificationAfterChange(currentEntries);
                    storeLogger.debug('Updated sport entry, synced gamification', id);
                }
            },

            // ========================================
            // ACTIONS - SETTINGS
            // ========================================

            updateWeeklyGoal: (goal) => {
                set((state) => ({
                    settings: { ...state.settings, weeklyGoal: goal },
                }));
            },

            updateSettings: (newSettings) => {
                set((state) => ({
                    settings: { ...state.settings, ...newSettings },
                }));
            },

            // ========================================
            // ACTIONS - DATA MANAGEMENT
            // ========================================

            resetAllData: () => {
                set({
                    entries: [],
                    settings: defaultSettings,
                    unlockedBadges: [],
                });
            },

            restoreFromBackup: (data) => {
                // Validate backup data with Zod
                const validation = validateBackup(data);
                
                if (!validation.success) {
                    storeLogger.warn('[Backup] Validation failed:', validation.error);
                    // Still try to restore with basic fallbacks for backwards compatibility
                }
                
                const validData = validation.data || data;
                
                set({
                    entries: validData.entries || [],
                    settings: {
                        ...defaultSettings,
                        ...validData.settings,
                    },
                    unlockedBadges: validData.unlockedBadges || [],
                });
                
                storeLogger.info('[Backup] Restored successfully');
            },

            // ========================================
            // ACTIONS - ARCHIVAGE
            // ========================================

            getArchiveAnalysis: () => {
                const { entries } = get();
                return analyzeArchivable(entries);
            },

            performArchive: () => {
                const { entries } = get();
                const result = separateForArchive(entries);
                
                // Mettre à jour le store avec seulement les entrées récentes
                set({ entries: result.keptEntries });
                
                // Sync gamification avec les nouvelles entrées
                const currentEntries = get().entries;
                get().syncGamificationAfterChange(currentEntries);
                
                storeLogger.info(`[Archive] Archived ${result.archivedCount} entries, kept ${result.keptEntries.length}`);
                
                return result;
            },

            // ========================================
            // GAMIFICATION SYNC
            // ========================================

            syncGamificationAfterChange: (entries) => {
                // Recalculate quest totals and sync with gamification store
                const totals = calculateQuestTotals(entries);
                const gamificationStore = useGamificationStore.getState();
                gamificationStore.recalculateAllQuests(totals);
                
                // Recheck badges and update
                get().recheckBadges(entries);
            },

            recheckBadges: (entries) => {
                // Calculate streak based on current entries
                const sportDates = entries
                    .filter((e) => isSportEntryType(e.type))
                    .map((e) => e.date);
                const streak = calculateStreak(sportDates);
                
                // Get all badges that should be unlocked based on current state
                const shouldHaveBadges = checkBadges(
                    entries,
                    streak.current,
                    streak.best,
                    0 // TODO: calculate consecutive weeks
                );
                
                // Update badges - this can remove badges if conditions no longer met
                set({ unlockedBadges: shouldHaveBadges });
            },

            // ========================================
            // GETTERS COMPUTED
            // ========================================

            getStreak: () => {
                const { entries } = get();
                const sportDates = entries
                    .filter((e) => isSportEntryType(e.type))
                    .map((e) => e.date);
                return calculateStreak(sportDates);
            },

            getWeekWorkoutsCount: () => {
                const { entries } = get();
                return entries.filter(
                    (e) => isSportEntryType(e.type) && isInCurrentWeek(e.date)
                ).length;
            },

            getRecentEntries: (limit = MAX_RECENT_ENTRIES) => {
                const { entries } = get();
                return entries.slice(0, limit);
            },

            getSportEntries: () => {
                const { entries } = get();
                return entries.filter(
                    (e): e is HomeWorkoutEntry | RunEntry | BeatSaberEntry => isSportEntryType(e.type)
                );
            },

            getMonthlyStats: () => {
                const { entries } = get();
                const months = getLastSixMonths();

                return months.map((month) => {
                    const count = entries.filter(
                        (e) =>
                            isSportEntryType(e.type) &&
                            e.date.startsWith(month)
                    ).length;
                    return { month, count };
                });
            },

            getLastMeasure: () => {
                const { entries } = get();
                return entries.find((e): e is MeasureEntry => e.type === 'measure');
            },
        }),
        {
            name: STORAGE_KEYS.appStore,
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);

// ============================================================================
// HOOKS SÉLECTEURS (pour optimiser les re-renders)
// ============================================================================

export const useEntries = () => useAppStore((state) => state.entries);
export const useSettings = () => useAppStore((state) => state.settings);
export const useBadges = () => useAppStore((state) => state.unlockedBadges);
