// ============================================================================
// SETTINGS SCREEN - Paramètres, Export, Reset
// ============================================================================

import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { 
  GlassCard, 
  SectionHeader, 
  Button,
  InputField,
} from '../src/components/ui';
import { useAppStore, useGamificationStore } from '../src/stores';
import { generateWeeklyExport, exportToJSON, getWeekDisplayRange } from '../src/utils/export';
import { calculateQuestTotals } from '../src/utils/questCalculator';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';

export default function SettingsScreen() {
  const { 
    entries, 
    settings, 
    updateWeeklyGoal,
    updateSettings,
    resetAllData,
    getStreak,
  } = useAppStore();

  const { recalculateFromScratch } = useGamificationStore();

  const [weeklyGoalInput, setWeeklyGoalInput] = useState(settings.weeklyGoal.toString());
  const streak = getStreak();

  // Sauvegarder l'objectif hebdo
  const handleSaveGoal = useCallback(() => {
    const goal = parseInt(weeklyGoalInput, 10);
    if (isNaN(goal) || goal < 1 || goal > 14) {
      Alert.alert('Erreur', 'L\'objectif doit être entre 1 et 14');
      return;
    }
    updateWeeklyGoal(goal);
    Alert.alert('Sauvegardé !', `Objectif hebdo: ${goal} séances`);
  }, [weeklyGoalInput, updateWeeklyGoal]);

  // Export JSON
  const handleExportJSON = useCallback(async () => {
    const exportData = generateWeeklyExport(entries, streak);
    const json = exportToJSON(exportData);
    
    await Clipboard.setStringAsync(json);
    Alert.alert(
      'Export copié ! 📋',
      `Semaine du ${getWeekDisplayRange()}\n\n${exportData.stats.totalWorkouts} séances, ${exportData.entries.meals.length} repas, ${exportData.entries.measures.length} mesures`,
      [{ text: 'OK' }]
    );
  }, [entries, streak]);

  // Reset
  const handleReset = useCallback(() => {
    Alert.alert(
      '⚠️ Réinitialiser toutes les données ?',
      'Cette action est irréversible. Toutes tes séances, repas et mesures seront supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Réinitialiser', 
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Alert.alert('Données réinitialisées', 'Tu peux recommencer à zéro !');
          },
        },
      ]
    );
  }, [resetAllData]);   


  // Recalculer les quêtes et le niveau
  const handleRecalculateQuests = useCallback(() => {
    Alert.alert(
      '🔄 Recalculer le niveau ?',
      'Cette action recalculera ton niveau et tes quêtes basés sur tes entrées actuelles. Cela corrigera les éventuelles incohérences.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Recalculer', 
          onPress: () => {
            const totals = calculateQuestTotals(entries);
            const workoutCount = entries.filter(e => 
              e.type === 'home' || e.type === 'run' || e.type === 'beatsaber'
            ).length;
            recalculateFromScratch({ ...totals, totalWorkouts: workoutCount });
            Alert.alert('Recalculé !', 'Ton niveau et tes quêtes ont été mis à jour.');
          },
        },
      ]
    );
  }, [entries, recalculateFromScratch]);


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Settings</Text>

        {/* OBJECTIF HEBDO */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Objectif hebdomadaire" />
          <Text style={styles.description}>
            Combien de séances sport par semaine ?
          </Text>
          <View style={styles.goalRow}>
            <InputField
              value={weeklyGoalInput}
              onChangeText={setWeeklyGoalInput}
              keyboardType="number-pad"
              containerStyle={styles.goalInput}
              maxLength={2}
            />
            <Text style={styles.goalUnit}>séances / semaine</Text>
          </View>
          <Button
            title="Sauvegarder"
            variant="primary"
            onPress={handleSaveGoal}
            style={styles.saveButton}
          />
        </GlassCard>

        {/* EXPORT */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Export JSON hebdomadaire" />
          <Text style={styles.description}>
            Exporte les données de la semaine courante ({getWeekDisplayRange()}) au format JSON.
          </Text>
          <View style={styles.exportInfo}>
            <View style={styles.exportStat}>
              <Text style={styles.exportStatValue}>{entries.length}</Text>
              <Text style={styles.exportStatLabel}>entrées totales</Text>
            </View>
          </View>
          <Button
            title="📋 Copier JSON de la semaine"
            variant="cta"
            onPress={handleExportJSON}
            style={styles.exportButton}
          />
        </GlassCard>

        {/* STATISTIQUES */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Données" />
          <View style={styles.dataStats}>
            <View style={styles.dataStat}>
              <Text style={styles.dataStatValue}>
                {entries.filter(e => e.type === 'home' || e.type === 'run' || e.type === 'beatsaber').length}
              </Text>
              <Text style={styles.dataStatLabel}>Séances sport</Text>
            </View>
            <View style={styles.dataStat}>
              <Text style={styles.dataStatValue}>
                {entries.filter(e => e.type === 'meal').length}
              </Text>
              <Text style={styles.dataStatLabel}>Repas</Text>
            </View>
            <View style={styles.dataStat}>
              <Text style={styles.dataStatValue}>
                {entries.filter(e => e.type === 'measure').length}
              </Text>
              <Text style={styles.dataStatLabel}>Mesures</Text>
            </View>
          </View>
        </GlassCard>

        {/* PERSONNALISATION */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Navigation" />
          <Text style={styles.description}>
            Masque les onglets que tu n'utilises pas.
          </Text>
          <TouchableOpacity 
            style={styles.toggleItem}
            onPress={() => updateSettings({ 
              hiddenTabs: { 
                ...settings.hiddenTabs, 
                tools: !settings.hiddenTabs?.tools 
              } 
            })}
          >
            <Text style={styles.toggleItemLabel}>⚡ Onglet Générer</Text>
            <View style={[styles.toggleBadge, settings.hiddenTabs?.tools && styles.toggleBadgeHidden]}>
              <Text style={styles.toggleBadgeText}>
                {settings.hiddenTabs?.tools ? 'Masqué' : 'Visible'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.toggleItem}
            onPress={() => updateSettings({ 
              hiddenTabs: { 
                ...settings.hiddenTabs, 
                workout: !settings.hiddenTabs?.workout 
              } 
            })}
          >
            <Text style={styles.toggleItemLabel}>📋 Onglet Historique</Text>
            <View style={[styles.toggleBadge, settings.hiddenTabs?.workout && styles.toggleBadgeHidden]}>
              <Text style={styles.toggleBadgeText}>
                {settings.hiddenTabs?.workout ? 'Masqué' : 'Visible'}
              </Text>
            </View>
          </TouchableOpacity>
        </GlassCard>

        {/* GAMIFICATION */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Gamification" />
          <Text style={styles.description}>
            Recalcule ton niveau et tes quêtes basés sur tes entrées actuelles.
          </Text>
          <Button
            title="🔄 Recalculer le niveau et les quêtes"
            variant="cta"
            onPress={handleRecalculateQuests}
            style={styles.recalculateButton}
          />
        </GlassCard>

        {/* À PROPOS */}
        <GlassCard style={styles.section}>
          <SectionHeader title="À propos" />
          <Text style={styles.aboutText}>
            FitTrack v1.0.0{'\n'}
            Application de suivi fitness personnelle.
          </Text>
          <View style={styles.futureFeatures}>
            <Text style={styles.futureTitle}>🚀 Prochaines fonctionnalités</Text>
            <Text style={styles.futureItem}>• Timer pendant les séances</Text>
            <Text style={styles.futureItem}>• Sync cloud & compte</Text>
            <Text style={styles.futureItem}>• Intégration Google Fit / Apple Health</Text>
            <Text style={styles.futureItem}>• Notifications intelligentes</Text>
          </View>
        </GlassCard>

        {/* DANGER ZONE */}
        <GlassCard style={[styles.section, styles.dangerSection]}>
          <SectionHeader title="Zone de danger" />
          <Text style={styles.dangerText}>
            Cette action supprimera définitivement toutes tes données.
          </Text>
          <Button
            title="🗑️ Réinitialiser toutes les données"
            variant="ghost"
            onPress={handleReset}
            style={styles.resetButton}
            textStyle={styles.resetButtonText}
          />
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
  section: {
    marginBottom: Spacing.lg,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.muted,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalInput: {
    width: 80,
    marginBottom: 0,
  },
  goalUnit: {
    fontSize: FontSize.md,
    color: Colors.muted,
  },
  saveButton: {
    marginTop: Spacing.md,
  },
  exportInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: Spacing.md,
  },
  exportStat: {
    alignItems: 'center',
  },
  exportStatValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  exportStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
  exportButton: {
    marginTop: Spacing.sm,
  },
  recalculateButton: {
    marginTop: Spacing.sm,
  },
  dataStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dataStat: {
    alignItems: 'center',
  },
  dataStatValue: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.cta,
  },
  dataStatLabel: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginTop: 4,
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stroke,
  },
  toggleItemLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  toggleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(34, 197, 94, 0.20)',
  },
  toggleBadgeHidden: {
    backgroundColor: 'rgba(248, 113, 113, 0.20)',
  },
  toggleBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  aboutText: {
    fontSize: FontSize.md,
    color: Colors.muted,
    lineHeight: 22,
  },
  futureFeatures: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  futureTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  futureItem: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginVertical: 2,
  },
  dangerSection: {
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  dangerText: {
    fontSize: FontSize.md,
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  resetButton: {
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  resetButtonText: {
    color: Colors.error,
  },
});
