// ============================================================================
// FORMULAIRES D'AJOUT - Avec nouveau format exercices + import JSON
// ============================================================================

import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { InputField, TextArea, Button, SegmentedControl } from '../ui';
import { useAppStore } from '../../stores';
import type { EntryType } from '../../types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';

interface Exercise {
  name: string;
  reps: string;
  sets: string;
}

interface AddEntryFormProps {
  onSuccess?: () => void;
  initialTab?: EntryType;
  prefillExercises?: string;
  includeAbsBlock?: boolean;
}

type TabOption = { value: EntryType; label: string };
type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const tabs: TabOption[] = [
  { value: 'home', label: '🏠 Maison' },
  { value: 'run', label: '🏃 Course' },
  { value: 'meal', label: '🍽️ Repas' },
  { value: 'measure', label: '📏 Mesures' },
];

const mealTimeLabels: Record<MealTime, string> = {
  breakfast: '☀️ Petit-déj',
  lunch: '🌤️ Déjeuner',
  dinner: '🌙 Dîner',
  snack: '🍎 Collation',
};

const EXAMPLE_JSON = `{
  "exercises": [
    { "name": "Pompes", "sets": 3, "reps": 12 },
    { "name": "Squats", "sets": 4, "reps": 20 },
    { "name": "Gainage", "sets": 3, "reps": "45s" }
  ],
  "includeAbsBlock": true
}`;

export function AddEntryForm({ 
  onSuccess, 
  initialTab = 'home',
  prefillExercises = '',
  includeAbsBlock = false,
}: AddEntryFormProps) {
  const [activeTab, setActiveTab] = useState<EntryType>(initialTab);
  const [loading, setLoading] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  // Home workout - nouveau format
  const [homeName, setHomeName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', reps: '', sets: '3' }
  ]);
  const [withAbsBlock, setWithAbsBlock] = useState(includeAbsBlock);

  // Run
  const [runKm, setRunKm] = useState('');
  const [runMinutes, setRunMinutes] = useState('');
  const [runBpmAvg, setRunBpmAvg] = useState('');
  const [runBpmMax, setRunBpmMax] = useState('');

  // Meal
  const [mealTime, setMealTime] = useState<MealTime>('lunch');
  const [mealDescription, setMealDescription] = useState('');

  // Measure
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [arm, setArm] = useState('');
  const [hips, setHips] = useState('');

  const { addHomeWorkout, addRun, addMeal, addMeasure } = useAppStore();

  // Ajouter un exercice
  const addExercise = () => {
    setExercises([...exercises, { name: '', reps: '', sets: '3' }]);
  };

  // Supprimer un exercice
  const removeExercise = (index: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  // Mettre à jour un exercice
  const updateExercise = (index: number, field: keyof Exercise, value: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], [field]: value };
    setExercises(updated);
  };

  // Format exercices en texte
  const formatExercisesToText = (exs: Exercise[]): string => {
    return exs
      .filter(ex => ex.name.trim())
      .map(ex => `${ex.name}: ${ex.sets}x${ex.reps}`)
      .join('\n');
  };

  // Import JSON
  const handleImport = () => {
    try {
      const data = JSON.parse(jsonInput);
      if (data.exercises && Array.isArray(data.exercises)) {
        const newExercises = data.exercises.map((ex: any) => ({
          name: ex.name || '',
          reps: String(ex.reps || ''),
          sets: String(ex.sets || 3),
        }));
        setExercises(newExercises);
        if (data.includeAbsBlock !== undefined) {
          setWithAbsBlock(data.includeAbsBlock);
        }
        setImportModalVisible(false);
        setJsonInput('');
        Alert.alert('Importé !', `${newExercises.length} exercices ajoutés`);
      } else {
        Alert.alert('Erreur', 'Format JSON invalide');
      }
    } catch (e) {
      Alert.alert('Erreur', 'JSON invalide');
    }
  };

  // Copier exemple JSON
  const copyExample = async () => {
    await Clipboard.setStringAsync(EXAMPLE_JSON);
    Alert.alert('Copié !', 'Exemple JSON copié dans le presse-papiers');
  };

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'home':
          const validExercises = exercises.filter(ex => ex.name.trim());
          if (validExercises.length === 0) {
            Alert.alert('Erreur', 'Ajoute au moins un exercice');
            return;
          }
          const exercisesText = formatExercisesToText(validExercises);
          addHomeWorkout({
            name: homeName.trim() || undefined,
            exercises: exercisesText,
            absBlock: withAbsBlock ? 'Bloc abdos inclus' : undefined,
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
          if (!mealDescription.trim()) {
            Alert.alert('Erreur', 'Décris ce que tu as mangé');
            return;
          }
          addMeal({
            mealName: mealTimeLabels[mealTime],
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
      setExercises([{ name: '', reps: '', sets: '3' }]);
      setWithAbsBlock(false);
      setRunKm('');
      setRunMinutes('');
      setRunBpmAvg('');
      setRunBpmMax('');
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
    homeName, exercises, withAbsBlock,
    runKm, runMinutes, runBpmAvg, runBpmMax,
    mealTime, mealDescription,
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
        {/* HOME WORKOUT - Nouveau format */}
        {activeTab === 'home' && (
          <View>
            <InputField
              label="Nom de la séance (optionnel)"
              placeholder="Séance chambre"
              value={homeName}
              onChangeText={setHomeName}
            />
            
            <Text style={styles.sectionLabel}>Exercices</Text>
            {exercises.map((ex, index) => (
              <View key={index} style={styles.exerciseRow}>
                <InputField
                  placeholder="Exercice"
                  value={ex.name}
                  onChangeText={(v) => updateExercise(index, 'name', v)}
                  containerStyle={styles.exerciseNameInput}
                />
                <InputField
                  placeholder="3"
                  value={ex.sets}
                  onChangeText={(v) => updateExercise(index, 'sets', v)}
                  keyboardType="number-pad"
                  containerStyle={styles.setsInput}
                />
                <Text style={styles.xText}>×</Text>
                <InputField
                  placeholder="12"
                  value={ex.reps}
                  onChangeText={(v) => updateExercise(index, 'reps', v)}
                  containerStyle={styles.repsInput}
                />
                {exercises.length > 1 && (
                  <TouchableOpacity 
                    onPress={() => removeExercise(index)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            <View style={styles.actionButtons}>
              <Button
                title="+ Ajouter exercice"
                variant="ghost"
                onPress={addExercise}
                style={styles.addButton}
              />
              <Button
                title="📥 Importer JSON"
                variant="ghost"
                onPress={() => setImportModalVisible(true)}
                style={styles.importButton}
              />
            </View>

            {/* Toggle bloc abdos */}
            <TouchableOpacity 
              style={styles.absToggle}
              onPress={() => setWithAbsBlock(!withAbsBlock)}
            >
              <View style={[styles.checkbox, withAbsBlock && styles.checkboxChecked]}>
                {withAbsBlock && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.absToggleText}>Inclure bloc abdos</Text>
            </TouchableOpacity>
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

        {/* MEAL - Avec sélection moment */}
        {activeTab === 'meal' && (
          <View>
            <Text style={styles.sectionLabel}>Moment du repas</Text>
            <View style={styles.mealTimeRow}>
              {(Object.keys(mealTimeLabels) as MealTime[]).map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.mealTimeButton, mealTime === time && styles.mealTimeButtonActive]}
                  onPress={() => setMealTime(time)}
                >
                  <Text style={[styles.mealTimeText, mealTime === time && styles.mealTimeTextActive]}>
                    {mealTimeLabels[time]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextArea
              label="Ce que tu as mangé"
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

      {/* Modal import JSON */}
      <Modal
        visible={importModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <Pressable 
          style={styles.modalBackdrop}
          onPress={() => setImportModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Importer une séance</Text>
            <Text style={styles.modalSubtitle}>Colle un JSON avec tes exercices</Text>
            
            <TextArea
              placeholder="{ exercices: [...] }"
              value={jsonInput}
              onChangeText={setJsonInput}
              rows={6}
            />
            
            <View style={styles.modalButtons}>
              <Button
                title="📋 Copier exemple"
                variant="ghost"
                onPress={copyExample}
                style={styles.modalButton}
              />
              <Button
                title="Importer"
                variant="primary"
                onPress={handleImport}
                style={styles.modalButton}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
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
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.muted,
    marginBottom: 8,
    marginTop: Spacing.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  exerciseNameInput: {
    flex: 2,
    marginBottom: 0,
  },
  setsInput: {
    width: 50,
    marginBottom: 0,
  },
  xText: {
    color: Colors.muted,
    fontSize: FontSize.lg,
  },
  repsInput: {
    width: 60,
    marginBottom: 0,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(248, 113, 113, 0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: Colors.error,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addButton: {
    flex: 1,
  },
  importButton: {
    flex: 1,
  },
  absToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: Spacing.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.cta,
    borderColor: Colors.cta,
  },
  checkmark: {
    color: '#fff',
    fontWeight: FontWeight.bold,
    fontSize: 14,
  },
  absToggleText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  mealTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  mealTimeButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  mealTimeButtonActive: {
    backgroundColor: 'rgba(227, 160, 144, 0.20)',
    borderColor: Colors.cta,
  },
  mealTimeText: {
    color: Colors.muted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  mealTimeTextActive: {
    color: Colors.cta,
  },
  submitButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.cardSolid,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: Spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
