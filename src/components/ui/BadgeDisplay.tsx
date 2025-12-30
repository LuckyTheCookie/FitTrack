// ============================================================================
// BADGE DISPLAY - Affichage d'un badge
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Badge } from '../../types';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../constants';

interface BadgeDisplayProps {
  badge: Badge;
  size?: 'small' | 'large';
}

export function BadgeDisplay({ badge, size = 'small' }: BadgeDisplayProps) {
  const isUnlocked = !!badge.unlockedAt;

  return (
    <View style={[
      styles.container,
      size === 'large' && styles.containerLarge,
      !isUnlocked && styles.locked,
    ]}>
      <Text style={[styles.icon, size === 'large' && styles.iconLarge]}>
        {badge.icon}
      </Text>
      <Text style={[
        styles.name, 
        size === 'large' && styles.nameLarge,
        !isUnlocked && styles.textLocked,
      ]}>
        {badge.name}
      </Text>
      {size === 'large' && (
        <Text style={[styles.description, !isUnlocked && styles.textLocked]}>
          {badge.description}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    minWidth: 70,
  },
  containerLarge: {
    padding: Spacing.lg,
    minWidth: 100,
  },
  locked: {
    opacity: 0.4,
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
  },
  iconLarge: {
    fontSize: 36,
    marginBottom: 8,
  },
  name: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  nameLarge: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  description: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  textLocked: {
    color: Colors.muted2,
  },
});
