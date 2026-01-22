// ============================================================================
// SETTINGS - LABS SUB-SCREEN (Experimental features)
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ExpoLinking from 'expo-linking';
import { 
  ArrowLeft, 
  FlaskConical, 
  ChefHat, 
  Sparkles, 
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ScanBarcode,
} from 'lucide-react-native';
import { GlassCard } from '../../src/components/ui';
import { useAppStore } from '../../src/stores';
import { 
  isPollinationConnected, 
  startPollinationAuth,
  extractApiKeyFromUrl,
  savePollinationApiKey,
  removePollinationApiKey,
} from '../../src/services/pollination';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants';

export default function LabsScreen() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const [pollinationStatus, setPollinationStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Check Pollination connection status
  const checkPollinationStatus = useCallback(async () => {
    const connected = await isPollinationConnected();
    setPollinationStatus(connected ? 'connected' : 'disconnected');
    updateSettings({ pollinationConnected: connected });
  }, [updateSettings]);

  useEffect(() => {
    checkPollinationStatus();
  }, [checkPollinationStatus]);

  // Handle deep link callback from Pollination
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log('[Labs] Deep link received:', event.url);
      
      if (event.url.includes('pollination-callback')) {
        const apiKey = extractApiKeyFromUrl(event.url);
        
        if (apiKey) {
          await savePollinationApiKey(apiKey);
          setPollinationStatus('connected');
          updateSettings({ pollinationConnected: true });
          
          Alert.alert(
            t('settings.pollination.successTitle'),
            t('settings.pollination.successMessage')
          );
        } else {
          Alert.alert(
            t('common.error'),
            t('settings.pollination.errorMessage')
          );
        }
      }
    };

    // Get initial URL if app was opened via deep link
    ExpoLinking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Listen for deep links while app is running
    const subscription = ExpoLinking.addEventListener('url', handleDeepLink);
    
    return () => {
      subscription.remove();
    };
  }, [t, updateSettings]);

  // Connect to Pollination
  const handleConnectPollination = useCallback(() => {
    Alert.alert(
      t('settings.pollination.warningTitle'),
      t('settings.pollination.warningMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.pollination.continue'), 
          onPress: async () => {
            try {
              await startPollinationAuth();
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.pollination.errorMessage'));
            }
          }
        },
      ]
    );
  }, [t]);

  // Disconnect from Pollination
  const handleDisconnectPollination = useCallback(() => {
    Alert.alert(
      t('settings.pollination.disconnectTitle'),
      t('settings.pollination.disconnectMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.pollination.disconnect'),
          style: 'destructive',
          onPress: async () => {
            await removePollinationApiKey();
            setPollinationStatus('disconnected');
            updateSettings({ pollinationConnected: false });
          }
        },
      ]
    );
  }, [t, updateSettings]);

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

        {/* Pollination AI Section */}
        <Text style={styles.sectionTitle}>{t('settings.pollination.sectionTitle')}</Text>
        
        <GlassCard style={styles.settingsCard}>
          <Animated.View entering={FadeInDown.delay(120).springify()}>
            {/* Connection Status */}
            <View style={styles.settingItem}>
              <View style={[
                styles.settingIconContainer, 
                { backgroundColor: pollinationStatus === 'connected' 
                  ? 'rgba(34, 197, 94, 0.15)' 
                  : 'rgba(139, 92, 246, 0.15)' 
                }
              ]}> 
                <Sparkles 
                  size={20} 
                  color={pollinationStatus === 'connected' ? '#22c55e' : '#8B5CF6'} 
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('settings.pollination.title')}</Text>
                <View style={styles.statusRow}>
                  {pollinationStatus === 'connected' ? (
                    <>
                      <CheckCircle size={14} color="#22c55e" />
                      <Text style={[styles.statusText, { color: '#22c55e' }]}>
                        {t('settings.pollination.connected')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} color={Colors.muted} />
                      <Text style={styles.statusText}>
                        {t('settings.pollination.notConnected')}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.connectButton,
                  pollinationStatus === 'connected' && styles.disconnectButton
                ]}
                onPress={pollinationStatus === 'connected' 
                  ? handleDisconnectPollination 
                  : handleConnectPollination
                }
              >
                {pollinationStatus === 'connected' ? (
                  <Text style={styles.disconnectButtonText}>
                    {t('settings.pollination.disconnect')}
                  </Text>
                ) : (
                  <>
                    <ExternalLink size={14} color="#fff" />
                    <Text style={styles.connectButtonText}>
                      {t('settings.pollination.connect')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Beta Warning */}
            <View style={styles.warningBox}>
              <AlertTriangle size={16} color="#fbbf24" />
              <Text style={styles.warningText}>
                {t('settings.pollination.betaWarning')}
              </Text>
            </View>
          </Animated.View>
        </GlassCard>

        {/* OpenFoodFacts Integration */}
        <Text style={styles.sectionTitle}>{t('settings.openFoodFacts.sectionTitle')}</Text>
        
        <GlassCard style={styles.settingsCard}>
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <View style={styles.settingItem}>
              <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}> 
                <ScanBarcode size={20} color="#22c55e" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{t('settings.openFoodFacts.title')}</Text>
                <Text style={styles.settingSubtitle}>{t('settings.openFoodFacts.description')}</Text>
              </View>
              <View>
                <Switch
                  value={settings.openFoodFactsEnabled ?? false}
                  onValueChange={(value) => updateSettings({ openFoodFactsEnabled: value })}
                  trackColor={{ false: Colors.card, true: Colors.teal }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {settings.openFoodFactsEnabled && (
              <View style={styles.featureInfo}>
                <Text style={styles.featureInfoText}>
                  {t('settings.openFoodFacts.enabledInfo')}
                </Text>
              </View>
            )}
            
            {/* OpenFoodFacts Attribution */}
            <View style={styles.attributionBox}>
              <Text style={styles.attributionText}>
                {t('settings.openFoodFacts.attribution')}
              </Text>
            </View>
          </Animated.View>
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

  // Section Title
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
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

  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
  },

  // Connect Button
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  connectButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  disconnectButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  disconnectButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#ef4444',
  },

  // Warning Box
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  warningText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#fbbf24',
    lineHeight: 18,
  },

  // Feature Info
  featureInfo: {
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  featureInfoText: {
    fontSize: FontSize.xs,
    color: Colors.teal,
    lineHeight: 18,
  },
  
  // Attribution Box
  attributionBox: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  attributionText: {
    fontSize: FontSize.xs,
    color: Colors.muted,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
