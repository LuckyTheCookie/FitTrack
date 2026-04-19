// ============================================================================
// HEALTH CONNECT SCREEN - Importer des séances depuis Health Connect
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    Alert,
    TouchableOpacity,
    Platform,
    Linking,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Heart,
    ChevronLeft,
    Download,
    RefreshCw,
    Check,
    X,
    AlertCircle,
    Clock,
    Dumbbell,
    Footprints,
    Gamepad2,
    Trash2,
    Calendar,
    Zap,
    Settings,
    Scale,
    MoreHorizontal,
    ExternalLink,
} from 'lucide-react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { GlassCard, Button } from '../src/components/ui';
import { HealthConnectSettingsSheet, type HealthConnectSettingsSheetRef } from '../src/components/sheets';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { styles } from './_health-connect.styles';
import * as healthConnect from '../src/services/healthConnect';
import type { HealthConnectWorkout, SpixWorkoutType, HealthConnectWeight } from '../src/services/healthConnect';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SportConfig } from '../src/types';
import * as LucideIcons from 'lucide-react-native';

// ============================================================================
// TYPES
// ============================================================================

const EMPTY_STATE_ICON_URI = 'https://cdn-icons-png.flaticon.com/512/7486/7486744.png';

type HealthConnectMappedType = 'home' | 'run' | 'beatsaber' | 'custom' | 'skip';

interface ImportableWorkout extends HealthConnectWorkout {
    spixType: HealthConnectMappedType;
    customSportId?: string; // ID du sport personnalisé si type === 'custom'
    detectedSportId?: string; // ID du sport détecté automatiquement
    selected: boolean;
}

type LucideIconProps = { size: number; color: string; strokeWidth?: number };
type LucideIconComponent = React.ComponentType<LucideIconProps>;

// ============================================================================
// HELPER: Get Lucide icon component by name
// ============================================================================

function getLucideIcon(iconName: string): React.ComponentType<{ size: number; color: string; strokeWidth?: number }> {
    const iconRegistry = LucideIcons as unknown as Record<string, LucideIconComponent>;
    const IconComponent = iconRegistry[iconName];
    return IconComponent || LucideIcons.Activity;
}

// ============================================================================
// WORKOUT TYPE SELECTOR - Built dynamically from sportsConfig
// ============================================================================


function WorkoutTypePill({
    sportConfig,
    isSkip,
    selected,
    onPress,
}: {
    sportConfig?: SportConfig;
    isSkip?: boolean;
    selected: boolean;
    onPress: () => void;
}) {
    const { t } = useTranslation();
    
    // Handle skip button
    if (isSkip) {
        return (
            <TouchableOpacity
                style={[
                    styles.typePill,
                    selected && { backgroundColor: Colors.gray700, borderColor: Colors.gray400 },
                    !selected && styles.typePillInactive,
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <Trash2 size={14} color={selected ? Colors.gray400 : Colors.muted} strokeWidth={2.5} />
                <Text style={[styles.typePillLabel, selected ? { color: Colors.gray400, fontWeight: '700' } : { color: Colors.muted }]}> 
                    {t('common.skip')}
                </Text>
            </TouchableOpacity>
        );
    }
    
    // Handle sport config
    if (!sportConfig) return null;
    
    const Icon = getLucideIcon(sportConfig.icon);
    const color = sportConfig.color;
    
    return (
        <TouchableOpacity
            style={[
                styles.typePill,
                selected && { backgroundColor: color + '20', borderColor: color },
                !selected && styles.typePillInactive,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Icon size={14} color={selected ? color : Colors.muted} strokeWidth={2.5} />
            <Text style={[styles.typePillLabel, selected ? { color: color, fontWeight: '700' } : { color: Colors.muted }]}>
                {sportConfig.emoji} {sportConfig.name}
            </Text>
        </TouchableOpacity>
    );
}

// ============================================================================
// WORKOUT CARD
// ============================================================================

function WorkoutImportCard({
    workout,
    onTypeChange,
    onOpenSportPicker,
    sportsConfig,
    index,
}: {
    workout: ImportableWorkout;
    onTypeChange: (type: HealthConnectMappedType, customSportId?: string) => void;
    onOpenSportPicker: () => void;
    sportsConfig: SportConfig[];
    index: number;
}) {
    const { t } = useTranslation();
    const isSkipped = workout.spixType === 'skip';
    const isOther = workout.spixType === 'custom';
    
    // Get the detected/mapped sport config (if any)
    const detectedSportId = workout.detectedSportId;
    const detectedSport = detectedSportId ? sportsConfig.find(s => s.id === detectedSportId) : null;
    
    // Get active sport config for color
    const getActiveColor = (): string => {
        if (isSkipped) return Colors.gray700;
        if (workout.spixType === 'custom' && workout.customSportId) {
            const customSport = sportsConfig.find(s => s.id === workout.customSportId);
            return customSport?.color || Colors.cta;
        }
        const defaultSport = sportsConfig.find(s => s.id === workout.spixType);
        return defaultSport?.color || Colors.cta;
    };
    
    const activeColor = getActiveColor();
    
    // Get selected sport name for "Autre" display
    const getSelectedSportName = (): string | null => {
        if (workout.spixType === 'custom' && workout.customSportId) {
            const sport = sportsConfig.find(s => s.id === workout.customSportId);
            return sport ? `${sport.emoji} ${sport.name}` : null;
        }
        return null;
    };
    
    const selectedSportName = getSelectedSportName();
    
    // Get visible sports (non-hidden)
    const visibleSports = sportsConfig.filter(s => !s.isHidden);

    return (
        <Animated.View 
            entering={FadeInDown.delay(index * 100).springify()} 
            layout={Layout.springify()}
            style={{ marginBottom: Spacing.md }}
        >
            <View style={[
                styles.cardContainer,
                isSkipped && styles.cardSkipped
            ]}>
                {/* Left Accent Bar */}
                <View style={[
                    styles.accentBar, 
                    { backgroundColor: activeColor }
                ]} />

                <View style={styles.cardContent}>
                    {/* Header: Title & Date */}
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, isSkipped && styles.textSkipped]} numberOfLines={1}>
                                {workout.title || workout.exerciseTypeName}
                            </Text>
                            <View style={styles.cardMetaRow}>
                                <Calendar size={12} color={Colors.muted} />
                                <Text style={styles.cardMetaText}>
                                    {format(workout.startTime, 'EEE d MMM', { locale: fr })}
                                </Text>
                                <View style={styles.dot} />
                                <Clock size={12} color={Colors.muted} />
                                <Text style={styles.cardMetaText}>
                                    {format(workout.startTime, 'HH:mm')}
                                </Text>
                            </View>
                        </View>
                        
                        {/* Duration Badge */}
                        <View style={[styles.durationBadge, isSkipped && { backgroundColor: Colors.gray700 }]}> 
                            <Text style={[styles.durationText, isSkipped && { color: Colors.gray400 }]}> 
                                {workout.durationMinutes}
                            </Text>
                            <Text style={[styles.minText, isSkipped && { color: Colors.gray500 }]}> 
                                {t('common.minShort')}
                            </Text>
                        </View>
                    </View>

                    {/* Original Name if different from title */}
                    {workout.title && workout.title !== workout.exerciseTypeName && (
                        <Text style={styles.originalName}>
                            {t('healthConnect.sourceLabel')} {workout.exerciseTypeName}
                        </Text>
                    )}

                    {/* Type Selector - Simplified: Detected Sport | Autre | Ignorer */}
                    <View style={styles.pillContainer}>
                        {/* Show detected sport pill if available */}
                        {detectedSport && (
                            <WorkoutTypePill
                                sportConfig={detectedSport}
                                selected={workout.spixType === detectedSport.id || 
                                    (workout.spixType === 'custom' && workout.customSportId === detectedSport.id)}
                                onPress={() => {
                                    if (detectedSport.isDefault) {
                                        onTypeChange(detectedSport.id as HealthConnectMappedType);
                                    } else {
                                        onTypeChange('custom', detectedSport.id);
                                    }
                                }}
                            />
                        )}
                        
                        {/* "Autre" (Other) button - opens sport picker */}
                        <TouchableOpacity
                            style={[
                                styles.typePill,
                                isOther && !selectedSportName && styles.typePillInactive,
                                isOther && selectedSportName && { backgroundColor: activeColor + '20', borderColor: activeColor },
                                !isOther && styles.typePillInactive,
                            ]}
                            onPress={onOpenSportPicker}
                            activeOpacity={0.7}
                        >
                            <MoreHorizontal size={14} color={isOther ? activeColor : Colors.muted} strokeWidth={2.5} />
                            <Text style={[
                                styles.typePillLabel, 
                                isOther ? { color: activeColor, fontWeight: '700' } : { color: Colors.muted }
                            ]}>
                                {selectedSportName || t('healthConnect.other', { defaultValue: 'Autre' })}
                            </Text>
                        </TouchableOpacity>
                        
                        {/* Skip button */}
                        <WorkoutTypePill
                            isSkip
                            selected={isSkipped}
                            onPress={() => onTypeChange('skip')}
                        />
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============================================================================
// WEIGHT IMPORT CARD
// ============================================================================

interface ImportableWeight extends HealthConnectWeight {
    selected: boolean;
    bodyFatPercent?: number;
}

function WeightImportCard({
    weight,
    onToggle,
    index,
}: {
    weight: ImportableWeight;
    onToggle: () => void;
    index: number;
}) {
    const { t } = useTranslation();

    return (
        <Animated.View 
            entering={FadeInDown.delay(index * 100).springify()} 
            layout={Layout.springify()}
            style={{ marginBottom: Spacing.md }}
        >
            <TouchableOpacity 
                onPress={onToggle}
                activeOpacity={0.7}
                style={[
                    styles.cardContainer,
                    !weight.selected && styles.cardSkipped
                ]}
            >
                {/* Left Accent Bar */}
                <View style={[
                    styles.accentBar, 
                    { backgroundColor: weight.selected ? Colors.emerald : Colors.gray700 }
                ]} />

                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                            <View style={[styles.weightIconCircle, !weight.selected && { backgroundColor: Colors.gray700 }]}> 
                                <Scale size={18} color={weight.selected ? Colors.emerald : Colors.gray400} />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, !weight.selected && styles.textSkipped]}>
                                    {weight.weightKg.toFixed(1)} kg
                                    {weight.bodyFatPercent !== undefined && (
                                        <Text style={styles.cardMetaText}> • {weight.bodyFatPercent.toFixed(1)}% MG</Text>
                                    )}
                                </Text>
                                <View style={styles.cardMetaRow}>
                                    <Calendar size={12} color={Colors.muted} />
                                    <Text style={styles.cardMetaText}>
                                        {format(weight.time, 'EEE d MMM', { locale: fr })}
                                    </Text>
                                    <View style={styles.dot} />
                                    <Clock size={12} color={Colors.muted} />
                                    <Text style={styles.cardMetaText}>
                                        {format(weight.time, 'HH:mm')}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        
                        {/* Selection indicator */}
                        <View style={[
                            styles.selectionIndicator, 
                            weight.selected && styles.selectionIndicatorActive
                        ]}>
                            {weight.selected && <Check size={14} color={Colors.white} strokeWidth={3} />}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function HealthConnectScreen() {
    const { t } = useTranslation();
    const [status, setStatus] = useState<'loading' | 'not_available' | 'needs_install' | 'ready' | 'permission_needed'>('loading');
    const [workouts, setWorkouts] = useState<ImportableWorkout[]>([]);
    const [weights, setWeights] = useState<ImportableWeight[]>([]);
    const [importing, setImporting] = useState(false);
    const [daysBack, setDaysBack] = useState(7);
    const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
    const hasLoadedOnce = useRef(false);
    const settingsSheetRef = useRef<HealthConnectSettingsSheetRef>(null);
    const sportPickerSheetRef = useRef<TrueSheet>(null);
    const [sportPickerWorkoutId, setSportPickerWorkoutId] = useState<string | null>(null);

    // Note: les fonctions add* gèrent automatiquement la gamification
    const { addHomeWorkout, addRun, addBeatSaber, addCustomSport, addMeasure, entries, sportsConfig } = useAppStore();

    useEffect(() => {
        checkAvailability();
    }, []);

    // Auto-refresh workouts when screen becomes focused (only once)
    useFocusEffect(
        useCallback(() => {
            if (status === 'ready' && !hasLoadedOnce.current && !isLoadingWorkouts) {
                hasLoadedOnce.current = true;
                loadWorkouts();
            }
        }, [status, isLoadingWorkouts])
    );

    const checkAvailability = async () => {
        if (Platform.OS !== 'android') {
            setStatus('not_available');
            return;
        }
        const { available, needsInstall } = await healthConnect.checkHealthConnectAvailability();
        if (needsInstall) {
            setStatus('needs_install');
            return;
        }
        if (!available) {
            setStatus('not_available');
            return;
        }
        try {
            const initialized = await healthConnect.initializeHealthConnect();
            if (!initialized) {
                setStatus('not_available');
                return;
            }
            // Check permissions immediately to show workouts if already granted
            const hasPerms = await healthConnect.requestHealthConnectPermissions(); 
            // Note: requestPermission acts as check if already granted
            if (hasPerms) {
                // Set ready first, then load workouts separately to avoid infinite loop
                setStatus('ready');
            } else {
                setStatus('permission_needed');
            }
        } catch (error) {
            console.error('Health Connect initialization error:', error);
            setStatus('not_available');
        }
    };

    const requestPermissions = async () => {
        try {
            setStatus('loading');
            const granted = await healthConnect.requestHealthConnectPermissions();
            if (granted) {
                setStatus('ready');
                loadWorkouts();
            } else {
                setStatus('permission_needed');
                Alert.alert(t('healthConnect.permissionsTitle'), t('healthConnect.permissionsMessage'));
            }
        } catch (error) {
            setStatus('permission_needed');
        }
    };

    const loadWorkouts = async () => {
        if (isLoadingWorkouts) return; // Prevent concurrent loads
        setIsLoadingWorkouts(true);
        try {
            const rawWorkouts = await healthConnect.getRecentWorkouts(daysBack);
        
            // Filter out workouts that have already been imported
            // Only show workouts that don't have a corresponding entry with healthConnectId
            const alreadyImportedIds = new Set(
                entries
                    .filter(entry => entry.healthConnectId)
                    .map(entry => entry.healthConnectId!)
            );
            
            const notImported = rawWorkouts.filter(workout => !alreadyImportedIds.has(workout.id));
            
            // Map workouts with detected sport
            const importable = notImported.map((w): ImportableWorkout => {
                const defaultType = healthConnect.getDefaultSpixType(w.exerciseType as number);
                
                // Find the detected sport ID based on the default type
                // If it's a default sport (home, run, beatsaber), use that ID
                // Otherwise, it's unknown and we don't set detectedSportId
                let detectedSportId: string | undefined;
                if (defaultType === 'home' || defaultType === 'run' || defaultType === 'beatsaber') {
                    detectedSportId = defaultType;
                }
                
                return {
                    ...w,
                    spixType: defaultType,
                    detectedSportId,
                    selected: true,
                };
            });

            setWorkouts(importable);
            
            // Also load weight and body fat records
            const rawWeights = await healthConnect.getRecentWeights(daysBack);
            const rawBodyFat = await healthConnect.getRecentBodyFat(daysBack);
            const notImportedWeights = rawWeights.filter(w => !alreadyImportedIds.has(w.id));
            
            // Match body fat to weight records by finding the closest time (within 1 hour)
            const importableWeights = notImportedWeights.map((w): ImportableWeight => {
                // Find body fat record closest in time (within 1 hour window)
                const matchingBodyFat = rawBodyFat.find(bf => {
                    const timeDiff = Math.abs(bf.time.getTime() - w.time.getTime());
                    return timeDiff < 60 * 60 * 1000; // Within 1 hour
                });
                
                return {
                    ...w,
                    bodyFatPercent: matchingBodyFat?.percentage,
                    selected: true,
                };
            });
            setWeights(importableWeights);
        } catch (error) {
            console.error('Error loading workouts:', error);
        } finally {
            setIsLoadingWorkouts(false);
        }
    };

    const handleTypeChange = useCallback((workoutId: string, type: HealthConnectMappedType, customSportId?: string) => {
        setWorkouts((prev) =>
            prev.map((w) =>
                w.id === workoutId
                    ? { ...w, spixType: type, customSportId, selected: type !== 'skip' }
                    : w
            )
        );
    }, []);
    
    const handleWeightToggle = useCallback((weightId: string) => {
        setWeights((prev) =>
            prev.map((w) =>
                w.id === weightId
                    ? { ...w, selected: !w.selected }
                    : w
            )
        );
    }, []);

    const openSportPicker = useCallback((workoutId: string) => {
        setSportPickerWorkoutId(workoutId);
        sportPickerSheetRef.current?.present();
    }, []);

    const handleSportSelected = useCallback((type: HealthConnectMappedType, customSportId?: string) => {
        if (sportPickerWorkoutId) {
            handleTypeChange(sportPickerWorkoutId, type, customSportId);
        }
        sportPickerSheetRef.current?.dismiss();
        setSportPickerWorkoutId(null);
    }, [sportPickerWorkoutId, handleTypeChange]);

    const handleImport = async () => {
        const toImport = workouts.filter((w) => w.selected && w.spixType !== 'skip');
        const weightsToImport = weights.filter((w) => w.selected);
        if (toImport.length === 0 && weightsToImport.length === 0) return;

        setImporting(true);
        try {
            let workoutsAdded = 0;
            let weightsAdded = 0;
            let totalDuration = 0;
            let totalDistance = 0;

            // Les fonctions add* gèrent automatiquement l'XP et les quêtes
            for (const workout of toImport) {
                const date = format(workout.startTime, 'yyyy-MM-dd');
                const createdAt = workout.startTime.toISOString();
                switch (workout.spixType) {
                    case 'home':
                        addHomeWorkout({
                            name: workout.title || workout.exerciseTypeName,
                            exercises: t('healthConnect.importedFrom'),
                            durationMinutes: workout.durationMinutes,
                            healthConnectId: workout.id,
                        }, date, createdAt);
                        workoutsAdded++;
                        totalDuration += workout.durationMinutes;
                        break;
                    case 'run': {
                        const rawDistanceKm = workout.distance ? workout.distance / 1000 : 5;
                        const distanceKm = Math.round(rawDistanceKm * 100) / 100;
                        addRun({ 
                            distanceKm, 
                            durationMinutes: workout.durationMinutes,
                            healthConnectId: workout.id,
                        }, date, createdAt);
                        workoutsAdded++;
                        totalDistance += distanceKm;
                        totalDuration += workout.durationMinutes;
                        break;
                    }
                    case 'beatsaber':
                        addBeatSaber({ 
                            durationMinutes: workout.durationMinutes,
                            healthConnectId: workout.id,
                        }, date, createdAt);
                        workoutsAdded++;
                        totalDuration += workout.durationMinutes;
                        break;
                    case 'custom':
                        // Handle custom sport
                        if (workout.customSportId) {
                            const sportConfig = sportsConfig.find(s => s.id === workout.customSportId);
                            const trackingFields = new Set(sportConfig?.trackingFields ?? []);
                            addCustomSport({
                                sportId: workout.customSportId,
                                name: workout.title || workout.exerciseTypeName,
                                durationMinutes: workout.durationMinutes,
                                distanceKm: trackingFields.has('distance') && workout.distance
                                    ? Math.round((workout.distance / 1000) * 100) / 100
                                    : undefined,
                                healthConnectId: workout.id,
                            }, date, createdAt);
                            workoutsAdded++;
                            totalDuration += workout.durationMinutes;
                        }
                        break;
                    default:
                        break;
                }
            }

            // Import weight measurements (with body fat if available)
            for (const weight of weightsToImport) {
                const date = format(weight.time, 'yyyy-MM-dd');
                const createdAt = weight.time.toISOString();
                const roundedWeight = Math.round(weight.weightKg * 100) / 100;
                const roundedBodyFat = weight.bodyFatPercent !== undefined ? Math.round(weight.bodyFatPercent * 100) / 100 : undefined;
                addMeasure({
                    weight: roundedWeight,
                    bodyFatPercent: roundedBodyFat,
                    healthConnectId: weight.id,
                }, date, createdAt);
                weightsAdded++;
            }

            // Build success message
            let successMessage = '';
            if (workoutsAdded > 0) {
                successMessage = t('healthConnect.importSuccess', { count: workoutsAdded });
            }
            if (weightsAdded > 0) {
                if (successMessage) successMessage += '\n';
                successMessage += t('healthConnect.weightsImported', { count: weightsAdded });
            }

            Alert.alert(
                t('common.success'), 
                successMessage,
                [{ text: t('common.ok'), onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert(t('common.error'), t('healthConnect.importError'));
        } finally {
            setImporting(false);
        }
    };

    // ============================================================================
    // HEADER COMPONENT
    // ============================================================================

    const Header = () => (
        <View style={styles.headerContainer}>
            <LinearGradient
                colors={[Colors.overlay, Colors.transparent]}
                style={styles.headerGradient}
            />
            <View style={styles.headerContent}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('healthConnect.headerTitle')}</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity 
                        onPress={loadWorkouts} 
                        style={styles.iconButton}
                        disabled={status === 'loading'}
                    >
                        <RefreshCw size={20} color={status === 'loading' ? Colors.muted : Colors.cta} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => settingsSheetRef.current?.present()} 
                        style={styles.iconButton}
                    >
                        <Settings size={20} color={Colors.text} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    // ============================================================================
    // RENDER CONTENT
    // ============================================================================

    const renderContent = () => {
        if (status === 'loading') {
            return (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.cta} />
                    <Text style={styles.statusText}>{t('healthConnect.checkingStatus')}</Text>
                </View>
            );
        }

        if (status === 'not_available' || status === 'needs_install') {
            return (
                <View style={styles.centerContainer}>
                    <View style={styles.iconCircle}>
                        <AlertCircle size={40} color={Colors.errorStrong} />
                    </View>
                    <Text style={styles.errorTitle}>{t('healthConnect.unavailableTitle')}</Text>
                    <Text style={styles.errorText}>
                        {t('healthConnect.unavailableMessage')}
                    </Text>
                    <Button 
                        title={t('healthConnect.installButton')} 
                        onPress={() => Linking.openURL('market://details?id=com.google.android.apps.healthdata')}
                        variant="primary"
                    />
                </View>
            );
        }

        if (status === 'permission_needed') {
            return (
                <View style={styles.centerContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: Colors.cta + '20' }]}>
                        <Heart size={40} color={Colors.cta} fill={Colors.cta + '20'} />
                    </View>
                    <Text style={styles.errorTitle}>{t('healthConnect.permissionsTitle')}</Text>
                    <Text style={styles.errorText}>
                        {t('healthConnect.permissionsMessage')}
                    </Text>
                    <Button 
                        title={t('healthConnect.grantAccessButton')} 
                        onPress={requestPermissions}
                        variant="cta"
                        style={{ width: 200 }}
                    />
                </View>
            );
        }

        // READY STATE
        const selectedCount = workouts.filter((w) => w.selected && w.spixType !== 'skip').length;
        const selectedWeightsCount = weights.filter((w) => w.selected).length;

        return (
            <>
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Summary Card */}
                    {(workouts.length > 0 || weights.length > 0) && (
                        <Animated.View entering={FadeInDown.delay(100)}>
                            <LinearGradient
                                colors={[Colors.cta + '20', Colors.transparent]}
                                style={styles.summaryCard}
                            >
                                <Zap size={20} color={Colors.cta} fill={Colors.cta} />
                                <Text style={styles.summaryText}>
                                    {workouts.length > 0 && (
                                        <>
                                            <Text style={{ fontWeight: 'bold', color: Colors.text }}>{workouts.length}</Text>{' '}
                                            {t('healthConnect.workoutsFound', { days: daysBack })}
                                        </>
                                    )}
                                    {workouts.length > 0 && weights.length > 0 && ' • '}
                                    {weights.length > 0 && (
                                        <>
                                            <Text style={{ fontWeight: 'bold', color: Colors.text }}>{weights.length}</Text>{' '}
                                            {t('healthConnect.weightsFound')}
                                        </>
                                    )}
                                </Text>
                            </LinearGradient>
                        </Animated.View>
                    )}

                    {workouts.length === 0 && weights.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Image 
                                source={{ uri: EMPTY_STATE_ICON_URI }} 
                                accessibilityLabel={t('healthConnect.emptyTitle', { defaultValue: 'No data found' })}
                                style={{ width: 80, height: 80, opacity: 0.5, marginBottom: 16 }} 
                            />
                            <Text style={styles.emptyTitle}>{t('healthConnect.emptyTitle')}</Text>
                            <Text style={styles.emptyText}>{t('healthConnect.emptyMessage')}</Text>
                        </View>
                    ) : (
                        <>
                            {/* Workouts Section */}
                            {workouts.length > 0 && (
                                <>
                                    <Text style={styles.sectionTitle}>
                                        {t('healthConnect.workoutsSection')} ({workouts.length})
                                    </Text>
                                    {workouts.map((workout, index) => (
                                        <WorkoutImportCard
                                            key={workout.id}
                                            workout={workout}
                                            index={index}
                                            sportsConfig={sportsConfig}
                                            onTypeChange={(type, customSportId) => handleTypeChange(workout.id, type, customSportId)}
                                            onOpenSportPicker={() => openSportPicker(workout.id)}
                                        />
                                    ))}
                                </>
                            )}
                            
                            {/* Weights Section */}
                            {weights.length > 0 && (
                                <>
                                    <Text style={styles.sectionTitle}>
                                        {t('healthConnect.weightsSection')} ({weights.length})
                                    </Text>
                                    {weights.map((weight, index) => (
                                        <WeightImportCard
                                            key={weight.id}
                                            weight={weight}
                                            index={index}
                                            onToggle={() => handleWeightToggle(weight.id)}
                                        />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                    
                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Bottom Action Bar */}
                {(workouts.length > 0 || weights.length > 0) && (
                    <Animated.View entering={FadeInDown} style={styles.bottomBarContainer}>
                        <GlassCard style={styles.bottomBar}>
                            <View>
                                <Text style={styles.bottomBarLabel}>{t('healthConnect.selectedLabel')}</Text>
                                <Text style={styles.bottomBarValue}>
                                    {selectedCount > 0 && `${selectedCount} ${t('healthConnect.sessions')}`}
                                    {selectedCount > 0 && selectedWeightsCount > 0 && ' • '}
                                    {selectedWeightsCount > 0 && `${selectedWeightsCount} ${t('healthConnect.measures')}`}
                                </Text>
                            </View>
                            <Button
                                title={importing ? t('healthConnect.importing') : t('healthConnect.importButton')}
                                onPress={handleImport}
                                variant="cta"
                                disabled={selectedCount === 0 || importing}
                                style={{ minWidth: 140 }}
                            />
                        </GlassCard>
                    </Animated.View>
                )}
            </>
        );
    };

    // Get visible sports for the picker
    const visibleSports = sportsConfig.filter(sport => !sport.isHidden);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <Header />
                {renderContent()}
            </SafeAreaView>
            <HealthConnectSettingsSheet ref={settingsSheetRef} />
            
            {/* Sport Picker Bottom Sheet */}
            <TrueSheet
                ref={sportPickerSheetRef}
                detents={['auto']}
                cornerRadius={BorderRadius.xl}
                backgroundColor={Colors.card}
            >
                <View style={styles.sportPickerContainer}>
                    <Text style={styles.sportPickerTitle}>{t('healthConnect.chooseSport')}</Text>
                    <ScrollView style={styles.sportPickerList} showsVerticalScrollIndicator={false}>
                        {visibleSports.map((sport) => {
                            const IconComponent = getLucideIcon(sport.icon);
                            const isDefaultSport = sport.id === 'home' || sport.id === 'run' || sport.id === 'beatsaber';
                            return (
                                <TouchableOpacity
                                    key={sport.id}
                                    style={styles.sportPickerItem}
                                    onPress={() => handleSportSelected(
                                        isDefaultSport ? sport.id as HealthConnectMappedType : 'custom',
                                        isDefaultSport ? undefined : sport.id
                                    )}
                                >
                                    <View style={[styles.sportPickerIconContainer, { backgroundColor: sport.color + '20' }]}>
                                        <IconComponent size={20} color={sport.color} strokeWidth={2} />
                                    </View>
                                    <Text style={styles.sportPickerItemText}>{sport.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </TrueSheet>
        </View>
    );
}

