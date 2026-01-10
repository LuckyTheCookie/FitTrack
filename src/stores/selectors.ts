// ============================================================================
// MEMOIZED SELECTORS - Optimized hooks for computed store values
// ============================================================================

import { useMemo } from 'react';
import { useAppStore, useEntries } from './appStore';
import { useGamificationStore } from './gamificationStore';
import { useSocialStore } from './socialStore';
import { calculateStreak, isInCurrentWeek, getLastSixMonths } from '../utils/date';
import { isSportEntryType, MAX_RECENT_ENTRIES } from '../constants/values';
import type { HomeWorkoutEntry, RunEntry, BeatSaberEntry, MeasureEntry } from '../types';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// APP STORE SELECTORS
// ============================================================================

/**
 * Memoized streak calculation
 * Recalculates only when entries change
 */
export const useStreak = () => {
    const entries = useEntries();
    
    return useMemo(() => {
        const sportDates = entries
            .filter((e) => isSportEntryType(e.type))
            .map((e) => e.date);
        return calculateStreak(sportDates);
    }, [entries]);
};

/**
 * Memoized weekly workouts count
 */
export const useWeekWorkoutsCount = () => {
    const entries = useEntries();
    
    return useMemo(() => {
        return entries.filter(
            (e) => isSportEntryType(e.type) && isInCurrentWeek(e.date)
        ).length;
    }, [entries]);
};

/**
 * Memoized recent entries
 */
export const useRecentEntries = (limit = MAX_RECENT_ENTRIES) => {
    const entries = useEntries();
    
    return useMemo(() => {
        return entries.slice(0, limit);
    }, [entries, limit]);
};

/**
 * Memoized sport entries only
 */
export const useSportEntries = () => {
    const entries = useEntries();
    
    return useMemo(() => {
        return entries.filter(
            (e): e is HomeWorkoutEntry | RunEntry | BeatSaberEntry => isSportEntryType(e.type)
        );
    }, [entries]);
};

/**
 * Memoized monthly stats for the last 6 months
 */
export const useMonthlyStats = () => {
    const entries = useEntries();
    
    return useMemo(() => {
        const months = getLastSixMonths();
        
        return months.map((month) => {
            const count = entries.filter(
                (e) =>
                    isSportEntryType(e.type) &&
                    e.date.startsWith(month)
            ).length;
            return { month, count };
        });
    }, [entries]);
};

/**
 * Memoized last measure entry
 */
export const useLastMeasure = (): MeasureEntry | undefined => {
    const entries = useEntries();
    
    return useMemo(() => {
        return entries.find((e): e is MeasureEntry => e.type === 'measure');
    }, [entries]);
};

/**
 * Memoized weekly goal progress
 */
export const useWeeklyGoalProgress = () => {
    const weekWorkouts = useWeekWorkoutsCount();
    const weeklyGoal = useAppStore((state) => state.settings.weeklyGoal);
    
    return useMemo(() => ({
        current: weekWorkouts,
        goal: weeklyGoal,
        progress: Math.min(weekWorkouts / weeklyGoal, 1),
        isComplete: weekWorkouts >= weeklyGoal,
    }), [weekWorkouts, weeklyGoal]);
};

/**
 * Memoized total stats (all time)
 */
export const useTotalStats = () => {
    const sportEntries = useSportEntries();
    
    return useMemo(() => {
        let totalWorkouts = 0;
        let totalReps = 0;
        let totalDistanceKm = 0;
        let totalDurationMinutes = 0;
        
        for (const entry of sportEntries) {
            totalWorkouts++;
            
            if (entry.type === 'home') {
                totalReps += entry.totalReps || 0;
                totalDurationMinutes += entry.durationMinutes || 0;
            } else if (entry.type === 'run') {
                totalDistanceKm += entry.distanceKm;
                totalDurationMinutes += entry.durationMinutes;
            } else if (entry.type === 'beatsaber') {
                totalDurationMinutes += entry.durationMinutes;
            }
        }
        
        return {
            totalWorkouts,
            totalReps,
            totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
            totalDurationMinutes,
            totalDurationHours: Math.round(totalDurationMinutes / 60 * 10) / 10,
        };
    }, [sportEntries]);
};

// ============================================================================
// GAMIFICATION STORE SELECTORS
// ============================================================================

/**
 * Memoized level info
 */
export const useLevelInfo = () => {
    return useGamificationStore(
        useShallow((state) => {
            const xpToNextLevel = state.level * 100; // XP_MULTIPLIER_PER_LEVEL
            return {
                level: state.level,
                xp: state.xp,
                xpToNextLevel,
                xpProgress: state.xp / xpToNextLevel,
            };
        })
    );
};

/**
 * Memoized active quests (not completed)
 */
export const useActiveQuests = () => {
    const quests = useGamificationStore((state) => state.quests);
    
    return useMemo(() => {
        return quests.filter((q) => !q.completed);
    }, [quests]);
};

/**
 * Memoized completed quests
 */
export const useCompletedQuests = () => {
    const quests = useGamificationStore((state) => state.quests);
    
    return useMemo(() => {
        return quests.filter((q) => q.completed);
    }, [quests]);
};

// ============================================================================
// SOCIAL STORE SELECTORS
// ============================================================================

/**
 * Memoized auth state
 */
export const useAuthState = () => {
    return useSocialStore(
        useShallow((state) => ({
            isAuthenticated: state.isAuthenticated,
            isLoading: state.isLoading,
            profile: state.profile,
        }))
    );
};

/**
 * Memoized friend count
 */
export const useFriendCount = () => {
    const friends = useSocialStore((state) => state.friends);
    return friends.length;
};

/**
 * Memoized pending requests count
 */
export const usePendingRequestsCount = () => {
    const pendingRequests = useSocialStore((state) => state.pendingRequests);
    return pendingRequests.length;
};

/**
 * Memoized unread encouragements count
 */
export const useUnreadEncouragementCount = () => {
    const unreadEncouragements = useSocialStore((state) => state.unreadEncouragements);
    return unreadEncouragements.length;
};
