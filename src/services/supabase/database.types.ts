// ============================================================================
// SUPABASE DATABASE TYPES - Generated from schema
// ============================================================================

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    username: string;
                    display_name: string | null;
                    avatar_url: string | null;
                    bio: string | null;
                    weekly_workouts: number;
                    weekly_distance: number;
                    weekly_duration: number;
                    weekly_xp: number;
                    current_streak: number;
                    best_streak: number;
                    total_xp: number;
                    level: number;
                    is_public: boolean;
                    social_enabled: boolean;
                    push_token: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    username: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    bio?: string | null;
                    weekly_workouts?: number;
                    weekly_distance?: number;
                    weekly_duration?: number;
                    weekly_xp?: number;
                    current_streak?: number;
                    best_streak?: number;
                    total_xp?: number;
                    level?: number;
                    is_public?: boolean;
                    social_enabled?: boolean;
                    push_token?: string | null;
                };
                Update: {
                    username?: string;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    bio?: string | null;
                    weekly_workouts?: number;
                    weekly_distance?: number;
                    weekly_duration?: number;
                    weekly_xp?: number;
                    current_streak?: number;
                    best_streak?: number;
                    total_xp?: number;
                    level?: number;
                    is_public?: boolean;
                    social_enabled?: boolean;
                    push_token?: string | null;
                };
            };
            friendships: {
                Row: {
                    id: string;
                    requester_id: string;
                    addressee_id: string;
                    status: FriendshipStatus;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    requester_id: string;
                    addressee_id: string;
                    status?: FriendshipStatus;
                };
                Update: {
                    status?: FriendshipStatus;
                };
            };
            blocked_users: {
                Row: {
                    id: string;
                    blocker_id: string;
                    blocked_id: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    blocker_id: string;
                    blocked_id: string;
                };
                Update: {};
            };
            encouragements: {
                Row: {
                    id: string;
                    sender_id: string;
                    receiver_id: string;
                    message: string;
                    emoji: string;
                    read_at: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    sender_id: string;
                    receiver_id: string;
                    message?: string;
                    emoji?: string;
                };
                Update: {
                    read_at?: string | null;
                };
            };
        };
        Views: {
            weekly_leaderboard: {
                Row: {
                    id: string;
                    username: string;
                    display_name: string | null;
                    avatar_url: string | null;
                    weekly_workouts: number;
                    weekly_distance: number;
                    weekly_duration: number;
                    weekly_xp: number;
                    current_streak: number;
                    total_xp: number;
                    level: number;
                    rank: number;
                };
            };
        };
        Functions: {
            get_friends_leaderboard: {
                Args: { user_id: string };
                Returns: {
                    id: string;
                    username: string;
                    display_name: string | null;
                    avatar_url: string | null;
                    weekly_workouts: number;
                    weekly_distance: number;
                    weekly_duration: number;
                    weekly_xp: number;
                    current_streak: number;
                    total_xp: number;
                    level: number;
                    rank: number;
                }[];
            };
            search_users: {
                Args: { search_query: string; current_user_id: string };
                Returns: {
                    id: string;
                    username: string;
                    display_name: string | null;
                    avatar_url: string | null;
                    level: number;
                    friendship_status: FriendshipStatus | null;
                }[];
            };
            are_friends: {
                Args: { user1: string; user2: string };
                Returns: boolean;
            };
        };
    };
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Friendship = Database['public']['Tables']['friendships']['Row'];
export type FriendshipInsert = Database['public']['Tables']['friendships']['Insert'];

export type Encouragement = Database['public']['Tables']['encouragements']['Row'];
export type EncouragementInsert = Database['public']['Tables']['encouragements']['Insert'];

export type BlockedUser = Database['public']['Tables']['blocked_users']['Row'];
export type BlockedUserInsert = Database['public']['Tables']['blocked_users']['Insert'];

export type LeaderboardEntry = Database['public']['Views']['weekly_leaderboard']['Row'];
