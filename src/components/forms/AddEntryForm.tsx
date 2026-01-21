// ============================================================================
// FORMULAIRES D'AJOUT - Avec nouveau format exercices + import JSON
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, Calendar, Clock, ChevronLeft, Dumbbell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { InputField, TextArea, Button, SegmentedControl, GlassCard } from '../ui';
import { useAppStore, useGamificationStore, useSportsConfig } from '../../stores';
import type { EntryType, Entry, HomeWorkoutEntry, RunEntry, BeatSaberEntry, MealEntry, MeasureEntry, SportConfig } from '../../types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';
import { nanoid } from 'nanoid/non-secure';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

// Category type for first selection screen
type CategoryType = 'sport' | 'meal' | 'measure';

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

const mealTimeLabels: Record<MealTime, string> = {
    breakfast: '☀️ Petit-déj',
    lunch: '🌤️ Déjeuner',
    dinner: '🌙 Dîner',
    snack: '🍎 Collation',
};

// Note: `tabs` uses `t()` and is created inside the component so it can access the hook.

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
    const { t } = useTranslation();
    const isEditMode = editEntry !== null;
    const [activeTab, setActiveTab] = useState<EntryType>(editEntry?.type || initialTab);
    const sportsConfig = useSportsConfig();

    // Get visible sports only
    const visibleSports = useMemo(() => 
        sportsConfig.filter((s: SportConfig) => !s.isHidden),
        [sportsConfig]
    );

    // Tabs need translation, create them here
    const tabs: TabOption[] = [
        { value: 'home', label: t('addEntry.home') },
        { value: 'run', label: t('addEntry.run') },
        { value: 'beatsaber', label: t('addEntry.beatsaber') },
        { value: 'meal', label: t('addEntry.meal') },
        { value: 'measure', label: t('addEntry.measure') },
    ];

    // Localized meal time labels
    const mealTimeLabelsLocalized: Record<MealTime, string> = {
        breakfast: t('addEntry.mealTimes.breakfast'),
        lunch: t('addEntry.mealTimes.lunch'),
        dinner: t('addEntry.mealTimes.dinner'),
        snack: t('addEntry.mealTimes.snack'),
    };
    const [loading, setLoading] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [jsonInput, setJsonInput] = useState('');

    // State pour l'intro step - skip intro in edit mode
    const [hasStarted, setHasStarted] = useState(isEditMode);
    
    // New state for category selection flow
    const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);

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
                bodyFatPercent: e.bodyFatPercent?.toString() || '',
                waist: e.waist?.toString() || '',
                arm: e.arm?.toString() || '',
                hips: e.hips?.toString() || '',
            };
        }
        return { weight: '', bodyFatPercent: '', waist: '', arm: '', hips: '' };
    };

    const initialHome = getInitialHomeWorkout();
    const initialRun = getInitialRun();
    const initialBs = getInitialBeatSaber();
    const initialMeal = getInitialMeal();
    const initialMeasure = getInitialMeasure();

    // Date/heure personnalisée
    const [useCustomDateTime, setUseCustomDateTime] = useState(!!editEntry);
    const [customDate, setCustomDate] = useState(editEntry?.date || format(new Date(), 'yyyy-MM-dd'));
    const [customTime, setCustomTime] = useState(editEntry ? format(new Date(editEntry.createdAt), 'HH:mm') : format(new Date(), 'HH:mm'));
    
    // Date/Time picker visibility (for native pickers)
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    
    // Helper to convert customDate string to Date object
    const customDateAsDate = useMemo(() => {
        const parts = customDate.split('-');
        if (parts.length === 3) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date();
    }, [customDate]);
    
    // Helper to convert customTime string to Date object
    const customTimeAsDate = useMemo(() => {
        const parts = customTime.split(':');
        const date = new Date();
        if (parts.length === 2) {
            date.setHours(parseInt(parts[0]), parseInt(parts[1]));
        }
        return date;
    }, [customTime]);
    
    // Date picker change handler
    const onDateChange = useCallback((event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setCustomDate(format(selectedDate, 'yyyy-MM-dd'));
        }
    }, []);
    
    // Time picker change handler
    const onTimeChange = useCallback((event: any, selectedTime?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            setCustomTime(format(selectedTime, 'HH:mm'));
        }
    }, []);

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
    const [bodyFatPercent, setBodyFatPercent] = useState(initialMeasure.bodyFatPercent);
    const [waist, setWaist] = useState(initialMeasure.waist);
    const [arm, setArm] = useState(initialMeasure.arm);
    const [hips, setHips] = useState(initialMeasure.hips);

    // Custom sport state
    const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
    const [customSportName, setCustomSportName] = useState('');
    const [customDuration, setCustomDuration] = useState('');
    const [customDistance, setCustomDistance] = useState('');
    const [customBpmAvg, setCustomBpmAvg] = useState('');
    const [customBpmMax, setCustomBpmMax] = useState('');
    const [customCardiacLoad, setCustomCardiacLoad] = useState('');
    const [customCalories, setCustomCalories] = useState('');
    const [customExercises, setCustomExercises] = useState('');
    const [customTotalReps, setCustomTotalReps] = useState('');

    const { addHomeWorkout, addRun, addBeatSaber, addMeal, addMeasure, addCustomSport, updateEntry } = useAppStore();
    // Note: Les fonctions add* gèrent automatiquement la gamification (XP + quêtes)

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
                Alert.alert(t('addEntry.imported'), t('addEntry.exercises', { count: newExercises.length }));
            } else {
                Alert.alert(t('addEntry.invalid'), t('addEntry.invalidJSON'));
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
        
        // Calculer la date personnalisée si activée (format YYYY-MM-DD)
        const entryDate = useCustomDateTime ? format(customDate, 'yyyy-MM-dd') : undefined;
        
        try {
            switch (activeTab) {
                case 'home':
                    const validExercises = exercises.filter(ex => ex.name.trim());
                    if (validExercises.length === 0) {
                        Alert.alert(t('common.error'), t('addEntry.error.noExercise'));
                        return;
                    }
                    const exercisesText = formatExercisesToText(validExercises);
                    const homeTotalReps = validExercises.reduce((acc, curr) => acc + (parseInt(curr.sets) * parseInt(curr.reps) || 0), 0);
                    
                    const homeDurationClean = homeDuration.trim().replace(',', '.');
                    const homeDurationMinutes = homeDurationClean ? Math.round(parseFloat(homeDurationClean)) : undefined;
                    
                    if (homeDurationClean && (isNaN(homeDurationMinutes!) || homeDurationMinutes! <= 0)) {
                        Alert.alert(t('common.error'), t('addEntry.durationErrorPositive'));
                        return;
                    }
                    
                    if (isEditMode && editEntry) {
                        updateEntry(editEntry.id, {
                            name: homeName.trim() || undefined,
                            exercises: exercisesText,
                            absBlock: withAbsBlock ? 'Bloc abdos inclus' : undefined,
                            totalReps: homeTotalReps > 0 ? homeTotalReps : undefined,
                            durationMinutes: homeDurationMinutes && homeDurationMinutes > 0 ? homeDurationMinutes : undefined,
                            date: entryDate || editEntry.date,
                        });
                    } else {
                        addHomeWorkout({
                            name: homeName.trim() || undefined,
                            exercises: exercisesText,
                            absBlock: withAbsBlock ? 'Bloc abdos inclus' : undefined,
                            totalReps: homeTotalReps > 0 ? homeTotalReps : undefined,
                            durationMinutes: homeDurationMinutes && homeDurationMinutes > 0 ? homeDurationMinutes : undefined,
                        }, entryDate);
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
                        Alert.alert(t('common.error'), t('addEntry.durationError'));
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
                            date: entryDate || editEntry.date,
                        });
                    } else {
                        addRun({
                            distanceKm: km,
                            durationMinutes: minutes,
                            bpmAvg: runBpmAvg ? parseInt(runBpmAvg, 10) : undefined,
                            bpmMax: runBpmMax ? parseInt(runBpmMax, 10) : undefined,
                            cardiacLoad: runCardiacLoad ? parseInt(runCardiacLoad, 10) : undefined,
                        }, entryDate);
                    }
                    break;

                case 'beatsaber':
                    const bsDurationClean = bsDuration.trim().replace(',', '.');
                    const bsMinutes = parseFloat(bsDurationClean);
                    
                    if (isNaN(bsMinutes) || bsMinutes <= 0 || !bsDurationClean) {
                        Alert.alert(t('common.error'), t('addEntry.durationErrorNumber'));
                        return;
                    }

                    const bsMinutesRounded = Math.max(1, Math.round(bsMinutes));

                    if (isEditMode && editEntry) {
                        updateEntry(editEntry.id, {
                            durationMinutes: bsMinutesRounded,
                            cardiacLoad: bsCardiacLoad ? parseInt(bsCardiacLoad, 10) : undefined,
                            bpmAvg: bsBpmAvg ? parseInt(bsBpmAvg, 10) : undefined,
                            bpmMax: bsBpmMax ? parseInt(bsBpmMax, 10) : undefined,
                            date: entryDate || editEntry.date,
                        });
                    } else {
                        addBeatSaber({
                            durationMinutes: bsMinutesRounded,
                            cardiacLoad: bsCardiacLoad ? parseInt(bsCardiacLoad, 10) : undefined,
                            bpmAvg: bsBpmAvg ? parseInt(bsBpmAvg, 10) : undefined,
                            bpmMax: bsBpmMax ? parseInt(bsBpmMax, 10) : undefined,
                        }, entryDate);
                        // XP et quêtes gérés automatiquement par addBeatSaber
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
                            date: entryDate || editEntry.date,
                        });
                    } else {
                        addMeal({
                            mealName: mealTimeLabels[mealTime],
                            description: mealDescription.trim(),
                        }, entryDate);
                    }
                    break;

                case 'measure':
                    const wClean = weight.trim().replace(',', '.');
                    const bfClean = bodyFatPercent.trim().replace(',', '.');
                    const waistClean = waist.trim().replace(',', '.');
                    const armClean = arm.trim().replace(',', '.');
                    const hipsClean = hips.trim().replace(',', '.');

                    const hasAnyMeasure = wClean || bfClean || waistClean || armClean || hipsClean;
                    if (!hasAnyMeasure) {
                        Alert.alert('Erreur', 'Ajoute au moins une mesure');
                        return;
                    }

                    const data = {
                        weight: wClean ? parseFloat(wClean) : undefined,
                        bodyFatPercent: bfClean ? parseFloat(bfClean) : undefined,
                        waist: waistClean ? parseFloat(waistClean) : undefined,
                        arm: armClean ? parseFloat(armClean) : undefined,
                        hips: hipsClean ? parseFloat(hipsClean) : undefined,
                    };

                    if (isEditMode && editEntry) {
                        updateEntry(editEntry.id, { ...data, date: entryDate || editEntry.date });
                    } else {
                        addMeasure(data, entryDate);
                    }
                    break;

                case 'custom':
                    if (!selectedSportId) {
                        Alert.alert(t('common.error'), 'Aucun sport sélectionné');
                        return;
                    }

                    const selectedSport = sportsConfig.find((s: SportConfig) => s.id === selectedSportId);
                    if (!selectedSport) {
                        Alert.alert(t('common.error'), 'Sport introuvable');
                        return;
                    }

                    // Build custom entry data based on tracking fields
                    const customData: any = {
                        sportId: selectedSportId,
                        name: customSportName.trim() || undefined,
                    };

                    if (selectedSport.trackingFields.includes('duration') && customDuration) {
                        const durationClean = customDuration.trim().replace(',', '.');
                        const duration = Math.round(parseFloat(durationClean));
                        if (isNaN(duration) || duration <= 0) {
                            Alert.alert(t('common.error'), t('addEntry.durationErrorPositive'));
                            return;
                        }
                        customData.durationMinutes = duration;
                    }

                    if (selectedSport.trackingFields.includes('distance') && customDistance) {
                        const distanceClean = customDistance.trim().replace(',', '.');
                        const distance = parseFloat(distanceClean);
                        if (isNaN(distance) || distance <= 0) {
                            Alert.alert(t('common.error'), 'Distance invalide');
                            return;
                        }
                        customData.distanceKm = distance;
                    }

                    if (selectedSport.trackingFields.includes('bpmAvg') && customBpmAvg) {
                        customData.bpmAvg = parseInt(customBpmAvg, 10);
                    }

                    if (selectedSport.trackingFields.includes('bpmMax') && customBpmMax) {
                        customData.bpmMax = parseInt(customBpmMax, 10);
                    }

                    if (selectedSport.trackingFields.includes('cardiacLoad') && customCardiacLoad) {
                        customData.cardiacLoad = parseInt(customCardiacLoad, 10);
                    }

                    if (selectedSport.trackingFields.includes('calories') && customCalories) {
                        customData.calories = parseInt(customCalories, 10);
                    }

                    if (selectedSport.trackingFields.includes('exercises') && customExercises) {
                        customData.exercises = customExercises.trim();
                    }

                    if (selectedSport.trackingFields.includes('totalReps') && customTotalReps) {
                        customData.totalReps = parseInt(customTotalReps, 10);
                    }

                    if (isEditMode && editEntry) {
                        updateEntry(editEntry.id, { ...customData, date: entryDate || editEntry.date });
                    } else {
                        addCustomSport(customData, entryDate);
                    }
                    break;
            }

            // Note: Les fonctions add* et updateEntry gèrent automatiquement l'XP et les quêtes

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
            setBodyFatPercent('');
            setWaist('');
            setArm('');
            setHips('');
            
            // Reset custom sport fields
            setSelectedSportId(null);
            setCustomSportName('');
            setCustomDuration('');
            setCustomDistance('');
            setCustomBpmAvg('');
            setCustomBpmMax('');
            setCustomCardiacLoad('');
            setCustomCalories('');
            setCustomExercises('');
            setCustomTotalReps('');
            
            // Reset custom date/time
            setUseCustomDateTime(false);
            setCustomDate(format(new Date(), 'yyyy-MM-dd'));
            setCustomTime(format(new Date(), 'HH:mm'));

            setHasStarted(false);
            setSelectedCategory(null);
            onSuccess?.();
        } finally {
            setLoading(false);
        }
    }, [
        activeTab,
        homeName, homeDuration, exercises, withAbsBlock,
        runKm, runMinutes, runBpmAvg, runBpmMax, runCardiacLoad,
        bsDuration, bsCardiacLoad, bsBpmAvg, bsBpmMax,
        mealTime, mealDescription,
        weight, bodyFatPercent, waist, arm, hips,
        selectedSportId, customSportName, customDuration, customDistance, customBpmAvg, customBpmMax, customCardiacLoad, customCalories, customExercises, customTotalReps,
        addHomeWorkout, addRun, addBeatSaber, addMeal, addMeasure, addCustomSport, updateEntry,
        onSuccess, isEditMode, editEntry,
        useCustomDateTime, customDate, customTime,
        sportsConfig
    ]);

    const handleStartActivity = (type: EntryType) => {
        setActiveTab(type);
        setHasStarted(true);
        setSelectedCategory(null);
    };

    // Get settings for enhanced meal redirect
    const settings = useAppStore.getState().settings;

    const handleSelectCategory = (category: CategoryType) => {
        if (category === 'meal') {
            // Check if enhanced meal page is enabled
            if (settings.enhancedMealEnabled && !isEditMode) {
                // Dismiss sheet and navigate to enhanced meal page
                onDismiss?.();
                router.push('/enhanced-meal');
            } else {
                handleStartActivity('meal');
            }
        } else if (category === 'measure') {
            handleStartActivity('measure');
        } else {
            setSelectedCategory('sport');
        }
    };

    const handleSelectSport = (sportId: string) => {
        // Map sport ID to entry type
        if (sportId === 'home') {
            handleStartActivity('home');
        } else if (sportId === 'run') {
            handleStartActivity('run');
        } else if (sportId === 'beatsaber') {
            handleStartActivity('beatsaber');
        } else {
            // Custom sport
            setSelectedSportId(sportId);
            handleStartActivity('custom');
        }
    };

    const handleBackFromSportSelection = () => {
        setSelectedCategory(null);
    };

    // Show sport selection screen
    if (!hasStarted && selectedCategory === 'sport') {
        return (
            <View style={styles.introContainer}>
                <View style={styles.sportSelectionHeader}>
                    <TouchableOpacity 
                        onPress={handleBackFromSportSelection}
                        style={styles.sportBackButton}
                    >
                        <ChevronLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.introTitle}>{t('addEntry.selectSport', { defaultValue: 'Choisis ton sport' })}</Text>
                        <Text style={styles.introSubtitle}>{t('addEntry.selectSportDesc', { defaultValue: 'Quel sport as-tu pratiqué ?' })}</Text>
                    </View>
                </View>

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
                            <Text style={styles.realTimeButtonTitle}>{t('addEntry.tracking')}</Text>
                            <Text style={styles.realTimeButtonSubtitle}>{t('addEntry.trackingDesc')}</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.orText}>{t('addEntry.or')}</Text>

                <ScrollView
                    nestedScrollEnabled={true}
                    contentContainerStyle={{ flexGrow: 1 }}
                >
                    <View style={styles.activityGrid}>
                        {visibleSports.map((sport: SportConfig) => (
                            <TouchableOpacity
                                key={sport.id}
                                style={styles.activityTouch}
                                onPress={() => handleSelectSport(sport.id)}
                            >
                                <GlassCard style={[styles.activityCard, { borderColor: sport.color + '40' }]}>
                                    <Text style={styles.activityEmoji}>{sport.emoji}</Text>
                                    <Text style={styles.activityLabel}>{sport.name}</Text>
                                </GlassCard>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>
        );
    }

    // Show main category selection screen
    if (!hasStarted) {
        return (
            <View style={styles.introContainer}>
                <Text style={styles.introTitle}>{t('addEntry.title')}</Text>
                <Text style={styles.introSubtitle}>{t('addEntry.subtitle')}</Text>

                <ScrollView
                    nestedScrollEnabled={true}
                    contentContainerStyle={{ flexGrow: 1 }}
                >    
                    <View style={styles.categoryGrid}>
                        {/* Sport Category */}
                        <TouchableOpacity
                            style={styles.categoryTouch}
                            onPress={() => handleSelectCategory('sport')}
                        >
                            <LinearGradient
                                colors={['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.1)']}
                                style={styles.categoryCard}
                            >
                                <View style={styles.categoryIconContainer}>
                                    <Dumbbell size={32} color="#8B5CF6" />
                                </View>
                                <Text style={styles.categoryLabel}>{t('addEntry.sportCategory', { defaultValue: 'Sport' })}</Text>
                                <Text style={styles.categoryDesc}>{t('addEntry.sportCategoryDesc', { defaultValue: 'Musculation, course, etc.' })}</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Meal Category */}
                        <TouchableOpacity
                            style={styles.categoryTouch}
                            onPress={() => handleSelectCategory('meal')}
                        >
                            <GlassCard style={styles.activityCard}>
                                <Text style={styles.activityEmoji}>{t('addEntry.meal').split(' ')[0]}</Text>
                                <Text style={styles.activityLabel}>{t('addEntry.meal').split(' ').slice(1).join(' ')}</Text>
                            </GlassCard>
                        </TouchableOpacity>

                        {/* Measure Category */}
                        <TouchableOpacity
                            style={styles.categoryTouch}
                            onPress={() => handleSelectCategory('measure')}
                        >
                            <GlassCard style={styles.activityCard}>
                                <Text style={styles.activityEmoji}>{t('addEntry.measure').split(' ')[0]}</Text>
                                <Text style={styles.activityLabel}>{t('addEntry.measure').split(' ').slice(1).join(' ')}</Text>
                            </GlassCard>
                        </TouchableOpacity>
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
                    <Text style={styles.backButtonText}>{t('addEntry.back')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{currentTabLabel}</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Option date personnalisée */}
                <View style={styles.customDateSection}>
                    <TouchableOpacity
                        style={styles.customDateToggle}
                        onPress={() => setUseCustomDateTime(!useCustomDateTime)}
                        activeOpacity={0.7}
                    >
                        <Calendar size={18} color={useCustomDateTime ? Colors.cta : Colors.muted} />
                        <Text style={[
                            styles.customDateToggleText,
                            useCustomDateTime && styles.customDateToggleTextActive
                        ]}>
                            {useCustomDateTime ? t('addEntry.customDate') : t('addEntry.today')}
                        </Text>
                        <Text style={styles.customDateToggleHint}>
                            {useCustomDateTime ? (() => {
                                // Parse YYYY-MM-DD and format for display
                                const parts = customDate.split('-');
                                if (parts.length === 3) {
                                    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                    return format(d, 'dd MMM yyyy', { locale: fr });
                                }
                                return customDate;
                            })() : t('common.edit')}
                        </Text>
                    </TouchableOpacity>
                    
                    {useCustomDateTime && (
                        <View style={styles.customDateInputs}>
                            <View style={styles.customDateRow}>
                                {/* Date Picker Button */}
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Calendar size={16} color={Colors.cta} />
                                    <Text style={styles.datePickerButtonText}>
                                        {format(customDateAsDate, 'dd MMMM yyyy', { locale: fr })}
                                    </Text>
                                </TouchableOpacity>
                                
                                {/* Time Picker Button */}
                                <TouchableOpacity
                                    style={styles.timePickerButton}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Clock size={16} color={Colors.cta} />
                                    <Text style={styles.datePickerButtonText}>{customTime}</Text>
                                </TouchableOpacity>
                            </View>
                            
                            {/* Native Date Picker */}
                            {showDatePicker && (
                                <DateTimePicker
                                    value={customDateAsDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                    maximumDate={new Date()}
                                    minimumDate={new Date(2020, 0, 1)}
                                />
                            )}
                            
                            {/* Native Time Picker */}
                            {showTimePicker && (
                                <DateTimePicker
                                    value={customTimeAsDate}
                                    mode="time"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onTimeChange}
                                    is24Hour={true}
                                />
                            )}
                        </View>
                    )}
                </View>

                {/* HOME WORKOUT - Nouveau format */}
                {activeTab === 'home' && (
                    <View>
                        <View style={styles.rowInputs}>
                            <InputField
                                label={t('addEntry.sessionName')}
                                placeholder={t('addEntry.tracking')}
                                value={homeName}
                                onChangeText={setHomeName}
                                containerStyle={styles.flexInput}
                            />
                            <InputField
                                label={t('addEntry.duration')}
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
                                title={t('addEntry.addExercise')}
                                variant="ghost"
                                onPress={addExercise}
                                style={styles.addButton}
                            />
                            <Button
                                title={t('addEntry.importJSON')}
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
                            <Text style={styles.absToggleText}>{t('addEntry.includeAbs')}</Text>
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
                                label={t('addEntry.duration')}
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
                                label={t('addEntry.duration')}
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
                        <Text style={styles.sectionLabel}>{t('addEntry.mealTime')}</Text>
                        <View style={styles.mealTimeRow}>
                            {(Object.keys(mealTimeLabels) as MealTime[]).map((time) => (
                                <TouchableOpacity
                                    key={time}
                                    style={[styles.mealTimeButton, mealTime === time && styles.mealTimeButtonActive]}
                                    onPress={() => setMealTime(time)}
                                >
                                    <Text style={[styles.mealTimeText, mealTime === time && styles.mealTimeTextActive]}>
                                        {mealTimeLabelsLocalized[time]}
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
                                label="% Masse grasse"
                                placeholder="18.5"
                                value={bodyFatPercent}
                                onChangeText={setBodyFatPercent}
                                keyboardType="decimal-pad"
                                containerStyle={styles.halfInput}
                            />
                        </View>
                        <View style={styles.row}>
                            <InputField
                                label="Tour de taille (cm)"
                                placeholder="82"
                                value={waist}
                                onChangeText={setWaist}
                                keyboardType="decimal-pad"
                                containerStyle={styles.halfInput}
                            />
                            <InputField
                                label="Bras (cm)"
                                placeholder="31"
                                value={arm}
                                onChangeText={setArm}
                                keyboardType="decimal-pad"
                                containerStyle={styles.halfInput}
                            />
                        </View>
                        <View style={styles.row}>
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

                {/* CUSTOM SPORT */}
                {activeTab === 'custom' && selectedSportId && (
                    <View>
                        {(() => {
                            const selectedSport = sportsConfig.find((s: SportConfig) => s.id === selectedSportId);
                            if (!selectedSport) return null;

                            return (
                                <>
                                    {/* Sport header with icon and color */}
                                    <View style={styles.customSportHeader}>
                                        <View style={[styles.customSportIcon, { backgroundColor: selectedSport.color + '20' }]}>
                                            <Text style={styles.customSportEmoji}>{selectedSport.emoji}</Text>
                                        </View>
                                        <Text style={[styles.customSportName, { color: selectedSport.color }]}>
                                            {selectedSport.name}
                                        </Text>
                                    </View>

                                    {/* Session name (always show) */}
                                    <InputField
                                        label={t('addEntry.sessionName')}
                                        placeholder={selectedSport.name}
                                        value={customSportName}
                                        onChangeText={setCustomSportName}
                                    />

                                    {/* Dynamic fields based on trackingFields */}
                                    <View style={styles.row}>
                                        {selectedSport.trackingFields.includes('duration') && (
                                            <InputField
                                                label={t('settings.sports.fields.duration')}
                                                placeholder="30"
                                                value={customDuration}
                                                onChangeText={setCustomDuration}
                                                keyboardType="decimal-pad"
                                                containerStyle={selectedSport.trackingFields.includes('distance') ? styles.halfInput : undefined}
                                            />
                                        )}
                                        {selectedSport.trackingFields.includes('distance') && (
                                            <InputField
                                                label={t('settings.sports.fields.distance')}
                                                placeholder="5.0"
                                                value={customDistance}
                                                onChangeText={setCustomDistance}
                                                keyboardType="decimal-pad"
                                                containerStyle={selectedSport.trackingFields.includes('duration') ? styles.halfInput : undefined}
                                            />
                                        )}
                                    </View>

                                    <View style={styles.row}>
                                        {selectedSport.trackingFields.includes('bpmAvg') && (
                                            <InputField
                                                label={t('settings.sports.fields.bpmAvg')}
                                                placeholder="140"
                                                value={customBpmAvg}
                                                onChangeText={setCustomBpmAvg}
                                                keyboardType="number-pad"
                                                containerStyle={selectedSport.trackingFields.includes('bpmMax') ? styles.halfInput : undefined}
                                            />
                                        )}
                                        {selectedSport.trackingFields.includes('bpmMax') && (
                                            <InputField
                                                label={t('settings.sports.fields.bpmMax')}
                                                placeholder="180"
                                                value={customBpmMax}
                                                onChangeText={setCustomBpmMax}
                                                keyboardType="number-pad"
                                                containerStyle={selectedSport.trackingFields.includes('bpmAvg') ? styles.halfInput : undefined}
                                            />
                                        )}
                                    </View>

                                    <View style={styles.row}>
                                        {selectedSport.trackingFields.includes('cardiacLoad') && (
                                            <InputField
                                                label={t('settings.sports.fields.cardiacLoad')}
                                                placeholder="120"
                                                value={customCardiacLoad}
                                                onChangeText={setCustomCardiacLoad}
                                                keyboardType="number-pad"
                                                containerStyle={selectedSport.trackingFields.includes('calories') ? styles.halfInput : undefined}
                                            />
                                        )}
                                        {selectedSport.trackingFields.includes('calories') && (
                                            <InputField
                                                label={t('settings.sports.fields.calories')}
                                                placeholder="350"
                                                value={customCalories}
                                                onChangeText={setCustomCalories}
                                                keyboardType="number-pad"
                                                containerStyle={selectedSport.trackingFields.includes('cardiacLoad') ? styles.halfInput : undefined}
                                            />
                                        )}
                                    </View>

                                    {selectedSport.trackingFields.includes('totalReps') && (
                                        <InputField
                                            label={t('settings.sports.fields.totalReps')}
                                            placeholder="100"
                                            value={customTotalReps}
                                            onChangeText={setCustomTotalReps}
                                            keyboardType="number-pad"
                                        />
                                    )}

                                    {selectedSport.trackingFields.includes('exercises') && (
                                        <TextArea
                                            label={t('settings.sports.fields.exercises')}
                                            placeholder={t('addEntry.exercisesPlaceholder', { defaultValue: 'Liste tes exercices...' })}
                                            value={customExercises}
                                            onChangeText={setCustomExercises}
                                            rows={4}
                                        />
                                    )}
                                </>
                            );
                        })()}
                    </View>
                )}

                <Button
                    title={isEditMode ? t('addEntry.update') : t('addEntry.save')}
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
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
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
    // Category selection styles
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
        width: '100%',
    },
    categoryTouch: {
        width: '45%',
        aspectRatio: 1.1,
    },
    categoryCard: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    categoryIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    categoryLabel: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
    },
    categoryDesc: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        textAlign: 'center',
    },
    // Sport selection header
    sportSelectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
        width: '100%',
    },
    sportBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.card,
        justifyContent: 'center',
        alignItems: 'center',
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
    // Custom date/time styles
    customDateSection: {
        marginBottom: Spacing.lg,
    },
    customDateToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.overlay,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },
    customDateToggleText: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.muted,
    },
    customDateToggleTextActive: {
        color: Colors.cta,
        fontWeight: FontWeight.medium,
    },
    customDateToggleHint: {
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    customDateInputs: {
        marginTop: Spacing.md,
    },
    customDateRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    dateInput: {
        flex: 2,
    },
    timeInput: {
        flex: 1,
    },
    datePickerButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    timePickerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    datePickerButtonText: {
        fontSize: FontSize.md,
        color: Colors.text,
        fontWeight: FontWeight.medium,
    },
    // Custom sport styles
    customSportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
        padding: Spacing.md,
        backgroundColor: Colors.overlay,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    customSportIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    customSportEmoji: {
        fontSize: 24,
    },
    customSportName: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
    },
});
