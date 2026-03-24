import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Shield, MessageCircleMore, MessageSquareText, Settings } from 'lucide-react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../constants';
import { GlassCard } from '../ui';
import type { SafetyContact } from '../../types';

interface SafetyCheckConfigProps {
  visible: boolean;
  contacts: SafetyContact[];
  initialEnabled: boolean;
  defaultIntervalMinutes: number;
  defaultAutoAlertDelaySeconds: number;
  onClose: () => void;
  onGoToSettings: () => void;
  onActivate: (config: { intervalMinutes: number; autoAlertDelaySeconds: number; enabled: boolean }) => void;
}

const INTERVAL_OPTIONS = [15, 30, 45, 60, 90, 120];
const AUTO_ALERT_OPTIONS = [30, 60, 120, 300];

function formatInterval(minutes: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (minutes < 60) return `${minutes} ${t('common.minShort')}`;
  if (minutes % 60 === 0) return `${minutes / 60}${t('common.hour')}`;
  return `${Math.floor(minutes / 60)}h${minutes % 60}`;
}

function formatDelay(seconds: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} ${t('common.minShort')}`;
}

export function SafetyCheckConfig({
  visible,
  contacts,
  initialEnabled,
  defaultIntervalMinutes,
  defaultAutoAlertDelaySeconds,
  onClose,
  onGoToSettings,
  onActivate,
}: SafetyCheckConfigProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [intervalMinutes, setIntervalMinutes] = useState(defaultIntervalMinutes);
  const [autoAlertDelaySeconds, setAutoAlertDelaySeconds] = useState(defaultAutoAlertDelaySeconds);
  const [customInterval, setCustomInterval] = useState('');

  const visibleContacts = useMemo(() => contacts.slice(0, 3), [contacts]);

  const handleActivate = () => {
    onActivate({
      enabled,
      intervalMinutes,
      autoAlertDelaySeconds,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <GlassCard style={styles.card} variant="solid">
          <View style={styles.header}>
            <Shield size={20} color={Colors.teal} />
            <Text style={styles.title}>{t('safety.config.title')}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <Text style={styles.sectionTitle}>{t('safety.config.title')}</Text>
                <Text style={styles.sectionDescription}>{t('safety.config.description')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleButton, enabled && styles.toggleButtonActive]}
                onPress={() => setEnabled((value) => !value)}
                activeOpacity={0.8}
              >
                <Text style={styles.toggleButtonText}>{enabled ? t('common.yes') : t('common.no')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>{t('safety.config.intervalLabel')}</Text>
            <View style={styles.chipsWrap}>
              {INTERVAL_OPTIONS.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, intervalMinutes === value && styles.chipActive]}
                  onPress={() => setIntervalMinutes(value)}
                >
                  <Text style={[styles.chipText, intervalMinutes === value && styles.chipTextActive]}>
                    {formatInterval(value, t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={customInterval}
              onChangeText={(text) => {
                setCustomInterval(text);
                const parsed = Number.parseInt(text, 10);
                if (!Number.isNaN(parsed) && parsed > 0) setIntervalMinutes(parsed);
              }}
              placeholder="90"
              placeholderTextColor={Colors.muted}
              keyboardType="number-pad"
              style={styles.customInput}
            />

            <Text style={styles.sectionTitle}>{t('safety.config.autoAlertLabel')}</Text>
            <View style={styles.chipsWrap}>
              {AUTO_ALERT_OPTIONS.map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.chip, autoAlertDelaySeconds === value && styles.chipActive]}
                  onPress={() => setAutoAlertDelaySeconds(value)}
                >
                  <Text style={[styles.chipText, autoAlertDelaySeconds === value && styles.chipTextActive]}>
                    {formatDelay(value, t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('settings.safety.contacts')}</Text>
            {contacts.length === 0 ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{t('safety.config.noContacts')}</Text>
                <TouchableOpacity style={styles.settingsButton} onPress={onGoToSettings}>
                  <Settings size={14} color={Colors.bg} />
                  <Text style={styles.settingsButtonText}>{t('safety.config.goToSettings')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              visibleContacts.map((contact) => (
                <View key={contact.id} style={styles.contactRow}>
                  {contact.method === 'whatsapp' ? (
                    <MessageCircleMore size={16} color={Colors.success} />
                  ) : (
                    <MessageSquareText size={16} color={Colors.cta} />
                  )}
                  <Text style={styles.contactText}>{contact.name}</Text>
                  <Text style={styles.contactMethod}>
                    {contact.method === 'whatsapp'
                      ? t('settings.safety.methodWhatsApp')
                      : t('settings.safety.methodSMS')}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activateButton} onPress={handleActivate} disabled={!enabled}>
              <Text style={styles.activateText}>{t('safety.config.activate')}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    padding: Spacing.xl,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionDescription: {
    color: Colors.muted,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toggleContent: {
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.overlay,
  },
  toggleButtonActive: {
    backgroundColor: Colors.teal,
    borderColor: Colors.teal,
  },
  toggleButtonText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.overlay,
  },
  chipActive: {
    backgroundColor: Colors.tealLight,
    borderColor: Colors.teal,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  chipTextActive: {
    color: Colors.text,
    fontWeight: FontWeight.bold,
  },
  customInput: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.overlay,
  },
  warningBox: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.45)',
    backgroundColor: 'rgba(245,166,35,0.12)',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  warningText: {
    color: Colors.warning,
    fontSize: FontSize.sm,
  },
  settingsButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cta,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  settingsButtonText: {
    color: Colors.bg,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
  },
  contactRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: Spacing.sm,
  },
  contactText: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  contactMethod: {
    color: Colors.muted,
    fontSize: FontSize.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  cancelText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  activateButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  activateText: {
    color: Colors.bg,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});

