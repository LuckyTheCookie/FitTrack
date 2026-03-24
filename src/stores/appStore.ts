// ============================================================================
// STORE PRINCIPAL - Spix App
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
    CustomSportEntry,
    UserSettings,
    BadgeId,
    SportConfig,
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
import { useGamificationStore, calculateQuestTotals } from './gamificationStore';
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
import { DEFAULT_SAFETY_AUTO_ALERT_DELAY_SECONDS, DEFAULT_SAFETY_INTERVAL_MINUTES } from '../constants/safety';

// ============================================================================
// TYPES DU STORE
// ============================================================================

interface AppState {
    // Données
    entries: Entry[];
    settings: UserSettings;
    unlockedBadges: BadgeId[];
    sportsConfig: SportConfig[]; // Configuration des sports (par défaut + custom)

    // Actions - Entries (optional customDate and customCreatedAt for Health Connect imports)
    addHomeWorkout: (data: Omit<HomeWorkoutEntry, 'id' | 'type' | 'createdAt' | 'date'>, customDate?: string, customCreatedAt?: string) => void;
    addRun: (data: Omit<RunEntry, 'id' | 'type' | 'createdAt' | 'date' | 'avgSpeed'>, customDate?: string, customCreatedAt?: string) => void;
    addMeal: (data: Omit<MealEntry, 'id' | 'type' | 'createdAt' | 'date'>, customDate?: string, customCreatedAt?: string) => void;
    addMeasure: (data: Omit<MeasureEntry, 'id' | 'type' | 'createdAt' | 'date'>, customDate?: string, customCreatedAt?: string) => void;
    addBeatSaber: (data: Omit<BeatSaberEntry, 'id' | 'type' | 'createdAt' | 'date'>, customDate?: string, customCreatedAt?: string) => void;
    addCustomSport: (data: Omit<CustomSportEntry, 'id' | 'type' | 'createdAt' | 'date'>, customDate?: string, customCreatedAt?: string) => void;
    deleteEntry: (id: string) => void;
    updateEntry: (id: string, updates: Partial<Entry>) => void;

    // Actions - Settings
    updateWeeklyGoal: (goal: number) => void;
    updateSettings: (settings: Partial<UserSettings>) => void;

    // Actions - Sports management
    addSportConfig: (sport: Omit<SportConfig, 'id' | 'isDefault'>) => string;
    updateSportConfig: (id: string, updates: Partial<SportConfig>) => void;
    deleteSportConfig: (id: string) => void;
    toggleSportVisibility: (id: string) => void;
    getSportConfig: (id: string) => SportConfig | undefined;
    getVisibleSports: () => SportConfig[];
    getAllSports: () => SportConfig[];

    // Actions - Data management
    resetAllData: () => void;
    restoreFromBackup: (data: { entries: Entry[]; settings: Partial<UserSettings>; unlockedBadges: BadgeId[]; sportsConfig?: SportConfig[] }) => void;
    
    // Actions - Archivage
    getArchiveAnalysis: () => ArchiveAnalysis;
    performArchive: () => ArchiveResult;
    
    // Gamification helpers (internal use)
    recheckBadges: (entries: Entry[]) => void;
    recalculateGamification: () => void;

    // Computed (recalculées à chaque appel)
    getStreak: () => { current: number; best: number };
    getWeekWorkoutsCount: () => number;
    getRecentEntries: (limit?: number) => Entry[];
    getSportEntries: () => (HomeWorkoutEntry | RunEntry | BeatSaberEntry | CustomSportEntry)[];
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
        gamification: false,
    },
    debugCamera: false,
    preferCameraDetection: false,
    debugPlank: false,
    developerMode: false,
    skipSensorSelection: false,
    gender: undefined,
    heightCm: undefined,
    bodyWeightKg: undefined,
    aiTone: 'neutral',
    safety: {
        contacts: [],
        defaultIntervalMinutes: DEFAULT_SAFETY_INTERVAL_MINUTES,
        defaultAutoAlertDelaySeconds: DEFAULT_SAFETY_AUTO_ALERT_DELAY_SECONDS,
    },
};

// Configuration par défaut des sports
const defaultSportsConfig: SportConfig[] = [
    {
        id: 'home',
        name: 'Musculation',
        emoji: '💪',
        icon: 'Dumbbell',
        color: '#8B5CF6', // Purple
        trackingFields: ['duration', 'exercises', 'totalReps'],
        isDefault: true,
        isHidden: false,
    },
    {
        id: 'run',
        name: 'Course',
        emoji: '🏃',
        icon: 'Footprints',
        color: '#22C55E', // Green
        trackingFields: ['duration', 'distance', 'bpmAvg', 'bpmMax', 'cardiacLoad'],
        isDefault: true,
        isHidden: false,
    },
    {
        id: 'beatsaber',
        name: 'Beat Saber',
        emoji: '🕹️',
        icon: 'Gamepad2',
        color: '#EF4444', // Red
        trackingFields: ['duration', 'bpmAvg', 'bpmMax', 'cardiacLoad'],
        isDefault: true,
        isHidden: false,
    },
];

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
            sportsConfig: defaultSportsConfig,

            // ========================================
            // ACTIONS - AJOUT D'ENTRÉES
            // ========================================

            addHomeWorkout: (data, customDate, customCreatedAt) => {
                const entry: HomeWorkoutEntry = {
                    id: nanoid(),
                    type: 'home',
                    createdAt: customCreatedAt || getNowISO(),
                    date: customDate || getTodayDateString(),
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    return { entries: newEntries };
                });
                
                // Sync gamification: ajouter XP et mettre à jour les quêtes
                const gamificationStore = useGamificationStore.getState();
                gamificationStore.processEntryAdded(entry);
                gamificationStore.syncQuestsWithEntries(get().entries);
                get().recheckBadges(get().entries);
                storeLogger.debug('Added home workout', entry.id);
            },

            addRun: (data, customDate, customCreatedAt) => {
                // Calculer la vitesse moyenne
                const avgSpeed = data.durationMinutes > 0
                    ? Math.round((data.distanceKm / (data.durationMinutes / 60)) * 10) / 10
                    : 0;

                const entry: RunEntry = {
                    id: nanoid(),
                    type: 'run',
                    createdAt: customCreatedAt || getNowISO(),
                    date: customDate || getTodayDateString(),
                    avgSpeed,
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    return { entries: newEntries };
                });
                
                // Sync gamification: ajouter XP et mettre à jour les quêtes
                const gamificationStore = useGamificationStore.getState();
                gamificationStore.processEntryAdded(entry);
                gamificationStore.syncQuestsWithEntries(get().entries);
                get().recheckBadges(get().entries);
                storeLogger.debug('Added run', entry.id);
            },

            addBeatSaber: (data, customDate, customCreatedAt) => {
                const entry: BeatSaberEntry = {
                    id: nanoid(),
                    type: 'beatsaber',
                    createdAt: customCreatedAt || getNowISO(),
                    date: customDate || getTodayDateString(),
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    return { entries: newEntries };
                });
                
                // Sync gamification: ajouter XP et mettre à jour les quêtes
                const gamificationStore = useGamificationStore.getState();
                gamificationStore.processEntryAdded(entry);
                gamificationStore.syncQuestsWithEntries(get().entries);
                get().recheckBadges(get().entries);
                storeLogger.debug('Added BeatSaber session', entry.id);
            },

            addMeal: (data, customDate, customCreatedAt) => {
                const entry: MealEntry = {
                    id: nanoid(),
                    type: 'meal',
                    createdAt: customCreatedAt || getNowISO(),
                    date: customDate || getTodayDateString(),
                    ...data,
                };

                set((state) => ({
                    entries: [entry, ...state.entries],
                }));
            },

            addMeasure: (data, customDate, customCreatedAt) => {
                const entry: MeasureEntry = {
                    id: nanoid(),
                    type: 'measure',
                    createdAt: customCreatedAt || getNowISO(),
                    date: customDate || getTodayDateString(),
                    ...data,
                };

                set((state) => ({
                    entries: [entry, ...state.entries],
                }));
            },

            addCustomSport: (data, customDate, customCreatedAt) => {
                const entry: CustomSportEntry = {
                    id: nanoid(),
                    type: 'custom',
                    createdAt: customCreatedAt || getNowISO(),
                    date: customDate || getTodayDateString(),
                    ...data,
                };

                set((state) => {
                    const newEntries = [entry, ...state.entries];
                    return { entries: newEntries };
                });
                
                // Sync gamification: ajouter XP et mettre à jour les quêtes
                const gamificationStore = useGamificationStore.getState();
                gamificationStore.processEntryAdded(entry);
                gamificationStore.syncQuestsWithEntries(get().entries);
                get().recheckBadges(get().entries);
                storeLogger.debug('Added custom sport', entry.id);
            },

            deleteEntry: (id) => {
                // Get the entry before deletion to process XP removal
                const entryToDelete = get().entries.find(e => e.id === id);
                const affectsGamification = entryToDelete && isSportEntryType(entryToDelete.type);
                
                set((state) => ({
                    entries: state.entries.filter((e) => e.id !== id),
                }));
                
                // Sync gamification if deleted entry was a sport entry
                if (affectsGamification && entryToDelete) {
                    const gamificationStore = useGamificationStore.getState();
                    gamificationStore.processEntryDeleted(entryToDelete);
                    gamificationStore.syncQuestsWithEntries(get().entries);
                    get().recheckBadges(get().entries);
                    storeLogger.debug('Deleted sport entry, synced gamification', id);
                }
            },

            updateEntry: (id, updates) => {
                // Get the original entry before update
                const oldEntry = get().entries.find(e => e.id === id);
                const affectsGamification = oldEntry && isSportEntryType(oldEntry.type);
                
                set((state) => ({
                    entries: state.entries.map((e) => 
                        e.id === id ? { ...e, ...updates } as Entry : e
                    ),
                }));
                
                // Get the updated entry and sync gamification if needed
                const newEntry = get().entries.find(e => e.id === id);
                if (oldEntry && newEntry && (affectsGamification || isSportEntryType(newEntry.type))) {
                    const gamificationStore = useGamificationStore.getState();
                    gamificationStore.processEntryUpdated(oldEntry, newEntry);
                    gamificationStore.syncQuestsWithEntries(get().entries);
                    get().recheckBadges(get().entries);
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
                
                // Merge sports config: keep default sports, add custom ones from backup
                let mergedSportsConfig = defaultSportsConfig;
                const backupSportsConfig = (validData as any).sportsConfig;
                if (backupSportsConfig && Array.isArray(backupSportsConfig)) {
                    // Get custom sports from backup (non-default ones)
                    const customSports = backupSportsConfig.filter((s: SportConfig) => !s.isDefault);
                    mergedSportsConfig = [...defaultSportsConfig, ...customSports];
                }
                
                set({
                    entries: (validData.entries || []) as Entry[],
                    settings: {
                        ...defaultSettings,
                        ...validData.settings,
                    } as UserSettings,
                    unlockedBadges: (validData.unlockedBadges || []) as BadgeId[],
                    sportsConfig: mergedSportsConfig,
                });
                
                storeLogger.info('[Backup] Restored successfully with sportsConfig');
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
                
                // Recalculer complètement la gamification après archivage
                const gamificationStore = useGamificationStore.getState();
                gamificationStore.recalculateFromEntries(get().entries);
                
                storeLogger.info(`[Archive] Archived ${result.archivedCount} entries, kept ${result.keptEntries.length}`);
                
                return result;
            },

            // ========================================
            // GAMIFICATION SYNC
            // ========================================

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

            recalculateGamification: () => {
                // Recalcule complètement la gamification depuis les entrées
                const gamificationStore = useGamificationStore.getState();
                gamificationStore.recalculateFromEntries(get().entries);
            },

            // ========================================
            // SPORTS MANAGEMENT
            // ========================================

            addSportConfig: (sport) => {
                const id = `custom_${nanoid()}`;
                const newSport: SportConfig = {
                    ...sport,
                    id,
                    isDefault: false,
                };
                
                set((state) => ({
                    sportsConfig: [...state.sportsConfig, newSport],
                }));
                
                storeLogger.debug('Added custom sport', id);
                return id;
            },

            updateSportConfig: (id, updates) => {
                set((state) => ({
                    sportsConfig: state.sportsConfig.map((sport) =>
                        sport.id === id ? { ...sport, ...updates } : sport
                    ),
                }));
            },

            deleteSportConfig: (id) => {
                // Ne pas supprimer les sports par défaut
                const sport = get().sportsConfig.find(s => s.id === id);
                if (sport?.isDefault) {
                    storeLogger.warn('Cannot delete default sport', id);
                    return;
                }
                
                set((state) => ({
                    sportsConfig: state.sportsConfig.filter((sport) => sport.id !== id),
                }));
                storeLogger.debug('Deleted custom sport', id);
            },

            toggleSportVisibility: (id) => {
                set((state) => ({
                    sportsConfig: state.sportsConfig.map((sport) =>
                        sport.id === id ? { ...sport, isHidden: !sport.isHidden } : sport
                    ),
                }));
            },

            getSportConfig: (id) => {
                return get().sportsConfig.find(s => s.id === id);
            },

            getVisibleSports: () => {
                return get().sportsConfig.filter(s => !s.isHidden);
            },

            getAllSports: () => {
                return get().sportsConfig;
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
                    (e): e is HomeWorkoutEntry | RunEntry | BeatSaberEntry | CustomSportEntry => 
                        isSportEntryType(e.type)
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
export const useSportsConfig = () => useAppStore((state) => state.sportsConfig);
