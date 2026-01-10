// ============================================================================
// SETTINGS - PREFERENCES SUB-SCREEN
// ============================================================================

import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft,
  Target,
  Zap,
  Camera,
  Sparkles,
} from 'lucide-react-native';
import { GlassCard, InputField } from '../../src/components/ui';
import { useAppStore } from '../../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants';

// Setting Item Component
function SettingItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = false,
  delay = 0,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={onPress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        <View style={[styles.settingIconContainer, { backgroundColor: `${iconColor}20` }]}>
          {icon}
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {rightElement}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PreferencesScreen() {
  const { t } = useTranslation();
  const { settings, updateWeeklyGoal, updateSettings } = useAppStore();

  const [weeklyGoalInput, setWeeklyGoalInput] = useState(settings.weeklyGoal.toString());
  const [keepGoingInput, setKeepGoingInput] = useState((settings.keepGoingIntervalMinutes ?? 5).toString());

  // Save weekly goal
  const handleSaveGoal = useCallback(() => {
    const goal = parseInt(weeklyGoalInput, 10);
    if (isNaN(goal) || goal < 1 || goal > 14) {
      Alert.alert(t('common.error'), t('settings.weeklyGoalError'));
      return;
    }
    updateWeeklyGoal(goal);
    Alert.alert(t('common.success'), t('settings.goalSaved', { goal }));
  }, [weeklyGoalInput, updateWeeklyGoal, t]);

  // Save motivation interval
  const handleSaveKeepGoing = useCallback(() => {
    const interval = parseInt(keepGoingInput, 10);
    if (isNaN(interval) || interval < 1 || interval > 60) {
      Alert.alert(t('common.error'), t('settings.keepGoingError'));
      return;
    }
    updateSettings({ keepGoingIntervalMinutes: interval });
    Alert.alert(t('common.success'), t('settings.keepGoingSaved', { interval }));
  }, [keepGoingInput, updateSettings, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(50)} style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('settings.preferences')}</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Weekly Goal */}
        <GlassCard style={styles.settingsCard}>
          <View style={styles.goalSection}>
            <View style={styles.goalHeader}>
              <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(74, 222, 128, 0.2)' }]}>
                <Target size={20} color="#4ade80" />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.settingTitle}>{t('settings.weeklyGoal')}</Text>
                <Text style={styles.settingSubtitle}>
                  {t('settings.weeklyGoalDesc', { count: settings.weeklyGoal })}
                </Text>
              </View>
            </View>
            <View style={styles.goalInputRow}>
              <InputField
                value={weeklyGoalInput}
                onChangeText={setWeeklyGoalInput}
                keyboardType="number-pad"
                containerStyle={styles.goalInput}
                maxLength={2}
              />
              <Text style={styles.goalUnit}>/ semaine</Text>
              <TouchableOpacity 
                style={styles.goalSaveButton}
                onPress={handleSaveGoal}
              >
                <Text style={styles.goalSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        {/* Motivation Interval */}
        <GlassCard style={styles.settingsCard}>
          <View style={styles.goalSection}>
            <View style={styles.goalHeader}>
              <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Zap size={20} color="#10b981" />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.settingTitle}>{t('settings.keepGoingInterval')}</Text>
                <Text style={styles.settingSubtitle}>
                  {t('settings.keepGoingIntervalDesc', { count: settings.keepGoingIntervalMinutes ?? 5 })}
                </Text>
                <Text style={[styles.settingSubtitle, { fontSize: 11, color: Colors.muted, marginTop: 2 }]}>
                  🚴 {t('settings.keepGoingEllipticalOnly')}
                </Text>
              </View>
            </View>
            <View style={styles.goalInputRow}>
              <InputField
                value={keepGoingInput}
                onChangeText={setKeepGoingInput}
                keyboardType="number-pad"
                containerStyle={styles.goalInput}
                maxLength={2}
              />
              <Text style={styles.goalUnit}>min</Text>
              <TouchableOpacity 
                style={styles.goalSaveButton}
                onPress={handleSaveKeepGoing}
              >
                <Text style={styles.goalSaveText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        {/* Camera Preview */}
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Camera size={20} color="#60a5fa" />}
            iconColor="#60a5fa"
            title={t('settings.cameraPreview', { defaultValue: 'Aperçu caméra' })}
            subtitle={t('settings.cameraPreviewDesc', { defaultValue: 'Voir le flux caméra lors du tracking' })}
            rightElement={
              <Switch
                value={settings.preferCameraDetection ?? false}
                onValueChange={(value) => updateSettings({ preferCameraDetection: value })}
                trackColor={{ false: Colors.card, true: Colors.teal }}
                thumbColor="#fff"
              />
            }
            delay={200}
          />
        </GlassCard>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  headerSpacer: {
    width: 44,
  },

  // Settings Card
  settingsCard: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },

  // Setting Item
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.md,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  settingSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginTop: 2,
  },

  // Goal Section
  goalSection: {
    padding: Spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  goalInfo: {
    flex: 1,
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginLeft: 52,
  },
  goalInput: {
    width: 70,
    marginBottom: 0,
  },
  goalUnit: {
    fontSize: FontSize.md,
    color: Colors.muted,
    flex: 1,
  },
  goalSaveButton: {
    backgroundColor: Colors.cta,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  goalSaveText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.bg,
  },
});
