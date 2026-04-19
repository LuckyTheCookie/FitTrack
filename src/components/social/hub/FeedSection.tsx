import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Activity, Heart, MessageSquare, X, Zap } from 'lucide-react-native';
import { GlassCard } from '../../ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '../../../constants';
import type { FeedViewItem } from './types';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

interface FeedSectionProps {
    items: FeedViewItem[];
    isSendingLikeForId: string | null;
    isDeletingItemId: string | null;
    onSendLike: (item: FeedViewItem) => void;
    onDeleteItem: (item: FeedViewItem) => void;
    error?: string | null;
    labels: {
        sectionTitle: string;
        emptyTitle: string;
        emptySubtitle: string;
        like: string;
        liked: string;
        sending: string;
        likedBy: (names: string, extra: number) => string;
        justNow: string;
        minutesAgo: (count: number) => string;
        hoursAgo: (count: number) => string;
        daysAgo: (count: number) => string;
    };
}

function relativeTimeLabel(dateIso: string, labels: FeedSectionProps['labels']): string {
    const created = new Date(dateIso).getTime();
    const now = Date.now();
    const delta = Math.max(0, Math.floor((now - created) / 1000));

    if (delta < SECONDS_PER_MINUTE) return labels.justNow;
    if (delta < SECONDS_PER_HOUR) return labels.minutesAgo(Math.floor(delta / SECONDS_PER_MINUTE));
    if (delta < SECONDS_PER_DAY) return labels.hoursAgo(Math.floor(delta / SECONDS_PER_HOUR));
    return labels.daysAgo(Math.floor(delta / SECONDS_PER_DAY));
}

// Generate a consistent color for each avatar initial
const AVATAR_PALETTES = [
    { bg: 'rgba(167,139,250,0.22)', border: 'rgba(167,139,250,0.35)', text: '#a78bfa' },
    { bg: 'rgba(215,150,134,0.22)', border: 'rgba(215,150,134,0.35)', text: '#d79686' },
    { bg: 'rgba(34,211,238,0.18)', border: 'rgba(34,211,238,0.3)', text: '#22d3ee' },
    { bg: 'rgba(74,222,128,0.18)', border: 'rgba(74,222,128,0.3)', text: '#4ade80' },
    { bg: 'rgba(245,200,66,0.18)', border: 'rgba(245,200,66,0.3)', text: '#f5c842' },
];

function paletteForName(name: string) {
    const idx = name.charCodeAt(0) % AVATAR_PALETTES.length;
    return AVATAR_PALETTES[idx];
}

export function FeedSection({
    items,
    isSendingLikeForId,
    isDeletingItemId,
    onSendLike,
    onDeleteItem,
    error,
    labels,
}: FeedSectionProps) {
    return (
        <View>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionLabelWrap}>
                    <Activity size={12} color={Colors.violet} />
                    <Text style={styles.sectionLabel}>{labels.sectionTitle}</Text>
                </View>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <GlassCard style={styles.feedCard}>
                {items.length === 0 ? (
                    <View style={styles.emptyFeed}>
                        <MessageSquare size={22} color={Colors.muted2} />
                        <Text style={styles.emptyTitle}>{labels.emptyTitle}</Text>
                        <Text style={styles.emptySubtitle}>{labels.emptySubtitle}</Text>
                    </View>
                ) : (
                    items.map((item, index) => {
                        const palette = paletteForName(item.actorName);
                        return (
                            <View
                                key={item.id}
                                style={[
                                    styles.feedRow,
                                    index < items.length - 1 && styles.feedRowBorder,
                                ]}
                            >
                                {/* Avatar */}
                                <View style={[styles.feedAvatar, {
                                    backgroundColor: palette.bg,
                                    borderColor: palette.border,
                                }]}>
                                    <Text style={[styles.feedAvatarText, { color: palette.text }]}>
                                        {item.actorName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                <View style={styles.feedContent}>
                                    {/* Title + time */}
                                    <View style={styles.feedTitleRow}>
                                        <Text style={styles.feedTitle} numberOfLines={2}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.feedTime}>
                                            {relativeTimeLabel(item.createdAt, labels)}
                                        </Text>
                                    </View>

                                    {/* Detail text */}
                                    {!!item.detail && (
                                        <Text style={styles.feedDetail} numberOfLines={2}>
                                            {item.detail}
                                        </Text>
                                    )}

                                    {/* Stats pills */}
                                    {item.stats.length > 0 && (
                                        <View style={styles.statsRow}>
                                            {item.stats.map((stat) => (
                                                <View key={`${item.id}:${stat}`} style={styles.statPill}>
                                                    <Zap size={9} color={Colors.info} />
                                                    <Text style={styles.statPillText}>{stat}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Liked by */}
                                    {item.likeCount > 0 && item.likedByPreview.length > 0 && (
                                        <Text style={styles.likesPreview}>
                                            {labels.likedBy(
                                                item.likedByPreview.map((liker) => liker.name).join(', '),
                                                Math.max(0, item.likeCount - item.likedByPreview.length)
                                            )}
                                        </Text>
                                    )}

                                    {/* Actions row */}
                                    <View style={styles.feedActionsRow}>
                                        {item.isWorkoutShare && item.canLike && (
                                            <TouchableOpacity
                                                style={[
                                                    styles.feedLikeBtn,
                                                    item.likedByMe && styles.feedLikeBtnActive,
                                                ]}
                                                onPress={() => onSendLike(item)}
                                                disabled={isSendingLikeForId === item.id}
                                            >
                                                <Heart
                                                    size={12}
                                                    color={item.likedByMe ? Colors.white : Colors.cta}
                                                    fill={item.likedByMe ? Colors.cta : 'transparent'}
                                                />
                                                <Text style={[
                                                    styles.feedLikeText,
                                                    item.likedByMe && styles.feedLikeTextActive,
                                                ]}>
                                                    {isSendingLikeForId === item.id
                                                        ? labels.sending
                                                        : (item.likedByMe ? labels.liked : labels.like)}
                                                </Text>
                                                {item.likeCount > 0 && (
                                                    <Text style={[
                                                        styles.feedLikeCount,
                                                        item.likedByMe && styles.feedLikeCountActive,
                                                    ]}>
                                                        {item.likeCount}
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        )}

                                        {item.canDelete && (
                                            <TouchableOpacity
                                                onPress={() => onDeleteItem(item)}
                                                disabled={isDeletingItemId === item.id}
                                                style={styles.feedDeleteBtn}
                                            >
                                                <X size={11} color={Colors.error} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </GlassCard>
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
    errorText: {
        color: Colors.error,
        fontSize: FontSize.xs,
        marginBottom: Spacing.xs,
    },
    feedCard: {
        padding: 0,
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
    },
    feedRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    feedRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.overlayWhite08,
    },
    feedAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    feedAvatarText: {
        fontWeight: FontWeight.bold,
        fontSize: FontSize.md,
    },
    feedContent: {
        flex: 1,
        gap: 4,
    },
    feedTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: Spacing.xs,
    },
    feedTitle: {
        flex: 1,
        color: Colors.text,
        fontWeight: FontWeight.semibold,
        fontSize: FontSize.sm,
        lineHeight: 17,
    },
    feedTime: {
        color: Colors.muted2,
        fontSize: 10,
        marginTop: 1,
        flexShrink: 0,
    },
    feedDetail: {
        color: Colors.muted2,
        fontSize: FontSize.xs,
        lineHeight: 15,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 5,
        marginTop: 2,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.overlayInfo15,
        backgroundColor: Colors.overlayInfo12,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    statPillText: {
        color: Colors.info,
        fontSize: 10,
        fontWeight: FontWeight.semibold,
    },
    likesPreview: {
        color: Colors.muted2,
        fontSize: 10,
        marginTop: 2,
    },
    feedActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: 4,
    },
    feedDeleteBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.overlayError10,
        borderWidth: 1,
        borderColor: Colors.overlayError20,
        marginLeft: 'auto',
    },
    feedLikeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.overlayCozyWarm40,
        backgroundColor: Colors.overlayCozyWarm15,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    feedLikeBtnActive: {
        backgroundColor: Colors.cta,
        borderColor: Colors.cta,
    },
    feedLikeText: {
        color: Colors.cta,
        fontSize: 10,
        fontWeight: FontWeight.semibold,
    },
    feedLikeTextActive: {
        color: Colors.white,
    },
    feedLikeCount: {
        color: Colors.cta,
        fontSize: 10,
        fontWeight: FontWeight.bold,
    },
    feedLikeCountActive: {
        color: Colors.white,
    },
    emptyFeed: {
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xs,
        alignItems: 'center',
    },
    emptyTitle: {
        color: Colors.text,
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        textAlign: 'center',
    },
    emptySubtitle: {
        color: Colors.muted2,
        fontSize: FontSize.sm,
        textAlign: 'center',
        lineHeight: 18,
    },
});
