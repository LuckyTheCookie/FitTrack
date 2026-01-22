// ============================================================================
// PLOPPY SETTINGS SHEET - Bottom sheet for Ploppy AI settings
// ============================================================================

import React, { forwardRef, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, Linking } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useTranslation } from 'react-i18next';
import { Settings, Sparkles, ExternalLink, Trash2, Info, AlertTriangle } from 'lucide-react-native';
import { useAppStore } from '../../stores';
import { 
  isPollinationConnected, 
  startPollinationAuth,  
  removePollinationApiKey,
} from '../../services/pollination';
import { BuildConfig } from '../../config/buildConfig';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';

export interface PloppySettingsSheetRef {
  present: () => void;
  dismiss: () => void;
}

export const PloppySettingsSheet = forwardRef<PloppySettingsSheetRef>((_, ref) => {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const sheetRef = React.useRef<TrueSheet>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      const connected = await isPollinationConnected();
      setIsConnected(connected);
      setIsLoading(false); 
    };
    checkConnection();
  }, []);

  // Toggle Ploppy authorization
  const handleTogglePloppy = useCallback(async (enabled: boolean) => {
    if (enabled) {
      // Check if FOSS build
      if (BuildConfig.isFoss) {
        Alert.alert(
          t('ploppy.fossWarning.title'),
          t('ploppy.fossWarning.message'),
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Check if already connected
      const connected = await isPollinationConnected();
      if (connected) {
        updateSettings({ ploppyEnabled: true });
      } else {
        // Start auth flow
        Alert.alert(
          t('ploppy.connectRequired.title'),
          t('ploppy.connectRequired.message'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { 
              text: t('ploppy.connectRequired.connect'),
              onPress: async () => {
                try {
                  await startPollinationAuth();
                  // Check again after auth
                  setTimeout(async () => {
                    const nowConnected = await isPollinationConnected();
                    if (nowConnected) {
                      setIsConnected(true);
                      updateSettings({ ploppyEnabled: true, pollinationConnected: true });
                    }
                  }, 2000);
                } catch (error) {
                  Alert.alert(t('common.error'), t('settings.pollination.errorMessage'));
                }
              }
            },
          ]
        );
      }
    } else {
      updateSettings({ ploppyEnabled: false });
    }
  }, [t, updateSettings]);

  // Disconnect from Pollination
  const handleDisconnect = useCallback(async () => {
    Alert.alert(
      t('ploppy.disconnect.title'),
      t('ploppy.disconnect.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('ploppy.disconnect.confirm'),
          style: 'destructive',
          onPress: async () => {
            await removePollinationApiKey();
            setIsConnected(false);
            updateSettings({ ploppyEnabled: false, pollinationConnected: false });
          }
        },
      ]
    );
  }, [t, updateSettings]);

  React.useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const ploppyEnabled = settings.ploppyEnabled ?? false;

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
            <Text style={styles.headerEmoji}>🐦</Text>
          </View>
          <Text style={styles.title}>{t('ploppy.settings.title')}</Text>
          <Text style={styles.subtitle}>{t('ploppy.settings.subtitle')}</Text>
        </View>

        {/* Enable/Disable Ploppy */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Sparkles size={20} color={ploppyEnabled ? Colors.cta : Colors.muted} />
            <View style={styles.settingTexts}>
              <Text style={styles.settingTitle}>{t('ploppy.settings.enableTitle')}</Text>
              <Text style={styles.settingDescription}>{t('ploppy.settings.enableDesc')}</Text>
            </View>
          </View>
          <Switch
            value={ploppyEnabled}
            onValueChange={handleTogglePloppy}
            trackColor={{ false: Colors.card, true: Colors.cta }}
            thumbColor="#fff"
            disabled={isLoading}
          />
        </View>

        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : Colors.muted }]} />
            <Text style={styles.statusText}>
              {isConnected ? t('ploppy.settings.connected') : t('ploppy.settings.notConnected')}
            </Text>
          </View>
          {isConnected && (
            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <Trash2 size={14} color="#f87171" />
              <Text style={styles.disconnectText}>{t('ploppy.settings.disconnect')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Info size={16} color={Colors.muted} />
          <Text style={styles.infoText}>{t('ploppy.settings.info')}</Text>
        </View>

        {/* FOSS Warning */}
        {BuildConfig.isFoss && (
          <View style={styles.fossWarning}>
            <AlertTriangle size={16} color="#fbbf24" />
            <Text style={styles.fossWarningText}>{t('ploppy.settings.fossNote')}</Text>
          </View>
        )}

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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(215, 150, 134, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerEmoji: {
    fontSize: 32,
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  settingTexts: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
  settingDescription: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    marginTop: 2,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  disconnectText: {
    fontSize: FontSize.xs,
    color: '#f87171',
    fontWeight: FontWeight.medium,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.muted,
    lineHeight: 18,
  },
  fossWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  fossWarningText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#fbbf24',
    lineHeight: 18,
  },
  doneButton: {
    backgroundColor: Colors.cta,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  doneButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
});
