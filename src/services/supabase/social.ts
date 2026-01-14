// ============================================================================
// SOCIAL SERVICE - Friends, Leaderboard, Encouragements
// ============================================================================

import { supabase, getSupabaseClient } from './client';
import type { 
    Profile, 
    ProfileUpdate, 
    Friendship, 
    Encouragement, 
    LeaderboardEntry,
    BlockedUser,
} from './database.types';
import { serviceLogger, errorLogger } from '../../utils/logger';
import { MAX_LEADERBOARD_RESULTS } from '../../constants/values';

// Supabase URL for Edge Functions
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// ============================================================================
// AUTH & PROFILE
// ============================================================================

export async function signUp(email: string, password: string, username: string) {
    const client = getSupabaseClient();
    
    // Check username availability
    const { data: existing } = await (client as any)
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();
    
    if (existing) {
        throw new Error('Ce nom d\'utilisateur est déjà pris');
    }

    const { data: authData, error: authError } = await client.auth.signUp({
        email,
        password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Erreur lors de la création du compte');

    // Create profile
    const { error: profileError } = await (client as any)
        .from('profiles')
        .insert({
            id: authData.user.id,
            username: username.toLowerCase(),
            display_name: username,
        });

    if (profileError) throw profileError;

    return authData;
}

export async function signIn(email: string, password: string) {
    const client = getSupabaseClient();
    
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
}

export async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
}

export async function getCurrentUser() {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
    if (!supabase) return null;
    
    const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) return null;
    return data as Profile;
}

export async function getMyProfile(): Promise<Profile | null> {
    const user = await getCurrentUser();
    if (!user) return null;
    return getProfile(user.id);
}

export async function updateProfile(updates: ProfileUpdate): Promise<Profile | null> {
    if (!supabase) return null;
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await (supabase as any)
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

    if (error) throw error;
    return data as Profile;
}

export async function updateUsername(newUsername: string): Promise<void> {
    const client = getSupabaseClient();
    
    // Check availability
    const { data: existing } = await (client as any)
        .from('profiles')
        .select('id')
        .eq('username', newUsername.toLowerCase())
        .single();
    
    if (existing) {
        throw new Error('Ce nom d\'utilisateur est déjà pris');
    }

    await updateProfile({ username: newUsername.toLowerCase(), display_name: newUsername });
}

export async function savePushToken(token: string): Promise<void> {
    if (!supabase) return;
    const user = await getCurrentUser();
    if (!user) return;

    await (supabase as any)
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);
}

// ============================================================================
// RGPD - DELETE ALL USER DATA
// ============================================================================

/**
 * Supprime complètement le compte utilisateur (données + auth) via Edge Function
 * Conformité RGPD - suppression irréversible
 */
export async function deleteAllUserData(): Promise<void> {
    const client = getSupabaseClient();
    const { data: { session } } = await client.auth.getSession();
    
    if (!session?.access_token) {
        throw new Error('Not authenticated');
    }

    // Appeler l'Edge Function qui a accès à service_role
    const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/delete-account`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': SUPABASE_ANON_KEY || '',
                'Content-Type': 'application/json',
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
    }

    // Déconnecter localement (le token est maintenant invalide)
    await client.auth.signOut();
}

/**
 * Met à jour la visibilité dans le classement global
 */
export async function updateLeaderboardVisibility(isPublic: boolean): Promise<void> {
    if (!supabase) return;
    const user = await getCurrentUser();
    if (!user) return;

    await (supabase as any)
        .from('profiles')
        .update({ is_public: isPublic })
        .eq('id', user.id);
}

// ============================================================================
// SYNC STATS
// ============================================================================

export async function syncWeeklyStats(stats: {
    workouts: number;
    distance: number;
    duration: number;
    xp: number;
    streak: number;
    bestStreak: number;
    totalXp: number;
    level: number;
}) {
    if (!supabase) return;
    const user = await getCurrentUser();
    if (!user) return;

    await (supabase as any)
        .from('profiles')
        .update({
            weekly_workouts: stats.workouts,
            weekly_distance: stats.distance,
            weekly_duration: stats.duration,
            weekly_xp: stats.xp,
            current_streak: stats.streak,
            best_streak: stats.bestStreak,
            total_xp: stats.totalXp,
            level: stats.level,
        })
        .eq('id', user.id);
}

// ============================================================================
// LEADERBOARD
// ============================================================================

export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!supabase) return [];
    const user = await getCurrentUser();
    
    const { data, error } = await (supabase as any)
        .from('weekly_leaderboard')
        .select('*')
        .limit(MAX_LEADERBOARD_RESULTS);

    if (error) {
        errorLogger.error('Error fetching global leaderboard:', error);
        return [];
    }
    
    // If not authenticated, return all
    if (!user) return (data || []) as LeaderboardEntry[];
    
    // Filter out blocked users (but keep current user in the list)
    const blockedIds = await getBlockedUserIds();
    return ((data || []) as LeaderboardEntry[]).filter(
        entry => !blockedIds.includes(entry.id)
    );
}

export async function getFriendsLeaderboard(): Promise<LeaderboardEntry[]> {
    if (!supabase) return [];
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
        .rpc('get_friends_leaderboard', { user_id: user.id });

    if (error) return [];
    return (data || []) as LeaderboardEntry[];
}

// ============================================================================
// FRIENDS
// ============================================================================

export async function searchUsers(query: string) {
    if (!supabase || query.length < 2) return [];
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
        .rpc('search_users', { 
            search_query: query, 
            current_user_id: user.id 
        });

    if (error) return [];
    return data || [];
}

export async function sendFriendRequest(addresseeId: string) {
    const client = getSupabaseClient();
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await (client as any)
        .from('friendships')
        .insert({
            requester_id: user.id,
            addressee_id: addresseeId,
        });

    if (error) throw error;
    
    // Call edge function to send push notification
    await sendPushNotification(addresseeId, 'friend_request');
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
    const client = getSupabaseClient();

    const { error } = await (client as any)
        .from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', friendshipId);

    if (error) throw error;
}

export async function removeFriend(friendshipId: string) {
    const client = getSupabaseClient();

    const { error } = await (client as any)
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

    if (error) throw error;
}

export async function getPendingRequests(): Promise<(Friendship & { requester: Profile })[]> {
    if (!supabase) return [];
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
        .from('friendships')
        .select(`
            *,
            requester:profiles!friendships_requester_id_fkey(*)
        `)
        .eq('addressee_id', user.id)
        .eq('status', 'pending');

    if (error) return [];
    return (data || []) as (Friendship & { requester: Profile })[];
}

export async function getFriends(): Promise<Profile[]> {
    if (!supabase) return [];
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
        .from('friendships')
        .select(`
            requester:profiles!friendships_requester_id_fkey(*),
            addressee:profiles!friendships_addressee_id_fkey(*)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

    if (error) return [];
    
    // Extract friend profiles
    return ((data || []) as any[]).map((f: any) => 
        f.requester.id === user.id ? f.addressee : f.requester
    ) as Profile[];
}

// ============================================================================
// ENCOURAGEMENTS
// ============================================================================

const ENCOURAGEMENT_MESSAGES = [
    { emoji: '🔥', message: 'Tu gères ! Continue comme ça !' },
    { emoji: '💪', message: 'Force et honneur !' },
    { emoji: '⚡', message: 'Tu es inarrêtable !' },
    { emoji: '🚀', message: 'Direction les étoiles !' },
    { emoji: '👏', message: 'Bravo pour ta motivation !' },
    { emoji: '🏆', message: 'Tu es un champion !' },
    { emoji: '✨', message: 'Continue, tu brilles !' },
    { emoji: '🎯', message: 'Objectif en vue !' },
];

export async function sendEncouragement(receiverId: string, customMessage?: string) {
    const client = getSupabaseClient();
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const random = ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];

    const { error } = await (client as any)
        .from('encouragements')
        .insert({
            sender_id: user.id,
            receiver_id: receiverId,
            message: customMessage || random.message,
            emoji: random.emoji,
        });

    if (error) throw error;
    
    // Call edge function to send push notification
    await sendPushNotification(receiverId, 'encouragement', {
        message: customMessage || random.message,
        emoji: random.emoji,
    });
}

export async function getUnreadEncouragements(): Promise<(Encouragement & { sender: Profile })[]> {
    if (!supabase) return [];
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
        .from('encouragements')
        .select(`
            *,
            sender:profiles!encouragements_sender_id_fkey(*)
        `)
        .eq('receiver_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []) as (Encouragement & { sender: Profile })[];
}

export async function markEncouragementAsRead(encouragementId: string) {
    if (!supabase) return;

    await (supabase as any)
        .from('encouragements')
        .update({ read_at: new Date().toISOString() })
        .eq('id', encouragementId);
}

export async function getRecentEncouragements(limit = 10): Promise<(Encouragement & { sender: Profile })[]> {
    if (!supabase) return [];
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
        .from('encouragements')
        .select(`
            *,
            sender:profiles!encouragements_sender_id_fkey(*)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return [];
    return (data || []) as (Encouragement & { sender: Profile })[];
}

// ============================================================================
// PUSH NOTIFICATIONS via Edge Function
// ============================================================================

async function sendPushNotification(
    receiverId: string, 
    type: 'friend_request' | 'encouragement',
    data?: { message?: string; emoji?: string }
) {
    if (!supabase) return;
    
    const user = await getCurrentUser();
    if (!user) return;
    
    // Get sender profile for the notification title
    const senderProfile = await getProfile(user.id);
    const senderName = senderProfile?.display_name || senderProfile?.username || 'Quelqu\'un';
    
    let title: string;
    let body: string;
    
    if (type === 'friend_request') {
        title = '👋 Nouvelle demande d\'ami';
        body = `${senderName} veut être ton ami !`;
    } else {
        title = `${data?.emoji || '💪'} ${senderName} t'encourage !`;
        body = data?.message || 'Continue comme ça !';
    }
    
    try {
        await supabase.functions.invoke('send-push-notification', {
            body: {
                receiver_id: receiverId,
                title,
                body,
                data: { type, sender_id: user.id },
            },
        });
    } catch (error) {
        // Fail silently - notifications are optional
        console.log('Push notification failed:', error);
    }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

// Store active subscriptions for cleanup
const activeSubscriptions: (() => void)[] = [];

export function subscribeToEncouragements(
    userId: string,
    callback: (encouragement: Encouragement) => void
) {
    if (!supabase) return () => {};

    const client = supabase;
    const subscription = client
        .channel(`encouragements:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'encouragements',
                filter: `receiver_id=eq.${userId}`,
            },
            async (payload) => {
                // Fetch the complete encouragement with sender info
                const { data } = await (client as any)
                    .from('encouragements')
                    .select(`
                        *,
                        sender:profiles!encouragements_sender_id_fkey(id, username, display_name)
                    `)
                    .eq('id', (payload.new as any).id)
                    .single();
                
                if (data) {
                    callback(data as Encouragement);
                }
            }
        )
        .subscribe();

    const cleanup = () => subscription.unsubscribe();
    activeSubscriptions.push(cleanup);
    return cleanup;
}

export function subscribeToFriendRequests(
    userId: string,
    callback: (friendship: Friendship) => void
) {
    if (!supabase) return () => {};

    const client = supabase;
    const subscription = client
        .channel(`friendships:${userId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'friendships',
                filter: `addressee_id=eq.${userId}`,
            },
            async (payload) => {
                // Fetch the complete friendship with requester info
                const { data } = await (client as any)
                    .from('friendships')
                    .select(`
                        *,
                        requester:profiles!friendships_requester_id_fkey(id, username, display_name)
                    `)
                    .eq('id', (payload.new as any).id)
                    .single();
                
                if (data) {
                    callback(data as Friendship);
                }
            }
        )
        .subscribe();

    const cleanup = () => subscription.unsubscribe();
    activeSubscriptions.push(cleanup);
    return cleanup;
}

export function unsubscribeAll() {
    activeSubscriptions.forEach(cleanup => cleanup());
    activeSubscriptions.length = 0;
}

// ============================================================================
// BLOCK USERS
// ============================================================================

/**
 * Block a user - prevents all interactions (friend requests, encouragements, visibility in leaderboards)
 */
export async function blockUser(blockedUserId: string): Promise<void> {
    const client = getSupabaseClient();
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Insert blocked_users record
    const { error } = await (client as any)
        .from('blocked_users')
        .insert({
            blocker_id: user.id,
            blocked_id: blockedUserId,
        });

    if (error) throw error;

    // Also remove any existing friendship
    await (client as any)
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${blockedUserId}),and(requester_id.eq.${blockedUserId},addressee_id.eq.${user.id})`);
}

/**
 * Unblock a user
 */
export async function unblockUser(blockedUserId: string): Promise<void> {
    const client = getSupabaseClient();
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await (client as any)
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

    if (error) throw error;
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(): Promise<Profile[]> {
    if (!supabase) return [];
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
        .from('blocked_users')
        .select(`
            blocked:profiles!blocked_users_blocked_id_fkey(*)
        `)
        .eq('blocker_id', user.id);

    if (error) return [];
    return ((data || []) as any[]).map((item: any) => item.blocked) as Profile[];
}

/**
 * Get IDs of blocked users (for filtering)
 */
export async function getBlockedUserIds(): Promise<string[]> {
    if (!supabase) return [];
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await (supabase as any)
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);

    if (error) return [];
    return ((data || []) as any[]).map((item: any) => item.blocked_id);
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
    if (!supabase) return false;
    const user = await getCurrentUser();
    if (!user) return false;

    const { data, error } = await (supabase as any)
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .single();

    return !error && !!data;
}
