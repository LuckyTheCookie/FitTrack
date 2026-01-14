// ============================================================================
// HEALTH CONNECT PROMPT MODAL - Custom modal for startup sync notification
// ============================================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, ArrowRight, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HealthConnectPromptModalProps {
  visible: boolean;
  workoutCount: number;
  onViewActivities: () => void;
  onSkip: () => void;
}

export function HealthConnectPromptModal({
  visible,
  workoutCount,
  onViewActivities,
  onSkip,
}: HealthConnectPromptModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onSkip} />
        
        <Animated.View 
          entering={FadeInDown.delay(100).springify()} 
          style={styles.modalContainer}
        >
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onSkip}>
            <X size={20} color={Colors.muted} />
          </Pressable>

          {/* Icon */}
          <Animated.View entering={ZoomIn.delay(200).springify()} style={styles.iconContainer}>
            <LinearGradient
              colors={['#4ade80', '#22c55e']}
              style={styles.iconGradient}
            >
              <Heart size={32} color="#fff" fill="#fff" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Animated.View entering={FadeInDown.delay(300)}>
            <Text style={styles.title}>
              {t('healthConnect.startup.title')}
            </Text>
          </Animated.View>

          {/* Count badge */}
          <Animated.View entering={ZoomIn.delay(400).springify()} style={styles.countBadge}>
            <Text style={styles.countNumber}>{workoutCount}</Text>
            <Text style={styles.countLabel}>
              {workoutCount === 1 ? 'nouvelle activité' : 'nouvelles activités'}
            </Text>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.delay(500)}>
            <Text style={styles.description}>
              De nouvelles séances ont été détectées dans Health Connect. Souhaites-tu les importer dans FitTrack ?
            </Text>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(600)} style={styles.actions}>
            <Pressable style={styles.primaryButton} onPress={onViewActivities}>
              <LinearGradient
                colors={['#4ade80', '#22c55e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {t('healthConnect.startup.import')}
                </Text>
                <ArrowRight size={18} color="#000" />
              </LinearGradient>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={onSkip}>
              <Text style={styles.secondaryButtonText}>
                {t('healthConnect.startup.skip')}
              </Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: Spacing.xl,
  },
  modalContainer: {
    width: SCREEN_WIDTH - Spacing.xl * 2,
    maxWidth: 360,
    backgroundColor: Colors.cardSolid,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 16,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  countNumber: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: '#4ade80',
  },
  countLabel: {
    fontSize: FontSize.sm,
    color: '#4ade80',
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#000',
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
});
