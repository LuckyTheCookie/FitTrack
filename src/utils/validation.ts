// ============================================================================
// VALIDATION SCHEMAS - Zod schemas for data validation
// ============================================================================

import { z } from 'zod/v4';

// ============================================================================
// ENTRY SCHEMAS
// ============================================================================

const BaseEntrySchema = z.object({
    id: z.string(),
    type: z.enum(['home', 'run', 'beatsaber', 'meal', 'measure']),
    createdAt: z.string().datetime({ offset: true }).optional().or(z.string()),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    healthConnectId: z.string().optional(),
});

const HomeWorkoutEntrySchema = BaseEntrySchema.extend({
    type: z.literal('home'),
    name: z.string().optional(),
    exercises: z.string(),
    absBlock: z.string().optional(),
    totalReps: z.number().int().nonnegative().optional(),
    durationMinutes: z.number().nonnegative().optional(),
});

const RunEntrySchema = BaseEntrySchema.extend({
    type: z.literal('run'),
    distanceKm: z.number().nonnegative(),
    durationMinutes: z.number().nonnegative(),
    avgSpeed: z.number().nonnegative().optional(),
    bpmAvg: z.number().int().positive().optional(),
    bpmMax: z.number().int().positive().optional(),
    cardiacLoad: z.number().nonnegative().optional(),
});

const BeatSaberEntrySchema = BaseEntrySchema.extend({
    type: z.literal('beatsaber'),
    durationMinutes: z.number().nonnegative(),
    cardiacLoad: z.number().nonnegative().optional(),
    bpmAvg: z.number().int().positive().optional(),
    bpmMax: z.number().int().positive().optional(),
});

const MealEntrySchema = BaseEntrySchema.extend({
    type: z.literal('meal'),
    mealName: z.string(),
    description: z.string(),
    score: z.number().int().min(0).max(100).optional(),
    suggestions: z.array(z.string()).optional(),
});

const MeasureEntrySchema = BaseEntrySchema.extend({
    type: z.literal('measure'),
    weight: z.number().positive().optional(),
    waist: z.number().positive().optional(),
    arm: z.number().positive().optional(),
    hips: z.number().positive().optional(),
});

export const EntrySchema = z.discriminatedUnion('type', [
    HomeWorkoutEntrySchema,
    RunEntrySchema,
    BeatSaberEntrySchema,
    MealEntrySchema,
    MeasureEntrySchema,
]);

// ============================================================================
// SETTINGS SCHEMA
// ============================================================================

const UnitsSchema = z.object({
    weight: z.enum(['kg', 'lbs']),
    distance: z.enum(['km', 'miles']),
});

const HiddenTabsSchema = z.object({
    tools: z.boolean().optional(),
    workout: z.boolean().optional(),
});

export const SettingsSchema = z.object({
    weeklyGoal: z.number().int().positive().max(14),
    units: UnitsSchema.optional(),
    hiddenTabs: HiddenTabsSchema.optional(),
    debugCamera: z.boolean().optional(),
    preferCameraDetection: z.boolean().optional(),
    debugPlank: z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
    keepGoingIntervalSeconds: z.number().int().positive().optional(),
    fullOpacityNavbar: z.boolean().optional(),
});

// ============================================================================
// BADGE SCHEMA
// ============================================================================

export const BadgeIdSchema = z.enum([
    'first_workout',
    'streak_7',
    'streak_30',
    'workouts_10',
    'workouts_50',
    'workouts_100',
    'runner_10km',
    'runner_50km',
    'consistent_month',
]);

// ============================================================================
// BACKUP SCHEMA
// ============================================================================

export const BackupSchema = z.object({
    entries: z.array(EntrySchema),
    settings: SettingsSchema.partial(),
    unlockedBadges: z.array(BadgeIdSchema),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    issues?: z.core.$ZodIssue[];
}

/**
 * Validates backup data before restoring
 * Returns sanitized data or detailed error information
 */
export function validateBackup(data: unknown): ValidationResult<z.infer<typeof BackupSchema>> {
    const result = BackupSchema.safeParse(data);
    
    if (result.success) {
        return {
            success: true,
            data: result.data,
        };
    }
    
    // Format error message
    const issues = result.error.issues;
    const errorMessages = issues
        .slice(0, 5) // Limit to first 5 errors
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
    
    return {
        success: false,
        error: `Backup validation failed:\n${errorMessages}${issues.length > 5 ? `\n...and ${issues.length - 5} more errors` : ''}`,
        issues,
    };
}

/**
 * Validates a single entry
 */
export function validateEntry(data: unknown): ValidationResult<z.infer<typeof EntrySchema>> {
    const result = EntrySchema.safeParse(data);
    
    if (result.success) {
        return { success: true, data: result.data };
    }
    
    return {
        success: false,
        error: result.error.issues.map(i => i.message).join(', '),
        issues: result.error.issues,
    };
}

/**
 * Validates settings
 */
export function validateSettings(data: unknown): ValidationResult<Partial<z.infer<typeof SettingsSchema>>> {
    const result = SettingsSchema.partial().safeParse(data);
    
    if (result.success) {
        return { success: true, data: result.data };
    }
    
    return {
        success: false,
        error: result.error.issues.map(i => i.message).join(', '),
        issues: result.error.issues,
    };
}
