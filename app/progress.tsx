// ============================================================================
// PROGRESS SCREEN — Luxury Editorial · v4
// Fixed: arc segmentation, bar chart, badge modal, calendar checkmarks
// i18n fully configured · All dynamic logic preserved
// ============================================================================

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeInDown, FadeIn, FadeInRight,
    useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import Svg, {
    Rect, Text as SvgText, Path, Defs,
    LinearGradient as SvgLinearGradient, Stop,
    ClipPath,
} from 'react-native-svg';
import {
    Flame, Trophy, Target, TrendingUp, Calendar,
    Dumbbell, Footprints, Scale, Zap,
    CheckCircle, Bot, Activity, RefreshCw,
} from 'lucide-react-native';
import { storageHelpers } from '../src/storage/mmkv';
import { useAppStore } from '../src/stores';
import { getBadgesWithState } from '../src/utils/badges';
import { useTranslation } from 'react-i18next';
import { getMonthName } from '../src/utils/date';
import { generateTextAnalysis } from '../src/services/pollination/textAnalysis';
import { isPollinationConnected } from '../src/services/pollination';
import i18n from '../src/i18n';
import type { MeasureEntry, HomeWorkoutEntry, RunEntry, Entry } from '../src/types';
import { Colors } from '../src/constants';
import { BadgesGrid, PersonalRecords, TopExCard, WeightSparkline, WorkoutBarChart } from './_progressWidgets';
import { C, PAD, R, S, T, W } from './_progressTokens';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EyebrowLabel = ({ text, color = C.textMuted }: { text: string; color?: string }) => (
    <Text style={{
        fontSize: T.nano, fontWeight: W.black, color,
        letterSpacing: 2.8, textTransform: 'uppercase',
    }}>
        {text}
    </Text>
);

// ─── STREAK COVER ─────────────────────────────────────────────────────────────
// Fixed: continuous arc instead of segmented (no visible gap artifacts)
function StreakCover({ current, best }: { current: number; best: number }) {
    const { t } = useTranslation();
    const pct = best > 0 ? Math.min(current / best, 1) : 0;

    // Arc geometry — single continuous path, much cleaner
    const DEG_TO_RAD = Math.PI / 180;
    const SIZE = 160;
    const cx = SIZE / 2, cy = SIZE / 2;
    const R_outer = 70, R_inner = 58;
    const GAP_DEG = 40; // degrees cut at bottom
    const START_ANGLE = (90 + GAP_DEG / 2) * DEG_TO_RAD; // start from bottom-left
    const END_ANGLE   = (90 - GAP_DEG / 2 + 360) * DEG_TO_RAD; // end at bottom-right
    const FULL_SWEEP  = (360 - GAP_DEG) * DEG_TO_RAD;

    const polarToXY = (angle: number, r: number) => ({
        x: cx + r * Math.cos(angle - Math.PI / 2),
        y: cy + r * Math.sin(angle - Math.PI / 2),
    });

    const arcPath = (start: number, end: number, rOut: number, rIn: number) => {
        const s1 = polarToXY(start, rOut);
        const e1 = polarToXY(end, rOut);
        const s2 = polarToXY(end, rIn);
        const e2 = polarToXY(start, rIn);
        const large = end - start > Math.PI ? 1 : 0;
        return [
            `M ${s1.x} ${s1.y}`,
            `A ${rOut} ${rOut} 0 ${large} 1 ${e1.x} ${e1.y}`,
            `L ${s2.x} ${s2.y}`,
            `A ${rIn} ${rIn} 0 ${large} 0 ${e2.x} ${e2.y}`,
            'Z',
        ].join(' ');
    };

    const trackPath = arcPath(
        START_ANGLE * DEG_TO_RAD,
        END_ANGLE   * DEG_TO_RAD,
        R_outer, R_inner
    );

    // Fill arc — sweep from start to pct
    const fillEnd = START_ANGLE * DEG_TO_RAD + FULL_SWEEP * pct;
    const fillPath = pct > 0.01
        ? arcPath(START_ANGLE * DEG_TO_RAD, fillEnd, R_outer, R_inner)
        : null;

    return (
        <Animated.View entering={FadeInDown.delay(60).springify()} style={sc.outer}>
            <LinearGradient
                colors={[Colors.warmDarkText, Colors.bgLayer, C.bg]}
                style={sc.bg}
            >
                {/* Grain texture overlay */}
                <View style={sc.grain} pointerEvents="none" />

                <View style={sc.content}>
                    {/* Arc ring */}
                    <View style={sc.ringWrap}>
                        <Svg width={SIZE} height={SIZE}>
                            <Defs>
                                <SvgLinearGradient id="arcFill" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <Stop offset="0%" stopColor={C.amber} />
                                    <Stop offset="60%" stopColor={C.ember} />
                                    <Stop offset="100%" stopColor={Colors.errorStrong} />
                                </SvgLinearGradient>
                            </Defs>
                            {/* Track */}
                            <Path d={trackPath} fill={Colors.overlayWhite05} />
                            {/* Fill */}
                            {fillPath && <Path d={fillPath} fill="url(#arcFill)" />}
                        </Svg>

                        {/* Center content */}
                        <View style={sc.ringCenter}>
                            <Flame size={18} color={C.amber} fill={C.amber} />
                            <Text style={sc.bigNum}>{current}</Text>
                            <Text style={sc.bigUnit}>
                                {current === 1
                                    ? t('common.day', 'jour')
                                    : t('common.days', 'jours')}
                            </Text>
                        </View>
                    </View>

                    {/* Info col */}
                    <View style={sc.infoCol}>
                        <EyebrowLabel text={t('progress.currentStreak', 'Série actuelle')} color={C.amber} />

                        <Text style={sc.motivText}>
                            {current === 0
                                ? t('streak.start', "C'est\nle moment\nde commencer")
                                : current < 7
                                ? t('streak.keep', 'Continue\ncomme ça !')
                                : current < 30
                                ? t('streak.momentum', 'Tu es\nsur ta\nlancée')
                                : t('streak.exceptional', 'Performance\nexceptionnelle')}
                        </Text>

                        {best > 0 && (
                            <View style={sc.recordBadge}>
                                <Trophy size={10} color={C.gold} strokeWidth={2.5} />
                                <Text style={sc.recordText}>
                                    {t('streak.record', 'Record')} : {best}{' '}
                                    {t('common.daysShort', 'j')}
                                </Text>
                            </View>
                        )}

                        {/* Thin progress bar */}
                        <View style={sc.pctWrap}>
                            <View style={sc.pctTrack}>
                                <LinearGradient
                                    colors={[C.amber, C.ember]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={[sc.pctFill, { width: `${pct * 100}%` as `${number}%` }]}
                                />
                            </View>
                            <Text style={sc.pctLabel}>
                                {best > 0
                                    ? `${Math.round(pct * 100)}% ${t('streak.ofRecord', 'du record')}`
                                    : t('streak.startToday', "Démarre aujourd'hui !")}
                            </Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
}

const sc = StyleSheet.create({
    outer: {
        borderRadius: R.xxxl, overflow: 'hidden', marginBottom: S.sm,
        borderWidth: 1, borderColor: Colors.overlayCozyWarm40,
        shadowColor: C.ember, shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18, shadowRadius: 28, elevation: 10,
    },
    bg:    { padding: S.xl },
    grain: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.04,
        backgroundColor: Colors.white,
    },
    content:    { flexDirection: 'row', alignItems: 'center', gap: S.lg },
    ringWrap:   { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    ringCenter: { position: 'absolute', alignItems: 'center', gap: 2 },
    bigNum: {
        fontSize: 46, fontWeight: W.black, color: C.text,
        lineHeight: 50, letterSpacing: -2, includeFontPadding: false,
    },
    bigUnit:    { fontSize: T.xs, color: C.textMuted, fontWeight: W.semi, letterSpacing: 0.5 },
    infoCol:    { flex: 1, gap: S.lg },
    motivText: {
        fontSize: T.xl, fontWeight: W.black, color: C.text,
        letterSpacing: -0.6, lineHeight: 27,
    },
    recordBadge: {
        flexDirection: 'row', alignItems: 'center', gap: S.xs,
        backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.goldBorder,
        borderRadius: R.full, paddingHorizontal: S.md, paddingVertical: 5,
        alignSelf: 'flex-start',
    },
    recordText: { fontSize: T.xs, fontWeight: W.bold, color: C.gold },
    pctWrap:    { gap: S.xs },
    pctTrack:   { height: 2, backgroundColor: Colors.overlayWhite08, borderRadius: R.full, overflow: 'hidden' },
    pctFill:    { height: '100%', borderRadius: R.full },
    pctLabel:   { fontSize: T.micro, color: C.textMuted, fontWeight: W.med },
});

// ─── STATS SECTION ────────────────────────────────────────────────────────────
function StatsSection({ workouts, distance, duration, goal }: {
    workouts: number; distance: number; duration: number; goal: number;
}) {
    const { t } = useTranslation();
    const big = {
        val: workouts.toString(), unit: t('stats.totalSessions', 'séances au total'),
        label: t('stats.activity', 'ACTIVITÉ'), color: C.ember,
        icon: <Dumbbell size={16} color={C.ember} strokeWidth={2} />,
        bg: C.emberGlow, border: C.emberBorder,
    };
    const small = [
        {
            val: `${distance.toFixed(1)}`, unit: t('stats.kmRun', 'km courus'),
            color: C.blue, icon: <Footprints size={14} color={C.blue} strokeWidth={2} />,
            bg: C.blueSoft, border: C.blueBorder,
        },
        {
            val: `${duration}`, unit: t('stats.minCardio', 'min cardio'),
            color: C.teal, icon: <Zap size={14} color={C.teal} strokeWidth={2} />,
            bg: C.tealSoft, border: C.tealBorder,
        },
        {
            val: `${goal}`, unit: t('stats.weeklyGoal', 'obj. /semaine'),
            color: C.gold, icon: <Target size={14} color={C.gold} strokeWidth={2} />,
            bg: C.goldSoft, border: C.goldBorder,
        },
    ];

    return (
        <Animated.View entering={FadeInDown.delay(130).springify()} style={sts.row}>
            {/* Big card */}
            <View style={[sts.bigCard, { borderColor: big.border }]}>
                <LinearGradient colors={[big.bg, Colors.transparent]} style={StyleSheet.absoluteFill} />
                <View style={[sts.bigIcon, { backgroundColor: big.bg }]}>{big.icon}</View>
                <EyebrowLabel text={big.label} color={big.color} />
                <Text style={[sts.bigVal, { color: big.color }]}>{big.val}</Text>
                <Text style={sts.bigUnit}>{big.unit}</Text>
            </View>

            {/* 3 small stacked */}
            <View style={sts.smallCol}>
                {small.map((s, i) => (
                    <Animated.View key={`${s.unit}-${i}`} entering={FadeInRight.delay(160 + i * 50).springify()}
                        style={[sts.smallCard, { borderColor: s.border }]}>
                        <View style={[sts.smallIcon, { backgroundColor: s.bg }]}>{s.icon}</View>
                        <View style={sts.smallText}>
                            <Text style={[sts.smallVal, { color: s.color }]}>{s.val}</Text>
                            <Text style={sts.smallUnit}>{s.unit}</Text>
                        </View>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    );
}

const sts = StyleSheet.create({
    row:      { flexDirection: 'row', gap: S.sm, marginBottom: S.sm, alignItems: 'stretch' },
    bigCard: {
        flex: 1.15, backgroundColor: C.surface, borderRadius: R.xxxl,
        borderWidth: 1, padding: S.xl, gap: S.sm, overflow: 'hidden',
        shadowColor: Colors.black, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 14, elevation: 6,
    },
    bigIcon:  { width: 34, height: 34, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', marginBottom: S.xs },
    bigVal:   { fontSize: 44, fontWeight: W.black, letterSpacing: -2, lineHeight: 46, includeFontPadding: false },
    bigUnit:  { fontSize: T.xs, color: C.textMuted, fontWeight: W.med, lineHeight: 16 },
    smallCol: { flex: 1, gap: S.sm },
    smallCard: {
        flex: 1, backgroundColor: C.surface, borderRadius: R.xl,
        borderWidth: 1, paddingHorizontal: S.md, paddingVertical: S.md,
        flexDirection: 'row', alignItems: 'center', gap: S.sm, overflow: 'hidden',
        shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18, shadowRadius: 6, elevation: 3,
    },
    smallIcon: { width: 28, height: 28, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    smallText: { flex: 1 },
    smallVal:  { fontSize: T.lg, fontWeight: W.black, letterSpacing: -0.5 },
    smallUnit: { fontSize: T.micro, color: C.textMuted, fontWeight: W.med, marginTop: 1 },
});

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
// Fixed: shows checkmark ✓ on active days instead of dot
function MonthCalendar({ daysInMonth, startDayOfWeek, activeDays, monthName }: {
    daysInMonth: number; startDayOfWeek: number;
    activeDays: Set<number>; monthName: string;
}) {
    const { t } = useTranslation();
    const today = new Date().getDate();
    const days = [
        t('calendar.mon', 'L'), t('calendar.tue', 'M'), t('calendar.wed', 'M'),
        t('calendar.thu', 'J'), t('calendar.fri', 'V'), t('calendar.sat', 'S'),
        t('calendar.sun', 'D'),
    ];

    return (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={cal.card}>
            <View style={cal.header}>
                <View style={cal.headerLeft}>
                    <View style={cal.calIcon}>
                        <Calendar size={13} color={C.ember} strokeWidth={2} />
                    </View>
                    <Text style={cal.month}>{monthName}</Text>
                </View>
                <View style={cal.activePill}>
                    <CheckCircle size={11} color={C.ember} strokeWidth={2.5} />
                    <Text style={cal.activeText}>
                        {activeDays.size} {t('calendar.activeDays', 'jours actifs')}
                    </Text>
                </View>
            </View>

            {/* Day headers */}
            <View style={cal.weekRow}>
                {days.map((d, i) => (
                    <Text key={`${d}-${i}`} style={cal.dayLabel}>{d}</Text>
                ))}
            </View>

            {/* Grid */}
            <View style={cal.grid}>
                {Array.from({ length: 42 }).map((_, idx) => {
                    const di = idx - startDayOfWeek;
                    if (di < 0 || di >= daysInMonth) {
                        return <View key={`e${idx}`} style={cal.empty} />;
                    }
                    const day = di + 1;
                    const active  = activeDays.has(day);
                    const isToday = day === today;
                    const future  = day > today;

                    return (
                        <View key={day} style={[
                            cal.cell,
                            active  && cal.cellActive,
                            isToday && !active && cal.cellToday,
                            future  && cal.cellFuture,
                        ]}>
                            {active ? (
                                // Checkmark for completed days
                                <View style={cal.checkWrap}>
                                    <CheckCircle
                                        size={18}
                                        color={C.ember}
                                        fill={C.emberGlow}
                                        strokeWidth={2.5}
                                    />
                                </View>
                            ) : (
                                <Text style={[
                                    cal.cellNum,
                                    isToday && cal.cellNumToday,
                                    future  && cal.cellNumFuture,
                                ]}>
                                    {day}
                                </Text>
                            )}
                        </View>
                    );
                })}
            </View>
        </Animated.View>
    );
}

const cal = StyleSheet.create({
    card: {
        backgroundColor: C.surface, borderRadius: R.xxxl,
        borderWidth: 1, borderColor: C.border,
        padding: S.xl, marginBottom: S.sm,
        shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: S.lg,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
    calIcon: {
        width: 26, height: 26, borderRadius: R.sm,
        backgroundColor: C.emberGlow, alignItems: 'center', justifyContent: 'center',
    },
    month: {
        fontSize: T.md, fontWeight: W.xbold, color: C.text,
        textTransform: 'capitalize', letterSpacing: -0.2,
    },
    activePill: {
        flexDirection: 'row', alignItems: 'center', gap: S.xs,
        backgroundColor: C.emberGlow, borderWidth: 1, borderColor: C.emberBorder,
        borderRadius: R.full, paddingHorizontal: S.md, paddingVertical: 5,
    },
    activeText: { fontSize: T.xs, fontWeight: W.bold, color: C.ember },
    weekRow: { flexDirection: 'row', marginBottom: S.sm },
    dayLabel: {
        flex: 1, textAlign: 'center', fontSize: T.micro,
        color: C.textMuted, fontWeight: W.bold, letterSpacing: 0.8,
    },
    grid:      { flexDirection: 'row', flexWrap: 'wrap' },
    empty:     { width: '14.28%', aspectRatio: 1 },
    cell: {
        width: '14.28%', aspectRatio: 1,
        alignItems: 'center', justifyContent: 'center',
    },
    cellActive: {},
    cellToday: {
        borderWidth: 1.5, borderColor: C.ember, borderRadius: 8,
    },
    cellFuture: { opacity: 0.25 },
    checkWrap:  { alignItems: 'center', justifyContent: 'center' },
    cellNum: {
        fontSize: T.sm - 1, color: C.text, fontWeight: W.med,
    },
    cellNumToday: { color: C.text, fontWeight: W.black },
    cellNumFuture: { opacity: 0.4 },
});

// ─── Ploppy AI Weekly Summary ────────────────────────────────────────────────

function getWeekStats(entries: Entry[]) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const weekEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d >= startOfWeek && d <= now;
    });

    const sportEntries = weekEntries.filter(e => ['home', 'run', 'beatsaber', 'custom'].includes(e.type));
    const runEntries = weekEntries.filter((e): e is RunEntry => e.type === 'run');

    const totalWorkouts = sportEntries.length;
    const totalDistance = runEntries.reduce((s, e) => s + (e.distanceKm || 0), 0);
    const totalDuration = sportEntries.reduce((s, e) => {
        if ('durationMinutes' in e && typeof e.durationMinutes === 'number') return s + e.durationMinutes;
        return s;
    }, 0);
    const totalReps = weekEntries
        .filter((e): e is HomeWorkoutEntry => e.type === 'home')
        .reduce((s, e) => s + (e.totalReps || 0), 0);

    const activeDays = new Set(sportEntries.map(e => e.date)).size;
    const typeBreakdown: Record<string, number> = {};
    sportEntries.forEach(e => { typeBreakdown[e.type] = (typeBreakdown[e.type] || 0) + 1; });

    return { totalWorkouts, totalDistance, totalDuration, totalReps, activeDays, typeBreakdown };
}

function PloppyWeeklySummary({ entries, settings }: {
    entries: Entry[];
    settings: { aiFeaturesEnabled?: boolean; aiProgressEnabled?: boolean; aiModel?: string; aiTone?: string };
}) {
    const { t } = useTranslation();
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [connected, setConnected] = useState(false);

    const weekStats = useMemo(() => getWeekStats(entries), [entries]);

    const fetchSummary = useCallback(async (force: boolean = false) => {
        if (!settings.aiFeaturesEnabled) return;
        if (!settings.aiProgressEnabled || !connected) return;
        if (weekStats.totalWorkouts === 0) return;

        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
        const weekKey = weekStart.toISOString().slice(0,10);
        const cacheKey = `aiSummary:${weekKey}:${settings.aiModel || 'openai'}:${i18n.language}:${settings.aiTone || 'neutral'}`;
        if (!force) {
            const cached = await storageHelpers.getString(cacheKey) as string | null;
            if (cached) {
                setAnalysis(cached);
                return;
            }
        }

        setLoading(true);
        setError(false);
        try {
            const lang = ({ fr: 'français', it: 'italiano', de: 'Deutsch' } as Record<string, string>)[i18n.language] ?? 'English';
            const toneDesc = settings.aiTone === 'technical'
                ? 'Use a precise, technical tone.'
                : settings.aiTone === 'warm'
                ? 'Use a very warm and encouraging tone.'
                : 'Use a neutral balanced tone.';
            const statsLines: string[] = [];
            statsLines.push(`Active days this week: ${weekStats.activeDays}/7`);
            statsLines.push(`Total workouts: ${weekStats.totalWorkouts}`);
            if (weekStats.totalDuration > 0) statsLines.push(`Total duration: ${weekStats.totalDuration} min`);
            if (weekStats.totalDistance > 0) statsLines.push(`Total distance: ${weekStats.totalDistance.toFixed(1)} km`);
            if (weekStats.totalReps > 0) statsLines.push(`Total reps: ${weekStats.totalReps}`);
            const breakdown = Object.entries(weekStats.typeBreakdown)
                .map(([type, count]) => `${type}: ${count}`)
                .join(', ');
            if (breakdown) statsLines.push(`Activity breakdown: ${breakdown}`);

            const systemPrompt = `You are Ploppy, a motivating and friendly fitness coach. ${toneDesc} You write weekly workout summaries. Respond in ${lang}. Keep it concise (3-5 sentences). Use 1-2 emojis.`;
            const userPrompt = `Here are my pre-calculated weekly stats:\n\n${statsLines.join('\n')}\n\nWrite a brief, motivating weekly summary. Mention specific numbers. End with one tip for next week.`;

            const result = await generateTextAnalysis({
                systemPrompt,
                userPrompt,
                model: settings.aiModel || 'openai',
            });
            setAnalysis(result);
            await storageHelpers.setString(cacheKey, result);
        } catch (error) {
            if (__DEV__) {
                console.warn('[Progress] Weekly AI summary failed', error);
            }
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [settings.aiFeaturesEnabled, settings.aiProgressEnabled, connected, weekStats, settings.aiModel, settings.aiTone]);

    useEffect(() => {
        if (!settings.aiFeaturesEnabled) {
            setConnected(false);
            return;
        }
        void isPollinationConnected()
            .then(setConnected)
            .catch((error) => {
                if (__DEV__) {
                    console.warn('[Progress] Pollination connectivity check failed', error);
                }
                setConnected(false);
            });
    }, [settings.aiFeaturesEnabled]);

    useEffect(() => {
        void fetchSummary();
    }, [fetchSummary]);


    if (!settings.aiFeaturesEnabled || !settings.aiProgressEnabled) return null;

    if (!connected) {
        return (
            <CardWrap delay={180} accent={C.violet + '35'}>
                <CardTitle
                    icon={<Bot size={14} color={C.violet} strokeWidth={2} />}
                    label={t('progress.ai.title')}
                    color={C.violet}
                />
                <Text style={ploppyStyles.disabledText}>{t('progress.ai.connectRequired')}</Text>
            </CardWrap>
        );
    }

    if (weekStats.totalWorkouts === 0) {
        return (
            <CardWrap delay={180} accent={C.violet + '35'}>
                <CardTitle
                    icon={<Bot size={14} color={C.violet} strokeWidth={2} />}
                    label={t('progress.ai.title')}
                    color={C.violet}
                />
                <Text style={ploppyStyles.disabledText}>{t('progress.ai.noData')}</Text>
            </CardWrap>
        );
    }

    return (
        <CardWrap delay={180} accent={C.violet + '35'}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <CardTitle
                icon={<Bot size={14} color={C.violet} strokeWidth={2} />}
                label={t('progress.ai.title')}
                color={C.violet}
              />
              {analysis && !loading && !error && (
                <TouchableOpacity
                  onPress={() => fetchSummary(true)}
                  style={ploppyStyles.regenBtn}
                  accessibilityLabel={t('progress.ai.regenerate')}
                >
                  <RefreshCw size={16} color={C.violet} />
                </TouchableOpacity>
              )}
            </View>
            {loading ? (
                <View style={ploppyStyles.loadingRow}>
                    <Activity size={16} color={C.violet} />
                    <Text style={ploppyStyles.loadingText}>{t('progress.ai.loading')}</Text>
                </View>
            ) : error ? (
                <Text style={ploppyStyles.errorText}>{t('progress.ai.error')}</Text>
            ) : analysis ? (
                <Text style={ploppyStyles.analysisText}>{analysis}</Text>
            ) : null}
        </CardWrap>
    );
}

const ploppyStyles = StyleSheet.create({
    disabledText: { fontSize: T.sm, color: C.textMuted, lineHeight: T.sm * 1.5 },
    hintText: { fontSize: T.xs, color: C.textMuted, marginTop: S.xs },
    regenBtn: { padding: S.xs, borderRadius: R.full, backgroundColor: C.surfaceHigh },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: S.sm },
    loadingText: { fontSize: T.sm, color: C.textMuted },
    errorText: { fontSize: T.sm, color: C.error },
    analysisText: { fontSize: T.sm, color: C.textSub, lineHeight: T.sm * 1.7, fontStyle: 'italic' },
});

// ─── Shared Card Wrappers ─────────────────────────────────────────────────────

function CardWrap({ children, delay = 0, accent }: {
    children: React.ReactNode; delay?: number; accent?: string;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()}
            style={[crd.card, accent && { borderColor: accent }]}>
            {children}
        </Animated.View>
    );
}

function CardTitle({ icon, label, color = C.ember }: {
    icon: React.ReactNode; label: string; color?: string;
}) {
    return (
        <View style={crd.titleRow}>
            <View style={[crd.iconBox, { backgroundColor: color + '18' }]}>{icon}</View>
            <Text style={crd.titleText}>{label}</Text>
        </View>
    );
}

const crd = StyleSheet.create({
    card: {
        backgroundColor: C.surface, borderRadius: R.xxxl,
        borderWidth: 1, borderColor: C.border,
        padding: S.xl, marginBottom: S.sm, overflow: 'hidden',
        shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22, shadowRadius: 12, elevation: 6,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.lg },
    iconBox:  { width: 28, height: 28, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
    titleText: { fontSize: T.md, fontWeight: W.xbold, color: C.text, letterSpacing: -0.2 },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function ProgressScreen() {
    const { entries, settings, unlockedBadges, getStreak, getMonthlyStats, getSportEntries } = useAppStore();
    const { t } = useTranslation();

    const streak       = getStreak();
    const monthlyStats = getMonthlyStats();
    const sportEntries = getSportEntries();

    const totalWorkouts = sportEntries.length;
    const totalDistance = sportEntries
        .filter(e => e.type === 'run')
        .reduce((s, e) => s + (e.type === 'run' ? e.distanceKm : 0), 0);
    const totalDuration = sportEntries.reduce((s, e) => {
        if (e.type === 'run' || e.type === 'beatsaber') return s + e.durationMinutes;
        return s;
    }, 0);

    const relevantMonths = useMemo(
        () => monthlyStats.filter(s => s.count > 0).slice(-6),
        [monthlyStats]
    );
    const chartData  = useMemo(
        () => relevantMonths.map(s => ({ label: s.month.slice(5), value: s.count })),
        [relevantMonths]
    );
    const maxValue   = Math.max(...chartData.map(d => d.value), 1);
    const badges     = useMemo(() => getBadgesWithState(unlockedBadges), [unlockedBadges]);

    const badgeProgress = useMemo(() => {
        const map: Record<string, { current: number; target: number; label: string }> = {};
        const add = (id: string, cur: number, tgt: number, lbl: string) => {
            if (!badges.find(b => b.id === id)?.unlockedAt) {
                map[id] = { current: cur, target: tgt, label: lbl };
            }
        };
        add('first_workout', totalWorkouts, 1,   `${totalWorkouts}/1`);
        add('streak_7',      streak.current, 7,   `${streak.current}/7 ${t('common.daysShort','j')}`);
        add('streak_30',     streak.current, 30,  `${streak.current}/30 ${t('common.daysShort','j')}`);
        add('workouts_10',   totalWorkouts, 10,   `${totalWorkouts}/10`);
        add('workouts_50',   totalWorkouts, 50,   `${totalWorkouts}/50`);
        add('workouts_100',  totalWorkouts, 100,  `${totalWorkouts}/100`);
        add('runner_10km',   totalDistance, 10,   `${totalDistance.toFixed(1)}/10 km`);
        add('runner_50km',   totalDistance, 50,   `${totalDistance.toFixed(1)}/50 km`);
        return map;
    }, [badges, totalWorkouts, totalDistance, streak, t]);

    const weightHistory = useMemo(
        () => entries
            .filter((e): e is MeasureEntry => e.type === 'measure' && e.weight !== undefined)
            .slice(0, 10).reverse(),
        [entries]
    );

    const personalRecords = useMemo(() => {
        const tracked = [
            { id: 'pushups',       name: t('repCounter.exercises.pushups', 'Pompes'),       icon: '💪', type: 'reps' as const },
            { id: 'situps',        name: t('repCounter.exercises.situps', 'Abdos'),          icon: '🔥', type: 'reps' as const },
            { id: 'squats',        name: t('repCounter.exercises.squats', 'Squats'),         icon: '🦵', type: 'reps' as const },
            { id: 'jumpingJacks', name: t('repCounter.exercises.jumpingJacks', 'J. Jacks'), icon: '⭐', type: 'reps' as const },
            { id: 'plank',         name: t('repCounter.exercises.plank', 'Gainage'),         icon: '🧘', type: 'time' as const },
        ];
        return tracked.reduce<{ id: string; name: string; icon: string; value: string }[]>((acc, ex) => {
            const relevant = entries.filter((e): e is HomeWorkoutEntry =>
                e.type === 'home' && (
                    e.exercises.toLowerCase().includes(`${ex.id.toLowerCase()}:`) ||
                    (e.name?.toLowerCase().includes(ex.name.toLowerCase()) ?? false)
                )
            );
            let best = 0;
            for (const w of relevant) {
                const v = ex.type === 'time' ? (w.durationMinutes ?? 0) * 60 : (w.totalReps ?? 0);
                if (v > best) best = v;
            }
            if (best > 0) {
                acc.push({
                    id: ex.id, name: ex.name, icon: ex.icon,
                    value: ex.type === 'time' ? `${best}s` : `${best} reps`,
                });
            }
            return acc;
        }, []);
    }, [entries, t]);

    const topExercise = useMemo(() => {
        const m = new Date().toISOString().slice(0, 7);
        const counts: Record<string, number> = {};
        entries
            .filter((e): e is HomeWorkoutEntry => e.type === 'home' && e.date.startsWith(m))
            .forEach(w => w.exercises.split('\n').forEach(line => {
                const match = line.match(/^([^:]+):/);
                if (match) {
                    const n = match[1].trim().toLowerCase();
                    counts[n] = (counts[n] || 0) + 1;
                }
            }));
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return sorted.length > 0 ? { name: sorted[0][0], count: sorted[0][1] } : null;
    }, [entries]);

    const calendarData = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear(), mo = now.getMonth();
        const daysInMonth    = new Date(y, mo + 1, 0).getDate();
        const startDayOfWeek = (new Date(y, mo, 1).getDay() + 6) % 7;
        const monthStr       = now.toISOString().slice(0, 7);
        const activeDays     = new Set(
            sportEntries
                .filter(e => e.date.startsWith(monthStr))
                .map(e => parseInt(e.date.slice(8, 10), 10))
        );
        return { daysInMonth, startDayOfWeek, activeDays, monthName: getMonthName(monthStr) };
    }, [sportEntries]);

    return (
        <SafeAreaView style={main.container} edges={['top']}>
            <ScrollView
                style={main.scroll}
                contentContainerStyle={main.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View entering={FadeIn.delay(20)} style={main.titleBlock}>
                    <EyebrowLabel text={t('progress.eyebrow', 'TABLEAU DE BORD')} />
                    <Text style={main.titleMain}>{t('progress.title', 'Progression')}</Text>
                    <View style={main.titleAccent} />
                </Animated.View>

                {/* Streak */}
                <StreakCover current={streak.current} best={streak.best} />

                {/* AI Weekly Summary */}
                <PloppyWeeklySummary entries={entries} settings={settings} />

                {/* Stats */}
                <StatsSection
                    workouts={totalWorkouts}
                    distance={totalDistance}
                    duration={totalDuration}
                    goal={settings.weeklyGoal}
                />

                {/* Calendar */}
                <MonthCalendar {...calendarData} />

                {/* Bar chart */}
                <CardWrap delay={280}>
                    <CardTitle
                        icon={<TrendingUp size={14} color={C.ember} strokeWidth={2} />}
                        label={t('progress.workoutsPerMonth', 'Séances par mois')}
                    />
                    <WorkoutBarChart data={chartData} maxValue={maxValue} />
                </CardWrap>

                {/* Top exercise */}
                {topExercise && <TopExCard name={topExercise.name} count={topExercise.count} />}

                {/* Personal records */}
                <PersonalRecords records={personalRecords} />

                {/* Weight sparkline */}
                {weightHistory.length >= 2 && (
                    <CardWrap delay={440} accent={C.blueBorder}>
                        <CardTitle
                            icon={<Scale size={14} color={C.blue} strokeWidth={2} />}
                            label={t('progress.weightEvolution', 'Évolution du poids')}
                            color={C.blue}
                        />
                        <WeightSparkline data={weightHistory} />
                    </CardWrap>
                )}

                {/* Badges */}
                <BadgesGrid badges={badges} badgeProgress={badgeProgress} />

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const main = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll:    { flex: 1 },
    content:   { paddingHorizontal: PAD, paddingTop: S.sm, paddingBottom: 120 },
    titleBlock: { marginTop: S.sm, marginBottom: S.xxl },
    titleMain: {
        fontSize: T.display, fontWeight: W.black, color: C.text,
        letterSpacing: -2, lineHeight: 52, marginTop: S.xs,
    },
    titleAccent: {
        marginTop: S.lg, height: 2, width: 40, borderRadius: R.full,
        backgroundColor: C.ember,
        shadowColor: C.ember, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1, shadowRadius: 10, elevation: 4,
    },
});