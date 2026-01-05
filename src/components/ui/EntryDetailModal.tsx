// ============================================================================
// ENTRY DETAIL MODAL - Popup détails avec edit/delete
// ============================================================================

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Pressable, 
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Entry, HomeWorkoutEntry, RunEntry, BeatSaberEntry, MealEntry, MeasureEntry } from '../../types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';

interface EntryDetailModalProps {
  entry: Entry | null;
  visible: boolean;
  onClose: () => void;
  onEdit?: (entry: Entry) => void;
  onDelete?: (id: string) => void;
}

const typeConfigs: Record<string, { icon: string; labelKey: string; color: string }> = {
  home: { icon: '🏠', labelKey: 'entries.workout', color: 'rgba(147, 51, 234, 0.20)' },
  run: { icon: '🏃', labelKey: 'entries.run', color: 'rgba(34, 197, 94, 0.20)' },
  beatsaber: { icon: '🕹️', labelKey: 'entries.beatsaber', color: 'rgba(244, 63, 94, 0.12)' },
  meal: { icon: '🍽️', labelKey: 'entries.meal', color: 'rgba(251, 191, 36, 0.20)' },
  measure: { icon: '📏', labelKey: 'entries.measure', color: 'rgba(59, 130, 246, 0.20)' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function HomeWorkoutDetails({ entry }: { entry: HomeWorkoutEntry }) {
  return (
    <View style={styles.details}>
      {entry.name && (
        <Text style={styles.entryName}>{entry.name}</Text>
      )}
      <Text style={styles.detailLabel}>Exercices :</Text>
      <View style={styles.exercisesList}>
        {entry.exercises.split('\n').map((line, i) => (
          <Text key={i} style={styles.exerciseLine}>• {line}</Text>
        ))}
      </View>
      {entry.absBlock && (
        <>
          <Text style={styles.detailLabel}>Bloc abdos :</Text>
          <Text style={styles.absBlockText}>✓ {entry.absBlock}</Text>
        </>
      )}
    </View>
  );
}

function RunDetails({ entry }: { entry: RunEntry }) {
  return (
    <View style={styles.details}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{entry.distanceKm}</Text>
          <Text style={styles.statLabel}>km</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{entry.durationMinutes}</Text>
          <Text style={styles.statLabel}>min</Text>
        </View>
        {entry.avgSpeed && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{entry.avgSpeed}</Text>
            <Text style={styles.statLabel}>km/h</Text>
          </View>
        )}
        {entry.cardiacLoad !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{entry.cardiacLoad}</Text>
            <Text style={styles.statLabel}>charge</Text>
          </View>
        )}
      </View>
      {(entry.bpmAvg || entry.bpmMax) && (
        <View style={styles.bpmRow}>
          {entry.bpmAvg && (
            <View style={styles.bpmItem}>
              <Text style={styles.bpmLabel}>BPM moy.</Text>
              <Text style={styles.bpmValue}>{entry.bpmAvg}</Text>
            </View>
          )}
          {entry.bpmMax && (
            <View style={styles.bpmItem}>
              <Text style={styles.bpmLabel}>BPM max</Text>
              <Text style={styles.bpmValue}>{entry.bpmMax}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function BeatSaberDetails({ entry }: { entry: BeatSaberEntry }) {
  return (
    <View style={styles.details}>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{entry.durationMinutes}</Text>
          <Text style={styles.statLabel}>min</Text>
        </View>
        {entry.cardiacLoad !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{entry.cardiacLoad}</Text>
            <Text style={styles.statLabel}>charge</Text>
          </View>
        )}
      </View>
      {(entry.bpmAvg || entry.bpmMax) && (
        <View style={styles.bpmRow}>
          {entry.bpmAvg && (
            <View style={styles.bpmItem}>
              <Text style={styles.bpmLabel}>BPM moy.</Text>
              <Text style={styles.bpmValue}>{entry.bpmAvg}</Text>
            </View>
          )}
          {entry.bpmMax && (
            <View style={styles.bpmItem}>
              <Text style={styles.bpmLabel}>BPM max</Text>
              <Text style={styles.bpmValue}>{entry.bpmMax}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function MealDetails({ entry }: { entry: MealEntry }) {
  return (
    <View style={styles.details}>
      <Text style={styles.mealName}>{entry.mealName}</Text>
      <Text style={styles.mealDescription}>{entry.description}</Text>
    </View>
  );
}

function MeasureDetails({ entry }: { entry: MeasureEntry }) {
  const measures = [
    { label: 'Poids', value: entry.weight, unit: 'kg' },
    { label: 'Tour de taille', value: entry.waist, unit: 'cm' },
    { label: 'Bras', value: entry.arm, unit: 'cm' },
    { label: 'Hanches', value: entry.hips, unit: 'cm' },
  ].filter(m => m.value !== undefined);

  return (
    <View style={styles.details}>
      {measures.map((m, i) => (
        <View key={i} style={styles.measureRow}>
          <Text style={styles.measureLabel}>{m.label}</Text>
          <Text style={styles.measureValue}>{m.value} {m.unit}</Text>
        </View>
      ))}
    </View>
  );
}

export function EntryDetailModal({ 
  entry, 
  visible, 
  onClose, 
  onEdit, 
  onDelete 
}: EntryDetailModalProps) {
  const { t } = useTranslation();
  
  if (!entry) return null;

  const typeConfig = typeConfigs[entry.type];
  const typeInfo = {
    icon: typeConfig.icon,
    label: t(typeConfig.labelKey),
    color: typeConfig.color,
  };

  const handleDelete = () => {
    Alert.alert(
      t('entries.deleteConfirm.title'),
      t('entries.deleteConfirm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: () => {
            onDelete?.(entry.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: typeInfo.color }]}>
            <Text style={styles.headerIcon}>{typeInfo.icon}</Text>
            <Text style={styles.headerLabel}>{typeInfo.label}</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.date}>{formatDate(entry.date)}</Text>
            <Text style={styles.time}>à {formatTime(entry.createdAt)}</Text>

            {entry.type === 'home' && <HomeWorkoutDetails entry={entry} />}
            {entry.type === 'run' && <RunDetails entry={entry} />}
            {entry.type === 'beatsaber' && <BeatSaberDetails entry={entry as BeatSaberEntry} />}
            {entry.type === 'meal' && <MealDetails entry={entry} />}
            {entry.type === 'measure' && <MeasureDetails entry={entry} />}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => { onEdit(entry); onClose(); }}
              >
                <Text style={styles.actionIcon}>✏️</Text>
                <Text style={styles.actionLabel}>{t('common.edit')}</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Text style={styles.actionIcon}>🗑️</Text>
                <Text style={[styles.actionLabel, styles.deleteLabel]}>{t('common.delete')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.cardSolid,
    borderRadius: BorderRadius.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: 12,
  },
  headerIcon: {
    fontSize: 32,
  },
  headerLabel: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  content: {
    padding: Spacing.lg,
  },
  date: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: FontWeight.semibold,
    textTransform: 'capitalize',
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: Spacing.md,
  },
  details: {
    marginTop: Spacing.sm,
  },
  entryName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.cta,
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.muted,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  exercisesList: {
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  exerciseLine: {
    fontSize: FontSize.md,
    color: Colors.text,
    marginVertical: 2,
  },
  absBlockText: {
    fontSize: FontSize.md,
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.cta,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.muted,
  },
  bpmRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  bpmItem: {
    flex: 1,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  bpmLabel: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
  bpmValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#f87171',
  },
  mealName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.cta,
    marginBottom: Spacing.sm,
  },
  mealDescription: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 22,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  measureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stroke,
  },
  measureLabel: {
    fontSize: FontSize.md,
    color: Colors.muted,
  },
  measureValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.stroke,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  deleteButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: 'rgba(248, 113, 113, 0.30)',
  },
  actionIcon: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  deleteLabel: {
    color: Colors.error,
  },
  closeButton: {
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.stroke,
  },
  closeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.muted,
  },
});
