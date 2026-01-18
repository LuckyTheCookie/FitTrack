// ============================================================================
// EXPORT MODAL - Spix App
// Modal pour exporter les données au format JSON avec options
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import { X, Check, Calendar, FileJson, Download } from 'lucide-react-native';
import { format, subDays, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GlassCard } from './GlassCard';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';
import type { Entry, StreakInfo } from '../../types';

type ExportPeriod = 'today' | 'yesterday' | 'week' | 'last_week' | 'all';
type ExportCategory = 'workouts' | 'meals' | 'measures';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  entries: Entry[];
  streak: StreakInfo;
}

const periodOptions: { value: ExportPeriod; label: string; icon: string }[] = [
  { value: 'today', label: "Aujourd'hui", icon: '📅' },
  { value: 'yesterday', label: 'Hier', icon: '⏪' },
  { value: 'week', label: 'Cette semaine', icon: '📆' },
  { value: 'last_week', label: 'Semaine dernière', icon: '📋' },
  { value: 'all', label: 'Toutes les données', icon: '📦' },
];

const categoryOptions: { value: ExportCategory; label: string; icon: string }[] = [
  { value: 'workouts', label: 'Séances sport', icon: '🏋️' },
  { value: 'meals', label: 'Repas', icon: '🍽️' },
  { value: 'measures', label: 'Mensurations', icon: '📏' },
];

export function ExportModal({ visible, onClose, entries, streak }: ExportModalProps) {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<ExportPeriod>('week');
  const [selectedCategories, setSelectedCategories] = useState<ExportCategory[]>(['workouts', 'meals', 'measures']);

  const toggleCategory = useCallback((category: ExportCategory) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  }, []);

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const lastWeekStart = format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const lastWeekEnd = format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    switch (selectedPeriod) {
      case 'today':
        return { start: todayStr, end: todayStr, label: format(today, 'd MMMM yyyy', { locale: fr }) };
      case 'yesterday':
        return { start: yesterdayStr, end: yesterdayStr, label: format(subDays(today, 1), 'd MMMM yyyy', { locale: fr }) };
      case 'week':
        return { 
          start: weekStart, 
          end: weekEnd, 
          label: `${format(startOfWeek(today, { weekStartsOn: 1 }), 'd MMM', { locale: fr })} - ${format(endOfWeek(today, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: fr })}` 
        };
      case 'last_week':
        return { 
          start: lastWeekStart, 
          end: lastWeekEnd, 
          label: `${format(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'd MMM', { locale: fr })} - ${format(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }), 'd MMM yyyy', { locale: fr })}` 
        };
      case 'all':
        return { start: '', end: '', label: 'Toutes les données' };
      default:
        return { start: weekStart, end: weekEnd, label: '' };
    }
  }, [selectedPeriod]);

  // Filter entries based on period and categories
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Filter by date
    if (selectedPeriod !== 'all') {
      result = result.filter(entry => {
        return entry.date >= dateRange.start && entry.date <= dateRange.end;
      });
    }

    // Filter by category
    const workoutTypes = ['home', 'run', 'beatsaber'];
    result = result.filter(entry => {
      if (selectedCategories.includes('workouts') && workoutTypes.includes(entry.type)) return true;
      if (selectedCategories.includes('meals') && entry.type === 'meal') return true;
      if (selectedCategories.includes('measures') && entry.type === 'measure') return true;
      return false;
    });

    return result;
  }, [entries, selectedPeriod, selectedCategories, dateRange]);

  // Generate export data
  const exportData = useMemo(() => {
    const workouts = filteredEntries.filter(e => ['home', 'run', 'beatsaber'].includes(e.type));
    const meals = filteredEntries.filter(e => e.type === 'meal');
    const measures = filteredEntries.filter(e => e.type === 'measure');

    const runs = workouts.filter(w => w.type === 'run') as any[];
    const totalDistance = runs.reduce((sum, r) => sum + (r.distanceKm || 0), 0);

    return {
      exportedAt: new Date().toISOString(),
      period: {
        type: selectedPeriod,
        start: dateRange.start || null,
        end: dateRange.end || null,
        label: dateRange.label,
      },
      entries: {
        ...(selectedCategories.includes('workouts') && { workouts }),
        ...(selectedCategories.includes('meals') && { meals }),
        ...(selectedCategories.includes('measures') && { measures }),
      },
      stats: {
        totalEntries: filteredEntries.length,
        totalWorkouts: workouts.length,
        totalRuns: runs.length,
        totalDistance: Math.round(totalDistance * 100) / 100,
        streak,
      },
    };
  }, [filteredEntries, selectedPeriod, selectedCategories, dateRange, streak]);

  const handleExport = useCallback(async () => {
    const json = JSON.stringify(exportData, null, 2);
    await Clipboard.setStringAsync(json);
    
    Alert.alert(
      'Export copié ! 📋',
      `${dateRange.label}\n\n${exportData.stats.totalEntries} entrées exportées`,
      [{ text: 'OK', onPress: onClose }]
    );
  }, [exportData, dateRange.label, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" style={styles.backdrop}>
        <View style={styles.centeredView}>
          <GlassCard style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <FileJson size={24} color={Colors.cta} />
                <Text style={styles.title}>Export JSON</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Period Selection */}
              <Text style={styles.sectionTitle}>📅 Période</Text>
              <View style={styles.optionsGrid}>
                {periodOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionCard,
                      selectedPeriod === option.value && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedPeriod(option.value)}
                  >
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                    <Text style={[
                      styles.optionLabel,
                      selectedPeriod === option.value && styles.optionLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    {selectedPeriod === option.value && (
                      <View style={styles.checkMark}>
                        <Check size={12} color={Colors.bg} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category Selection */}
              <Text style={styles.sectionTitle}>📦 Catégories à exporter</Text>
              <View style={styles.categoriesRow}>
                {categoryOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.categoryChip,
                      selectedCategories.includes(option.value) && styles.categoryChipSelected,
                    ]}
                    onPress={() => toggleCategory(option.value)}
                  >
                    <Text style={styles.categoryIcon}>{option.icon}</Text>
                    <Text style={[
                      styles.categoryLabel,
                      selectedCategories.includes(option.value) && styles.categoryLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    {selectedCategories.includes(option.value) && (
                      <Check size={14} color={Colors.cta} strokeWidth={3} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview */}
              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>👀 Aperçu</Text>
                <View style={styles.previewCard}>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Période</Text>
                    <Text style={styles.previewValue}>{dateRange.label}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Entrées totales</Text>
                    <Text style={styles.previewValue}>{filteredEntries.length}</Text>
                  </View>
                  {selectedCategories.includes('workouts') && (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Séances sport</Text>
                      <Text style={styles.previewValue}>
                        {filteredEntries.filter(e => ['home', 'run', 'beatsaber'].includes(e.type)).length}
                      </Text>
                    </View>
                  )}
                  {selectedCategories.includes('meals') && (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>{t('addEntry.meal')}</Text>
                      <Text style={styles.previewValue}>
                        {filteredEntries.filter(e => e.type === 'meal').length}
                      </Text>
                    </View>
                  )}
                  {selectedCategories.includes('measures') && (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Mensurations</Text>
                      <Text style={styles.previewValue}>
                        {filteredEntries.filter(e => e.type === 'measure').length}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Button
                title="Annuler"
                variant="ghost"
                onPress={onClose}
                style={styles.cancelButton}
              />
              <Button
                title={`📋 Copier JSON (${filteredEntries.length})`}
                variant="cta"
                onPress={handleExport}
                style={styles.exportButton}
                disabled={filteredEntries.length === 0}
              />
            </View>
          </GlassCard>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  centeredView: {
    width: '92%',
    maxHeight: '85%',
  },
  modalContent: {
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stroke,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: Spacing.lg,
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(215, 150, 134, 0.15)',
    borderColor: 'rgba(215, 150, 134, 0.4)',
  },
  optionIcon: {
    fontSize: 14,
  },
  optionLabel: {
    fontSize: FontSize.sm,
    color: Colors.muted,
  },
  optionLabelSelected: {
    color: Colors.cta,
    fontWeight: FontWeight.semibold,
  },
  checkMark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.cta,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  categoriesRow: {
    flexDirection: 'column',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(215, 150, 134, 0.1)',
    borderColor: 'rgba(215, 150, 134, 0.3)',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.muted,
  },
  categoryLabelSelected: {
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  previewSection: {
    marginTop: Spacing.md,
  },
  previewCard: {
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: FontSize.sm,
    color: Colors.muted,
  },
  previewValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.stroke,
  },
  cancelButton: {
    flex: 1,
  },
  exportButton: {
    flex: 2,
  },
});
