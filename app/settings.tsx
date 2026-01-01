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
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
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
  Shield,
  FileText,
  Globe,
  UserX,
  Heart,
  Upload,
  Save,
} from 'lucide-react-native';
import { 
  GlassCard, 
  InputField,
  ExportModal,
} from '../src/components/ui';
import { useAppStore, useGamificationStore, useSocialStore } from '../src/stores';
import { isSocialAvailable } from '../src/services/supabase';
import { calculateQuestTotals } from '../src/utils/questCalculator';
import { generateFullBackup, exportFullBackup, parseBackup } from '../src/utils/export';
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
    unlockedBadges,
    restoreFromBackup: restoreAppFromBackup,
  } = useAppStore();

  const gamificationState = useGamificationStore();
  const { 
    recalculateFromScratch,
    restoreFromBackup: restoreGamificationFromBackup,
  } = gamificationState;
  const { 
    socialEnabled, 
    setSocialEnabled, 
    isAuthenticated,
    profile,
    disableSocialAndDeleteData,
    updateLeaderboardVisibility,
  } = useSocialStore();

  const [weeklyGoalInput, setWeeklyGoalInput] = useState(settings.weeklyGoal.toString());
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isDisablingSocial, setIsDisablingSocial] = useState(false);
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

  // Sauvegarde complète
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
          dialogTitle: 'Sauvegarder FitTrack',
        });
      } else {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('Backup error:', error);
      Alert.alert('Erreur', 'Impossible de créer la sauvegarde');
    }
  }, [entries, settings, unlockedBadges, gamificationState]);

  // Restauration depuis fichier
  const handleRestore = useCallback(async () => {
    Alert.alert(
      '⚠️ Restaurer une sauvegarde ?',
      'Cette action remplacera TOUTES tes données actuelles par celles de la sauvegarde. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Choisir un fichier',
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
                Alert.alert('Erreur', 'Le fichier de sauvegarde est invalide ou corrompu');
                return;
              }
              
              // Restore app state with proper defaults
              restoreAppFromBackup({
                entries: backup.app.entries,
                settings: {
                  weeklyGoal: backup.app.settings.weeklyGoal,
                  hiddenTabs: {
                    workout: backup.app.settings.hiddenTabs?.workout ?? false,
                    tools: backup.app.settings.hiddenTabs?.tools ?? false,
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
                '✅ Restauration réussie',
                `${backup.app.entries.length} entrées restaurées.\nNiveau ${backup.gamification.level} avec ${backup.gamification.xp} XP.`
              );
            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert('Erreur', 'Impossible de restaurer la sauvegarde');
            }
          },
        },
      ]
    );
  }, [restoreAppFromBackup, restoreGamificationFromBackup]);

  // Handler pour désactiver les fonctionnalités sociales avec suppression RGPD
  const handleDisableSocial = useCallback(() => {
    if (!isAuthenticated) {
      setSocialEnabled(false);
      return;
    }

    Alert.alert(
      '⚠️ Désactiver les fonctionnalités sociales ?',
      'Cette action supprimera définitivement vos données en ligne (profil, classement, XP, amis, encouragements) pour respecter le RGPD.\n\nVos données locales (séances, repas, mesures) seront conservées.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Désactiver et supprimer', 
          style: 'destructive',
          onPress: async () => {
            setIsDisablingSocial(true);
            try {
              await disableSocialAndDeleteData();
              Alert.alert(
                '✅ Données supprimées',
                'Tes données en ligne ont été supprimées. Mode local activé.'
              );
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer les données. Réessaie plus tard.');
            } finally {
              setIsDisablingSocial(false);
            }
          },
        },
      ]
    );
  }, [isAuthenticated, disableSocialAndDeleteData, setSocialEnabled]);

  // Handler pour toggle leaderboard visibility
  const handleToggleLeaderboardVisibility = useCallback(async () => {
    const newValue = !(profile?.is_public ?? true);
    try {
      await updateLeaderboardVisibility(newValue);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier la visibilité.');
    }
  }, [profile, updateLeaderboardVisibility]);

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
              {/* Toggle fonctionnalités sociales */}
              <SettingItem
                icon={<Users size={20} color="#22d3ee" />}
                iconColor="#22d3ee"
                title="Fonctionnalités sociales"
                subtitle={socialEnabled ? 'Classement et amis activés' : 'Mode hors-ligne'}
                showChevron={false}
                rightElement={
                  socialEnabled && isAuthenticated ? (
                    <TouchableOpacity 
                      style={styles.disableButton}
                      onPress={handleDisableSocial}
                      disabled={isDisablingSocial}
                    >
                      <UserX size={14} color={Colors.error} />
                      <Text style={styles.disableButtonText}>
                        {isDisablingSocial ? '...' : 'Désactiver'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Switch
                      value={socialEnabled}
                      onValueChange={(value) => {
                        if (value) {
                          setSocialEnabled(true);
                        } else {
                          handleDisableSocial();
                        }
                      }}
                      trackColor={{ false: Colors.card, true: Colors.teal }}
                      thumbColor="#fff"
                    />
                  )
                }
                delay={380}
              />
              
              {/* Toggle classement global (si authentifié) */}
              {isAuthenticated && socialEnabled && (
                <SettingItem
                  icon={<Globe size={20} color="#a78bfa" />}
                  iconColor="#a78bfa"
                  title="Apparaître dans le classement"
                  subtitle={profile?.is_public !== false ? 'Visible publiquement' : 'Masqué du classement global'}
                  showChevron={false}
                  rightElement={
                    <Switch
                      value={profile?.is_public !== false}
                      onValueChange={handleToggleLeaderboardVisibility}
                      trackColor={{ false: Colors.card, true: Colors.teal }}
                      thumbColor="#fff"
                    />
                  }
                  delay={400}
                />
              )}
              
              {/* Lien vers profil */}
              {isAuthenticated && socialEnabled && (
                <SettingItem
                  icon={<Eye size={20} color="#4ade80" />}
                  iconColor="#4ade80"
                  title="Mon profil public"
                  subtitle={`@${profile?.username || 'utilisateur'}`}
                  onPress={() => router.push('/social')}
                  delay={420}
                />
              )}
            </GlassCard>
          </>
        )}

        {/* LÉGAL */}
        <SectionTitle title="Légal" delay={440} />
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Shield size={20} color="#4ade80" />}
            iconColor="#4ade80"
            title="Politique de confidentialité"
            subtitle="RGPD et protection des données"
            onPress={() => router.push('/privacy-policy')}
            delay={460}
          />
          <SettingItem
            icon={<FileText size={20} color="#60a5fa" />}
            iconColor="#60a5fa"
            title="Conditions d'utilisation"
            subtitle="Règles d'usage de l'application"
            onPress={() => router.push('/terms-of-service')}
            delay={480}
          />
        </GlassCard>

        {/* DATA MANAGEMENT */}
        <SectionTitle title="Données" delay={500} />
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Save size={20} color="#22d3ee" />}
            iconColor="#22d3ee"
            title="Sauvegarde complète"
            subtitle="Exporter toutes les données + XP"
            onPress={handleFullBackup}
            delay={395}
          />
          <SettingItem
            icon={<Upload size={20} color="#fbbf24" />}
            iconColor="#fbbf24"
            title="Restaurer sauvegarde"
            subtitle="Importer depuis un fichier"
            onPress={handleRestore}
            delay={398}
          />
          <SettingItem
            icon={<Download size={20} color={Colors.cta} />}
            iconColor={Colors.cta}
            title="Exporter JSON"
            subtitle="Export hebdo (historique)"
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
          <SettingItem
            icon={<Heart size={20} color="#f43f5e" />}
            iconColor="#f43f5e"
            title="Health Connect"
            subtitle="Importer depuis Health Connect (Android)"
            onPress={() => router.push('/health-connect')}
            delay={440}
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
                <Text style={styles.appVersion}>Version 3.0.0</Text>
              </View>
            </View>
            
            <View style={styles.futureFeatures}>
              <View style={styles.futureTitleRow}>
                <Rocket size={16} color={Colors.cta} />
                <Text style={styles.futureTitle}>Prochainement</Text>
              </View>
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

  // Disable Social Button
  disableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  disableButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
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
