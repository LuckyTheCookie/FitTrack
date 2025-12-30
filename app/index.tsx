// ============================================================================
// TODAY SCREEN - Écran principal
// ============================================================================

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { 
  GlassCard, 
  ProgressRing, 
  Button, 
  DayBadge, 
  WorkoutCard,
  MonthCard,
  SectionHeader,
  EmptyState,
  EntryDetailModal,
} from '../src/components/ui';
import { AddEntryBottomSheet, AddEntryBottomSheetRef } from '../src/components/sheets';
import { useAppStore, useGamificationStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { getWeekDaysInfo } from '../src/utils/date';
import { calculateQuestTotals } from '../src/utils/questCalculator';
import type { Entry, HomeWorkoutEntry, RunEntry } from '../src/types';

export default function TodayScreen() {
  const bottomSheetRef = useRef<AddEntryBottomSheetRef>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  const { 
    entries, 
    settings,
    deleteEntry,
    getStreak,
    getWeekWorkoutsCount,
    getSportEntries,
    getMonthlyStats,
  } = useAppStore();

  const { recalculateAllQuests } = useGamificationStore();

  const streak = getStreak();
  const weekWorkoutsCount = getWeekWorkoutsCount();
  const weeklyGoal = settings.weeklyGoal;
  const sportEntries = getSportEntries();
  const monthlyStats = getMonthlyStats();
  const weekDays = getWeekDaysInfo();

  // Jours avec activité cette semaine
  const daysWithActivity = useMemo(() => {
    const dates = new Set<string>();
    sportEntries.forEach(e => {
      if (weekDays.some(d => d.date === e.date)) {
        dates.add(e.date);
      }
    });
    return dates;
  }, [sportEntries, weekDays]);

  const recentWorkouts = sportEntries.slice(0, 5);

  const handleOpenModal = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleEntryPress = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    setDetailModalVisible(true);
  }, []);

  const handleDeleteEntry = useCallback((id: string) => {
    // Supprimer l'entrée
    deleteEntry(id);
    // Recalculer les quêtes avec les entrées restantes
    const remainingEntries = entries.filter(e => e.id !== id);
    const totals = calculateQuestTotals(remainingEntries);
    recalculateAllQuests(totals);
  }, [deleteEntry, entries, recalculateAllQuests]);

  const handleEditEntry = useCallback((entry: Entry) => {
    // TODO: Implémenter la navigation ou l'ouverture d'un formulaire d'édition
    console.log('Edit entry:', entry);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP CARD - Weekly Goal & Best Streak */}
        <GlassCard variant="teal" style={styles.topCard}>
          <View style={styles.topLeft}>
            <ProgressRing current={weekWorkoutsCount} goal={weeklyGoal} />
            <View style={styles.topMeta}>
              <Text style={styles.kicker}>WEEKLY GOAL</Text>
              <Text style={styles.topValue}>
                {weekWorkoutsCount} / {weeklyGoal} séances
              </Text>
            </View>
          </View>
          <View style={styles.topRight}>
            <Text style={styles.kicker}>BEST STREAK</Text>
            <Text style={styles.streakValue}>
              🔥 {streak.best} {streak.best > 1 ? 'jours' : 'jour'}
            </Text>
          </View>
        </GlassCard>

        {/* THIS WEEK */}
        <GlassCard style={styles.section}>
          <SectionHeader 
            title="THIS WEEK" 
            muted 
            rightText={`${weekWorkoutsCount} of ${weeklyGoal}`}
          />
          <View style={styles.weekRow}>
            {weekDays.map((day) => (
              <DayBadge
                key={day.date}
                dayOfWeek={day.dayOfWeek}
                dayNumber={day.dayNumber}
                isToday={day.isToday}
                isDone={daysWithActivity.has(day.date)}
              />
            ))}
          </View>
        </GlassCard>

        {/* CTA */}
        <Button
          title="Start New Workout"
          icon="+"
          variant="cta"
          onPress={handleOpenModal}
          style={styles.cta}
        />

        {/* RECENT WORKOUTS */}
        <View style={styles.section}>
          <SectionHeader 
            title="Recent Workouts" 
            actionLabel={sportEntries.length > 5 ? 'See All →' : undefined}
            onAction={() => {/* Navigate to workout tab */}}
          />
          {recentWorkouts.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hscroll}
            >
              {recentWorkouts.map((workout) => (
                <WorkoutCard 
                  key={workout.id} 
                  entry={workout} 
                  onPress={() => handleEntryPress(workout)}
                />
              ))}
            </ScrollView>
          ) : (
            <EmptyState 
              icon="💪" 
              title="Aucune séance" 
              subtitle="Commence ta première séance !"
            />
          )}
        </View>

        {/* MONTHLY PROGRESS */}
        <View style={styles.section}>
          <SectionHeader 
            title="Monthly Progress" 
            actionLabel="See All →"
            onAction={() => {/* Navigate to progress tab */}}
          />
          <View style={styles.monthGrid}>
            {monthlyStats.slice(-6).map((stat) => (
              <MonthCard
                key={stat.month}
                month={stat.month}
                workoutsCount={stat.count}
                goalProgress={stat.count / (weeklyGoal * 4)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* MODAL DÉTAILS */}
      <EntryDetailModal
        entry={selectedEntry}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        onEdit={handleEditEntry}
        onDelete={handleDeleteEntry}
      />

      {/* BOTTOM SHEET D'AJOUT */}
      <AddEntryBottomSheet ref={bottomSheetRef} />
    </SafeAreaView>
    </GestureHandlerRootView>
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
  topCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topMeta: {
    gap: 4,
  },
  kicker: {
    fontSize: FontSize.sm,
    letterSpacing: 1.5,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  topValue: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  topRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  streakValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  section: {
    marginTop: Spacing.lg,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cta: {
    marginTop: Spacing.lg,
  },
  hscroll: {
    gap: 12,
    paddingRight: Spacing.lg,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
