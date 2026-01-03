// ============================================================================
// PROGRESS SCREEN - Streak, Stats, Graphiques (Redesign complet)
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Svg, { Rect, Text as SvgText, Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import {
    Flame,
    Trophy,
    Target,
    TrendingUp,
    Calendar,
    Dumbbell,
    Footprints,
    Scale,
    Zap,
    Award,
    CheckCircle2,
} from 'lucide-react-native';
import {
    GlassCard,
    SectionHeader,
    BadgeWithProgress,
    EmptyState,
} from '../src/components/ui';
import { useAppStore } from '../src/stores';
import { getBadgesWithState } from '../src/utils/badges';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import type { MeasureEntry, HomeWorkoutEntry } from '../src/types';
import { useTranslation } from 'react-i18next';
import { getMonthName } from '../src/utils/date';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Composant pour une stat card
function StatCard({
    icon,
    value,
    label,
    color,
    delay = 0
}: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    color: string;
    delay?: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: `${color}22` }]}>
                {icon}
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Animated.View>
    );
}

// Composant pour le streak hero
function StreakHero({ current, best }: { current: number; best: number }) {
    const { t } = useTranslation();
    const streakProgress = best > 0 ? (current / best) * 100 : 0;

    return (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
            <LinearGradient
                colors={['rgba(31, 106, 102, 0.6)', 'rgba(31, 106, 102, 0.25)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.streakHero}
            >
                <View style={styles.streakContent}>
                    <View style={styles.streakMain}>
                        <View style={styles.streakIconWrapper}>
                            <Flame size={40} color="#fbbf24" fill="#fbbf24" />
                        </View>
                        <View style={styles.streakInfo}>
                            <Text style={styles.streakLabel}>{t('progress.streak.current')}</Text>
                            <Text style={styles.streakValue}>
                                {current} <Text style={styles.streakUnit}>{current > 1 ? t('common.days') : t('common.day')}</Text>
                            </Text>
                        </View>
                    </View>

                    <View style={styles.streakBest}>
                        <Trophy size={16} color={Colors.warning} />
                        <Text style={styles.streakBestText}>{t('progress.streak.record')}: {best}</Text>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={styles.streakProgressContainer}>
                    <View style={styles.streakProgressBg}>
                        <View style={[styles.streakProgressFill, { width: `${Math.min(streakProgress, 100)}%` }]} />
                    </View>
                    <Text style={styles.streakProgressText}>
                        {current > 0 ? t('progress.streak.percentOfRecord', { percent: Math.round(streakProgress) }) : t('progress.streak.startToday')}
                    </Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

// Composant pour le calendrier
function MonthCalendar({
    daysInMonth,
    startDayOfWeek,
    activeDays,
    monthName
}: {
    daysInMonth: number;
    startDayOfWeek: number;
    activeDays: Set<number>;
    monthName: string;
}) {
    const { t } = useTranslation();
    const today = new Date().getDate();
    const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    return (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
            <GlassCard style={styles.calendarCard}>
                <View style={styles.calendarHeader}>
                    <Calendar size={18} color={Colors.cta} />
                    <Text style={styles.calendarTitle}>{monthName}</Text>
                    <View style={styles.calendarBadge}>
                        <Text style={styles.calendarBadgeText}>{t('progress.activeDays', { count: activeDays.size })}</Text>
                    </View>
                </View>

                {/* Week days header */}
                <View style={styles.weekDaysRow}>
                    {weekDays.map((day, i) => (
                        <Text key={i} style={styles.weekDayLabel}>{day}</Text>
                    ))}
                </View>

                {/* Calendar grid */}
                <View style={styles.calendarGrid}>
                    {Array.from({ length: 42 }).map((_, index) => {
                        const dayIndex = index - startDayOfWeek;
                        if (dayIndex < 0 || dayIndex >= daysInMonth) {
                            return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
                        }
                        const day = dayIndex + 1;
                        const isActive = activeDays.has(day);
                        const isToday = day === today;

                        return (
                            <View
                                key={day}
                                style={[
                                    styles.calendarDay,
                                    isActive && styles.calendarDayActive,
                                    isToday && styles.calendarDayToday,
                                ]}
                            >
                                {isActive ? (
                                    <CheckCircle2 size={16} color={Colors.cta} fill={`${Colors.cta}33`} />
                                ) : (
                                    <Text style={[styles.calendarDayText, isToday && styles.calendarDayTextToday]}>
                                        {day}
                                    </Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            </GlassCard>
        </Animated.View>
    );
}

// Composant pour le graphique des séances
function WorkoutChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
    const { t } = useTranslation();

    if (data.length === 0) {
        return (
            <EmptyState
                icon="📊"
                title={t('progress.noData')}
                subtitle={t('progress.noDataHint')}
            />
        );
    }

    const chartWidth = 280;
    const chartHeight = 100;
    const barWidth = Math.min(35, (chartWidth - 20) / data.length - 8);

    return (
        <View style={styles.chartWrapper}>
            <Svg width="100%" height={130} viewBox={`0 0 ${chartWidth} 130`}>
                <Defs>
                    <SvgLinearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor={Colors.cta} />
                        <Stop offset="100%" stopColor={Colors.cta2} />
                    </SvgLinearGradient>
                </Defs>
                {data.map((item, index) => {
                    const gap = (chartWidth - data.length * barWidth) / (data.length + 1);
                    const x = gap + index * (barWidth + gap);
                    const barHeight = (item.value / maxValue) * 80;
                    const y = chartHeight - barHeight;

                    return (
                        <React.Fragment key={index}>
                            {/* Bar shadow */}
                            <Rect
                                x={x + 2}
                                y={y + 2}
                                width={barWidth}
                                height={barHeight}
                                rx={6}
                                fill="rgba(0,0,0,0.3)"
                            />
                            {/* Bar */}
                            <Rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                rx={6}
                                fill="url(#barGradient)"
                            />
                            {/* Value label */}
                            <SvgText
                                x={x + barWidth / 2}
                                y={y - 8}
                                fontSize="12"
                                fill={Colors.text}
                                textAnchor="middle"
                                fontWeight="600"
                            >
                                {item.value}
                            </SvgText>
                            {/* Month label */}
                            <SvgText
                                x={x + barWidth / 2}
                                y={chartHeight + 18}
                                fontSize="10"
                                fill={Colors.muted}
                                textAnchor="middle"
                            >
                                {item.label}
                            </SvgText>
                        </React.Fragment>
                    );
                })}
            </Svg>
        </View>
    );
}

// Composant pour le graphique de poids
function WeightChart({ data }: { data: MeasureEntry[] }) {
    if (data.length < 2) return null;

    const weights = data.map(d => d.weight!);
    const minWeight = Math.min(...weights) - 1;
    const maxWeight = Math.max(...weights) + 1;
    const range = maxWeight - minWeight || 1;
    const width = 280;
    const height = 100;
    const padding = 20;

    const points = data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((d.weight! - minWeight) / range) * (height - 2 * padding);
        return { x, y, weight: d.weight };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Area path
    const areaPath = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
        <View style={styles.weightChartWrapper}>
            <Svg width="100%" height={140} viewBox={`0 0 ${width} 140`}>
                <Defs>
                    <SvgLinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor={Colors.cta} />
                        <Stop offset="100%" stopColor={Colors.cta2} />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor={Colors.cta} stopOpacity="0.3" />
                        <Stop offset="100%" stopColor={Colors.cta} stopOpacity="0" />
                    </SvgLinearGradient>
                </Defs>

                {/* Area fill */}
                <Path d={areaPath} fill="url(#areaGradient)" />

                {/* Line */}
                <Path
                    d={pathD}
                    stroke="url(#lineGradient)"
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Points */}
                {points.map((p, i) => (
                    <React.Fragment key={i}>
                        <Circle cx={p.x} cy={p.y} r={6} fill={Colors.cta} />
                        <Circle cx={p.x} cy={p.y} r={3} fill={Colors.bg} />
                        <SvgText
                            x={p.x}
                            y={p.y - 12}
                            fontSize="10"
                            fill={Colors.text}
                            textAnchor="middle"
                            fontWeight="600"
                        >
                            {p.weight}
                        </SvgText>
                    </React.Fragment>
                ))}

                {/* Axis labels */}
                <SvgText x={5} y={height - padding + 5} fontSize="9" fill={Colors.muted}>
                    {minWeight.toFixed(1)}
                </SvgText>
                <SvgText x={5} y={padding} fontSize="9" fill={Colors.muted}>
                    {maxWeight.toFixed(1)}
                </SvgText>
            </Svg>

            <View style={styles.weightSummary}>
                <View style={styles.weightSummaryItem}>
                    <Text style={styles.weightSummaryLabel}>Dernier</Text>
                    <Text style={styles.weightSummaryValue}>{data[data.length - 1]?.weight} kg</Text>
                </View>
                {data.length >= 2 && (
                    <View style={styles.weightSummaryItem}>
                        <Text style={styles.weightSummaryLabel}>Évolution</Text>
                        <Text style={[
                            styles.weightSummaryValue,
                            { color: data[data.length - 1].weight! <= data[0].weight! ? Colors.success : Colors.error }
                        ]}>
                            {data[data.length - 1].weight! - data[0].weight! > 0 ? '+' : ''}
                            {(data[data.length - 1].weight! - data[0].weight!).toFixed(1)} kg
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

export default function ProgressScreen() {
    const {
        entries,
        settings,
        unlockedBadges,
        getStreak,
        getMonthlyStats,
        getSportEntries,
    } = useAppStore();

    const { t } = useTranslation();

    const streak = getStreak();
    const monthlyStats = getMonthlyStats();
    const sportEntries = getSportEntries();

    // Stats calculées
    const totalWorkouts = sportEntries.length;
    const totalRuns = sportEntries.filter(e => e.type === 'run').length;
    const totalHomeWorkouts = sportEntries.filter(e => e.type === 'home').length;
    const totalDistance = sportEntries
        .filter(e => e.type === 'run')
        .reduce((sum, e) => sum + (e.type === 'run' ? e.distanceKm : 0), 0);
    const totalDuration = sportEntries
        .reduce((sum, e) => {
            if (e.type === 'run') return sum + e.durationMinutes;
            if (e.type === 'beatsaber') return sum + e.durationMinutes;
            return sum;
        }, 0);

    // Mois pertinents pour le graphique
    const relevantMonths = useMemo(() =>
        monthlyStats.filter(stat => stat.count > 0).slice(-6),
        [monthlyStats]
    );

    const weeklyWorkoutsData = useMemo(() => {
        return relevantMonths.map(stat => ({
            label: stat.month.slice(5),
            value: stat.count,
        }));
    }, [relevantMonths]);

    const maxValue = Math.max(...weeklyWorkoutsData.map(d => d.value), 1);

    // Badges avec état
    const badges = useMemo(() => getBadgesWithState(unlockedBadges), [unlockedBadges]);

    // Badge progress
    const badgeProgress = useMemo(() => {
        const progressMap: Record<string, { current: number; target: number; label: string }> = {};

        const addProgress = (id: string, current: number, target: number, label: string) => {
            if (!badges.find(b => b.id === id)?.unlockedAt) {
                progressMap[id] = { current, target, label };
            }
        };

        addProgress('first_workout', totalWorkouts, 1, `${totalWorkouts}/1`);
        addProgress('streak_7', streak.current, 7, `${streak.current}/7 jours`);
        addProgress('streak_30', streak.current, 30, `${streak.current}/30 jours`);
        addProgress('workouts_10', totalWorkouts, 10, `${totalWorkouts}/10`);
        addProgress('workouts_50', totalWorkouts, 50, `${totalWorkouts}/50`);
        addProgress('workouts_100', totalWorkouts, 100, `${totalWorkouts}/100`);
        addProgress('runner_10km', totalDistance, 10, `${totalDistance.toFixed(1)}/10 km`);
        addProgress('runner_50km', totalDistance, 50, `${totalDistance.toFixed(1)}/50 km`);

        return progressMap;
    }, [badges, totalWorkouts, totalDistance, streak]);

    // Historique de poids
    const weightHistory = useMemo(() => {
        return entries
            .filter((e): e is MeasureEntry => e.type === 'measure' && e.weight !== undefined)
            .slice(0, 10)
            .reverse();
    }, [entries]);

    // Personal Records (PRs) pour les exercices trackés en temps réel
    const personalRecords = useMemo(() => {
        const prs: { id: string; name: string; icon: string; value: string; type: 'reps' | 'time' }[] = [];
        
        // Exercices à tracker (doit correspondre à ceux du rep-counter)
        const trackedExercises = [
            { id: 'pushups', name: t('repCounter.exercises.pushups'), icon: '💪', type: 'reps' as const },
            { id: 'situps', name: t('repCounter.exercises.situps'), icon: '🔥', type: 'reps' as const },
            { id: 'squats', name: t('repCounter.exercises.squats'), icon: '🦵', type: 'reps' as const },
            { id: 'jumping_jacks', name: t('repCounter.exercises.jumpingJacks'), icon: '⭐', type: 'reps' as const },
            { id: 'plank', name: t('repCounter.exercises.plank'), icon: '🧘', type: 'time' as const },
        ];

        for (const exercise of trackedExercises) {
            const relevantWorkouts = entries.filter(
                (e): e is HomeWorkoutEntry => e.type === 'home' && (
                    e.exercises.toLowerCase().includes(`${exercise.id.toLowerCase()}:`) ||
                    (e.name?.toLowerCase().includes(exercise.name.toLowerCase()) ?? false)
                )
            );

            let bestValue = 0;
            for (const workout of relevantWorkouts) {
                if (exercise.type === 'time') {
                    // Pour les exercices basés sur le temps (planche)
                    const durationSecs = (workout.durationMinutes ?? 0) * 60;
                    if (durationSecs > bestValue) {
                        bestValue = durationSecs;
                    }
                } else {
                    // Pour les exercices basés sur les reps
                    const reps = workout.totalReps ?? 0;
                    if (reps > bestValue) {
                        bestValue = reps;
                    }
                }
            }

            if (bestValue > 0) {
                prs.push({
                    id: exercise.id,
                    name: exercise.name,
                    icon: exercise.icon,
                    value: exercise.type === 'time' 
                        ? `${bestValue}s` 
                        : `${bestValue} reps`,
                    type: exercise.type,
                });
            }
        }

        return prs;
    }, [entries, t]);

    // Top exercice du mois
    const topExercise = useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthWorkouts = entries.filter(
            (e): e is HomeWorkoutEntry => e.type === 'home' && e.date.startsWith(currentMonth)
        );

        const exerciseCounts: Record<string, number> = {};
        monthWorkouts.forEach(workout => {
            const lines = workout.exercises.split('\n');
            lines.forEach(line => {
                const match = line.match(/^([^:]+):/);
                if (match) {
                    const name = match[1].trim().toLowerCase();
                    exerciseCounts[name] = (exerciseCounts[name] || 0) + 1;
                }
            });
        });

        const sorted = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? { name: sorted[0][0], count: sorted[0][1] } : null;
    }, [entries]);

    // Calendrier du mois
    const calendarData = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = (firstDay.getDay() + 6) % 7;

        const monthStr = now.toISOString().slice(0, 7);
        const activeDays = new Set(
            sportEntries
                .filter(e => e.date.startsWith(monthStr))
                .map(e => parseInt(e.date.slice(8, 10), 10))
        );

        return {
            daysInMonth,
            startDayOfWeek,
            activeDays,
            monthName: getMonthName(monthStr),
        };
    }, [sportEntries]);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeIn.delay(50)}>
                    <Text style={styles.screenTitle}>{t('progress.title')}</Text>
                </Animated.View>

                {/* Streak Hero */}
                <StreakHero current={streak.current} best={streak.best} />

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon={<Dumbbell size={20} color="#4ade80" />}
                        value={totalWorkouts}
                        label={t('progress.stats.workouts')}
                        color="#4ade80"
                        delay={150}
                    />
                    <StatCard
                        icon={<Footprints size={20} color="#60a5fa" />}
                        value={totalDistance.toFixed(1)}
                        label={t('progress.stats.distance')}
                        color="#60a5fa"
                        delay={200}
                    />
                    <StatCard
                        icon={<Zap size={20} color="#fbbf24" />}
                        value={totalDuration}
                        label={t('progress.stats.duration')}
                        color="#fbbf24"
                        delay={250}
                    />
                    <StatCard
                        icon={<Target size={20} color={Colors.cta} />}
                        value={settings.weeklyGoal}
                        label={t('progress.stats.weeklyGoal')}
                        color={Colors.cta}
                        delay={300}
                    />
                </View>

                {/* Calendrier */}
                <MonthCalendar {...calendarData} />

                {/* Graphique séances par mois */}
                <Animated.View entering={FadeInDown.delay(400).springify()}>
                    <GlassCard style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <TrendingUp size={18} color={Colors.cta} />
                            <Text style={styles.chartTitle}>{t('progress.workoutsPerMonth')}</Text>
                        </View>
                        <WorkoutChart data={weeklyWorkoutsData} maxValue={maxValue} />
                    </GlassCard>
                </Animated.View>

                {/* Évolution du poids */}
                {weightHistory.length >= 2 && (
                    <Animated.View entering={FadeInDown.delay(500).springify()}>
                        <GlassCard style={styles.chartCard}>
                            <View style={styles.chartHeader}>
                                <Scale size={18} color={Colors.cta} />
                                <Text style={styles.chartTitle}>{t('progress.weightEvolution')}</Text>
                            </View>
                            <WeightChart data={weightHistory} />
                        </GlassCard>
                    </Animated.View>
                )}

                {/* Top exercice */}
                {topExercise && (
                    <Animated.View entering={FadeInDown.delay(550).springify()}>
                        <GlassCard style={styles.topExerciseCard}>
                            <View style={styles.topExerciseRow}>
                                <View style={styles.topExerciseIconContainer}>
                                    <Award size={24} color={Colors.warning} />
                                </View>
                                <View style={styles.topExerciseInfo}>
                                    <Text style={styles.topExerciseLabel}>{t('progress.topExercise')}</Text>
                                    <Text style={styles.topExerciseName}>{t(`repCounter.exercises.${topExercise.name === 'jumping_jacks' ? 'jumpingJacks' : topExercise.name}`, { defaultValue: topExercise.name })}</Text>
                                </View>
                                <View style={styles.topExerciseCount}>
                                    <Text style={styles.topExerciseCountValue}>{topExercise.count}×</Text>
                                </View>
                            </View>
                        </GlassCard>
                    </Animated.View>
                )}

                {/* Personal Records */}
                {personalRecords.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(575).springify()}>
                        <GlassCard style={styles.prCard}>
                            <View style={styles.prHeader}>
                                <Trophy size={18} color="#facc15" />
                                <Text style={styles.prTitle}>{t('progress.personalRecords')}</Text>
                            </View>
                            <View style={styles.prGrid}>
                                {personalRecords.map((pr) => (
                                    <View key={pr.id} style={styles.prItem}>
                                        <Text style={styles.prIcon}>{pr.icon}</Text>
                                        <Text style={styles.prName}>{pr.name}</Text>
                                        <Text style={styles.prValue}>{pr.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </GlassCard>
                    </Animated.View>
                )}
                {/* Badges */}
                <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.badgesSection}>
                    <SectionHeader title={`🏆 ${t('progress.badges')}`} />
                    <View style={styles.badgesList}>
                        {badges.map((badge) => {
                            const progress = badgeProgress[badge.id];
                            return (
                                <BadgeWithProgress
                                    key={badge.id}
                                    badge={badge}
                                    currentProgress={progress ? (progress.current / progress.target) * 100 : undefined}
                                    progressLabel={progress?.label}
                                />
                            );
                        })}
                    </View>
                </Animated.View>
            </ScrollView>
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
        padding: Spacing.lg,
        paddingBottom: 120,
    },
    screenTitle: {
        fontSize: 32,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        marginBottom: Spacing.lg,
        letterSpacing: -0.5,
    },

    // Streak Hero
    streakHero: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    streakContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    streakMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    streakIconWrapper: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    streakInfo: {},
    streakLabel: {
        fontSize: FontSize.sm,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 2,
    },
    streakValue: {
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    streakUnit: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.medium,
        color: Colors.muted,
    },
    streakBest: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    streakBestText: {
        fontSize: FontSize.sm,
        color: Colors.warning,
        fontWeight: FontWeight.semibold,
    },
    streakProgressContainer: {
        marginTop: Spacing.sm,
    },
    streakProgressBg: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    streakProgressFill: {
        height: '100%',
        backgroundColor: Colors.warning,
        borderRadius: 3,
    },
    streakProgressText: {
        fontSize: FontSize.xs,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 6,
        textAlign: 'center',
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    statValue: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },

    // Calendar
    calendarCard: {
        marginBottom: Spacing.lg,
    },
    calendarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: Spacing.md,
    },
    calendarTitle: {
        flex: 1,
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textTransform: 'capitalize',
    },
    calendarBadge: {
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    calendarBadgeText: {
        fontSize: FontSize.xs,
        color: Colors.cta,
        fontWeight: FontWeight.semibold,
    },
    weekDaysRow: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
    },
    weekDayLabel: {
        flex: 1,
        textAlign: 'center',
        fontSize: FontSize.xs,
        color: Colors.muted,
        fontWeight: FontWeight.semibold,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDayEmpty: {
        width: '14.28%',
        aspectRatio: 1,
    },
    calendarDay: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    calendarDayActive: {
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
    },
    calendarDayToday: {
        borderWidth: 1,
        borderColor: Colors.cta,
    },
    calendarDayText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        fontWeight: FontWeight.medium,
    },
    calendarDayTextToday: {
        color: Colors.text,
        fontWeight: FontWeight.bold,
    },

    // Charts
    chartCard: {
        marginBottom: Spacing.lg,
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: Spacing.md,
    },
    chartTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    chartWrapper: {
        alignItems: 'center',
    },
    weightChartWrapper: {
        alignItems: 'center',
    },
    weightSummary: {
        flexDirection: 'row',
        gap: Spacing.xl,
        marginTop: Spacing.md,
    },
    weightSummaryItem: {
        alignItems: 'center',
    },
    weightSummaryLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    weightSummaryValue: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },

    // Top Exercise
    topExerciseCard: {
        marginBottom: Spacing.lg,
    },
    topExerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    topExerciseIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    topExerciseInfo: {
        flex: 1,
    },
    topExerciseLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginBottom: 2,
    },
    topExerciseName: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textTransform: 'capitalize',
    },
    topExerciseCount: {
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    topExerciseCountValue: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.warning,
    },

    // Personal Records
    prCard: {
        marginBottom: Spacing.lg,
    },
    prHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    prTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    prGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    prItem: {
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        minWidth: (SCREEN_WIDTH - Spacing.lg * 2 - 48 - 24) / 3,
        flexGrow: 1,
    },
    prIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    prName: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginBottom: 2,
        textAlign: 'center',
    },
    prValue: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#facc15',
    },

    // Badges
    badgesSection: {
        marginTop: Spacing.sm,
    },
    badgesList: {
        gap: 12,
    },
});
