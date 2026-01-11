// ============================================================================
// SETTINGS - DATA SUB-SCREEN (Backup, Export, Import, Reset)
// ============================================================================

import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft,
  Save,
  Upload,
  Download,
  Heart,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';
import { GlassCard, ExportModal } from '../../src/components/ui';
import { useAppStore, useGamificationStore } from '../../src/stores';
import { generateFullBackup, exportFullBackup, parseBackup } from '../../src/utils/export';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants';

// Setting Item Component
function SettingItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  showChevron = true,
  delay = 0,
  danger = false,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  delay?: number;
  danger?: boolean;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity 
        style={styles.settingItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.settingIconContainer, { backgroundColor: `${iconColor}20` }]}>
          {icon}
        </View>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {showChevron && (
          <ChevronRight size={18} color={Colors.muted} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Section Title
function SectionTitle({ title, delay = 0 }: { title: string; delay?: number }) {
  return (
    <Animated.View entering={FadeIn.delay(delay)}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </Animated.View>
  );
}

export default function DataScreen() {
  const { t } = useTranslation();
  const { 
    entries, 
    settings, 
    unlockedBadges,
    getStreak,
    resetAllData,
    restoreFromBackup: restoreAppFromBackup,
  } = useAppStore();
  
  const gamificationState = useGamificationStore();
  const { restoreFromBackup: restoreGamificationFromBackup } = gamificationState;

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const streak = getStreak();

  // Full backup
  const handleFullBackup = useCallback(async () => {
    try {
      const backup = generateFullBackup(
        { entries, settings, unlockedBadges },
        {
          xp: gamificationState.xp,
          level: gamificationState.level,
          history: gamificationState.history,
          quests: gamificationState.quests,
        }
      );
      
      const jsonString = exportFullBackup(backup);
      const filename = `fittrack-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: t('settings.backup'),
        });
      } else {
        Alert.alert(t('common.error'), t('settings.shareUnavailable'));
      }
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert(t('common.error'), t('settings.backupError'));
    }
  }, [entries, settings, unlockedBadges, gamificationState, t]);

  // Restore from file
  const handleRestore = useCallback(async () => {
    Alert.alert(
      '⚠️ Restaurer une sauvegarde ?',
      'Cette action remplacera TOUTES tes données actuelles par celles de la sauvegarde. Cette action est irréversible.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.chooseFile'),
          onPress: async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
              });
              
              if (result.canceled || !result.assets?.[0]) {
                return;
              }
              
              const fileUri = result.assets[0].uri;
              const jsonString = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              
              const backup = parseBackup(jsonString);
              
              if (!backup) {
                Alert.alert(t('common.error'), t('settings.restoreInvalidFile'));
                return;
              }
              
              // Restore app state
              restoreAppFromBackup({
                entries: backup.app.entries,
                settings: {
                  weeklyGoal: backup.app.settings.weeklyGoal,
                  hiddenTabs: {
                    workout: backup.app.settings.hiddenTabs?.workout ?? false,
                    tools: backup.app.settings.hiddenTabs?.tools ?? true, // Tools hidden by default
                  },
                  debugCamera: backup.app.settings.debugCamera,
                  preferCameraDetection: backup.app.settings.preferCameraDetection,
                  units: backup.app.settings.units,
                },
                unlockedBadges: backup.app.unlockedBadges,
              });
              
              // Restore gamification state
              restoreGamificationFromBackup({
                xp: backup.gamification.xp,
                level: backup.gamification.level,
                history: backup.gamification.history,
                quests: backup.gamification.quests,
              });
              
              Alert.alert(
                t('common.success'),
                t('settings.restoreSuccess', { 
                  entries: backup.app.entries.length, 
                  level: backup.gamification.level, 
                  xp: backup.gamification.xp 
                })
              );
            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert(t('common.error'), t('settings.restoreError'));
            }
          },
        },
      ]
    );
  }, [restoreAppFromBackup, restoreGamificationFromBackup, t]);

  // Reset all data
  const handleReset = useCallback(() => {
    Alert.alert(
      t('settings.clearDataConfirm.title'),
      t('settings.clearDataConfirm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.clearData'), 
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Alert.alert(t('common.success'), t('settings.clearDataDone'));
          },
        },
      ]
    );
  }, [resetAllData, t]);

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
          <Text style={styles.screenTitle}>{t('settings.data')}</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Backup & Restore */}
        <SectionTitle title="Sauvegarde" delay={80} />
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Save size={20} color="#22d3ee" />}
            iconColor="#22d3ee"
            title={t('settings.backup')}
            subtitle={t('settings.backupDesc')}
            onPress={handleFullBackup}
            delay={100}
          />
          <View style={styles.divider} />
          <SettingItem
            icon={<Upload size={20} color="#fbbf24" />}
            iconColor="#fbbf24"
            title={t('settings.restore')}
            subtitle={t('settings.restoreDesc')}
            onPress={handleRestore}
            delay={120}
          />
        </GlassCard>

        {/* Export */}
        <SectionTitle title="Export" delay={140} />
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Download size={20} color={Colors.cta} />}
            iconColor={Colors.cta}
            title={t('settings.exportData')}
            subtitle={t('settings.exportDataDesc')}
            onPress={() => setExportModalVisible(true)}
            delay={160}
          />
        </GlassCard>

        {/* Danger Zone */}
        <SectionTitle title={t('settings.dangerZone')} delay={180} />
        <GlassCard style={[styles.settingsCard, styles.dangerCard]}>
          <SettingItem
            icon={<Trash2 size={20} color={Colors.error} />}
            iconColor={Colors.error}
            title={t('settings.clearData')}
            subtitle={t('settings.clearDataDesc')}
            onPress={handleReset}
            showChevron={false}
            danger
            delay={240}
          />
        </GlassCard>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Export Modal */}
      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        entries={entries}
        streak={streak}
      />
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

  // Section Title
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    marginTop: Spacing.sm,
  },

  // Settings Card
  settingsCard: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dangerCard: {
    borderColor: 'rgba(248, 113, 113, 0.3)',
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
  settingTitleDanger: {
    color: Colors.error,
  },
  settingSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.stroke,
    marginHorizontal: Spacing.md,
  },
});
