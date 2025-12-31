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

// ============================================================================
// TYPES DU STORE
// ============================================================================

interface AppState {
    // Données
    entries: Entry[];
    settings: UserSettings;
    unlockedBadges: BadgeId[];

    // Actions - Entries
    addHomeWorkout: (data: Omit<HomeWorkoutEntry, 'id' | 'type' | 'createdAt' | 'date'>) => void;
    addRun: (data: Omit<RunEntry, 'id' | 'type' | 'createdAt' | 'date' | 'avgSpeed'>) => void;
    addMeal: (data: Omit<MealEntry, 'id' | 'type' | 'createdAt' | 'date'>) => void;
    addMeasure: (data: Omit<MeasureEntry, 'id' | 'type' | 'createdAt' | 'date'>) => void;
    addBeatSaber: (data: Omit<BeatSaberEntry, 'id' | 'type' | 'createdAt' | 'date'>) => void;
    deleteEntry: (id: string) => void;
    updateEntry: (id: string, updates: Partial<Entry>) => void;

    // Actions - Settings
    updateWeeklyGoal: (goal: number) => void;
    updateSettings: (settings: Partial<UserSettings>) => void;

    // Actions - Data management
    resetAllData: () => void;

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
        tools: false,
        workout: false,
    },
    debugCamera: false,
    preferCameraDetection: false,
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

            addHomeWorkout: (data) => {
                const entry: HomeWorkoutEntry = {
                    id: nanoid(),
                    type: 'home',
                    createdAt: getNowISO(),
                    date: getTodayDateString(),
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    const newBadges = checkBadges(
                        newEntries,
                        get().getStreak().current,
                        get().getStreak().best,
                        0 // TODO: calculer semaines consécutives
                    );
                    return {
                        entries: newEntries,
                        unlockedBadges: [...new Set([...state.unlockedBadges, ...newBadges])],
                    };
                });
            },

            addRun: (data) => {
                // Calculer la vitesse moyenne
                const avgSpeed = data.durationMinutes > 0
                    ? Math.round((data.distanceKm / (data.durationMinutes / 60)) * 10) / 10
                    : 0;

                const entry: RunEntry = {
                    id: nanoid(),
                    type: 'run',
                    createdAt: getNowISO(),
                    date: getTodayDateString(),
                    avgSpeed,
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    const newBadges = checkBadges(
                        newEntries,
                        get().getStreak().current,
                        get().getStreak().best,
                        0
                    );
                    return {
                        entries: newEntries,
                        unlockedBadges: [...new Set([...state.unlockedBadges, ...newBadges])],
                    };
                });
            },

            addBeatSaber: (data) => {
                const entry: BeatSaberEntry = {
                    id: nanoid(),
                    type: 'beatsaber',
                    createdAt: getNowISO(),
                    date: getTodayDateString(),
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    const newBadges = checkBadges(
                        newEntries,
                        get().getStreak().current,
                        get().getStreak().best,
                        0
                    );
                    return {
                        entries: newEntries,
                        unlockedBadges: [...new Set([...state.unlockedBadges, ...newBadges])],
                    };
                });
            },

            addMeal: (data) => {
                const entry: MealEntry = {
                    id: nanoid(),
                    type: 'meal',
                    createdAt: getNowISO(),
                    date: getTodayDateString(),
                    ...data,
                };

                set((state) => ({
                    entries: [entry, ...state.entries],
                }));
            },

            addMeasure: (data) => {
                const entry: MeasureEntry = {
                    id: nanoid(),
                    type: 'measure',
                    createdAt: getNowISO(),
                    date: getTodayDateString(),
                    ...data,
                };

                set((state) => ({
                    entries: [entry, ...state.entries],
                }));
            },

            deleteEntry: (id) => {
                set((state) => ({
                    entries: state.entries.filter((e) => e.id !== id),
                }));
            },

            updateEntry: (id, updates) => {
                set((state) => ({
                    entries: state.entries.map((e) => 
                        e.id === id ? { ...e, ...updates } : e
                    ),
                }));
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

            // ========================================
            // GETTERS COMPUTED
            // ========================================

            getStreak: () => {
                const { entries } = get();
                const sportDates = entries
                    .filter((e) => e.type === 'home' || e.type === 'run' || e.type === 'beatsaber')
                    .map((e) => e.date);
                return calculateStreak(sportDates);
            },

            getWeekWorkoutsCount: () => {
                const { entries } = get();
                return entries.filter(
                    (e) => (e.type === 'home' || e.type === 'run' || e.type === 'beatsaber') && isInCurrentWeek(e.date)
                ).length;
            },

            getRecentEntries: (limit = 10) => {
                const { entries } = get();
                return entries.slice(0, limit);
            },

            getSportEntries: () => {
                const { entries } = get();
                return entries.filter(
                    (e): e is HomeWorkoutEntry | RunEntry | BeatSaberEntry => e.type === 'home' || e.type === 'run' || e.type === 'beatsaber'
                );
            },

            getMonthlyStats: () => {
                const { entries } = get();
                const months = getLastSixMonths();

                return months.map((month) => {
                    const count = entries.filter(
                        (e) =>
                            (e.type === 'home' || e.type === 'run' || e.type === 'beatsaber') &&
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
            name: 'fittrack-app-store',
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
