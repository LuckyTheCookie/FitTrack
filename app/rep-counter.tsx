// ============================================================================
// REP COUNTER SCREEN - Compteur d'exercices avec détection de mouvement
// Utilise l'accéléromètre OU la caméra pour détecter les répétitions
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Vibration,
    Alert,
    Modal,
    BackHandler,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, useFocusEffect } from 'expo-router';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    withRepeat,
    interpolate,
    Extrapolation,
    FadeIn,
    FadeInDown,
    FadeOut,
    ZoomIn,
    runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import {
    ArrowLeft,
    Play,
    Pause,
    RotateCcw,
    Check,
    Smartphone,
    ArrowDown,
    Dumbbell,
    Timer,
    Flame,
    ChevronRight,
    Zap,
    Camera,
    Activity,
    Video,
    Volume2,
} from 'lucide-react-native';
import { GlassCard, PoseCameraView } from '../src/components/ui';
import { useAppStore, useGamificationStore } from '../src/stores';
import type { PlankDebugInfo, EllipticalState } from '../src/utils/poseDetection';
import {
    startEllipticalStillFirstCalibration,
    completeEllipticalStillPhase,
    completeEllipticalPedalingPhase,
    detectEllipticalMovement,
    isEllipticalCalibrated,
    resetEllipticalState,
    addEllipticalHeadSample,
    hasEllipticalMovementStarted,
    resetEllipticalSamples,
} from '../src/utils/poseDetection';
import { useTranslation } from 'react-i18next';
import { calculateQuestTotals } from '../src/utils/questCalculator';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Messages motivants pour la gamification par exercice
// Motivational messages are localized through i18n under `repCounter.motivations.<exerciseId>` (array of strings including emojis)
// Example in locales: "repCounter": { "motivations": { "pushups": ["Keep going! 💪", "Pecs on fire! 🔥", ...] } }

// Note: messages are looked up dynamically inside the component using `t(..., { returnObjects: true })`

// Types d'exercices supportés
type ExerciseType = 'pushups' | 'situps' | 'squats' | 'jumping_jacks' | 'plank' | 'elliptical';
type DetectionMode = 'sensor' | 'camera' | 'manual';
type CameraView = 'front' | 'side';
type EllipticalCalibrationPhase = 'none' | 'intro' | 'get_ready' | 'still' | 'still_done' | 'pedaling' | 'complete' | 'start_moving' | 'moving' | 'start_stopping' | 'stopping' | 'done';

interface ExerciseConfig {
    id: ExerciseType;
    name: string;
    icon: string;
    color: string;
    instruction?: string;
    cameraInstruction?: string;
    instructionKey?: string;
    cameraInstructionKey?: string;
    manualInstructionKey?: string;
    threshold: number; // Sensibilité de détection
    axis: 'x' | 'y' | 'z'; // Axe principal de mouvement
    cooldown: number; // Temps minimum entre 2 reps (ms)
    supportsCameraMode: boolean;
    supportsManualMode?: boolean;
    requiresCalibration?: boolean;
    preferredCameraView: CameraView;
    isTimeBased?: boolean; // Pour la planche: compte les secondes au lieu des reps
    keepGoingIntervalSeconds?: number; // Override for keep going sound interval
}

const EXERCISES: ExerciseConfig[] = [
    {
        id: 'pushups',
        name: 'Pompes',
        icon: '💪',
        color: '#4ade80',
        instructionKey: 'repCounter.instructions.pushups.default',
        cameraInstructionKey: 'repCounter.instructions.pushups.camera',
        threshold: 0.4,
        axis: 'z',
        cooldown: 600,
        supportsCameraMode: true,
        preferredCameraView: 'side',
    },
    {
        id: 'situps',
        name: 'Abdos',
        icon: '🔥',
        color: '#f97316',
        instructionKey: 'repCounter.instructions.situps.default',
        cameraInstructionKey: 'repCounter.instructions.situps.camera',
        threshold: 0.5,
        axis: 'z',
        cooldown: 800,
        supportsCameraMode: true,
        preferredCameraView: 'side',
    },
    {
        id: 'squats',
        name: 'Squats',
        icon: '🦵',
        color: '#8b5cf6',
        instructionKey: 'repCounter.instructions.squats.default',
        cameraInstructionKey: 'repCounter.instructions.squats.camera',
        threshold: 0.35,
        axis: 'y',
        cooldown: 700,
        supportsCameraMode: true,
        preferredCameraView: 'front',
    },
    {
        id: 'jumping_jacks',
        name: 'Jumping Jacks',
        icon: '⭐',
        color: '#eab308',
        instructionKey: 'repCounter.instructions.jumpingJacks.default',
        cameraInstructionKey: 'repCounter.instructions.jumpingJacks.camera',
        threshold: 0.6,
        axis: 'y',
        cooldown: 400,
        supportsCameraMode: true,
        preferredCameraView: 'front',
    },
    {
        id: 'plank',
        name: 'Planche',
        icon: '🧘',
        color: '#06b6d4',
        instructionKey: 'repCounter.instructions.plank.default',
        cameraInstructionKey: 'repCounter.instructions.plank.camera',
        threshold: 0.3,
        axis: 'z',
        cooldown: 500,
        supportsCameraMode: true,
        preferredCameraView: 'side',
        isTimeBased: true,
    },
    {
        id: 'elliptical',
        name: 'Vélo elliptique',
        icon: '🚴',
        color: '#10b981',
        instructionKey: 'repCounter.instructions.elliptical.default',
        cameraInstructionKey: 'repCounter.instructions.elliptical.camera',
        manualInstructionKey: 'repCounter.instructions.elliptical.manual',
        threshold: 0.3,
        axis: 'y',
        cooldown: 500,
        supportsCameraMode: true,
        supportsManualMode: true,
        requiresCalibration: true,
        preferredCameraView: 'front',
        isTimeBased: true,
        keepGoingIntervalSeconds: 300, // 5 minutes
    },
];

// Étapes du tutoriel
type TutorialStep = 'select' | 'position' | 'ready' | 'counting' | 'done';

// Composant pour l'anneau de progression
const ProgressRing = ({ progress, size = 220, children }: { progress: number; size?: number; children: React.ReactNode }) => {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
                <Defs>
                    <SvgLinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={Colors.cta} />
                        <Stop offset="100%" stopColor={Colors.cta2} />
                    </SvgLinearGradient>
                </Defs>
                {/* Background circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={Colors.overlay}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#ringGradient)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={`${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            {children}
        </View>
    );
};

// Composant pour la sélection d'exercice
const ExerciseSelector = ({
    onSelect,
    selectedExercise
}: {
    onSelect: (exercise: ExerciseConfig) => void;
    selectedExercise: ExerciseConfig | null;
}) => {
    const { t } = useTranslation();

    return (
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.exerciseGrid}>
            {EXERCISES.map((exercise, index) => (
                <Animated.View
                    key={exercise.id}
                    entering={FadeInDown.delay(300 + index * 100).springify()}
                >
                    <TouchableOpacity
                        onPress={() => onSelect(exercise)}
                        activeOpacity={0.8}
                        style={[
                            styles.exerciseCard,
                            selectedExercise?.id === exercise.id && { borderColor: exercise.color, borderWidth: 2 },
                        ]}
                    >
                        <LinearGradient
                            colors={[`${exercise.color}22`, `${exercise.color}11`]}
                            style={styles.exerciseCardGradient}
                        >
                            <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
                            <Text style={styles.exerciseName}>{t(`repCounter.exercises.${exercise.id === 'jumping_jacks' ? 'jumpingJacks' : exercise.id}`)}</Text>
                            {selectedExercise?.id === exercise.id && (
                                <View style={[styles.selectedBadge, { backgroundColor: exercise.color }]}>
                                    <Check size={12} color="#fff" strokeWidth={3} />
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            ))}
        </Animated.View>
    );
};

// Composant pour l'écran de positionnement
const PositionScreen = ({
    exercise,
    onReady,
    detectionMode,
}: {
    exercise: ExerciseConfig;
    onReady: () => void;
    detectionMode: DetectionMode;
}) => {
    const { t } = useTranslation();
    const bounce = useSharedValue(0);

    useEffect(() => {
        bounce.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000 }),
                withTiming(0, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    const bounceStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(bounce.value, [0, 1], [0, 10]) }],
    }));

    const instruction = detectionMode === 'camera'
        ? t((exercise.cameraInstructionKey || exercise.cameraInstruction) as string)
        : t((exercise.instructionKey || exercise.instruction) as string);

    return (
        <Animated.View entering={FadeIn} style={styles.positionContainer}>
            <Animated.View style={[styles.phoneIconWrapper, bounceStyle]}>
                <View style={[styles.phoneIcon, { borderColor: exercise.color }]}>
                    {detectionMode === 'camera' ? (
                        <Camera size={48} color={exercise.color} />
                    ) : exercise.isTimeBased ? (
                        <Timer size={48} color={exercise.color} />
                    ) : (
                        <Smartphone size={48} color={exercise.color} />
                    )}
                </View>
                {!exercise.isTimeBased && (
                    <ArrowDown size={32} color={exercise.color} style={styles.arrowIcon} />
                )}
            </Animated.View>

            <Text style={styles.positionTitle}>{instruction}</Text>
            <Text style={styles.positionSubtitle}>
                {exercise.isTimeBased
                    ? t('repCounter.pressPlay')
                    : detectionMode === 'camera'
                        ? t('repCounter.cameraNote')
                        : t('repCounter.whenReady')
                }
            </Text>

            {/* Volume recommendation for plank */}
            {exercise.isTimeBased && (
                <View style={styles.volumeRecommendation}>
                    <Volume2 size={18} color="#facc15" />
                    <Text style={styles.volumeRecommendationText}>
                        {t('repCounter.volumeHint')}
                    </Text>
                </View>
            )}

            <TouchableOpacity onPress={onReady} activeOpacity={0.9} style={styles.readyButton}>
                <LinearGradient
                    colors={[exercise.color, `${exercise.color}dd`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.readyButtonGradient}
                >
                    <Play size={24} color="#fff" fill="#fff" />
                    <Text style={styles.readyButtonText}>{t('common.start')}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Écran principal
export default function RepCounterScreen() {
    const { settings, addHomeWorkout, entries } = useAppStore();
    const { recalculateAllQuests } = useGamificationStore();

    const [step, setStep] = useState<TutorialStep>('select');
    const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [repCount, setRepCount] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [detectionMode, setDetectionMode] = useState<DetectionMode>(
        settings.preferCameraDetection ? 'camera' : 'sensor'
    );
    const [currentPhase, setCurrentPhase] = useState<'up' | 'down' | 'neutral'>('neutral');
    const [motivationalMessage, setMotivationalMessage] = useState<{ text: string; emoji: string } | null>(null);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [isPlankActive, setIsPlankActive] = useState(false); // Pour la planche: est-ce que l'utilisateur est levé?
    const [plankSeconds, setPlankSeconds] = useState(0); // Secondes tenues en planche
    const [plankDebugInfo, setPlankDebugInfo] = useState<PlankDebugInfo | null>(null); // Debug info for plank
    const [showNewRecord, setShowNewRecord] = useState(false); // Affichage du message de nouveau record
    const [personalBest, setPersonalBest] = useState(0); // Record personnel pour cet exercice

    // Elliptical specific states
    const [ellipticalCalibrationPhase, setEllipticalCalibrationPhase] = useState<EllipticalCalibrationPhase>('none');
    const [ellipticalSeconds, setEllipticalSeconds] = useState(0); // Seconds spent cycling
    const [isEllipticalActive, setIsEllipticalActive] = useState(false); // Is user currently pedaling
    const [ellipticalState, setEllipticalState] = useState<EllipticalState | null>(null);
    const ellipticalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const calibrationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastKeepGoingTime = useRef(0); // For 5-minute keep going interval

    const { t } = useTranslation();

    // Sound effects avec expo-audio
    const repSound = useAudioPlayer(require('../assets/rep.mp3'));
    const keepGoingSound = useAudioPlayer(require('../assets/keepgoing.mp3'));
    const secondsSound = useAudioPlayer(require('../assets/seconds.mp3'));
    const newRecordSound = useAudioPlayer(require('../assets/new-record.mp3'));
    const finishedSound = useAudioPlayer(require('../assets/finished.mp3'));

    // Pour la détection de mouvement améliorée
    const lastRepTime = useRef(0);
    const isInRep = useRef(false);
    const baselineZ = useRef(0);
    const calibrationSamples = useRef<number[]>([]);
    const recentValues = useRef<number[]>([]); // Buffer pour lissage
    const peakValue = useRef(0);
    const wasAboveThreshold = useRef(false);
    const subscriptionRef = useRef<any>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const plankTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasBeatenRecord = useRef(false); // Pour éviter de jouer le son plusieurs fois

    // Animations
    const countScale = useSharedValue(1);
    const pulseOpacity = useSharedValue(0);
    const messageOpacity = useSharedValue(0);


    // State pour le modal de confirmation de sortie
    const [showExitModal, setShowExitModal] = useState(false);
    const [workoutSaved, setWorkoutSaved] = useState(false);

    // Gérer le bouton retour Android et reset quand on arrive sur l'écran
    useFocusEffect(
        useCallback(() => {
            // Reset au focus si le workout est terminé et sauvegardé
            if (workoutSaved) {
                setStep('select');
                setSelectedExercise(null);
                setRepCount(0);
                setElapsedTime(0);
                setIsTracking(false);
                setWorkoutSaved(false);
            }

            // Gérer le bouton retour Android
            const onBackPress = () => {
                if (step === 'counting' || step === 'position') {
                    setShowExitModal(true);
                    return true; // Empêcher le retour par défaut
                }
                return false; // Laisser le comportement par défaut
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [step, workoutSaved])
    );

    // Fonction pour quitter avec confirmation
    const handleExitConfirm = useCallback(() => {
        // Arrêter le tracking manuellement
        setIsTracking(false);
        if (subscriptionRef.current) {
            subscriptionRef.current.remove();
            subscriptionRef.current = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        // Reset de l'état
        setShowExitModal(false);
        setStep('select');
        setSelectedExercise(null);
        setRepCount(0);
        setElapsedTime(0);
    }, []);

    const handleExitCancel = useCallback(() => {
        setShowExitModal(false);
    }, []);

    // Gérer le bouton retour (header)
    const handleBackPress = useCallback(() => {
        if (step === 'counting' || step === 'position') {
            setShowExitModal(true);
        } else {
            router.back();
        }
    }, [step]);

    // Play sound
    const playRepSound = useCallback(() => {
        try {
            repSound.seekTo(0);
            repSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [repSound]);

    // Play keep going sound (every 10 reps/seconds)
    const playKeepGoingSound = useCallback(() => {
        try {
            keepGoingSound.seekTo(0);
            keepGoingSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [keepGoingSound]);

    // Play seconds sound (for plank only)
    const playSecondsSound = useCallback(() => {
        try {
            secondsSound.seekTo(0);
            secondsSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [secondsSound]);

    // Play new record sound
    const playNewRecordSound = useCallback(() => {
        try {
            newRecordSound.seekTo(0);
            newRecordSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [newRecordSound]);

    // Play finished sound
    const playFinishedSound = useCallback(() => {
        try {
            finishedSound.seekTo(0);
            finishedSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [finishedSound]);

    // Charger le record personnel pour l'exercice sélectionné
    useEffect(() => {
        if (selectedExercise) {
            // Chercher le record dans les entrées précédentes
            const exerciseEntries = entries.filter(e => 
                e.type === 'home' && 
                e.name?.toLowerCase().includes(selectedExercise.name.toLowerCase())
            );
            let best = 0;
            for (const entry of exerciseEntries) {
                // Type guard: entry is HomeWorkoutEntry after the filter above
                if (entry.type !== 'home') continue;
                if (selectedExercise.isTimeBased) {
                    // Pour la planche, chercher la durée max
                    const durationSecs = (entry.durationMinutes ?? 0) * 60;
                    if (durationSecs > best) {
                        best = durationSecs;
                    }
                } else {
                    // Pour les autres exercices, chercher le max de reps
                    const reps = entry.totalReps ?? 0;
                    if (reps > best) {
                        best = reps;
                    }
                }
            }
            setPersonalBest(best);
            hasBeatenRecord.current = false;
        }
    }, [selectedExercise, entries]);

    // Vérifier si on a battu le record
    useEffect(() => {
        if (!selectedExercise || hasBeatenRecord.current) return;
        
        const currentValue = selectedExercise.isTimeBased 
            ? (selectedExercise.id === 'elliptical' ? ellipticalSeconds : plankSeconds) 
            : repCount;
        if (currentValue > personalBest && currentValue > 0) {
            hasBeatenRecord.current = true;
            setShowNewRecord(true);
            playNewRecordSound();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Cacher le message après 3 secondes
            setTimeout(() => setShowNewRecord(false), 3000);
        }
    }, [repCount, plankSeconds, ellipticalSeconds, personalBest, selectedExercise, playNewRecordSound]);

    // Show motivational message
    const showMotivationalMessage = useCallback((feedback?: string) => {
        if (feedback) {
            setAiFeedback(feedback);
        }
        // Localized motivational messages per exercise (objects with text + emoji)
        if (selectedExercise) {
            const messages = t(`repCounter.motivations.${selectedExercise.id}`, { returnObjects: true }) as Array<{ text: string; emoji: string }>;
            if (messages && messages.length > 0) {
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                setMotivationalMessage(randomMessage);
            }
        }
        messageOpacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withTiming(1, { duration: 1500 }),
            withTiming(0, { duration: 300 })
        );
        setTimeout(() => {
            setMotivationalMessage(null);
            setAiFeedback(null);
        }, 2000);
    }, [selectedExercise, t]);

    const messageStyle = useAnimatedStyle(() => ({
        opacity: messageOpacity.value,
        transform: [{ scale: interpolate(messageOpacity.value, [0, 1], [0.8, 1]) }],
    }));

    // Animation du compteur quand on fait une rep
    const animateRep = useCallback(() => {
        'worklet';
        countScale.value = withSequence(
            withSpring(1.3, { damping: 5 }),
            withSpring(1, { damping: 8 })
        );
        pulseOpacity.value = withSequence(
            withTiming(0.8, { duration: 100 }),
            withTiming(0, { duration: 400 })
        );
    }, []);

    const countStyle = useAnimatedStyle(() => ({
        transform: [{ scale: countScale.value }],
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
        transform: [{ scale: interpolate(pulseOpacity.value, [0, 0.8], [1, 1.5]) }],
    }));

    // Démarrer le timer
    useEffect(() => {
        if (isTracking) {
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isTracking]);

    // Fonction pour incrémenter le compteur
    const incrementRep = useCallback(() => {
        setRepCount(prev => {
            const newCount = prev + 1;
            // Jouer le son keepgoing toutes les 10 reps
            if (newCount > 0 && newCount % 10 === 0) {
                playKeepGoingSound();
            }
            return newCount;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        playRepSound();
        showMotivationalMessage();
        animateRep();
    }, [animateRep, playRepSound, showMotivationalMessage, playKeepGoingSound]);

    // Callback pour la détection de rep par caméra IA
    const handleCameraRepDetected = useCallback((newCount: number, feedback?: string) => {
        if (isTracking && newCount > repCount) {
            // Jouer le son keepgoing toutes les 10 reps
            if (newCount > 0 && newCount % 10 === 0) {
                playKeepGoingSound();
            }
            setRepCount(newCount);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            playRepSound();
            showMotivationalMessage(feedback);
            animateRep();
        }
    }, [isTracking, repCount, animateRep, playRepSound, showMotivationalMessage, playKeepGoingSound]);

    // Callback pour le changement d'état de la planche (caméra)
    const handlePlankStateChange = useCallback((isInPlank: boolean, confidence: number, debugInfo?: PlankDebugInfo) => {
        if (!isTracking || !selectedExercise?.isTimeBased) return;
        
        // Store debug info if available
        if (debugInfo) {
            setPlankDebugInfo(debugInfo);
        }
        
        console.log(`[RepCounter] Plank state change: ${isInPlank ? 'IN PLANK' : 'NOT IN PLANK'} (${(confidence * 100).toFixed(0)}%)`);
        
        if (isInPlank && !isPlankActive) {
            // L'utilisateur entre en position de planche
            setIsPlankActive(true);
            showMotivationalMessage(t('repCounter.motivations.started'));
        } else if (!isInPlank && isPlankActive) {
            // L'utilisateur sort de la position de planche
            setIsPlankActive(false);
            if (plankSeconds > 0) {
                showMotivationalMessage(t('repCounter.motivations.plankSec', { seconds: plankSeconds }));
            }
        }
    }, [isTracking, selectedExercise?.isTimeBased, isPlankActive, plankSeconds, showMotivationalMessage]);

    // Gestion du timer pour la planche
    useEffect(() => {
        if (isTracking && selectedExercise?.isTimeBased && isPlankActive) {
            plankTimerRef.current = setInterval(() => {
                setPlankSeconds(prev => {
                    const newSeconds = prev + 1;
                    // Jouer le son des secondes
                    playSecondsSound();
                    // Jouer keepgoing toutes les 10 secondes
                    if (newSeconds > 0 && newSeconds % 10 === 0) {
                        playKeepGoingSound();
                        showMotivationalMessage();
                    }
                    return newSeconds;
                });
            }, 1000);
        } else if (plankTimerRef.current) {
            clearInterval(plankTimerRef.current);
        }

        return () => {
            if (plankTimerRef.current) {
                clearInterval(plankTimerRef.current);
            }
        };
    }, [isTracking, selectedExercise?.isTimeBased, isPlankActive, playSecondsSound, playKeepGoingSound, showMotivationalMessage]);

    // Fonction pour toggle la planche (up/down)
    const togglePlank = useCallback((isUp: boolean) => {
        if (!selectedExercise?.isTimeBased) return;
        
        if (isUp && !isPlankActive) {
            // L'utilisateur se lève
            setIsPlankActive(true);
            console.log('[Plank] Utilisateur levé - timer démarré');
        } else if (!isUp && isPlankActive) {
            // L'utilisateur retombe
            setIsPlankActive(false);
            console.log(`[Plank] Utilisateur tombé après ${plankSeconds}s`);
        }
    }, [selectedExercise?.isTimeBased, isPlankActive, plankSeconds]);

    // ========================================================================
    // ELLIPTICAL BIKE SPECIFIC FUNCTIONS
    // ========================================================================

    // Handle elliptical movement state change (from pose detection)
    const handleEllipticalStateChange = useCallback((state: EllipticalState) => {
        setEllipticalState(state);
        
        if (!isTracking || selectedExercise?.id !== 'elliptical') return;
        if (detectionMode !== 'camera' || !isEllipticalCalibrated()) return;
        
        if (state.isMoving && !isEllipticalActive) {
            // User started pedaling
            setIsEllipticalActive(true);
            console.log('[Elliptical] User started pedaling');
        } else if (!state.isMoving && isEllipticalActive) {
            // User stopped pedaling
            setIsEllipticalActive(false);
            if (ellipticalSeconds > 0) {
                showMotivationalMessage(t('repCounter.motivations.ellipticalPause'));
            }
            console.log(`[Elliptical] User stopped after ${ellipticalSeconds}s`);
        }
    }, [isTracking, selectedExercise?.id, detectionMode, isEllipticalActive, ellipticalSeconds, showMotivationalMessage, t]);

    // Timer for elliptical seconds (counts while isEllipticalActive)
    useEffect(() => {
        if (isTracking && selectedExercise?.id === 'elliptical' && isEllipticalActive) {
            ellipticalTimerRef.current = setInterval(() => {
                setEllipticalSeconds(prev => {
                    const newSeconds = prev + 1;
                    const now = Date.now();
                    
                    // Play keep going every X minutes (from settings, default 5 min)
                    const keepGoingIntervalMinutes = settings.keepGoingIntervalMinutes ?? 5;
                    const keepGoingInterval = keepGoingIntervalMinutes * 60;
                    if (newSeconds > 0 && newSeconds % keepGoingInterval === 0) {
                        if (now - lastKeepGoingTime.current > 60000) { // At least 1 minute apart
                            playKeepGoingSound();
                            showMotivationalMessage();
                            lastKeepGoingTime.current = now;
                        }
                    }
                    return newSeconds;
                });
            }, 1000);
        } else if (ellipticalTimerRef.current) {
            clearInterval(ellipticalTimerRef.current);
        }

        return () => {
            if (ellipticalTimerRef.current) {
                clearInterval(ellipticalTimerRef.current);
            }
        };
    }, [isTracking, selectedExercise?.id, selectedExercise?.keepGoingIntervalSeconds, isEllipticalActive, playKeepGoingSound, showMotivationalMessage]);

    // Start elliptical calibration process
    const [ellipticalCalibrationFailed, setEllipticalCalibrationFailed] = useState(false);
    const [calibrationCountdown, setCalibrationCountdown] = useState(0);
    const [calibrationFunnyPhrase, setCalibrationFunnyPhrase] = useState('');
    const [waitingForMovement, setWaitingForMovement] = useState(false); // True when waiting for user to start moving
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Get random funny phrase from translations
    const getRandomPhrase = useCallback((key: 'funnyStillPhrases' | 'funnyStillDone') => {
        const phrases = t(`repCounter.elliptical.${key}`, { returnObjects: true }) as string[];
        return phrases[Math.floor(Math.random() * phrases.length)];
    }, [t]);

    // New automatic calibration flow
    const startEllipticalCalibration = useCallback(() => {
        // Reset states
        setEllipticalCalibrationFailed(false);
        resetEllipticalState();
        setEllipticalCalibrationPhase('intro');
    }, []);

    // Ref for the movement detection interval
    const movementDetectionRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Complete pedaling phase and finalize calibration (defined first to avoid circular deps)
    const completePedalingPhaseCallback = useCallback(() => {
        const success = completeEllipticalPedalingPhase();
        if (success) {
            setEllipticalCalibrationPhase('complete');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playNewRecordSound(); // Celebration sound
            
            // Start tracking after brief celebration
            setTimeout(() => {
                setStep('counting');
                setIsTracking(true);
                setEllipticalSeconds(0);
                setIsEllipticalActive(false);
                lastKeepGoingTime.current = 0;
            }, 2000);
        } else {
            // Calibration failed
            setEllipticalCalibrationPhase('intro');
            setEllipticalCalibrationFailed(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
    }, [playNewRecordSound]);

    // Start the actual pedaling countdown (after movement detected)
    const startPedalingCountdown = useCallback(() => {
        // Reset samples again to collect clean pedaling data
        resetEllipticalSamples();
        
        // 7 second countdown
        setCalibrationCountdown(7);
        
        // Wait 1 second before starting countdown
        setTimeout(() => {
            countdownIntervalRef.current = setInterval(() => {
                setCalibrationCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current!);
                        // Complete pedaling phase
                        completePedalingPhaseCallback();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, 1000);
    }, [completePedalingPhaseCallback]);

    // Wait for user to actually start moving before starting the pedaling timer
    const waitForUserToStartPedaling = useCallback(() => {
        setEllipticalCalibrationPhase('pedaling');
        // Reset samples to collect fresh movement data
        resetEllipticalSamples();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Don't start countdown yet - wait for movement to be detected
        setWaitingForMovement(true);
        setCalibrationCountdown(7);
        
        // Check every 200ms if user has started moving
        movementDetectionRef.current = setInterval(() => {
            if (hasEllipticalMovementStarted()) {
                // User started moving! Start the actual countdown
                clearInterval(movementDetectionRef.current!);
                movementDetectionRef.current = null;
                setWaitingForMovement(false);
                startPedalingCountdown();
            }
        }, 200);
    }, [startPedalingCountdown]);

    // Start the pedaling phase - legacy function kept for reference (now uses waitForUserToStartPedaling)
    const startPedalingPhase = useCallback(() => {
        waitForUserToStartPedaling();
    }, [waitForUserToStartPedaling]);

    // Complete the still phase - records stoppedVariance
    const completeStillPhase = useCallback(() => {
        const variance = completeEllipticalStillPhase();
        if (variance >= 0) {
            // Stopped variance recorded, prepare for moving phase
            setCalibrationFunnyPhrase(getRandomPhrase('funnyStillDone'));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Brief pause to show success message, then wait for user to start moving
            setTimeout(() => {
                waitForUserToStartPedaling();
            }, 1500);
        } else {
            // Failed - not enough samples
            setEllipticalCalibrationPhase('intro');
            setEllipticalCalibrationFailed(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
    }, [getRandomPhrase, waitForUserToStartPedaling]);

    // Start the "don't move" phase (5 seconds)
    const startStillPhase = useCallback(() => {
        setEllipticalCalibrationPhase('still');
        setCalibrationFunnyPhrase(getRandomPhrase('funnyStillPhrases'));
        startEllipticalStillFirstCalibration(); // Initialize calibration and start collecting samples
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Start at 5 seconds and wait 1 second before first decrement
        setCalibrationCountdown(5);
        
        // Wait 1 second before starting the countdown interval
        setTimeout(() => {
            countdownIntervalRef.current = setInterval(() => {
                setCalibrationCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current!);
                        // Complete still phase and transition to pedaling
                        completeStillPhase();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, 1000);
    }, [getRandomPhrase, completeStillPhase]);

    // User clicked "Let's go" - start the automatic calibration sequence
    const beginCalibrationSequence = useCallback(() => {
        setEllipticalCalibrationPhase('get_ready');
        
        // 3 second countdown with sound - start at 3 and wait before first decrement
        setCalibrationCountdown(3);
        playSecondsSound();
        
        // Wait 1 second before starting the countdown interval
        setTimeout(() => {
            countdownIntervalRef.current = setInterval(() => {
                setCalibrationCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current!);
                        // Transition to "don't move" phase
                        startStillPhase();
                        return 0;
                    }
                    playSecondsSound();
                    return prev - 1;
                });
            }, 1000);
        }, 1000);
    }, [playSecondsSound, startStillPhase]);

    // Cleanup countdown interval and movement detection on unmount
    useEffect(() => {
        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
            if (movementDetectionRef.current) {
                clearInterval(movementDetectionRef.current);
            }
        };
    }, []);

    // Legacy functions kept for compatibility
    const completeMovingPhase = useCallback(() => {
        // Now handled automatically
    }, []);

    const completeStoppedPhase = useCallback(() => {
        // Now handled automatically
    }, []);

    // Manual mode toggle for elliptical
    const toggleEllipticalManual = useCallback(() => {
        if (detectionMode !== 'manual') return;
        
        setIsEllipticalActive(prev => {
            if (!prev) {
                // Starting
                console.log('[Elliptical Manual] Started');
            } else {
                // Stopping
                console.log(`[Elliptical Manual] Stopped after ${ellipticalSeconds}s`);
            }
            return !prev;
        });
    }, [detectionMode, ellipticalSeconds]);

    // Démarrer le tracking
    const startTracking = useCallback(async () => {
        if (!selectedExercise) return;

        const isResuming = repCount > 0 || plankSeconds > 0 || ellipticalSeconds > 0 || elapsedTime > 0;
        setIsTracking(true);
        // If we're starting fresh (not resuming a paused session), reset counters and state
        if (!isResuming) {
            setRepCount(0);
            setElapsedTime(0);
            setPlankSeconds(0);
            setEllipticalSeconds(0);
            setIsPlankActive(false);
            setIsEllipticalActive(false);
            hasBeatenRecord.current = false;
            calibrationSamples.current = [];
            recentValues.current = [];
            isInRep.current = false;
            lastRepTime.current = 0;
            lastKeepGoingTime.current = 0;
            peakValue.current = 0;
            wasAboveThreshold.current = false;
        }

        // Pour l'elliptique en mode caméra, la détection se fait via la caméra
        if (selectedExercise.id === 'elliptical' && detectionMode === 'camera') {
            console.log('[RepCounter] Mode vélo elliptique caméra: Détection de mouvement activée');
            return;
        }

        // Pour l'elliptique en mode manuel, on utilise juste le toggle
        if (selectedExercise.id === 'elliptical' && detectionMode === 'manual') {
            console.log('[RepCounter] Mode vélo elliptique manuel: Toggle activé');
            setIsEllipticalActive(true); // Start counting immediately in manual mode
            return;
        }

        // Pour la planche en mode caméra, la détection de position se fait via la caméra
        if (selectedExercise.isTimeBased && detectionMode === 'camera') {
            console.log('[RepCounter] Mode planche caméra: Détection de position activée');
            return; // Le timer se gère via togglePlank appelé par la détection de pose
        }

        // En mode caméra normal, on n'utilise pas l'accéléromètre
        if (detectionMode === 'camera') {
            console.log('[RepCounter] Mode caméra: Détection automatique activée');
            return;
        }

        // Mode capteur: configurer l'accéléromètre
        console.log('[RepCounter] Mode capteur: accéléromètre activé');
        Accelerometer.setUpdateInterval(30); // ~33 Hz pour une détection plus fluide

        // Calibration: collecter quelques samples pour établir la baseline
        let calibrationCount = 0;
        const CALIBRATION_SAMPLES = 15;

        subscriptionRef.current = Accelerometer.addListener((data: AccelerometerMeasurement) => {
            const now = Date.now();
            const axis = selectedExercise.axis;
            const value = data[axis];

            // Calibration (premières ~450ms)
            if (calibrationCount < CALIBRATION_SAMPLES) {
                calibrationSamples.current.push(value);
                calibrationCount++;
                if (calibrationCount === CALIBRATION_SAMPLES) {
                    baselineZ.current = calibrationSamples.current.reduce((a, b) => a + b, 0) / CALIBRATION_SAMPLES;
                    console.log('[RepCounter] Calibration terminée, baseline:', baselineZ.current.toFixed(3));
                }
                return;
            }

            // Ajouter au buffer de lissage (moyenne mobile sur 3 valeurs)
            recentValues.current.push(value);
            if (recentValues.current.length > 3) {
                recentValues.current.shift();
            }

            // Calculer la valeur lissée
            const smoothedValue = recentValues.current.reduce((a, b) => a + b, 0) / recentValues.current.length;
            const delta = Math.abs(smoothedValue - baselineZ.current);
            const threshold = selectedExercise.threshold;
            const cooldown = selectedExercise.cooldown;

            // Détection améliorée avec hystérésis
            // On compte une rep quand on passe AU-DESSUS du seuil puis qu'on REDESCEND
            const isAboveThreshold = delta > threshold;

            if (isAboveThreshold) {
                // Tracker le pic
                if (delta > peakValue.current) {
                    peakValue.current = delta;
                }
                wasAboveThreshold.current = true;
            } else if (wasAboveThreshold.current && delta < threshold * 0.4) {
                // On vient de redescendre sous le seuil après être monté
                // Vérifier le cooldown et le pic minimum
                if ((now - lastRepTime.current) > cooldown && peakValue.current > threshold * 1.2) {
                    lastRepTime.current = now;
                    runOnJS(incrementRep)();
                }
                // Reset pour la prochaine rep
                wasAboveThreshold.current = false;
                peakValue.current = 0;
            }
        });
    }, [selectedExercise, incrementRep, detectionMode, repCount, plankSeconds, elapsedTime]);

    // Arrêter le tracking
    const stopTracking = useCallback(() => {
        setIsTracking(false);
        setIsPlankActive(false);
        setIsEllipticalActive(false);
        if (subscriptionRef.current) {
            subscriptionRef.current.remove();
            subscriptionRef.current = null;
        }
        if (plankTimerRef.current) {
            clearInterval(plankTimerRef.current);
            plankTimerRef.current = null;
        }
        if (ellipticalTimerRef.current) {
            clearInterval(ellipticalTimerRef.current);
            ellipticalTimerRef.current = null;
        }
        if (calibrationTimerRef.current) {
            clearInterval(calibrationTimerRef.current);
            calibrationTimerRef.current = null;
        }
    }, []);

    // Terminer et sauvegarder
    // Save workout to store
    const saveWorkout = useCallback(async () => {
        // Pour la planche et l'elliptique, on vérifie les secondes au lieu de repCount
        const isTimeBased = selectedExercise?.isTimeBased;
        const isElliptical = selectedExercise?.id === 'elliptical';
        const seconds = isElliptical ? ellipticalSeconds : plankSeconds;
        const valueToCheck = isTimeBased ? seconds : repCount;
        
        if (!selectedExercise || valueToCheck === 0) return;

        // Jouer le son finished
        playFinishedSound();

        const exerciseId = selectedExercise.id;
        const displayName = t(`repCounter.exercises.${exerciseId}`);
        const exerciseText = isTimeBased 
            ? `${displayName}: ${seconds}s`
            : `${displayName}: ${repCount} reps`;
        const durationMinutes = isTimeBased 
            ? Math.ceil(seconds / 60) 
            : Math.floor(elapsedTime / 60);

        addHomeWorkout({
            name: t('repCounter.trackedSession', { exercise: displayName }),
            exercises: exerciseText,
            totalReps: isTimeBased ? undefined : repCount,
            durationMinutes: durationMinutes > 0 ? durationMinutes : 1,
        });

        // Attribuer les XP pour la séance
        const { addXp, updateQuestProgress } = useGamificationStore.getState();
        const xpGained = isTimeBased 
            ? 50 + Math.floor(seconds / 10) * 3 // 50 base + 3 XP par 10 secondes
            : 50 + Math.floor(repCount / 10) * 5; // 50 base + 5 XP par 10 reps
        console.log('[rep-counter] Before addXp, xp =', useGamificationStore.getState().xp);

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                try {
                    const description = isTimeBased 
                        ? `Tracking ${exerciseId} (${seconds}s)` 
                        : `Tracking ${exerciseId} (${repCount} reps)`;
                    addXp(xpGained, description);
                    updateQuestProgress('workouts', 1);
                    if (!isTimeBased && repCount > 0) updateQuestProgress('exercises', repCount);
                    if (isTimeBased) updateQuestProgress('duration', Math.ceil(seconds / 60));
                    console.log('[rep-counter] After addXp, xp =', useGamificationStore.getState().xp);

                    // Marquer comme sauvegardé pour reset au retour
                    setWorkoutSaved(true);
                } catch (err) {
                    console.error('[rep-counter] Error adding XP:', err);
                    setWorkoutSaved(true);
                } finally {
                    resolve();
                }
            }, 60);
        });
    }, [selectedExercise, repCount, plankSeconds, ellipticalSeconds, elapsedTime, addHomeWorkout, playFinishedSound, t]);

    // Recalculer les quêtes après sauvegarde (quand workoutSaved devient true)
    useEffect(() => {
        if (workoutSaved) {
            // Attendre un tick pour que le store soit à jour
            setTimeout(() => {
                const totals = calculateQuestTotals(entries);
                recalculateAllQuests(totals);
                
                // Reset les stats après quêtes recalculées
                setTimeout(() => {
                    setRepCount(0);
                    setElapsedTime(0);
                    setPlankSeconds(0);
                    setEllipticalSeconds(0);
                    setIsPlankActive(false);
                    setIsEllipticalActive(false);
                    setEllipticalCalibrationPhase('none');
                    resetEllipticalState();
                    hasBeatenRecord.current = false;
                    setWorkoutSaved(false);
                    setStep('select');
                    setSelectedExercise(null);
                }, 200);
            }, 100);
        }
    }, [workoutSaved, entries, recalculateAllQuests]);

    const finishWorkout = useCallback(() => {
        stopTracking();
        setStep('done');
    }, [stopTracking]);

    // Reset
    const resetWorkout = useCallback(() => {
        stopTracking();
        setRepCount(0);
        setElapsedTime(0);
        setPlankSeconds(0);
        setEllipticalSeconds(0);
        setIsPlankActive(false);
        setIsEllipticalActive(false);
        setEllipticalCalibrationPhase('none');
        resetEllipticalState();
        hasBeatenRecord.current = false;
        setStep('select');
        setSelectedExercise(null);
    }, [stopTracking]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (plankTimerRef.current) {
                clearInterval(plankTimerRef.current);
            }
            if (ellipticalTimerRef.current) {
                clearInterval(ellipticalTimerRef.current);
            }
            if (calibrationTimerRef.current) {
                clearInterval(calibrationTimerRef.current);
            }
        };
    }, []);

    // Sélection d'exercice
    const handleExerciseSelect = useCallback((exercise: ExerciseConfig) => {
        setSelectedExercise(exercise);
        // Force camera mode for time-based exercises (plank), but allow manual for elliptical
        if (exercise.isTimeBased && exercise.id !== 'elliptical') {
            setDetectionMode('camera');
        } else if (exercise.id === 'elliptical') {
            // Default to manual for elliptical (user can switch to camera+calibration)
            setDetectionMode('manual');
        }
        // Reset elliptical state when switching exercises
        resetEllipticalState();
        setEllipticalCalibrationPhase('none');
    }, []);

    // Passer à l'étape suivante
    const handleNext = useCallback(() => {
        if (step === 'select' && selectedExercise) {
            // For elliptical in camera mode, go to calibration
            if (selectedExercise.id === 'elliptical' && detectionMode === 'camera') {
                setStep('position'); // This will show calibration UI
                startEllipticalCalibration();
            } else {
                setStep('position');
            }
        } else if (step === 'position') {
            setStep('counting');
            startTracking();
        }
    }, [step, selectedExercise, detectionMode, startTracking, startEllipticalCalibration]);

    // Format du temps
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calcul des calories (approximatif)
    // Planche: ~4 cal/min, Elliptique: ~8 cal/min, autres exercices: ~0.5 cal/rep
    const getCalories = () => {
        if (!selectedExercise) return 0;
        if (selectedExercise.id === 'elliptical') {
            return Math.round((ellipticalSeconds / 60) * 8); // ~8 cal/min for elliptical
        } else if (selectedExercise.isTimeBased) {
            return Math.round((plankSeconds / 60) * 4); // ~4 cal/min for plank
        }
        return Math.round(repCount * 0.5); // ~0.5 cal/rep for other exercises
    };
    const calories = getCalories();
    const progress = Math.min(repCount / 50, 1); // Objectif de 50 reps

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Background gradient */}
            <LinearGradient
                colors={[
                    selectedExercise ? `${selectedExercise.color}15` : 'rgba(215, 150, 134, 0.1)',
                    Colors.bg,
                ]}
                style={styles.backgroundGradient}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                        <ArrowLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        {step === 'select' && t('repCounter.selectExercise')}
                        {step === 'position' && t('repCounter.positioning')}
                        {step === 'counting' && (selectedExercise ? t(`repCounter.exercises.${selectedExercise.id}`) : t('repCounter.title'))}
                        {step === 'done' && t('repCounter.done')}
                    </Text>
                    <View style={styles.headerRight} />
                </View>

                {/* Contenu principal */}
                <View style={styles.content}>
                    {/* Étape 1: Sélection */}
                    {step === 'select' && (
                        <Animated.View entering={FadeIn} style={styles.stepContainer}>
                            <Text style={styles.stepTitle}>{t('repCounter.selectExercise')}</Text>
                            <Text style={styles.stepSubtitle}>
                                {t('repCounter.selectHint')}
                            </Text>

                            <ExerciseSelector
                                onSelect={handleExerciseSelect}
                                selectedExercise={selectedExercise}
                            />

                            {selectedExercise && (
                                <Animated.View entering={FadeInDown.delay(400)}>
                                    {/* Mode de détection - caché pour la planche (caméra uniquement) */}
                                    {!selectedExercise.isTimeBased && (
                                        <View style={styles.modeSelector}>
                                            <Text style={styles.modeSelectorLabel}>{t('repCounter.detectionMode')}</Text>
                                            <View style={styles.modeButtons}>
                                                <TouchableOpacity
                                                    onPress={() => setDetectionMode('sensor')}
                                                    style={[
                                                        styles.modeButton,
                                                        detectionMode === 'sensor' && styles.modeButtonActive,
                                                    ]}
                                                >
                                                    <Activity size={18} color={detectionMode === 'sensor' ? '#fff' : Colors.muted} />
                                                    <Text style={[
                                                        styles.modeButtonText,
                                                        detectionMode === 'sensor' && styles.modeButtonTextActive,
                                                    ]}>
                                                        {t('repCounter.sensor')}
                                                    </Text>
                                                </TouchableOpacity>

                                                {selectedExercise.supportsCameraMode && (
                                                    <TouchableOpacity
                                                        onPress={() => setDetectionMode('camera')}
                                                        style={[
                                                            styles.modeButton,
                                                            detectionMode === 'camera' && styles.modeButtonActive,
                                                            detectionMode === 'camera' && { backgroundColor: selectedExercise.color },
                                                        ]}
                                                    >
                                                        <Camera size={18} color={detectionMode === 'camera' ? '#fff' : Colors.muted} />
                                                        <Text style={[
                                                            styles.modeButtonText,
                                                            detectionMode === 'camera' && styles.modeButtonTextActive,
                                                        ]}>
                                                            {t('repCounter.camera')}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            {detectionMode === 'camera' && (
                                                <Text style={styles.cameraModeNote}>
                                                    📷 {t('repCounter.cameraNote')}
                                                </Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Mode de détection pour le vélo elliptique : manuel ou automatique */}
                                    {selectedExercise.id === 'elliptical' && (
                                        <View style={styles.modeSelector}>
                                            <Text style={styles.modeSelectorLabel}>{t('repCounter.detectionMode')}</Text>
                                            <View style={styles.modeButtons}>
                                                <TouchableOpacity
                                                    onPress={() => setDetectionMode('manual')}
                                                    style={[
                                                        styles.modeButton,
                                                        detectionMode === 'manual' && styles.modeButtonActive,
                                                        detectionMode === 'manual' && { backgroundColor: selectedExercise.color },
                                                    ]}
                                                >
                                                    <Activity size={18} color={detectionMode === 'manual' ? '#fff' : Colors.muted} />
                                                    <Text style={[
                                                        styles.modeButtonText,
                                                        detectionMode === 'manual' && styles.modeButtonTextActive,
                                                    ]}>
                                                        {t('repCounter.manual')}
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => setDetectionMode('camera')}
                                                    style={[
                                                        styles.modeButton,
                                                        detectionMode === 'camera' && styles.modeButtonActive,
                                                        detectionMode === 'camera' && { backgroundColor: selectedExercise.color },
                                                    ]}
                                                >
                                                    <Camera size={18} color={detectionMode === 'camera' ? '#fff' : Colors.muted} />
                                                    <Text style={[
                                                        styles.modeButtonText,
                                                        detectionMode === 'camera' && styles.modeButtonTextActive,
                                                    ]}>
                                                        {t('repCounter.auto')}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.cameraModeNote}>
                                                {detectionMode === 'camera' 
                                                    ? `📷 ${t('repCounter.ellipticalAutoNote')}`
                                                    : `👆 ${t('repCounter.ellipticalManualNote')}`
                                                }
                                            </Text>
                                        </View>
                                    )}

                                    {/* Message pour la planche : caméra requise */}
                                    {selectedExercise.isTimeBased && selectedExercise.id !== 'elliptical' && (
                                        <View style={styles.modeSelector}>
                                            <View style={[styles.cameraRequiredBadge, { backgroundColor: `${selectedExercise.color}20` }]}>
                                                <Camera size={18} color={selectedExercise.color} />
                                                <Text style={[styles.cameraRequiredText, { color: selectedExercise.color }]}>
                                                    {t('repCounter.cameraOnly')}
                                                </Text>
                                            </View>
                                            <Text style={styles.cameraModeNote}>
                                                📷 {t('repCounter.cameraPosition')}
                                            </Text>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        onPress={handleNext}
                                        activeOpacity={0.9}
                                        style={styles.nextButton}
                                    >
                                        <LinearGradient
                                            colors={[Colors.cta, Colors.cta2]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.nextButtonGradient}
                                        >
                                            <Text style={styles.nextButtonText}>{t('common.next')}</Text>
                                            <ChevronRight size={20} color="#fff" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                        </Animated.View>
                    )}

                    {/* Étape 2: Positionnement (ou Calibration pour vélo elliptique en mode auto) */}
                    {step === 'position' && selectedExercise && (
                        <>
                            {/* Calibration screen for elliptical in camera mode */}
                            {selectedExercise.id === 'elliptical' && detectionMode === 'camera' ? (
                                <Animated.View entering={FadeIn} style={styles.calibrationContainer}>
                                    {/* Hidden camera for calibration - always active during calibration */}
                                    <View style={styles.hiddenCameraContainer}>
                                        <PoseCameraView
                                            facing="front"
                                            showDebugOverlay={false}
                                            exerciseType="elliptical"
                                            currentCount={0}
                                            onRepDetected={() => {}}
                                            isActive={ellipticalCalibrationPhase !== 'none' && ellipticalCalibrationPhase !== 'complete'}
                                            style={styles.hiddenCamera}
                                        />
                                    </View>

                                    {/* INTRO PHASE - Explain calibration */}
                                    {(ellipticalCalibrationPhase === 'intro' || ellipticalCalibrationPhase === 'none') && (
                                        <Animated.View entering={FadeInDown.springify()} style={styles.calibrationPhaseContainer}>
                                            <View style={[styles.calibrationIconWrapper, { backgroundColor: `${selectedExercise.color}20` }]}>
                                                <Text style={styles.calibrationIcon}>📱</Text>
                                            </View>
                                            
                                            <Text style={styles.calibrationTitle}>
                                                {t('repCounter.elliptical.calibrationStart')}
                                            </Text>
                                            
                                            <Text style={styles.calibrationSubtitle}>
                                                {t('repCounter.elliptical.calibrationIntro')}
                                            </Text>

                                            {ellipticalCalibrationFailed && (
                                                <View style={styles.calibrationErrorContainer}>
                                                    <Text style={styles.calibrationErrorText}>
                                                        {t('repCounter.elliptical.calibrationFailed')}
                                                    </Text>
                                                </View>
                                            )}

                                            <TouchableOpacity
                                                onPress={beginCalibrationSequence}
                                                activeOpacity={0.9}
                                                style={styles.calibrationButton}
                                            >
                                                <LinearGradient
                                                    colors={[Colors.cta, Colors.cta2]}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.calibrationButtonGradient}
                                                >
                                                    <Text style={styles.calibrationButtonText}>
                                                        {t('repCounter.elliptical.letsGo')}
                                                    </Text>
                                                    <ChevronRight size={20} color="#fff" />
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    )}

                                    {/* GET READY PHASE - 3 second countdown */}
                                    {ellipticalCalibrationPhase === 'get_ready' && (
                                        <Animated.View entering={FadeIn} style={styles.calibrationPhaseContainer}>
                                            <View style={[styles.calibrationIconWrapper, { backgroundColor: `${selectedExercise.color}20` }]}>
                                                <Text style={styles.calibrationIcon}>⏱️</Text>
                                            </View>
                                            
                                            <Text style={styles.calibrationTitle}>
                                                {t('repCounter.elliptical.calibrationStarting')}
                                            </Text>
                                            
                                            <Text style={styles.calibrationSubtitle}>
                                                {t('repCounter.elliptical.getReady')}
                                            </Text>

                                            <Animated.View 
                                                entering={ZoomIn.springify()} 
                                                key={calibrationCountdown}
                                                style={styles.countdownCircle}
                                            >
                                                <Text style={styles.countdownText}>{calibrationCountdown}</Text>
                                            </Animated.View>
                                        </Animated.View>
                                    )}

                                    {/* STILL PHASE - Don't move for 5 seconds */}
                                    {ellipticalCalibrationPhase === 'still' && (
                                        <Animated.View entering={FadeIn} style={styles.calibrationPhaseContainer}>
                                            <View style={[styles.calibrationIconWrapper, { backgroundColor: '#fbbf2420' }]}>
                                                <Text style={styles.calibrationIcon}>🗿</Text>
                                            </View>
                                            
                                            <Text style={styles.calibrationTitle}>
                                                {t('repCounter.elliptical.dontMove')}
                                            </Text>
                                            
                                            <Text style={styles.calibrationFunnyPhrase}>
                                                {calibrationFunnyPhrase}
                                            </Text>

                                            <View style={styles.stillCountdownContainer}>
                                                <Text style={styles.stillCountdownNumber}>{calibrationCountdown}</Text>
                                                <Text style={styles.stillCountdownLabel}>sec</Text>
                                            </View>
                                        </Animated.View>
                                    )}

                                    {/* STILL DONE - Brief success before pedaling */}
                                    {ellipticalCalibrationPhase === 'still_done' && (
                                        <Animated.View entering={ZoomIn.springify()} style={styles.calibrationPhaseContainer}>
                                            <View style={[styles.calibrationIconWrapper, { backgroundColor: '#22c55e20' }]}>
                                                <Text style={styles.calibrationIcon}>✅</Text>
                                            </View>
                                            
                                            <Text style={styles.calibrationFunnyPhrase}>
                                                {calibrationFunnyPhrase}
                                            </Text>
                                        </Animated.View>
                                    )}

                                    {/* PEDALING PHASE - Start pedaling for 7 seconds */}
                                    {ellipticalCalibrationPhase === 'pedaling' && (
                                        <Animated.View entering={FadeIn} style={styles.calibrationPhaseContainer}>
                                            <View style={[styles.calibrationIconWrapper, { backgroundColor: `${selectedExercise.color}20` }]}>
                                                <Text style={styles.calibrationIcon}>{waitingForMovement ? '👆' : '🚴'}</Text>
                                            </View>
                                            
                                            <Text style={styles.calibrationTitle}>
                                                {t('repCounter.elliptical.startPedaling')}
                                            </Text>
                                            
                                            <Text style={styles.calibrationSubtitle}>
                                                {waitingForMovement 
                                                    ? t('repCounter.elliptical.waitingForMovement')
                                                    : t('repCounter.elliptical.analyzingMovement')
                                                }
                                            </Text>

                                            <View style={styles.pedalingCountdownContainer}>
                                                {waitingForMovement ? (
                                                    <ActivityIndicator size="large" color={selectedExercise.color} />
                                                ) : (
                                                    <>
                                                        <View style={styles.pedalingProgressRing}>
                                                            <Text style={styles.pedalingCountdownNumber}>{calibrationCountdown}</Text>
                                                        </View>
                                                        <ActivityIndicator size="large" color={selectedExercise.color} style={styles.pedalingSpinner} />
                                                    </>
                                                )}
                                            </View>
                                        </Animated.View>
                                    )}

                                    {/* COMPLETE PHASE - Calibration done! */}
                                    {ellipticalCalibrationPhase === 'complete' && (
                                        <Animated.View entering={ZoomIn.springify()} style={styles.calibrationPhaseContainer}>
                                            <View style={[styles.calibrationIconWrapper, { backgroundColor: '#22c55e20' }]}>
                                                <Text style={styles.calibrationIcon}>🎉</Text>
                                            </View>
                                            
                                            <Text style={styles.calibrationTitle}>
                                                {t('repCounter.elliptical.calibrationComplete')}
                                            </Text>
                                            
                                            <Text style={styles.calibrationSubtitle}>
                                                {t('repCounter.elliptical.letsRide')}
                                            </Text>
                                        </Animated.View>
                                    )}
                                </Animated.View>
                            ) : (
                                <PositionScreen
                                    exercise={selectedExercise}
                                    onReady={handleNext}
                                    detectionMode={detectionMode}
                                />
                            )}
                        </>
                    )}

                    {/* Étape 3: Comptage */}
                    {step === 'counting' && selectedExercise && (
                        <Animated.View entering={FadeIn} style={styles.countingContainer}>
                            {/* Main counting UI - Same for both modes */}
                            <View style={styles.countingContent}>
                                {/* UI Overlay (Always visible) */}
                                <View style={styles.counterWrapper}>
                                    <Animated.View style={[styles.pulseRing, pulseStyle, { borderColor: selectedExercise.color }]} />
                                    <ProgressRing 
                                        progress={
                                            selectedExercise.id === 'elliptical' 
                                                ? Math.min(ellipticalSeconds / 300, 1) // 5 minutes goal for elliptical
                                                : selectedExercise.isTimeBased 
                                                    ? Math.min(plankSeconds / 60, 1) 
                                                    : progress
                                        } 
                                        size={240}
                                    >
                                        <Animated.View style={[styles.counterInner, countStyle]}>
                                            {selectedExercise.id === 'elliptical' ? (
                                                <>
                                                    <Text style={styles.repCount}>{formatTime(ellipticalSeconds)}</Text>
                                                    <Text style={styles.repLabel}>{t('repCounter.activeTime')}</Text>
                                                    {isEllipticalActive && (
                                                        <View style={[styles.plankStatusBadge, { backgroundColor: Colors.success }]}>
                                                            <Text style={styles.plankStatusText}>{t('repCounter.cycling')}</Text>
                                                        </View>
                                                    )}
                                                    {!isEllipticalActive && ellipticalSeconds > 0 && (
                                                        <View style={[styles.plankStatusBadge, { backgroundColor: Colors.warning }]}>
                                                            <Text style={styles.plankStatusText}>{t('repCounter.paused')}</Text>
                                                        </View>
                                                    )}
                                                </>
                                            ) : selectedExercise.isTimeBased ? (
                                                <>
                                                    <Text style={styles.repCount}>{plankSeconds}</Text>
                                                    <Text style={styles.repLabel}>{t('common.seconds')}</Text>
                                                    {isPlankActive && (
                                                        <View style={[styles.plankStatusBadge, { backgroundColor: Colors.success }]}>
                                                            <Text style={styles.plankStatusText}>{t('repCounter.active')}</Text>
                                                        </View>
                                                    )} 
                                                </>
                                            ) : (
                                                <>
                                                    <Text style={styles.repCount}>{repCount}</Text>
                                                    <Text style={styles.repLabel}>reps</Text>
                                                </>
                                            )}
                                        </Animated.View>
                                    </ProgressRing>
                                </View>
                            </View>

                            {/* Nouveau record ! */}
                            {showNewRecord && (
                                <Animated.View 
                                    entering={FadeInDown.springify()} 
                                    style={styles.newRecordBanner}
                                >
                                    <Text style={styles.newRecordEmoji}>🏆</Text>
                                    <Text style={styles.newRecordText}>{t('repCounter.newRecord')}</Text>
                                </Animated.View>
                            )}

                            {/* Stats en temps réel */}
                            <View style={styles.liveStats}>
                                <View style={styles.liveStat}>
                                    <Timer size={18} color={Colors.muted} />
                                    <Text style={styles.liveStatValue}>{formatTime(elapsedTime)}</Text>
                                    <Text style={styles.liveStatLabel}>{t('repCounter.duration')}</Text>
                                </View>
                                <View style={[styles.liveStat, styles.liveStatHighlight]}>
                                    <Flame size={18} color={selectedExercise.color} />
                                    <Text style={[styles.liveStatValue, { color: selectedExercise.color }]}>{calories}</Text>
                                    <Text style={styles.liveStatLabel}>{t('common.kcal')}</Text>
                                </View>
                                {selectedExercise.isTimeBased ? (
                                    <View style={styles.liveStat}>
                                        <Zap size={18} color={Colors.muted} />
                                        <Text style={styles.liveStatValue}>
                                            {personalBest > 0 ? `${personalBest}s` : '-'}
                                        </Text>
                                        <Text style={styles.liveStatLabel}>{t('repCounter.record')}</Text>
                                    </View>
                                ) : (
                                    <View style={styles.liveStat}>
                                        <Zap size={18} color={Colors.muted} />
                                        <Text style={styles.liveStatValue}>
                                            {elapsedTime > 0 ? (repCount / (elapsedTime / 60)).toFixed(1) : '0'}
                                        </Text>
                                        <Text style={styles.liveStatLabel}>{t('repCounter.repPerMin')}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Mode indicator */}
                            {selectedExercise.id === 'elliptical' && detectionMode === 'manual' ? (
                                <View style={styles.modeIndicator}>
                                    <Activity size={16} color={selectedExercise.color} />
                                    <Text style={[styles.modeIndicatorText, { color: selectedExercise.color }]}> 
                                        {t('repCounter.manualMode')}
                                    </Text>
                                </View>
                            ) : detectionMode === 'camera' ? (
                                <View style={styles.modeIndicator}>
                                    <Camera size={16} color={selectedExercise.color} />
                                    <Text style={[styles.modeIndicatorText, { color: selectedExercise.color }]}> 
                                        {selectedExercise.id === 'elliptical' 
                                            ? t('repCounter.autoDetection')
                                            : t('repCounter.aiActive')
                                        }
                                    </Text>
                                </View>
                            ) : selectedExercise.isTimeBased ? (
                                <Text style={styles.helpText}>
                                    {isPlankActive ? t('repCounter.holdOn') : t('repCounter.pressPlay')}
                                </Text>
                            ) : (
                                <Text style={styles.helpText}>
                                    {t('repCounter.keepGoing')}
                                </Text>
                            )}

                            {/* Plank Debug Info */}
                            {settings.debugPlank && selectedExercise.isTimeBased && plankDebugInfo && (
                                <View style={styles.plankDebugContainer}>
                                    <Text style={styles.plankDebugTitle}>
                                        🔍 Debug Planche ({(plankDebugInfo.overallConfidence * 100).toFixed(0)}%)
                                    </Text>
                                    <View style={styles.plankDebugChecks}>
                                        <Text style={styles.plankDebugCheck}>
                                            {plankDebugInfo.checks.shouldersAligned.message}
                                        </Text>
                                        <Text style={styles.plankDebugCheck}>
                                            {plankDebugInfo.checks.bodyLow.message}
                                        </Text>
                                        <Text style={styles.plankDebugCheck}>
                                            {plankDebugInfo.checks.armsInPosition.message}
                                        </Text>
                                        <Text style={styles.plankDebugCheck}>
                                            {plankDebugInfo.checks.hipsBelowShoulders.message}
                                        </Text>
                                    </View>
                                    <View style={styles.plankDebugLandmarks}>
                                        <Text style={[
                                            styles.plankDebugLandmark,
                                            { color: plankDebugInfo.landmarksVisible.shoulders ? '#4ade80' : '#f87171' }
                                        ]}>
                                            Épaules: {plankDebugInfo.landmarksVisible.shoulders ? '✓' : '✗'}
                                        </Text>
                                        <Text style={[
                                            styles.plankDebugLandmark,
                                            { color: plankDebugInfo.landmarksVisible.hips ? '#4ade80' : '#f87171' }
                                        ]}>
                                            Hanches: {plankDebugInfo.landmarksVisible.hips ? '✓' : '✗'}
                                        </Text>
                                        <Text style={[
                                            styles.plankDebugLandmark,
                                            { color: plankDebugInfo.landmarksVisible.wrists ? '#4ade80' : '#f87171' }
                                        ]}>
                                            Poignets: {plankDebugInfo.landmarksVisible.wrists ? '✓' : '✗'}
                                        </Text>
                                        <Text style={[
                                            styles.plankDebugLandmark,
                                            { color: plankDebugInfo.landmarksVisible.ankles ? '#4ade80' : '#f87171' }
                                        ]}>
                                            Chevilles: {plankDebugInfo.landmarksVisible.ankles ? '✓' : '✗'}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Camera Preview - Debug mode shows full preview, otherwise hidden with active detection */}
                            {detectionMode === 'camera' && settings.debugCamera && (
                                <View style={styles.cameraPreviewContainer}>
                                    <PoseCameraView
                                        facing="front"
                                        showDebugOverlay={settings.debugCamera}
                                        exerciseType={selectedExercise.id}
                                        currentCount={selectedExercise.isTimeBased ? plankSeconds : repCount}
                                        onRepDetected={handleCameraRepDetected}
                                        onPlankStateChange={handlePlankStateChange}
                                        onEllipticalStateChange={handleEllipticalStateChange}
                                        isActive={isTracking}
                                        style={styles.cameraPreview}
                                        debugPlank={settings.debugPlank}
                                    />
                                </View>
                            )}

                            {/* Hidden camera for detection when debug is off */}
                            {detectionMode === 'camera' && !settings.debugCamera && (
                                <View style={styles.hiddenCameraContainer}>
                                    <PoseCameraView
                                        facing="front"
                                        showDebugOverlay={false}
                                        exerciseType={selectedExercise.id}
                                        currentCount={selectedExercise.isTimeBased ? plankSeconds : repCount}
                                        onRepDetected={handleCameraRepDetected}
                                        onPlankStateChange={handlePlankStateChange}
                                        onEllipticalStateChange={handleEllipticalStateChange}
                                        isActive={isTracking}
                                        style={styles.hiddenCamera}
                                        debugPlank={settings.debugPlank}
                                    />
                                </View>
                            )}

                            {/* Boutons de contrôle */}
                            <View style={styles.controlButtons}>
                                <TouchableOpacity
                                    onPress={resetWorkout}
                                    style={styles.controlButton}
                                >
                                    <RotateCcw size={24} color={Colors.muted} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={isTracking ? stopTracking : startTracking}
                                    activeOpacity={0.9}
                                    style={styles.mainControlButton}
                                >
                                    <LinearGradient
                                        colors={isTracking ? ['#f87171', '#ef4444'] : [selectedExercise.color, `${selectedExercise.color}dd`]}
                                        style={styles.mainControlButtonGradient}
                                    >
                                        {isTracking ? (
                                            <Pause size={32} color="#fff" fill="#fff" />
                                        ) : (
                                            <Play size={32} color="#fff" fill="#fff" />
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={finishWorkout}
                                    style={styles.controlButton}
                                >
                                    <Check size={24} color={Colors.success} />
                                </TouchableOpacity>
                            </View>

                            {/* Motivational Message */}
                            {motivationalMessage && (
                                <Animated.View style={[styles.motivationalContainer, messageStyle]}>
                                    <BlurView intensity={20} tint="dark" style={styles.motivationalBlur} />
                                    <View style={styles.motivationalContent}>

                                        <View style={styles.motivationalEmojiCircle}>
                                            <Text style={styles.motivationalEmoji}>{motivationalMessage.emoji}</Text>
                                        </View>
                                        <Text style={styles.motivationalText}>{motivationalMessage.text}</Text>
                                        {aiFeedback && (
                                            <Text style={[styles.aiFeedbackText, { color: selectedExercise.color }]}>
                                                {aiFeedback}
                                            </Text>
                                        )}
                                    </View>
                                </Animated.View>
                            )}
                        </Animated.View>
                    )}

                    {/* Étape 4: Terminé */}
                    {step === 'done' && selectedExercise && (
                        <Animated.View entering={FadeIn} style={styles.doneContainer}>
                            <Animated.View entering={FadeInDown.delay(100).springify()}>
                                <View style={[styles.doneIconWrapper, { backgroundColor: `${selectedExercise.color}22` }]}>
                                    <Text style={styles.doneIcon}>{selectedExercise.icon}</Text>
                                </View>
                            </Animated.View>

                            <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.doneTitle}>
                                {showNewRecord ? `🏆 ${t('repCounter.newRecord')}` : t('repCounter.congrats')}
                            </Animated.Text>

                            <Animated.View entering={FadeInDown.delay(300).springify()}>
                                <GlassCard style={styles.summaryCard}>
                                    <View style={styles.summaryRow}>
                                        <View style={styles.summaryItem}>
                                            <Dumbbell size={20} color={selectedExercise.color} />
                                            <Text style={styles.summaryValue}>
                                                {selectedExercise.id === 'elliptical' 
                                                    ? formatTime(ellipticalSeconds)
                                                    : selectedExercise.isTimeBased 
                                                        ? `${plankSeconds}s` 
                                                        : repCount}
                                            </Text>
                                            <Text style={styles.summaryLabel}>{t(`repCounter.exercises.${selectedExercise.id}`)}</Text>
                                        </View>
                                        <View style={styles.summaryDivider} />
                                        <View style={styles.summaryItem}>
                                            <Timer size={20} color={Colors.muted} />
                                            <Text style={styles.summaryValue}>
                                                {selectedExercise.id === 'elliptical' 
                                                    ? formatTime(ellipticalSeconds) 
                                                    : formatTime(elapsedTime)}
                                            </Text>
                                            <Text style={styles.summaryLabel}>{t('repCounter.duration')}</Text>
                                        </View>
                                        <View style={styles.summaryDivider} />
                                        <View style={styles.summaryItem}>
                                            <Flame size={20} color="#f97316" />
                                            <Text style={styles.summaryValue}>{calories}</Text>
                                            <Text style={styles.summaryLabel}>{t('common.kcal')}</Text>
                                        </View>
                                    </View>
                                </GlassCard>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.doneButtons}>
                                <TouchableOpacity
                                    onPress={resetWorkout}
                                    style={styles.doneButtonSecondary}
                                >
                                    <RotateCcw size={20} color={Colors.text} />
                                    <Text style={styles.doneButtonSecondaryText}>{t('repCounter.restart')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={async () => {
                                        await saveWorkout();
                                        router.back();
                                    }}
                                    activeOpacity={0.9}
                                    style={styles.doneButtonPrimary}
                                >
                                    <LinearGradient
                                        colors={[Colors.cta, Colors.cta2]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.doneButtonPrimaryGradient}
                                    >
                                        <Check size={20} color="#fff" />
                                        <Text style={styles.doneButtonPrimaryText}>{t('common.finish')}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </Animated.View>
                    )}
                </View>
            </SafeAreaView>

            {/* Modal de confirmation de sortie */}
            <Modal
                visible={showExitModal}
                transparent
                animationType="fade"
                onRequestClose={handleExitCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('repCounter.exitConfirm.title')}</Text>
                        <Text style={styles.modalSubtitle}>
                            {t('repCounter.exitConfirm.message')}
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                onPress={handleExitCancel}
                                style={styles.modalButtonSecondary}
                            >
                                <Text style={styles.modalButtonSecondaryText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleExitConfirm}
                                style={styles.modalButtonPrimary}
                            >
                                <Text style={styles.modalButtonPrimaryText}>{t('common.exit')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.5,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    headerRight: {
        width: 44,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
    },

    // Step Container
    stepContainer: {
        flex: 1,
        paddingTop: Spacing.xl,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    stepSubtitle: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },

    // Exercise Grid
    exerciseGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    exerciseCard: {
        width: (SCREEN_WIDTH - Spacing.lg * 2 - 12) / 2,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    exerciseCardGradient: {
        padding: Spacing.lg,
        alignItems: 'center',
    },
    exerciseIcon: {
        fontSize: 40,
        marginBottom: Spacing.sm,
    },
    exerciseName: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    selectedBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Next Button
    nextButton: {
        marginTop: Spacing.xxl,
        alignSelf: 'center',
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        gap: 8,
    },
    nextButtonText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },

    // Position Screen
    positionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
    },
    phoneIconWrapper: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    phoneIcon: {
        width: 100,
        height: 100,
        borderRadius: 24,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.overlay,
    },
    arrowIcon: {
        marginTop: Spacing.md,
    },
    positionTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.md,
    },
    positionSubtitle: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        marginBottom: Spacing.xxl,
    },
    volumeRecommendation: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(250, 204, 21, 0.15)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.xl,
        gap: 8,
    },
    volumeRecommendationText: {
        fontSize: FontSize.sm,
        color: '#facc15',
        fontWeight: FontWeight.medium,
    },
    readyButton: {
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    readyButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 40,
        gap: 12,
    },
    readyButtonText: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },

    // Counting Screen
    countingContainer: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: Spacing.xl,
    },
    countingContent: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraBackground: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        backgroundColor: '#000',
    },
    counterWrapper: {
        position: 'relative',
        marginBottom: Spacing.xxl,
    },
    cameraContainer: {
        position: 'relative',
        marginBottom: Spacing.xxl,
    },
    pulseRing: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 130,
        borderWidth: 3,
    },
    counterInner: {
        alignItems: 'center',
    },
    repCount: {
        fontSize: 72,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        lineHeight: 80,
    },
    repLabel: {
        fontSize: FontSize.lg,
        color: Colors.muted,
        marginTop: -8,
    },

    // Plank specific
    plankStatusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        marginTop: 8,
    },
    plankStatusText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.bold,
        color: '#fff',
        letterSpacing: 1,
    },
    newRecordBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(250, 204, 21, 0.2)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.lg,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(250, 204, 21, 0.4)',
    },
    newRecordEmoji: {
        fontSize: 20,
    },
    newRecordText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#facc15',
    },

    // Live Stats
    liveStats: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: Spacing.xl,
    },
    liveStat: {
        alignItems: 'center',
        backgroundColor: Colors.overlay,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: BorderRadius.lg,
        minWidth: 90,
    },
    liveStatHighlight: {
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
    },
    liveStatValue: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginVertical: 4,
    },
    liveStatLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
    },

    helpText: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        marginBottom: Spacing.xxl,
    },

    // Control Buttons
    controlButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    controlButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    mainControlButton: {
        borderRadius: 40,
        overflow: 'hidden',
        shadowColor: Colors.cta,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
    },
    mainControlButtonGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Done Screen
    doneContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: Spacing.xxxl,
    },
    doneIconWrapper: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    doneIcon: {
        fontSize: 50,
    },
    doneTitle: {
        fontSize: 32,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        marginBottom: Spacing.xl,
    },
    summaryCard: {
        width: SCREEN_WIDTH - Spacing.lg * 2,
        marginBottom: Spacing.xxl,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryDivider: {
        width: 1,
        height: 40,
        backgroundColor: Colors.stroke,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginVertical: 4,
    },
    summaryLabel: {
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    doneButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    doneButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 24,
        backgroundColor: Colors.overlay,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    doneButtonSecondaryText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    doneButtonPrimary: {
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    doneButtonPrimaryGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 28,
    },
    doneButtonPrimaryText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },

    // Mode Selector
    modeSelector: {
        marginTop: Spacing.xl,
        alignItems: 'center',
    },
    modeSelectorLabel: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.muted,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    modeButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: Colors.overlay,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    modeButtonActive: {
        backgroundColor: Colors.cta,
        borderColor: 'transparent',
    },
    modeButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.muted,
    },
    modeButtonTextActive: {
        color: '#fff',
    },
    cameraModeNote: {
        marginTop: Spacing.md,
        fontSize: FontSize.sm,
        color: Colors.muted2,
        textAlign: 'center',
    },
    cameraRequiredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: BorderRadius.lg,
        alignSelf: 'center',
    },
    cameraRequiredText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
    },

    // Camera preview styles
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: Spacing.lg,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: BorderRadius.full,
        alignSelf: 'center',
    },
    modeIndicatorText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
    },
    cameraPreviewContainer: {
        width: SCREEN_WIDTH - Spacing.lg * 2,
        height: 180,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginBottom: Spacing.xl,
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    cameraPreview: {
        width: '100%',
        height: '100%',
    },
    hiddenCameraContainer: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        overflow: 'hidden',
    },
    hiddenCamera: {
        width: 320,
        height: 240,
    },
    cameraPreviewOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    cameraPreviewText: {
        fontSize: FontSize.sm,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: FontWeight.semibold,
    },

    // Motivational messages
    motivationalContainer: {
        alignItems: 'center',
        marginTop: Spacing.lg,
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        shadowColor: Colors.cta,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        minHeight: 110,
    },
    motivationalBlur: {
        ...StyleSheet.absoluteFillObject,
    },
    motivationalContent: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Fallback pour Android
    },
    motivationalEmojiCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    motivationalEmoji: {
        fontSize: 32,
    },
    motivationalText: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        textAlign: 'center',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    aiFeedbackText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        textAlign: 'center',
        marginTop: Spacing.sm,
        opacity: 0.9,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // Camera hint
    cameraHint: {
        position: 'absolute',
        bottom: Spacing.lg,
        left: Spacing.lg,
        right: Spacing.lg,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
    },
    cameraHintText: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        textAlign: 'center',
    },

    // Exit Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
    },
    modalContent: {
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: Colors.stroke,
    },
    modalTitle: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    modalSubtitle: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    modalButtonSecondary: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.overlay,
        alignItems: 'center',
    },
    modalButtonSecondaryText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    modalButtonPrimary: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#ef4444',
        alignItems: 'center',
    },
    modalButtonPrimaryText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: '#fff',
    },
    
    // Plank Debug Styles
    plankDebugContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.md,
        marginHorizontal: Spacing.md,
    },
    plankDebugTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    plankDebugChecks: {
        gap: 4,
    },
    plankDebugCheck: {
        fontSize: FontSize.sm,
        color: Colors.text,
        fontFamily: 'monospace',
    },
    plankDebugLandmarks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.stroke,
    },
    plankDebugLandmark: {
        fontSize: FontSize.xs,
        fontWeight: FontWeight.semibold,
    },

    // Elliptical Calibration Styles
    calibrationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    calibrationPhaseContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    calibrationIconWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    calibrationIcon: {
        fontSize: 56,
    },
    calibrationTitle: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    calibrationSubtitle: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing.xxl,
        paddingHorizontal: Spacing.lg,
    },
    calibrationFunnyPhrase: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 24,
        marginTop: Spacing.md,
        marginBottom: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        fontStyle: 'italic',
    },
    calibrationButton: {
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        marginTop: Spacing.lg,
    },
    calibrationButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    calibrationButtonText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
    calibrationLoading: {
        marginTop: Spacing.xl,
    },
    calibrationRetryContainer: {
        marginTop: Spacing.lg,
        alignItems: 'center',
    },
    calibrationErrorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    calibrationErrorText: {
        color: Colors.error,
        fontSize: FontSize.md,
        textAlign: 'center',
    },
    calibrationRetryButton: {
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    // Countdown styles
    countdownCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(124, 58, 237, 0.2)',
        borderWidth: 4,
        borderColor: Colors.cta,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    countdownText: {
        fontSize: 56,
        fontWeight: FontWeight.extrabold,
        color: Colors.cta,
    },
    // Still phase countdown
    stillCountdownContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: Spacing.xl,
    },
    stillCountdownNumber: {
        fontSize: 72,
        fontWeight: FontWeight.extrabold,
        color: '#fbbf24',
    },
    stillCountdownLabel: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: '#fbbf24',
        marginLeft: Spacing.xs,
    },
    // Pedaling phase styles
    pedalingCountdownContainer: {
        alignItems: 'center',
        marginTop: Spacing.xl,
        position: 'relative',
    },
    pedalingProgressRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        borderWidth: 4,
        borderColor: Colors.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pedalingCountdownNumber: {
        fontSize: 40,
        fontWeight: FontWeight.extrabold,
        color: Colors.success,
    },
    pedalingSpinner: {
        position: 'absolute',
        bottom: -40,
    },
});
