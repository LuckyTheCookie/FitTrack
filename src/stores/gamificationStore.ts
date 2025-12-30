
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

    // Actions
    addXp: (amount: number) => void;
    checkLevelUp: () => boolean; // Retourne true si level up
    updateQuestProgress: (type: Quest['type'], value: number) => void;
    generateWeeklyQuests: () => void;
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

            addXp: (amount) => {
                const { xp, level } = get();
                const nextLevelXp = getXpForNextLevel(level);
                let newXp = xp + amount;
                let newLevel = level;

                if (newXp >= nextLevelXp) {
                    // Level UP!
                    newXp -= nextLevelXp;
                    newLevel += 1;
                }

                set({
                    xp: newXp,
                    level: newLevel,
                    rank: getRank(newLevel)
                });
            },

            checkLevelUp: () => {
                // Cette fonction est implicitement gérée par addXp mais peut être utile pour l'UI
                return false;
            },

            updateQuestProgress: (type, amount) => {
                set((state) => {
                    const updatedQuests = state.quests.map(quest => {
                        if (!quest.completed && quest.type === type) {
                            const newCurrent = Math.min(quest.current + amount, quest.target);
                            const isCompleted = newCurrent >= quest.target;

                            if (isCompleted && !quest.completed) {
                                // Récompense immédiate
                                // Note: On ne peut pas appeler l'action du store dans le set, 
                                // mais on peut le faire après ou via un useEffect.
                                // Ici on simplifie en n'ajoutant pas l'XP directement, 
                                // l'appelant devra gérer l'ajout d'XP si quête complétée.
                                // Ou alors on ruse un peu.
                            }

                            return { ...quest, current: newCurrent, completed: isCompleted };
                        }
                        return quest;
                    });

                    return { quests: updatedQuests };
                });

                // Check completions for XP rewards
                const { quests, addXp } = get();
                // Une logique plus robuste serait nécessaire pour ne pas double-reward, 
                // mais pour l'instant on suppose que l'update est atomique.
            },

            generateWeeklyQuests: () => {
                // Exemple simple de génération
                const newQuests: Quest[] = [
                    {
                        id: 'q1',
                        type: 'exercises',
                        description: 'Faire 50 exercices (reps/sets cumulés)',
                        target: 50,
                        current: 0,
                        rewardXp: 50,
                        completed: false
                    },
                    {
                        id: 'q2',
                        type: 'workouts',
                        description: 'Compléter 3 séances cette semaine',
                        target: 3,
                        current: 0,
                        rewardXp: 100,
                        completed: false
                    },
                    {
                        id: 'q3',
                        type: 'duration',
                        description: 'S\'entraîner 60 minutes au total',
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
