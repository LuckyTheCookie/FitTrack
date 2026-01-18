// ============================================================================
// SETTINGS MAIN SCREEN - Categories navigation
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Constants from 'expo-constants';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { 
  Settings as SettingsIcon,
  Database,
  ChevronRight,
  Sparkles,
  Bell,
  Palette,
  FlaskConical,
  Shield,
  HardDrive,
  Users,
  Code2,
  Languages,
  Dumbbell,
  Heart,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ui';
import { useAppStore, useSocialStore } from '../../src/stores';
import { isSocialAvailable } from '../../src/services/supabase';
import { storageHelpers } from '../../src/storage';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants';
import { LANGUAGES, getCurrentLanguage, type LanguageCode } from '../../src/i18n';

// ============================================================================
// COMPONENTS
// ============================================================================

// Category Button Component
function CategoryButton({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  delay = 0,
  badge,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  delay?: number;
  badge?: string;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity 
        style={styles.categoryButton}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryIcon, { backgroundColor: `${iconColor}20` }]}>
          {icon}
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{title}</Text>
          {subtitle && <Text style={styles.categorySubtitle}>{subtitle}</Text>}
        </View>
        {badge && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{badge}</Text>
          </View>
        )}
        <ChevronRight size={20} color={Colors.muted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Section Title Component
function SectionTitle({ title, delay = 0 }: { title: string; delay?: number }) {
  return (
    <Animated.View entering={FadeIn.delay(delay)}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </Animated.View>
  );
}

// Stats Hero Component
function StatsHero({ sportCount, mealCount, measureCount, labels }: { 
  sportCount: number; 
  mealCount: number; 
  measureCount: number;
  labels: { title: string; sessions: string; meals: string; measures: string };
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
          <Text style={styles.statsHeroTitle}>{labels.title}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sportCount}</Text>
            <Text style={styles.statLabel}>{labels.sessions}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{mealCount}</Text>
            <Text style={styles.statLabel}>{labels.meals}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{measureCount}</Text>
            <Text style={styles.statLabel}>{labels.measures}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SettingsMainScreen() {
  const { t } = useTranslation();
  const { entries, settings } = useAppStore();
  const { socialEnabled } = useSocialStore();
  
  // State for developer mode easter egg
  const [aboutTapCount, setAboutTapCount] = useState(0);
  
  const currentLanguage = getCurrentLanguage();
  
  // Stats calculées
  const stats = useMemo(() => ({
    sport: entries.filter(e => e.type === 'home' || e.type === 'run' || e.type === 'beatsaber').length,
    meal: entries.filter(e => e.type === 'meal').length,
    measure: entries.filter(e => e.type === 'measure').length,
  }), [entries]);

  // Handle about tap for developer mode
  const handleAboutTap = useCallback(() => {
    const newCount = aboutTapCount + 1;
    setAboutTapCount(newCount);
    
    if (newCount >= 10 && !settings.developerMode) {
      // Enable developer mode
      useAppStore.getState().updateSettings({ developerMode: true });
      Alert.alert('🔓 Mode développeur', 'Tu as débloqué le mode développeur !');
      setAboutTapCount(0);
    }
    
    // Reset count after 3 seconds of inactivity
    setTimeout(() => setAboutTapCount(0), 3000);
  }, [aboutTapCount, settings.developerMode]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(50)} style={styles.header}>
          <Text style={styles.screenTitle}>{t('settings.title')}</Text>
          <View style={styles.headerIcon}>
            <SettingsIcon size={24} color={Colors.cta} />
          </View>
        </Animated.View>

        {/* Stats Hero */}
        <StatsHero 
          sportCount={stats.sport} 
          mealCount={stats.meal} 
          measureCount={stats.measure}
          labels={{
            title: t('settings.yourData'),
            sessions: t('settings.sessions'),
            meals: t('settings.meals'),
            measures: t('settings.measures'),
          }}
        />

        {/* CATÉGORIES PRINCIPALES */}
        <SectionTitle title={t('settings.preferences')} delay={150} />
        <GlassCard style={styles.categoryCard}>
          <CategoryButton
            icon={<Sparkles size={22} color="#fbbf24" />}
            iconColor="#fbbf24"
            title={t('settings.preferences')}
            subtitle={t('settings.preferencesDesc', { defaultValue: 'Objectifs, caméra, unités' })}
            onPress={() => router.push('/settings/preferences')}
            delay={160}
          />
          <View style={styles.divider} />
          <CategoryButton
            icon={<Bell size={22} color="#22d3ee" />}
            iconColor="#22d3ee"
            title={t('settings.notifications')}
            subtitle={t('settings.notificationsDesc', { defaultValue: 'Rappels et alertes' })}
            onPress={() => router.push('/settings/notifications')}
            delay={180}
          />
          <View style={styles.divider} />
          <CategoryButton
            icon={<Palette size={22} color="#a78bfa" />}
            iconColor="#a78bfa"
            title={t('settings.appearance')}
            subtitle={t('settings.appearanceDesc', { defaultValue: 'Thème et interface' })}
            onPress={() => router.push('/settings/appearance')}
            delay={200}
          />
          <View style={styles.divider} />
          <CategoryButton
            icon={<Languages size={22} color="#4ade80" />}
            iconColor="#4ade80"
            title={t('settings.language')}
            subtitle={`${LANGUAGES[currentLanguage].flag} ${LANGUAGES[currentLanguage].nativeName}`}
            onPress={() => router.push('/settings/language')}
            delay={220}
          />
        </GlassCard>

        {/* SPORTS MANAGEMENT */}
        <SectionTitle title={t('settings.sportsManagement', { defaultValue: 'Gestion des sports' })} delay={230} />
        <GlassCard style={styles.categoryCard}>
          <CategoryButton
            icon={<Dumbbell size={22} color="#8B5CF6" />}
            iconColor="#8B5CF6"
            title={t('settings.manageSports', { defaultValue: 'Gérer mes sports' })}
            subtitle={t('settings.manageSportsDesc', { defaultValue: 'Ajouter, masquer ou personnaliser' })}
            onPress={() => router.push('/settings/sports')}
            delay={240}
          />
        </GlassCard>

        {/* INTÉGRATION */}
        <SectionTitle title={t('settings.integration', { defaultValue: 'Intégration' })} delay={245} />
        <GlassCard style={styles.categoryCard}>
          <CategoryButton
            icon={<Heart size={22} color="#f43f5e" />}
            iconColor="#f43f5e"
            title={t('settings.healthConnect')}
            subtitle={t('settings.healthConnectDesc')}
            onPress={() => router.push('/health-connect')}
            delay={250}
          />
        </GlassCard>

        {/* SOCIAL */}
        {isSocialAvailable() && (
          <>
            <SectionTitle title={t('settings.social')} delay={240} />
            <GlassCard style={styles.categoryCard}>
              <CategoryButton
                icon={<Users size={22} color="#22d3ee" />}
                iconColor="#22d3ee"
                title={t('settings.socialFeatures')}
                subtitle={socialEnabled ? t('settings.socialEnabled') : t('settings.socialDisabled')}
                onPress={() => router.push('/settings/social')}
                delay={260}
                badge={socialEnabled ? '✓' : undefined}
              />
            </GlassCard>
          </>
        )}

        {/* DATA & BACKUP */}
        <SectionTitle title={t('settings.data')} delay={280} />
        <GlassCard style={styles.categoryCard}>
          <CategoryButton
            icon={<HardDrive size={22} color={Colors.cta} />}
            iconColor={Colors.cta}
            title={t('settings.data')}
            subtitle={t('settings.dataDesc', { defaultValue: 'Sauvegarde, export, import' })}
            onPress={() => router.push('/settings/data')}
            delay={300}
          />
        </GlassCard>

        {/* LABS */}
        <SectionTitle title={t('settings.labs')} delay={320} />
        <GlassCard style={[styles.categoryCard, styles.labsCard]}>
          <CategoryButton
            icon={<FlaskConical size={22} color="#a78bfa" />}
            iconColor="#a78bfa"
            title={t('settings.labs')}
            subtitle={t('settings.labsDesc', { defaultValue: 'Fonctionnalités expérimentales' })}
            onPress={() => router.push('/settings/labs')}
            delay={340}
          />
        </GlassCard>

        {/* LEGAL */}
        <SectionTitle title={t('settings.legal')} delay={360} />
        <GlassCard style={styles.categoryCard}>
          <CategoryButton
            icon={<Shield size={22} color="#4ade80" />}
            iconColor="#4ade80"
            title={t('settings.legal')}
            subtitle={t('settings.legalDesc', { defaultValue: 'Confidentialité et CGU' })}
            onPress={() => router.push('/settings/legal')}
            delay={380}
          />
        </GlassCard>

        {/* DEVELOPER MODE (if enabled) */}
        {settings.developerMode && (
          <>
            <SectionTitle title="🔧 Développeur" delay={400} />
            <GlassCard style={[styles.categoryCard, styles.devCard]}>
              <CategoryButton
                icon={<Code2 size={22} color="#f97316" />}
                iconColor="#f97316"
                title={t('settings.developerMode', { defaultValue: 'Mode développeur' })}
                subtitle={t('settings.developerModeDesc', { defaultValue: 'Options avancées' })}
                onPress={() => router.push('/settings/developer')}
                delay={420}
              />
            </GlassCard>
          </>
        )}

        {/* ABOUT */}
        <SectionTitle title={t('settings.about')} delay={440} />
        <GlassCard style={styles.categoryCard}>
          <TouchableOpacity 
            style={styles.aboutSection}
            onPress={handleAboutTap}
            activeOpacity={0.8}
          >
            <View style={styles.appInfo}>
              <View style={styles.appIconContainer}>
                <Sparkles size={28} color={Colors.cta} />
              </View>
              <View>
                <Text style={styles.appName}>Spix</Text>
                <Text style={styles.appVersion}>
                  {t('settings.version', { version: Constants.default.expoConfig?.version ?? '3.0.0' })}
                </Text>
              </View>
            </View>
            
            <View style={styles.storageInfo}>
              <Database size={14} color={Colors.muted} />
              <Text style={styles.storageText}>
                {t('settings.storageLabel')} {storageHelpers.getStorageType()}
              </Text>
            </View>
          </TouchableOpacity>
        </GlassCard>

        {/* Spacer pour le bottom nav */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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

  // Category Card
  categoryCard: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  labsCard: {
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  devCard: {
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },

  // Category Button
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  categorySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    fontSize: FontSize.xs,
    color: '#4ade80',
    fontWeight: FontWeight.bold,
  },

  // Divider
  divider: {
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
    marginBottom: Spacing.md,
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
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storageText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },
  tapHint: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
