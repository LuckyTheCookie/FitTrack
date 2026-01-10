// ============================================================================
// SETTINGS - LABS SUB-SCREEN (Experimental features)
// ============================================================================

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FlaskConical } from 'lucide-react-native';
import { GlassCard } from '../../src/components/ui';
import { useAppStore } from '../../src/stores';
import { Colors, Spacing, FontSize, FontWeight } from '../../src/constants';

export default function LabsScreen() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();

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
          <Text style={styles.screenTitle}>{t('settings.labs')}</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Labs toggle: Enable Tools screen (beta) */}
        <GlassCard style={styles.settingsCard}>
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <View style={styles.settingItem}>
              <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}> 
                <FlaskConical size={20} color="#a78bfa" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('settings.enableToolsScreen')}</Text>
                <Text style={styles.settingSubtitle}>{t('settings.enableToolsScreenDesc')}</Text>
              </View>
              <View>
                <Switch
                  value={!(settings.hiddenTabs?.tools ?? true)}
                  onValueChange={(value) => updateSettings({ hiddenTabs: { ...(settings.hiddenTabs ?? {}), tools: !value } })}
                  trackColor={{ false: Colors.card, true: Colors.teal }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </Animated.View>
        </GlassCard>

        {/* Empty State */}
        <GlassCard style={styles.emptyCard}>
          <View style={styles.emptyContent}>
            <View style={styles.emptyIconContainer}>
              <FlaskConical size={48} color={Colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>
              {t('settings.labsEmpty', { defaultValue: 'Aucune expérimentation' })}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t('settings.labsEmptyDesc', { defaultValue: 'Les nouvelles fonctionnalités expérimentales apparaîtront ici.' })}
            </Text>
          </View>
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

  // Empty Card
  emptyCard: {
    marginTop: Spacing.xl,
  },
  emptyContent: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
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
});
