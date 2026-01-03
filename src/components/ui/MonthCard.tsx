// ============================================================================
// MONTH CARD - Carte de progression mensuelle
// ============================================================================

import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from './GlassCard';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants';
import { getShortMonthName } from '../../utils/date';

interface MonthCardProps {
  month: string; // YYYY-MM
  workoutsCount: number;
  goalProgress: number; // 0-1
  onPress?: () => void;
}

export function MonthCard({ month, workoutsCount, goalProgress, onPress }: MonthCardProps) {
  const monthName = getShortMonthName(month);
  const progressPercent = Math.min(goalProgress * 100, 100);
  
  // Couleur de la barre selon le progress
  const barColor = progressPercent >= 100 
    ? Colors.success 
    : progressPercent >= 50 
      ? Colors.cta 
      : 'rgba(255, 255, 255, 0.40)';

  const { t } = useTranslation();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GlassCard style={styles.card}>
        <Text style={styles.monthName}>{monthName}</Text>
        <Text style={styles.meta}>{t('progress.monthlyCount', { count: workoutsCount })}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${progressPercent}%`, backgroundColor: barColor }]} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    minHeight: 88,
  },
  monthName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  meta: {
    marginTop: 4,
    color: 'rgba(255, 255, 255, 0.68)',
    fontSize: FontSize.sm,
  },
  bar: {
    marginTop: 10,
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
