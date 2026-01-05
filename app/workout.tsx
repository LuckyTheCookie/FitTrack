// ============================================================================
// WORKOUT SCREEN - Historique complet des séances (Optimisé)
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { 
  Home, 
  Footprints, 
  Gamepad2, 
  UtensilsCrossed, 
  Ruler, 
  Filter,
  Calendar,
  Flame,
  Clock,
  TrendingUp,
  Trash2,
} from 'lucide-react-native';
import { 
  GlassCard, 
  EmptyState,
  EntryDetailModal,
} from '../src/components/ui';
import { useAppStore, useGamificationStore, useEditorStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { formatDisplayDate, getRelativeTime } from '../src/utils/date';
import { calculateQuestTotals } from '../src/utils/questCalculator';
import type { Entry, HomeWorkoutEntry, RunEntry, MealEntry, MeasureEntry, BeatSaberEntry } from '../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 150; // Hauteur estimée pour getItemLayout



type FilterType = 'all' | 'home' | 'run' | 'beatsaber' | 'meal' | 'measure';

interface FilterOption {
  value: FilterType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

// filterOptions are localized inside the component using `t()` for labels
const FILTER_DEFINITIONS = [
  { value: 'all', icon: <Filter size={16} color={Colors.text} />, color: Colors.text },
  { value: 'home', icon: <Home size={16} color="#4ade80" />, color: '#4ade80' },
  { value: 'run', icon: <Footprints size={16} color="#60a5fa" />, color: '#60a5fa' },
  { value: 'beatsaber', icon: <Gamepad2 size={16} color="#f472b6" />, color: '#f472b6' },
  { value: 'meal', icon: <UtensilsCrossed size={16} color="#fbbf24" />, color: '#fbbf24' },
  { value: 'measure', icon: <Ruler size={16} color="#a78bfa" />, color: '#a78bfa' },
];

const getEntryStyle = (type: string) => {
  switch (type) {
    case 'home':
      return { icon: <Home size={20} color="#4ade80" />, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' };
    case 'run':
      return { icon: <Footprints size={20} color="#60a5fa" />, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' };
    case 'beatsaber':
      return { icon: <Gamepad2 size={20} color="#f472b6" />, color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' };
    case 'meal':
      return { icon: <UtensilsCrossed size={20} color="#fbbf24" />, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'measure':
      return { icon: <Ruler size={20} color="#a78bfa" />, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' };
    default:
      return { icon: <Flame size={20} color={Colors.cta} />, color: Colors.cta, bg: 'rgba(215, 150, 134, 0.15)' };
  }
};

// Composant FilterChip optimisé avec React.memo
const FilterChip = React.memo(({ option, isActive, onPress }: { option: FilterOption; isActive: boolean; onPress: () => void }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.filterChip,
        isActive && { backgroundColor: `${option.color}22`, borderColor: `${option.color}55` },
      ]}
    >
      {option.icon}
      {isActive && <Text style={[styles.filterChipText, { color: option.color }]}>{option.label}</Text>}
    </TouchableOpacity>
  );
});

// Composant EntryCard optimisé avec React.memo
const EntryCard = React.memo(({ entry, onDelete, onPress, index }: { entry: Entry; onDelete: () => void; onPress?: () => void; index: number }) => {
  const entryStyle = getEntryStyle(entry.type);
  const { t } = useTranslation();
  
  const renderContent = useCallback(() => {
    switch (entry.type) {
      case 'home': {
        const homeEntry = entry as HomeWorkoutEntry;
        return (
          <>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {homeEntry.name || t('workout.defaultHomeName')}
            </Text>
            <Text style={styles.cardDesc} numberOfLines={2}>
              {homeEntry.exercises}
            </Text>
            <View style={styles.cardTags}>
              {homeEntry.absBlock && (
                <View style={styles.tag}>
                  <Flame size={12} color={Colors.cta} />
                  <Text style={styles.tagText}>{t('addEntry.absShort')}</Text>
                </View>
              )}
              {homeEntry.totalReps && (
                <View style={styles.tag}>
                  <TrendingUp size={12} color={Colors.muted} />
                  <Text style={styles.tagText}>{homeEntry.totalReps} {t('common.reps')}</Text>
                </View>
              )}
            </View>
          </>
        );
      }
      case 'run': {
        const runEntry = entry as RunEntry;
        return (
          <>
            <Text style={styles.cardTitle}>
              {runEntry.distanceKm} km
            </Text>
            <View style={styles.runStatsRow}>
              <View style={styles.runStatItem}>
                <Clock size={14} color={Colors.muted} />
                <Text style={styles.runStatText}>{runEntry.durationMinutes} min</Text>
              </View>
              {runEntry.avgSpeed && (
                <View style={styles.runStatItem}>
                  <TrendingUp size={14} color={Colors.muted} />
                  <Text style={styles.runStatText}>{runEntry.avgSpeed} km/h</Text>
                </View>
              )}
              {runEntry.bpmAvg && (
                <View style={styles.runStatItem}>
                  <Flame size={14} color="#f87171" />
                  <Text style={styles.runStatText}>{runEntry.bpmAvg} bpm</Text>
                </View>
              )}
            </View>
          </>
        );
      }
      case 'beatsaber': {
        const bsEntry = entry as BeatSaberEntry;
        return (
          <>
            <Text style={styles.cardTitle}>{bsEntry.durationMinutes} minutes</Text>
            <View style={styles.runStatsRow}>
              {bsEntry.bpmAvg && (
                <View style={styles.runStatItem}>
                  <Flame size={14} color="#f87171" />
                  <Text style={styles.runStatText}>{bsEntry.bpmAvg} bpm</Text>
                </View>
              )}
              {bsEntry.cardiacLoad !== undefined && (
                <View style={styles.runStatItem}>
                  <TrendingUp size={14} color={Colors.muted} />
                  <Text style={styles.runStatText}>Charge: {bsEntry.cardiacLoad}</Text>
                </View>
              )}
            </View>
          </>
        );
      }
      case 'meal': {
        const mealEntry = entry as MealEntry;
        return (
          <>
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
            <Text style={styles.cardTitle}>Mensurations</Text>
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
                  <Text style={styles.measureLabel}>taille</Text>
                </View>
              )}
              {measureEntry.arm && (
                <View style={styles.measureItem}>
                  <Text style={styles.measureValue}>{measureEntry.arm}</Text>
                  <Text style={styles.measureLabel}>bras</Text>
                </View>
              )}
              {measureEntry.hips && (
                <View style={styles.measureItem}>
                  <Text style={styles.measureValue}>{measureEntry.hips}</Text>
                  <Text style={styles.measureLabel}>hanches</Text>
                </View>
              )}
            </View>
          </>
        );
      }
    }
  }, [entry]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <TouchableOpacity 
        onPress={onPress}
        onLongPress={onDelete}
        activeOpacity={0.9}
      >
        <GlassCard style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.cardIconContainer, { backgroundColor: entryStyle.bg }]}>
              {entryStyle.icon}
            </View>
            
            <View style={styles.cardContent}>
              {renderContent()}
            </View>

            <TouchableOpacity 
              onPress={onDelete} 
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={18} color={Colors.muted2} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.cardFooter}>
            <Calendar size={12} color={Colors.muted2} />
            <Text style={styles.cardDate}>{getRelativeTime(entry.createdAt)}</Text>
            <Text style={styles.cardDateFull}>• {formatDisplayDate(entry.date)}</Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return prevProps.entry.id === nextProps.entry.id && prevProps.index === nextProps.index;
});

export default function WorkoutScreen() {
  const { entries, deleteEntry } = useAppStore();
  const { recalculateAllQuests } = useGamificationStore();
  const { setEntryToEdit } = useEditorStore();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Localized filter options
  const filterOptions = useMemo(() => FILTER_DEFINITIONS.map(def => ({
    value: def.value as FilterType,
    label: t(`workout.filters.${def.value}`),
    icon: def.icon,
    color: def.color,
  } as FilterOption)), [t]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter(e => e.type === filter);
  }, [entries, filter]);

  const quickStats = useMemo(() => {
    const sportEntries = entries.filter(e => ['home', 'run', 'beatsaber'].includes(e.type));
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = entries.filter(e => e.date === today);
    return {
      total: entries.length,
      sport: sportEntries.length,
      today: todayEntries.length,
    };
  }, [entries]);

  const handleDelete = useCallback((entry: Entry) => {
    Alert.alert(
      'Supprimer cette entrée ?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: () => {
            deleteEntry(entry.id);
            const remainingEntries = entries.filter(e => e.id !== entry.id);
            const totals = calculateQuestTotals(remainingEntries);
            recalculateAllQuests(totals);
          },
        },
      ]
    );
  }, [deleteEntry, entries, recalculateAllQuests]);

  const handleEntryPress = useCallback((entry: Entry) => {
    setSelectedEntry(entry);
    setDetailModalVisible(true);
  }, []);

  const renderItem = useCallback(({ item, index }: { item: Entry; index: number }) => (
    <EntryCard 
      entry={item}
      index={index}
      onPress={() => handleEntryPress(item)}
      onDelete={() => handleDelete(item)}
    />
  ), [handleDelete, handleEntryPress]);

  const keyExtractor = useCallback((item: Entry) => item.id, []);

  // Optimisation FlatList performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  const renderFilterItem = useCallback(({ item }: { item: FilterOption }) => (
    <FilterChip
      option={item}
      isActive={filter === item.value}
      onPress={() => setFilter(item.value)}
    />
  ), [filter]);

  const filterKeyExtractor = useCallback((item: FilterOption) => item.value, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['rgba(215, 150, 134, 0.15)', 'transparent']}
        style={styles.headerGradient}
      />
      
      <View style={styles.header}>
        <Animated.View entering={FadeIn.delay(100)}>
          <Text style={styles.screenTitle}>{t('workout.historyTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('workout.historySubtitle', { total: quickStats.total, sport: quickStats.sport, today: quickStats.today })}
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(200)} style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={filterKeyExtractor}
          renderItem={renderFilterItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          removeClippedSubviews={true}
          maxToRenderPerBatch={6}
          windowSize={3}
        />
      </Animated.View>

      <FlatList
        data={filteredEntries}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        ListEmptyComponent={
          <EmptyState 
            icon="📋" 
            title={t('workout.noEntriesTitle')} 
            subtitle={filter === 'all' 
              ? t('workout.noEntriesAll')
              : t('workout.noEntriesType')
            }
          />
        }
      />

      <EntryDetailModal
        entry={selectedEntry}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        onEdit={(entry) => {
          setDetailModalVisible(false);
          // Set the entry to edit in the global store
          // The home screen will pick it up and open the bottom sheet
          setTimeout(() => {
            setEntryToEdit(entry);
            // Navigate to home to show the edit form
            import('expo-router').then(({ router }) => {
              router.push('/');
            });
          }, 300);
        }}
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
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.muted,
    marginTop: 4,
  },
  filterContainer: {
    marginBottom: Spacing.sm,
  },
  filterList: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    padding: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginTop: -4,
    marginRight: -4,
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
  cardTags: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.overlay,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
  runStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  runStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  runStatText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
  },
  measureGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  measureItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  measureValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  measureLabel: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.stroke,
  },
  cardDate: {
    fontSize: FontSize.xs,
    color: Colors.muted2,
  },
  cardDateFull: {
    fontSize: FontSize.xs,
    color: Colors.muted2,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.muted2,
    backgroundColor: Colors.cardSolid,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
});
