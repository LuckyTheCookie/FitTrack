// ============================================================================
// REP COUNTER SCREEN - Compteur d'exercices avec détection de mouvement
// Utilise l'accéléromètre pour détecter les répétitions
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
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
} from 'lucide-react-native';
import { GlassCard } from '../src/components/ui';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Types d'exercices supportés
type ExerciseType = 'pushups' | 'situps' | 'squats' | 'jumping_jacks';

interface ExerciseConfig {
  id: ExerciseType;
  name: string;
  icon: string;
  color: string;
  instruction: string;
  threshold: number; // Sensibilité de détection
  axis: 'x' | 'y' | 'z'; // Axe principal de mouvement
  cooldown: number; // Temps minimum entre 2 reps (ms)
}

const EXERCISES: ExerciseConfig[] = [
  {
    id: 'pushups',
    name: 'Pompes',
    icon: '💪',
    color: '#4ade80',
    instruction: 'Placez le téléphone face vers le bas, sous votre poitrine',
    threshold: 0.4,
    axis: 'z',
    cooldown: 600,
  },
  {
    id: 'situps',
    name: 'Abdos',
    icon: '🔥',
    color: '#f97316',
    instruction: 'Placez le téléphone sur votre poitrine, écran vers le haut',
    threshold: 0.5,
    axis: 'z',
    cooldown: 800,
  },
  {
    id: 'squats',
    name: 'Squats',
    icon: '🦵',
    color: '#8b5cf6',
    instruction: 'Tenez le téléphone contre votre poitrine',
    threshold: 0.35,
    axis: 'y',
    cooldown: 700,
  },
  {
    id: 'jumping_jacks',
    name: 'Jumping Jacks',
    icon: '⭐',
    color: '#eab308',
    instruction: 'Tenez le téléphone dans votre main',
    threshold: 0.6,
    axis: 'y',
    cooldown: 400,
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
              <Text style={styles.exerciseName}>{exercise.name}</Text>
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
  onReady 
}: { 
  exercise: ExerciseConfig;
  onReady: () => void;
}) => {
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

  return (
    <Animated.View entering={FadeIn} style={styles.positionContainer}>
      <Animated.View style={[styles.phoneIconWrapper, bounceStyle]}>
        <View style={[styles.phoneIcon, { borderColor: exercise.color }]}>
          <Smartphone size={48} color={exercise.color} />
        </View>
        <ArrowDown size={32} color={exercise.color} style={styles.arrowIcon} />
      </Animated.View>

      <Text style={styles.positionTitle}>{exercise.instruction}</Text>
      <Text style={styles.positionSubtitle}>
        Quand vous êtes prêt, appuyez sur Commencer
      </Text>

      <TouchableOpacity onPress={onReady} activeOpacity={0.9} style={styles.readyButton}>
        <LinearGradient
          colors={[exercise.color, `${exercise.color}dd`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.readyButtonGradient}
        >
          <Play size={24} color="#fff" fill="#fff" />
          <Text style={styles.readyButtonText}>Commencer</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Écran principal
export default function RepCounterScreen() {
  const [step, setStep] = useState<TutorialStep>('select');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Pour la détection de mouvement
  const lastRepTime = useRef(0);
  const isInRep = useRef(false);
  const baselineZ = useRef(0);
  const calibrationSamples = useRef<number[]>([]);
  const subscriptionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const countScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

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
    setRepCount(prev => prev + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateRep();
  }, [animateRep]);

  // Démarrer le tracking
  const startTracking = useCallback(async () => {
    if (!selectedExercise) return;

    setIsTracking(true);
    setRepCount(0);
    setElapsedTime(0);
    calibrationSamples.current = [];
    isInRep.current = false;
    lastRepTime.current = 0;

    // Configurer l'accéléromètre
    Accelerometer.setUpdateInterval(50); // 20 Hz

    // Calibration: collecter quelques samples pour établir la baseline
    let calibrationCount = 0;
    
    subscriptionRef.current = Accelerometer.addListener((data: AccelerometerMeasurement) => {
      const now = Date.now();
      const axis = selectedExercise.axis;
      const value = data[axis];

      // Calibration (premières 500ms)
      if (calibrationCount < 10) {
        calibrationSamples.current.push(value);
        calibrationCount++;
        if (calibrationCount === 10) {
          baselineZ.current = calibrationSamples.current.reduce((a, b) => a + b, 0) / 10;
        }
        return;
      }

      // Détection de mouvement
      const delta = Math.abs(value - baselineZ.current);
      const threshold = selectedExercise.threshold;
      const cooldown = selectedExercise.cooldown;

      // Détection d'une rep
      if (delta > threshold && !isInRep.current && (now - lastRepTime.current) > cooldown) {
        isInRep.current = true;
        lastRepTime.current = now;
        runOnJS(incrementRep)();
      } else if (delta < threshold * 0.5) {
        isInRep.current = false;
      }
    });
  }, [selectedExercise, incrementRep]);

  // Arrêter le tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  }, []);

  // Terminer et sauvegarder
  const finishWorkout = useCallback(() => {
    stopTracking();
    setStep('done');
  }, [stopTracking]);

  // Reset
  const resetWorkout = useCallback(() => {
    stopTracking();
    setRepCount(0);
    setElapsedTime(0);
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
    };
  }, []);

  // Sélection d'exercice
  const handleExerciseSelect = useCallback((exercise: ExerciseConfig) => {
    setSelectedExercise(exercise);
  }, []);

  // Passer à l'étape suivante
  const handleNext = useCallback(() => {
    if (step === 'select' && selectedExercise) {
      setStep('position');
    } else if (step === 'position') {
      setStep('counting');
      startTracking();
    }
  }, [step, selectedExercise, startTracking]);

  // Format du temps
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calcul des calories (approximatif)
  const calories = Math.round(repCount * 0.5);
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'select' && 'Choisir un exercice'}
            {step === 'position' && 'Positionnement'}
            {step === 'counting' && (selectedExercise?.name || 'Compteur')}
            {step === 'done' && 'Terminé !'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Contenu principal */}
        <View style={styles.content}>
          {/* Étape 1: Sélection */}
          {step === 'select' && (
            <Animated.View entering={FadeIn} style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Quel exercice ?</Text>
              <Text style={styles.stepSubtitle}>
                Sélectionne l'exercice que tu veux tracker
              </Text>
              
              <ExerciseSelector
                onSelect={handleExerciseSelect}
                selectedExercise={selectedExercise}
              />

              {selectedExercise && (
                <Animated.View entering={FadeInDown.delay(400)}>
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
                      <Text style={styles.nextButtonText}>Suivant</Text>
                      <ChevronRight size={20} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* Étape 2: Positionnement */}
          {step === 'position' && selectedExercise && (
            <PositionScreen exercise={selectedExercise} onReady={handleNext} />
          )}

          {/* Étape 3: Comptage */}
          {step === 'counting' && selectedExercise && (
            <Animated.View entering={FadeIn} style={styles.countingContainer}>
              {/* Anneau de progression avec compteur */}
              <View style={styles.counterWrapper}>
                <Animated.View style={[styles.pulseRing, pulseStyle, { borderColor: selectedExercise.color }]} />
                <ProgressRing progress={progress} size={240}>
                  <Animated.View style={[styles.counterInner, countStyle]}>
                    <Text style={styles.repCount}>{repCount}</Text>
                    <Text style={styles.repLabel}>reps</Text>
                  </Animated.View>
                </ProgressRing>
              </View>

              {/* Stats en temps réel */}
              <View style={styles.liveStats}>
                <View style={styles.liveStat}>
                  <Timer size={18} color={Colors.muted} />
                  <Text style={styles.liveStatValue}>{formatTime(elapsedTime)}</Text>
                  <Text style={styles.liveStatLabel}>Durée</Text>
                </View>
                <View style={[styles.liveStat, styles.liveStatHighlight]}>
                  <Flame size={18} color={selectedExercise.color} />
                  <Text style={[styles.liveStatValue, { color: selectedExercise.color }]}>{calories}</Text>
                  <Text style={styles.liveStatLabel}>kcal</Text>
                </View>
                <View style={styles.liveStat}>
                  <Zap size={18} color={Colors.muted} />
                  <Text style={styles.liveStatValue}>
                    {elapsedTime > 0 ? (repCount / (elapsedTime / 60)).toFixed(1) : '0'}
                  </Text>
                  <Text style={styles.liveStatLabel}>rep/min</Text>
                </View>
              </View>

              {/* Message d'aide */}
              <Text style={styles.helpText}>
                Continue tes {selectedExercise.name.toLowerCase()} !
              </Text>

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
                Bravo ! 🎉
              </Animated.Text>

              <Animated.View entering={FadeInDown.delay(300).springify()}>
                <GlassCard style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <Dumbbell size={20} color={selectedExercise.color} />
                      <Text style={styles.summaryValue}>{repCount}</Text>
                      <Text style={styles.summaryLabel}>{selectedExercise.name}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Timer size={20} color={Colors.muted} />
                      <Text style={styles.summaryValue}>{formatTime(elapsedTime)}</Text>
                      <Text style={styles.summaryLabel}>Durée</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                      <Flame size={20} color="#f97316" />
                      <Text style={styles.summaryValue}>{calories}</Text>
                      <Text style={styles.summaryLabel}>kcal</Text>
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
                  <Text style={styles.doneButtonSecondaryText}>Recommencer</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => router.back()}
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
                    <Text style={styles.doneButtonPrimaryText}>Terminer</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
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
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  counterWrapper: {
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
});
