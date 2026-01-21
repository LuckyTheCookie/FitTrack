// ============================================================================
// SOCIAL SCREEN - Classement, Amis, Encouragements
// ============================================================================

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Modal,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
    Trophy,
    Users,
    Heart,
    Search,
    UserPlus,
    Check,
    X,
    Crown,
    Medal,
    Flame,
    Zap,
    ChevronRight,
    LogIn,
    UserCircle,
    Settings,
    Bell,
    UserX,
    ExternalLink,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { GlassCard } from '../src/components/ui';
import { useTranslation } from 'react-i18next';
import { useAppStore, useGamificationStore, useSocialStore } from '../src/stores';
import { isSocialAvailable } from '../src/services/supabase';
import * as NotificationService from '../src/services/notifications';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { BuildConfig } from '../src/config';
import type { Profile, LeaderboardEntry } from '../src/services/supabase';

// ============================================================================
// COMPONENTS
// ============================================================================

// Tab selector
function TabSelector({ 
    activeTab, 
    onTabChange 
}: { 
    activeTab: 'leaderboard' | 'friends' | 'encouragements';
    onTabChange: (tab: 'leaderboard' | 'friends' | 'encouragements') => void;
}) {
    const { t } = useTranslation();
    const tabs = [
        { id: 'leaderboard' as const, label: t('social.leaderboard'), icon: Trophy },
        { id: 'friends' as const, label: t('social.friends'), icon: Users },
        { id: 'encouragements' as const, label: t('social.encouragements'), icon: Heart },
    ];

    return (
        <View style={styles.tabContainer}>
            {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.tab, isActive && styles.tabActive]}
                        onPress={() => onTabChange(tab.id)}
                    >
                        <Icon size={18} color={isActive ? Colors.cta : Colors.muted} />
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

// Leaderboard item
function LeaderboardItem({ 
    entry, 
    rank,
    isMe,
    onEncourage,
    isFriend,
    onPress,
    onBlock,
}: { 
    entry: LeaderboardEntry;
    rank: number;
    isMe?: boolean;
    onEncourage?: () => void;
    isFriend?: boolean;
    onPress?: () => void;
    onBlock?: () => void;
}) {
    const getRankIcon = () => {
        if (rank === 1) return <Crown size={20} color="#fbbf24" fill="#fbbf24" />;
        if (rank === 2) return <Medal size={20} color="#94a3b8" />;
        if (rank === 3) return <Medal size={20} color="#cd7f32" />;
        return <Text style={styles.rankNumber}>{rank}</Text>;
    };

    return (
        <Animated.View entering={FadeInDown.delay(rank * 50).springify()}>
            <TouchableOpacity onPress={onPress} disabled={isMe || !onPress} activeOpacity={0.7}>
            <GlassCard style={isMe ? [styles.leaderboardItem, styles.leaderboardItemMe] : styles.leaderboardItem}>
                <View style={styles.rankContainer}>
                    {getRankIcon()}
                </View>
                <View style={styles.userAvatar}>
                    <Text style={styles.avatarText}>
                        {(entry.display_name || entry.username).charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                        {entry.display_name || entry.username}
                        {isMe && ' (toi)'}
                    </Text>
                    <View style={styles.userStats}>
                        <Flame size={12} color={Colors.warning} />
                        <Text style={styles.userStatText}>{entry.current_streak}j</Text>
                        <Zap size={12} color={Colors.cta} style={{ marginLeft: 8 }} />
                        <Text style={styles.userStatText}>Lv.{entry.level}</Text>
                    </View>
                </View>
                <View style={styles.xpContainer}>
                    <Text style={styles.xpValue}>{entry.weekly_xp}</Text>
                    <Text style={styles.xpLabel}>XP</Text>
                </View>
                {/* Afficher le bouton d'encouragement uniquement si c'est un ami */}
                {!isMe && onEncourage && isFriend && (
                    <TouchableOpacity 
                        style={styles.encourageButton}
                        onPress={onEncourage}
                    >
                        <Heart size={18} color={Colors.cta} />
                    </TouchableOpacity>
                )}
                {/* Afficher le bouton de blocage si ce n'est pas un ami */}
                {!isMe && !isFriend && onBlock && (
                    <TouchableOpacity 
                        style={styles.blockButton}
                        onPress={onBlock}
                    >
                        <UserX size={18} color={Colors.error} />
                    </TouchableOpacity>
                )}
            </GlassCard>
            </TouchableOpacity>
        </Animated.View>
    );
}

// Friend request item
function FriendRequestItem({
    request,
    onAccept,
    onReject,
}: {
    request: any;
    onAccept: () => void;
    onReject: () => void;
}) {
    const { t } = useTranslation();
    return (
        <GlassCard style={styles.requestItem}>
            <View style={styles.userAvatar}>
                <Text style={styles.avatarText}>
                    {request.requester.display_name?.charAt(0) || '?'}
                </Text>
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>
                    {request.requester.display_name || request.requester.username}
                </Text>
                <Text style={styles.requestText}>{t('social.requestText')}</Text>
            </View>
            <View style={styles.requestActions}>
                <TouchableOpacity 
                    style={[styles.requestBtn, styles.acceptBtn]} 
                    onPress={onAccept}
                >
                    <Check size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.requestBtn, styles.rejectBtn]} 
                    onPress={onReject}
                >
                    <X size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </GlassCard>
    );
}

// Encouragement item
function EncouragementItem({
    encouragement,
    onMarkRead,
}: {
    encouragement: any;
    onMarkRead: () => void;
}) {
    return (
        <TouchableOpacity onPress={onMarkRead}>
            <GlassCard style={styles.encouragementItem}>
                <Text style={styles.encouragementEmoji}>{encouragement.emoji}</Text>
                <View style={styles.encouragementContent}>
                    <Text style={styles.encouragementSender}>
                        {encouragement.sender.display_name || encouragement.sender.username}
                    </Text>
                    <Text style={styles.encouragementMessage}>{encouragement.message}</Text>
                </View>
                {!encouragement.read_at && (
                    <View style={styles.unreadDot} />
                )}
            </GlassCard>
        </TouchableOpacity>
    );
}

// Auth prompt
function AuthPrompt({ onSignIn }: { onSignIn: () => void }) {
    const { t } = useTranslation();
    return (
        <View style={styles.authPrompt}>
            <UserCircle size={64} color={Colors.muted} />
            <Text style={styles.authTitle}>{t('social.authTitle')}</Text>
            <Text style={styles.authSubtitle}>{t('social.authSubtitle')}</Text>
            <TouchableOpacity style={styles.authButton} onPress={onSignIn}>
                <LogIn size={20} color="#fff" />
                <Text style={styles.authButtonText}>{t('profile.signIn')}</Text>
            </TouchableOpacity>
        </View>
    );
} 

// Not configured prompt - Shows different message for FOSS builds
function NotConfiguredPrompt() {
    const { t } = useTranslation();
    
    // Check if this is a FOSS build
    if (BuildConfig.isFoss) {
        return (
            <View style={styles.authPrompt}>
                <View style={styles.fossIconContainer}>
                    <Users size={48} color={Colors.teal} />
                </View>
                <Text style={styles.authTitle}>{t('social.fossTitle')}</Text>
                <Text style={styles.authSubtitle}>{t('social.fossSubtitle')}</Text>
                
                {/* Info box */}
                <View style={styles.fossInfoBox}>
                    <Text style={styles.fossInfoText}>
                        {t('social.fossInfo')}
                    </Text>
                </View>
                
                {/* CTA to get standard build */}
                <TouchableOpacity 
                    style={styles.fossUpgradeButton}
                    onPress={() => Linking.openURL(BuildConfig.githubReleasesUrl)}
                >
                    <ExternalLink size={18} color="#fff" />
                    <Text style={styles.fossUpgradeButtonText}>{t('social.fossUpgrade')}</Text>
                </TouchableOpacity>
            </View>
        );
    }
    
    // Standard "not configured" message for devs
    return (
        <View style={styles.authPrompt}>
            <Settings size={64} color={Colors.muted} />
            <Text style={styles.authTitle}>{t('social.notConfiguredTitle')}</Text>
            <Text style={styles.authSubtitle}>{t('social.notConfiguredSubtitle')}</Text>
        </View>
    );
} 

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function SocialScreen() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'friends' | 'encouragements'>('leaderboard');
    const [leaderboardType, setLeaderboardType] = useState<'global' | 'friends'>('global');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [notificationStatus, setNotificationStatus] = useState<'unknown' | 'granted' | 'denied' | 'network_error'>('unknown');
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
    const [showFriendModal, setShowFriendModal] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [selectedUserForBlock, setSelectedUserForBlock] = useState<Profile | null>(null);
    const [showBlockModal, setShowBlockModal] = useState(false);

    // Local data from app store
    const { entries, getStreak } = useAppStore();
    const { xp, level } = useGamificationStore();

    const {
        isAuthenticated,
        isLoading,
        profile,
        socialEnabled,
        globalLeaderboard,
        friendsLeaderboard,
        friends,
        pendingRequests,
        unreadEncouragements,
        recentEncouragements,
        fetchGlobalLeaderboard,
        fetchFriendsLeaderboard,
        fetchFriends,
        fetchPendingRequests,
        fetchEncouragements,
        sendFriendRequest,
        respondToRequest,
        removeFriend,
        sendEncouragement,
        markAsRead,
        searchUsers,
        checkAuth,
        syncStats,
        initializeNotifications,
        setupRealtimeSubscriptions,
        savePushToken,
        blockUser,
        isUserBlocked,
    } = useSocialStore();

    // Helper pour vérifier si un utilisateur est ami
    const isFriend = useCallback((userId: string) => {
        return friends.some(f => f.id === userId);
    }, [friends]);

    // Trouver le friendship ID pour un ami
    const getFriendshipId = useCallback((friendId: string) => {
        // Chercher dans les amis - on a besoin de la relation
        // Pour l'instant on retourne l'ID du friend, mais idéalement on devrait stocker le friendship_id
        return friendId;
    }, []);

    // Check auth and notifications on mount
    useEffect(() => {
        const initialize = async () => {
            setIsInitialLoading(true);
            // Check auth state
            await checkAuth();
            setIsInitialLoading(false);
            
            // Check notification permissions
            const result = await NotificationService.registerForPushNotifications();
            if (result.success) {
                setNotificationStatus('granted');
                // Save token to profile if authenticated
                if (isAuthenticated && savePushToken) {
                    await savePushToken(result.token);
                }
            } else if (result.reason === 'permission_denied') {
                // User explicitly denied - don't show any message
                setNotificationStatus('denied');
            } else if (result.reason === 'network_error') {
                // Network/VPN issue - show helpful message
                setNotificationStatus('network_error');
            } else {
                // Other issues (not_device, unknown) - silent
                setNotificationStatus('unknown');
            }
        };
        
        initialize();
    }, []);

    // Setup realtime when authenticated
    useEffect(() => {
        if (isAuthenticated && socialEnabled) {
            setupRealtimeSubscriptions();
        }
    }, [isAuthenticated, socialEnabled]);

    // Initial fetch + auto sync
    useEffect(() => {
        if (isAuthenticated && socialEnabled) {
            fetchGlobalLeaderboard();
            fetchFriendsLeaderboard();
            fetchFriends();
            fetchPendingRequests();
            fetchEncouragements();
        }
    }, [isAuthenticated, socialEnabled]);

    // Auto-sync when local data changes (entries, XP, level)
    useEffect(() => {
        if (!isAuthenticated || !socialEnabled) return;
        
        // Debounce: sync only if enough time has passed since last sync
        const now = new Date();
        if (lastSyncTime && (now.getTime() - lastSyncTime.getTime()) < 5000) return;
        
        const performSync = async () => {
            try {
                const streakData = getStreak();
                await syncStats({
                    workouts: localStats.weeklyWorkouts,
                    distance: localStats.weeklyDistance,
                    duration: localStats.weeklyDuration,
                    // Envoyer les XP hebdomadaires calculés correctement
                    xp: localStats.weeklyXp,
                    streak: streakData.current,
                    bestStreak: streakData.best,
                    totalXp: xp,
                    level,
                });
                setLastSyncTime(new Date());
                // Refresh leaderboards after sync
                fetchGlobalLeaderboard();
                fetchFriendsLeaderboard();
            } catch {
                // Silent fail for auto sync
            }
        };
        
        performSync();
    }, [entries.length, xp, level]);

    // Calculate local stats for sync
    const localStats = useMemo(() => {
        const now = new Date();
        const weekStart = new Date(now);
        // Lundi comme début de semaine
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(now.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);

        const sportEntries = entries.filter(e => 
            e.type === 'home' || e.type === 'run' || e.type === 'beatsaber'
        );
        
        const weeklyEntries = sportEntries.filter(e => 
            new Date(e.createdAt) >= weekStart
        );

        const weeklyWorkouts = weeklyEntries.length;
        const weeklyDistance = weeklyEntries
            .filter(e => e.type === 'run')
            .reduce((sum, e) => sum + ((e as any).distanceKm || 0), 0);
        const weeklyDuration = weeklyEntries
            .reduce((sum, e) => sum + ((e as any).durationMinutes || 0), 0);
        
        // Calcul des XP de la semaine basé sur la vraie logique XP :
        // Home: 50 XP base
        // Run: 30 + (km * 5) XP
        // Beat Saber: 15 + (duration / 5) XP
        let weeklyXp = 0;
        weeklyEntries.forEach(entry => {
            if (entry.type === 'home') {
                weeklyXp += 50; // 50 XP par séance maison
            } else if (entry.type === 'run') {
                const km = (entry as any).distanceKm || 0;
                weeklyXp += 30 + Math.floor(km * 5);
            } else if (entry.type === 'beatsaber') {
                const minutes = (entry as any).durationMinutes || 0;
                weeklyXp += 15 + Math.floor(minutes / 5);
            }
        });

        const streakData = getStreak();

        return {
            totalWorkouts: sportEntries.length,
            weeklyWorkouts,
            weeklyDistance,
            weeklyDuration,
            weeklyXp,
            xp,
            level,
            streak: streakData.current,
            bestStreak: streakData.best,
        };
    }, [entries, xp, level, getStreak]);

    // Refresh handler
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchGlobalLeaderboard(),
            fetchFriendsLeaderboard(),
            fetchFriends(),
            fetchPendingRequests(),
            fetchEncouragements(),
        ]);
        setRefreshing(false);
    }, []);

    // Search handler
    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const results = await searchUsers(query);
        setSearchResults(results);
        setIsSearching(false);
    }, [searchUsers]);

    // Encourage handler
    const handleEncourage = useCallback(async (userId: string, username: string) => {
        try {
            await sendEncouragement(userId);
            Alert.alert('💪 Envoyé !', `Tu as encouragé ${username} !`);
        } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Impossible d\'envoyer l\'encouragement');
        }
    }, [sendEncouragement]);

    // Friend request handler
    const handleSendRequest = useCallback(async (userId: string) => {
        try {
            await sendFriendRequest(userId);
            Alert.alert(t('common.success'), t('social.requestSent'))
            setSearchResults(prev => 
                prev.map(u => u.id === userId ? { ...u, friendship_status: 'pending' } : u)
            );
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        }
    }, [sendFriendRequest]);

    // Current leaderboard
    const currentLeaderboard = leaderboardType === 'global' ? globalLeaderboard : friendsLeaderboard;

    // Handler pour supprimer un ami
    const handleRemoveFriend = useCallback(async (friendId: string) => {
        Alert.alert(
            'Supprimer cet ami ?',
            'Tu ne pourras plus voir ses statistiques et il ne pourra plus t\'envoyer d\'encouragements.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeFriend(friendId);
                            setShowFriendModal(false);
                            setSelectedFriend(null);
                            Alert.alert('Ami supprimé', 'Cet utilisateur n\'est plus dans ta liste d\'amis.');
                        } catch (error: any) {
                            Alert.alert('Erreur', error.message || 'Impossible de supprimer cet ami');
                        }
                    },
                },
            ]
        );
    }, [removeFriend]);

    // Handler pour ouvrir le modal d'ami
    const handleOpenFriendModal = useCallback((friend: Profile) => {
        setSelectedFriend(friend);
        setShowFriendModal(true);
    }, []);

    // Handler pour ouvrir le modal de blocage
    const handleOpenBlockModal = useCallback((user: Profile) => {
        setSelectedUserForBlock(user);
        setShowBlockModal(true);
    }, []);

    // Handler pour bloquer un utilisateur
    const handleBlockUser = useCallback(async (userId: string) => {
        try {
            await blockUser(userId);
            Alert.alert('✓ Utilisateur bloqué', 'Cet utilisateur ne pourra plus te voir dans le classement.');
            setShowBlockModal(false);
            setSelectedUserForBlock(null);
            // Refresh leaderboards
            await fetchGlobalLeaderboard();
            await fetchFriendsLeaderboard();
        } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Impossible de bloquer cet utilisateur');
        }
    }, [blockUser, fetchGlobalLeaderboard, fetchFriendsLeaderboard]);

    // Not configured
    if (!isSocialAvailable()) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    <Text style={styles.screenTitle}>{t('social.title')}</Text>
                    <NotConfiguredPrompt />
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Loading initial - afficher un loader pendant la vérification d'auth
    if (isInitialLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.cta} />
                    <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View> 
            </SafeAreaView>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    <Text style={styles.screenTitle}>{t('social.title')}</Text>
                    <AuthPrompt onSignIn={() => router.push('/auth' as any)} />
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Social disabled
    if (!socialEnabled) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    <Text style={styles.screenTitle}>{t('social.title')}</Text>
                    <View style={styles.authPrompt}>
                        <Users size={64} color={Colors.muted} />
                        <Text style={styles.authTitle}>{t('social.disabledTitle')}</Text>
                        <Text style={styles.authSubtitle}>{t('social.disabledSubtitle')}</Text>
                        <TouchableOpacity 
                            style={styles.authButton} 
                            onPress={() => router.push('/settings')}
                        >
                            <Settings size={20} color="#fff" />
                            <Text style={styles.authButtonText}>{t('settings.title')}</Text>
                        </TouchableOpacity> 
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={handleRefresh}
                        tintColor={Colors.cta}
                    />
                }
            >
                {/* Header */}
                <Animated.View entering={FadeIn.delay(50)} style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text style={styles.screenTitle}>{t('social.title')}</Text>
                        {BuildConfig.isFoss && (
                            <View style={styles.fossBadge}>
                                <Text style={styles.fossBadgeText}>FOSS</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity 
                        style={styles.profileButton}
                        onPress={() => router.push('/profile' as any)}
                    >
                        <View style={styles.profileAvatar}>
                            <Text style={styles.profileAvatarText}>
                                {(profile?.display_name || profile?.username || '?').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* My Stats Card */}
                {profile && (
                    <Animated.View entering={FadeInDown.delay(100).springify()}>
                        <LinearGradient
                            colors={['rgba(215, 150, 134, 0.4)', 'rgba(215, 150, 134, 0.15)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.myStatsCard}
                        >
                            <View style={styles.myStatsHeader}>
                                <Text style={styles.myStatsName}>
                                    {profile.display_name || profile.username}
                                </Text>
                                <View style={styles.levelBadge}>
                                    <Zap size={14} color={Colors.bg} />
                                    <Text style={styles.levelText}>Lv. {profile.level}</Text>
                                </View>
                            </View>
                            <View style={styles.myStatsRow}>
                                <View style={styles.myStat}>
                                    <Text style={styles.myStatValue}>{profile?.weekly_xp ?? localStats.weeklyXp}</Text>
                                    <Text style={styles.myStatLabel}>{t('social.weeklyXP')}</Text>
                                </View>
                                <View style={styles.myStatDivider} />
                                <View style={styles.myStat}>
                                    <Text style={styles.myStatValue}>{profile?.weekly_workouts ?? localStats.weeklyWorkouts}</Text>
                                    <Text style={styles.myStatLabel}>{t('social.workouts')}</Text>
                                </View>
                                <View style={styles.myStatDivider} />
                                <View style={styles.myStat}>
                                    <View style={styles.streakRow}>
                                        <Flame size={16} color={Colors.warning} />
                                        <Text style={styles.myStatValue}>{profile?.current_streak ?? localStats.streak}</Text>
                                    </View>
                                    <Text style={styles.myStatLabel}>{t('social.streak')}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* Notification Status */}
                {notificationStatus === 'network_error' && (
                    <Animated.View entering={FadeInDown.delay(120).springify()}>
                        <TouchableOpacity 
                            style={[styles.notificationWarning, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}
                            onPress={async () => {
                                const result = await NotificationService.registerForPushNotifications();
                                if (result.success) {
                                    setNotificationStatus('granted');
                                    if (savePushToken) await savePushToken(result.token);
                                }
                            }}
                        >
                            <Bell size={18} color="#fbbf24" />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.notificationWarningText, { color: '#fbbf24' }]}>
                                    {t('social.notificationsEnableError')}
                                </Text>
                                <Text style={[styles.notificationWarningText, { fontSize: 11, opacity: 0.8, color: '#fbbf24' }]}>
                                    {t('social.notificationsNetworkHint')}
                                </Text>
                            </View>
                            <ChevronRight size={18} color="#fbbf24" />
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {/* Tabs */}
                <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Pending Requests Badge */}
                {pendingRequests.length > 0 && activeTab !== 'friends' && (
                    <TouchableOpacity 
                        style={styles.pendingBadge}
                        onPress={() => setActiveTab('friends')}
                    >
                        <UserPlus size={16} color="#fff" />
                        <Text style={styles.pendingBadgeText}>
                            {t('social.pendingRequests', { count: pendingRequests.length })}
                        </Text>
                        <ChevronRight size={16} color="#fff" />
                    </TouchableOpacity>
                )}

                {/* LEADERBOARD TAB */}
                {activeTab === 'leaderboard' && (
                    <View style={styles.tabContent}>
                        {/* Leaderboard type toggle */}
                        <View style={styles.leaderboardToggle}>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    leaderboardType === 'global' && styles.toggleButtonActive
                                ]}
                                onPress={() => setLeaderboardType('global')}
                            >
                                <Text style={[
                                    styles.toggleButtonText,
                                    leaderboardType === 'global' && styles.toggleButtonTextActive
                                ]}>
                                    🌍 {t('social.global')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.toggleButton,
                                    leaderboardType === 'friends' && styles.toggleButtonActive
                                ]}
                                onPress={() => setLeaderboardType('friends')}
                            >
                                <Text style={[
                                    styles.toggleButtonText,
                                    leaderboardType === 'friends' && styles.toggleButtonTextActive
                                ]}>
                                    👥 {t('social.friends')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Leaderboard list */}
                        {currentLeaderboard.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Trophy size={48} color={Colors.muted} />
                                <Text style={styles.emptyStateTitle}>
                                    {leaderboardType === 'friends' 
                                        ? t('social.emptyLeaderboardFriends')
                                        : t('social.emptyLeaderboardGlobal')
                                    }
                                </Text>
                            </View>
                        ) : (
                            currentLeaderboard.map((entry, index) => (
                                <LeaderboardItem
                                    key={entry.id}
                                    entry={entry}
                                    rank={index + 1}
                                    isMe={entry.id === profile?.id}
                                    isFriend={isFriend(entry.id)}
                                    onEncourage={
                                        entry.id !== profile?.id && isFriend(entry.id)
                                            ? () => handleEncourage(entry.id, entry.display_name || entry.username)
                                            : undefined
                                    }
                                    onPress={
                                        entry.id !== profile?.id && isFriend(entry.id)
                                            ? () => handleOpenFriendModal(entry as any)
                                            : undefined
                                    }
                                    onBlock={
                                        entry.id !== profile?.id && !isFriend(entry.id)
                                            ? () => handleOpenBlockModal(entry as any)
                                            : undefined
                                    }
                                />
                            ))
                        )}
                    </View>
                )}

                {/* FRIENDS TAB */}
                {activeTab === 'friends' && (
                    <View style={styles.tabContent}>
                        {/* Search */}
                        <View style={styles.searchContainer}>
                            <Search size={18} color={Colors.muted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={t('social.searchPlaceholder')}
                                placeholderTextColor={Colors.muted}
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />
                            {isSearching && <ActivityIndicator size="small" color={Colors.cta} />}
                        </View>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <View style={styles.searchResults}>
                                <Text style={styles.sectionTitle}>{t('social.results')}</Text>
                                {searchResults.map(user => (
                                    <GlassCard key={user.id} style={styles.searchResultItem}>
                                        <View style={styles.userAvatar}>
                                            <Text style={styles.avatarText}>
                                                {(user.display_name || user.username).charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>
                                                {user.display_name || user.username}
                                            </Text>
                                            <Text style={styles.userLevel}>Niveau {user.level}</Text>
                                        </View>
                                        {user.friendship_status === 'accepted' ? (
                                            <View style={styles.friendBadge}>
                                                <Check size={14} color="#4ade80" />
                                                <Text style={styles.friendBadgeText}>Ami</Text>
                                            </View>
                                        ) : user.friendship_status === 'pending' ? (
                                            <View style={styles.pendingBadgeSmall}>
                                                <Text style={styles.pendingBadgeSmallText}>En attente</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.addFriendButton}
                                                onPress={() => handleSendRequest(user.id)}
                                            >
                                                <UserPlus size={18} color={Colors.cta} />
                                            </TouchableOpacity>
                                        )}
                                    </GlassCard>
                                ))}
                            </View>
                        )}

                        {/* Pending Requests */}
                        {pendingRequests.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    {t('social.pendingRequestsTitle', { count: pendingRequests.length })}
                                </Text>
                                {pendingRequests.map(request => (
                                    <FriendRequestItem
                                        key={request.id}
                                        request={request}
                                        onAccept={() => respondToRequest(request.id, true)}
                                        onReject={() => respondToRequest(request.id, false)}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Friends List */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                {t('social.myFriends', { count: friends.length })}
                            </Text>
                            {friends.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Users size={48} color={Colors.muted} />
                                    <Text style={styles.emptyStateTitle}>
                                        Aucun ami pour le moment
                                    </Text>
                                    <Text style={styles.emptyStateSubtitle}>
                                        Recherche des utilisateurs pour les ajouter
                                    </Text>
                                </View>
                            ) : (
                                friends.map(friend => (
                                    <TouchableOpacity 
                                        key={friend.id} 
                                        onPress={() => handleOpenFriendModal(friend)}
                                        activeOpacity={0.7}
                                    >
                                    <GlassCard style={styles.friendItem}>
                                        <View style={styles.userAvatar}>
                                            <Text style={styles.avatarText}>
                                                {(friend.display_name || friend.username).charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>
                                                {friend.display_name || friend.username}
                                            </Text>
                                            <View style={styles.userStats}>
                                                <Flame size={12} color={Colors.warning} />
                                                <Text style={styles.userStatText}>
                                                    {friend.current_streak}j
                                                </Text>
                                                <Text style={styles.userStatText}>
                                                    • Lv.{friend.level}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.encourageButton}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                handleEncourage(
                                                    friend.id, 
                                                    friend.display_name || friend.username
                                                );
                                            }}
                                        >
                                            <Heart size={18} color={Colors.cta} />
                                        </TouchableOpacity>
                                    </GlassCard>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                )}

                {/* ENCOURAGEMENTS TAB */}
                {activeTab === 'encouragements' && (
                    <View style={styles.tabContent}>
                        {/* Unread */}
                        {unreadEncouragements.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    {t('social.unreadTitle', { count: unreadEncouragements.length })}
                                </Text>
                                {unreadEncouragements.map(enc => (
                                    <EncouragementItem
                                        key={enc.id}
                                        encouragement={enc}
                                        onMarkRead={() => markAsRead(enc.id)}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Recent */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>{t('social.recent')}</Text>
                            {recentEncouragements.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Heart size={48} color={Colors.muted} />
                                    <Text style={styles.emptyStateTitle}>
                                        {t('social.noEncouragements')}
                                    </Text>
                                    <Text style={styles.emptyStateSubtitle}>
                                        {t('social.noEncouragementsSubtitle')}
                                    </Text>
                                </View>
                            ) : (
                                recentEncouragements
                                    .filter(e => e.read_at)
                                    .map(enc => (
                                        <EncouragementItem
                                            key={enc.id}
                                            encouragement={enc}
                                            onMarkRead={() => {}}
                                        />
                                    ))
                            )}
                        </View>
                    </View>
                )}

                {/* Bottom spacing */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Friend Management Modal */}
            <Modal
                visible={showFriendModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowFriendModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View 
                        entering={FadeInDown.springify()}
                        style={styles.friendModal}
                    >
                        {selectedFriend && (
                            <>
                                <View style={styles.friendModalHeader}>
                                    <View style={styles.friendModalAvatar}>
                                        <Text style={styles.friendModalAvatarText}>
                                            {(selectedFriend.display_name || selectedFriend.username).charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.friendModalName}>
                                        {selectedFriend.display_name || selectedFriend.username}
                                    </Text>
                                    <Text style={styles.friendModalLevel}>Niveau {selectedFriend.level}</Text>
                                </View>

                                <View style={styles.friendModalStats}>
                                    <View style={styles.friendModalStat}>
                                        <Flame size={20} color={Colors.warning} />
                                        <Text style={styles.friendModalStatValue}>{selectedFriend.current_streak}j</Text>
                                        <Text style={styles.friendModalStatLabel}>Streak</Text>
                                    </View>
                                    <View style={styles.friendModalStatDivider} />
                                    <View style={styles.friendModalStat}>
                                        <Zap size={20} color={Colors.cta} />
                                        <Text style={styles.friendModalStatValue}>{selectedFriend.weekly_xp || 0}</Text>
                                        <Text style={styles.friendModalStatLabel}>XP semaine</Text>
                                    </View>
                                </View>

                                <View style={styles.friendModalActions}>
                                    <TouchableOpacity
                                        style={styles.friendModalActionBtn}
                                        onPress={() => {
                                            handleEncourage(
                                                selectedFriend.id,
                                                selectedFriend.display_name || selectedFriend.username
                                            );
                                            setShowFriendModal(false);
                                        }}
                                    >
                                        <Heart size={20} color={Colors.cta} />
                                        <Text style={styles.friendModalActionText}>Encourager</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.friendModalActionBtn, styles.friendModalActionDanger]}
                                        onPress={() => handleRemoveFriend(selectedFriend.id)}
                                    >
                                        <UserX size={20} color={Colors.error} />
                                        <Text style={[styles.friendModalActionText, { color: Colors.error }]}>
                                            Supprimer
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.friendModalCloseBtn}
                                    onPress={() => setShowFriendModal(false)}
                                >
                                    <Text style={styles.friendModalCloseText}>Fermer</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </Animated.View>
                </View>
            </Modal>

            {/* Block User Modal */}
            <Modal
                visible={showBlockModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowBlockModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View 
                        entering={FadeInDown.springify()}
                        style={styles.blockModal}
                    >
                        {selectedUserForBlock && (
                            <>
                                <View style={styles.blockModalHeader}>
                                    <UserX size={40} color={Colors.error} />
                                    <Text style={styles.blockModalTitle}>
                                        Bloquer {selectedUserForBlock.display_name || selectedUserForBlock.username}?
                                    </Text>
                                </View>

                                <Text style={styles.blockModalDescription}>
                                    Cette personne ne pourra plus te voir dans le classement et tu ne verras plus ses stats.
                                </Text>

                                <View style={styles.blockModalActions}>
                                    <TouchableOpacity
                                        style={styles.blockModalCancelBtn}
                                        onPress={() => setShowBlockModal(false)}
                                    >
                                        <Text style={styles.blockModalCancelText}>Annuler</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.blockModalConfirmBtn}
                                        onPress={() => handleBlockUser(selectedUserForBlock.id)}
                                    >
                                        <UserX size={18} color="#fff" />
                                        <Text style={styles.blockModalConfirmText}>Bloquer</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </Animated.View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// ============================================================================
// STYLES
// ============================================================================

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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    screenTitle: {
        fontSize: 32,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        letterSpacing: -0.5,
    },
    fossBadge: {
        backgroundColor: 'rgba(74, 222, 128, 0.2)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: 'rgba(74, 222, 128, 0.4)',
    },
    fossBadgeText: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.bold,
        color: '#4ade80',
        letterSpacing: 1,
    },
    profileButton: {
        padding: 4,
    },
    profileAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.cta,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileAvatarText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.bg,
    },

    // My Stats Card
    myStatsCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    myStatsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    myStatsName: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.cta,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    levelText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        color: Colors.bg,
    },
    myStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    myStat: {
        alignItems: 'center',
        flex: 1,
    },
    myStatValue: {
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    myStatLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    myStatDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    // Notification warning
    notificationWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    notificationWarningText: {
        flex: 1,
        fontSize: FontSize.sm,
        color: Colors.warning,
        fontWeight: FontWeight.medium,
    },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: 4,
        marginBottom: Spacing.lg,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    tabActive: {
        backgroundColor: Colors.overlay,
    },
    tabText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        fontWeight: FontWeight.medium,
    },
    tabTextActive: {
        color: Colors.text,
        fontWeight: FontWeight.semibold,
    },
    tabContent: {
        gap: Spacing.md,
    },

    // Leaderboard
    leaderboardToggle: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.card,
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: Colors.cta,
    },
    toggleButtonText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        fontWeight: FontWeight.semibold,
    },
    toggleButtonTextActive: {
        color: Colors.bg,
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.md,
    },
    leaderboardItemMe: {
        borderColor: Colors.cta,
        borderWidth: 1,
    },
    rankContainer: {
        width: 32,
        alignItems: 'center',
    },
    rankNumber: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.muted,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.teal,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    userStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    userStatText: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    userLevel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    xpContainer: {
        alignItems: 'center',
    },
    xpValue: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.cta,
    },
    xpLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    encourageButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blockButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.text,
        paddingVertical: 4,
    },
    searchResults: {
        gap: Spacing.sm,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.md,
    },
    addFriendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(74, 222, 128, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    friendBadgeText: {
        fontSize: FontSize.xs,
        color: '#4ade80',
        fontWeight: FontWeight.semibold,
    },
    pendingBadgeSmall: {
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    pendingBadgeSmallText: {
        fontSize: FontSize.xs,
        color: Colors.warning,
        fontWeight: FontWeight.semibold,
    },

    // Friend Request
    requestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.md,
    },
    requestText: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    requestActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    requestBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    acceptBtn: {
        backgroundColor: '#4ade80',
    },
    rejectBtn: {
        backgroundColor: Colors.error,
    },

    // Friends
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.md,
    },

    // Encouragements
    encouragementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        gap: Spacing.md,
    },
    encouragementEmoji: {
        fontSize: 32,
    },
    encouragementContent: {
        flex: 1,
    },
    encouragementSender: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    encouragementMessage: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        marginTop: 2,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.cta,
    },

    // Section
    section: {
        gap: Spacing.sm,
    },
    sectionTitle: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        color: Colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.xs,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        gap: Spacing.md,
    },
    emptyStateTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
    },

    // Pending Badge
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.cta,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        marginBottom: Spacing.md,
    },
    pendingBadgeText: {
        flex: 1,
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: '#fff',
    },

    // Auth Prompt
    authPrompt: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        gap: Spacing.md,
    },
    authTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
    },
    authSubtitle: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: Spacing.lg,
    },
    authButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.cta,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.md,
    },
    authButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },

    // FOSS Build Prompt
    fossIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(45, 212, 191, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    fossInfoBox: {
        backgroundColor: 'rgba(45, 212, 191, 0.1)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.md,
        marginHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(45, 212, 191, 0.2)',
    },
    fossInfoText: {
        fontSize: FontSize.sm,
        color: Colors.teal,
        textAlign: 'center',
        lineHeight: 20,
    },
    fossUpgradeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.teal,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.lg,
    },
    fossUpgradeButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },

    // Modal Overlay
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },

    // Loading container
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
    },
    loadingText: {
        fontSize: FontSize.md,
        color: Colors.muted,
    },

    // Friend Modal
    friendModal: {
        backgroundColor: Colors.cardSolid,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 350,
        alignItems: 'center',
    },
    friendModalHeader: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    friendModalAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.teal,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    friendModalAvatarText: {
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    friendModalName: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: 4,
    },
    friendModalLevel: {
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    friendModalStats: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
        gap: Spacing.xl,
    },
    friendModalStat: {
        alignItems: 'center',
        gap: 4,
    },
    friendModalStatValue: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    friendModalStatLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },
    friendModalStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: Colors.stroke,
    },
    friendModalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
        width: '100%',
    },
    friendModalActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
    },
    friendModalActionDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    friendModalActionText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.cta,
    },
    friendModalCloseBtn: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    friendModalCloseText: {
        fontSize: FontSize.md,
        color: Colors.muted,
        fontWeight: FontWeight.medium,
    },

    // Block Modal
    blockModal: {
        backgroundColor: Colors.cardSolid,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 350,
        alignItems: 'center',
    },
    blockModalHeader: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
        gap: Spacing.md,
    },
    blockModalTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
    },
    blockModalDescription: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing.xl,
    },
    blockModalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        width: '100%',
    },
    blockModalCancelBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.card,
        alignItems: 'center',
    },
    blockModalCancelText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.muted,
    },
    blockModalConfirmBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.error,
    },
    blockModalConfirmText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
});
