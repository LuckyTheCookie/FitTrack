// ============================================================================
// ONBOARDING SCREEN - Beautiful custom onboarding experience
// Design glassmorphism cohérent avec le reste de l'app
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useAppStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Gradients } from '../src/constants';
import type { FitnessGoal, FitnessLevel } from '../src/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Goal options with emojis
const GOAL_OPTIONS: { key: FitnessGoal; emoji: string }[] = [
  { key: 'loseWeight', emoji: '🏁' },
  { key: 'buildMuscle', emoji: '💪' },
  { key: 'improveCardio', emoji: '🏃' },
  { key: 'stayHealthy', emoji: '🧘' },
];

// Level options with emojis
const LEVEL_OPTIONS: { key: FitnessLevel; emoji: string }[] = [
  { key: 'beginner', emoji: '👶' },
  { key: 'intermediate', emoji: '🧒' },
  { key: 'advanced', emoji: '🦁' },
];

// Progress dots component
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressDots}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === current && styles.dotActive,
            index < current && styles.dotCompleted,
          ]}
        />
      ))}
    </View>
  );
}

// Main Onboarding Component
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { updateSettings, updateWeeklyGoal } = useAppStore();

  // Current step (0 = welcome, 1 = goal, 2 = level, 3 = frequency, 4 = ready)
  const [currentStep, setCurrentStep] = useState(0);
  
  // State for selections
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<FitnessLevel | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(3);

  const handleComplete = useCallback(() => {
    // Save all preferences
    updateSettings({
      onboardingCompleted: true,
      fitnessGoal: selectedGoal || undefined,
      fitnessLevel: selectedLevel || undefined,
    });
    updateWeeklyGoal(weeklyGoal);
    
    // Navigate to home
    router.replace('/');
  }, [selectedGoal, selectedLevel, weeklyGoal, updateSettings, updateWeeklyGoal, router]);

  const handleSkip = useCallback(() => {
    updateSettings({ onboardingCompleted: true });
    router.replace('/');
  }, [updateSettings, router]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={nextStep} onSkip={handleSkip} t={t} />;
      case 1:
        return (
          <GoalStep
            selectedGoal={selectedGoal}
            setSelectedGoal={setSelectedGoal}
            onNext={nextStep}
            onBack={prevStep}
            t={t}
          />
        );
      case 2:
        return (
          <LevelStep
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            onNext={nextStep}
            onBack={prevStep}
            t={t}
          />
        );
      case 3:
        return (
          <FrequencyStep
            weeklyGoal={weeklyGoal}
            setWeeklyGoal={setWeeklyGoal}
            onNext={nextStep}
            onBack={prevStep}
            t={t}
          />
        );
      case 4:
        return <ReadyStep onComplete={handleComplete} t={t} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient */}
      <LinearGradient
        colors={[Colors.bg, 'rgba(31, 106, 102, 0.06)', Colors.bg]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Progress indicator (not on welcome and ready screens) */}
      {currentStep > 0 && currentStep < 4 && (
        <SafeAreaView edges={['top']} style={styles.progressContainer}>
          <ProgressDots current={currentStep - 1} total={3} />
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Step content */}
      {renderStep()}
    </View>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

// Welcome Step
function WelcomeStep({ 
  onNext, 
  onSkip,
  t 
}: { 
  onNext: () => void; 
  onSkip: () => void;
  t: (key: string) => string;
}) {
  return (
    <View style={styles.welcomeContainer}>
      {/* Image with gradient overlay */}
      <View style={styles.welcomeImageContainer}>
        <Image
          source={require('../assets/onboarding.jpg')}
          style={styles.welcomeImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(11, 12, 15, 0.6)', Colors.bg]}
          style={styles.welcomeImageGradient}
        />
      </View>

      {/* Content at bottom */}
      <SafeAreaView edges={['bottom']} style={styles.welcomeContent}>
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.welcomeTitle}>{t('onboarding.welcome.title')}</Text>
        </Animated.View>
        
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.welcomeSubtitle}>{t('onboarding.welcome.subtitle')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.welcomeButtons}>
          <TouchableOpacity onPress={onNext} activeOpacity={0.9} style={styles.primaryButtonWrapper}>
            <LinearGradient
              colors={Gradients.cta as any}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{t('onboarding.welcome.button')}</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={onSkip} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// Goal Selection Step
function GoalStep({ 
  selectedGoal, 
  setSelectedGoal,
  onNext,
  onBack,
  t,
}: { 
  selectedGoal: FitnessGoal | null;
  setSelectedGoal: (goal: FitnessGoal) => void;
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.stepContainer}>
      <ScrollView 
        style={styles.stepScrollView}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(100)}>
          <Text style={styles.stepLabel}>{t('onboarding.goal.label')}</Text>
          <Text style={styles.stepTitle}>{t('onboarding.goal.title')}</Text>
          <Text style={styles.stepDescription}>{t('onboarding.goal.description')}</Text>
        </Animated.View>

        <View style={styles.optionsGrid}>
          {GOAL_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.key}
              entering={FadeInDown.delay(150 + index * 50).springify()}
              style={styles.optionWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  selectedGoal === option.key && styles.optionCardSelected,
                ]}
                onPress={() => setSelectedGoal(option.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text style={[
                  styles.optionText,
                  selectedGoal === option.key && styles.optionTextSelected,
                ]}>
                  {t(`onboarding.goal.options.${option.key}`)}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={onNext}
          disabled={!selectedGoal}
          activeOpacity={0.9}
          style={[styles.nextButtonWrapper, !selectedGoal && styles.buttonDisabled]}
        >
          <LinearGradient
            colors={selectedGoal ? Gradients.cta as any : [Colors.card, Colors.card]}
            style={styles.nextButton}
          >
            <Text style={[styles.nextButtonText, !selectedGoal && styles.buttonTextDisabled]}>
              {t('onboarding.goal.button')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Level Selection Step
function LevelStep({ 
  selectedLevel, 
  setSelectedLevel,
  onNext,
  onBack,
  t,
}: { 
  selectedLevel: FitnessLevel | null;
  setSelectedLevel: (level: FitnessLevel) => void;
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.stepContainer}>
      <ScrollView 
        style={styles.stepScrollView}
        contentContainerStyle={styles.stepScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.delay(100)}>
          <Text style={styles.stepLabel}>{t('onboarding.level.label')}</Text>
          <Text style={styles.stepTitle}>{t('onboarding.level.title')}</Text>
          <Text style={styles.stepDescription}>{t('onboarding.level.description')}</Text>
        </Animated.View>

        <View style={styles.levelOptions}>
          {LEVEL_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.key}
              entering={FadeInDown.delay(150 + index * 80).springify()}
            >
              <TouchableOpacity
                style={[
                  styles.levelCard,
                  selectedLevel === option.key && styles.levelCardSelected,
                ]}
                onPress={() => setSelectedLevel(option.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.levelEmoji}>{option.emoji}</Text>
                <View style={styles.levelInfo}>
                  <Text style={[
                    styles.levelTitle,
                    selectedLevel === option.key && styles.levelTitleSelected,
                  ]}>
                    {t(`onboarding.level.options.${option.key}`)}
                  </Text>
                  <Text style={styles.levelDesc}>
                    {t(`onboarding.level.options.${option.key}Desc`)}
                  </Text>
                </View>
                {selectedLevel === option.key && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.stepFooter}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={onNext}
          disabled={!selectedLevel}
          activeOpacity={0.9}
          style={[styles.nextButtonWrapper, !selectedLevel && styles.buttonDisabled]}
        >
          <LinearGradient
            colors={selectedLevel ? Gradients.cta as any : [Colors.card, Colors.card]}
            style={styles.nextButton}
          >
            <Text style={[styles.nextButtonText, !selectedLevel && styles.buttonTextDisabled]}>
              {t('onboarding.level.button')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Frequency Selection Step
function FrequencyStep({ 
  weeklyGoal, 
  setWeeklyGoal,
  onNext,
  onBack,
  t,
}: { 
  weeklyGoal: number;
  setWeeklyGoal: (goal: number) => void;
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.stepContainer}>
      <View style={styles.stepScrollView}>
        <View style={styles.stepScrollContent}>
          <Animated.View entering={FadeIn.delay(100)}>
            <Text style={styles.stepLabel}>{t('onboarding.frequency.label')}</Text>
            <Text style={styles.stepTitle}>{t('onboarding.frequency.title')}</Text>
            <Text style={styles.stepDescription}>{t('onboarding.frequency.description')}</Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.delay(200).springify()}
            style={styles.frequencyContainer}
          >
            {/* Big number display */}
            <View style={styles.frequencyDisplay}>
              <Text style={styles.frequencyNumber}>{weeklyGoal}</Text>
              <Text style={styles.frequencyLabel}>{t('onboarding.frequency.times')}</Text>
            </View>

            {/* Selection buttons */}
            <View style={styles.frequencyButtons}>
              {[1, 2, 3, 4, 5].map((num) => (
                <Pressable
                  key={num}
                  onPress={() => setWeeklyGoal(num)}
                  style={[
                    styles.frequencyBtn,
                    weeklyGoal === num && styles.frequencyBtnActive,
                  ]}
                >
                  <Text style={[
                    styles.frequencyBtnText,
                    weeklyGoal === num && styles.frequencyBtnTextActive,
                  ]}>
                    {num === 5 ? '5+' : num}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={styles.stepFooter}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={onNext}
          activeOpacity={0.9}
          style={styles.nextButtonWrapper}
        >
          <LinearGradient
            colors={Gradients.cta as any}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>
              {t('onboarding.frequency.button')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Ready Step (Final)
function ReadyStep({ 
  onComplete,
  t,
}: { 
  onComplete: () => void;
  t: (key: string) => string;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.readyContainer}>
      <View style={styles.readyContent}>
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.readyEmojiContainer}
        >
          <Text style={styles.readyEmoji}>🚀</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.readyTitle}>{t('onboarding.ready.title')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Text style={styles.readySubtitle}>{t('onboarding.ready.subtitle')}</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(400).springify()} 
          style={styles.readyFeatures}
        >
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>📊</Text>
            </View>
            <Text style={styles.featureText}>Suivi de progression</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>🏆</Text>
            </View>
            <Text style={styles.featureText}>Système de gamification</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureEmoji}>🔥</Text>
            </View>
            <Text style={styles.featureText}>Streak et objectifs</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.readyButtonContainer}>
        <TouchableOpacity onPress={onComplete} activeOpacity={0.9} style={styles.primaryButtonWrapper}>
          <LinearGradient
            colors={Gradients.cta as any}
            style={styles.readyButton}
          >
            <Text style={styles.primaryButtonText}>{t('onboarding.ready.button')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
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

  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.cta,
  },
  dotCompleted: {
    backgroundColor: Colors.teal,
  },
  skipButton: {
    padding: Spacing.sm,
  },
  skipText: {
    color: Colors.muted,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },

  // Welcome Screen
  welcomeContainer: {
    flex: 1,
  },
  welcomeImageContainer: {
    height: SCREEN_HEIGHT * 0.55,
    width: '100%',
  },
  welcomeImage: {
    width: '100%',
    height: '100%',
  },
  welcomeImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    justifyContent: 'flex-end',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  welcomeSubtitle: {
    fontSize: FontSize.lg,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxl,
  },
  welcomeButtons: {
    gap: Spacing.md,
  },

  // Buttons
  primaryButtonWrapper: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  primaryButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
  },
  primaryButtonText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#1b0f0c',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    color: Colors.muted,
    fontWeight: FontWeight.medium,
  },

  // Step Container
  stepContainer: {
    flex: 1,
    paddingTop: 100, // Space for progress dots
  },
  stepScrollView: {
    flex: 1,
  },
  stepScrollContent: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  stepLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    lineHeight: 34,
  },
  stepDescription: {
    fontSize: FontSize.md,
    color: Colors.muted,
    marginBottom: Spacing.xxl,
    lineHeight: 22,
  },

  // Goal Options (Grid layout)
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionWrapper: {
    width: (SCREEN_WIDTH - Spacing.xxl * 2 - 12) / 2,
  },
  optionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 110,
    justifyContent: 'center',
  },
  optionCardSelected: {
    borderColor: Colors.cta,
    backgroundColor: 'rgba(215, 150, 134, 0.15)',
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  optionText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: Colors.cta,
  },

  // Level Options (List layout)
  levelOptions: {
    gap: 12,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelCardSelected: {
    borderColor: Colors.cta,
    backgroundColor: 'rgba(215, 150, 134, 0.15)',
  },
  levelEmoji: {
    fontSize: 32,
    marginRight: Spacing.lg,
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  levelTitleSelected: {
    color: Colors.cta,
  },
  levelDesc: {
    fontSize: FontSize.sm,
    color: Colors.muted,
  },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.cta,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: FontWeight.bold,
  },

  // Frequency Step
  frequencyContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  frequencyDisplay: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  frequencyNumber: {
    fontSize: 72,
    fontWeight: FontWeight.bold,
    color: Colors.cta,
    lineHeight: 80,
  },
  frequencyLabel: {
    fontSize: FontSize.lg,
    color: Colors.muted,
    marginTop: -4,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyBtnActive: {
    borderColor: Colors.cta,
    backgroundColor: 'rgba(215, 150, 134, 0.2)',
  },
  frequencyBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.muted,
  },
  frequencyBtnTextActive: {
    color: Colors.cta,
  },

  // Step Footer
  stepFooter: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    gap: 12,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.text,
  },
  nextButtonWrapper: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  nextButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
  },
  nextButtonText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#1b0f0c',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: Colors.muted,
  },

  // Ready Screen
  readyContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
  },
  readyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readyEmojiContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(215, 150, 134, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  readyEmoji: {
    fontSize: 50,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  readySubtitle: {
    fontSize: FontSize.lg,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  readyFeatures: {
    marginTop: Spacing.xxxl,
    width: '100%',
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.text,
  },
  readyButtonContainer: {
    paddingBottom: Spacing.xxl,
  },
  readyButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
  },
});
