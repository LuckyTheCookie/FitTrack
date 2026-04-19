import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, Clock, Crown, Flag, Target, Users, X, XCircle, Zap } from 'lucide-react-native';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '../../../constants';
import type { ChallengeSectionProps } from './types';

export function ChallengeCarouselSection({
    activeChallenges,
    challengeCardWidth,
    challengeIndex,
    setChallengeIndex,
    onAddSession,
    onViewDetails,
    onDismissChallenge,
    strings,
}: ChallengeSectionProps) {
    if (activeChallenges.length === 0) {
        return null;
    }

    return (
        <View>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionLabelWrap}>
                    <Flag size={12} color={Colors.violet} />
                    <Text style={styles.sectionLabel}>{strings.sectionTitle}</Text>
                </View>
                {activeChallenges.length > 1 && (
                    <Text style={styles.sectionCount}>
                        {challengeIndex + 1}/{activeChallenges.length}
                    </Text>
                )}
            </View>

            <ScrollView
                horizontal
                pagingEnabled
                snapToInterval={challengeCardWidth + Spacing.sm}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.challengeCarousel, { gap: Spacing.sm }]}
                onMomentumScrollEnd={(event) => {
                    const page = Math.round(event.nativeEvent.contentOffset.x / (challengeCardWidth + Spacing.sm));
                    setChallengeIndex(Math.max(0, Math.min(activeChallenges.length - 1, page)));
                }}
            >
                {activeChallenges.map((item) => {
                    const progress = Number(item.my_progress || 0);
                    const target = Number(item.challenge.goal_target || 1);
                    const ratio = Math.min(1, progress / Math.max(target, 1));
                    const isFinished = item.is_finished;
                    const endsAt = new Date(item.challenge.ends_at);
                    const remainingDays = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

                    // Figure out if the current user won
                    const myRank = item.my_rank;
                    const iWon = isFinished && myRank === 1;
                    const iLost = isFinished && myRank != null && myRank > 1;
                    const isDraw = isFinished && item.winner?.is_tie;
                    const winnerName = item.winner ? (item.winner.display_name || item.winner.username) : null;

                    let cardGradientColors: [string, string];
                    if (!isFinished) {
                        cardGradientColors = [Colors.overlayViolet18, Colors.overlayBlack25];
                    } else if (iWon || isDraw) {
                        cardGradientColors = [Colors.overlayGold12, Colors.overlaySuccess08];
                    } else {
                        cardGradientColors = ['rgba(30,16,16,0.9)', Colors.overlayError09];
                    }

                    let borderColor: string = Colors.overlayViolet14;
                    if (isFinished) {
                        borderColor = iWon || isDraw ? Colors.overlayGold20 : Colors.overlayError20;
                    }

                    let progressColor: string = Colors.cta2;
                    if (iWon) {
                        progressColor = Colors.gold;
                    } else if (iLost) {
                        progressColor = Colors.muted2;
                    }

                    const getResultLabel = () => {
                        if (!item.winner) {
                            return strings.finishReasonLabel(item.finish_reason);
                        }

                        if (item.winner.is_tie) {
                            return strings.drawLabel(item.winner.tied_with_count);
                        }

                        const winnerLabel = strings.winnerLabel(winnerName || '');
                        if (iWon) {
                            return `🏆 ${winnerLabel}`;
                        }

                        return winnerLabel;
                    };

                    return (
                        <LinearGradient
                            key={item.challenge.id}
                            colors={cardGradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.challengeCard, { width: challengeCardWidth, borderColor }]}
                        >
                            {/* Header row */}
                            <View style={styles.cardHeader}>
                                <View style={styles.cardHeaderLeft}>
                                    {/* Goal type badge */}
                                    <View style={styles.goalPill}>
                                        <Zap size={9} color={Colors.cta} />
                                        <Text style={styles.goalPillText}>{strings.goalLabel(item.challenge.goal_type)}</Text>
                                    </View>

                                    {/* Status badge */}
                                    {isFinished ? (
                                        <View style={[
                                            styles.statusPill,
                                            iWon && styles.statusPillWin,
                                            iLost && styles.statusPillLoss,
                                            isDraw && styles.statusPillDraw,
                                        ]}>
                                            {(() => {
                                                const crownColor = iWon ? Colors.gold : Colors.muted;
                                                if (iWon || isDraw) {
                                                    return <Crown size={9} color={crownColor} />;
                                                }
                                                return <XCircle size={9} color={Colors.error} />;
                                            })()}
                                            <Text style={[
                                                styles.statusPillText,
                                                iWon && styles.statusPillTextWin,
                                                iLost && styles.statusPillTextLoss,
                                                isDraw && styles.statusPillTextDraw,
                                            ]}>
                                                {strings.finishedLabel}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.statusPill}>
                                            <Clock size={9} color={Colors.violet} />
                                            <Text style={styles.statusPillText}>
                                                {strings.daysRemaining(remainingDays)}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Dismiss button for finished */}
                                {isFinished && (
                                    <TouchableOpacity
                                        style={styles.dismissBtn}
                                        onPress={() => onDismissChallenge(item.challenge.id)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <X size={12} color={Colors.muted2} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Title */}
                            <Text style={styles.challengeTitle} numberOfLines={2}>
                                {item.challenge.title}
                            </Text>

                            {/* Win/Loss result banner */}
                            {isFinished && (
                                <View style={[
                                    styles.resultBanner,
                                    iWon && styles.resultBannerWin,
                                    iLost && styles.resultBannerLoss,
                                    isDraw && styles.resultBannerDraw,
                                ]}>
                                    <View style={styles.resultBannerLeft}>
                                        {(iWon || isDraw) ? (
                                            <CheckCircle2 size={14} color={iWon ? Colors.gold : Colors.muted} />
                                        ) : (
                                            <XCircle size={14} color={Colors.error} />
                                        )}
                                        <Text style={[
                                            styles.resultBannerText,
                                            iWon && styles.resultBannerTextWin,
                                            iLost && styles.resultBannerTextLoss,
                                        ]}>
                                            {getResultLabel()}
                                        </Text>
                                    </View>
                                    {myRank != null && (
                                        <View style={styles.rankBadge}>
                                            <Text style={styles.rankBadgeText}>#{myRank}</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Progress bar */}
                            {!isFinished && (
                                <View style={styles.progressSection}>
                                    <View style={styles.progressTrack}>
                                        <View style={[styles.progressFill, { width: `${ratio * 100}%`, backgroundColor: progressColor }]} />
                                    </View>
                                    <View style={styles.progressLabelRow}>
                                        <Text style={styles.progressLabel}>
                                            {Math.round(progress)}<Text style={styles.progressLabelMuted}>/{Math.round(target)}</Text>
                                        </Text>
                                        <Text style={[styles.progressPct, { color: progressColor }]}>
                                            {Math.round(ratio * 100)}%
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Finished progress summary */}
                            {isFinished && (
                                <View style={styles.finishedStats}>
                                    <View style={styles.finishedStatItem}>
                                        <Target size={11} color={Colors.muted2} />
                                        <Text style={styles.finishedStatText}>{Math.round(progress)}/{Math.round(target)}</Text>
                                    </View>
                                    <View style={styles.finishedStatItem}>
                                        <Users size={11} color={Colors.muted2} />
                                        <Text style={styles.finishedStatText}>{item.participants_count}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Participants preview */}
                            {!isFinished && item.preview_participants.length > 0 && (
                                <View style={styles.participantsRow}>
                                    <View style={styles.avatarStack}>
                                        {item.preview_participants.slice(0, 3).map((p, i) => (
                                            <View key={p.id} style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -8 }]}>
                                                <Text style={styles.miniAvatarText}>
                                                    {(p.display_name || p.username).charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                    <Text style={styles.participantsLabel} numberOfLines={1}>
                                        {item.participants_count} {item.participants_count === 1 ? 'participant' : 'participants'}
                                    </Text>
                                </View>
                            )}

                            {/* Actions */}
                            <View style={styles.challengeActions}>
                                <TouchableOpacity style={styles.ghostBtn} onPress={() => onViewDetails(item)}>
                                    <Text style={styles.ghostBtnText}>{strings.details}</Text>
                                </TouchableOpacity>
                                {!isFinished && (
                                    <TouchableOpacity style={styles.solidBtn} onPress={onAddSession}>
                                        <Text style={styles.solidBtnText}>{strings.addSession}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </LinearGradient>
                    );
                })}
            </ScrollView>

            {activeChallenges.length > 1 && (
                <View style={styles.dotRow}>
                    {activeChallenges.map((item, idx) => (
                        <View
                            key={item.challenge.id}
                            style={[styles.dot, idx === challengeIndex && styles.dotActive]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    sectionLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionLabel: {
        color: Colors.text,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionCount: {
        color: Colors.muted2,
        fontSize: 10,
        fontWeight: FontWeight.semibold,
    },
    challengeCarousel: {
        paddingRight: Spacing.lg,
    },
    challengeCard: {
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        borderWidth: 1,
        gap: 10,
    },
    // Header
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        flex: 1,
    },
    goalPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.overlayCozyWarm40,
        backgroundColor: Colors.overlayCozyWarm15,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    goalPillText: {
        color: Colors.cta,
        fontSize: 9,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.overlayViolet20,
        backgroundColor: Colors.overlayViolet12,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    statusPillWin: {
        borderColor: Colors.overlayGold20,
        backgroundColor: Colors.overlayGold10,
    },
    statusPillLoss: {
        borderColor: Colors.overlayError20,
        backgroundColor: Colors.overlayError10,
    },
    statusPillDraw: {
        borderColor: Colors.overlayWhite12,
        backgroundColor: Colors.overlayBlack25,
    },
    statusPillText: {
        color: Colors.violet,
        fontSize: 9,
        fontWeight: FontWeight.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
    },
    statusPillTextWin: {
        color: Colors.gold,
    },
    statusPillTextLoss: {
        color: Colors.error,
    },
    statusPillTextDraw: {
        color: Colors.muted,
    },
    dismissBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: Colors.overlayBlack25,
        borderWidth: 1,
        borderColor: Colors.overlayWhite12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Title
    challengeTitle: {
        color: Colors.white,
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        letterSpacing: -0.4,
        lineHeight: 22,
    },
    // Result banner
    resultBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.overlayWhite12,
        backgroundColor: Colors.overlayBlack30,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    resultBannerWin: {
        borderColor: Colors.overlayGold20,
        backgroundColor: Colors.overlayGold10,
    },
    resultBannerLoss: {
        borderColor: Colors.overlayError20,
        backgroundColor: Colors.overlayError10,
    },
    resultBannerDraw: {
        borderColor: Colors.overlayWhite20,
        backgroundColor: Colors.overlayBlack30,
    },
    resultBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    resultBannerText: {
        color: Colors.muted,
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
        flex: 1,
    },
    resultBannerTextWin: {
        color: Colors.gold,
    },
    resultBannerTextLoss: {
        color: Colors.error,
    },
    rankBadge: {
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.overlayWhite10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    rankBadgeText: {
        color: Colors.muted,
        fontSize: 10,
        fontWeight: FontWeight.bold,
    },
    // Progress
    progressSection: {
        gap: 5,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.overlayWhite12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    progressLabel: {
        color: Colors.textWhite80,
        fontSize: 11,
        fontWeight: FontWeight.semibold,
    },
    progressLabelMuted: {
        color: Colors.muted2,
        fontWeight: FontWeight.regular,
    },
    progressPct: {
        fontSize: 11,
        fontWeight: FontWeight.bold,
    },
    // Finished stats
    finishedStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    finishedStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    finishedStatText: {
        color: Colors.muted2,
        fontSize: 11,
        fontWeight: FontWeight.semibold,
    },
    // Participants
    participantsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.overlayWhite20,
        backgroundColor: Colors.overlayViolet20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniAvatarText: {
        color: Colors.violet,
        fontSize: 8,
        fontWeight: FontWeight.bold,
    },
    participantsLabel: {
        color: Colors.muted2,
        fontSize: 11,
        flex: 1,
    },
    // Actions
    challengeActions: {
        flexDirection: 'row',
        gap: Spacing.xs,
        marginTop: 2,
    },
    ghostBtn: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        paddingVertical: 9,
        backgroundColor: Colors.overlayWhite08,
        borderWidth: 1,
        borderColor: Colors.overlayWhite15,
        alignItems: 'center',
    },
    ghostBtnText: {
        color: Colors.textWhite80,
        fontWeight: FontWeight.semibold,
        fontSize: FontSize.xs,
    },
    solidBtn: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        paddingVertical: 9,
        backgroundColor: Colors.cta,
        alignItems: 'center',
    },
    solidBtnText: {
        color: Colors.white,
        fontWeight: FontWeight.semibold,
        fontSize: FontSize.xs,
    },
    // Dots
    dotRow: {
        marginTop: Spacing.sm,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 5,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: Colors.overlayWhite20,
    },
    dotActive: {
        backgroundColor: Colors.violet,
        width: 16,
        borderRadius: 3,
    },
});
