// ============================================================================
// SETTINGS - SOCIAL SUB-SCREEN
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
  Users,
  Globe,
  Eye,
  UserX,
  ChevronRight,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ui';
import { useSocialStore } from '../../src/stores';
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
        {showChevron && onPress && (
          <ChevronRight size={18} color={Colors.muted} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SocialSettingsScreen() {
  const { t } = useTranslation();
  const { 
    socialEnabled, 
    setSocialEnabled, 
    isAuthenticated,
    profile,
    disableSocialAndDeleteData,
    updateLeaderboardVisibility,
  } = useSocialStore();

  const [isDisablingSocial, setIsDisablingSocial] = useState(false);

  // Handle disable social
  const handleDisableSocial = useCallback(() => {
    if (!isAuthenticated) {
      setSocialEnabled(false);
      return;
    }

    Alert.alert(
      t('settings.disableSocialConfirm.title'),
      t('settings.disableSocialConfirm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.disable'), 
          style: 'destructive',
          onPress: async () => {
            setIsDisablingSocial(true);
            try {
              await disableSocialAndDeleteData();
              Alert.alert(
                t('common.success'),
                t('settings.disableSocialSuccess')
              );
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.deleteDataError'));
            } finally {
              setIsDisablingSocial(false);
            }
          },
        },
      ]
    );
  }, [isAuthenticated, disableSocialAndDeleteData, setSocialEnabled, t]);

  // Handle toggle leaderboard visibility
  const handleToggleLeaderboardVisibility = useCallback(async () => {
    const newValue = !(profile?.is_public ?? true);
    try {
      await updateLeaderboardVisibility(newValue);
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.visibilityError'));
    }
  }, [profile, updateLeaderboardVisibility, t]);

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
          <Text style={styles.screenTitle}>{t('settings.social')}</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Social Features Toggle */}
        <GlassCard style={styles.settingsCard}>
          <SettingItem
            icon={<Users size={20} color="#22d3ee" />}
            iconColor="#22d3ee"
            title={t('settings.socialFeatures')}
            subtitle={socialEnabled ? t('settings.socialEnabled') : t('settings.socialDisabled')}
            rightElement={
              socialEnabled && isAuthenticated ? (
                <TouchableOpacity 
                  style={styles.disableButton}
                  onPress={handleDisableSocial}
                  disabled={isDisablingSocial}
                >
                  <UserX size={14} color={Colors.error} />
                  <Text style={styles.disableButtonText}>
                    {isDisablingSocial ? '...' : t('settings.disable')}
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
            delay={100}
          />
        </GlassCard>

        {/* Additional options (only if authenticated) */}
        {isAuthenticated && socialEnabled && (
          <GlassCard style={styles.settingsCard}>
            {/* Leaderboard Visibility */}
            <SettingItem
              icon={<Globe size={20} color="#a78bfa" />}
              iconColor="#a78bfa"
              title={t('settings.leaderboardVisibility')}
              subtitle={profile?.is_public !== false ? t('settings.leaderboardPublic') : t('settings.leaderboardHidden')}
              rightElement={
                <Switch
                  value={profile?.is_public !== false}
                  onValueChange={handleToggleLeaderboardVisibility}
                  trackColor={{ false: Colors.card, true: Colors.teal }}
                  thumbColor="#fff"
                />
              }
              delay={150}
            />
            
            {/* View Profile */}
            <SettingItem
              icon={<Eye size={20} color="#4ade80" />}
              iconColor="#4ade80"
              title={t('settings.myPublicProfile')}
              subtitle={`@${profile?.username || t('profile.notLoggedIn')}`}
              onPress={() => router.push('/social')}
              showChevron
              delay={200}
            />
          </GlassCard>
        )}

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

  // Disable Button
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
});
