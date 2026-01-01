// ============================================================================
// SETTINGS SCREEN - Paramètres, Export, Reset (Redesign complet)
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Constants from 'expo-constants';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { 
  Settings as SettingsIcon,
  Target,
  Download,
  Database,
  Trash2,
  Activity,
  Camera,
  Eye,
  EyeOff,
  ChevronRight,
  RefreshCw,
  Rocket,
  Zap,
  History,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { 
  GlassCard, 
  InputField,
  ExportModal,
} from '../src/components/ui';
import { useAppStore, useGamificationStore, useSocialStore } from '../src/stores';
import { isSocialAvailable } from '../src/services/supabase';
import { calculateQuestTotals } from '../src/utils/questCalculator';
import { storageHelpers } from '../src/storage';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';

// Setting Item composant
function SettingItem({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
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
        {showChevron && onPress && (
          <ChevronRight size={18} color={Colors.muted} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Section Header composant
function SectionTitle({ title, delay = 0 }: { title: string; delay?: number }) {
  return (
    <Animated.View entering={FadeIn.delay(delay)}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </Animated.View>
  );
}

// Stats Card Hero
function StatsHero({ sportCount, mealCount, measureCount }: { 
  sportCount: number; 
  mealCount: number; 
  measureCount: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <LinearGradient
        colors={['rgba(215, 150, 134, 0.4)', 'rgba(215, 150, 134, 0.15)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsHero}
      >
        <View style={styles.statsHeroHeader}>
          <Database size={20} color={Colors.cta} />
          <Text style={styles.statsHeroTitle}>Tes données</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sportCount}</Text>
            <Text style={styles.statLabel}>Séances</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{mealCount}</Text>
            <Text style={styles.statLabel}>Repas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{measureCount}</Text>
            <Text style={styles.statLabel}>Mesures</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { 
    entries, 
    settings, 
    updateWeeklyGoal,
    updateSettings,
    resetAllData,
    getStreak,
  } = useAppStore();

  const { recalculateFromScratch } = useGamificationStore();
  const { socialEnabled, setSocialEnabled, isAuthenticated } = useSocialStore();

  const [weeklyGoalInput, setWeeklyGoalInput] = useState(settings.weeklyGoal.toString());
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const streak = getStreak();

  // Stats calculées
  const stats = useMemo(() => ({
    sport: entries.filter(e => e.type === 'home' || e.type === 'run' || e.type === 'beatsaber').length,
    meal: entries.filter(e => e.type === 'meal').length,
    measure: entries.filter(e => e.type === 'measure').length,
  }), [entries]);

  // Sauvegarder l'objectif hebdo
  const handleSaveGoal = useCallback(() => {
    const goal = parseInt(weeklyGoalInput, 10);
    if (isNaN(goal) || goal < 1 || goal > 14) {
      Alert.alert('Erreur', 'L\'objectif doit être entre 1 et 14');
      return;
    }
    updateWeeklyGoal(goal);
    Alert.alert('Sauvegardé !', `Objectif hebdo: ${goal} séances`);
  }, [weeklyGoalInput, updateWeeklyGoal]);

  // Export JSON - Ouvre le modal
  const handleExportJSON = useCallback(() => {
    setExportModalVisible(true);
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    Alert.alert(
      '⚠️ Réinitialiser toutes les données ?',
      'Cette action est irréversible. Toutes tes séances, repas et mesures seront supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Réinitialiser', 
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Alert.alert('Données réinitialisées', 'Tu peux recommencer à zéro !');
          },
        },
      ]
    );
  }, [resetAllData]);   

  // Recalculer les quêtes et le niveau
  const handleRecalculateQuests = useCallback(() => {
    Alert.alert(
      '🔄 Recalculer le niveau ?',
      'Cette action recalculera ton niveau et tes quêtes basés sur tes entrées actuelles. Cela corrigera les éventuelles incohérences.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Recalculer', 
          onPress: () => {
            const totals = calculateQuestTotals(entries);
            const workoutCount = entries.filter(e => 
              e.type === 'home' || e.type === 'run' || e.type === 'beatsaber'
            ).length;
            recalculateFromScratch({ ...totals, totalWorkouts: workoutCount });
            Alert.alert('Recalculé !', 'Ton niveau et tes quêtes ont été mis à jour.');
          },
        },
      ]
    );
  }, [entries, recalculateFromScratch]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(50)} style={styles.header}>
          <Text style={styles.screenTitle}>Paramètres</Text>
          <View style={styles.headerIcon}>
            <SettingsIcon size={24} color={Colors.cta} />
          </View>
        </Animated.View>

        {/* Stats Hero */}
        <StatsHero 
          sportCount={stats.sport} 
          mealCount={stats.meal} 
          measureCount={stats.measure} 
        />

        {/* OBJECTIFS */}
        <SectionTitle title="Objectifs" delay={150} />
        <GlassCard style={styles.settingsCard}>
          <View style={styles.goalSection}>
            <View style={styles.goalHeader}>
              <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(74, 222, 128, 0.2)' }]}>
                <Target size={20} color="#4ade80" />
              </View>
              <View style={styles.goalInfo}>
                <Text style={styles.settingTitle}>Objectif hebdomadaire</Text>
                <Text style={styles.settingSubtitle}>Nombre de séances par semaine</Text>
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
                <Text style={styles.goalSaveText}>Sauver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        {/* NAVIGATION */}
        <SectionTitle title="Affichage" delay={200} />
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Zap size={20} color="#a78bfa" />}
            iconColor="#a78bfa"
            title="Onglet Générer"
            subtitle="Générateur de séances"
            showChevron={false}
            rightElement={
              <View style={[styles.visibilityBadge, settings.hiddenTabs?.tools && styles.visibilityBadgeHidden]}>
                {settings.hiddenTabs?.tools ? (
                  <EyeOff size={14} color={Colors.error} />
                ) : (
                  <Eye size={14} color="#4ade80" />
                )}
                <Text style={[styles.visibilityText, settings.hiddenTabs?.tools && styles.visibilityTextHidden]}>
                  {settings.hiddenTabs?.tools ? 'Masqué' : 'Visible'}
                </Text>
              </View>
            }
            onPress={() => updateSettings({ 
              hiddenTabs: { 
                ...settings.hiddenTabs, 
                tools: !settings.hiddenTabs?.tools 
              } 
            })}
            delay={220}
          />
          <SettingItem
            icon={<History size={20} color="#60a5fa" />}
            iconColor="#60a5fa"
            title="Onglet Historique"
            subtitle="Journal des séances"
            showChevron={false}
            rightElement={
              <View style={[styles.visibilityBadge, settings.hiddenTabs?.workout && styles.visibilityBadgeHidden]}>
                {settings.hiddenTabs?.workout ? (
                  <EyeOff size={14} color={Colors.error} />
                ) : (
                  <Eye size={14} color="#4ade80" />
                )}
                <Text style={[styles.visibilityText, settings.hiddenTabs?.workout && styles.visibilityTextHidden]}>
                  {settings.hiddenTabs?.workout ? 'Masqué' : 'Visible'}
                </Text>
              </View>
            }
            onPress={() => updateSettings({ 
              hiddenTabs: { 
                ...settings.hiddenTabs, 
                workout: !settings.hiddenTabs?.workout 
              } 
            })}
            delay={240}
          />
        </GlassCard>

        {/* LABS */}
        <SectionTitle title="Labs (Beta)" delay={280} />
        <GlassCard style={[styles.settingsCard, styles.labsCard]}>
          <SettingItem
            icon={<Camera size={20} color="#60a5fa" />}
            iconColor="#60a5fa"
            title="Mode caméra"
            subtitle="Préférer la détection de pose"
            showChevron={false}
            rightElement={
              <Switch
                value={settings.preferCameraDetection ?? false}
                onValueChange={(value) => updateSettings({ preferCameraDetection: value })}
                trackColor={{ false: Colors.card, true: Colors.teal }}
                thumbColor="#fff"
              />
            }
            delay={320}
          />
          <SettingItem
            icon={<Eye size={20} color="#fbbf24" />}
            iconColor="#fbbf24"
            title="Debug caméra"
            subtitle="Afficher les points de tracking"
            showChevron={false}
            rightElement={
              <Switch
                value={settings.debugCamera ?? false}
                onValueChange={(value) => updateSettings({ debugCamera: value })}
                trackColor={{ false: Colors.card, true: Colors.teal }}
                thumbColor="#fff"
              />
            }
            delay={340}
          />
        </GlassCard>

        {/* SOCIAL */}
        {isSocialAvailable() && (
          <>
            <SectionTitle title="Social" delay={360} />
            <GlassCard style={styles.settingsCard}>
              <SettingItem
                icon={<Users size={20} color="#22d3ee" />}
                iconColor="#22d3ee"
                title="Fonctions sociales"
                subtitle={socialEnabled ? 'Classement et amis activés' : 'Mode hors-ligne'}
                showChevron={false}
                rightElement={
                  <Switch
                    value={socialEnabled}
                    onValueChange={setSocialEnabled}
                    trackColor={{ false: Colors.card, true: Colors.teal }}
                    thumbColor="#fff"
                  />
                }
                delay={380}
              />
              {isAuthenticated && (
                <SettingItem
                  icon={<Eye size={20} color="#a78bfa" />}
                  iconColor="#a78bfa"
                  title="Profil public"
                  subtitle="Visible dans le classement global"
                  showChevron={false}
                  rightElement={
                    <View style={styles.visibilityBadge}>
                      <Eye size={14} color="#4ade80" />
                      <Text style={styles.visibilityText}>Public</Text>
                    </View>
                  }
                  delay={400}
                />
              )}
            </GlassCard>
          </>
        )}

        {/* DATA MANAGEMENT */}
        <SectionTitle title="Données" delay={380} />
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Download size={20} color={Colors.cta} />}
            iconColor={Colors.cta}
            title="Exporter JSON"
            subtitle="Sauvegarde tes données"
            onPress={handleExportJSON}
            delay={400}
          />
          <SettingItem
            icon={<RefreshCw size={20} color="#a78bfa" />}
            iconColor="#a78bfa"
            title="Recalculer niveau"
            subtitle="Corriger les incohérences"
            onPress={handleRecalculateQuests}
            delay={420}
          />
        </GlassCard>

        {/* À PROPOS */}
        <SectionTitle title="À propos" delay={460} />
        <GlassCard style={styles.settingsCard}>
          <View style={styles.aboutSection}>
            <View style={styles.appInfo}>
              <View style={styles.appIconContainer}>
                <Sparkles size={28} color={Colors.cta} />
              </View>
              <View>
                <Text style={styles.appName}>FitTrack</Text>
                <Text style={styles.appVersion}>Version 2.0.0</Text>
              </View>
            </View>
            
            <View style={styles.futureFeatures}>
              <View style={styles.futureTitleRow}>
                <Rocket size={16} color={Colors.cta} />
                <Text style={styles.futureTitle}>Prochainement</Text>
              </View>
              <Text style={styles.futureItem}>• Sync cloud & compte</Text>
              <Text style={styles.futureItem}>• Google Fit / Apple Health</Text>
              <Text style={styles.futureItem}>• Notifications intelligentes</Text>
              <Text style={styles.futureItem}>• Traductions en plusieurs langues</Text>
            </View>

            <View style={styles.storageInfo}>
              <Database size={14} color={Colors.muted} />
              <Text style={styles.storageText}>
                Storage: {storageHelpers.getStorageType()}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* DANGER ZONE */}
        <SectionTitle title="Zone de danger" delay={500} />
        <GlassCard style={[styles.settingsCard, styles.dangerCard]}>
          <SettingItem
            icon={<Trash2 size={20} color={Colors.error} />}
            iconColor={Colors.error}
            title="Réinitialiser"
            subtitle="Supprimer toutes les données"
            onPress={handleReset}
            delay={520}
          />
        </GlassCard>

        {/* Spacer pour le bottom nav */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* EXPORT MODAL */}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(215, 150, 134, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats Hero
  statsHero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statsHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  statsHeroTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
  labsCard: {
    borderColor: 'rgba(167, 139, 250, 0.3)',
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

  // Visibility Badge
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
  },
  visibilityBadgeHidden: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  visibilityText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#4ade80',
  },
  visibilityTextHidden: {
    color: Colors.error,
  },

  // Labs divider
  labsDivider: {
    height: 1,
    backgroundColor: Colors.stroke,
    marginHorizontal: Spacing.md,
  },

  // About Section
  aboutSection: {
    padding: Spacing.md,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  appIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(215, 150, 134, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  appVersion: {
    fontSize: FontSize.sm,
    color: Colors.muted,
  },
  futureFeatures: {
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  futureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  futureTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  futureItem: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    marginVertical: 2,
    marginLeft: 24,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Spacing.sm,
  },
  storageText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
});
