// ============================================================================
// HEALTH CONNECT SCREEN - Importer des séances depuis Health Connect
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
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
} from 'lucide-react-native';
import { GlassCard, Button } from '../src/components/ui';
import { HealthConnectSettingsSheet, type HealthConnectSettingsSheetRef } from '../src/components/sheets';
import { useTranslation } from 'react-i18next';
import { useAppStore, useGamificationStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import * as healthConnect from '../src/services/healthConnect';
import type { HealthConnectWorkout, FitTrackWorkoutType } from '../src/services/healthConnect';
import { calculateQuestTotals } from '../src/utils/questCalculator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================================================
// TYPES
// ============================================================================

interface ImportableWorkout extends HealthConnectWorkout {
    fitTrackType: FitTrackWorkoutType;
    selected: boolean;
}

// ============================================================================
// WORKOUT TYPE SELECTOR
// ============================================================================

const WORKOUT_TYPES: { type: FitTrackWorkoutType; label: string; icon: any; color: string }[] = [
    { type: 'home', label: 'addEntry.home', icon: Dumbbell, color: '#60A5FA' }, // Blue
    { type: 'run', label: 'addEntry.run', icon: Footprints, color: '#F472B6' }, // Pink
    { type: 'beatsaber', label: 'addEntry.beatsaber', icon: Gamepad2, color: '#A78BFA' }, // Purple
    { type: 'skip', label: 'common.skip', icon: Trash2, color: '#9CA3AF' }, // Gray
];

function WorkoutTypePill({
    type,
    label,
    icon: Icon,
    color,
    selected,
    onPress,
}: {
    type: FitTrackWorkoutType;
    label: string;
    icon: any;
    color: string;
    selected: boolean;
    onPress: () => void;
}) {
    const { t } = useTranslation();
    return (
        <TouchableOpacity
            style={[
                styles.typePill,
                selected && { backgroundColor: type === 'skip' ? '#374151' : color + '20', borderColor: color },
                !selected && styles.typePillInactive,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Icon
                size={14}
                color={selected ? (type === 'skip' ? '#9CA3AF' : color) : Colors.muted}
                strokeWidth={2.5}
            />
            <Text
                style={[
                    styles.typePillLabel,
                    selected ? { color: type === 'skip' ? '#9CA3AF' : color, fontWeight: '700' } : { color: Colors.muted },
                ]}
            >
                {t(label)}
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
    index,
}: {
    workout: ImportableWorkout;
    onTypeChange: (type: FitTrackWorkoutType) => void;
    index: number;
}) {
    const { t } = useTranslation();
    const isSkipped = workout.fitTrackType === 'skip';
    
    // Determine active color based on type
    const activeType = WORKOUT_TYPES.find(t => t.type === workout.fitTrackType);
    const activeColor = activeType?.color || Colors.cta;

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
                    { backgroundColor: isSkipped ? '#374151' : activeColor }
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
                        <View style={[styles.durationBadge, isSkipped && { backgroundColor: '#374151' }]}>
                            <Text style={[styles.durationText, isSkipped && { color: '#9CA3AF' }]}>
                                {workout.durationMinutes}
                            </Text>
                            <Text style={[styles.minText, isSkipped && { color: '#6B7280' }]}>
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

                    {/* Type Selector */}
                    <View style={styles.pillContainer}>
                        {WORKOUT_TYPES.map((wt) => (
                            <WorkoutTypePill
                                key={wt.type}
                                type={wt.type}
                                label={wt.label}
                                icon={wt.icon}
                                color={wt.color}
                                selected={workout.fitTrackType === wt.type}
                                onPress={() => onTypeChange(wt.type)}
                            />
                        ))}
                    </View>
                </View>
            </View>
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
    const [importing, setImporting] = useState(false);
    const [daysBack, setDaysBack] = useState(7);
    const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);
    const hasLoadedOnce = useRef(false);
    const settingsSheetRef = useRef<HealthConnectSettingsSheetRef>(null);

    const { addHomeWorkout, addRun, addBeatSaber, entries, syncGamificationAfterChange } = useAppStore();
    const { addXp, updateQuestProgress, recalculateAllQuests } = useGamificationStore();

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
            
            // Simple mapping, selection logic handled inside component
            const importable = notImported.map((w): ImportableWorkout => ({
                ...w,
                fitTrackType: healthConnect.getDefaultFitTrackType(w.exerciseType as number),
                selected: true,
            }));

            setWorkouts(importable);
        } catch (error) {
            console.error('Error loading workouts:', error);
        } finally {
            setIsLoadingWorkouts(false);
        }
    };

    const handleTypeChange = useCallback((workoutId: string, type: FitTrackWorkoutType) => {
        setWorkouts((prev) =>
            prev.map((w) =>
                w.id === workoutId
                    ? { ...w, fitTrackType: type, selected: type !== 'skip' }
                    : w
            )
        );
    }, []);

    const handleImport = async () => {
        const toImport = workouts.filter((w) => w.selected && w.fitTrackType !== 'skip');
        if (toImport.length === 0) return;

        setImporting(true);
        try {
            let totalXp = 0;
            let workoutsAdded = 0;
            let totalDuration = 0;
            let totalDistance = 0;

            for (const workout of toImport) {
                const date = format(workout.startTime, 'yyyy-MM-dd');
                switch (workout.fitTrackType) {
                    case 'home':
                        addHomeWorkout({
                            name: workout.title || workout.exerciseTypeName,
                            exercises: t('healthConnect.importedFrom'),
                            durationMinutes: workout.durationMinutes,
                            healthConnectId: workout.id,
                        }, date);
                        totalXp += 20 + Math.floor(workout.durationMinutes / 5);
                        workoutsAdded++;
                        totalDuration += workout.durationMinutes;
                        break;
                    case 'run':
                        const distanceKm = workout.distance ? workout.distance / 1000 : 5;
                        addRun({ 
                            distanceKm, 
                            durationMinutes: workout.durationMinutes,
                            healthConnectId: workout.id,
                        }, date);
                        totalXp += 25 + Math.floor(distanceKm * 5);
                        workoutsAdded++;
                        totalDistance += distanceKm;
                        totalDuration += workout.durationMinutes;
                        break;
                    case 'beatsaber':
                        addBeatSaber({ 
                            durationMinutes: workout.durationMinutes,
                            healthConnectId: workout.id,
                        }, date);
                        totalXp += 15 + Math.floor(workout.durationMinutes / 5);
                        workoutsAdded++;
                        totalDuration += workout.durationMinutes;
                        break;
                }
            }

            if (totalXp > 0) addXp(totalXp, t('healthConnect.importXpLabel'));
            if (workoutsAdded > 0) updateQuestProgress('workouts', workoutsAdded);
            
            const totals = calculateQuestTotals([...entries, ...toImport.map(() => ({} as any))]);
            recalculateAllQuests(totals);

            Alert.alert(
                t('common.success'), 
                t('healthConnect.importSuccess', { count: workoutsAdded, xp: totalXp }),
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
                colors={[Colors.overlay, 'transparent']}
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
                        <AlertCircle size={40} color="#EF4444" />
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
        const selectedCount = workouts.filter((w) => w.selected && w.fitTrackType !== 'skip').length;

        return (
            <>
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Summary Card */}
                    {workouts.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(100)}>
                            <LinearGradient
                                colors={[Colors.cta + '20', 'transparent']}
                                style={styles.summaryCard}
                            >
                                <Zap size={20} color={Colors.cta} fill={Colors.cta} />
                                <Text style={styles.summaryText}>
                                    <Text style={{ fontWeight: 'bold', color: Colors.text }}>{workouts.length}</Text>{' '}
                                    {t('healthConnect.workoutsFound', { days: daysBack })}
                                </Text>
                            </LinearGradient>
                        </Animated.View>
                    )}

                    {workouts.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Image 
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/7486/7486744.png' }} 
                                style={{ width: 80, height: 80, opacity: 0.5, marginBottom: 16 }} 
                            />
                            <Text style={styles.emptyTitle}>{t('healthConnect.emptyTitle')}</Text>
                            <Text style={styles.emptyText}>{t('healthConnect.emptyMessage')}</Text>
                        </View>
                    ) : (
                        workouts.map((workout, index) => (
                            <WorkoutImportCard
                                key={workout.id}
                                workout={workout}
                                index={index}
                                onTypeChange={(type) => handleTypeChange(workout.id, type)}
                            />
                        ))
                    )}
                    
                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Bottom Action Bar */}
                {workouts.length > 0 && (
                    <Animated.View entering={FadeInDown} style={styles.bottomBarContainer}>
                        <GlassCard style={styles.bottomBar}>
                            <View>
                                <Text style={styles.bottomBarLabel}>{t('healthConnect.selectedLabel')}</Text>
                                <Text style={styles.bottomBarValue}>{selectedCount} {t('healthConnect.sessions')}</Text>
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

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <Header />
                {renderContent()}
            </SafeAreaView>
            <HealthConnectSettingsSheet ref={settingsSheetRef} />
        </View>
    );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    safeArea: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        paddingTop: Spacing.sm,
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    scrollContent: {
        padding: Spacing.md,
    },
    statusText: {
        marginTop: Spacing.md,
        color: Colors.muted,
        fontSize: FontSize.md,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fee2e2', // red-100
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    errorTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    errorText: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 22,
    },
    
    // Summary Card
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.cta + '40',
        marginBottom: Spacing.lg,
    },
    summaryText: {
        color: Colors.text,
        fontSize: FontSize.md,
    },

    // Workout Card
    cardContainer: {
        backgroundColor: Colors.cardSolid,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    cardSkipped: {
        backgroundColor: '#1F2937', // Darker gray
        borderColor: '#374151',
        opacity: 0.8,
    },
    accentBar: {
        width: 6,
        height: '100%',
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    textSkipped: {
        color: Colors.muted,
        textDecorationLine: 'line-through',
    },
    cardMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardMetaText: {
        fontSize: 13,
        color: Colors.muted,
        fontWeight: '500',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: Colors.muted,
    },
    durationBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.overlay,
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
        minWidth: 50,
    },
    durationText: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text,
        lineHeight: 20,
    },
    minText: {
        fontSize: 10,
        color: Colors.muted,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    originalName: {
        fontSize: 12,
        color: Colors.muted,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    
    // Pills
    pillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    typePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    typePillInactive: {
        backgroundColor: 'transparent',
        borderColor: Colors.stroke,
    },
    typePillLabel: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 10,
    },
    emptyText: {
        color: Colors.muted,
        marginTop: 5,
    },

    // Bottom Bar
    bottomBarContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: BorderRadius.xl,
        backgroundColor: 'rgba(20,20,30,0.95)',
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    bottomBarLabel: {
        fontSize: 12,
        color: Colors.muted,
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    bottomBarValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    }
});
