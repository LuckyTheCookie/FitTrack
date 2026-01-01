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
    Send,
    Crown,
    Medal,
    Flame,
    Zap,
    ChevronRight,
    LogIn,
    UserCircle,
    Settings,
    Upload,
    Bell,
    CheckCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { GlassCard } from '../src/components/ui';
import { useAppStore, useGamificationStore, useSocialStore } from '../src/stores';
import { isSocialAvailable } from '../src/services/supabase';
import * as NotificationService from '../src/services/notifications';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
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
    const tabs = [
        { id: 'leaderboard' as const, label: 'Classement', icon: Trophy },
        { id: 'friends' as const, label: 'Amis', icon: Users },
        { id: 'encouragements' as const, label: 'Encours', icon: Heart },
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
}: { 
    entry: LeaderboardEntry;
    rank: number;
    isMe?: boolean;
    onEncourage?: () => void;
}) {
    const getRankIcon = () => {
        if (rank === 1) return <Crown size={20} color="#fbbf24" fill="#fbbf24" />;
        if (rank === 2) return <Medal size={20} color="#94a3b8" />;
        if (rank === 3) return <Medal size={20} color="#cd7f32" />;
        return <Text style={styles.rankNumber}>{rank}</Text>;
    };

    return (
        <Animated.View entering={FadeInDown.delay(rank * 50).springify()}>
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
                {!isMe && onEncourage && (
                    <TouchableOpacity 
                        style={styles.encourageButton}
                        onPress={onEncourage}
                    >
                        <Heart size={18} color={Colors.cta} />
                    </TouchableOpacity>
                )}
            </GlassCard>
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
                <Text style={styles.requestText}>Veut être ton ami</Text>
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
    return (
        <View style={styles.authPrompt}>
            <UserCircle size={64} color={Colors.muted} />
            <Text style={styles.authTitle}>Connecte-toi pour accéder aux fonctions sociales</Text>
            <Text style={styles.authSubtitle}>
                Compare tes performances avec tes amis, envoie des encouragements et grimpe le classement !
            </Text>
            <TouchableOpacity style={styles.authButton} onPress={onSignIn}>
                <LogIn size={20} color="#fff" />
                <Text style={styles.authButtonText}>Se connecter</Text>
            </TouchableOpacity>
        </View>
    );
}

// Not configured prompt
function NotConfiguredPrompt() {
    return (
        <View style={styles.authPrompt}>
            <Settings size={64} color={Colors.muted} />
            <Text style={styles.authTitle}>Fonctions sociales non configurées</Text>
            <Text style={styles.authSubtitle}>
                Ce projet est open-source. Pour activer les fonctions sociales, configurez Supabase dans le fichier .env
            </Text>
        </View>
    );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function SocialScreen() {
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'friends' | 'encouragements'>('leaderboard');
    const [leaderboardType, setLeaderboardType] = useState<'global' | 'friends'>('global');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [notificationStatus, setNotificationStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

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
        sendEncouragement,
        markAsRead,
        searchUsers,
        checkAuth,
        syncStats,
        initializeNotifications,
        setupRealtimeSubscriptions,
        savePushToken,
    } = useSocialStore();

    // Check auth and notifications on mount
    useEffect(() => {
        const initialize = async () => {
            // Check auth state
            await checkAuth();
            
            // Check notification permissions
            const token = await NotificationService.registerForPushNotifications();
            if (token) {
                setNotificationStatus('granted');
                // Save token to profile if authenticated
                if (isAuthenticated && savePushToken) {
                    await savePushToken(token);
                }
            } else {
                setNotificationStatus('denied');
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

    // Initial fetch
    useEffect(() => {
        if (isAuthenticated && socialEnabled) {
            fetchGlobalLeaderboard();
            fetchFriendsLeaderboard();
            fetchFriends();
            fetchPendingRequests();
            fetchEncouragements();
        }
    }, [isAuthenticated, socialEnabled]);

    // Calculate local stats for sync
    const localStats = useMemo(() => {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
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
            .reduce((sum, e) => sum + ((e as any).distance || 0), 0);
        const weeklyDuration = weeklyEntries
            .reduce((sum, e) => sum + ((e as any).duration || 0), 0);

        const streakData = getStreak();

        return {
            totalWorkouts: sportEntries.length,
            weeklyWorkouts,
            weeklyDistance,
            weeklyDuration,
            xp,
            level,
            streak: streakData.current,
            bestStreak: streakData.best,
        };
    }, [entries, xp, level, getStreak]);

    // Sync local data to Supabase
    const handleSyncData = useCallback(async () => {
        setIsSyncing(true);
        try {
            await syncStats({
                workouts: localStats.weeklyWorkouts,
                distance: localStats.weeklyDistance,
                duration: localStats.weeklyDuration,
                xp: xp, // Weekly XP approximation
                streak: localStats.streak,
                bestStreak: localStats.bestStreak,
                totalXp: xp,
                level,
            });
            Alert.alert('✅ Synchronisé !', 'Tes données locales ont été envoyées au classement.');
            setShowSyncModal(false);
            // Refresh leaderboard
            await fetchGlobalLeaderboard();
            await fetchFriendsLeaderboard();
        } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Impossible de synchroniser');
        } finally {
            setIsSyncing(false);
        }
    }, [localStats, xp, level, syncStats]);

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
            Alert.alert('✅ Demande envoyée', 'Ta demande d\'ami a été envoyée !');
            setSearchResults(prev => 
                prev.map(u => u.id === userId ? { ...u, friendship_status: 'pending' } : u)
            );
        } catch (error: any) {
            Alert.alert('Erreur', error.message);
        }
    }, [sendFriendRequest]);

    // Current leaderboard
    const currentLeaderboard = leaderboardType === 'global' ? globalLeaderboard : friendsLeaderboard;

    // Not configured
    if (!isSocialAvailable()) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    <Text style={styles.screenTitle}>Social</Text>
                    <NotConfiguredPrompt />
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    <Text style={styles.screenTitle}>Social</Text>
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
                    <Text style={styles.screenTitle}>Social</Text>
                    <View style={styles.authPrompt}>
                        <Users size={64} color={Colors.muted} />
                        <Text style={styles.authTitle}>Fonctions sociales désactivées</Text>
                        <Text style={styles.authSubtitle}>
                            Tu peux réactiver les fonctions sociales dans les paramètres.
                        </Text>
                        <TouchableOpacity 
                            style={styles.authButton} 
                            onPress={() => router.push('/settings')}
                        >
                            <Settings size={20} color="#fff" />
                            <Text style={styles.authButtonText}>Paramètres</Text>
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
                    <Text style={styles.screenTitle}>Social</Text>
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
                                    <Text style={styles.myStatValue}>{profile.weekly_xp}</Text>
                                    <Text style={styles.myStatLabel}>XP semaine</Text>
                                </View>
                                <View style={styles.myStatDivider} />
                                <View style={styles.myStat}>
                                    <Text style={styles.myStatValue}>{profile.weekly_workouts}</Text>
                                    <Text style={styles.myStatLabel}>Séances</Text>
                                </View>
                                <View style={styles.myStatDivider} />
                                <View style={styles.myStat}>
                                    <View style={styles.streakRow}>
                                        <Flame size={16} color={Colors.warning} />
                                        <Text style={styles.myStatValue}>{profile.current_streak}</Text>
                                    </View>
                                    <Text style={styles.myStatLabel}>Streak</Text>
                                </View>
                            </View>
                            {/* Sync button */}
                            <TouchableOpacity 
                                style={styles.syncButton}
                                onPress={() => setShowSyncModal(true)}
                            >
                                <Upload size={16} color={Colors.cta} />
                                <Text style={styles.syncButtonText}>Synchroniser</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* Notification Status */}
                {notificationStatus === 'denied' && (
                    <Animated.View entering={FadeInDown.delay(120).springify()}>
                        <TouchableOpacity 
                            style={styles.notificationWarning}
                            onPress={async () => {
                                const token = await NotificationService.registerForPushNotifications();
                                if (token) {
                                    setNotificationStatus('granted');
                                    if (savePushToken) await savePushToken(token);
                                }
                            }}
                        >
                            <Bell size={18} color={Colors.warning} />
                            <Text style={styles.notificationWarningText}>
                                Active les notifications pour recevoir les encouragements
                            </Text>
                            <ChevronRight size={18} color={Colors.warning} />
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
                            {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente
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
                                    🌍 Global
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
                                    👥 Amis
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Leaderboard list */}
                        {currentLeaderboard.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Trophy size={48} color={Colors.muted} />
                                <Text style={styles.emptyStateTitle}>
                                    {leaderboardType === 'friends' 
                                        ? 'Ajoute des amis pour voir le classement'
                                        : 'Aucun classement cette semaine'
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
                                    onEncourage={
                                        entry.id !== profile?.id 
                                            ? () => handleEncourage(entry.id, entry.display_name || entry.username)
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
                                placeholder="Rechercher un utilisateur..."
                                placeholderTextColor={Colors.muted}
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />
                            {isSearching && <ActivityIndicator size="small" color={Colors.cta} />}
                        </View>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <View style={styles.searchResults}>
                                <Text style={styles.sectionTitle}>Résultats</Text>
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
                                    Demandes en attente ({pendingRequests.length})
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
                                Mes amis ({friends.length})
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
                                    <GlassCard key={friend.id} style={styles.friendItem}>
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
                                            onPress={() => handleEncourage(
                                                friend.id, 
                                                friend.display_name || friend.username
                                            )}
                                        >
                                            <Heart size={18} color={Colors.cta} />
                                        </TouchableOpacity>
                                    </GlassCard>
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
                                    Non lus ({unreadEncouragements.length})
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
                            <Text style={styles.sectionTitle}>Récents</Text>
                            {recentEncouragements.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Heart size={48} color={Colors.muted} />
                                    <Text style={styles.emptyStateTitle}>
                                        Aucun encouragement
                                    </Text>
                                    <Text style={styles.emptyStateSubtitle}>
                                        Tes amis peuvent t'envoyer des encouragements !
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

            {/* Sync Modal */}
            <Modal
                visible={showSyncModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSyncModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View 
                        entering={FadeInDown.springify()}
                        style={styles.syncModal}
                    >
                        <View style={styles.syncModalHeader}>
                            <Upload size={32} color={Colors.cta} />
                            <Text style={styles.syncModalTitle}>Synchroniser tes données</Text>
                        </View>
                        
                        <Text style={styles.syncModalDescription}>
                            Tes données locales seront envoyées au classement pour que tes amis puissent voir ta progression.
                        </Text>

                        <GlassCard style={styles.syncStatsCard}>
                            <View style={styles.syncStatRow}>
                                <Text style={styles.syncStatLabel}>Séances cette semaine</Text>
                                <Text style={styles.syncStatValue}>{localStats.weeklyWorkouts}</Text>
                            </View>
                            <View style={styles.syncStatRow}>
                                <Text style={styles.syncStatLabel}>Distance (km)</Text>
                                <Text style={styles.syncStatValue}>{localStats.weeklyDistance.toFixed(1)}</Text>
                            </View>
                            <View style={styles.syncStatRow}>
                                <Text style={styles.syncStatLabel}>XP total</Text>
                                <Text style={styles.syncStatValue}>{xp}</Text>
                            </View>
                            <View style={styles.syncStatRow}>
                                <Text style={styles.syncStatLabel}>Niveau</Text>
                                <Text style={styles.syncStatValue}>{level}</Text>
                            </View>
                            <View style={styles.syncStatRow}>
                                <Text style={styles.syncStatLabel}>Streak actuel</Text>
                                <Text style={styles.syncStatValue}>{localStats.streak} jours</Text>
                            </View>
                        </GlassCard>

                        <View style={styles.syncModalActions}>
                            <TouchableOpacity 
                                style={styles.syncModalCancelBtn}
                                onPress={() => setShowSyncModal(false)}
                            >
                                <Text style={styles.syncModalCancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.syncModalConfirmBtn}
                                onPress={handleSyncData}
                                disabled={isSyncing}
                            >
                                {isSyncing ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <CheckCircle size={18} color="#fff" />
                                        <Text style={styles.syncModalConfirmText}>Synchroniser</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
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
    screenTitle: {
        fontSize: 32,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        letterSpacing: -0.5,
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

    // Sync button
    syncButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(215, 150, 134, 0.2)',
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        marginTop: Spacing.md,
    },
    syncButtonText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.cta,
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

    // Sync Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    syncModal: {
        backgroundColor: Colors.cardSolid,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 400,
    },
    syncModalHeader: {
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    syncModalTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
    },
    syncModalDescription: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing.lg,
    },
    syncStatsCard: {
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    syncStatRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    syncStatLabel: {
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    syncStatValue: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    syncModalActions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    syncModalCancelBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.card,
    },
    syncModalCancelText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.muted,
    },
    syncModalConfirmBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.cta,
    },
    syncModalConfirmText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
});
