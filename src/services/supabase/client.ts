// ============================================================================
// SUPABASE CLIENT - Configuration et initialisation
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './database.types';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create client only if configured
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
    ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    })
    : null;

// Helper to get non-null client (throws if not configured)
export function getSupabaseClient(): SupabaseClient<Database> {
    if (!supabase) {
        throw new Error('Social features not configured');
    }
    return supabase;
}

// Helper to check if social features are available
export const isSocialAvailable = () => isSupabaseConfigured && supabase !== null;

// Types exports
export type { Database } from './database.types';
