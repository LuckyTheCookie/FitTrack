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
import { ArrowLeft, Bell, Clock, UtensilsCrossed, Plus, X, Scale } from 'lucide-react-native';
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
    
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
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
    
    updateSettings({ mealReminders: currentReminders });
    setMealTimePickerVisible(false);
  }, [mealTimePickerHour, mealTimePickerMinute, editingMealIndex, settings.mealReminders, updateSettings, t]);

  const handleToggleMealReminder = useCallback(async (index: number, enabled: boolean) => {
    const currentReminders = [...(settings.mealReminders || [])];
    if (!currentReminders[index]) return;
    
    currentReminders[index].enabled = enabled;
    
    if (enabled) {
      await NotificationService.scheduleMealReminder(index, currentReminders[index].hour, currentReminders[index].minute);
    } else {
      await NotificationService.cancelMealReminder(index);
    }
    
    updateSettings({ mealReminders: currentReminders });
  }, [settings.mealReminders, updateSettings]);

  const handleDeleteMealReminder = useCallback(async (index: number) => {
    await NotificationService.cancelMealReminder(index);
    
    const currentReminders = [...(settings.mealReminders || [])];
    currentReminders.splice(index, 1);
    
    // Reschedule remaining reminders with new indices
    for (let i = 0; i < currentReminders.length; i++) {
      if (currentReminders[i].enabled) {
        await NotificationService.scheduleMealReminder(i, currentReminders[i].hour, currentReminders[i].minute);
      }
    }
    
    updateSettings({ mealReminders: currentReminders });
  }, [settings.mealReminders, updateSettings]);

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
      
      updateSettings({ 
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
      updateSettings({ weightReminderEnabled: false });
    }
  }, [settings, updateSettings, t]);

  const handleSaveWeightReminder = useCallback(async () => {
    const hour = parseInt(weightTimePickerHour, 10);
    const minute = parseInt(weightTimePickerMinute, 10);
    
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
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
    
    updateSettings({ 
      weightReminderHour: hour,
      weightReminderMinute: minute,
      weightReminderFrequency: weightFrequency,
      weightReminderDayOfWeek: weightDayOfWeek,
      weightReminderDayOfMonth: weightDayOfMonth,
    });
    
    setWeightTimePickerVisible(false);
    
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    Alert.alert(t('common.success'), t('settings.reminderSet', { time: timeStr }));
  }, [weightTimePickerHour, weightTimePickerMinute, weightFrequency, weightDayOfWeek, weightDayOfMonth, updateSettings, t]);

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

        {/* Meal Reminders */}
        <Animated.View entering={FadeIn.delay(200)}>
          <Text style={styles.sectionTitle}>{t('settings.mealReminders')}</Text>
        </Animated.View>
        
        <GlassCard style={styles.settingsCard}>
          {/* Existing meal reminders */}
          {(settings.mealReminders || []).map((reminder, index) => (
            <Animated.View 
              key={index} 
              entering={FadeInDown.delay(250 + index * 50).springify()}
              style={styles.mealReminderRow}
            >
              <View style={styles.mealReminderLeft}>
                <View style={[styles.settingIconContainer, { backgroundColor: '#fbbf2420' }]}>
                  <UtensilsCrossed size={20} color="#fbbf24" />
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
                  thumbColor="#fff"
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
            icon={<Scale size={20} color="#a78bfa" />}
            iconColor="#a78bfa"
            title={t('settings.weightReminderTitle', { defaultValue: 'Rappel de pesée' })}
            subtitle={getWeightReminderDescription()}
            rightElement={
              <Switch
                value={settings.weightReminderEnabled ?? false}
                onValueChange={handleToggleWeightReminder}
                trackColor={{ false: Colors.card, true: Colors.teal }}
                thumbColor="#fff"
              />
            }
            delay={400}
          />
          
          {/* Time and frequency settings (only if enabled) */}
          {settings.weightReminderEnabled && (
            <SettingItem
              icon={<Clock size={20} color="#60a5fa" />}
              iconColor="#60a5fa"
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
                        key={index}
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
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  mealReminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.stroke,
  },
  mealReminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  mealReminderTime: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  mealReminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  deleteMealButton: {
    padding: Spacing.xs,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  addMealButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.cta,
  },
  // Weight reminder styles
  frequencySelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  frequencyButtonActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderColor: '#a78bfa',
  },
  frequencyButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.muted,
  },
  frequencyButtonTextActive: {
    color: '#a78bfa',
    fontWeight: FontWeight.bold,
  },
  daySelector: {
    marginBottom: Spacing.lg,
  },
  daySelectorLabel: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  dayScrollView: {
    maxHeight: 50,
  },
  dayButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dayButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.overlay,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  dayButtonActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderColor: '#a78bfa',
  },
  dayButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.muted,
  },
  dayButtonTextActive: {
    color: '#a78bfa',
    fontWeight: FontWeight.bold,
  },
  dayOfMonthInput: {
    alignItems: 'center',
  },
  dayOfMonthTextInput: {
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    width: 80,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
});
