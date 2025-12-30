// ============================================================================
// PROGRESS SCREEN - Streak, Stats, Graphiques
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { 
  GlassCard, 
  SectionHeader, 
  BadgeDisplay,
  EmptyState,
} from '../src/components/ui';
import { useAppStore } from '../src/stores';
import { getBadgesWithState, BADGE_DEFINITIONS } from '../src/utils/badges';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import type { Badge, MeasureEntry } from '../src/types';

export default function ProgressScreen() {
  const { 
    entries,
    settings,
    unlockedBadges,
    getStreak,
    getMonthlyStats,
    getSportEntries,
  } = useAppStore();

  const streak = getStreak();
  const monthlyStats = getMonthlyStats();
  const sportEntries = getSportEntries();

  // Badges avec état
  const badges = useMemo(() => getBadgesWithState(unlockedBadges), [unlockedBadges]);

  // Stats
  const totalWorkouts = sportEntries.length;
  const totalRuns = sportEntries.filter(e => e.type === 'run').length;
  const totalHomeWorkouts = sportEntries.filter(e => e.type === 'home').length;
  const totalDistance = sportEntries
    .filter(e => e.type === 'run')
    .reduce((sum, e) => sum + (e.type === 'run' ? e.distanceKm : 0), 0);

  // Dernières mesures de poids
  const weightHistory = useMemo(() => {
    return entries
      .filter((e): e is MeasureEntry => e.type === 'measure' && e.weight !== undefined)
      .slice(0, 10)
      .reverse();
  }, [entries]);

  // Graphique simple des séances par semaine (6 dernières semaines)
  const weeklyWorkoutsData = useMemo(() => {
    const last6Months = monthlyStats.slice(-6);
    return last6Months.map(stat => ({
      label: stat.month.slice(5), // MM
      value: stat.count,
    }));
  }, [monthlyStats]);

  const maxValue = Math.max(...weeklyWorkoutsData.map(d => d.value), 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Progress</Text>

        {/* STREAK CARD */}
        <GlassCard variant="teal" style={styles.streakCard}>
          <View style={styles.streakMain}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakLabel}>Streak actuel</Text>
              <Text style={styles.streakNumber}>
                {streak.current} {streak.current > 1 ? 'jours' : 'jour'}
              </Text>
            </View>
          </View>
          <View style={styles.streakBest}>
            <Text style={styles.streakBestLabel}>Meilleur</Text>
            <Text style={styles.streakBestValue}>{streak.best}</Text>
          </View>
        </GlassCard>

        {/* STATS OVERVIEW */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Statistiques globales" />
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalWorkouts}</Text>
              <Text style={styles.statLabel}>Séances totales</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalHomeWorkouts}</Text>
              <Text style={styles.statLabel}>Maison</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalRuns}</Text>
              <Text style={styles.statLabel}>Courses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalDistance.toFixed(1)}</Text>
              <Text style={styles.statLabel}>km parcourus</Text>
            </View>
          </View>
        </GlassCard>

        {/* GRAPHIQUE SÉANCES PAR MOIS */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Séances par mois" />
          {weeklyWorkoutsData.length > 0 ? (
            <View style={styles.chartContainer}>
              <Svg width="100%" height={120} viewBox="0 0 300 120">
                {weeklyWorkoutsData.map((data, index) => {
                  const barWidth = 35;
                  const gap = (300 - weeklyWorkoutsData.length * barWidth) / (weeklyWorkoutsData.length + 1);
                  const x = gap + index * (barWidth + gap);
                  const barHeight = (data.value / maxValue) * 80;
                  const y = 90 - barHeight;
                  
                  return (
                    <React.Fragment key={index}>
                      <Rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx={8}
                        fill={Colors.cta}
                        opacity={0.8}
                      />
                      <SvgText
                        x={x + barWidth / 2}
                        y={105}
                        fontSize="10"
                        fill="rgba(255,255,255,0.6)"
                        textAnchor="middle"
                      >
                        {data.label}
                      </SvgText>
                      <SvgText
                        x={x + barWidth / 2}
                        y={y - 5}
                        fontSize="11"
                        fill={Colors.text}
                        textAnchor="middle"
                        fontWeight="600"
                      >
                        {data.value}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>
            </View>
          ) : (
            <EmptyState 
              icon="📊" 
              title="Pas encore de données" 
              subtitle="Commence à t'entraîner !"
            />
          )}
        </GlassCard>

        {/* ÉVOLUTION DU POIDS */}
        {weightHistory.length > 0 && (
          <GlassCard style={styles.section}>
            <SectionHeader title="Évolution du poids" />
            <View style={styles.weightList}>
              {weightHistory.slice(-5).map((measure, index) => (
                <View key={measure.id} style={styles.weightItem}>
                  <Text style={styles.weightDate}>{measure.date}</Text>
                  <Text style={styles.weightValue}>{measure.weight} kg</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* BADGES */}
        <View style={styles.section}>
          <SectionHeader title="Badges" />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {badges.map((badge) => (
              <BadgeDisplay key={badge.id} badge={badge} size="large" />
            ))}
          </ScrollView>
        </View>

        {/* OBJECTIF HEBDO */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Objectif hebdomadaire" />
          <View style={styles.goalInfo}>
            <Text style={styles.goalValue}>{settings.weeklyGoal}</Text>
            <Text style={styles.goalLabel}>séances / semaine</Text>
          </View>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  streakCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakEmoji: {
    fontSize: 40,
  },
  streakLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  streakNumber: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  streakBest: {
    alignItems: 'center',
  },
  streakBestLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.60)',
  },
  streakBestValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  section: {
    marginTop: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginTop: 4,
  },
  chartContainer: {
    marginTop: Spacing.sm,
  },
  weightList: {
    gap: 8,
  },
  weightItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stroke,
  },
  weightDate: {
    fontSize: FontSize.md,
    color: Colors.muted,
  },
  weightValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  badgesScroll: {
    gap: 12,
    paddingRight: Spacing.lg,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  goalValue: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: Colors.cta,
  },
  goalLabel: {
    fontSize: FontSize.lg,
    color: Colors.muted,
  },
});
