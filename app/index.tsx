// ============================================================================
// TODAY SCREEN - Écran principal avec design premium et cozy
// ============================================================================

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScanBarcode } from 'lucide-react-native';
import {
    GlassCard,
    ProgressRing,
    Button,
    DayBadge,
    WorkoutCard,
    MonthCard,
    SectionHeader,
    EmptyState,
    EntryDetailModal,
    HealthConnectPromptModal,
} from '../src/components/ui';
import { AddEntryBottomSheet, AddEntryBottomSheetRef } from '../src/components/sheets';
import { useAppStore, useGamificationStore, useEditorStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../src/constants';
import { getWeekDaysInfo } from '../src/utils/date';
import { checkHealthConnectOnStartup, setHealthConnectModalCallback, navigateToHealthConnect } from '../src/services/healthConnectStartup';
import type { Entry, HomeWorkoutEntry, RunEntry } from '../src/types';

// Helper pour obtenir la salutation selon l'heure
const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
};

// Helper pour obtenir un message motivationnel selon l'heure
const getMotivationalMessage = (t: (key: string) => string): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.motivational.morning');
    if (hour < 18) return t('home.motivational.afternoon');
    return t('home.motivational.evening');
};

export default function TodayScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const bottomSheetRef = useRef<AddEntryBottomSheetRef>(null);
    const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    
    // Health Connect modal state
    const [healthConnectModalVisible, setHealthConnectModalVisible] = useState(false);
    const [healthConnectWorkoutCount, setHealthConnectWorkoutCount] = useState(0);

    const {
        entries,
        settings,
        deleteEntry,
        getStreak,
        getWeekWorkoutsCount,
        getSportEntries,
        getMonthlyStats,
    } = useAppStore();

    const { checkAndRefreshQuests } = useGamificationStore();
    const { entryToEdit, setEntryToEdit } = useEditorStore();

    // Health Connect startup check with custom modal
    useEffect(() => {
        // Set up the callback for showing the modal
        setHealthConnectModalCallback((count: number) => {
            setHealthConnectWorkoutCount(count);
            setHealthConnectModalVisible(true);
        });

        const timer = setTimeout(() => {
            checkHealthConnectOnStartup();
        }, 1000);
        
        return () => {
            clearTimeout(timer);
            setHealthConnectModalCallback(null);
        };
    }, []);

    const handleHealthConnectViewActivities = useCallback(() => {
        setHealthConnectModalVisible(false);
        navigateToHealthConnect();
    }, []);

    const handleHealthConnectSkip = useCallback(() => {
        setHealthConnectModalVisible(false);
    }, []);

    // Listen for entry edits from other screens
    useEffect(() => {
        if (entryToEdit) {
            bottomSheetRef.current?.edit(entryToEdit);
            setEntryToEdit(null);
        }
    }, [entryToEdit, setEntryToEdit]);

    const streak = getStreak();
    const weekWorkoutsCount = getWeekWorkoutsCount();
    const weeklyGoal = settings.weeklyGoal;
    const sportEntries = getSportEntries();
    const monthlyStats = getMonthlyStats();
    const weekDays = getWeekDaysInfo();

    // L'objectif est atteint ?
    const goalAchieved = weekWorkoutsCount >= weeklyGoal;

    // Jours avec activité cette semaine
    const daysWithActivity = useMemo(() => {
        const dates = new Set<string>();
        sportEntries.forEach(e => {
            if (weekDays.some(d => d.date === e.date)) {
                dates.add(e.date);
            }
        });
        return dates;
    }, [sportEntries, weekDays]);

    const recentWorkouts = sportEntries.slice(0, 5);

    const handleOpenModal = useCallback(() => {
        bottomSheetRef.current?.present();
    }, []);

    const handleLongPressAdd = useCallback(() => {
        // Long press ouvre directement le rep counter
        router.push('/rep-counter');
    }, [router]);

    const handleEntryPress = useCallback((entry: Entry) => {
        setSelectedEntry(entry);
        setDetailModalVisible(true);
    }, []);

    const handleDeleteEntry = useCallback((id: string) => {
        // deleteEntry gère automatiquement la synchro gamification
        deleteEntry(id);
    }, [deleteEntry]);

    const handleEditEntry = useCallback((entry: Entry) => {
        setDetailModalVisible(false);
        setTimeout(() => {
            bottomSheetRef.current?.edit(entry);
        }, 100);
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* HERO HEADER - Gradient avec message motivationnel */}
                <LinearGradient
                    colors={['rgba(11, 12, 15, 0.98)', 'rgba(11, 12, 15, 0.7)', 'transparent']}
                    style={styles.heroHeader}
                >
                    <View style={styles.heroHeaderContent}>
                        <View style={styles.heroHeaderLeft}>
                            <Text style={styles.heroGreeting}>{getGreeting()} 👋</Text>
                            <Text style={styles.heroMotivation}>{getMotivationalMessage(t)}</Text>
                        </View>
                        <View style={styles.streakBadge}>
                            <Text style={styles.streakEmoji}>🔥</Text>
                            <Text style={styles.streakValue}>{streak.current}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* OBJECTIF HEBDO avec progression */}
                <GlassCard style={styles.weeklyProgressCard}>
                    <View style={styles.weeklyProgressContent}>
                        <View style={styles.weeklyProgressLeft}>
                            {goalAchieved ? (
                                <View style={styles.trophyContainer}>
                                    <Text style={styles.trophyEmoji}>🏆</Text>
                                </View>
                            ) : (
                                <ProgressRing
                                    current={weekWorkoutsCount}
                                    goal={weeklyGoal}
                                    size={56}
                                    strokeWidth={5}
                                />
                            )}
                            <View style={styles.weeklyProgressMeta}>
                                <Text style={styles.weeklyProgressLabel}>
                                    {goalAchieved ? t('home.goalAchieved', 'OBJECTIF ATTEINT !') : t('home.weeklyGoal').toUpperCase()}
                                </Text>
                                <Text style={styles.weeklyProgressValue}>
                                    {t('home.weeklyProgressRight', { current: weekWorkoutsCount, goal: weeklyGoal })}
                                </Text>
                            </View>
                        </View>
                    </View>
                </GlassCard>

                {/* CETTE SEMAINE */}
                <GlassCard style={styles.weekSection}>
                    <SectionHeader
                        title={t('home.thisWeek').toUpperCase()}
                        muted
                        rightText={`${weekWorkoutsCount}/${weeklyGoal}`}
                    />
                    <View style={styles.weekRow}>
                        {weekDays.map((day) => (
                            <DayBadge
                                key={day.date}
                                dayOfWeek={day.dayOfWeek}
                                dayNumber={day.dayNumber}
                                isToday={day.isToday}
                                isDone={daysWithActivity.has(day.date)}
                            />
                        ))}
                    </View>
                </GlassCard>

                {/* CTA - Ajouter une séance */}
                <Pressable
                    onPress={handleOpenModal}
                    onLongPress={handleLongPressAdd}
                    delayLongPress={400}
                >
                    {({ pressed }) => (
                        <LinearGradient
                            colors={Gradients.cta as any}
                            style={[styles.ctaButton, pressed && styles.ctaPressed]}
                        >
                            <Text style={styles.ctaIcon}>+</Text>
                            <Text style={styles.ctaText}>{t('home.quickActions.addWorkout')}</Text>
                        </LinearGradient>
                    )}
                </Pressable>

                {/* Quick Check Button - OpenFoodFacts */}
                {settings.openFoodFactsEnabled && (
                    <TouchableOpacity
                        style={styles.quickCheckButton}
                        onPress={() => router.push('/barcode-scanner')}
                        activeOpacity={0.8}
                    >
                        <ScanBarcode size={20} color="#22c55e" />
                        <Text style={styles.quickCheckText}>{t('home.quickCheck')}</Text>
                    </TouchableOpacity>
                )}


                {/* ACTIVITÉ RÉCENTE */}
                <View style={styles.section}>
                    <SectionHeader
                        title={t('home.recentActivity')}
                        actionLabel={sportEntries.length > 5 ? t('common.seeAll') : undefined}
                        onAction={() => router.push('/progress')}
                    />
                    {recentWorkouts.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.hscroll}
                        >
                            {recentWorkouts.map((workout) => (
                                <WorkoutCard
                                    key={workout.id}
                                    entry={workout}
                                    onPress={() => handleEntryPress(workout)}
                                />
                            ))}
                        </ScrollView>
                    ) : (
                        <EmptyState
                            icon="💪"
                            title={t('home.noActivity')}
                            subtitle={t('home.noActivityHint')}
                        />
                    )}
                </View>

                {/* Espace pour le bottom nav */}
                <View style={{ height: 20 }} />
            </ScrollView>

            {/* MODAL DÉTAILS */}
            <EntryDetailModal
                entry={selectedEntry}
                visible={detailModalVisible}
                onClose={() => setDetailModalVisible(false)}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
            />

            {/* HEALTH CONNECT PROMPT MODAL */}
            <HealthConnectPromptModal
                visible={healthConnectModalVisible}
                workoutCount={healthConnectWorkoutCount}
                onViewActivities={handleHealthConnectViewActivities}
                onSkip={handleHealthConnectSkip}
            />

            {/* BOTTOM SHEET D'AJOUT */}
            <AddEntryBottomSheet ref={bottomSheetRef} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100,
    },

    // Hero Header - Gradient avec message motivationnel
    heroHeader: {
        marginHorizontal: -Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xxl,
        marginBottom: Spacing.lg,
    },
    heroHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroHeaderLeft: {
        flex: 1,
        gap: 4,
    },
    heroGreeting: {
        fontSize: FontSize.display,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        letterSpacing: -0.5,
    },
    heroMotivation: {
        fontSize: FontSize.lg,
        color: Colors.muted,
        fontWeight: FontWeight.medium,
        lineHeight: 22,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 107, 90, 0.15)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 90, 0.25)',
    },
    streakEmoji: {
        fontSize: 18,
    },
    streakValue: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.accent,
    },

    // Weekly Progress Card
    weeklyProgressCard: {
        marginBottom: Spacing.lg,
    },
    weeklyProgressContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weeklyProgressLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    weeklyProgressMeta: {
        gap: 2,
    },
    weeklyProgressLabel: {
        fontSize: FontSize.xs,
        letterSpacing: 1,
        color: 'rgba(255, 255, 255, 0.70)',
        fontWeight: FontWeight.semibold,
    },
    weeklyProgressValue: {
        fontSize: FontSize.lg,
        color: Colors.text,
        fontWeight: FontWeight.bold,
    },
    trophyContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(245, 200, 66, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.gold,
    },
    trophyEmoji: {
        fontSize: 28,
    },

    // Week Section
    weekSection: {
        marginBottom: Spacing.lg,
    },
    weekRow: {
        flexDirection: 'row',
        gap: 6,
    },

    // CTA Button
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.md,
        shadowColor: '#d79686',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
    ctaPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    ctaIcon: {
        fontSize: 20,
        color: '#1b0f0c',
        fontWeight: FontWeight.bold,
    },
    ctaText: {
        color: '#1b0f0c',
        fontSize: FontSize.xl,
        fontWeight: FontWeight.extrabold,
    },
    
    // Quick Check Button (OpenFoodFacts)
    quickCheckButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.lg,
    },
    quickCheckText: {
        color: '#22c55e',
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },

    // Sections
    section: {
        marginBottom: Spacing.lg,
    },
    hscroll: {
        gap: 12,
        paddingRight: Spacing.lg,
    },
});
