// ============================================================================
// GAMIFICATION SCREEN - Ploppy & Quêtes avec design amélioré
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useGamificationStore } from '../src/stores';
import type { GamificationLog, Quest } from '../src/stores/gamificationStore';
import Animated, {
    FadeInDown, FadeIn,
    useAnimatedStyle, useSharedValue,
    withRepeat, withSequence, withTiming, withSpring,
    runOnJS, useAnimatedReaction, useAnimatedProps,
} from 'react-native-reanimated';
import {
    Dumbbell, Timer, Flame, Target, Trophy, Sparkles,
    TrendingUp, Clock, CheckCircle2, Zap,
} from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { Colors, ScreenPalettes } from '../src/constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width: SW } = Dimensions.get('window');
const PLOPPY_IMAGE = require('../assets/ploppy.png');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = ScreenPalettes.warm;
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 44 };
const R = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 22, xxxl: 32, full: 999 };
const T = { nano: 9, micro: 10, xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 34, display: 48 };
const W = { light:'300', reg:'400', med:'500', semi:'600', bold:'700', xbold:'800', black:'900' } as const;

// ─── XP Ring ─────────────────────────────────────────────────────────────────
function XPRing({ animatedProgress, size = 190 }: { animatedProgress: { value: number }; size?: number }) {
    const sw = 7;
    const r  = (size - sw) / 2;
    const circ = 2 * Math.PI * r;
    const center = size / 2;

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circ * (1 - animatedProgress.value),
    }));

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
                <Defs>
                    <SvgLinearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={C.ember} />
                        <Stop offset="100%" stopColor={C.gold} />
                    </SvgLinearGradient>
                </Defs>
                <Circle cx={center} cy={center} r={r}
                    stroke={C.border} strokeWidth={sw} fill={Colors.transparent} />
                <AnimatedCircle
                    cx={center} cy={center} r={r}
                    stroke="url(#xpGrad)" strokeWidth={sw} fill={Colors.transparent}
                    strokeDasharray={`${circ}`} strokeLinecap="round"
                    transform={`rotate(-90 ${center} ${center})`}
                    animatedProps={animatedProps}
                />
            </Svg>
        </View>
    );
}

// ─── Quest Icon ───────────────────────────────────────────────────────────────
function QuestIcon({ type, completed }: { type: string; completed: boolean }) {
    const color = completed ? C.green : C.ember;
    const p = { size: 18, color, strokeWidth: 2.2 };
    switch (type) {
        case 'exercises': return <Dumbbell {...p} />;
        case 'workouts':  return <Target {...p} />;
        case 'duration':  return <Timer {...p} />;
        case 'distance':  return <TrendingUp {...p} />;
        default:          return <Flame {...p} />;
    }
}

// ─── Quest Card ───────────────────────────────────────────────────────────────
function QuestCard({ quest, index }: { quest: Quest; index: number }) {
    const { t } = useTranslation();
    const pct = Math.min((quest.current / quest.target) * 100, 100);
    const done = quest.completed;

    return (
        <Animated.View entering={FadeInDown.delay(180 + index * 55)}>
            <View style={[s.questCard, done && s.questCardDone]}>
                <LinearGradient
                    colors={done
                        ? [Colors.overlaySportGreen07, Colors.overlaySportGreen02]
                        : [C.surfaceUp, C.surface]}
                    style={StyleSheet.absoluteFill}
                />

                <View style={s.questRow}>
                    {/* Icon */}
                    <View style={[s.questIcon, done && s.questIconDone]}>
                        {done
                            ? <CheckCircle2 size={18} color={C.green} strokeWidth={2.5} />
                            : <QuestIcon type={quest.type} completed={false} />}
                    </View>

                    {/* Info */}
                    <View style={s.questInfo}>
                        <Text style={[s.questTitle, done && s.questTitleDone]} numberOfLines={2}>
                            {quest.description}
                        </Text>
                        <View style={s.questMeta}>
                            <Text style={s.questCount}>{quest.current} / {quest.target}</Text>
                            {done && (
                                <View style={s.donePill}>
                                    <Text style={s.donePillText}>{t('gamification.completed')}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* XP badge */}
                    <View style={[s.xpPill, done && s.xpPillDone]}>
                        <Sparkles size={11} color={done ? C.green : C.gold} />
                        <Text style={[s.xpPillText, done && s.xpPillTextDone]}>+{quest.rewardXp}</Text>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={s.progressTrack}>
                    <View style={[s.progressFill, { width: `${pct}%` }, done && s.progressFillDone]} />
                </View>
            </View>
        </Animated.View>
    );
}

// ─── History Item ─────────────────────────────────────────────────────────────
function HistoryItem({ item, index, isLast }: { item: GamificationLog; index: number; isLast: boolean }) {
    const { t, i18n } = useTranslation();
    const fmt = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    const reason   = item.reasonKey ? t(item.reasonKey, item.reasonParams) : item.reason;
    const isNeg    = item.amount < 0;
    const isLvlUp  = item.type === 'level_up';

    return (
        <Animated.View
            entering={FadeIn.delay(300 + index * 40)}
            style={[s.histRow, !isLast && s.histBorder]}
        >
            {/* Dot */}
            <View style={[s.histDot,
                isLvlUp && { backgroundColor: C.gold },
                isNeg   && { backgroundColor: C.error },
            ]} />

            {/* Text */}
            <View style={s.histInfo}>
                <Text style={[s.histReason, isLvlUp && { color: C.gold, fontWeight: W.bold }]}>
                    {reason}
                </Text>
                <View style={s.histMeta}>
                    <Clock size={9} color={C.textMuted} />
                    <Text style={s.histDate}>{fmt(item.date)}</Text>
                </View>
            </View>

            {/* Amount / trophy */}
            {isLvlUp ? (
                <View style={s.trophyBadge}>
                    <Trophy size={13} color={C.gold} />
                </View>
            ) : (
                <View style={[s.amountPill, isNeg && s.amountPillNeg]}>
                    <Text style={[s.amountText, isNeg && s.amountTextNeg]}>
                        {isNeg ? '' : '+'}{item.amount} {t('gamification.xp')}
                    </Text>
                </View>
            )}
        </Animated.View>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
    return (
        <View style={[s.statCard, accent && s.statCardAccent]}>
            {accent && (
                <LinearGradient
                    colors={[C.emberGlow, Colors.transparent]}
                    style={StyleSheet.absoluteFill}
                />
            )}
            <Text style={[s.statValue, accent && { color: C.ember }]}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
        </View>
    );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
    return (
        <View style={s.sectionTitle}>
            <View style={s.sectionDot} />
            <Text style={s.sectionTitleText}>{title}</Text>
            <View style={s.sectionLine} />
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GamificationScreen() {
    const { t } = useTranslation();
    const {
        xp, level, rank, quests, history,
        lastSeenXp, lastSeenLevel,
        checkAndRefreshQuests, updateLastSeen,
    } = useGamificationStore();

    const scale        = useSharedValue(1);
    const xpDisplayed  = useSharedValue(lastSeenXp ?? xp);
    const lvlDisplayed = useSharedValue(lastSeenLevel ?? level);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [displayXp, setDisplayXp]   = useState(xp);
    const [displayLvl, setDisplayLvl] = useState(level);

    const xpForNext = level * 100;
    const progressAnim = useSharedValue(Math.min(Math.max((lastSeenXp ?? xp) / xpForNext, 0), 1));

    // Gentle breathing
    useEffect(() => {
        scale.value = withRepeat(
            withSequence(withTiming(1.025, { duration: 3000 }), withTiming(1, { duration: 3000 })),
            -1, true,
        );
        checkAndRefreshQuests();
    }, []);

    // XP progress animation
    useEffect(() => {
        progressAnim.value = withTiming(Math.min(Math.max(xp / xpForNext, 0), 1), { duration: 900 });
    }, [xp, xpForNext]);

    useFocusEffect(React.useCallback(() => {
        const prevLvl = lastSeenLevel ?? level;
        const prevXp  = lastSeenXp  ?? xp;
        let t1: ReturnType<typeof setTimeout> | undefined;
        let t2: ReturnType<typeof setTimeout> | undefined;

        if (level > prevLvl) {
            setShowLevelUp(true);
            t1 = setTimeout(() => setShowLevelUp(false), 3000);
            lvlDisplayed.value = prevLvl;
            lvlDisplayed.value = withSpring(level, { damping: 14, stiffness: 90 });
            t2 = setTimeout(updateLastSeen, 1000);
        } else if (xp !== prevXp) {
            xpDisplayed.value = prevXp;
            xpDisplayed.value = withTiming(xp, { duration: 900 });
            t2 = setTimeout(updateLastSeen, 1000);
        }
        return () => {
            if (t1) clearTimeout(t1);
            if (t2) clearTimeout(t2);
        };
    }, [level, xp, lastSeenLevel, lastSeenXp, updateLastSeen]));

    useAnimatedReaction(() => lvlDisplayed.value, (v, p) => {
        if (v !== p) runOnJS(setDisplayLvl)(Math.round(v));
    }, []);
    useAnimatedReaction(() => xpDisplayed.value, (v, p) => {
        if (v !== p) runOnJS(setDisplayXp)(Math.round(v));
    }, []);

    const ploppyStyle   = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const completedQ    = useMemo(() => quests.filter(q => q.completed).length, [quests]);
    const recentHistory = useMemo(() => history.slice(0, 10), [history]);
    const totalGains    = history.filter(h => h.type === 'xp_gain' && h.amount > 0).length;

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar style="light" />

            {/* ── Level-up toast ── */}
            {showLevelUp && (
                <Animated.View entering={FadeInDown.springify().damping(14)} style={s.lvlUpToast}>
                    <LinearGradient
                        colors={[Colors.overlayGold95, Colors.overlayWarningDeep95]}
                        style={s.lvlUpGrad}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <Trophy size={24} color={Colors.white} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.lvlUpTitle}>{t('gamification.levelUp')}</Text>
                            <Text style={s.lvlUpSub}>{t('gamification.level')} {level} — {rank}</Text>
                        </View>
                        <Sparkles size={20} color={Colors.white} />
                    </LinearGradient>
                </Animated.View>
            )}

            <ScrollView
                contentContainerStyle={s.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Hero header ── */}
                <Animated.View entering={FadeInDown.delay(40).springify()} style={s.hero}>
                    {/* Ambient glow behind ring */}
                    <View style={s.heroGlow} />

                    {/* Ring + Ploppy */}
                    <View style={s.ringWrap}>
                        <XPRing animatedProgress={progressAnim} size={196} />
                        {/* Ploppy centered inside ring */}
                        <View style={s.ploppyWrap}>
                            <Animated.Image
                                source={PLOPPY_IMAGE}
                                style={[s.ploppy, ploppyStyle]}
                                resizeMode="contain"
                            />
                        </View>
                        {/* Level badge */}
                        <View style={s.lvlBadge}>
                            <LinearGradient
                                colors={[C.ember, Colors.errorStrong]}
                                style={s.lvlBadgeGrad}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                <Text style={s.lvlNum}>{displayLvl}</Text>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Rank & XP */}
                    <Text style={s.rankText}>{rank}</Text>
                    <View style={s.xpRow}>
                        <Zap size={13} color={C.gold} fill={C.gold} />
                        <Text style={s.xpText}>{displayXp} / {xpForNext} XP</Text>
                    </View>
                </Animated.View>

                {/* ── Stats row ── */}
                <Animated.View entering={FadeInDown.delay(110).springify()} style={s.statsRow}>
                    <StatCard value={displayLvl} label={t('gamification.level')} />
                    <StatCard value={`${completedQ}/${quests.length}`} label={t('gamification.questsLabel')} accent />
                    <StatCard value={totalGains} label={t('gamification.gains')} />
                </Animated.View>

                {/* ── Quests ── */}
                <View style={s.section}>
                    <SectionTitle title={t('gamification.weeklyQuests')} />
                    <View style={s.questList}>
                        {quests.length === 0 ? (
                            <View style={s.emptyBox}>
                                <Sparkles size={28} color={C.textMuted} />
                                <Text style={s.emptyTitle}>{t('gamification.noActiveQuests')}</Text>
                                <Text style={s.emptySub}>{t('gamification.noActiveQuestsDesc')}</Text>
                            </View>
                        ) : quests.map((q, i) => (
                            <QuestCard key={q.id} quest={q} index={i} />
                        ))}
                    </View>
                </View>

                {/* ── History ── */}
                <View style={s.section}>
                    <SectionTitle title={t('gamification.recentGains')} />
                    <View style={s.histCard}>
                        <LinearGradient colors={[C.surfaceUp, C.surface]} style={StyleSheet.absoluteFill} />
                        {recentHistory.length === 0 ? (
                            <View style={s.emptyBox}>
                                <Sparkles size={28} color={C.textMuted} />
                                <Text style={s.emptyTitle}>{t('gamification.noRecentActivity')}</Text>
                                <Text style={s.emptySub}>{t('gamification.noRecentActivityDesc')}</Text>
                            </View>
                        ) : recentHistory.map((item, i) => (
                            <HistoryItem key={item.id} item={item} index={i} isLast={i === recentHistory.length - 1} />
                        ))}
                    </View>
                </View>

                <View style={{ height: 60 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: 100 },

    // Hero
    hero:     { alignItems: 'center', marginBottom: S.xl },
    heroGlow: {
        position: 'absolute', top: 10,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: C.emberGlow,
        opacity: 0.45,
    },
    ringWrap: {
        width: 196, height: 196,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: S.lg,
    },
    ploppyWrap: {
        position: 'absolute',
        width: 132, height: 132,
        justifyContent: 'center', alignItems: 'center',
    },
    ploppy: { width: '100%', height: '100%' },
    lvlBadge: {
        position: 'absolute', bottom: 6, right: 16,
        borderRadius: R.full, overflow: 'hidden',
        shadowColor: C.ember, shadowOpacity: 0.5,
        shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
        elevation: 10,
    },
    lvlBadgeGrad: {
        width: 38, height: 38, borderRadius: 19,
        justifyContent: 'center', alignItems: 'center',
    },
    lvlNum: { fontSize: T.lg, fontWeight: W.black, color: Colors.white },

    rankText: {
        fontSize: T.xxl, fontWeight: W.black,
        color: C.text, letterSpacing: -0.5, marginBottom: S.xs,
    },
    xpRow: { flexDirection: 'row', alignItems: 'center', gap: S.xs },
    xpText: { fontSize: T.sm, fontWeight: W.semi, color: C.textSub },

    // Stats
    statsRow: {
        flexDirection: 'row', gap: S.sm,
        marginBottom: S.xxl,
    },
    statCard: {
        flex: 1, overflow: 'hidden',
        borderRadius: R.xl, borderWidth: 1, borderColor: C.border,
        backgroundColor: C.surfaceUp,
        paddingVertical: S.lg, alignItems: 'center',
    },
    statCardAccent: { borderColor: C.emberBorder },
    statValue: {
        fontSize: T.xxl, fontWeight: W.black,
        color: C.text, letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: T.xs, fontWeight: W.semi,
        color: C.textMuted, marginTop: 2, letterSpacing: 0.3,
        textTransform: 'uppercase',
    },

    // Section header
    sectionTitle: {
        flexDirection: 'row', alignItems: 'center',
        gap: S.sm, marginBottom: S.md,
    },
    sectionDot: { width: 5, height: 5, borderRadius: R.full, backgroundColor: C.ember },
    sectionTitleText: {
        fontSize: T.xs, fontWeight: W.black,
        color: C.textMuted, letterSpacing: 2.5,
        textTransform: 'uppercase',
    },
    sectionLine: { flex: 1, height: 1, backgroundColor: C.border },

    // Quests
    section: { marginBottom: S.xxl },
    questList: { gap: S.sm },
    questCard: {
        borderRadius: R.xl, overflow: 'hidden',
        borderWidth: 1, borderColor: C.border,
        padding: S.lg, gap: S.md,
    },
    questCardDone: { borderColor: C.greenBorder },
    questRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
    questIcon: {
        width: 40, height: 40, borderRadius: R.lg,
        backgroundColor: C.emberGlow,
        borderWidth: 1, borderColor: C.emberBorder,
        justifyContent: 'center', alignItems: 'center',
    },
    questIconDone: { backgroundColor: C.greenSoft, borderColor: C.greenBorder },
    questInfo: { flex: 1 },
    questTitle: {
        fontSize: T.sm, fontWeight: W.xbold,
        color: C.text, marginBottom: 3, lineHeight: 18,
    },
    questTitleDone: { color: C.textMuted, textDecorationLine: 'line-through' },
    questMeta:  { flexDirection: 'row', alignItems: 'center', gap: S.sm },
    questCount: { fontSize: T.xs, color: C.textMuted, fontWeight: W.semi },
    donePill: {
        backgroundColor: C.greenSoft, borderRadius: R.full,
        paddingHorizontal: S.sm, paddingVertical: 2,
        borderWidth: 1, borderColor: C.greenBorder,
    },
    donePillText: { fontSize: T.nano, fontWeight: W.black, color: C.green, letterSpacing: 0.5 },
    xpPill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: C.goldSoft, borderRadius: R.full,
        paddingHorizontal: S.sm, paddingVertical: S.xs,
        borderWidth: 1, borderColor: C.goldBorder,
    },
    xpPillDone: { backgroundColor: C.greenSoft, borderColor: C.greenBorder },
    xpPillText: { fontSize: T.xs, fontWeight: W.bold, color: C.gold },
    xpPillTextDone: { color: C.green },
    progressTrack: {
        height: 3, backgroundColor: C.border,
        borderRadius: R.full, overflow: 'hidden',
    },
    progressFill: {
        height: '100%', backgroundColor: C.ember, borderRadius: R.full,
    },
    progressFillDone: { backgroundColor: C.green },

    // Empty
    emptyBox: {
        alignItems: 'center', paddingVertical: S.xxl, gap: S.sm,
    },
    emptyTitle: { fontSize: T.md, fontWeight: W.semi, color: C.textSub },
    emptySub:   { fontSize: T.sm, color: C.textMuted },

    // History card
    histCard: {
        borderRadius: R.xl, overflow: 'hidden',
        borderWidth: 1, borderColor: C.border,
        paddingHorizontal: S.lg,
    },
    histRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: S.md, gap: S.md,
    },
    histBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    histDot: {
        width: 7, height: 7, borderRadius: R.full,
        backgroundColor: C.ember,
    },
    histInfo:   { flex: 1 },
    histReason: { fontSize: T.sm, fontWeight: W.semi, color: C.text, marginBottom: 2 },
    histMeta:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
    histDate:   { fontSize: T.nano, color: C.textMuted },
    amountPill: {
        backgroundColor: C.greenSoft, borderRadius: R.full,
        paddingHorizontal: S.sm, paddingVertical: 3,
        borderWidth: 1, borderColor: C.greenBorder,
    },
    amountPillNeg: { backgroundColor: Colors.overlayError09, borderColor: Colors.overlayError20 },
    amountText:    { fontSize: T.xs, fontWeight: W.bold, color: C.green },
    amountTextNeg: { color: C.error },
    trophyBadge: {
        width: 30, height: 30, borderRadius: R.full,
        backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.goldBorder,
        justifyContent: 'center', alignItems: 'center',
    },

    // Level-up toast
    lvlUpToast: {
        position: 'absolute', top: 72, left: S.lg, right: S.lg,
        zIndex: 1000, borderRadius: R.xxl, overflow: 'hidden',
        shadowColor: C.gold, shadowOpacity: 0.5,
        shadowRadius: 18, shadowOffset: { width: 0, height: 6 },
        elevation: 14,
    },
    lvlUpGrad: {
        flexDirection: 'row', alignItems: 'center',
        padding: S.lg, gap: S.md,
    },
    lvlUpTitle: { fontSize: T.md, fontWeight: W.black, color: Colors.white },
    lvlUpSub:   { fontSize: T.xs, fontWeight: W.semi, color: Colors.textSecondary, marginTop: 1 },
});