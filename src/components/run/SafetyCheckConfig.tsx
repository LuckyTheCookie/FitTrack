import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Linking from 'expo-linking';
import { Shield, Clock3, Settings, MessageCircleMore, MessageSquareText, AlertTriangle, ShieldCheck } from 'lucide-react-native';

// On garde tes imports d'origine pour GlassCard et les utilitaires
import { GlassCard } from '../ui';
import type { SafetyContact } from '../../types';
import { SAFETY_AUTO_ALERT_OPTIONS, SAFETY_INTERVAL_OPTIONS, WHATSAPP_CAPABILITY_TEST_URL } from '../../constants/safety';
import { formatSafetyDelay, formatSafetyInterval } from '../../utils/safety';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#070709',
  surface: '#0e0f14',
  surfaceUp: '#13151e',
  surfaceHigh: '#1a1d28',
  border: 'rgba(255,255,255,0.07)',
  borderUp: 'rgba(255,255,255,0.12)',
  text: '#f0ece4',
  textSub: 'rgba(240,236,228,0.55)',
  textMuted: 'rgba(240,236,228,0.28)',
  // Primary accent — warm coral-ember
  ember: '#ff5533',
  emberMid: '#ff7a55',
  emberGlow: 'rgba(255,85,51,0.15)',
  emberBorder: 'rgba(255,85,51,0.25)',
  // Secondary
  gold: '#e8b84b',
  goldSoft: 'rgba(232,184,75,0.10)',
  goldBorder: 'rgba(232,184,75,0.22)',
  amber: '#f5a623',
  // Semantic
  blue: '#5599ff',
  blueSoft: 'rgba(85,153,255,0.10)',
  blueBorder: 'rgba(85,153,255,0.22)',
  teal: '#2dd4bf',
  tealSoft: 'rgba(45,212,191,0.10)',
  tealBorder: 'rgba(45,212,191,0.22)',
  green: '#34d370',
  greenSoft: 'rgba(52,211,112,0.10)',
  greenBorder: 'rgba(52,211,112,0.22)',
  violet: '#a78bfa',
  error: '#f87171',
};

const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 44 };
const R = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 22, xxxl: 32, full: 999 };
const T = { nano: 9, micro: 10, xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 34, display: 48 };
const W = { light: '300', reg: '400', med: '500', semi: '600', bold: '700', xbold: '800', black: '900' } as const;
// ──────────────────────────────────────────────────────────────────────────────

interface SafetyCheckConfigProps {
  visible: boolean;
  contacts: SafetyContact[];
  initialEnabled: boolean;
  defaultIntervalMinutes: number;
  defaultAutoAlertDelaySeconds: number;
  defaultFallDetectionEnabled: boolean;
  onClose: () => void;
  onGoToSettings: () => void;
  onActivate: (config: {
    intervalMinutes: number;
    autoAlertDelaySeconds: number;
    enabled: boolean;
    fallDetectionEnabled: boolean;
  }) => void;
}

// Palette révisée pour s'accorder avec le dark mode premium
function getAvatarColor(name: string): string {
  const palette = [C.blue, C.teal, C.gold, C.violet, C.emberMid, C.green];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function SafetyCheckConfig({
  visible,
  contacts,
  defaultIntervalMinutes,
  defaultAutoAlertDelaySeconds,
  defaultFallDetectionEnabled,
  onClose,
  onGoToSettings,
  onActivate,
}: SafetyCheckConfigProps) {
  const { t } = useTranslation();
  const [intervalMinutes, setIntervalMinutes] = useState(defaultIntervalMinutes);
  const [customIntervalText, setCustomIntervalText] = useState('');
  const [isCustomInterval, setIsCustomInterval] = useState(false);
  const [customIntervalError, setCustomIntervalError] = useState<string | null>(null);
  const [autoAlertDelaySeconds, setAutoAlertDelaySeconds] = useState(defaultAutoAlertDelaySeconds);
  const [fallDetectionEnabled, setFallDetectionEnabled] = useState(defaultFallDetectionEnabled);
  const [whatsAppAvailable, setWhatsAppAvailable] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if ((SAFETY_INTERVAL_OPTIONS as readonly number[]).includes(defaultIntervalMinutes)) {
      setIsCustomInterval(false);
      setIntervalMinutes(defaultIntervalMinutes);
      setCustomIntervalText('');
      setCustomIntervalError(null);
    } else {
      setIsCustomInterval(true);
      setIntervalMinutes(defaultIntervalMinutes);
      setCustomIntervalText(defaultIntervalMinutes.toString());
      setCustomIntervalError(null);
    }
    setAutoAlertDelaySeconds(defaultAutoAlertDelaySeconds);
    setFallDetectionEnabled(defaultFallDetectionEnabled);
  }, [defaultAutoAlertDelaySeconds, defaultFallDetectionEnabled, defaultIntervalMinutes, visible]);

  useEffect(() => {
    let cancelled = false;
    if (!visible) return;

    const checkWhatsApp = async () => {
      const canUseWhatsApp = await Linking.canOpenURL(WHATSAPP_CAPABILITY_TEST_URL);
      if (!cancelled) {
        setWhatsAppAvailable(canUseWhatsApp);
      }
    };

    checkWhatsApp();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const visibleContacts = useMemo(() => contacts.slice(0, 3), [contacts]);
  const hiddenContactsCount = Math.max(0, contacts.length - visibleContacts.length);
  const canActivate = contacts.length > 0;

  const handleActivate = () => {
    if (!canActivate) return;
    if (isCustomInterval) {
      const parsed = Number(customIntervalText);
      if (!customIntervalText || Number.isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        setCustomIntervalError(t('safety.config.customError'));
        return;
      }
      setIntervalMinutes(parsed);
    }

    onActivate({
      enabled: true,
      intervalMinutes: isCustomInterval ? Number(customIntervalText) : intervalMinutes,
      autoAlertDelaySeconds,
      fallDetectionEnabled,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <GlassCard style={styles.card} variant="solid">
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <View style={styles.iconGlow}>
                <ShieldCheck size={38} color={C.blue} strokeWidth={1.5} />
              </View>
            </View>
            <Text style={styles.title}>{t('safety.config.title')}</Text>
            <Text style={styles.subtitle}>{t('safety.config.subtitle')}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* Interval Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionOverline}>{t('safety.config.intervalCaps')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {SAFETY_INTERVAL_OPTIONS.map((value) => {
                const isActive = !isCustomInterval && intervalMinutes === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => {
                      setIsCustomInterval(false);
                      setIntervalMinutes(value);
                      setCustomIntervalText('');
                      setCustomIntervalError(null);
                    }}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {formatSafetyInterval(value, t('common.minShort'), t('common.hour'))}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                key="custom"
                style={[styles.chip, isCustomInterval && styles.chipActive]}
                onPress={() => {
                  setIsCustomInterval(true);
                  setCustomIntervalText(isCustomInterval ? customIntervalText : intervalMinutes.toString());
                  setCustomIntervalError(null);
                }}
              >
                <Text style={[styles.chipText, isCustomInterval && styles.chipTextActive]}>
                  {t('safety.config.custom')}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {isCustomInterval && (
              <View style={styles.customIntervalInputRow}>
                <TextInput
                  style={[styles.input, customIntervalError && styles.inputError]}
                  placeholder={t('safety.config.customPlaceholder')}
                  placeholderTextColor={C.textMuted}
                  keyboardType="numeric"
                  value={customIntervalText}
                  onChangeText={(value) => {
                    const parsed = Number(value);
                    setCustomIntervalText(value);
                    if (!value || Number.isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
                      setCustomIntervalError(t('safety.config.customError'));
                      return;
                    }
                    setCustomIntervalError(null);
                    setIntervalMinutes(parsed);
                  }}
                  onBlur={() => {
                    const parsed = Number(customIntervalText);
                    if (customIntervalText && !Number.isNaN(parsed) && parsed > 0 && Number.isInteger(parsed)) {
                      setIntervalMinutes(parsed);
                    }
                  }}
                  returnKeyType="done"
                />
                {customIntervalError ? (
                  <Text style={styles.errorText}>{customIntervalError}</Text>
                ) : (
                  <Text style={styles.customHintText}>{t('safety.config.customHint')}</Text>
                )}
              </View>
            )}

            {/* Delay Section */}
            <View style={styles.sectionHeader}>
              <Clock3 size={14} color={C.textMuted} />
              <Text style={styles.sectionOverline}>{t('safety.config.autoAlertCaps')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {SAFETY_AUTO_ALERT_OPTIONS.map((value) => {
                const isActive = autoAlertDelaySeconds === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setAutoAlertDelaySeconds(value)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {formatSafetyDelay(value, t('common.minShort'))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Contacts Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionOverline}>{t('safety.config.contactsCaps')}</Text>
            </View>
            
            {contacts.length === 0 ? (
              <View style={styles.warningCard}>
                <AlertTriangle size={20} color={C.amber} />
                <View style={styles.warningTextContainer}>
                  <Text style={styles.warningText}>{t('safety.config.noContacts')}</Text>
                  <TouchableOpacity style={styles.settingsButton} onPress={onGoToSettings}>
                    <Settings size={14} color={C.bg} />
                    <Text style={styles.settingsButtonText}>{t('safety.config.addContacts')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.contactsList}>
                {visibleContacts.map((contact) => {
                  const reachable = contact.method === 'sms' || whatsAppAvailable;
                  const methodIsWhatsApp = contact.method === 'whatsapp';
                  return (
                    <View key={contact.id} style={styles.contactCard}>
                      <View style={[styles.avatar, { backgroundColor: getAvatarColor(contact.name) }]}>
                        <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
                      </View>

                      <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactPhone}>{contact.phone}</Text>
                      </View>

                      <View style={styles.contactMeta}>
                        <View style={[styles.methodBadge, methodIsWhatsApp ? styles.whatsAppBadge : styles.smsBadge]}>
                          {methodIsWhatsApp ? (
                            <MessageCircleMore size={12} color={C.green} />
                          ) : (
                            <MessageSquareText size={12} color={C.blue} />
                          )}
                          <Text style={[styles.methodBadgeText, methodIsWhatsApp ? styles.whatsAppBadgeText : styles.smsBadgeText]}>
                            {methodIsWhatsApp ? t('settings.safety.methodWhatsApp') : t('settings.safety.methodSMS')}
                          </Text>
                        </View>
                        <View style={styles.reachableRow}>
                          <View style={[styles.reachableDot, reachable ? styles.reachableDotOn : styles.reachableDotOff]} />
                          <Text style={styles.reachableText}>
                            {reachable ? t('safety.config.reachable') : t('safety.config.unreachable')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {hiddenContactsCount > 0 && (
                  <Text style={styles.moreContactsText}>{t('safety.config.moreContacts', { count: hiddenContactsCount })}</Text>
                )}
              </View>
            )}

            {/* Fall Detection Section */}
            <View style={styles.fallCard}>
              <View style={styles.fallIconWrap}>
                <AlertTriangle size={20} color={C.gold} />
              </View>
              <View style={styles.fallTextWrap}>
                <Text style={styles.fallTitle}>{t('settings.safety.fallDetection')}</Text>
                <Text style={styles.fallDescription}>{t('settings.safety.fallDetectionDesc')}</Text>
              </View>
              <Switch
                value={fallDetectionEnabled}
                onValueChange={setFallDetectionEnabled}
                trackColor={{ true: C.green, false: C.surfaceHigh }}
                thumbColor={C.text}
                ios_backgroundColor={C.surfaceHigh}
              />
            </View>

          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {!canActivate && (
              <Text style={styles.tooltip}>{t('safety.config.activateTooltip')}</Text>
            )}
            <TouchableOpacity 
              style={[styles.activateButton, !canActivate && styles.activateButtonDisabled]} 
              onPress={handleActivate} 
              disabled={!canActivate}
              activeOpacity={0.8}
            >
              <Shield size={20} color={C.text} strokeWidth={2.5} />
              <Text style={styles.activateText}>{t('safety.config.activate')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>

        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end', // Aligné vers le bas pour un effet "BottomSheet" moderne, ou center selon ta pref
    paddingHorizontal: S.lg,
    paddingBottom: S.xxl,
  },
  card: {
    maxHeight: '90%',
    backgroundColor: C.surface,
    borderRadius: R.xxxl,
    borderWidth: 1,
    borderColor: C.borderUp,
    padding: S.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  scrollContent: {
    paddingBottom: S.xl,
    gap: S.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: S.xl,
    marginTop: S.sm,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: R.full,
    backgroundColor: C.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S.lg,
    borderWidth: 1,
    borderColor: C.blueBorder,
  },
  iconGlow: {
    width: 56,
    height: 56,
    borderRadius: R.full,
    backgroundColor: 'rgba(85,153,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: C.text,
    fontSize: T.xxl,
    fontWeight: W.bold,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: C.textSub,
    fontSize: T.md,
    textAlign: 'center',
    marginTop: S.xs,
    lineHeight: 22,
    paddingHorizontal: S.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    marginBottom: -S.sm, // Rapproche le titre des chips
  },
  sectionOverline: {
    color: C.textMuted,
    fontSize: T.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: W.bold,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: S.sm,
    paddingVertical: S.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: C.borderUp,
    borderRadius: R.full,
    paddingHorizontal: S.xl,
    paddingVertical: S.md,
    backgroundColor: C.surfaceUp,
  },
  chipActive: {
    backgroundColor: C.blue,
    borderColor: C.blue,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  chipText: {
    color: C.textSub,
    fontSize: T.sm,
    fontWeight: W.semi,
  },
  chipTextActive: {
    color: C.text,
    fontWeight: W.bold,
  },
  customIntervalInputRow: {
    gap: S.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: C.borderUp,
    borderRadius: R.lg,
    color: C.text,
    fontSize: T.md,
    padding: S.lg,
    backgroundColor: C.surfaceUp,
  },
  inputError: {
    borderColor: C.error,
    backgroundColor: 'rgba(248,113,113,0.05)',
  },
  customHintText: {
    color: C.textMuted,
    fontSize: T.xs,
    marginLeft: S.xs,
  },
  errorText: {
    color: C.error,
    fontSize: T.xs,
    marginLeft: S.xs,
  },
  contactsList: {
    gap: S.sm,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.borderUp,
    backgroundColor: C.surfaceUp,
    padding: S.md,
    gap: S.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: R.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: C.text,
    fontSize: T.md,
    fontWeight: W.bold,
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactName: {
    color: C.text,
    fontSize: T.md,
    fontWeight: W.semi,
  },
  contactPhone: {
    color: C.textSub,
    fontSize: T.xs,
    marginTop: 2,
  },
  contactMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderWidth: 1,
  },
  smsBadge: {
    backgroundColor: C.blueSoft,
    borderColor: C.blueBorder,
  },
  whatsAppBadge: {
    backgroundColor: C.greenSoft,
    borderColor: C.greenBorder,
  },
  methodBadgeText: {
    fontSize: T.micro,
    fontWeight: W.bold,
    textTransform: 'uppercase',
  },
  smsBadgeText: { color: C.blue },
  whatsAppBadgeText: { color: C.green },
  reachableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reachableDot: {
    width: 6,
    height: 6,
    borderRadius: R.full,
  },
  reachableDotOn: { backgroundColor: C.green },
  reachableDotOff: { backgroundColor: C.error },
  reachableText: {
    color: C.textSub,
    fontSize: T.micro,
    fontWeight: W.med,
  },
  moreContactsText: {
    color: C.textMuted,
    fontSize: T.xs,
    fontWeight: W.semi,
    textAlign: 'center',
    marginTop: S.xs,
  },
  warningCard: {
    flexDirection: 'row',
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.goldBorder,
    backgroundColor: C.goldSoft,
    padding: S.lg,
    gap: S.md,
  },
  warningTextContainer: {
    flex: 1,
    gap: S.md,
  },
  warningText: {
    color: C.gold,
    fontSize: T.sm,
    lineHeight: 20,
    fontWeight: W.med,
  },
  settingsButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: S.sm,
    alignItems: 'center',
    borderRadius: R.full,
    backgroundColor: C.gold,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
  },
  settingsButtonText: {
    color: C.bg,
    fontWeight: W.bold,
    fontSize: T.sm,
  },
  fallCard: {
    marginTop: S.sm,
    borderRadius: R.xl,
    borderWidth: 1,
    borderColor: C.borderUp,
    backgroundColor: C.surfaceUp,
    padding: S.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  fallIconWrap: {
    width: 40,
    height: 40,
    borderRadius: R.full,
    backgroundColor: C.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.goldBorder,
  },
  fallTextWrap: {
    flex: 1,
    gap: 2,
  },
  fallTitle: {
    color: C.text,
    fontSize: T.md,
    fontWeight: W.bold,
  },
  fallDescription: {
    color: C.textSub,
    fontSize: T.xs,
    lineHeight: 18,
  },
  actions: {
    marginTop: S.xl,
    gap: S.md,
  },
  activateButton: {
    borderRadius: R.full,
    backgroundColor: C.ember,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.md,
    shadowColor: C.ember,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  activateButtonDisabled: {
    backgroundColor: C.surfaceHigh,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: C.borderUp,
  },
  activateText: {
    color: C.text,
    fontSize: T.lg,
    fontWeight: W.bold,
    letterSpacing: 0.5,
  },
  tooltip: {
    color: C.error,
    fontSize: T.xs,
    textAlign: 'center',
    marginBottom: -S.sm,
    fontWeight: W.med,
  },
  closeButton: {
    alignSelf: 'center',
    paddingVertical: S.sm,
    paddingHorizontal: S.xl,
  },
  closeButtonText: {
    color: C.textSub,
    fontSize: T.sm,
    fontWeight: W.semi,
  },
});