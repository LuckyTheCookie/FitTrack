// ============================================================================
// TOOLS SCREEN - Générateur de séance
// ============================================================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  GlassCard, 
  SectionHeader, 
  Button,
  SegmentedControl,
  EmptyState,
} from '../src/components/ui';
import { 
  generateWorkout, 
  formatWorkoutAsText,
  focusLabels,
  intensityLabels,
  durationLabels,
} from '../src/utils/workoutGenerator';
import { useAppStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import type { FocusArea, Intensity, Duration, GeneratedWorkout } from '../src/types';

const focusOptions: { value: FocusArea; label: string }[] = [
  { value: 'upper', label: '💪 Haut' },
  { value: 'abs', label: '🎯 Abdos' },
  { value: 'legs', label: '🦵 Jambes' },
  { value: 'full', label: '🔥 Full' },
];

const intensityOptions: { value: Intensity; label: string }[] = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' },
];

const durationOptions: { value: Duration; label: string }[] = [
  { value: 10, label: '10 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
];

export default function ToolsScreen() {
  const router = useRouter();
  const { addHomeWorkout } = useAppStore();

  const [focusArea, setFocusArea] = useState<FocusArea>('upper');
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const [duration, setDuration] = useState<Duration>(20);
  const [includeAbs, setIncludeAbs] = useState(true);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);

  const handleGenerate = useCallback(() => {
    const workout = generateWorkout(focusArea, intensity, duration, includeAbs);
    setGeneratedWorkout(workout);
  }, [focusArea, intensity, duration, includeAbs]);

  const handleStartWorkout = useCallback(() => {
    if (!generatedWorkout) return;

    const { exercises, absBlock } = formatWorkoutAsText(generatedWorkout);
    
    // Créer directement l'entrée
    addHomeWorkout({
      name: `Séance ${focusLabels[generatedWorkout.focusArea]} - ${intensityLabels[generatedWorkout.intensity]}`,
      exercises,
      absBlock: absBlock || undefined,
    });

    Alert.alert(
      'Séance enregistrée ! 🎉',
      'Ta séance a été ajoutée à ton historique.',
      [{ text: 'Super !' }]
    );

    setGeneratedWorkout(null);
  }, [generatedWorkout, addHomeWorkout]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Tools</Text>

        {/* GÉNÉRATEUR */}
        <GlassCard style={styles.section}>
          <SectionHeader title="Générateur de séance 💪" />
          <Text style={styles.description}>
            Génère une séance adaptée à tes objectifs et au temps que tu as.
          </Text>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Zone à travailler</Text>
            <SegmentedControl
              options={focusOptions}
              value={focusArea}
              onChange={setFocusArea}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Intensité</Text>
            <SegmentedControl
              options={intensityOptions}
              value={intensity}
              onChange={setIntensity}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.fieldLabel}>Durée</Text>
            <SegmentedControl
              options={durationOptions}
              value={duration}
              onChange={(v) => setDuration(v as Duration)}
            />
          </View>

          {focusArea !== 'abs' && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Inclure bloc abdos</Text>
              <Button
                title={includeAbs ? '✓ Oui' : '✕ Non'}
                variant="ghost"
                onPress={() => setIncludeAbs(!includeAbs)}
                style={styles.toggleButton}
              />
            </View>
          )}

          <Button
            title="Générer une séance"
            variant="cta"
            onPress={handleGenerate}
            style={styles.generateButton}
          />
        </GlassCard>

        {/* RÉSULTAT */}
        {generatedWorkout && (
          <GlassCard style={styles.section}>
            <SectionHeader 
              title={`Séance ${focusLabels[generatedWorkout.focusArea]}`}
              actionLabel="🔄 Regénérer"
              onAction={handleRegenerate}
            />
            
            <View style={styles.workoutMeta}>
              <Text style={styles.metaTag}>
                ⏱️ {durationLabels[generatedWorkout.duration]}
              </Text>
              <Text style={styles.metaTag}>
                💪 {intensityLabels[generatedWorkout.intensity]}
              </Text>
            </View>

            <View style={styles.exerciseList}>
              {generatedWorkout.exercises.map((exercise, index) => (
                <View key={index} style={styles.exerciseItem}>
                  <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseReps}>
                      {exercise.reps 
                        ? `${exercise.sets} × ${exercise.reps} reps`
                        : `${exercise.sets} × ${exercise.durationSec}s`
                      }
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {generatedWorkout.absBlock && generatedWorkout.absBlock.length > 0 && (
              <View style={styles.absReminder}>
                <Text style={styles.absReminderIcon}>🎯</Text>
                <Text style={styles.absReminderText}>
                  N'oublie pas d'effectuer ton bloc abdos à la fin ! 💪
                </Text>
              </View>
            )}

            <Button
              title={generatedWorkout.absBlock ? "Démarrer (+ bloc abdos)" : "Démarrer cette séance"}
              variant="cta"
              onPress={handleStartWorkout}
              style={styles.startButton}
            />
          </GlassCard>
        )}

        {/* HINT */}
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            💡 Les séances sont générées aléatoirement. Régénère si tu veux d'autres exercices !
          </Text>
        </View>
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
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  toggleLabel: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  toggleButton: {
    minWidth: 80,
  },
  generateButton: {
    marginTop: Spacing.sm,
  },
  workoutMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  metaTag: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    backgroundColor: Colors.overlay,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
  },
  exerciseList: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    padding: 12,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(227, 160, 144, 0.3)',
    color: Colors.cta,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  exerciseReps: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginTop: 2,
  },
  absTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  absReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.30)',
  },
  absReminderIcon: {
    fontSize: 24,
  },
  absReminderText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  startButton: {
    marginTop: Spacing.lg,
  },
  hint: {
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.strokeLight,
  },
  hintText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    lineHeight: 18,
  },
});
