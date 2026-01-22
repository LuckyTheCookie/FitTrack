// ============================================================================
// PLOPPY ONBOARDING MODAL - Introduction to Ploppy AI meal analysis
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Sparkles, Shield, Clock, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../stores';
import { BuildConfig } from '../../config/buildConfig';
import { startPollinationAuth } from '../../services/pollination';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';

interface PloppyOnboardingModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function PloppyOnboardingModal({ visible, onAccept, onDecline }: PloppyOnboardingModalProps) {
  const { t } = useTranslation();
  const { updateSettings } = useAppStore();
  
  const handleAccept = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateSettings({ ploppyOnboardingShown: true });
    
    // If FOSS, don't start auth
    if (BuildConfig.isFoss) {
      onDecline();
      return;
    }
    
    // Start Pollination auth
    try {
      await startPollinationAuth();
      updateSettings({ ploppyEnabled: true });
    } catch (error) {
      // User can retry later
    }
    onAccept();
  };
  
  const handleDecline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ ploppyOnboardingShown: true, ploppyEnabled: false });
    onDecline();
  };
  
  const features = [
    { icon: '📊', text: t('settings.ploppy.onboarding.feature1') },
    { icon: '💡', text: t('settings.ploppy.onboarding.feature2') },
    { icon: '🎯', text: t('settings.ploppy.onboarding.feature3') },
  ];
  
  const privacyPoints = [
    { icon: <Shield size={14} color="#22c55e" />, text: t('settings.ploppy.onboarding.privacy1') },
    { icon: <Clock size={14} color="#22c55e" />, text: t('settings.ploppy.onboarding.privacy2') },
    { icon: <Check size={14} color="#22c55e" />, text: t('settings.ploppy.onboarding.privacy3') },
  ];
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeInUp.springify()} 
          style={styles.container}
        >
          {/* Header */}
          <Animated.View entering={FadeIn.delay(100)} style={styles.header}>
            <View style={styles.mascotContainer}>
              <Text style={styles.mascotEmoji}>🐦</Text>
            </View>
            <Text style={styles.title}>{t('settings.ploppy.onboarding.title')}</Text>
            <Text style={styles.subtitle}>{t('settings.ploppy.onboarding.subtitle')}</Text>
          </Animated.View>
          
          {/* Example Score Card */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.exampleCard}>
            <View style={styles.exampleHeader}>
              <Text style={styles.exampleLabel}>{t('settings.ploppy.onboarding.exampleLabel')}</Text>
            </View>
            <View style={styles.exampleContent}>
              <LinearGradient
                colors={['#22c55e', '#16a34a']}
                style={styles.scoreCircle}
              >
                <Text style={styles.scoreValue}>78</Text>
              </LinearGradient>
              <View style={styles.exampleTexts}>
                <Text style={styles.exampleTitle}>🥗 Salade César maison</Text>
                <Text style={styles.exampleDesc}>Bon équilibre protéines/légumes</Text>
              </View>
            </View>
          </Animated.View>
          
          {/* Features */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.features}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </Animated.View>
          
          {/* Privacy Info */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.privacyBox}>
            <View style={styles.privacyHeader}>
              <Sparkles size={16} color={Colors.cta} />
              <Text style={styles.privacyTitle}>{t('settings.ploppy.onboarding.privacyTitle')}</Text>
            </View>
            {privacyPoints.map((point, index) => (
              <View key={index} style={styles.privacyItem}>
                {point.icon}
                <Text style={styles.privacyText}>{point.text}</Text>
              </View>
            ))}
            <Text style={styles.privacyNote}>{t('settings.ploppy.onboarding.privacyNote')}</Text>
          </Animated.View>
          
          {/* Buttons */}
          <Animated.View entering={FadeInDown.delay(500)} style={styles.buttons}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.cta, Colors.cta2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptGradient}
              >
                <Sparkles size={18} color="#fff" />
                <Text style={styles.acceptText}>{t('settings.ploppy.onboarding.accept')}</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              activeOpacity={0.7}
            >
              <Text style={styles.declineText}>{t('settings.ploppy.onboarding.decline')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.cardSolid,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  mascotContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(215, 150, 134, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  mascotEmoji: {
    fontSize: 42,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  exampleCard: {
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  exampleHeader: {
    marginBottom: Spacing.sm,
  },
  exampleLabel: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  exampleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  exampleTexts: {
    flex: 1,
  },
  exampleTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  exampleDesc: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
  features: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    flex: 1,
  },
  privacyBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  privacyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 6,
  },
  privacyText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    flex: 1,
  },
  privacyNote: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  buttons: {
    gap: Spacing.sm,
  },
  acceptButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  acceptText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  declineButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  declineText: {
    fontSize: FontSize.sm,
    color: Colors.muted,
  },
});
