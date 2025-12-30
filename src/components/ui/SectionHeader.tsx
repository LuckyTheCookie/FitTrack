// ============================================================================
// SECTION HEADER - En-tête de section avec titre et action
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  muted?: boolean;
  rightText?: string;
}

export function SectionHeader({ 
  title, 
  actionLabel, 
  onAction, 
  muted = false,
  rightText,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, muted && styles.titleMuted]}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
      {rightText && (
        <Text style={styles.rightText}>{rightText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: 'rgba(255, 255, 255, 0.90)',
  },
  titleMuted: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.60)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  action: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: FontSize.md,
  },
  rightText: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.60)',
    letterSpacing: 1.5,
  },
});
