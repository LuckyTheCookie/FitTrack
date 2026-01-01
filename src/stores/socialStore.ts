// ============================================================================
// SOCIAL STORE - Zustand store for social features
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from '../storage';
import type { Profile, LeaderboardEntry, Encouragement, Friendship } from '../services/supabase';
import * as SocialService from '../services/supabase/social';
import { isSocialAvailable } from '../services/supabase';
import * as Notifications from '../services/notifications';

// ============================================================================
// TYPES
// ============================================================================

interface SocialState {
    // Auth state
    isAuthenticated: boolean;
    isLoading: boolean;
    profile: Profile | null;
    
    // Social features enabled
    socialEnabled: boolean;
    
    // Leaderboard
    globalLeaderboard: LeaderboardEntry[];
    friendsLeaderboard: LeaderboardEntry[];
    
    // Friends
    friends: Profile[];
    pendingRequests: (Friendship & { requester: Profile })[];
    
    // Encouragements
    unreadEncouragements: (Encouragement & { sender: Profile })[];
    recentEncouragements: (Encouragement & { sender: Profile })[];
    
    // Actions - Auth
    checkAuth: () => Promise<void>;
    signUp: (email: string, password: string, username: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    
    // Actions - Profile
    updateProfile: (updates: Partial<Profile>) => Promise<void>;
    updateUsername: (username: string) => Promise<void>;
    
    // Actions - Social toggle
    setSocialEnabled: (enabled: boolean) => void;
    
    // Actions - Sync
    syncStats: (stats: {
        workouts: number;
        distance: number;
        duration: number;
        xp: number;
        streak: number;
        bestStreak: number;
        totalXp: number;
        level: number;
    }) => Promise<void>;
    
    // Actions - Leaderboard
    fetchGlobalLeaderboard: () => Promise<void>;
    fetchFriendsLeaderboard: () => Promise<void>;
    
    // Actions - Friends
    fetchFriends: () => Promise<void>;
    fetchPendingRequests: () => Promise<void>;
    sendFriendRequest: (userId: string) => Promise<void>;
    respondToRequest: (friendshipId: string, accept: boolean) => Promise<void>;
    removeFriend: (friendshipId: string) => Promise<void>;
    searchUsers: (query: string) => Promise<any[]>;
    
    // Actions - Encouragements
    fetchEncouragements: () => Promise<void>;
    sendEncouragement: (userId: string, message?: string) => Promise<void>;
    markAsRead: (encouragementId: string) => Promise<void>;
    
    // Actions - Notifications
    initializeNotifications: () => Promise<void>;
    setupRealtimeSubscriptions: () => void;
    cleanupSubscriptions: () => void;
    savePushToken: (token: string) => Promise<void>;
}

// ============================================================================
// STORE
// ============================================================================

export const useSocialStore = create<SocialState>()(
    persist(
        (set, get) => ({
            // Initial state
            isAuthenticated: false,
            isLoading: false,
            profile: null,
            socialEnabled: true,
            globalLeaderboard: [],
            friendsLeaderboard: [],
            friends: [],
            pendingRequests: [],
            unreadEncouragements: [],
            recentEncouragements: [],

            // ========================================
            // AUTH
            // ========================================

            checkAuth: async () => {
                if (!isSocialAvailable()) return;
                
                set({ isLoading: true });
                try {
                    const profile = await SocialService.getMyProfile();
                    set({ 
                        isAuthenticated: !!profile,
                        profile,
                        isLoading: false,
                    });
                } catch {
                    set({ isAuthenticated: false, profile: null, isLoading: false });
                }
            },

            signUp: async (email, password, username) => {
                if (!isSocialAvailable()) throw new Error('Social features not configured');
                
                set({ isLoading: true });
                try {
                    await SocialService.signUp(email, password, username);
                    const profile = await SocialService.getMyProfile();
                    set({ isAuthenticated: true, profile, isLoading: false });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            signIn: async (email, password) => {
                if (!isSocialAvailable()) throw new Error('Social features not configured');
                
                set({ isLoading: true });
                try {
                    await SocialService.signIn(email, password);
                    const profile = await SocialService.getMyProfile();
                    set({ isAuthenticated: true, profile, isLoading: false });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            signOut: async () => {
                await SocialService.signOut();
                set({ 
                    isAuthenticated: false, 
                    profile: null,
                    globalLeaderboard: [],
                    friendsLeaderboard: [],
                    friends: [],
                    pendingRequests: [],
                    unreadEncouragements: [],
                    recentEncouragements: [],
                });
            },

            // ========================================
            // PROFILE
            // ========================================

            updateProfile: async (updates) => {
                const profile = await SocialService.updateProfile(updates);
                if (profile) {
                    set({ profile });
                }
            },

            updateUsername: async (username) => {
                await SocialService.updateUsername(username);
                const profile = await SocialService.getMyProfile();
                set({ profile });
            },

            // ========================================
            // SOCIAL TOGGLE
            // ========================================

            setSocialEnabled: (enabled) => {
                set({ socialEnabled: enabled });
                // Also update profile if authenticated
                if (get().isAuthenticated) {
                    SocialService.updateProfile({ social_enabled: enabled });
                }
            },

            // ========================================
            // SYNC
            // ========================================

            syncStats: async (stats) => {
                if (!get().isAuthenticated || !get().socialEnabled) return;
                await SocialService.syncWeeklyStats(stats);
            },

            // ========================================
            // LEADERBOARD
            // ========================================

            fetchGlobalLeaderboard: async () => {
                if (!get().isAuthenticated || !get().socialEnabled) return;
                const data = await SocialService.getGlobalLeaderboard();
                set({ globalLeaderboard: data });
            },

            fetchFriendsLeaderboard: async () => {
                if (!get().isAuthenticated || !get().socialEnabled) return;
                const data = await SocialService.getFriendsLeaderboard();
                set({ friendsLeaderboard: data });
            },

            // ========================================
            // FRIENDS
            // ========================================

            fetchFriends: async () => {
                if (!get().isAuthenticated || !get().socialEnabled) return;
                const data = await SocialService.getFriends();
                set({ friends: data });
            },

            fetchPendingRequests: async () => {
                if (!get().isAuthenticated || !get().socialEnabled) return;
                const data = await SocialService.getPendingRequests();
                set({ pendingRequests: data });
            },

            sendFriendRequest: async (userId) => {
                await SocialService.sendFriendRequest(userId);
            },

            respondToRequest: async (friendshipId, accept) => {
                await SocialService.respondToFriendRequest(friendshipId, accept);
                // Refresh lists
                get().fetchPendingRequests();
                if (accept) get().fetchFriends();
            },

            removeFriend: async (friendshipId) => {
                await SocialService.removeFriend(friendshipId);
                get().fetchFriends();
            },

            searchUsers: async (query) => {
                if (!get().isAuthenticated) return [];
                return SocialService.searchUsers(query);
            },

            // ========================================
            // ENCOURAGEMENTS
            // ========================================

            fetchEncouragements: async () => {
                if (!get().isAuthenticated || !get().socialEnabled) return;
                const [unread, recent] = await Promise.all([
                    SocialService.getUnreadEncouragements(),
                    SocialService.getRecentEncouragements(),
                ]);
                set({ unreadEncouragements: unread, recentEncouragements: recent });
            },

            sendEncouragement: async (userId, message) => {
                await SocialService.sendEncouragement(userId, message);
            },

            markAsRead: async (encouragementId) => {
                await SocialService.markEncouragementAsRead(encouragementId);
                set(state => ({
                    unreadEncouragements: state.unreadEncouragements.filter(e => e.id !== encouragementId),
                }));
            },

            // ========================================
            // NOTIFICATIONS
            // ========================================

            initializeNotifications: async () => {
                try {
                    const token = await Notifications.registerForPushNotifications();
                    if (token) {
                        console.log('Push token:', token);
                        // Optionally save token to backend for remote push
                    }
                } catch (error) {
                    console.error('Failed to register for notifications:', error);
                }
            },

            setupRealtimeSubscriptions: () => {
                if (!get().isAuthenticated || !get().socialEnabled) return;

                const profile = get().profile;
                if (!profile) return;

                // Subscribe to encouragements
                SocialService.subscribeToEncouragements(profile.id, async (encouragement) => {
                    // Add to unread list
                    set(state => ({
                        unreadEncouragements: [encouragement as any, ...state.unreadEncouragements],
                    }));

                    // Show notification
                    const sender = (encouragement as any).sender;
                    if (sender) {
                        await Notifications.showEncouragementNotification(
                            sender.display_name || sender.username,
                            encouragement.message || 'Continue comme ça ! 💪',
                            encouragement.emoji
                        );
                    }
                });

                // Subscribe to friend requests
                SocialService.subscribeToFriendRequests(profile.id, async (friendship) => {
                    // Refresh pending requests
                    get().fetchPendingRequests();

                    // Show notification
                    const requester = (friendship as any).requester;
                    if (requester) {
                        await Notifications.showFriendRequestNotification(
                            requester.display_name || requester.username
                        );
                    }
                });
            },

            cleanupSubscriptions: () => {
                SocialService.unsubscribeAll();
            },

            savePushToken: async (token) => {
                if (!get().isAuthenticated) return;
                try {
                    await SocialService.savePushToken(token);
                } catch (error) {
                    console.error('Failed to save push token:', error);
                }
            },
        }),
        {
            name: 'fittrack-social-storage',
            storage: createJSONStorage(() => zustandStorage),
            partialize: (state) => ({
                socialEnabled: state.socialEnabled,
                // Don't persist auth state - check on app start
            }),
        }
    )
);
