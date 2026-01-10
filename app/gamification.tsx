// ============================================================================
// GAMIFICATION SCREEN - Ploppy & Quêtes avec design amélioré
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard, SectionHeader } from '../src/components/ui';
import { useTranslation } from 'react-i18next';
import { useGamificationStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import Animated, { 
    FadeInDown, 
    FadeInUp, 
    FadeIn,
    useAnimatedStyle, 
    useSharedValue, 
    withRepeat, 
    withSequence, 
    withTiming,
    withSpring,
    runOnJS,
    useAnimatedReaction,
    useAnimatedProps,
} from 'react-native-reanimated';
import { Dumbbell, Timer, Flame, Target, Trophy, Sparkles, TrendingUp, Clock, CheckCircle2 } from 'lucide-react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(Text);

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLOPPY_IMAGE = require('../assets/ploppy.png');

// Composant pour l'anneau de progression XP avec animation optimisée
const XPRing = ({ progress, animatedProgress, size = 180 }: { progress: number; animatedProgress: { value: number }; size?: number }) => {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Animation fluide avec useAnimatedProps
    const animatedProps = useAnimatedProps(() => {
        const offset = circumference * (1 - animatedProgress.value);
        return {
            strokeDashoffset: offset,
        };
    });

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
                <Defs>
                    <SvgLinearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={Colors.cta} />
                        <Stop offset="100%" stopColor={Colors.cta2} />
                    </SvgLinearGradient>
                </Defs>
                {/* Background circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={Colors.overlay}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Animated progress circle */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#xpGradient)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={`${circumference}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    animatedProps={animatedProps}
                />
            </Svg>
        </View>
    );
};

// Icône de quête basée sur le type
const QuestIcon = ({ type, completed }: { type: string; completed: boolean }) => {
    const color = completed ? Colors.success : Colors.cta;
    const iconProps = { size: 22, color, strokeWidth: 2 };
    
    switch (type) {
        case 'exercises':
            return <Dumbbell {...iconProps} />;
        case 'workouts':
            return <Target {...iconProps} />;
        case 'duration':
            return <Timer {...iconProps} />;
        case 'distance':
            return <TrendingUp {...iconProps} />;
        default:
            return <Flame {...iconProps} />;
    }
};

// Composant pour une carte de quête améliorée
const QuestCard = ({ quest, index }: { quest: any; index: number }) => {
    const { t } = useTranslation();
    const progressPercent = Math.min((quest.current / quest.target) * 100, 100);

    return (
        <Animated.View
            entering={FadeInUp.delay(200 + index * 80).springify()}
        >
            <GlassCard style={[styles.questCard, quest.completed && styles.questCardCompleted]}>
                <View style={styles.questContent}>
                    {/* Icône et contenu */}
                    <View style={styles.questLeft}>
                        <View style={[styles.questIconContainer, quest.completed && styles.questIconCompleted]}>
                            {quest.completed ? (
                                <CheckCircle2 size={22} color={Colors.success} strokeWidth={2.5} />
                            ) : (
                                <QuestIcon type={quest.type} completed={quest.completed} />
                            )}
                        </View>
                        <View style={styles.questInfo}>
                            <Text style={[styles.questTitle, quest.completed && styles.questTitleCompleted]}>
                                {quest.description}
                            </Text>
                            <View style={styles.questProgressRow}>
                                <Text style={styles.questProgressText}>
                                    {quest.current} / {quest.target}
                                </Text>
                                {quest.completed && (
                                    <View style={styles.completedBadge}>
                                        <Text style={styles.completedBadgeText}>{t('gamification.completed')}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Badge XP */}
                    <View style={[styles.xpBadge, quest.completed && styles.xpBadgeCompleted]}>
                        <Sparkles size={12} color={quest.completed ? Colors.success : Colors.warning} />
                        <Text style={[styles.xpBadgeText, quest.completed && styles.xpBadgeTextCompleted]}>
                            +{quest.rewardXp}
                        </Text>
                    </View>
                </View>

                {/* Barre de progression */}
                <View style={styles.questProgressBar}>
                    <View 
                        style={[
                            styles.questProgressFill,
                            { width: `${progressPercent}%` },
                            quest.completed && styles.questProgressFillCompleted
                        ]} 
                    />
                </View>
            </GlassCard>
        </Animated.View>
    );
};

// Composant pour un item d'historique
const HistoryItem = ({ item, index, isLast }: { item: any; index: number; isLast: boolean }) => {
    const { t } = useTranslation();
    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const isNegative = item.amount < 0;
    const isLevelUp = item.type === 'level_up';

    return (
        <Animated.View 
            entering={FadeIn.delay(400 + index * 50)}
            style={[styles.historyItem, !isLast && styles.historyItemBorder]}
        >
            <View style={[styles.historyDot, isLevelUp && styles.historyDotLevelUp, isNegative && styles.historyDotNegative]} />
            <View style={styles.historyInfo}>
                <Text style={[styles.historyReason, isLevelUp && styles.historyReasonLevelUp]}>
                    {item.reason}
                </Text>
                <View style={styles.historyMeta}>
                    <Clock size={10} color={Colors.muted2} />
                    <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                </View>
            </View>
            {!isLevelUp && (
                <View style={[styles.historyAmountContainer, isNegative && styles.historyAmountNegative]}>
                    <Text style={[styles.historyAmountText, isNegative && styles.historyAmountTextNegative]}>
                        {isNegative ? '' : '+'}{item.amount} {t('gamification.xp')}
                    </Text>
                </View>
            )}
            {isLevelUp && (
                <View style={styles.levelUpBadge}>
                    <Trophy size={14} color={Colors.warning} />
                </View>
            )}
        </Animated.View>
    );
};

export default function GamificationScreen() {
    const { t } = useTranslation();
    const { xp, level, rank, quests, history, lastSeenXp, lastSeenLevel, checkAndRefreshQuests, updateLastSeen } = useGamificationStore();
    const scale = useSharedValue(1);
    const glow = useSharedValue(0.2);
    const xpDisplayed = useSharedValue(lastSeenXp ?? xp);
    const levelDisplayed = useSharedValue(lastSeenLevel ?? level);
    const [showLevelUp, setShowLevelUp] = useState(false);

    // Animation de respiration pour Ploppy
    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.03, { duration: 2500 }),
                withTiming(1, { duration: 2500 })
            ),
            -1,
            true
        );

        glow.value = withRepeat(
            withSequence(
                withTiming(0.35, { duration: 2000 }),
                withTiming(0.2, { duration: 2000 })
            ),
            -1,
            true
        );

        // Vérifie et rafraîchit les quêtes si nécessaire (nouvelle semaine)
        checkAndRefreshQuests();
    }, []);

    // Animation de mise à jour XP quand l'écran reprend le focus
    useFocusEffect(
        React.useCallback(() => {
            const previousLevelValue = lastSeenLevel ?? level;
            const previousXpValue = lastSeenXp ?? xp;
            let timeoutId: ReturnType<typeof setTimeout> | null = null;
            let updateTimeoutId: ReturnType<typeof setTimeout> | null = null;

            // Vérifier s'il y a eu un changement de niveau
            if (level > previousLevelValue) {
                setShowLevelUp(true);
                // Masquer après 3 secondes
                timeoutId = setTimeout(() => setShowLevelUp(false), 3000);
                
                // Animation du niveau
                levelDisplayed.value = previousLevelValue;
                levelDisplayed.value = withSpring(level, {
                    damping: 12,
                    stiffness: 100,
                });

                // Mettre à jour les dernières valeurs vues après l'animation
                updateTimeoutId = setTimeout(() => {
                    updateLastSeen();
                }, 1000);
            } else if (xp !== previousXpValue) {
                // Animation de l'XP (seulement si pas de level up)
                xpDisplayed.value = previousXpValue;
                xpDisplayed.value = withTiming(xp, {
                    duration: 1000,
                });
                
                // Mettre à jour les dernières valeurs vues après l'animation
                updateTimeoutId = setTimeout(() => {
                    updateLastSeen();
                }, 1000);
            }

            return () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (updateTimeoutId) clearTimeout(updateTimeoutId);
            };
        }, [level, xp, lastSeenLevel, lastSeenXp, updateLastSeen, setShowLevelUp])
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glow.value,
    }));

    const xpForNextLevel = level * 100;
    const progressAnimated = useSharedValue(Math.min(Math.max((lastSeenXp ?? xp) / xpForNextLevel, 0), 1));
    
    // Update progress animation when XP changes
    useEffect(() => {
        const currentProgress = Math.min(Math.max(xp / xpForNextLevel, 0), 1);
        progressAnimated.value = withTiming(currentProgress, { duration: 1000 });
    }, [xp, xpForNextLevel, progressAnimated]);
    
    const progress = Math.min(Math.max((lastSeenXp ?? xp) / xpForNextLevel, 0), 1);

    const completedQuests = useMemo(() => quests.filter(q => q.completed).length, [quests]);
    const recentHistory = useMemo(() => history.slice(0, 10), [history]);

    // Style animé pour le niveau affiché
    const animatedLevelStyle = useAnimatedStyle(() => ({
        transform: [{ scale: levelDisplayed.value === level ? 1 : 0.8 }],
    }));

    // Animated numbers: keep a React state in sync from worklets using runOnJS
    const [displayedLevelNumber, setDisplayedLevelNumber] = useState(level);
    const [displayedXpNumber, setDisplayedXpNumber] = useState(xp);

    useAnimatedReaction(
        () => levelDisplayed.value,
        (current, previous) => {
            if (current !== previous) {
                runOnJS(setDisplayedLevelNumber)(Math.round(current));
            }
        },
        []
    );

    useAnimatedReaction(
        () => xpDisplayed.value,
        (current, previous) => {
            if (current !== previous) {
                runOnJS(setDisplayedXpNumber)(Math.round(current));
            }
        },
        []
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />

            {/* Badge de Level Up */}
            {showLevelUp && (
                <Animated.View 
                    entering={FadeInDown.springify().damping(12)}
                    style={styles.levelUpNotification}
                >
                    <LinearGradient
                        colors={['rgba(251, 191, 36, 0.9)', 'rgba(245, 158, 11, 0.9)']}
                        style={styles.levelUpGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Trophy size={28} color={Colors.text} />
                        <View style={styles.levelUpTextContainer}>
                            <Text style={styles.levelUpTitle}>{t('gamification.levelUp')}</Text>
                            <Text style={styles.levelUpSubtitle}>
                                {t('gamification.level')} {level} - {rank}
                            </Text>
                        </View>
                        <Sparkles size={24} color={Colors.text} />
                    </LinearGradient>
                </Animated.View>
            )}

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* HEADER - PLOPPY & LEVEL */}
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
                    {/* Ploppy avec anneau XP */}
                    <View style={styles.ploppyWrapper}>
                        <Animated.View style={[styles.glowEffect, glowStyle]} />
                        <XPRing progress={progress} animatedProgress={progressAnimated} size={200} />
                        <View style={styles.ploppyInner}>
                            <Animated.Image
                                source={PLOPPY_IMAGE}
                                style={[styles.ploppyImage, animatedStyle]}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.levelBadge}>
                            <LinearGradient
                                colors={[Colors.cta, Colors.cta2]}
                                style={styles.levelBadgeGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.levelText}>{displayedLevelNumber}</Text>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Infos de rang */}
                    <Text style={styles.rankTitle}>{rank}</Text>
                    <View style={styles.xpInfo}>
                        <Sparkles size={14} color={Colors.cta} />
                        <Text style={styles.xpText}>{displayedXpNumber} / {xpForNextLevel} XP</Text>
                    </View>
                </Animated.View>

                {/* STATS RAPIDES */}
                <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{level}</Text>
                        <Text style={styles.statLabel}>{t('gamification.level')}</Text>
                    </View>
                    <View style={styles.statCardHighlight}>
                        <Text style={styles.statValueHighlight}>{completedQuests}/{quests.length}</Text>
                        <Text style={styles.statLabelHighlight}>{t('gamification.quests')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{history.filter(h => h.type === 'xp_gain' && h.amount > 0).length}</Text>
                        <Text style={styles.statLabel}>{t('gamification.gains')}</Text>
                    </View>
                </Animated.View>

                {/* QUESTS SECTION */}
                <View style={styles.section}>
                    <SectionHeader title={t('gamification.weeklyQuests')} />
                    <View style={styles.questsList}>
                        {quests.length === 0 ? (
                            <GlassCard style={styles.emptyCard}>
                                <Text style={styles.emptyText}>{t('gamification.noActiveQuests')}</Text>
                                <Text style={styles.emptySubtext}>{t('gamification.noActiveQuestsDesc')}</Text>
                            </GlassCard>
                        ) : (
                            quests.map((quest, index) => (
                                <QuestCard key={quest.id} quest={quest} index={index} />
                            ))
                        )}
                    </View>
                </View>

                {/* HISTORY SECTION */}
                <View style={styles.section}>
                    <SectionHeader title={t('gamification.recentGains')} />
                    <GlassCard style={styles.historyCard}>
                        {recentHistory.length === 0 ? (
                            <View style={styles.emptyHistory}>
                                <Sparkles size={32} color={Colors.muted2} />
                                <Text style={styles.emptyHistoryText}>{t('gamification.noRecentActivity')}</Text>
                                <Text style={styles.emptyHistorySubtext}>{t('gamification.noRecentActivityDesc')}</Text>
                            </View>
                        ) : (
                            recentHistory.map((item, index) => (
                                <HistoryItem 
                                    key={item.id} 
                                    item={item} 
                                    index={index} 
                                    isLast={index === recentHistory.length - 1}
                                />
                            ))
                        )}
                    </GlassCard>
                </View>

                <View style={styles.spacer} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: 120,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
        marginTop: Spacing.md,
    },
    ploppyWrapper: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    ploppyInner: {
        position: 'absolute',
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ploppyImage: {
        width: '100%',
        height: '100%',
    },
    glowEffect: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: Colors.cta,
    },
    levelBadge: {
        position: 'absolute',
        bottom: 5,
        right: 25,
        overflow: 'hidden',
        borderRadius: 20,
        shadowColor: Colors.cta,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    levelBadgeGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    rankTitle: {
        fontSize: 28,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        marginBottom: Spacing.xs,
        letterSpacing: 0.5,
    },
    xpInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    xpText: {
        fontSize: FontSize.md,
        color: Colors.muted,
        fontWeight: FontWeight.medium,
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.xxl,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.overlay,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    statCardHighlight: {
        flex: 1,
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(215, 150, 134, 0.3)',
    },
    statValue: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    statValueHighlight: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.cta,
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    statLabelHighlight: {
        fontSize: FontSize.xs,
        color: Colors.cta2,
        marginTop: 2,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    questsList: {
        gap: Spacing.sm,
    },
    questCard: {
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    questCardCompleted: {
        borderColor: 'rgba(74, 222, 128, 0.3)',
        backgroundColor: 'rgba(74, 222, 128, 0.05)',
    },
    questContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    questLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    questIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    questIconCompleted: {
        backgroundColor: 'rgba(74, 222, 128, 0.15)',
    },
    questInfo: {
        flex: 1,
    },
    questTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        marginBottom: 4,
    },
    questTitleCompleted: {
        textDecorationLine: 'line-through',
        color: Colors.muted,
    },
    questProgressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    questProgressText: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    completedBadge: {
        backgroundColor: 'rgba(74, 222, 128, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    completedBadgeText: {
        fontSize: 10,
        fontWeight: FontWeight.semibold,
        color: Colors.success,
    },
    xpBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    xpBadgeCompleted: {
        backgroundColor: 'rgba(74, 222, 128, 0.15)',
    },
    xpBadgeText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        color: Colors.warning,
    },
    xpBadgeTextCompleted: {
        color: Colors.success,
    },
    questProgressBar: {
        height: 4,
        backgroundColor: Colors.overlay,
        borderRadius: 2,
        overflow: 'hidden',
    },
    questProgressFill: {
        height: '100%',
        backgroundColor: Colors.cta,
        borderRadius: 2,
    },
    questProgressFillCompleted: {
        backgroundColor: Colors.success,
    },
    emptyCard: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: FontSize.md,
        color: Colors.muted,
        fontWeight: FontWeight.medium,
    },
    emptySubtext: {
        fontSize: FontSize.sm,
        color: Colors.muted2,
        marginTop: 4,
    },
    historyCard: {
        padding: Spacing.md,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    historyItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.stroke,
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.cta,
        marginRight: Spacing.sm,
    },
    historyDotLevelUp: {
        backgroundColor: Colors.warning,
    },
    historyDotNegative: {
        backgroundColor: Colors.error,
    },
    historyInfo: {
        flex: 1,
    },
    historyReason: {
        fontSize: FontSize.sm,
        color: Colors.text,
        fontWeight: FontWeight.medium,
        marginBottom: 2,
    },
    historyReasonLevelUp: {
        color: Colors.warning,
        fontWeight: FontWeight.bold,
    },
    historyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    historyDate: {
        fontSize: 10,
        color: Colors.muted2,
    },
    historyAmountContainer: {
        backgroundColor: 'rgba(74, 222, 128, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    historyAmountNegative: {
        backgroundColor: 'rgba(248, 113, 113, 0.15)',
    },
    historyAmountText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        color: Colors.success,
    },
    historyAmountTextNegative: {
        color: Colors.error,
    },
    levelUpBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyHistory: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
    },
    emptyHistoryText: {
        fontSize: FontSize.md,
        color: Colors.muted,
        marginTop: Spacing.md,
        fontWeight: FontWeight.medium,
    },
    emptyHistorySubtext: {
        fontSize: FontSize.sm,
        color: Colors.muted2,
        marginTop: 4,
    },
    spacer: {
        height: 40,
    },
    levelUpNotification: {
        position: 'absolute',
        top: 80,
        left: Spacing.lg,
        right: Spacing.lg,
        zIndex: 1000,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        shadowColor: Colors.warning,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
    },
    levelUpGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    levelUpTextContainer: {
        flex: 1,
    },
    levelUpTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        marginBottom: 2,
    },
    levelUpSubtitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        opacity: 0.9,
    },
});
