// ============================================================================
// SETTINGS - DEVELOPER SUB-SCREEN (Hidden developer options)
// ============================================================================

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft,
  Eye,
  Sparkles,
  Code2,
  AlertTriangle,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ui';
import { useAppStore, useGamificationStore } from '../../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants';

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

// Section Title
function SectionTitle({ title, delay = 0 }: { title: string; delay?: number }) {
  return (
    <Animated.View entering={FadeIn.delay(delay)}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </Animated.View>
  );
}

export default function DeveloperScreen() {
  const { t } = useTranslation();
  const { settings, updateSettings, entries, recalculateGamification } = useAppStore();
  const { xp, level, clearHistory, recalculateFromEntries } = useGamificationStore();

  // Handle recalculate gamification
  const handleRecalculateGamification = () => {
    Alert.alert(
      '🔄 Recalculer la gamification ?',
      `Cette action va recalculer l'XP et le niveau en fonction de toutes tes séances (${entries.filter(e => ['home', 'run', 'beatsaber', 'custom'].includes(e.type)).length} séances sport).\n\nActuellement: Niveau ${level}, ${xp} XP`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: 'Recalculer', 
          onPress: () => {
            recalculateFromEntries(entries);
            Alert.alert('✅ Recalculé', `Niveau ${useGamificationStore.getState().level}, ${useGamificationStore.getState().xp} XP`);
          },
        },
      ]
    );
  };

  // Handle clear gamification history
  const handleClearHistory = () => {
    Alert.alert(
      '🗑️ Effacer l\'historique ?',
      'Cela effacera uniquement l\'historique des gains XP, pas ton niveau actuel.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: 'Effacer', 
          style: 'destructive',
          onPress: () => {
            clearHistory();
            Alert.alert('✅ Historique effacé');
          },
        },
      ]
    );
  };

  // Handle disable developer mode
  const handleDisableDeveloperMode = () => {
    Alert.alert(
      '🔒 Désactiver le mode développeur ?',
      'Tu pourras le réactiver en cliquant 10 fois sur "À propos".',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: 'Désactiver', 
          style: 'destructive',
          onPress: () => {
            // Also disable debug camera when disabling developer mode
            updateSettings({ 
              developerMode: false,
              debugCamera: false,
            });
            router.back();
          },
        },
      ]
    );
  };

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
          <Text style={styles.screenTitle}>
            {t('settings.developerMode', { defaultValue: 'Mode développeur' })}
          </Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Warning Banner */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <View style={styles.warningBanner}>
            <AlertTriangle size={20} color="#fbbf24" />
            <Text style={styles.warningText}>
              {t('settings.developerWarning', { defaultValue: 'Ces options sont réservées aux développeurs. Utilise-les avec précaution.' })}
            </Text>
          </View>
        </Animated.View>

        {/* Debug Options */}
        <SectionTitle title="Debug" delay={100} />
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Eye size={20} color="#fbbf24" />}
            iconColor="#fbbf24"
            title={t('settings.debugCamera')}
            subtitle={t('settings.debugCameraDesc')}
            rightElement={
              <Switch
                value={settings.debugCamera ?? false}
                onValueChange={(value) => updateSettings({ debugCamera: value })}
                trackColor={{ false: Colors.card, true: Colors.teal }}
                thumbColor="#fff"
              />
            }
            delay={120}
          />
        </GlassCard>

        {/* Onboarding */}
        <SectionTitle title="Interface" delay={140} />
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Sparkles size={20} color="#a78bfa" />}
            iconColor="#a78bfa"
            title={t('settings.onboarding')}
            subtitle={t('settings.onboardingDesc')}
            onPress={() => {
              updateSettings({ onboardingCompleted: false });
              router.push('/onboarding');
            }}
            delay={160}
          />
        </GlassCard>

        {/* Gamification */}
        <SectionTitle title="Gamification" delay={180} />
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<RefreshCw size={20} color={Colors.teal} />}
            iconColor={Colors.teal}
            title="Recalculer la gamification"
            subtitle={`XP actuel: ${xp} | Niveau: ${level}`}
            onPress={handleRecalculateGamification}
            delay={200}
          />
          <SettingItem
            icon={<Trash2 size={20} color="#f97316" />}
            iconColor="#f97316"
            title="Effacer l'historique XP"
            subtitle="Supprime l'historique sans toucher aux entrées"
            onPress={handleClearHistory}
            delay={220}
          />
        </GlassCard>

        {/* Disable Developer Mode */}
        <SectionTitle title="Mode développeur" delay={240} />
        <GlassCard style={[styles.settingsCard, styles.dangerCard]}>
          <SettingItem
            icon={<Code2 size={20} color={Colors.error} />}
            iconColor={Colors.error}
            title={t('settings.disableDeveloperMode', { defaultValue: 'Désactiver le mode développeur' })}
            subtitle={t('settings.disableDeveloperModeDesc', { defaultValue: 'Masquer ces options avancées' })}
            onPress={handleDisableDeveloperMode}
            delay={260}
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
    marginBottom: Spacing.lg,
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

  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#fbbf24',
    lineHeight: 18,
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
  settingSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginTop: 2,
  },
});
