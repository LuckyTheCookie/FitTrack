// ============================================================================
// ONBOARDING SCREEN - Redesign Premium 2026
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutLeft,
  FadeInRight,
  ZoomIn,
  Layout,
} from 'react-native-reanimated';
import { useAppStore } from '../src/stores';
// Assurez-vous que vos constantes sont bien importées
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../src/constants';
import type { FitnessGoal, FitnessLevel } from '../src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- DATA CONSTANTS ---

const GOAL_OPTIONS: { key: FitnessGoal; emoji: string; title: string; desc: string }[] = [
  { key: 'loseWeight', emoji: '🔥', title: 'Perdre du poids', desc: 'Brûler du gras & s\'affiner' },
  { key: 'buildMuscle', emoji: '💪', title: 'Prendre du muscle', desc: 'Gagner en force & volume' },
  { key: 'improveCardio', emoji: '🏃', title: 'Améliorer le cardio', desc: 'Endurance & souffle' },
  { key: 'stayHealthy', emoji: '🧘', title: 'Rester en forme', desc: 'Santé & bien-être quotidien' },
];

const LEVEL_OPTIONS: { key: FitnessLevel; emoji: string; title: string; desc: string }[] = [
  { key: 'beginner', emoji: '🌱', title: 'Débutant', desc: 'Je commence tout juste' },
  { key: 'intermediate', emoji: '⚡', title: 'Intermédiaire', desc: 'Je m\'entraîne parfois' },
  { key: 'advanced', emoji: '🦁', title: 'Avancé', desc: 'Je suis une machine' },
];

// --- COMPONENTS ---

// Indicateur de progression élégant
function ProgressBar({ current, total }: { current: number; total: number }) {
  const progress = (current + 1) / total;
  
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View 
          style={[styles.progressBar, { width: `${progress * 100}%` }]} 
          layout={Layout.springify()}
        />
      </View>
      <Text style={styles.stepIndicator}>{current + 1}/{total}</Text>
    </View>
  );
}

// Bouton principal avec dégradé
const PrimaryButton = ({ onPress, title, disabled = false, icon }: any) => (
  <TouchableOpacity 
    onPress={onPress} 
    activeOpacity={0.9} 
    disabled={disabled}
    style={[styles.buttonWrapper, disabled && styles.buttonDisabled]}
  >
    <LinearGradient
      colors={disabled ? [Colors.card, Colors.card] : (Gradients.cta || [Colors.teal, Colors.cta])}  // Where is this button used? TODO FIX
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.primaryButton}
    >
      <Text style={[styles.primaryButtonText, disabled && styles.buttonTextDisabled]}>
        {title}
      </Text>
      {icon && <Text style={styles.buttonIcon}>{icon}</Text>}
    </LinearGradient>
  </TouchableOpacity>
);

// --- MAIN SCREEN ---

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { updateSettings, updateWeeklyGoal } = useAppStore();

  // Steps: 0:Welcome, 1:Goal, 2:Level, 3:Frequency, 4:Ready
  const [currentStep, setCurrentStep] = useState(0);
  
  // Selection State
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<FitnessLevel | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(3);

  const handleComplete = useCallback(() => {
    updateSettings({
      onboardingCompleted: true,
      fitnessGoal: selectedGoal || undefined,
      fitnessLevel: selectedLevel || undefined,
    });
    updateWeeklyGoal(weeklyGoal);
    router.replace('/');
  }, [selectedGoal, selectedLevel, weeklyGoal, updateSettings, updateWeeklyGoal, router]);

  const handleSkip = useCallback(() => {
    updateSettings({ onboardingCompleted: true });
    router.replace('/');
  }, [updateSettings, router]);

  const nextStep = () => setCurrentStep(p => p + 1);
  const prevStep = () => setCurrentStep(p => Math.max(0, p - 1));

  // RENDER STEPS
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return <WelcomeStep onNext={nextStep} />;
      case 1: return <GoalStep selected={selectedGoal} onSelect={setSelectedGoal} />;
      case 2: return <LevelStep selected={selectedLevel} onSelect={setSelectedLevel} />;
      case 3: return <FrequencyStep value={weeklyGoal} onChange={setWeeklyGoal} />;
      case 4: return <ReadyStep onComplete={handleComplete} />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background global pour la continuité */}
      <LinearGradient
        colors={[Colors.bg, '#1a1f25', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header (sauf sur Welcome & Ready) */}
      {currentStep > 0 && currentStep < 4 && (
        <SafeAreaView edges={['top']} style={styles.header}>
          <TouchableOpacity onPress={prevStep} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <ProgressBar current={currentStep - 1} total={3} />
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>{t('common.skip') || 'Passer'}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Contenu principal */}
      <View style={styles.contentContainer}>
        {renderStepContent()}
      </View>

      {/* Footer avec bouton (sauf Welcome & Ready qui ont leurs propres boutons) */}
      {currentStep > 0 && currentStep < 4 && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <PrimaryButton 
            title={t('common.continue') || "Continuer"} 
            onPress={nextStep}
            disabled={
              (currentStep === 1 && !selectedGoal) ||
              (currentStep === 2 && !selectedLevel)
            }
          />
        </SafeAreaView>
      )}
    </View>
  );
}

// --- STEP 1: WELCOME ---
const WelcomeStep = ({ onNext }: { onNext: () => void }) => (
  <View style={styles.fullScreen}>
    <Image 
      source={require('../assets/onboarding.jpg')}
      style={StyleSheet.absoluteFillObject}
      resizeMode="cover"
    />
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.6)', Colors.bg]}
      locations={[0, 0.4, 1]}
      style={StyleSheet.absoluteFillObject}
    />
    
    <SafeAreaView edges={['bottom']} style={styles.welcomeContent}>
      <Animated.View entering={FadeInDown.delay(300).springify()}>
        <View style={styles.welcomeTag}>
          <Text style={styles.welcomeTagText}>FITNESS APP 2026</Text>
        </View>
        <Text style={styles.welcomeTitle}>Transforme{"\n"}ton corps &{"\n"}ton esprit.</Text>
        <Text style={styles.welcomeSubtitle}>
          L'outil ultime pour suivre tes progrès, rester motivé et atteindre tes objectifs.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.welcomeAction}>
        <PrimaryButton title="Commencer l'aventure" onPress={onNext} icon="➜" />
      </Animated.View>
    </SafeAreaView>
  </View>
);

// --- STEP 2: GOAL ---
const GoalStep = ({ selected, onSelect }: { selected: FitnessGoal | null, onSelect: (g: FitnessGoal) => void }) => (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
    <Animated.View entering={FadeInDown.delay(100)}>
      <Text style={styles.stepTitle}>Quel est ton{'\n'}objectif principal ?</Text>
      <Text style={styles.stepSubtitle}>Nous adapterons ton expérience en fonction.</Text>
    </Animated.View>

    <View style={styles.gridContainer}>
      {GOAL_OPTIONS.map((option, idx) => {
        const isSelected = selected === option.key;
        return (
          <Animated.View key={option.key} entering={FadeInDown.delay(200 + idx * 50).springify()} style={styles.gridItemWrapper}>
            <Pressable
              onPress={() => onSelect(option.key)}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <Text style={styles.cardEmoji}>{option.emoji}</Text>
              <Text style={[styles.cardTitle, isSelected && styles.textSelected]}>{option.title}</Text>
              {isSelected && <View style={styles.checkCircle}><Text style={styles.checkIcon}>✓</Text></View>}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  </ScrollView>
);

// --- STEP 3: LEVEL ---
const LevelStep = ({ selected, onSelect }: { selected: FitnessLevel | null, onSelect: (l: FitnessLevel) => void }) => (
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
    <Animated.View entering={FadeInDown.delay(100)}>
      <Text style={styles.stepTitle}>Ton niveau{'\n'}actuel ?</Text>
      <Text style={styles.stepSubtitle}>Sois honnête, on ne juge pas ici !</Text>
    </Animated.View>

    <View style={styles.listContainer}>
      {LEVEL_OPTIONS.map((option, idx) => {
        const isSelected = selected === option.key;
        return (
          <Animated.View key={option.key} entering={FadeInRight.delay(200 + idx * 100).springify()}>
            <Pressable
              onPress={() => onSelect(option.key)}
              style={[styles.listCard, isSelected && styles.cardSelected]}
            >
              <View style={styles.listIconBg}>
                <Text style={styles.listEmoji}>{option.emoji}</Text>
              </View>
              <View style={styles.listContent}>
                <Text style={[styles.listTitle, isSelected && styles.textSelected]}>{option.title}</Text>
                <Text style={styles.listDesc}>{option.desc}</Text>
              </View>
              <View style={[styles.radioCircle, isSelected && styles.radioSelected]} />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  </ScrollView>
);

// --- STEP 4: FREQUENCY ---
const FrequencyStep = ({ value, onChange }: { value: number, onChange: (v: number) => void }) => (
  <View style={styles.centerContent}>
    <Animated.View entering={FadeInDown.delay(100)}>
      <Text style={styles.stepTitleCenter}>Objectif{'\n'}Hebdomadaire</Text>
      <Text style={styles.stepSubtitleCenter}>Combien de séances par semaine ?</Text>
    </Animated.View>

    <Animated.View entering={ZoomIn.delay(200).springify()} style={styles.bigNumberContainer}>
      <Text style={styles.bigNumber}>{value}</Text>
      <Text style={styles.bigNumberLabel}>séances</Text>
    </Animated.View>

    <View style={styles.sliderContainer}>
      <View style={styles.frequencyRow}>
        {[1, 2, 3, 4, 5, 6, 7].map((num, idx) => {
          const isSelected = value === num;
          return (
            <Animated.View key={num} entering={FadeInDown.delay(300 + idx * 50)}>
              <Pressable
                onPress={() => onChange(num)}
                style={[styles.freqBtn, isSelected && styles.freqBtnSelected]}
              >
                <Text style={[styles.freqBtnText, isSelected && styles.freqBtnTextSelected]}>{num}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
      <Text style={styles.frequencyHint}>
        {value < 3 ? "Doucement mais sûrement 🌱" : value > 5 ? "Mode Beast activé 🔥" : "L'équilibre parfait 💪"}
      </Text>
    </View>
  </View>
);

// --- STEP 5: READY ---
const ReadyStep = ({ onComplete }: { onComplete: () => void }) => (
  <SafeAreaView style={styles.readyContainer}>
    <View style={styles.readyContent}>
      <Animated.View entering={ZoomIn.delay(200).springify()} style={styles.successIcon}>
        <Text style={{ fontSize: 60 }}>🚀</Text>
      </Animated.View>
      
      <Animated.View entering={FadeInDown.delay(400)}>
        <Text style={styles.readyTitle}>Tout est prêt !</Text>
        <Text style={styles.readyDesc}>
          Ton programme est configuré. Il est temps de passer à l'action et de créer ta légende.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(600)} style={styles.statsPreview}>
        {/* Fake Mini Card pour montrer l'UI */}
        <View style={styles.miniStatCard}>
          <Text style={styles.miniStatEmoji}>🔥</Text>
          <Text style={styles.miniStatLabel}>Streak</Text>
          <Text style={styles.miniStatValue}>0 Jours</Text>
        </View>
        <View style={styles.miniStatCard}>
          <Text style={styles.miniStatEmoji}>🏆</Text>
          <Text style={styles.miniStatLabel}>Objectif</Text>
          <Text style={styles.miniStatValue}>En cours</Text>
        </View>
      </Animated.View>
    </View>

    <Animated.View entering={FadeInDown.delay(800)} style={styles.readyFooter}>
      <PrimaryButton title="Let's Go !" onPress={onComplete} />
    </Animated.View>
  </SafeAreaView>
);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  fullScreen: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { padding: 8 },
  backIcon: { fontSize: 24, color: Colors.text },
  skipText: { color: Colors.muted, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  
  // Progress
  progressContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginHorizontal: Spacing.lg },
  progressTrack: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginRight: 8 },
  progressBar: { height: '100%', backgroundColor: Colors.cta, borderRadius: 2 },
  stepIndicator: { color: Colors.muted, fontSize: 12, fontWeight: FontWeight.bold },

  // Typography Generals
  stepTitle: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 40,
  },
  stepSubtitle: {
    fontSize: FontSize.lg,
    color: Colors.muted,
    marginBottom: Spacing.xxl,
  },
  stepTitleCenter: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitleCenter: {
    fontSize: FontSize.lg,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },

  // Welcome Step
  welcomeContent: { flex: 1, padding: Spacing.xxl, justifyContent: 'flex-end' },
  welcomeTag: { 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8, 
    alignSelf: 'flex-start', 
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  welcomeTagText: { color: '#fff', fontWeight: 'bold', fontSize: 10, letterSpacing: 1 },
  welcomeTitle: { fontSize: 48, fontWeight: '900', color: '#fff', lineHeight: 52, marginBottom: Spacing.md },
  welcomeSubtitle: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.8)', lineHeight: 24, marginBottom: Spacing.xxl },
  welcomeAction: { marginBottom: Spacing.lg },

  // Cards & Grid (Goals)
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItemWrapper: { width: (SCREEN_WIDTH - (Spacing.xl * 2) - 12) / 2 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    height: 160,
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: Colors.cta,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardEmoji: { fontSize: 32 },
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  textSelected: { color: Colors.cta },
  checkCircle: { 
    position: 'absolute', top: 10, right: 10, 
    width: 20, height: 20, borderRadius: 10, 
    backgroundColor: Colors.cta, justifyContent: 'center', alignItems: 'center' 
  },
  checkIcon: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  // List (Levels)
  listContainer: { gap: 12 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  listIconBg: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.md,
  },
  listEmoji: { fontSize: 24 },
  listContent: { flex: 1 },
  listTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: 2 },
  listDesc: { fontSize: FontSize.sm, color: Colors.muted },
  radioCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.muted,
  },
  radioSelected: {
    borderColor: Colors.cta,
    backgroundColor: Colors.cta,
  },

  // Frequency
  bigNumberContainer: { alignItems: 'center', marginVertical: Spacing.xl },
  bigNumber: { fontSize: 96, fontWeight: '900', color: Colors.cta, lineHeight: 100 },
  bigNumberLabel: { fontSize: FontSize.xl, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 2 },
  sliderContainer: { alignItems: 'center' },
  frequencyRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: Spacing.lg },
  freqBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  freqBtnSelected: { backgroundColor: Colors.cta },
  freqBtnText: { color: Colors.muted, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  freqBtnTextSelected: { color: '#1b0f0c' },
  frequencyHint: { color: Colors.cta, fontSize: FontSize.sm, fontWeight: FontWeight.medium },

  // Ready Step
  readyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  readyContent: { alignItems: 'center', width: '100%', flex: 1, justifyContent: 'center' },
  successIcon: { 
    width: 120, height: 120, borderRadius: 60, 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  readyTitle: { fontSize: 36, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.md, textAlign: 'center' },
  readyDesc: { fontSize: FontSize.md, color: Colors.muted, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xxl },
  statsPreview: { flexDirection: 'row', gap: 12 },
  miniStatCard: { 
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, 
    alignItems: 'center', width: 100 
  },
  miniStatEmoji: { fontSize: 24, marginBottom: 4 },
  miniStatLabel: { fontSize: 10, color: Colors.muted, textTransform: 'uppercase' },
  miniStatValue: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  readyFooter: { width: '100%', paddingBottom: Spacing.xl },

  // Footer Actions
  footer: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.lg },
  buttonWrapper: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  primaryButton: {
    paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  primaryButtonText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#1b0f0c', marginRight: 8 },
  buttonIcon: { fontSize: 18, color: '#1b0f0c' },
  buttonDisabled: { opacity: 0.5 },
  buttonTextDisabled: { color: 'rgba(255,255,255,0.3)' },
});
