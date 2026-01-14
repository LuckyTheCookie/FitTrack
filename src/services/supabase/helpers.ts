// ============================================================================
// SUPABASE TYPED HELPERS - Type-safe database operations
// ============================================================================

import type { SupabaseClient, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js';
import type { Database } from './database.types';

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;

// Get the Row type for a table
type TableRow<T extends TableName> = Tables[T]['Row'];

// Get the Insert type for a table
type TableInsert<T extends TableName> = Tables[T]['Insert'];

// Get the Update type for a table
type TableUpdate<T extends TableName> = Tables[T]['Update'];

/**
 * Type-safe select from a table
 */
export function selectFrom<T extends TableName>(
    client: SupabaseClient<Database>,
    table: T
) {
    return client.from(table).select('*');
}

/**
 * Type-safe select with specific columns
 */
export function selectColumns<T extends TableName>(
    client: SupabaseClient<Database>,
    table: T,
    columns: string
) {
    return client.from(table).select(columns);
}

/**
 * Type-safe insert into a table
 */
export function insertInto<T extends TableName>(
    client: SupabaseClient<Database>,
    table: T,
    data: TableInsert<T>
) {
    return client.from(table).insert(data as any);
}

/**
 * Type-safe update in a table
 */
export function updateIn<T extends TableName>(
    client: SupabaseClient<Database>,
    table: T,
    data: TableUpdate<T>
) {
    return client.from(table).update(data as any);
}

/**
 * Type-safe delete from a table
 */
export function deleteFrom<T extends TableName>(
    client: SupabaseClient<Database>,
    table: T
) {
    return client.from(table).delete();
}

/**
 * Type-safe RPC call
 */
export function callRpc<
    FnName extends keyof Database['public']['Functions']
>(
    client: SupabaseClient<Database>,
    fn: FnName,
    args: Database['public']['Functions'][FnName]['Args']
) {
    return client.rpc(fn as string, args as any);
}

// Re-export types for convenience
export type {
    TableRow,
    TableInsert,
    TableUpdate,
    TableName,
};
