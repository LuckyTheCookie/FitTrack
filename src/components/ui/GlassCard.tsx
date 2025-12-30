// ============================================================================
// CARD GLASS - Composant de base avec effet glassmorphism
// ============================================================================

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../constants';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'teal' | 'solid';
}

export function GlassCard({ children, style, variant = 'default' }: GlassCardProps) {
  return (
    <View style={[
      styles.card,
      variant === 'teal' && styles.tealCard,
      variant === 'solid' && styles.solidCard,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  tealCard: {
    backgroundColor: 'rgba(31, 106, 102, 0.55)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  solidCard: {
    backgroundColor: Colors.cardSolid,
  },
});
