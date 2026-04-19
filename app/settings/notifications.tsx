// ============================================================================
// SETTINGS - NOTIFICATIONS SUB-SCREEN
// ============================================================================

import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bell, Clock, UtensilsCrossed, Plus, X, Scale } from 'lucide-react-native';
import { GlassCard } from '../../src/components/ui';
import { useAppStore } from '../../src/stores';
import { Colors } from '../../src/constants';
import * as NotificationService from '../../src/services/notifications';
import { styles } from './_notifications.styles';

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

  const MAX_HOUR = 23;
  const MIN_HOUR = 0;
  const MAX_MINUTE = 59;
  const MIN_MINUTE = 0;
  const commitSettings = useCallback(async (patch: Parameters<typeof updateSettings>[0]) => {
    await Promise.resolve(updateSettings(patch));
  }, [updateSettings]);

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerHour, setTimePickerHour] = useState(String(settings.streakReminderHour ?? 20));
  const [timePickerMinute, setTimePickerMinute] = useState(String(settings.streakReminderMinute ?? 0).padStart(2, '0'));

  // Meal reminder states
  const [mealTimePickerVisible, setMealTimePickerVisible] = useState(false);
  const [mealTimePickerHour, setMealTimePickerHour] = useState('12');
  const [mealTimePickerMinute, setMealTimePickerMinute] = useState('00');
  const [editingMealIndex, setEditingMealIndex] = useState<number | null>(null);

  const handleAddMealReminder = useCallback(() => {
    const currentReminders = settings.mealReminders || [];
    if (currentReminders.length >= 4) return;
    
    // Default times: 7:00, 12:00, 19:00, 16:00
    const defaultTimes = [
      { hour: 7, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 19, minute: 0 },
      { hour: 16, minute: 0 },
    ];
    const nextDefault = defaultTimes[currentReminders.length] || { hour: 12, minute: 0 };
    
    setMealTimePickerHour(String(nextDefault.hour));
    setMealTimePickerMinute(String(nextDefault.minute).padStart(2, '0'));
    setEditingMealIndex(null); // null means adding new
    setMealTimePickerVisible(true);
  }, [settings.mealReminders]);

  const handleSaveMealReminder = useCallback(async () => {
    const hour = parseInt(mealTimePickerHour, 10);
    const minute = parseInt(mealTimePickerMinute, 10);
    
    if (isNaN(hour) || isNaN(minute) || hour < MIN_HOUR || hour > MAX_HOUR || minute < MIN_MINUTE || minute > MAX_MINUTE) {
      Alert.alert(t('common.error'), t('settings.reminderInvalid'));
      return;
    }
    
    const currentReminders = [...(settings.mealReminders || [])];
    
    if (editingMealIndex !== null) {
      // Update existing
      currentReminders[editingMealIndex] = { enabled: true, hour, minute };
      if (currentReminders[editingMealIndex].enabled) {
        await NotificationService.scheduleMealReminder(editingMealIndex, hour, minute);
      }
    } else {
      // Add new
      const newIndex = currentReminders.length;
      currentReminders.push({ enabled: true, hour, minute });
      await NotificationService.scheduleMealReminder(newIndex, hour, minute);
    }
    
    await commitSettings({ mealReminders: currentReminders });
    setMealTimePickerVisible(false);
  }, [mealTimePickerHour, mealTimePickerMinute, editingMealIndex, settings.mealReminders, commitSettings, t]);

  const handleToggleMealReminder = useCallback(async (index: number, enabled: boolean) => {
    const currentReminders = [...(settings.mealReminders || [])];
    if (!currentReminders[index]) return;
    
    currentReminders[index].enabled = enabled;
    
    if (enabled) {
      await NotificationService.scheduleMealReminder(index, currentReminders[index].hour, currentReminders[index].minute);
    } else {
      await NotificationService.cancelMealReminder(index);
    }
    
    await commitSettings({ mealReminders: currentReminders });
  }, [settings.mealReminders, commitSettings]);

  const handleDeleteMealReminder = useCallback(async (index: number) => {
    await NotificationService.cancelMealReminder(index);
    
    const currentReminders = [...(settings.mealReminders || [])];
    currentReminders.splice(index, 1);
    
    // Reschedule remaining reminders with new indices in parallel.
    await Promise.all(
      currentReminders.map((reminder, i) => {
        if (!reminder.enabled) {
          return Promise.resolve();
        }
        return NotificationService.scheduleMealReminder(i, reminder.hour, reminder.minute);
      })
    );

    await commitSettings({ mealReminders: currentReminders });
  }, [settings.mealReminders, commitSettings]);

  // Weight reminder states
  const [weightTimePickerVisible, setWeightTimePickerVisible] = useState(false);
  const [weightTimePickerHour, setWeightTimePickerHour] = useState(String(settings.weightReminderHour ?? 8));
  const [weightTimePickerMinute, setWeightTimePickerMinute] = useState(String(settings.weightReminderMinute ?? 0).padStart(2, '0'));
  const [weightFrequency, setWeightFrequency] = useState<'daily' | 'weekly' | 'monthly'>(settings.weightReminderFrequency ?? 'weekly');
  const [weightDayOfWeek, setWeightDayOfWeek] = useState(settings.weightReminderDayOfWeek ?? 1); // 1 = Monday
  const [weightDayOfMonth, setWeightDayOfMonth] = useState(settings.weightReminderDayOfMonth ?? 1);

  const weekDayLabels = [
    t('common.sunday', { defaultValue: 'Dimanche' }),
    t('common.monday', { defaultValue: 'Lundi' }),
    t('common.tuesday', { defaultValue: 'Mardi' }),
    t('common.wednesday', { defaultValue: 'Mercredi' }),
    t('common.thursday', { defaultValue: 'Jeudi' }),
    t('common.friday', { defaultValue: 'Vendredi' }),
    t('common.saturday', { defaultValue: 'Samedi' }),
  ];

  const handleToggleWeightReminder = useCallback(async (value: boolean) => {
    if (value) {
      const hour = settings.weightReminderHour ?? 8;
      const minute = settings.weightReminderMinute ?? 0;
      const frequency = settings.weightReminderFrequency ?? 'weekly';
      const dayOfWeek = settings.weightReminderDayOfWeek ?? 1;
      const dayOfMonth = settings.weightReminderDayOfMonth ?? 1;
      
      if (frequency === 'daily') {
        await NotificationService.scheduleWeightReminderDaily(hour, minute);
      } else if (frequency === 'weekly') {
        // Convert 0-6 (Sunday-Saturday) to 1-7 (Sunday-Saturday) for expo notifications
        await NotificationService.scheduleWeightReminderWeekly(hour, minute, dayOfWeek + 1);
      } else {
        await NotificationService.scheduleWeightReminderMonthly(hour, minute, dayOfMonth);
      }
      
      await commitSettings({ 
        weightReminderEnabled: true,
        weightReminderHour: hour,
        weightReminderMinute: minute,
        weightReminderFrequency: frequency,
        weightReminderDayOfWeek: dayOfWeek,
        weightReminderDayOfMonth: dayOfMonth,
      });
      
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      Alert.alert(t('common.success'), t('settings.weightReminderEnabled', { time: timeStr, defaultValue: `Rappel de pesée activé à ${timeStr}` }));
    } else {
      await NotificationService.cancelWeightReminder();
      await commitSettings({ weightReminderEnabled: false });
    }
  }, [settings, commitSettings, t]);

  const handleSaveWeightReminder = useCallback(async () => {
    const hour = parseInt(weightTimePickerHour, 10);
    const minute = parseInt(weightTimePickerMinute, 10);
    
    if (isNaN(hour) || isNaN(minute) || hour < MIN_HOUR || hour > MAX_HOUR || minute < MIN_MINUTE || minute > MAX_MINUTE) {
      Alert.alert(t('common.error'), t('settings.reminderInvalid'));
      return;
    }
    
    if (weightFrequency === 'daily') {
      await NotificationService.scheduleWeightReminderDaily(hour, minute);
    } else if (weightFrequency === 'weekly') {
      await NotificationService.scheduleWeightReminderWeekly(hour, minute, weightDayOfWeek + 1);
    } else {
      await NotificationService.scheduleWeightReminderMonthly(hour, minute, weightDayOfMonth);
    }
    
    await commitSettings({ 
      weightReminderHour: hour,
      weightReminderMinute: minute,
      weightReminderFrequency: weightFrequency,
      weightReminderDayOfWeek: weightDayOfWeek,
      weightReminderDayOfMonth: weightDayOfMonth,
    });
    
    setWeightTimePickerVisible(false);
    
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    Alert.alert(t('common.success'), t('settings.reminderSet', { time: timeStr }));
  }, [weightTimePickerHour, weightTimePickerMinute, weightFrequency, weightDayOfWeek, weightDayOfMonth, commitSettings, t]);

  const getWeightReminderDescription = useCallback(() => {
    if (!settings.weightReminderEnabled) return t('settings.socialDisabled');
    const hour = settings.weightReminderHour ?? 8;
    const minute = settings.weightReminderMinute ?? 0;
    const frequency = settings.weightReminderFrequency ?? 'weekly';
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    if (frequency === 'daily') {
      return t('settings.weightReminderDaily', { time: timeStr, defaultValue: `Tous les jours à ${timeStr}` });
    } else if (frequency === 'weekly') {
      const day = weekDayLabels[settings.weightReminderDayOfWeek ?? 1];
      return t('settings.weightReminderWeekly', { day, time: timeStr, defaultValue: `Chaque ${day} à ${timeStr}` });
    } else {
      const dayOfMonth = settings.weightReminderDayOfMonth ?? 1;
      return t('settings.weightReminderMonthly', { day: dayOfMonth, time: timeStr, defaultValue: `Le ${dayOfMonth} de chaque mois à ${timeStr}` });
    }
  }, [settings, weekDayLabels, t]);

  const handleToggleReminder = useCallback(async (value: boolean) => {
    if (value) {
      const hour = settings.streakReminderHour ?? 20;
      const minute = settings.streakReminderMinute ?? 0;
      await NotificationService.scheduleStreakReminder(hour, minute);
      await commitSettings({ 
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
      await commitSettings({ streakReminderEnabled: false });
    }
  }, [settings, commitSettings, t]);

  const handleSaveTime = useCallback(async () => {
    const hour = parseInt(timePickerHour, 10);
    const minute = parseInt(timePickerMinute, 10);
    
    if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      await NotificationService.scheduleStreakReminder(hour, minute);
      await commitSettings({ 
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
  }, [timePickerHour, timePickerMinute, commitSettings, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[Colors.overlaySky16, Colors.transparent]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />

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
          <View style={styles.headerTitleWrap}>
            <Text style={styles.eyebrow}>{t('settings.eyebrow', 'SPIX')}</Text>
            <Text style={styles.screenTitle}>{t('settings.notifications')}</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Bell size={18} color={Colors.blue} />
          </View>
        </Animated.View>

        {/* Streak Reminder Toggle */}
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Bell size={20} color={Colors.warning} />}
            iconColor={Colors.warning}
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
                thumbColor={Colors.white}
              />
            }
            delay={100}
          />
          
          {/* Time Picker (only if enabled) */}
          {settings.streakReminderEnabled && (
            <SettingItem
              icon={<Clock size={20} color={Colors.blue} />}
              iconColor={Colors.blue}
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

        {/* Meal Reminders */}
        <Animated.View entering={FadeIn.delay(200)}>
          <Text style={styles.sectionTitle}>{t('settings.mealReminders')}</Text>
        </Animated.View>
        
        <GlassCard style={styles.settingsCard}>
          {/* Existing meal reminders */}
          {(settings.mealReminders || []).map((reminder, index) => (
            <Animated.View 
              key={`${reminder.hour}-${reminder.minute}-${index}`} 
              entering={FadeInDown.delay(250 + index * 50).springify()}
              style={styles.mealReminderRow}
            >
              <View style={styles.mealReminderLeft}>
                <View style={[styles.settingIconContainer, { backgroundColor: Colors.overlayWarning20 }]}> 
                  <UtensilsCrossed size={20} color={Colors.warning} />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditingMealIndex(index);
                    setMealTimePickerHour(String(reminder.hour));
                    setMealTimePickerMinute(String(reminder.minute).padStart(2, '0'));
                    setMealTimePickerVisible(true);
                  }}
                >
                  <Text style={styles.mealReminderTime}>
                    {String(reminder.hour).padStart(2, '0')}:{String(reminder.minute).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.mealReminderActions}>
                <Switch
                  value={reminder.enabled}
                  onValueChange={(value) => handleToggleMealReminder(index, value)}
                  trackColor={{ false: Colors.card, true: Colors.teal }}
                  thumbColor={Colors.white}
                />
                <TouchableOpacity
                  style={styles.deleteMealButton}
                  onPress={() => handleDeleteMealReminder(index)}
                >
                  <X size={18} color={Colors.muted} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))}
          
          {/* Add new reminder button (max 4) */}
          {(settings.mealReminders || []).length < 4 && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <TouchableOpacity 
                style={styles.addMealButton}
                onPress={handleAddMealReminder}
              >
                <Plus size={18} color={Colors.cta} />
                <Text style={styles.addMealButtonText}>{t('settings.addMealReminder')}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </GlassCard>

        {/* Weight Reminders */}
        <Animated.View entering={FadeIn.delay(350)}>
          <Text style={styles.sectionTitle}>{t('settings.weightReminder', { defaultValue: 'Rappel de pesée' })}</Text>
        </Animated.View>
        
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Scale size={20} color={Colors.violet} />}
            iconColor={Colors.violet}
            title={t('settings.weightReminderTitle', { defaultValue: 'Rappel de pesée' })}
            subtitle={getWeightReminderDescription()}
            rightElement={
              <Switch
                value={settings.weightReminderEnabled ?? false}
                onValueChange={handleToggleWeightReminder}
                trackColor={{ false: Colors.card, true: Colors.teal }}
                thumbColor={Colors.white}
              />
            }
            delay={400}
          />
          
          {/* Time and frequency settings (only if enabled) */}
          {settings.weightReminderEnabled && (
            <SettingItem
              icon={<Clock size={20} color={Colors.blue} />}
              iconColor={Colors.blue}
              title={t('settings.weightReminderSettings', { defaultValue: 'Configurer' })}
              subtitle={getWeightReminderDescription()}
              onPress={() => {
                setWeightTimePickerHour(String(settings.weightReminderHour ?? 8));
                setWeightTimePickerMinute(String(settings.weightReminderMinute ?? 0).padStart(2, '0'));
                setWeightFrequency(settings.weightReminderFrequency ?? 'weekly');
                setWeightDayOfWeek(settings.weightReminderDayOfWeek ?? 1);
                setWeightDayOfMonth(settings.weightReminderDayOfMonth ?? 1);
                setWeightTimePickerVisible(true);
              }}
              delay={450}
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

      {/* Meal Time Picker Modal */}
      <Modal
        visible={mealTimePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMealTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <Text style={styles.timePickerTitle}>{t('settings.mealReminderTime')}</Text>
            <Text style={styles.timePickerSubtitle}>{t('settings.mealReminderTimeDesc')}</Text>
            
            <View style={styles.timePickerInputs}>
              <TextInput
                style={styles.timePickerInput}
                value={mealTimePickerHour}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num.length <= 2) setMealTimePickerHour(num);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="HH"
                placeholderTextColor={Colors.muted}
              />
              <Text style={styles.timePickerSeparator}>:</Text>
              <TextInput
                style={styles.timePickerInput}
                value={mealTimePickerMinute}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num.length <= 2) setMealTimePickerMinute(num);
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
                onPress={() => setMealTimePickerVisible(false)}
              >
                <Text style={styles.timePickerCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.timePickerConfirmButton}
                onPress={handleSaveMealReminder}
              >
                <Text style={styles.timePickerConfirmText}>{t('common.validate')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Weight Time Picker Modal */}
      <Modal
        visible={weightTimePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWeightTimePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <Text style={styles.timePickerTitle}>{t('settings.weightReminderTime', { defaultValue: 'Rappel de pesée' })}</Text>
            <Text style={styles.timePickerSubtitle}>{t('settings.weightReminderTimeDesc', { defaultValue: 'Choisis quand te rappeler de te peser' })}</Text>
            
            {/* Frequency selector */}
            <View style={styles.frequencySelector}>
              {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyButton,
                    weightFrequency === freq && styles.frequencyButtonActive
                  ]}
                  onPress={() => setWeightFrequency(freq)}
                >
                  <Text style={[
                    styles.frequencyButtonText,
                    weightFrequency === freq && styles.frequencyButtonTextActive
                  ]}>
                    {freq === 'daily' && t('settings.frequencyDaily', { defaultValue: 'Quotidien' })}
                    {freq === 'weekly' && t('settings.frequencyWeekly', { defaultValue: 'Hebdomadaire' })}
                    {freq === 'monthly' && t('settings.frequencyMonthly', { defaultValue: 'Mensuel' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day of week selector (for weekly) */}
            {weightFrequency === 'weekly' && (
              <View style={styles.daySelector}>
                <Text style={styles.daySelectorLabel}>{t('settings.dayOfWeek', { defaultValue: 'Jour de la semaine' })}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScrollView}>
                  <View style={styles.dayButtons}>
                    {weekDayLabels.map((day, index) => (
                      <TouchableOpacity
                        key={`${day}-${index}`}
                        style={[
                          styles.dayButton,
                          weightDayOfWeek === index && styles.dayButtonActive
                        ]}
                        onPress={() => setWeightDayOfWeek(index)}
                      >
                        <Text style={[
                          styles.dayButtonText,
                          weightDayOfWeek === index && styles.dayButtonTextActive
                        ]}>
                          {day.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Day of month selector (for monthly) */}
            {weightFrequency === 'monthly' && (
              <View style={styles.daySelector}>
                <Text style={styles.daySelectorLabel}>{t('settings.dayOfMonth', { defaultValue: 'Jour du mois' })}</Text>
                <View style={styles.dayOfMonthInput}>
                  <TextInput
                    style={styles.dayOfMonthTextInput}
                    value={String(weightDayOfMonth)}
                    onChangeText={(text) => {
                      const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                      if (!isNaN(num) && num >= 1 && num <= 31) {
                        setWeightDayOfMonth(num);
                      } else if (text === '') {
                        setWeightDayOfMonth(1);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="1"
                    placeholderTextColor={Colors.muted}
                  />
                </View>
              </View>
            )}
            
            {/* Time selector */}
            <View style={styles.timePickerInputs}>
              <TextInput
                style={styles.timePickerInput}
                value={weightTimePickerHour}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num.length <= 2) setWeightTimePickerHour(num);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="HH"
                placeholderTextColor={Colors.muted}
              />
              <Text style={styles.timePickerSeparator}>:</Text>
              <TextInput
                style={styles.timePickerInput}
                value={weightTimePickerMinute}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, '');
                  if (num.length <= 2) setWeightTimePickerMinute(num);
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
                onPress={() => setWeightTimePickerVisible(false)}
              >
                <Text style={styles.timePickerCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.timePickerConfirmButton}
                onPress={handleSaveWeightReminder}
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
