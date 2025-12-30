// ============================================================================
// WORKOUT CARD - Carte d'entraînement récent
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { HomeWorkoutEntry, RunEntry } from '../../types';
import { GlassCard } from './GlassCard';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants';
import { getRelativeTime } from '../../utils/date';

interface WorkoutCardProps {
  entry: HomeWorkoutEntry | RunEntry;
  onPress?: () => void;
}

export function WorkoutCard({ entry, onPress }: WorkoutCardProps) {
  const isRun = entry.type === 'run';
  const icon = isRun ? '🏃' : '🏠';
  const title = isRun ? 'Course' : (entry.name || 'Séance maison');
  
  const getDescription = () => {
    if (entry.type === 'run') {
      return `${entry.distanceKm} km • ${entry.durationMinutes} min${entry.avgSpeed ? ` • ${entry.avgSpeed} km/h` : ''}`;
    }
    // Pour home workout, afficher les premiers exercices
    const lines = entry.exercises.split('\n').slice(0, 2);
    return lines.join(', ') + (entry.exercises.split('\n').length > 2 ? '...' : '');
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard style={styles.card}>
        <View style={styles.tag}>
          <View style={styles.iconDot}>
            <Text>{icon}</Text>
          </View>
          <Text style={styles.tagText}>{isRun ? 'Course' : 'Maison'}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.when}>{getRelativeTime(entry.createdAt)}</Text>
        <Text style={styles.desc} numberOfLines={2}>{getDescription()}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 220,
    padding: Spacing.lg,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconDot: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: FontSize.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    marginBottom: 4,
  },
  when: {
    color: Colors.muted2,
    fontSize: FontSize.sm,
    marginBottom: 10,
  },
  desc: {
    color: 'rgba(255, 255, 255, 0.70)',
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
});
