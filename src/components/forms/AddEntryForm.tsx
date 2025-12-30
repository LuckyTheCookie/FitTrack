// ============================================================================
// FORMULAIRES D'AJOUT - Séance maison, Course, Repas, Mensurations
// ============================================================================

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { InputField, TextArea, Button, SegmentedControl } from '../ui';
import { useAppStore } from '../../stores';
import type { EntryType } from '../../types';
import { Spacing } from '../../constants';

interface AddEntryFormProps {
  onSuccess?: () => void;
  initialTab?: EntryType;
  prefillExercises?: string;
  prefillAbsBlock?: string;
}

type TabOption = { value: EntryType; label: string };

const tabs: TabOption[] = [
  { value: 'home', label: '🏠 Maison' },
  { value: 'run', label: '🏃 Course' },
  { value: 'meal', label: '🍽️ Repas' },
  { value: 'measure', label: '📏 Mesures' },
];

export function AddEntryForm({ 
  onSuccess, 
  initialTab = 'home',
  prefillExercises = '',
  prefillAbsBlock = '',
}: AddEntryFormProps) {
  const [activeTab, setActiveTab] = useState<EntryType>(initialTab);
  const [loading, setLoading] = useState(false);

  // Home workout
  const [homeName, setHomeName] = useState('');
  const [homeExercises, setHomeExercises] = useState(prefillExercises);
  const [absBlock, setAbsBlock] = useState(prefillAbsBlock);

  // Run
  const [runKm, setRunKm] = useState('');
  const [runMinutes, setRunMinutes] = useState('');
  const [runBpmAvg, setRunBpmAvg] = useState('');
  const [runBpmMax, setRunBpmMax] = useState('');

  // Meal
  const [mealName, setMealName] = useState('');
  const [mealDescription, setMealDescription] = useState('');

  // Measure
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [arm, setArm] = useState('');
  const [hips, setHips] = useState('');

  const { addHomeWorkout, addRun, addMeal, addMeasure } = useAppStore();

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'home':
          if (!homeExercises.trim()) {
            Alert.alert('Erreur', 'Ajoute au moins un exercice');
            return;
          }
          addHomeWorkout({
            name: homeName.trim() || undefined,
            exercises: homeExercises.trim(),
            absBlock: absBlock.trim() || undefined,
          });
          break;

        case 'run':
          const km = parseFloat(runKm);
          const minutes = parseInt(runMinutes, 10);
          if (isNaN(km) || km <= 0) {
            Alert.alert('Erreur', 'Distance invalide');
            return;
          }
          if (isNaN(minutes) || minutes <= 0) {
            Alert.alert('Erreur', 'Durée invalide');
            return;
          }
          addRun({
            distanceKm: km,
            durationMinutes: minutes,
            bpmAvg: runBpmAvg ? parseInt(runBpmAvg, 10) : undefined,
            bpmMax: runBpmMax ? parseInt(runBpmMax, 10) : undefined,
          });
          break;

        case 'meal':
          if (!mealName.trim()) {
            Alert.alert('Erreur', 'Ajoute un nom de repas');
            return;
          }
          addMeal({
            mealName: mealName.trim(),
            description: mealDescription.trim(),
          });
          break;

        case 'measure':
          const hasAnyMeasure = weight || waist || arm || hips;
          if (!hasAnyMeasure) {
            Alert.alert('Erreur', 'Ajoute au moins une mesure');
            return;
          }
          addMeasure({
            weight: weight ? parseFloat(weight) : undefined,
            waist: waist ? parseFloat(waist) : undefined,
            arm: arm ? parseFloat(arm) : undefined,
            hips: hips ? parseFloat(hips) : undefined,
          });
          break;
      }

      // Reset form
      setHomeName('');
      setHomeExercises('');
      setAbsBlock('');
      setRunKm('');
      setRunMinutes('');
      setRunBpmAvg('');
      setRunBpmMax('');
      setMealName('');
      setMealDescription('');
      setWeight('');
      setWaist('');
      setArm('');
      setHips('');

      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }, [
    activeTab, 
    homeName, homeExercises, absBlock,
    runKm, runMinutes, runBpmAvg, runBpmMax,
    mealName, mealDescription,
    weight, waist, arm, hips,
    addHomeWorkout, addRun, addMeal, addMeasure, onSuccess
  ]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SegmentedControl
        options={tabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HOME WORKOUT */}
        {activeTab === 'home' && (
          <View>
            <InputField
              label="Nom (optionnel)"
              placeholder="Séance chambre"
              value={homeName}
              onChangeText={setHomeName}
            />
            <TextArea
              label="Exercices (ex: Pompes: 3x10)"
              placeholder="Pompes: 3x10&#10;Squats: 3x20&#10;Gainage: 3x45s"
              value={homeExercises}
              onChangeText={setHomeExercises}
              rows={4}
            />
            <TextArea
              label="Bloc abdos (optionnel)"
              placeholder="Crunch 3x20, Leg raises 3x12..."
              value={absBlock}
              onChangeText={setAbsBlock}
              rows={3}
            />
          </View>
        )}

        {/* RUN */}
        {activeTab === 'run' && (
          <View>
            <View style={styles.row}>
              <InputField
                label="Distance (km)"
                placeholder="5.0"
                value={runKm}
                onChangeText={setRunKm}
                keyboardType="decimal-pad"
                containerStyle={styles.halfInput}
              />
              <InputField
                label="Durée (min)"
                placeholder="28"
                value={runMinutes}
                onChangeText={setRunMinutes}
                keyboardType="number-pad"
                containerStyle={styles.halfInput}
              />
            </View>
            <View style={styles.row}>
              <InputField
                label="BPM moyen (opt.)"
                placeholder="150"
                value={runBpmAvg}
                onChangeText={setRunBpmAvg}
                keyboardType="number-pad"
                containerStyle={styles.halfInput}
              />
              <InputField
                label="BPM max (opt.)"
                placeholder="178"
                value={runBpmMax}
                onChangeText={setRunBpmMax}
                keyboardType="number-pad"
                containerStyle={styles.halfInput}
              />
            </View>
          </View>
        )}

        {/* MEAL */}
        {activeTab === 'meal' && (
          <View>
            <InputField
              label="Repas"
              placeholder="Déjeuner"
              value={mealName}
              onChangeText={setMealName}
            />
            <TextArea
              label="Ce que tu as mangé (texte libre)"
              placeholder="Ex: pâtes + poulet + yaourt"
              value={mealDescription}
              onChangeText={setMealDescription}
              rows={4}
            />
          </View>
        )}

        {/* MEASURE */}
        {activeTab === 'measure' && (
          <View>
            <View style={styles.row}>
              <InputField
                label="Poids (kg)"
                placeholder="72.4"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                containerStyle={styles.halfInput}
              />
              <InputField
                label="Tour de taille (cm)"
                placeholder="82"
                value={waist}
                onChangeText={setWaist}
                keyboardType="decimal-pad"
                containerStyle={styles.halfInput}
              />
            </View>
            <View style={styles.row}>
              <InputField
                label="Bras (cm)"
                placeholder="31"
                value={arm}
                onChangeText={setArm}
                keyboardType="decimal-pad"
                containerStyle={styles.halfInput}
              />
              <InputField
                label="Hanches (cm)"
                placeholder="94"
                value={hips}
                onChangeText={setHips}
                keyboardType="decimal-pad"
                containerStyle={styles.halfInput}
              />
            </View>
          </View>
        )}

        <Button
          title="Sauvegarder"
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  submitButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
});
