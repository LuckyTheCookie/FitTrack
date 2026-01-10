// ============================================================================
// SETTINGS - NOTIFICATIONS SUB-SCREEN
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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bell, Clock } from 'lucide-react-native';
import { GlassCard } from '../../src/components/ui';
import { useAppStore } from '../../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants';
import * as NotificationService from '../../src/services/notifications';

// Setting Item Component
function SettingItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  delay = 0,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
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

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerHour, setTimePickerHour] = useState(String(settings.streakReminderHour ?? 20));
  const [timePickerMinute, setTimePickerMinute] = useState(String(settings.streakReminderMinute ?? 0).padStart(2, '0'));

  const handleToggleReminder = useCallback(async (value: boolean) => {
    if (value) {
      const hour = settings.streakReminderHour ?? 20;
      const minute = settings.streakReminderMinute ?? 0;
      await NotificationService.scheduleStreakReminder(hour, minute);
      updateSettings({ 
        streakReminderEnabled: true,
        streakReminderHour: hour,
        streakReminderMinute: minute,
      });
      Alert.alert(
        t('common.success'), 
        t('settings.streakReminderEnabled', { 
          time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` 
        })
      );
    } else {
      await NotificationService.cancelStreakReminder();
      updateSettings({ streakReminderEnabled: false });
    }
  }, [settings, updateSettings, t]);

  const handleSaveTime = useCallback(async () => {
    const hour = parseInt(timePickerHour, 10);
    const minute = parseInt(timePickerMinute, 10);
    
    if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      await NotificationService.scheduleStreakReminder(hour, minute);
      updateSettings({ 
        streakReminderHour: hour,
        streakReminderMinute: minute,
      });
      setTimePickerVisible(false);
      Alert.alert(
        t('common.success'), 
        t('settings.reminderSet', { time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` })
      );
    } else {
      Alert.alert(t('common.error'), t('settings.reminderInvalid'));
    }
  }, [timePickerHour, timePickerMinute, updateSettings, t]);

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
          <Text style={styles.screenTitle}>{t('settings.notifications')}</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Streak Reminder Toggle */}
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Bell size={20} color="#fbbf24" />}
            iconColor="#fbbf24"
            title={t('settings.streakReminder')}
            subtitle={settings.streakReminderEnabled 
              ? t('settings.reminderTimeDesc', { 
                  time: `${String(settings.streakReminderHour ?? 20).padStart(2, '0')}:${String(settings.streakReminderMinute ?? 0).padStart(2, '0')}` 
                })
              : t('settings.socialDisabled')
            }
            rightElement={
              <Switch
                value={settings.streakReminderEnabled ?? false}
                onValueChange={handleToggleReminder}
                trackColor={{ false: Colors.card, true: Colors.teal }}
                thumbColor="#fff"
              />
            }
            delay={100}
          />
          
          {/* Time Picker (only if enabled) */}
          {settings.streakReminderEnabled && (
            <SettingItem
              icon={<Clock size={20} color="#60a5fa" />}
              iconColor="#60a5fa"
              title={t('settings.reminderTime')}
              subtitle={`${String(settings.streakReminderHour ?? 20).padStart(2, '0')}:${String(settings.streakReminderMinute ?? 0).padStart(2, '0')}`}
              onPress={() => {
                setTimePickerHour(String(settings.streakReminderHour ?? 20));
                setTimePickerMinute(String(settings.streakReminderMinute ?? 0).padStart(2, '0'));
                setTimePickerVisible(true);
              }}
              delay={150}
            />
          )}
        </GlassCard>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={timePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <Text style={styles.timePickerTitle}>{t('settings.changeTime.title')}</Text>
            <Text style={styles.timePickerSubtitle}>{t('settings.changeTimeDesc')}</Text>
            
            <View style={styles.timePickerInputs}>
              <TextInput
                style={styles.timePickerInput}
                value={timePickerHour}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num.length <= 2) setTimePickerHour(num);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="HH"
                placeholderTextColor={Colors.muted}
              />
              <Text style={styles.timePickerSeparator}>:</Text>
              <TextInput
                style={styles.timePickerInput}
                value={timePickerMinute}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num.length <= 2) setTimePickerMinute(num);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="MM"
                placeholderTextColor={Colors.muted}
              />
            </View>

            <View style={styles.timePickerButtons}>
              <TouchableOpacity 
                style={styles.timePickerCancelButton}
                onPress={() => setTimePickerVisible(false)}
              >
                <Text style={styles.timePickerCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.timePickerConfirmButton}
                onPress={handleSaveTime}
              >
                <Text style={styles.timePickerConfirmText}>{t('common.validate')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Time Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  timePickerModal: {
    backgroundColor: Colors.cardSolid,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  timePickerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  timePickerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  timePickerInputs: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  timePickerInput: {
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    width: 80,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  timePickerSeparator: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  timePickerButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timePickerCancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
  },
  timePickerCancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.muted,
  },
  timePickerConfirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.cta,
    alignItems: 'center',
  },
  timePickerConfirmText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
});
