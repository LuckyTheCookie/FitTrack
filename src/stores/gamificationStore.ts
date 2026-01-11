
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid/non-secure';
import { zustandStorage } from '../storage';
import { getWeek, getYear, startOfWeek } from 'date-fns';
import { storeLogger } from '../utils/logger';
import { 
    MAX_GAMIFICATION_HISTORY_ENTRIES, 
    STORAGE_KEYS,
    XP_MULTIPLIER_PER_LEVEL,
    AVERAGE_XP_PER_WORKOUT,
} from '../constants/values';

// Types
export interface Quest {
    id: string;
    description: string;
    target: number;
    current: number; // Progrès actuel
    rewardXp: number;
    completed: boolean;
    type: 'exercises' | 'workouts' | 'distance' | 'duration'; // Type de quête
    weekId?: string; // Identifiant de la semaine (YYYY-WW)
}

export interface GamificationState {
    xp: number;
    level: number;
    rank: string;
    quests: Quest[];
    lastQuestWeek?: string; // Dernière semaine où les quêtes ont été générées
    lastSeenXp?: number; // Dernière valeur XP vue (pour animation progressive)
    lastSeenLevel?: number; // Dernier niveau vu

    // History
    history: GamificationLog[];

    // Actions
    addXp: (amount: number, reason: string) => void;
    removeXp: (amount: number, reason: string, relatedHistoryIds?: string[]) => void;
    checkLevelUp: () => boolean; // Retourne true si level up
    updateQuestProgress: (type: Quest['type'], value: number) => void;
    recalculateQuestProgress: (type: Quest['type'], newTotal: number) => void;
    recalculateAllQuests: (totals: { exercises: number; workouts: number; duration: number; distance: number }) => void;
    recalculateFromScratch: (totals: { exercises: number; workouts: number; duration: number; distance: number; totalWorkouts: number }) => void;
    generateWeeklyQuests: () => void;
    checkAndRefreshQuests: () => void; // Vérifie si on doit régénérer les quêtes
    updateLastSeen: () => void; // Met à jour les valeurs lastSeenXp et lastSeenLevel
    restoreFromBackup: (data: { xp: number; level: number; history: GamificationLog[]; quests: Quest[] }) => void;
}

export interface GamificationLog {
    id: string;
    date: string;
    amount: number;
    reason: string;
    type: 'xp_gain' | 'level_up' | 'quest_complete';
}

// Rangs basés sur le niveau (tous les 5 niveaux par exemple)
const getRank = (level: number): string => {
    if (level < 5) return 'Novice';
    if (level < 10) return 'Apprenti';
    if (level < 20) return 'Intermédiaire';
    if (level < 30) return 'Avancé';
    if (level < 50) return 'Expert';
    return 'Maître';
};

// Seuil d'XP pour niveau suivant : XP_MULTIPLIER_PER_LEVEL * niveau
const getXpForNextLevel = (level: number) => level * XP_MULTIPLIER_PER_LEVEL;

export const useGamificationStore = create<GamificationState>()(
    persist(
        (set, get) => ({
            xp: 0,
            level: 1,
            rank: 'Novice',
            quests: [],
            history: [],
            lastQuestWeek: undefined,
            lastSeenXp: 0,
            lastSeenLevel: 1,

            addXp: (amount, reason) => {
                const { xp, level, history } = get();
                const nextLevelXp = getXpForNextLevel(level);
                let newXp = xp + amount;
                let newLevel = level;
                let newHistory = [
                    {
                        id: nanoid(),
                        date: new Date().toISOString(),
                        amount: amount,
                        reason: reason,
                        type: 'xp_gain' as const
                    },
                    ...history
                ].slice(0, MAX_GAMIFICATION_HISTORY_ENTRIES);

                if (newXp >= nextLevelXp) {
                    // Level UP!
                    newXp -= nextLevelXp;
                    newLevel += 1;
                    newHistory = [
                        {
                            id: nanoid(),
                            date: new Date().toISOString(),
                            amount: 0,
                            reason: `Niveau ${newLevel} atteint !`,
                            type: 'level_up' as const
                        },
                        ...newHistory
                    ];
                }

                set({
                    xp: newXp,
                    level: newLevel,
                    rank: getRank(newLevel),
                    history: newHistory
                });
            },

            removeXp: (amount, reason, relatedHistoryIds) => {
                const { xp, level, history } = get();
                let newXp = xp - amount;
                let newLevel = level;

                // Gérer le retour en niveau inférieur si nécessaire
                while (newXp < 0 && newLevel > 1) {
                    newLevel -= 1;
                    newXp += getXpForNextLevel(newLevel);
                }
                
                // S'assurer qu'on ne descend pas sous 0 XP
                if (newXp < 0) newXp = 0;

                // Filtrer l'historique pour retirer les gains associés
                let newHistory = history;
                if (relatedHistoryIds && relatedHistoryIds.length > 0) {
                    newHistory = history.filter(h => !relatedHistoryIds.includes(h.id));
                }

                // Ajouter une entrée d'annulation si on a retiré des XP
                if (amount > 0) {
                    newHistory = [
                        {
                            id: nanoid(),
                            date: new Date().toISOString(),
                            amount: -amount,
                            reason: reason,
                            type: 'xp_gain' as const
                        },
                        ...newHistory
                    ].slice(0, MAX_GAMIFICATION_HISTORY_ENTRIES);
                }

                set({
                    xp: newXp,
                    level: newLevel,
                    rank: getRank(newLevel),
                    history: newHistory
                });
            },

            checkLevelUp: () => {
                // Cette fonction est implicitement gérée par addXp
                return false;
            },

            updateQuestProgress: (type, amount) => {
                // QUESTS DISABLED - Early return to prevent any quest XP gain
                return;
                
                const { quests, addXp } = get();
                let xpToAdd = 0;
                let completedQuestTitle = '';
                let hasChanges = false;

                const updatedQuests = quests.map(quest => {
                    if (!quest.completed && quest.type === type) {
                        const newCurrent = Math.min(quest.current + amount, quest.target);
                        const isCompleted = newCurrent >= quest.target;

                        if (isCompleted && !quest.completed) {
                            xpToAdd += quest.rewardXp;
                            completedQuestTitle = quest.description;
                        }

                        // Check if there's an actual change
                        if (newCurrent !== quest.current || isCompleted !== quest.completed) {
                            hasChanges = true;
                        }

                        return { ...quest, current: newCurrent, completed: isCompleted };
                    }
                    return quest;
                });

                // Only update state if there are actual changes (avoids expensive JSON.stringify)
                if (hasChanges) {
                    set({ quests: updatedQuests });
                    storeLogger.debug('Quest progress updated', { type, amount });
                }

                if (xpToAdd > 0) {
                    // Use setTimeout to avoid state update conflict if needed, 
                    // though usually safe in zustand action if carefully ordered.
                    // But here we are already calling from outside store mostly.
                    // Since we are inside an action, calling another action is fine.
                    addXp(xpToAdd, `Quête complétée : ${completedQuestTitle}`);
                }
            },

            recalculateQuestProgress: (type, newTotal) => {
                // QUESTS DISABLED - Early return to prevent any quest XP changes
                return;
                
                const { quests, removeXp, history } = get();
                let hasChanges = false;

                const updatedQuests = quests.map(quest => {
                    if (quest.type === type) {
                        const wasCompleted = quest.completed;
                        const newCurrent = Math.min(newTotal, quest.target);
                        const isCompleted = newCurrent >= quest.target;

                        // Si la quête était complétée mais ne l'est plus, retirer les XP
                        if (wasCompleted && !isCompleted) {
                            // Trouver les entrées d'historique liées à cette quête
                            const relatedHistoryIds = history
                                .filter(h => h.reason.includes(quest.description))
                                .map(h => h.id);
                            
                            removeXp(quest.rewardXp, `Quête annulée : ${quest.description}`, relatedHistoryIds);
                        }

                        // Check if there's an actual change
                        if (newCurrent !== quest.current || isCompleted !== quest.completed) {
                            hasChanges = true;
                        }

                        return { ...quest, current: newCurrent, completed: isCompleted };
                    }
                    return quest;
                });

                if (hasChanges) {
                    set({ quests: updatedQuests });
                }
            },

            recalculateAllQuests: (totals) => {
                // QUESTS DISABLED - Early return to prevent any quest XP changes
                return;
                
                const { quests, removeXp, history } = get();
                let hasChanges = false;

                const updatedQuests = quests.map(quest => {
                    const newTotal = totals[quest.type] || 0;
                    const wasCompleted = quest.completed;
                    const newCurrent = Math.min(newTotal, quest.target);
                    const isCompleted = newCurrent >= quest.target;

                    // Si la quête était complétée mais ne l'est plus, retirer les XP
                    if (wasCompleted && !isCompleted) {
                        // Trouver les entrées d'historique liées à cette quête
                        const relatedHistoryIds = history
                            .filter(h => h.reason.includes(quest.description))
                            .map(h => h.id);
                        
                        removeXp(quest.rewardXp, `Quête annulée : ${quest.description}`, relatedHistoryIds);
                    }

                    // Check if there's an actual change
                    if (newCurrent !== quest.current || isCompleted !== quest.completed) {
                        hasChanges = true;
                    }

                    return { ...quest, current: newCurrent, completed: isCompleted };
                });

                if (hasChanges) {
                    set({ quests: updatedQuests });
                    storeLogger.debug('All quests recalculated', totals);
                }
            },

            recalculateFromScratch: (totals) => {
                // Recalcule complètement le niveau et les XP basé sur les entrées actuelles
                // Utilisé pour corriger les incohérences
                const { quests } = get();

                // Calculer les XP basés sur les totaux
                let totalXp = 0;
                
                // XP pour les séances (approximation moyenne)
                totalXp += totals.totalWorkouts * AVERAGE_XP_PER_WORKOUT;

                // Recalculer les quêtes et ajouter les XP de quêtes complétées
                const updatedQuests = quests.map(quest => {
                    const newTotal = totals[quest.type] || 0;
                    const newCurrent = Math.min(newTotal, quest.target);
                    const isCompleted = newCurrent >= quest.target;

                    if (isCompleted) {
                        totalXp += quest.rewardXp;
                    }

                    return { ...quest, current: newCurrent, completed: isCompleted };
                });

                // Calculer le niveau basé sur les XP totaux
                let newLevel = 1;
                let remainingXp = totalXp;
                while (remainingXp >= getXpForNextLevel(newLevel)) {
                    remainingXp -= getXpForNextLevel(newLevel);
                    newLevel += 1;
                }

                // Ajouter une entrée d'historique
                const newHistory = [
                    {
                        id: nanoid(),
                        date: new Date().toISOString(),
                        amount: 0,
                        reason: 'Recalcul complet du niveau et des quêtes',
                        type: 'level_up' as const
                    }
                ];

                set({
                    xp: remainingXp,
                    level: newLevel,
                    rank: getRank(newLevel),
                    quests: updatedQuests,
                    history: newHistory,
                });
            },

            generateWeeklyQuests: () => {
                // QUESTS DISABLED - Early return to prevent quest generation
                return;
                
                const now = new Date();
                const weekNum = getWeek(now, { weekStartsOn: 1 });
                const yearNum = getYear(now);
                const weekId = `${yearNum}-W${weekNum.toString().padStart(2, '0')}`;
                
                // Pool de quêtes variées
                const questPool = {
                    exercises: [
                        { description: 'Faire 50 exercices', target: 50, rewardXp: 50 },
                        { description: 'Faire 80 exercices', target: 80, rewardXp: 75 },
                        { description: 'Faire 100 exercices', target: 100, rewardXp: 100 },
                        { description: 'Faire 30 exercices', target: 30, rewardXp: 35 },
                        { description: 'Atteindre 120 exercices', target: 120, rewardXp: 125 },
                    ],
                    workouts: [
                        { description: 'Compléter 3 séances', target: 3, rewardXp: 100 },
                        { description: 'Compléter 4 séances', target: 4, rewardXp: 125 },
                        { description: 'Compléter 5 séances', target: 5, rewardXp: 150 },
                        { description: '2 séances cette semaine', target: 2, rewardXp: 75 },
                        { description: 'Atteindre 6 séances', target: 6, rewardXp: 175 },
                    ],
                    duration: [
                        { description: '60 minutes de sport', target: 60, rewardXp: 75 },
                        { description: '90 minutes de sport', target: 90, rewardXp: 100 },
                        { description: '45 minutes de sport', target: 45, rewardXp: 60 },
                        { description: '120 minutes de sport', target: 120, rewardXp: 130 },
                        { description: '30 minutes de sport', target: 30, rewardXp: 40 },
                    ],
                    distance: [
                        { description: 'Courir 5 km', target: 5, rewardXp: 80 },
                        { description: 'Courir 10 km', target: 10, rewardXp: 120 },
                        { description: 'Courir 3 km', target: 3, rewardXp: 50 },
                        { description: 'Courir 7 km', target: 7, rewardXp: 100 },
                        { description: 'Parcourir 15 km', target: 15, rewardXp: 150 },
                    ],
                };

                // Sélection basée sur le numéro de semaine pour la variété
                const seed = weekNum + yearNum;
                const selectQuest = (pool: typeof questPool.exercises, type: Quest['type']) => {
                    const index = (seed + type.length) % pool.length;
                    const quest = pool[index];
                    return {
                        id: `q-${type}-${weekId}`,
                        type,
                        ...quest,
                        current: 0,
                        completed: false,
                        weekId,
                    };
                };

                const newQuests: Quest[] = [
                    selectQuest(questPool.exercises, 'exercises'),
                    selectQuest(questPool.workouts, 'workouts'),
                    selectQuest(questPool.duration, 'duration'),
                ];

                // Ajouter une quête de distance 50% du temps
                if (seed % 2 === 0) {
                    newQuests.push(selectQuest(questPool.distance, 'distance'));
                }

                set({ quests: newQuests, lastQuestWeek: weekId });
            },

            checkAndRefreshQuests: () => {
                // QUESTS DISABLED - Early return
                return;
                
                const { lastQuestWeek, generateWeeklyQuests } = get();
                const now = new Date();
                const weekNum = getWeek(now, { weekStartsOn: 1 });
                const yearNum = getYear(now);
                const currentWeekId = `${yearNum}-W${weekNum.toString().padStart(2, '0')}`;

                // Si la semaine a changé, régénérer les quêtes
                if (lastQuestWeek !== currentWeekId) {
                    generateWeeklyQuests();
                }
            },

            updateLastSeen: () => {
                const { xp, level } = get();
                set({
                    lastSeenXp: xp,
                    lastSeenLevel: level,
                });
            },

            restoreFromBackup: (data) => {
                set({
                    xp: data.xp || 0,
                    level: data.level || 1,
                    rank: getRank(data.level || 1),
                    history: data.history || [],
                    quests: data.quests || [],
                });
            },
        }),
        {
            name: STORAGE_KEYS.gamificationStore,
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
