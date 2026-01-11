// ============================================================================
// HEALTH CONNECT SETTINGS SHEET - Bottom sheet for sync settings
// ============================================================================

import React, { forwardRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useTranslation } from 'react-i18next';
import { Settings, Bell, Zap, Hand, ExternalLink } from 'lucide-react-native';
import { useAppStore } from '../../stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';
import type { HealthConnectSyncMode } from '../../types';

interface OptionItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

const OptionItem = ({ icon, title, description, selected, onPress }: OptionItemProps) => (
  <TouchableOpacity
    style={[styles.optionItem, selected && styles.optionItemSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
      {selected && <View style={styles.radioInner} />}
    </View>
    <View style={styles.iconContainer}>
      {icon}
    </View>
    <View style={styles.optionContent}>
      <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
        {title}
      </Text>
      <Text style={styles.optionDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);

export interface HealthConnectSettingsSheetRef {
  present: () => void;
  dismiss: () => void;
}

export const HealthConnectSettingsSheet = forwardRef<HealthConnectSettingsSheetRef>((_, ref) => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const sheetRef = React.useRef<TrueSheet>(null);

  const currentMode = settings.healthConnectSyncMode || 'manual';

  const handleModeChange = useCallback((mode: HealthConnectSyncMode) => {
    updateSettings({ healthConnectSyncMode: mode });
  }, [updateSettings]);

  const openNativeSettings = useCallback(async () => {
    try {
      // Open Health Connect app settings
      await Linking.openURL('content://com.google.android.apps.healthdata');
    } catch (error) {
      // Fallback: try to open the app directly
      try {
        await Linking.openURL('package:com.google.android.apps.healthdata');
      } catch {
        // Last fallback: open app settings
        Linking.openSettings();
      }
    }
  }, []);

  React.useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const options: Array<{
    mode: HealthConnectSyncMode;
    icon: React.ReactNode;
    titleKey: string;
    descKey: string;
  }> = [
    {
      mode: 'manual',
      icon: <Hand size={20} color={currentMode === 'manual' ? Colors.cta : Colors.muted} />,
      titleKey: 'healthConnect.settings.manualTitle',
      descKey: 'healthConnect.settings.manualDesc',
    },
    {
      mode: 'notify',
      icon: <Bell size={20} color={currentMode === 'notify' ? Colors.cta : Colors.muted} />,
      titleKey: 'healthConnect.settings.notifyTitle',
      descKey: 'healthConnect.settings.notifyDesc',
    },
    {
      mode: 'auto',
      icon: <Zap size={20} color={currentMode === 'auto' ? Colors.cta : Colors.muted} />,
      titleKey: 'healthConnect.settings.autoTitle',
      descKey: 'healthConnect.settings.autoDesc',
    },
  ];

  return (
    <TrueSheet
      ref={sheetRef}
      detents={['auto']}
      cornerRadius={24}
      backgroundColor={Colors.cardSolid}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Settings size={24} color={Colors.cta} />
          </View>
          <Text style={styles.title}>{t('healthConnect.settings.title')}</Text>
          <Text style={styles.subtitle}>{t('healthConnect.settings.subtitle')}</Text>
        </View>

        <View style={styles.optionsList}>
          {options.map((option) => (
            <OptionItem
              key={option.mode}
              icon={option.icon}
              title={t(option.titleKey)}
              description={t(option.descKey)}
              selected={currentMode === option.mode}
              onPress={() => handleModeChange(option.mode)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nativeSettingsButton}
          onPress={openNativeSettings}
        >
          <ExternalLink size={18} color={Colors.cta} />
          <Text style={styles.nativeSettingsText}>{t('healthConnect.settings.nativeSettings')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => sheetRef.current?.dismiss()}
        >
          <Text style={styles.doneButtonText}>{t('common.close')}</Text>
        </TouchableOpacity>
      </View>
    </TrueSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.cta}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    textAlign: 'center',
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.stroke,
    gap: Spacing.sm,
  },
  optionItemSelected: {
    backgroundColor: `${Colors.cta}15`,
    borderColor: `${Colors.cta}40`,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioOuterSelected: {
    borderColor: Colors.cta,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.cta,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: Colors.cta,
  },
  optionDescription: {
    fontSize: FontSize.sm,
    color: Colors.muted,
    lineHeight: 18,
  },
  doneButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  doneButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.muted,
  },
  nativeSettingsButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: `${Colors.cta}15`,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: `${Colors.cta}30`,
  },
  nativeSettingsText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.cta,
  },
});
