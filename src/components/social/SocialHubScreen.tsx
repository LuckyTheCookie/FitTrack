import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Linking,
    Share,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Bell, Sparkles, UserCircle2, Users } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BuildConfig } from '../../config';
import { Colors, Spacing } from '../../constants';
import { CustomAlertModal } from '../ui';
import type { AlertButton, AlertType } from '../ui';
import { useAppStore, useSocialStore } from '../../stores';
import { isSocialAvailable } from '../../services/supabase';
import {
    createSocialChallenge,
    deleteSocialChallenge,
    deleteMySharedWorkoutEvent,
    getActiveSocialChallenges,
    getSocialFeed,
    leaveSocialChallenge,
    shareWorkoutToFeed,
    toggleSocialFeedReaction,
    type SocialChallengeGoalType,
    type SocialChallengeProgress,
} from '../../services/supabase/social';
import { SocialHubSheets } from './hub/SocialHubSheets';
import { SocialHubTabsContent } from './hub/SocialHubTabsContent';
import { TopTabs } from './hub/TopTabs';
import type { FeedViewItem, SearchResult, ShareableWorkoutItem, SocialTopTabId } from './hub/types';
import { buildShareableWorkouts, mapFeedEvent } from './hub/socialHubMappers';
import {
    getAddFriendLabels,
    getChallengeDetailsLabels,
    getChallengesTabLabels,
    getCreateChallengeLabels,
    getFriendsTabLabels,
    getHomeTabLabels,
    getLeaderboardTabLabels,
    getShareWorkoutLabels,
    getTopTabLabels,
} from './hub/socialHubLabels';
import {
    mergeLocalChallengeProgress,
    useFriendOptionsForChallenge,
    useFriendsLeaderboardRows,
    useGlobalLeaderboardRows,
    useSelectedChallengeContributions,
    useVisibleChallenges,
} from './hub/socialHubDerived';
import { styles } from './SocialHubScreen.styles';
import { SocialStatusScreen } from './SocialStatusScreen';
interface HubDialogState {
    visible: boolean;
    title: string;
    message: string;
    type: AlertType;
    buttons?: AlertButton[];
    showCloseButton?: boolean;
}
const HOME_HYDRATION_CACHE_TTL_MS = 45 * 1000;
let homeChallengesCache: SocialChallengeProgress[] = [];
let homeFeedCache: FeedViewItem[] = [];
let homeHydrationCacheAt = 0;
let homeCacheProfileId: string | null = null;
function invalidateHomeHydrationCache(): void {
    homeChallengesCache = [];
    homeFeedCache = [];
    homeHydrationCacheAt = 0;
}
function invalidateHomeFeedCache(): void {
    homeFeedCache = [];
    homeHydrationCacheAt = 0;
}
function logSocialHubError(context: string, error: unknown): void {
    if (__DEV__) {
        console.warn(`[SocialHub] ${context}`, error);
    }
}
export default function SocialHubScreen() {
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const challengeCardWidth = Math.max(260, width - Spacing.lg * 2);
    const latestReleaseUrl = `${BuildConfig.githubReleasesUrl}/latest`;
    const challengeSheetRef = useRef<TrueSheet>(null);
    const shareWorkoutSheetRef = useRef<TrueSheet>(null);
    const challengeDetailsSheetRef = useRef<TrueSheet>(null);
    const addFriendSheetRef = useRef<TrueSheet>(null);
    const [activeTopTab, setActiveTopTab] = useState<SocialTopTabId>('home');
    const [refreshing, setRefreshing] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isHydratingHub, setIsHydratingHub] = useState(false);
    const [isHydratingFriendsTab, setIsHydratingFriendsTab] = useState(false);
    const [isHydratingLeaderboardTab, setIsHydratingLeaderboardTab] = useState(false);
    const [isGlobalLeaderboardActive, setIsGlobalLeaderboardActive] = useState(false);
    const [isLoadingGlobalLeaderboard, setIsLoadingGlobalLeaderboard] = useState(false);
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [dismissedChallengeIds, setDismissedChallengeIds] = useState<Set<string>>(new Set());
    const [isSendingLikeForId, setIsSendingLikeForId] = useState<string | null>(null);
    const [isSharingWorkoutId, setIsSharingWorkoutId] = useState<string | null>(null);
    const [selectedChallengeForDetails, setSelectedChallengeForDetails] = useState<SocialChallengeProgress | null>(null);
    const [activeChallenges, setActiveChallenges] = useState<SocialChallengeProgress[]>(() => (
        profile?.id && homeCacheProfileId === profile.id ? homeChallengesCache : []
    ));
    const [challengesError, setChallengesError] = useState<string | null>(null);
    const [feedItems, setFeedItems] = useState<FeedViewItem[]>(() => (
        profile?.id && homeCacheProfileId === profile.id ? homeFeedCache : []
    ));
    const [feedError, setFeedError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const searchRequestRef = useRef(0);
    const [challengeTitle, setChallengeTitle] = useState('');
    const [challengeGoalType, setChallengeGoalType] = useState<SocialChallengeGoalType>('workouts');
    const [challengeGoalTarget, setChallengeGoalTarget] = useState('10');
    const [challengeDurationDays, setChallengeDurationDays] = useState('7');
    const [selectedFriendIdsForChallenge, setSelectedFriendIdsForChallenge] = useState<string[]>([]);
    const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
    const [isDeletingChallengeId, setIsDeletingChallengeId] = useState<string | null>(null);
    const [isDeletingFeedItemId, setIsDeletingFeedItemId] = useState<string | null>(null);
    const [dialogState, setDialogState] = useState<HubDialogState>({
        visible: false,
        title: '',
        message: '',
        type: 'info',
        buttons: [{ text: t('common.ok') }],
        showCloseButton: true,
    });
    const [fossModalVisible, setFossModalVisible] = useState(BuildConfig.isFoss);
    const { entries } = useAppStore();
    const {
        isAuthenticated,
        socialEnabled,
        profile,
        friends,
        pendingRequests,
        globalLeaderboard,
        globalLeaderboardError,
        friendsLeaderboard,
        friendsLeaderboardError,
        checkAuth,
        fetchFriends,
        fetchPendingRequests,
        respondToRequest,
        removeFriend,
        fetchGlobalLeaderboard,
        fetchFriendsLeaderboard,
        sendFriendRequest,
        searchUsers,
    } = useSocialStore();
    const hasLoadedFriendsTabRef = useRef(false);
    const hasLoadedLeaderboardTabRef = useRef(false);
    const closeDialog = useCallback(() => {
        setDialogState(prev => ({ ...prev, visible: false }));
    }, []);
    const openDialog = useCallback((options: Omit<HubDialogState, 'visible'>) => {
        setDialogState({
            visible: true,
            ...options,
        });
    }, []);
    const showSuccessDialog = useCallback((message: string) => {
        openDialog({
            title: t('common.success'),
            message,
            type: 'success',
            buttons: [{ text: t('common.ok') }],
            showCloseButton: true,
        });
    }, [openDialog, t]);
    const showErrorDialog = useCallback((message: string) => {
        openDialog({
            title: t('common.error'),
            message,
            type: 'error',
            buttons: [{ text: t('common.ok') }],
            showCloseButton: true,
        });
    }, [openDialog, t]);
    const showWarningDialog = useCallback((message: string) => {
        openDialog({
            title: t('common.warning'),
            message,
            type: 'warning',
            buttons: [{ text: t('common.ok') }],
            showCloseButton: true,
        });
    }, [openDialog, t]);
    const showConfirmDialog = useCallback((
        title: string,
        message: string,
        confirmLabel: string,
        onConfirm: () => Promise<void> | void
    ) => {
        openDialog({
            title,
            message,
            type: 'warning',
            showCloseButton: false,
            buttons: [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: confirmLabel,
                    style: 'destructive',
                    onPress: () => {
                        void onConfirm();
                    },
                },
            ],
        });
    }, [openDialog, t]);
    const openLatestRelease = useCallback(() => {
        void Linking.openURL(latestReleaseUrl);
    }, [latestReleaseUrl]);
    const shareableWorkouts = useMemo(() => {
        return buildShareableWorkouts(entries, t);
    }, [entries, t]);
    const selectedChallengeContributions = useSelectedChallengeContributions(entries, selectedChallengeForDetails, t);
    useEffect(() => {
        if (activeChallenges.length === 0) return;
        const nextChallenges = mergeLocalChallengeProgress(activeChallenges, entries);
        if (nextChallenges !== activeChallenges) {
            setActiveChallenges(nextChallenges);
            homeChallengesCache = nextChallenges;
        }
    }, [activeChallenges, entries]);
    useEffect(() => {
        if (!selectedChallengeForDetails) return;
        const nextChallenge = activeChallenges.find((item) => item.challenge.id === selectedChallengeForDetails.challenge.id);
        if (!nextChallenge) {
            setSelectedChallengeForDetails(null);
            return;
        }
        if (nextChallenge !== selectedChallengeForDetails) {
            setSelectedChallengeForDetails(nextChallenge);
        }
    }, [activeChallenges, selectedChallengeForDetails]);
    const friendsLeaderboardRows = useFriendsLeaderboardRows(friendsLeaderboard, friends, profile);
    const friendOptionsForChallenge = useFriendOptionsForChallenge(friends);
    const globalLeaderboardRows = useGlobalLeaderboardRows(globalLeaderboard);
    const handleDismissChallenge = useCallback((challengeId: string) => {
        setDismissedChallengeIds((prev) => {
            const next = new Set(prev);
            next.add(challengeId);
            return next;
        });
    }, []);
    const visibleChallenges = useVisibleChallenges(activeChallenges, dismissedChallengeIds);
    const loadChallenges = useCallback(async () => {
        try {
            const challenges = await getActiveSocialChallenges();
            const mergedChallenges = mergeLocalChallengeProgress(challenges, entries);
            setActiveChallenges(mergedChallenges);
            homeChallengesCache = mergedChallenges;
            setChallengeIndex(0);
            setChallengesError(null);
        } catch (error) {
            logSocialHubError('Failed to load active challenges', error);
            if (homeChallengesCache.length === 0) {
                setActiveChallenges([]);
            }
            setChallengesError(t('socialHub.errors.challengesLoad'));
        }
    }, [entries, t]);
    const loadFeed = useCallback(async () => {
        try {
            const events = await getSocialFeed(10);
            const currentUserId = useSocialStore.getState().profile?.id;
            const mapped = events.map(event => mapFeedEvent(event, currentUserId, t));
            setFeedItems(mapped);
            homeFeedCache = mapped;
            setFeedError(null);
        } catch (error) {
            logSocialHubError('Failed to load social feed', error);
            if (homeFeedCache.length === 0) {
                setFeedItems([]);
            }
            setFeedError(t('socialHub.errors.feedLoad'));
        }
    }, [t]);
    const loadHomeData = useCallback(async (options?: { silent?: boolean }) => {
        const silent = options?.silent ?? false;
        if (!silent) {
            setIsHydratingHub(true);
        }
        try {
            const friendsTask = fetchFriends();
            const challengesTask = loadChallenges();
            const feedTask = loadFeed();
            await Promise.allSettled([friendsTask, challengesTask, feedTask]);
            homeCacheProfileId = profile?.id ?? null;
            homeHydrationCacheAt = Date.now();
        } finally {
            if (!silent) {
                setIsHydratingHub(false);
            }
        }
    }, [fetchFriends, loadChallenges, loadFeed, profile?.id]);
    const loadFriendsTabData = useCallback(async () => {
        setIsHydratingFriendsTab(true);
        try {
            const friendsTask = fetchFriends();
            const pendingTask = fetchPendingRequests();
            await Promise.allSettled([friendsTask, pendingTask]);
        } finally {
            setIsHydratingFriendsTab(false);
        }
    }, [fetchFriends, fetchPendingRequests]);
    const loadFriendsLeaderboardData = useCallback(async () => {
        setIsHydratingLeaderboardTab(true);
        try {
            await fetchFriendsLeaderboard();
        } finally {
            setIsHydratingLeaderboardTab(false);
        }
    }, [fetchFriendsLeaderboard]);
    const loadGlobalLeaderboardData = useCallback(async () => {
        setIsLoadingGlobalLeaderboard(true);
        try {
            await fetchGlobalLeaderboard();
        } finally {
            setIsLoadingGlobalLeaderboard(false);
        }
    }, [fetchGlobalLeaderboard]);
    useEffect(() => {
        let cancelled = false;
        const initialize = async () => {
            if (isAuthenticated && profile) {
                setIsInitialLoading(false);
                void checkAuth();
                return;
            }
            setIsInitialLoading(true);
            await checkAuth();
            if (!cancelled) {
                setIsInitialLoading(false);
            }
        };
        initialize();
        return () => {
            cancelled = true;
        };
    }, [checkAuth, isAuthenticated, profile]);
    useEffect(() => {
        const profileId = profile?.id ?? null;
        if (homeCacheProfileId !== profileId) {
            homeCacheProfileId = profileId;
            homeChallengesCache = [];
            homeFeedCache = [];
            homeHydrationCacheAt = 0;
            setActiveChallenges([]);
            setFeedItems([]);
        }
    }, [profile?.id]);
    useEffect(() => {
        if (isInitialLoading) return;
        if (!isAuthenticated || !socialEnabled) return;
        const hasFreshCache =
            homeHydrationCacheAt > 0 &&
            Date.now() - homeHydrationCacheAt < HOME_HYDRATION_CACHE_TTL_MS;
        if (hasFreshCache) {
            void loadHomeData({ silent: true });
            return;
        }
        loadHomeData();
    }, [isInitialLoading, isAuthenticated, socialEnabled, loadHomeData]);
    useEffect(() => {
        if (!isAuthenticated || !socialEnabled) return;
        if (activeTopTab === 'friends' && !hasLoadedFriendsTabRef.current) {
            hasLoadedFriendsTabRef.current = true;
            loadFriendsTabData();
            return;
        }
        if (activeTopTab === 'leaderboard' && !hasLoadedLeaderboardTabRef.current) {
            hasLoadedLeaderboardTabRef.current = true;
            loadFriendsLeaderboardData();
        }
    }, [activeTopTab, isAuthenticated, socialEnabled, loadFriendsTabData, loadFriendsLeaderboardData]);
    useFocusEffect(
        useCallback(() => {
            if (!isAuthenticated || !socialEnabled) {
                return;
            }
            void loadHomeData({ silent: true });
        }, [isAuthenticated, socialEnabled, loadHomeData])
    );
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            searchRequestRef.current += 1;
            setSearchResults([]);
            setSearchError(null);
            setIsSearching(false);
            return;
        }
        const requestId = ++searchRequestRef.current;
        setIsSearching(true);
        setSearchError(null);
        const timeoutId = setTimeout(async () => {
            try {
                const results = await searchUsers(searchQuery.trim());
                if (requestId !== searchRequestRef.current) return;
                setSearchResults(results as SearchResult[]);
            } catch (error) {
                logSocialHubError('User search failed', error);
                if (requestId !== searchRequestRef.current) return;
                setSearchResults([]);
                setSearchError(t('socialHub.errors.searchUnavailable'));
            } finally {
                if (requestId === searchRequestRef.current) {
                    setIsSearching(false);
                }
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchUsers, t]);
    const handlePressTopTab = useCallback((tab: SocialTopTabId) => {
        setActiveTopTab(tab);
        if (tab !== 'friends') {
            setSearchQuery('');
            setSearchResults([]);
            setSearchError(null);
        }
    }, []);
    const openAddFriendSheet = useCallback(() => {
        setSearchQuery('');
        setSearchResults([]);
        setSearchError(null);
        addFriendSheetRef.current?.present();
    }, []);
    const onRefresh = useCallback(async () => {
        if (!isAuthenticated || !socialEnabled) return;
        setRefreshing(true);
        try {
            if (activeTopTab === 'home') {
                await loadHomeData();
                return;
            }
            if (activeTopTab === 'challenges') {
                await loadChallenges();
                return;
            }
            if (activeTopTab === 'friends') {
                await loadFriendsTabData();
                return;
            }
            await loadFriendsLeaderboardData();
            if (isGlobalLeaderboardActive) {
                await loadGlobalLeaderboardData();
            }
        } finally {
            setRefreshing(false);
        }
    }, [
        isAuthenticated,
        socialEnabled,
        activeTopTab,
        loadHomeData,
        loadChallenges,
        loadFriendsTabData,
        loadFriendsLeaderboardData,
        isGlobalLeaderboardActive,
        loadGlobalLeaderboardData,
    ]);
    const handleSendRequest = useCallback(async (userId: string) => {
        try {
            await sendFriendRequest(userId);
            invalidateHomeHydrationCache();
            setSearchResults(prev => prev.map(result => (
                result.id === userId ? { ...result, friendship_status: 'pending' } : result
            )));
            showSuccessDialog(t('social.requestSent'));
        } catch (error) {
            logSocialHubError('Failed to send friend request', error);
            showErrorDialog(t('socialHub.errors.sendFriendRequest'));
        }
    }, [sendFriendRequest, showErrorDialog, showSuccessDialog, t]);
    const handleInviteFriend = useCallback(async () => {
        try {
            const username = profile?.username || 'spix';
            await Share.share({
                title: t('socialHub.invite.shareTitle'),
                message: t('socialHub.invite.shareMessage', { username }),
            });
        } catch (error) {
            logSocialHubError('Failed to share invite', error);
            showErrorDialog(t('socialHub.errors.shareInvite'));
        }
    }, [profile?.username, showErrorDialog, t]);
    const handleRespondToRequest = useCallback(async (friendshipId: string, accept: boolean) => {
        try {
            await respondToRequest(friendshipId, accept);
            invalidateHomeHydrationCache();
            await loadFriendsTabData();
        } catch (error) {
            logSocialHubError('Failed to respond to friend request', error);
            showErrorDialog(t('socialHub.errors.sendFriendRequest'));
        }
    }, [respondToRequest, loadFriendsTabData, showErrorDialog, t]);
    const handleRemoveFriend = useCallback(async (friendshipId: string, friendName: string) => {
        showConfirmDialog(
            t('social.removeFriendConfirmTitle'),
            t('social.removeFriendConfirmMessage'),
            t('common.delete'),
            async () => {
                try {
                    await removeFriend(friendshipId);
                    invalidateHomeHydrationCache();
                    await Promise.allSettled([loadFriendsTabData(), loadFriendsLeaderboardData()]);
                    showSuccessDialog(`${t('social.friendRemoved')} · ${friendName}`);
                } catch (error) {
                    logSocialHubError('Failed to remove friend', error);
                    showErrorDialog(t('socialHub.errors.sendFriendRequest'));
                }
            }
        );
    }, [
        removeFriend,
        loadFriendsTabData,
        loadFriendsLeaderboardData,
        showConfirmDialog,
        showSuccessDialog,
        showErrorDialog,
        t,
    ]);
    const handleShowFriendsLeaderboard = useCallback(() => {
        setIsGlobalLeaderboardActive(false);
    }, []);
    const handleShowGlobalLeaderboard = useCallback(async () => {
        setIsGlobalLeaderboardActive(true);
        if (globalLeaderboardRows.length === 0) {
            await loadGlobalLeaderboardData();
        }
    }, [globalLeaderboardRows.length, loadGlobalLeaderboardData]);
    const handleToggleFriendForChallenge = useCallback((friendId: string) => {
        setSelectedFriendIdsForChallenge((previous) => (
            previous.includes(friendId)
                ? previous.filter(id => id !== friendId)
                : [...previous, friendId]
        ));
    }, []);
    const openChallengeSheet = useCallback(async () => {
        if (friends.length === 0) {
            try {
                await fetchFriends();
            } catch (error) {
                // Keep opening the sheet even if preloading friends fails.
                if (__DEV__) {
                    console.warn('[SocialHub] Failed to preload friends before opening challenge sheet', error);
                }
            }
        }
        challengeSheetRef.current?.present();
    }, [fetchFriends, friends.length]);
    const openChallengeDetails = useCallback((challenge: SocialChallengeProgress) => {
        setSelectedChallengeForDetails(challenge);
        challengeDetailsSheetRef.current?.present();
    }, []);
    const handleSendLike = useCallback(async (item: FeedViewItem) => {
        if (!item.isWorkoutShare || !item.eventId || !item.canLike) return;
        setIsSendingLikeForId(item.id);
        try {
            await toggleSocialFeedReaction(item.eventId);
            invalidateHomeFeedCache();
            await loadFeed();
        } catch (error) {
            logSocialHubError('Failed to toggle workout like', error);
            showErrorDialog(t('socialHub.errors.sendLike'));
        } finally {
            setIsSendingLikeForId(null);
        }
    }, [loadFeed, showErrorDialog, t]);
    const handleDeleteSharedWorkout = useCallback((item: FeedViewItem) => {
        if (!item.canDelete || !item.eventId) return;
        showConfirmDialog(
            t('socialHub.feed.deleteConfirmTitle'),
            t('socialHub.feed.deleteConfirmMessage'),
            t('common.delete'),
            async () => {
                setIsDeletingFeedItemId(item.id);
                try {
                    await deleteMySharedWorkoutEvent(item.eventId as string);
                    invalidateHomeFeedCache();
                    await loadFeed();
                } catch (error) {
                    logSocialHubError('Failed to delete shared workout', error);
                    showErrorDialog(t('socialHub.feed.deleteError'));
                } finally {
                    setIsDeletingFeedItemId(null);
                }
            }
        );
    }, [loadFeed, showConfirmDialog, showErrorDialog, t]);
    const handleShareWorkout = useCallback(async (workout: ShareableWorkoutItem) => {
        setIsSharingWorkoutId(workout.id);
        try {
            await shareWorkoutToFeed({
                entryId: workout.entryId,
                entryType: workout.entryType,
                title: workout.title,
                summary: workout.summary,
                createdAtIso: workout.createdAt,
                metadata: workout.metadata,
            });
            invalidateHomeFeedCache();
            shareWorkoutSheetRef.current?.dismiss();
            await loadFeed();
            showSuccessDialog(t('socialHub.shareWorkout.sharedSuccess'));
        } catch (error) {
            logSocialHubError('Failed to share workout to feed', error);
            showErrorDialog(t('socialHub.errors.shareWorkout'));
        } finally {
            setIsSharingWorkoutId(null);
        }
    }, [loadFeed, showErrorDialog, showSuccessDialog, t]);
    const handleCreateChallenge = useCallback(async () => {
        const title = challengeTitle.trim();
        const target = Number(challengeGoalTarget);
        const durationDays = Number(challengeDurationDays);
        if (!title) {
            showWarningDialog(t('socialHub.challenge.validation.titleRequired'));
            return;
        }
        if (!Number.isFinite(target) || target <= 0) {
            showWarningDialog(t('socialHub.challenge.validation.targetInvalid'));
            return;
        }
        if (!Number.isFinite(durationDays) || durationDays <= 0 || durationDays > 90) {
            showWarningDialog(t('socialHub.challenge.validation.durationInvalid'));
            return;
        }
        if (selectedFriendIdsForChallenge.length === 0) {
            showWarningDialog(t('socialHub.challenge.validation.friendsRequired'));
            return;
        }
        setIsCreatingChallenge(true);
        try {
            await createSocialChallenge({
                title,
                goalType: challengeGoalType,
                goalTarget: target,
                durationDays,
                invitedFriendIds: selectedFriendIdsForChallenge,
            });
            invalidateHomeHydrationCache();
            challengeSheetRef.current?.dismiss();
            setChallengeTitle('');
            setChallengeGoalType('workouts');
            setChallengeGoalTarget('10');
            setChallengeDurationDays('7');
            setSelectedFriendIdsForChallenge([]);
            await Promise.all([loadChallenges(), loadFeed(), loadFriendsTabData()]);
            showSuccessDialog(t('socialHub.challenge.createSuccess'));
        } catch (error) {
            logSocialHubError('Failed to create social challenge', error);
            showErrorDialog(t('socialHub.errors.createChallenge'));
        } finally {
            setIsCreatingChallenge(false);
        }
    }, [
        challengeDurationDays,
        challengeGoalTarget,
        challengeGoalType,
        challengeTitle,
        selectedFriendIdsForChallenge,
        loadChallenges,
        loadFeed,
        loadFriendsTabData,
        showWarningDialog,
        showSuccessDialog,
        showErrorDialog,
        t,
    ]);
    const handleDeleteChallenge = useCallback((item: SocialChallengeProgress) => {
        const challengeId = item.challenge.id;
        const isOwner = item.challenge.creator_id === profile?.id;
        showConfirmDialog(
            isOwner
                ? t('socialHub.challenge.deleteConfirmTitle')
                : t('socialHub.challenge.leaveConfirmTitle'),
            isOwner
                ? t('socialHub.challenge.deleteConfirmMessage')
                : t('socialHub.challenge.leaveConfirmMessage'),
            isOwner ? t('socialHub.challenge.deleteAction') : t('socialHub.challenge.leaveAction'),
            async () => {
                setIsDeletingChallengeId(challengeId);
                try {
                    if (isOwner) {
                        await deleteSocialChallenge(challengeId);
                    } else {
                        await leaveSocialChallenge(challengeId);
                    }
                    invalidateHomeHydrationCache();
                    await Promise.all([loadChallenges(), loadFeed()]);
                    showSuccessDialog(
                        isOwner
                            ? t('socialHub.challenge.deleteSuccess')
                            : t('socialHub.challenge.leaveSuccess')
                    );
                } catch (error) {
                    logSocialHubError('Failed to delete/leave challenge', error);
                    showErrorDialog(
                        isOwner
                            ? t('socialHub.challenge.deleteError')
                            : t('socialHub.challenge.leaveError')
                    );
                } finally {
                    setIsDeletingChallengeId(null);
                }
            }
        );
    }, [loadChallenges, loadFeed, profile?.id, showConfirmDialog, showSuccessDialog, showErrorDialog, t]);
    const topTabLabels = useMemo(() => getTopTabLabels(t), [t]);
    const homeTabLabels = useMemo(() => getHomeTabLabels(t), [t]);
    const challengesTabLabels = useMemo(() => getChallengesTabLabels(t), [t]);
    const friendsTabLabels = useMemo(() => getFriendsTabLabels(t, isHydratingFriendsTab), [t, isHydratingFriendsTab]);
    const leaderboardTabLabels = useMemo(() => getLeaderboardTabLabels(t, isHydratingLeaderboardTab), [t, isHydratingLeaderboardTab]);
    const createChallengeLabels = useMemo(() => getCreateChallengeLabels(t), [t]);
    const shareWorkoutLabels = useMemo(() => getShareWorkoutLabels(t), [t]);
    const addFriendLabels = useMemo(() => getAddFriendLabels(t), [t]);
    const challengeDetailsLabels = useMemo(() => getChallengeDetailsLabels(t), [t]);
    if (BuildConfig.isFoss) {
        return (
            <SocialStatusScreen
                icon={<Users size={56} color={Colors.muted} />}
                title={t('social.fossTitle')}
                subtitle={t('social.fossInfo')}
                footer={(
                    <CustomAlertModal
                        visible={fossModalVisible}
                        title={t('social.fossTitle')}
                        message={t('social.fossInfo')}
                        type="warning"
                        buttons={[
                            { text: t('common.ok'), onPress: () => setFossModalVisible(false) },
                            { text: t('social.fossUpgrade'), onPress: openLatestRelease },
                        ]}
                        showCloseButton={true}
                        onClose={() => setFossModalVisible(false)}
                    />
                )}
            />
        );
    }
    if (!isSocialAvailable()) {
        return (
            <SocialStatusScreen
                icon={<Users size={56} color={Colors.muted} />}
                title={t('social.notConfiguredTitle')}
                subtitle={t('social.notConfiguredSubtitle')}
            />
        );
    }
    if (isInitialLoading) {
        return (
            <SocialStatusScreen
                icon={<Sparkles size={48} color={Colors.cta} />}
                title={t('common.loading')}
                subtitle=""
            />
        );
    }
    if (!isAuthenticated) {
        return (
            <SocialStatusScreen
                icon={<Users size={56} color={Colors.muted} />}
                title={t('social.authTitle')}
                subtitle={t('social.authSubtitle')}
                buttonLabel={t('profile.signIn')}
                onPressButton={() => router.push('/auth' as never)}
            />
        );
    }
    if (!socialEnabled) {
        return (
            <SocialStatusScreen
                icon={<Users size={56} color={Colors.muted} />}
                title={t('social.disabledTitle')}
                subtitle={t('social.disabledSubtitle')}
                buttonLabel={t('settings.social')}
                onPressButton={() => router.push('/settings/social' as never)}
            />
        );
    }
    return (
        <GestureHandlerRootView style={styles.container}>
            <LinearGradient
                colors={[Colors.overlayViolet12, Colors.transparent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.topGlow}
            />
            <LinearGradient
                colors={[Colors.overlayTeal10, Colors.transparent]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.bottomGlow}
            />
            <SafeAreaView style={styles.container} edges={['top']}>
                <Animated.View entering={FadeIn.delay(100)} style={styles.topbarWrap}>
                    <View style={styles.topbar}>
                        <View style={styles.titleBlock}>
                            <View style={styles.eyebrowPill}>
                                <Sparkles size={12} color={Colors.cta} />
                                <Text style={styles.eyebrowText}>{t('tabs.social')}</Text>
                            </View>
                            <Text style={styles.screenTitle}>{t('social.title')}</Text>
                            <Text style={styles.screenSubtitle}>{t('socialHub.feed.sectionTitle')}</Text>
                        </View>
                        <View style={styles.topbarActions}>
                            <TouchableOpacity style={styles.notifButton} onPress={() => router.push('/settings/notifications' as never)}>
                                <Bell size={18} color={Colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.notifButton} onPress={() => router.push('/profile' as never)}>
                                <UserCircle2 size={18} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TopTabs
                        activeTab={activeTopTab}
                        onPressTab={handlePressTopTab}
                        labels={topTabLabels}
                    />
                </Animated.View>
                <SocialHubTabsContent
                    activeTopTab={activeTopTab}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    isHydratingHub={isHydratingHub}
                    visibleChallenges={visibleChallenges}
                    challengeCardWidth={challengeCardWidth}
                    challengeIndex={challengeIndex}
                    setChallengeIndex={setChallengeIndex}
                    onViewChallengeDetails={openChallengeDetails}
                    onDismissChallenge={handleDismissChallenge}
                    challengesError={challengesError}
                    feedItems={feedItems}
                    isSendingLikeForId={isSendingLikeForId}
                    isDeletingFeedItemId={isDeletingFeedItemId}
                    onSendLike={handleSendLike}
                    onDeleteFeedItem={handleDeleteSharedWorkout}
                    feedError={feedError}
                    onPressShareWorkout={() => shareWorkoutSheetRef.current?.present()}
                    onPressCreateChallenge={openChallengeSheet}
                    homeTabLabels={homeTabLabels}
                    activeChallenges={activeChallenges}
                    profileId={profile?.id}
                    isDeletingChallengeId={isDeletingChallengeId}
                    onDeleteChallenge={handleDeleteChallenge}
                    challengesTabLabels={challengesTabLabels}
                    friends={friends}
                    pendingRequests={pendingRequests}
                    onPressAddFriend={openAddFriendSheet}
                    onInvite={handleInviteFriend}
                    onRespondToRequest={handleRespondToRequest}
                    onRemoveFriend={handleRemoveFriend}
                    friendsTabLabels={friendsTabLabels}
                    isGlobalLeaderboardActive={isGlobalLeaderboardActive}
                    onShowFriendsLeaderboard={handleShowFriendsLeaderboard}
                    onShowGlobalLeaderboard={handleShowGlobalLeaderboard}
                    globalLeaderboardRows={globalLeaderboardRows}
                    friendsLeaderboardRows={friendsLeaderboardRows}
                    isLoadingGlobalLeaderboard={isLoadingGlobalLeaderboard}
                    leaderboardError={isGlobalLeaderboardActive
                        ? (globalLeaderboardError ? t(`social.errorLeaderboard${globalLeaderboardError === 'network' ? 'Network' : 'Server'}`) : null)
                        : (friendsLeaderboardError ? t(`social.errorLeaderboard${friendsLeaderboardError === 'network' ? 'Network' : 'Server'}`) : null)}
                    leaderboardTabLabels={leaderboardTabLabels}
                />
                <SocialHubSheets
                    challengeSheetRef={challengeSheetRef}
                    shareWorkoutSheetRef={shareWorkoutSheetRef}
                    challengeDetailsSheetRef={challengeDetailsSheetRef}
                    addFriendSheetRef={addFriendSheetRef}
                    challengeTitle={challengeTitle}
                    onChangeChallengeTitle={setChallengeTitle}
                    challengeGoalType={challengeGoalType}
                    onChangeChallengeGoalType={setChallengeGoalType}
                    challengeGoalTarget={challengeGoalTarget}
                    onChangeChallengeGoalTarget={setChallengeGoalTarget}
                    challengeDurationDays={challengeDurationDays}
                    onChangeChallengeDurationDays={setChallengeDurationDays}
                    friendOptionsForChallenge={friendOptionsForChallenge}
                    selectedFriendIdsForChallenge={selectedFriendIdsForChallenge}
                    onToggleFriendForChallenge={handleToggleFriendForChallenge}
                    isCreatingChallenge={isCreatingChallenge}
                    onCreateChallenge={handleCreateChallenge}
                    createChallengeLabels={createChallengeLabels}
                    shareableWorkouts={shareableWorkouts}
                    isSharingWorkoutId={isSharingWorkoutId}
                    onShareWorkout={handleShareWorkout}
                    shareWorkoutLabels={shareWorkoutLabels}
                    searchQuery={searchQuery}
                    onChangeSearchQuery={setSearchQuery}
                    isSearching={isSearching}
                    searchError={searchError}
                    searchResults={searchResults}
                    onSendRequest={handleSendRequest}
                    addFriendLabels={addFriendLabels}
                    selectedChallengeForDetails={selectedChallengeForDetails}
                    selectedChallengeContributions={selectedChallengeContributions}
                    profileId={profile?.id}
                    onDeleteChallenge={handleDeleteChallenge}
                    onOpenChallengesTab={() => setActiveTopTab('challenges')}
                    challengeDetailsLabels={challengeDetailsLabels}
                />
            </SafeAreaView>
            <CustomAlertModal
                visible={dialogState.visible}
                title={dialogState.title}
                message={dialogState.message}
                type={dialogState.type}
                buttons={dialogState.buttons}
                showCloseButton={dialogState.showCloseButton}
                onClose={closeDialog}
            />
        </GestureHandlerRootView>
    );
}
