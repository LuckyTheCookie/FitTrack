
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../storage';

// Types
export interface Quest {
    id: string;
    description: string;
    target: number;
    current: number; // Progrès actuel
    rewardXp: number;
    completed: boolean;
    type: 'exercises' | 'workouts' | 'distance' | 'duration'; // Type de quête
}

export interface GamificationState {
    xp: number;
    level: number;
    rank: string;
    quests: Quest[];

    // History
    history: GamificationLog[];

    // Actions
    addXp: (amount: number, reason: string) => void;
    removeXp: (amount: number, reason: string, relatedHistoryIds?: string[]) => void;
    checkLevelUp: () => boolean; // Retourne true si level up
    updateQuestProgress: (type: Quest['type'], value: number) => void;
    recalculateQuestProgress: (type: Quest['type'], newTotal: number) => void;
    recalculateAllQuests: (totals: { exercises: number; workouts: number; duration: number; distance: number }) => void;
    generateWeeklyQuests: () => void;
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

// Seuil d'XP pour niveau suivant : 100 * niveau
const getXpForNextLevel = (level: number) => level * 100;

export const useGamificationStore = create<GamificationState>()(
    persist(
        (set, get) => ({
            xp: 0,
            level: 1,
            rank: 'Novice',
            quests: [],
            history: [],

            addXp: (amount, reason) => {
                const { xp, level, history } = get();
                const nextLevelXp = getXpForNextLevel(level);
                let newXp = xp + amount;
                let newLevel = level;
                let newHistory = [
                    {
                        id: Date.now().toString(),
                        date: new Date().toISOString(),
                        amount: amount,
                        reason: reason,
                        type: 'xp_gain' as const
                    },
                    ...history
                ].slice(0, 50); // Keep last 50 entries

                if (newXp >= nextLevelXp) {
                    // Level UP!
                    newXp -= nextLevelXp;
                    newLevel += 1;
                    newHistory = [
                        {
                            id: (Date.now() + 1).toString(),
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
                            id: Date.now().toString(),
                            date: new Date().toISOString(),
                            amount: -amount,
                            reason: reason,
                            type: 'xp_gain' as const
                        },
                        ...newHistory
                    ].slice(0, 50);
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
                const { quests, addXp } = get();
                let xpToAdd = 0;
                let completedQuestTitle = '';

                const updatedQuests = quests.map(quest => {
                    if (!quest.completed && quest.type === type) {
                        const newCurrent = Math.min(quest.current + amount, quest.target);
                        const isCompleted = newCurrent >= quest.target;

                        if (isCompleted && !quest.completed) {
                            xpToAdd += quest.rewardXp;
                            completedQuestTitle = quest.description;
                        }

                        return { ...quest, current: newCurrent, completed: isCompleted };
                    }
                    return quest;
                });

                if (JSON.stringify(updatedQuests) !== JSON.stringify(quests)) {
                    set({ quests: updatedQuests });
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
                const { quests, removeXp, history } = get();

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

                        return { ...quest, current: newCurrent, completed: isCompleted };
                    }
                    return quest;
                });

                if (JSON.stringify(updatedQuests) !== JSON.stringify(quests)) {
                    set({ quests: updatedQuests });
                }
            },

            recalculateAllQuests: (totals) => {
                const { quests, removeXp, history } = get();

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

                    return { ...quest, current: newCurrent, completed: isCompleted };
                });

                if (JSON.stringify(updatedQuests) !== JSON.stringify(quests)) {
                    set({ quests: updatedQuests });
                }
            },

            generateWeeklyQuests: () => {
                // Exemple simple de génération
                const newQuests: Quest[] = [
                    {
                        id: 'q1',
                        type: 'exercises',
                        description: 'Faire 50 exercices',
                        target: 50,
                        current: 0,
                        rewardXp: 50,
                        completed: false
                    },
                    {
                        id: 'q2',
                        type: 'workouts',
                        description: 'Compléter 3 séances',
                        target: 3,
                        current: 0,
                        rewardXp: 100,
                        completed: false
                    },
                    {
                        id: 'q3',
                        type: 'duration',
                        description: '60 minutes de sport',
                        target: 60,
                        current: 0,
                        rewardXp: 75,
                        completed: false
                    }
                ];
                set({ quests: newQuests });
            }
        }),
        {
            name: 'fittrack-gamification-store',
            storage: createJSONStorage(() => zustandStorage),
        }
    )
);
