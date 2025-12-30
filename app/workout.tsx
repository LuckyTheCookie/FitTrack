// ============================================================================
// WORKOUT SCREEN - Historique complet des séances
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  GlassCard, 
  SegmentedControl,
  EmptyState,
  EntryDetailModal,
} from '../src/components/ui';
import { useAppStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { formatDisplayDate, getRelativeTime } from '../src/utils/date';
import type { Entry, EntryType, HomeWorkoutEntry, RunEntry, MealEntry, MeasureEntry } from '../src/types';

type FilterType = 'all' | 'home' | 'run' | 'beatsaber' | 'meal' | 'measure';

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'home', label: '🏠' },
  { value: 'run', label: '🏃' },
  { value: 'beatsaber', label: '🕹️' },
  { value: 'meal', label: '🍽️' },
  { value: 'measure', label: '📏' },
];

// Composant pour afficher une entrée selon son type
function EntryCard({ entry, onDelete, onPress }: { entry: Entry; onDelete: () => void; onPress?: () => void }) {
  const getContent = () => {
    switch (entry.type) {
      case 'home': {
        const homeEntry = entry as HomeWorkoutEntry;
        return (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🏠</Text>
              <Text style={styles.cardType}>Séance maison</Text>
            </View>
            {homeEntry.name && <Text style={styles.cardTitle}>{homeEntry.name}</Text>}
            <Text style={styles.cardDesc} numberOfLines={3}>
              {homeEntry.exercises}
            </Text>
            {homeEntry.absBlock && (
              <Text style={styles.cardAbsTag}>+ Bloc abdos</Text>
            )}
          </>
        );
      }
      case 'run': {
        const runEntry = entry as RunEntry;
        return (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🏃</Text>
              <Text style={styles.cardType}>Course</Text>
            </View>
            <Text style={styles.cardTitle}>
              {runEntry.distanceKm} km en {runEntry.durationMinutes} min
            </Text>
            <View style={styles.runStats}>
              {runEntry.avgSpeed && (
                <Text style={styles.runStat}>⚡ {runEntry.avgSpeed} km/h</Text>
              )}
              {runEntry.bpmAvg && (
                <Text style={styles.runStat}>❤️ {runEntry.bpmAvg} bpm</Text>
              )}
            </View>
          </>
        );
      }

      case 'beatsaber': {
        const bs = entry as any;
        return (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🕹️</Text>
              <Text style={styles.cardType}>Beat Saber</Text>
            </View>
            <Text style={styles.cardTitle}>{bs.durationMinutes} min</Text>
            <View style={styles.runStats}>
              {bs.bpmAvg && (
                <Text style={styles.runStat}>❤️ {bs.bpmAvg} bpm</Text>
              )}
              {bs.cardiacLoad !== undefined && (
                <Text style={styles.runStat}>💓 {bs.cardiacLoad}</Text>
              )}
            </View>
          </>
        );
      }
      case 'meal': {
        const mealEntry = entry as MealEntry;
        return (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🍽️</Text>
              <Text style={styles.cardType}>Repas</Text>
            </View>
            <Text style={styles.cardTitle}>{mealEntry.mealName}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {mealEntry.description}
            </Text>
          </>
        );
      }
      case 'measure': {
        const measureEntry = entry as MeasureEntry;
        return (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>📏</Text>
              <Text style={styles.cardType}>Mensurations</Text>
            </View>
            <View style={styles.measureGrid}>
              {measureEntry.weight && (
                <View style={styles.measureItem}>
                  <Text style={styles.measureValue}>{measureEntry.weight}</Text>
                  <Text style={styles.measureLabel}>kg</Text>
                </View>
              )}
              {measureEntry.waist && (
                <View style={styles.measureItem}>
                  <Text style={styles.measureValue}>{measureEntry.waist}</Text>
                  <Text style={styles.measureLabel}>taille cm</Text>
                </View>
              )}
              {measureEntry.arm && (
                <View style={styles.measureItem}>
                  <Text style={styles.measureValue}>{measureEntry.arm}</Text>
                  <Text style={styles.measureLabel}>bras cm</Text>
                </View>
              )}
              {measureEntry.hips && (
                <View style={styles.measureItem}>
                  <Text style={styles.measureValue}>{measureEntry.hips}</Text>
                  <Text style={styles.measureLabel}>hanches cm</Text>
                </View>
              )}
            </View>
          </>
        );
      }
    }
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.9}
    >
      <GlassCard style={styles.card}>
        {getContent()}
        <Text style={styles.cardDate}>{getRelativeTime(entry.createdAt)}</Text>
      </GlassCard>
    </TouchableOpacity>
  );
}

export default function WorkoutScreen() {
  const { entries, deleteEntry } = useAppStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.type === filter);
  }, [entries, filter]);

  const handleDelete = useCallback((entry: Entry) => {
    Alert.alert(
      'Supprimer cette entrée ?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => deleteEntry(entry.id),
        },
      ]
    );
  }, [deleteEntry]);

  const handleEditEntry = useCallback((entry: Entry) => {
    // TODO: Implémenter la navigation ou l'ouverture d'un formulaire d'édition
    console.log('Edit entry:', entry);
  }, []);

  const renderItem = useCallback(({ item }: { item: Entry }) => (
    <EntryCard 
      entry={item}
      onPress={() => {
        setSelectedEntry(item);
        setDetailModalVisible(true);
      }}
      onDelete={() => handleDelete(item)}
    />
  ), [handleDelete]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Workout History</Text>
        <Text style={styles.subtitle}>{entries.length} entrées</Text>
      </View>

      <View style={styles.filterContainer}>
        <SegmentedControl
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <FlatList
        data={filteredEntries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState 
            icon="📋" 
            title="Aucune entrée" 
            subtitle={filter === 'all' 
              ? "Commence à tracker tes activités !"
              : "Aucune entrée de ce type"
            }
          />
        }
      />

      <Text style={styles.hint}>
        💡 Appui long pour supprimer
      </Text>

      {/* MODAL DÉTAILS */}
      <EntryDetailModal
        entry={selectedEntry}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        onEdit={handleEditEntry}
        onDelete={deleteEntry}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  screenTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.muted,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 16,
  },
  cardType: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    lineHeight: 18,
  },
  cardAbsTag: {
    fontSize: FontSize.xs,
    color: Colors.cta,
    marginTop: 6,
  },
  cardDate: {
    fontSize: FontSize.xs,
    color: Colors.muted2,
    marginTop: Spacing.md,
  },
  runStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  runStat: {
    fontSize: FontSize.sm,
    color: Colors.muted,
  },
  measureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  measureItem: {
    alignItems: 'center',
  },
  measureValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  measureLabel: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
  hint: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.muted2,
  },
});
