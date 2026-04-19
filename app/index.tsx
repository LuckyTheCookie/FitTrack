// ============================================================================
// TODAY SCREEN — Editorial Dark Sport · Premium Redesign v3
// Logique dynamique 100% préservée · Nouveau langage visuel radical
// ============================================================================

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScanBarcode, ChevronRight, Flame } from 'lucide-react-native';
import {
    ProgressRing,
    DayBadge,
    WorkoutCard,
    HealthConnectPromptModal,
} from '../src/components/ui';
import { useAppStore } from '../src/stores';
import { getWeekDaysInfo } from '../src/utils/date';
import {
    checkHealthConnectOnStartup,
    setHealthConnectModalCallback,
    navigateToHealthConnect,
} from '../src/services/healthConnectStartup';
import { Colors, ScreenPalettes } from '../src/constants';

// ─── Design System ────────────────────────────────────────────────────────────

const C = ScreenPalettes.today;

const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };
const R = { sm: 10, md: 14, lg: 18, xl: 22, xxl: 26, pill: 999 };
const T = { micro: 9, xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, hero: 34 };
const W = {
    light: '300', reg: '400', med: '500',
    semi: '600', bold: '700', xbold: '800', black: '900',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getGreeting = (t: (key: string) => string): string => {
    const h = new Date().getHours();
    if (h < 12) return t('home.greeting.morning');
    if (h < 18) return t('home.greeting.afternoon');
    return t('home.greeting.evening');
};

const getMotivationalMessage = (t: (key: string) => string): string => {
    const h = new Date().getHours();
    if (h < 12) return t('home.motivational.morning');
    if (h < 18) return t('home.motivational.afternoon');
    return t('home.motivational.evening');
};

// ─── Chip ─────────────────────────────────────────────────────────────────────

const Chip: React.FC<{
    label: string;
    color?: string;
    bg?: string;
    border?: string;
}> = ({ label, color = C.textMuted, bg = Colors.transparent, border = C.border }) => (
    <View style={{ backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
        <Text style={{ fontSize: T.micro, fontWeight: W.black, color, letterSpacing: 1.8, textTransform: 'uppercase' }}>
            {label}
        </Text>
    </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TodayScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const [healthConnectModalVisible, setHealthConnectModalVisible] = useState(false);
    const [healthConnectWorkoutCount, setHealthConnectWorkoutCount] = useState(0);

    // Animations d'entrée
    const aHero  = useRef(new Animated.Value(0)).current;
    const aGoal  = useRef(new Animated.Value(0)).current;
    const aWeek  = useRef(new Animated.Value(0)).current;
    const aCta   = useRef(new Animated.Value(0)).current;
    const aList  = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.stagger(70, [aHero, aGoal, aWeek, aCta, aList].map(a =>
            Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 70, friction: 11 })
        )).start();
    }, []);

    const slide = (a: Animated.Value, dy = 22) => ({
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }) }],
    });

    // Stores
    const { settings, getStreak, getWeekWorkoutsCount, getSportEntries } = useAppStore();

    useEffect(() => {
        setHealthConnectModalCallback((count: number) => {
            setHealthConnectWorkoutCount(count);
            setHealthConnectModalVisible(true);
        });
        const timer = setTimeout(checkHealthConnectOnStartup, 1000);
        return () => { clearTimeout(timer); setHealthConnectModalCallback(null); };
    }, []);

    const streak            = getStreak();
    const weekWorkoutsCount = getWeekWorkoutsCount();
    const weeklyGoal        = settings.weeklyGoal;
    const sportEntries      = getSportEntries();
    const weekDays          = getWeekDaysInfo();
    const goalAchieved      = weekWorkoutsCount >= weeklyGoal;

    const daysWithActivity = useMemo(() => {
        const s = new Set<string>();
        sportEntries.forEach(e => { if (weekDays.some(d => d.date === e.date)) s.add(e.date); });
        return s;
    }, [sportEntries, weekDays]);

    const recentWorkouts = sportEntries.slice(0, 3);

    // Handlers
    const handleStartTracking = useCallback(() => router.push('/repCounter'), [router]);
    const handleEntryPress   = useCallback((entryId: string) => {
        router.push(`/workout/${entryId}`);
    }, [router]);

    // Render
    return (
        <SafeAreaView style={st.container} edges={['top']}>
            <StatusBar style="light" />

            <ScrollView style={st.scroll} contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>

                {/* ══════════════════════════════════════════════════════
                    HERO — Typographie éditoriale massive
                ══════════════════════════════════════════════════════ */}
                <Animated.View style={[st.heroSection, slide(aHero, 28)]}>
                    <View style={st.heroHalo} pointerEvents="none" />

                    {/* Salutation + streak sur la même ligne */}
                    <View style={st.heroTopRow}>
                        <View style={st.heroLeft}>
                            <Text style={st.heroGreeting}>{getGreeting(t)}</Text>
                            <Text style={st.heroMotivation}>{getMotivationalMessage(t)}</Text>
                        </View>
                        <View style={st.streakBadge}>
                            <LinearGradient
                                colors={[C.coral, C.amber]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={st.streakGrad}
                            >
                                <Flame size={15} color={Colors.warmDarkText} strokeWidth={2.5} />
                                <Text style={st.streakNum}>{streak.current}</Text>
                            </LinearGradient>
                        </View>
                    </View>
                    <View style={st.heroAccentLine} />
                </Animated.View>

                {/* ══════════════════════════════════════════════════════
                    OBJECTIF HEBDO — Grande métrique + segments
                ══════════════════════════════════════════════════════ */}
                <Animated.View style={slide(aGoal)}>
                    <LinearGradient
                        colors={[C.surfaceUp, C.surface]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={st.goalCard}
                    >
                        <View style={st.goalCardGlow} pointerEvents="none" />

                        <View style={st.goalCardHeader}>
                            <Chip
                                label={goalAchieved ? t('home.goalAchieved') : t('home.weeklyGoal')}
                                color={goalAchieved ? C.gold : C.textSub}
                                bg={goalAchieved ? C.goldSoft : Colors.transparent}
                                border={goalAchieved ? C.goldBorder : C.border}
                            />
                            {goalAchieved && <Text style={{ fontSize: 20 }}>🏆</Text>}
                        </View>

                        {/* Chiffre géant */}
                        <View style={st.goalMetricRow}>
                            <Text style={st.goalBigNum}>{weekWorkoutsCount}</Text>
                            <View style={st.goalMetricRight}>
                                <Text style={st.goalSlash}>/{weeklyGoal}</Text>
                                <Text style={st.goalUnit}>{t('home.sessions')}</Text>
                                <Text style={st.goalUnit}>{t('home.thisWeek')}</Text>
                            </View>
                        </View>

                        {/* Segments */}
                        <View style={st.segmentRow}>
                            {Array.from({ length: weeklyGoal }).map((_, i) => (
                                <View
                                    key={`goal-segment-${i}`}
                                    style={[
                                        st.segment,
                                        { flex: 1 },
                                        i < weekWorkoutsCount ? st.segmentFilled : st.segmentEmpty,
                                        i === 0 && { borderTopLeftRadius: R.pill, borderBottomLeftRadius: R.pill },
                                        i === weeklyGoal - 1 && { borderTopRightRadius: R.pill, borderBottomRightRadius: R.pill },
                                    ]}
                                />
                            ))}
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* ══════════════════════════════════════════════════════
                    CETTE SEMAINE
                ══════════════════════════════════════════════════════ */}
                <Animated.View style={[st.weekCard, slide(aWeek)]}>
                    <View style={st.weekCardHeader}>
                        <Text style={st.weekCardTitle}>{t('home.thisWeek')}</Text>
                        <View style={st.weekCountBadge}>
                            <Text style={st.weekCountText}>{weekWorkoutsCount}/{weeklyGoal}</Text>
                        </View>
                    </View>
                    <View style={st.weekDaysRow}>
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
                </Animated.View>

                {/* ══════════════════════════════════════════════════════
                    CTA + SCAN
                ══════════════════════════════════════════════════════ */}
                <Animated.View style={slide(aCta)}>
                    <Pressable
                        onPress={handleStartTracking}
                    >
                        {({ pressed }) => (
                            <View style={[st.ctaOuter, pressed && st.ctaPressed]}>
                                <LinearGradient
                                    colors={[C.coral, C.coralMid, C.amber]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={st.ctaGrad}
                                >
                                    <View style={st.ctaInnerGlow} pointerEvents="none" />
                                    <View style={st.ctaContent}>
                                        <View style={st.ctaPlusCircle}>
                                            <Text style={st.ctaPlusIcon}>▶</Text>
                                        </View>
                                        <Text style={st.ctaText}>{t('home.quickActions.startTracking', 'Demarrer le tracking')}</Text>
                                    </View>
                                    <ChevronRight size={20} color={Colors.overlayWarmDark45} strokeWidth={2.5} />
                                </LinearGradient>
                            </View>
                        )}
                    </Pressable>

                    {settings.openFoodFactsEnabled && (
                        <TouchableOpacity
                            style={st.scanBtn}
                            onPress={() => router.push('/barcode-scanner')}
                            activeOpacity={0.72}
                        >
                            <View style={st.scanIconWrap}>
                                <ScanBarcode size={16} color={C.green} strokeWidth={2.5} />
                            </View>
                            <Text style={st.scanText}>{t('home.quickCheck')}</Text>
                            <View style={{ flex: 1 }} />
                            <ChevronRight size={15} color={C.green} strokeWidth={2.5} style={{ opacity: 0.6 }} />
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* ══════════════════════════════════════════════════════
                    ACTIVITÉ RÉCENTE
                ══════════════════════════════════════════════════════ */}
                <Animated.View style={[st.listSection, slide(aList)]}>
                    <View style={st.listHeader}>
                        <View>
                            <Text style={st.listTitle}>{t('home.recentActivity')}</Text>
                            <Text style={st.listSub}>
                                {t('home.recentActivitySubtitle', { count: sportEntries.length })}
                            </Text>
                        </View>
                        {sportEntries.length > 3 && (
                            <TouchableOpacity
                                onPress={() => router.push('/workout')}
                                style={st.seeAllBtn}
                                activeOpacity={0.7}
                            >
                                <Text style={st.seeAllText}>{t('common.seeAll')}</Text>
                                <ChevronRight size={12} color={C.coral} strokeWidth={2.5} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {recentWorkouts.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={st.hscroll}
                        >
                            {recentWorkouts.map((workout) => (
                                <WorkoutCard
                                    key={workout.id}
                                    entry={workout}
                                    onPress={() => handleEntryPress(workout.id)}
                                />
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={st.emptyWrap}>
                            <LinearGradient colors={[C.surfaceUp, C.surface]} style={st.emptyCard}>
                                <Text style={st.emptyEmoji}>💪</Text>
                                <Text style={st.emptyTitle}>{t('home.noActivity')}</Text>
                                <Text style={st.emptySub}>{t('home.noActivityHint')}</Text>
                            </LinearGradient>
                        </View>
                    )}
                </Animated.View>

                <View style={{ height: 24 }} />
            </ScrollView>
            <HealthConnectPromptModal
                visible={healthConnectModalVisible}
                workoutCount={healthConnectWorkoutCount}
                onViewActivities={() => { setHealthConnectModalVisible(false); navigateToHealthConnect(); }}
                onSkip={() => setHealthConnectModalVisible(false)}
            />
        </SafeAreaView>
    );
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────

const HERO_HALO_TOP = -40;
const HERO_HALO_RIGHT = -60;

const st = StyleSheet.create({

    container:  { flex: 1, backgroundColor: C.bg },
    scroll:     { flex: 1 },
    content:    { paddingHorizontal: S.lg, paddingTop: S.sm, paddingBottom: 110 },

    // ── Hero
    heroSection: {
        marginBottom: S.xxl,
        marginTop: S.md,
        position: 'relative',
    },
    heroHalo: {
        position: 'absolute',
        top: HERO_HALO_TOP, right: HERO_HALO_RIGHT,
        width: 220, height: 220,
        borderRadius: 110,
        backgroundColor: Colors.overlayCoral055,
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: S.lg,
    },
    heroLeft: {
        flex: 1,
        gap: S.xs,
    },
    streakBadge: {
        borderRadius: R.pill,
        overflow: 'hidden',
        shadowColor: C.coral,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 8,
        flexShrink: 0,
        marginTop: 2,
    },
    streakGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    streakNum: {
        fontSize: T.xl,
        fontWeight: W.black,
        color: Colors.warmDarkText,
        letterSpacing: -0.5,
    },
    heroGreeting: {
        fontSize: T.xs,
        fontWeight: W.bold,
        color: C.textMuted,
        letterSpacing: 3,
        textTransform: 'uppercase',
    },
    heroMotivation: {
        fontSize: T.hero,
        color: C.text,
        fontFamily: 'Syne_700Bold',
        letterSpacing: -1.2,
        lineHeight: 40,
    },
    heroAccentLine: {
        marginTop: S.lg,
        height: 3,
        width: 44,
        borderRadius: R.pill,
        backgroundColor: C.coral,
        shadowColor: C.coral,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 4,
    },

    // ── Goal card
    goalCard: {
        borderRadius: R.xxl,
        borderWidth: 1,
        borderColor: C.border,
        padding: S.xl,
        marginBottom: S.md,
        overflow: 'hidden',
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    goalCardGlow: {
        position: 'absolute',
        top: -40, right: -40,
        width: 140, height: 140,
        borderRadius: 70,
        backgroundColor: Colors.overlayCoral07,
    },
    goalCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: S.xl,
    },
    goalMetricRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: S.sm,
        marginBottom: S.xl,
    },
    goalBigNum: {
        fontSize: 72,
        fontWeight: W.black,
        color: C.text,
        lineHeight: 72,
        letterSpacing: -3,
        includeFontPadding: false,
    },
    goalMetricRight: {
        paddingBottom: 8,
        gap: 1,
    },
    goalSlash: {
        fontSize: T.xxl,
        fontWeight: W.xbold,
        color: C.textMuted,
        letterSpacing: -0.5,
        lineHeight: 28,
    },
    goalUnit: {
        fontSize: T.xs,
        fontWeight: W.semi,
        color: C.textMuted,
        letterSpacing: 0.3,
    },
    goalRingFloat: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        opacity: 0.65,
    },
    segmentRow: {
        flexDirection: 'row',
        gap: 4,
        height: 5,
    },
    segment:        { height: '100%', borderRadius: 2 },
    segmentFilled:  {
        backgroundColor: C.coral,
        shadowColor: C.coral,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 4,
        elevation: 3,
    },
    segmentEmpty:   { backgroundColor: Colors.overlayWhite08 },

    // ── Week card
    weekCard: {
        backgroundColor: C.surface,
        borderRadius: R.xxl,
        borderWidth: 1,
        borderColor: C.border,
        padding: S.xl,
        marginBottom: S.md,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 6,
    },
    weekCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: S.lg,
    },
    weekCardTitle: {
        fontSize: T.lg,
        fontWeight: W.xbold,
        color: C.text,
        letterSpacing: -0.3,
    },
    weekCountBadge: {
        backgroundColor: C.coralSoft,
        borderWidth: 1,
        borderColor: C.coralGlow,
        borderRadius: R.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    weekCountText: {
        fontSize: T.xs,
        fontWeight: W.black,
        color: C.coral,
        letterSpacing: 0.5,
    },
    weekDaysRow: {
        flexDirection: 'row',
        gap: S.sm - 2,
    },

    // ── CTA
    ctaOuter: {
        borderRadius: R.xxl,
        marginBottom: S.xl,
        overflow: 'hidden',
        shadowColor: C.coral,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 12,
    },
    ctaPressed: {
        opacity: 0.87,
        transform: [{ scale: 0.973 }],
    },
    ctaGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: S.xl,
        gap: S.md,
    },
    ctaInnerGlow: {
        position: 'absolute',
        left: -20, top: -20,
        width: 100, height: 100,
        borderRadius: 50,
        backgroundColor: Colors.overlayWhite10,
    },
    ctaContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: S.md,
    },
    ctaPlusCircle: {
        width: 32, height: 32,
        borderRadius: 16,
        backgroundColor: Colors.overlayWarmDark20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaPlusIcon: {
        fontSize: 20,
        fontWeight: W.black,
        color: Colors.warmDarkText,
        lineHeight: 22,
        includeFontPadding: false,
    },
    ctaText: {
        fontSize: T.lg,
        fontWeight: W.black,
        color: Colors.warmDarkText,
        letterSpacing: -0.3,
    },

    // ── Scan
    scanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: S.md,
        backgroundColor: C.greenSoft,
        borderWidth: 1,
        borderColor: C.greenBorder,
        borderRadius: R.xl,
        paddingVertical: 14,
        paddingHorizontal: S.xl,
        marginBottom: S.xl,
    },
    scanIconWrap: {
        width: 30, height: 30,
        borderRadius: 15,
        backgroundColor: Colors.overlaySportGreen12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanText: {
        fontSize: T.md,
        fontWeight: W.semi,
        color: C.green,
        letterSpacing: 0.1,
    },

    // ── Liste
    listSection:    { marginBottom: S.lg },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: S.lg,
    },
    listTitle: {
        fontSize: T.xl,
        fontWeight: W.black,
        color: C.text,
        letterSpacing: -0.4,
        marginBottom: 2,
    },
    listSub: {
        fontSize: T.xs,
        fontWeight: W.med,
        color: C.textMuted,
        letterSpacing: 0.2,
    },
    seeAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: C.coralSoft,
        borderWidth: 1,
        borderColor: C.coralGlow,
        borderRadius: R.pill,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    seeAllText: {
        fontSize: T.xs,
        fontWeight: W.bold,
        color: C.coral,
        letterSpacing: 0.3,
    },
    hscroll: {
        gap: S.md,
        paddingRight: S.lg,
        paddingBottom: S.xs,
    },

    // ── Empty
    emptyWrap: {
        borderRadius: R.xxl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.border,
    },
    emptyCard: {
        alignItems: 'center',
        paddingVertical: S.xxxl,
        paddingHorizontal: S.xl,
        gap: S.sm,
    },
    emptyEmoji:  { fontSize: 42, marginBottom: S.sm },
    emptyTitle:  { fontSize: T.lg, fontWeight: W.bold, color: C.text },
    emptySub:    { fontSize: T.sm, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
});