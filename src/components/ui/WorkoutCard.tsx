// ============================================================================
// WORKOUT CARD - Carte d'entraînement récent (Optimisé avec React.memo)
// ============================================================================

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { HomeWorkoutEntry, RunEntry, BeatSaberEntry, CustomSportEntry, SportConfig } from '../../types';
import { GlassCard } from './GlassCard';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants';
import { getRelativeTime } from '../../utils/date';
import { useSportsConfig } from '../../stores';

interface WorkoutCardProps {
    entry: HomeWorkoutEntry | RunEntry | BeatSaberEntry | CustomSportEntry;
    onPress?: () => void;
}

export const WorkoutCard = React.memo(function WorkoutCard({ entry, onPress }: WorkoutCardProps) {
    const { t } = useTranslation();
    const sportsConfig = useSportsConfig();
    
    // Memoize sport config lookup and derived values
    const { icon, title, color, sportConfig } = useMemo(() => {
        let sportConfig: SportConfig | undefined;
        let icon: string;
        let title: string;
        
        if (entry.type === 'custom') {
            const customEntry = entry as CustomSportEntry;
            sportConfig = sportsConfig.find((s: SportConfig) => s.id === customEntry.sportId);
            icon = sportConfig?.emoji || '💪';
            title = customEntry.name || sportConfig?.name || t('entries.custom');
        } else if (entry.type === 'run') {
            sportConfig = sportsConfig.find((s: SportConfig) => s.id === 'run');
            icon = sportConfig?.emoji || '🏃';
            title = t('entries.run');
        } else if (entry.type === 'beatsaber') {
            sportConfig = sportsConfig.find((s: SportConfig) => s.id === 'beatsaber');
            icon = sportConfig?.emoji || '🕹️';
            title = t('entries.beatsaber');
        } else {
            sportConfig = sportsConfig.find((s: SportConfig) => s.id === 'home');
            icon = sportConfig?.emoji || '💪';
            title = entry.name || t('workout.defaultHomeName');
        }
        
        return { icon, title, color: sportConfig?.color || Colors.cta, sportConfig };
    }, [entry, sportsConfig, t]);

    const description = useMemo(() => {
        if (entry.type === 'run') {
            const parts = [`${entry.distanceKm} km`, `${entry.durationMinutes} min`];
            if (entry.avgSpeed) parts.push(`${entry.avgSpeed} km/h`);
            if (entry.cardiacLoad !== undefined) parts.push(`Charge ${entry.cardiacLoad}`);
            return parts.join(' • ');
        }
        if (entry.type === 'beatsaber') {
            const parts = [`${entry.durationMinutes} min`];
            if (entry.bpmAvg) parts.push(`${entry.bpmAvg} BPM`);
            if (entry.cardiacLoad) parts.push(`Charge ${entry.cardiacLoad}`);
            return parts.join(' • ');
        }
        if (entry.type === 'custom') {
            const customEntry = entry as CustomSportEntry;
            const parts: string[] = [];
            if (customEntry.durationMinutes) parts.push(`${customEntry.durationMinutes} min`);
            if (customEntry.distanceKm) parts.push(`${customEntry.distanceKm} km`);
            if (customEntry.totalReps) parts.push(`${customEntry.totalReps} reps`);
            if (customEntry.bpmAvg) parts.push(`${customEntry.bpmAvg} BPM`);
            if (customEntry.cardiacLoad) parts.push(`Charge ${customEntry.cardiacLoad}`);
            if (customEntry.calories) parts.push(`${customEntry.calories} kcal`);
            return parts.length > 0 ? parts.join(' • ') : t('entries.noData');
        }
        // Pour home workout, afficher les premiers exercices
        if (entry.exercises) {
            const lines = entry.exercises.split('\n').slice(0, 2);
            return lines.join(', ') + (entry.exercises.split('\n').length > 2 ? '...' : '');
        }
        return t('entries.noData');
    }, [entry, t]);

    // Memoize relative time (updates on entry change)
    const relativeTime = useMemo(() => getRelativeTime(entry.createdAt), [entry.createdAt]);

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
            <GlassCard style={styles.card}>
                <View style={styles.tag}>
                    <View style={[styles.iconDot, { backgroundColor: color + '20', borderColor: color + '30' }]}>
                        <Text>{icon}</Text>
                    </View>
                    <Text style={styles.tagText}>{sportConfig?.name || title}</Text>
                </View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.when}>{relativeTime}</Text>
                <Text style={styles.desc} numberOfLines={2}>{description}</Text>
            </GlassCard>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        width: 200,  // Fixed width as per HOME.md
        padding: Spacing.lg,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    iconDot: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.10)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagText: {
        color: 'rgba(255, 255, 255, 0.85)',  // Improved contrast
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: 4,
    },
    when: {
        color: Colors.muted,  // Uses improved muted color
        fontSize: FontSize.sm,
        marginBottom: 10,
    },
    desc: {
        color: 'rgba(255, 255, 255, 0.78)',  // Improved contrast
        fontSize: FontSize.sm,
        lineHeight: 18,
    },
});
