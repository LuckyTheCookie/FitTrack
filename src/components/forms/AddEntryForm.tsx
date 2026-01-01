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
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'lucide-react-native';
import { InputField, TextArea, Button, SegmentedControl, GlassCard } from '../ui';
import { useAppStore, useGamificationStore } from '../../stores';
import type { EntryType, Entry, HomeWorkoutEntry, RunEntry, BeatSaberEntry, MealEntry, MeasureEntry } from '../../types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';
import { nanoid } from 'nanoid/non-secure';

interface Exercise {
    id: string;
    name: string;
    reps: string;
    sets: string;
}

interface AddEntryFormProps {
    onSuccess?: () => void;
    onDismiss?: () => void;
    initialTab?: EntryType;
    prefillExercises?: string;
    includeAbsBlock?: boolean;
    editEntry?: Entry | null;
}

type TabOption = { value: EntryType; label: string };
type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const tabs: TabOption[] = [
    { value: 'home', label: '🏠 Maison' },
    { value: 'run', label: '🏃 Course' },
    { value: 'beatsaber', label: '🕹️ Beat Saber' },
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
    onDismiss,
    initialTab = 'home',
    prefillExercises = '',
    includeAbsBlock = false,
    editEntry = null,
}: AddEntryFormProps) {
    const isEditMode = editEntry !== null;
    const [activeTab, setActiveTab] = useState<EntryType>(editEntry?.type || initialTab);
    const [loading, setLoading] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [jsonInput, setJsonInput] = useState('');

    // State pour l'intro step - skip intro in edit mode
    const [hasStarted, setHasStarted] = useState(isEditMode);

    // Handler pour le tracking temps réel
    const handleRealTimeTracking = useCallback(() => {
        onDismiss?.();
        router.push('/rep-counter');
    }, [onDismiss]);

    // Parse exercises text to Exercise array for edit mode
    const parseExercisesText = (text: string): Exercise[] => {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length === 0) return [{ id: nanoid(), name: '', reps: '', sets: '3' }];
        return lines.map(line => {
            const match = line.match(/^([^:]+):\s*(\d+)x(.+)$/);
            if (match) {
                return {
                    id: nanoid(),
                    name: match[1].trim(),
                    sets: match[2],
                    reps: match[3].trim(),
                };
            }
            return { id: nanoid(), name: line.trim(), reps: '', sets: '3' };
        });
    };

    // Initialize values based on editEntry
    const getInitialHomeWorkout = () => {
        if (editEntry?.type === 'home') {
            const e = editEntry as HomeWorkoutEntry;
            return {
                name: e.name || '',
                duration: e.durationMinutes?.toString() || '',
                exercises: parseExercisesText(e.exercises),
                absBlock: !!e.absBlock,
            };
        }
        return { name: '', duration: '', exercises: [{ id: nanoid(), name: '', reps: '', sets: '3' }], absBlock: includeAbsBlock };
    };

    const getInitialRun = () => {
        if (editEntry?.type === 'run') {
            const e = editEntry as RunEntry;
            return {
                km: e.distanceKm.toString(),
                minutes: e.durationMinutes.toString(),
                bpmAvg: e.bpmAvg?.toString() || '',
                bpmMax: e.bpmMax?.toString() || '',
                cardiacLoad: e.cardiacLoad?.toString() || '',
            };
        }
        return { km: '', minutes: '', bpmAvg: '', bpmMax: '', cardiacLoad: '' };
    };

    const getInitialBeatSaber = () => {
        if (editEntry?.type === 'beatsaber') {
            const e = editEntry as BeatSaberEntry;
            return {
                duration: e.durationMinutes.toString(),
                cardiacLoad: e.cardiacLoad?.toString() || '',
                bpmAvg: e.bpmAvg?.toString() || '',
                bpmMax: e.bpmMax?.toString() || '',
            };
        }
        return { duration: '', cardiacLoad: '', bpmAvg: '', bpmMax: '' };
    };

    const getInitialMeal = () => {
        if (editEntry?.type === 'meal') {
            const e = editEntry as MealEntry;
            const mealTimeKey = (Object.entries(mealTimeLabels).find(([_, v]) => v === e.mealName)?.[0] || 'lunch') as MealTime;
            return { time: mealTimeKey, description: e.description };
        }
        return { time: 'lunch' as MealTime, description: '' };
    };

    const getInitialMeasure = () => {
        if (editEntry?.type === 'measure') {
            const e = editEntry as MeasureEntry;
            return {
                weight: e.weight?.toString() || '',
                waist: e.waist?.toString() || '',
                arm: e.arm?.toString() || '',
                hips: e.hips?.toString() || '',
            };
        }
        return { weight: '', waist: '', arm: '', hips: '' };
    };

    const initialHome = getInitialHomeWorkout();
    const initialRun = getInitialRun();
    const initialBs = getInitialBeatSaber();
    const initialMeal = getInitialMeal();
    const initialMeasure = getInitialMeasure();

    // Home workout - nouveau format
    const [homeName, setHomeName] = useState(initialHome.name);
    const [homeDuration, setHomeDuration] = useState(initialHome.duration);
    const [exercises, setExercises] = useState<Exercise[]>(initialHome.exercises);
    const [withAbsBlock, setWithAbsBlock] = useState(initialHome.absBlock);

    // Run
    const [runKm, setRunKm] = useState(initialRun.km);
    const [runMinutes, setRunMinutes] = useState(initialRun.minutes);
    const [runBpmAvg, setRunBpmAvg] = useState(initialRun.bpmAvg);
    const [runBpmMax, setRunBpmMax] = useState(initialRun.bpmMax);
    const [runCardiacLoad, setRunCardiacLoad] = useState(initialRun.cardiacLoad);

    // Beat Saber
    const [bsDuration, setBsDuration] = useState(initialBs.duration);
    const [bsCardiacLoad, setBsCardiacLoad] = useState(initialBs.cardiacLoad);
    const [bsBpmAvg, setBsBpmAvg] = useState(initialBs.bpmAvg);
    const [bsBpmMax, setBsBpmMax] = useState(initialBs.bpmMax);

    // Meal
    const [mealTime, setMealTime] = useState<MealTime>(initialMeal.time);
    const [mealDescription, setMealDescription] = useState(initialMeal.description);

    // Measure
    const [weight, setWeight] = useState(initialMeasure.weight);
    const [waist, setWaist] = useState(initialMeasure.waist);
    const [arm, setArm] = useState(initialMeasure.arm);
    const [hips, setHips] = useState(initialMeasure.hips);

    const { addHomeWorkout, addRun, addBeatSaber, addMeal, addMeasure, updateEntry } = useAppStore();
    const { addXp, updateQuestProgress } = useGamificationStore();

    // Ajouter un exercice
    const addExercise = () => {
        setExercises([...exercises, { id: nanoid(), name: '', reps: '', sets: '3' }]);
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
            .map(ex => `${ex.name}: ${ex.sets}x${ex.reps} `)
            .join('\n');
    };

    // Import JSON
    const handleImport = () => {
        try {
            const data = JSON.parse(jsonInput);
            if (data.exercises && Array.isArray(data.exercises)) {
                const newExercises = data.exercises.map((ex: any) => ({
                    id: nanoid(),
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
                    const homeTotalReps = validExercises.reduce((acc, curr) => acc + (parseInt(curr.sets) * parseInt(curr.reps) || 0), 0);
                    
                    const homeDurationClean = homeDuration.trim().replace(',', '.');
                    const homeDurationMinutes = homeDurationClean ? Math.round(parseFloat(homeDurationClean)) : undefined;
                    
                    if (homeDurationClean && (isNaN(homeDurationMinutes!) || homeDurationMinutes! <= 0)) {
                        Alert.alert('Erreur', 'Durée invalide - entre un nombre de minutes positif');
                        return;
                    }
                    
                    if (isEditMode && editEntry) {
                        updateEntry(editEntry.id, {
                            name: homeName.trim() || undefined,
                            exercises: exercisesText,
                            absBlock: withAbsBlock ? 'Bloc abdos inclus' : undefined,
                            totalReps: homeTotalReps > 0 ? homeTotalReps : undefined,
                            durationMinutes: homeDurationMinutes && homeDurationMinutes > 0 ? homeDurationMinutes : undefined,
                        });
                    } else {
                        addHomeWorkout({
                            name: homeName.trim() || undefined,
                            exercises: exercisesText,
                            absBlock: withAbsBlock ? 'Bloc abdos inclus' : undefined,
                            totalReps: homeTotalReps > 0 ? homeTotalReps : undefined,
                            durationMinutes: homeDurationMinutes && homeDurationMinutes > 0 ? homeDurationMinutes : undefined,
                        });
                    }
                    break;

                case 'run':
                    const kmClean = runKm.trim().replace(',', '.');
                    const minutesClean = runMinutes.trim().replace(',', '.');
                    const km = parseFloat(kmClean);
                    const minutes = Math.round(parseFloat(minutesClean));
                    
                    if (isNaN(km) || km <= 0 || !kmClean) {
                        Alert.alert('Erreur', 'Distance invalide');
                        return;
                    }
                    if (isNaN(minutes) || minutes <= 0 || !minutesClean) {
                        Alert.alert('Erreur', 'Durée invalide');
                        return;
                    }
                    const avgSpeed = minutes > 0 ? Math.round((km / (minutes / 60)) * 10) / 10 : 0;
                    
                    if (isEditMode && editEntry) {
                        updateEntry(editEntry.id, {
                            distanceKm: km,
                            durationMinutes: minutes,
                            avgSpeed,
                            bpmAvg: runBpmAvg ? parseInt(runBpmAvg, 10) : undefined,
                            bpmMax: runBpmMax ? parseInt(runBpmMax, 10) : undefined,
                            cardiacLoad: runCardiacLoad ? parseInt(runCardiacLoad, 10) : undefined,
                        });
                    } else {
                        addRun({
                            distanceKm: km,
                            durationMinutes: minutes,
                            bpmAvg: runBpmAvg ? parseInt(runBpmAvg, 10) : undefined,
                            bpmMax: runBpmMax ? parseInt(runBpmMax, 10) : undefined,
                            cardiacLoad: runCardiacLoad ? parseInt(runCardiacLoad, 10) : undefined,
                        });
                    }
                    break;

                case 'beatsaber':
                    const bsDurationClean = bsDuration.trim().replace(',', '.');
                    const bsMinutes = parseFloat(bsDurationClean);
                    
                    if (isNaN(bsMinutes) || bsMinutes <= 0 || !bsDurationClean) {
                        Alert.alert('Erreur', 'Durée invalide - entre un nombre de minutes');
                        return;
                    }

                    const bsMinutesRounded = Math.max(1, Math.round(bsMinutes));

                    if (isEditMode && editEntry) {
                        updateEntry(editEntry.id, {
                            durationMinutes: bsMinutesRounded,
                            cardiacLoad: bsCardiacLoad ? parseInt(bsCardiacLoad, 10) : undefined,
                            bpmAvg: bsBpmAvg ? parseInt(bsBpmAvg, 10) : undefined,
                            bpmMax: bsBpmMax ? parseInt(bsBpmMax, 10) : undefined,
                        });
                    } else {
                        addBeatSaber({
                            durationMinutes: bsMinutesRounded,
                            cardiacLoad: bsCardiacLoad ? parseInt(bsCardiacLoad, 10) : undefined,
                            bpmAvg: bsBpmAvg ? parseInt(bsBpmAvg, 10) : undefined,
                            bpmMax: bsBpmMax ? parseInt(bsBpmMax, 10) : undefined,
                        });

                        addXp(15 + Math.floor(bsMinutesRounded / 5), `Beat Saber (${bsMinutesRounded}min)`);
                        updateQuestProgress('duration', bsMinutesRounded);
                        updateQuestProgress('workouts', 1);
                    }
                    break;

                case 'meal':
                    if (!mealDescription.trim()) {
                        Alert.alert('Erreur', 'Décris ce que tu as mangé');
                        return;
                    }
                    if (isEditMode && editEntry) {
                        updateEntry(editEntry.id, {
                            mealName: mealTimeLabels[mealTime],
                            description: mealDescription.trim(),
                        });
                    } else {
                        addMeal({
                            mealName: mealTimeLabels[mealTime],
                            description: mealDescription.trim(),
                        });
                    }
                    break;

                case 'measure':
                    const wClean = weight.trim().replace(',', '.');
                    const waistClean = waist.trim().replace(',', '.');
                    const armClean = arm.trim().replace(',', '.');
                    const hipsClean = hips.trim().replace(',', '.');

                    const hasAnyMeasure = wClean || waistClean || armClean || hipsClean;
                    if (!hasAnyMeasure) {
                        Alert.alert('Erreur', 'Ajoute au moins une mesure');
                        return;
                    }

                    const data = {
                        weight: wClean ? parseFloat(wClean) : undefined,
                        waist: waistClean ? parseFloat(waistClean) : undefined,
                        arm: armClean ? parseFloat(armClean) : undefined,
                        hips: hipsClean ? parseFloat(hipsClean) : undefined,
                    };

                    if (isEditMode && editEntry) {
                        updateEntry(editEntry.id, data);
                    } else {
                        addMeasure(data);
                    }
                    break;
            }

            if (!isEditMode) {
                if (activeTab === 'home') {
                    addXp(50, `Séance maison : ${homeName || 'Workout'}`);
                    updateQuestProgress('workouts', 1);
                    const reps = exercises.filter(ex => ex.name.trim()).reduce((acc, curr) => acc + (parseInt(curr.sets) * parseInt(curr.reps) || 0), 0);
                    if (reps > 0) updateQuestProgress('exercises', reps);
                } else if (activeTab === 'run') {
                    const km = parseFloat(runKm.trim().replace(',', '.'));
                    addXp(30 + Math.floor(km * 5), `Running (${km}km)`);
                    updateQuestProgress('workouts', 1);
                }
            }

            setHomeName('');
            setHomeDuration('');
            setExercises([{ id: nanoid(), name: '', reps: '', sets: '3' }]);
            setWithAbsBlock(false);
            setRunKm('');
            setRunMinutes('');
            setRunBpmAvg('');
            setRunBpmMax('');
            setRunCardiacLoad('');
            setBsDuration('');
            setBsCardiacLoad('');
            setBsBpmAvg('');
            setBsBpmMax('');
            setMealDescription('');
            setWeight('');
            setWaist('');
            setArm('');
            setHips('');

            setHasStarted(false);
            onSuccess?.();
        } finally {
            setLoading(false);
        }
    }, [
        activeTab,
        homeName, homeDuration, exercises, withAbsBlock, // AJOUTÉ : homeDuration
        runKm, runMinutes, runBpmAvg, runBpmMax, runCardiacLoad, // AJOUTÉ : runCardiacLoad
        bsDuration, bsCardiacLoad, bsBpmAvg, bsBpmMax, // AJOUTÉ : bsDuration et les autres
        mealTime, mealDescription,
        weight, waist, arm, hips,
        addHomeWorkout, addRun, addBeatSaber, addMeal, addMeasure, updateEntry, // AJOUTÉ : addBeatSaber (par sécurité)
        onSuccess, addXp, updateQuestProgress, isEditMode, editEntry
    ]);

    const handleStartActivity = (type: EntryType) => {
        setActiveTab(type);
        setHasStarted(true);
    };

    if (!hasStarted) {
        return (
            <View style={styles.introContainer}>
                <Text style={styles.introTitle}>Que veux-tu ajouter ?</Text>
                <Text style={styles.introSubtitle}>Choisis une activité</Text>

                <TouchableOpacity
                    style={styles.realTimeButton}
                    onPress={handleRealTimeTracking}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={[Colors.cta, Colors.cta2]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.realTimeButtonGradient}
                    >
                        <Video size={24} color="#fff" />
                        <View style={styles.realTimeButtonText}>
                            <Text style={styles.realTimeButtonTitle}>Tracking temps réel</Text>
                            <Text style={styles.realTimeButtonSubtitle}>Détection IA par caméra</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.orText}>— ou ajoute manuellement —</Text>
                <ScrollView
                    nestedScrollEnabled={true}
                    contentContainerStyle={{ flexGrow: 1 }}
                >    
                <View style={styles.activityGrid}>
                    {tabs.map((tab) => (
                        <TouchableOpacity
                            key={tab.value}
                            style={styles.activityTouch}
                            onPress={() => handleStartActivity(tab.value)}
                        >
                            <GlassCard style={styles.activityCard}>
                                <Text style={styles.activityEmoji}>{tab.label.split(' ')[0]}</Text>
                                <Text style={styles.activityLabel}>{tab.label.split(' ').slice(1).join(' ')}</Text>
                            </GlassCard>
                        </TouchableOpacity>
                    ))}
                </View>
                </ScrollView>            
            </View>
        );
    }

    const currentTabLabel = tabs.find(t => t.value === activeTab)?.label || 'Nouvelle entrée';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => setHasStarted(false)} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Retour</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{currentTabLabel}</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* HOME WORKOUT - Nouveau format */}
                {activeTab === 'home' && (
                    <View>
                        <View style={styles.rowInputs}>
                            <InputField
                                label="Nom de la séance (optionnel)"
                                placeholder="Séance chambre"
                                value={homeName}
                                onChangeText={setHomeName}
                                containerStyle={styles.flexInput}
                            />
                            <InputField
                                label="Durée (min)"
                                placeholder="30"
                                value={homeDuration}
                                onChangeText={setHomeDuration}
                                keyboardType="number-pad"
                                containerStyle={styles.durationInput}
                            />
                        </View>

                        <Text style={styles.sectionLabel}>Exercices</Text>
                        {exercises.map((ex, index) => (
                            <View key={ex.id} style={styles.exerciseRow}>
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

                        <View style={styles.row}>
                            <InputField
                                label="Charge cardiaque (opt.)"
                                placeholder="120"
                                value={runCardiacLoad}
                                onChangeText={setRunCardiacLoad}
                                keyboardType="number-pad"
                                containerStyle={styles.halfInput}
                            />
                        </View>
                    </View>
                )}

                {/* BEAT SABER */}
                {activeTab === 'beatsaber' && (
                    <View>
                        <View style={styles.row}>
                            <InputField
                                label="Durée (min)"
                                placeholder="10"
                                value={bsDuration}
                                onChangeText={setBsDuration}
                                keyboardType="decimal-pad"
                                containerStyle={styles.halfInput}
                            />
                            <InputField
                                label="Charge cardiaque (opt.)"
                                placeholder="120"
                                value={bsCardiacLoad}
                                onChangeText={setBsCardiacLoad}
                                keyboardType="number-pad"
                                containerStyle={styles.halfInput}
                            />
                        </View>

                        <View style={styles.row}>
                            <InputField
                                label="BPM moyen (opt.)"
                                placeholder="140"
                                value={bsBpmAvg}
                                onChangeText={setBsBpmAvg}
                                keyboardType="number-pad"
                                containerStyle={styles.halfInput}
                            />
                            <InputField
                                label="BPM max (opt.)"
                                placeholder="165"
                                value={bsBpmMax}
                                onChangeText={setBsBpmMax}
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
                    title={isEditMode ? "Mettre à jour" : "Sauvegarder"}
                    variant="primary"
                    onPress={handleSubmit}
                    loading={loading}
                    style={styles.submitButton}
                />
            </ScrollView>

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
    rowInputs: {
        flexDirection: 'row',
        gap: Spacing.md,
        alignItems: 'flex-end',
    },
    flexInput: {
        flex: 1,
    },
    durationInput: {
        width: 80,
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
    introContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
        minHeight: 300,
    },
    introTitle: {
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    introSubtitle: {
        fontSize: FontSize.lg,
        color: Colors.muted,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    realTimeButton: {
        width: '100%',
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
        shadowColor: Colors.cta,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    realTimeButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        gap: Spacing.md,
    },
    realTimeButtonText: {
        flex: 1,
    },
    realTimeButtonTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
    realTimeButtonSubtitle: {
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    orText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    activityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
        width: '100%',
    },
    activityTouch: {
        width: '45%',
        aspectRatio: 1.1,
    },
    activityCard: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)', // Slightly lighter than default glass
    },
    activityEmoji: {
        fontSize: 48,
        marginBottom: 4,
    },
    activityLabel: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.sm,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.overlay,
    },
    backButtonText: {
        color: Colors.muted,
        fontWeight: FontWeight.medium,
    },
    headerTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
});
