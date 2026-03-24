import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Trash2, MessageSquareText, MessageCircleMore, Shield } from 'lucide-react-native';
import { nanoid } from 'nanoid/non-secure';
import { GlassCard, CustomAlertModal } from '../../src/components/ui';
import { useAppStore } from '../../src/stores';
import type { SafetyContact } from '../../src/types';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants';

const INTERVAL_OPTIONS = [15, 30, 45, 60, 90, 120];
const AUTO_ALERT_OPTIONS = [30, 60, 120, 300];
const MAX_CONTACTS = 5;

function formatInterval(minutes: number, t: (key: string) => string): string {
  if (minutes < 60) return `${minutes} ${t('common.minShort')}`;
  if (minutes % 60 === 0) return `${minutes / 60}${t('common.hour')}`;
  return `${Math.floor(minutes / 60)}h${minutes % 60}`;
}

function formatAutoAlert(seconds: number, t: (key: string) => string): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} ${t('common.minShort')}`;
}

export default function SafetySettingsScreen() {
  const { t } = useTranslation();
  const { settings, updateSettings } = useAppStore();
  const safetySettings = settings.safety ?? {
    contacts: [],
    defaultIntervalMinutes: 30,
    defaultAutoAlertDelaySeconds: 60,
  };
  const contacts = safetySettings.contacts;

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<'sms' | 'whatsapp'>('sms');
  const [selectedDelete, setSelectedDelete] = useState<SafetyContact | null>(null);
  const [whatsAppAvailable, setWhatsAppAvailable] = useState(false);

  useEffect(() => {
    const checkWhatsApp = async () => {
      const canOpen = await Linking.canOpenURL('whatsapp://send?phone=+10000000000&text=ping');
      setWhatsAppAvailable(canOpen);
    };
    checkWhatsApp();
  }, []);

  const canAdd = useMemo(() => name.trim().length > 0 && /^\+[0-9]{7,16}$/.test(phone), [name, phone]);

  const updateSafetySettings = (partial: Partial<typeof safetySettings>) => {
    updateSettings({
      safety: {
        ...safetySettings,
        ...partial,
      },
    });
  };

  const handleSaveContact = () => {
    if (!canAdd) return;
    if (contacts.length >= MAX_CONTACTS) return;
    const newContact: SafetyContact = {
      id: nanoid(),
      name: name.trim(),
      phone: phone.trim(),
      method,
    };
    updateSafetySettings({ contacts: [...contacts, newContact] });
    setName('');
    setPhone('');
    setMethod('sms');
    setShowAddModal(false);
  };

  const handleDeleteContact = (id: string) => {
    updateSafetySettings({
      contacts: contacts.filter((contact) => contact.id !== id),
    });
    setSelectedDelete(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeIn.delay(50)} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{t('settings.safety.title')}</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <GlassCard style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{t('settings.safety.contacts')}</Text>
              <TouchableOpacity
                style={[styles.addButton, contacts.length >= MAX_CONTACTS && styles.addButtonDisabled]}
                onPress={() => setShowAddModal(true)}
                disabled={contacts.length >= MAX_CONTACTS}
              >
                <Plus size={14} color={Colors.bg} />
                <Text style={styles.addButtonText}>{t('settings.safety.addContact')}</Text>
              </TouchableOpacity>
            </View>

            {contacts.length >= MAX_CONTACTS && (
              <Text style={styles.maxContactsText}>{t('settings.safety.maxContacts')}</Text>
            )}

            {contacts.length === 0 ? (
              <Text style={styles.emptyText}>{t('safety.config.noContacts')}</Text>
            ) : (
              contacts.map((contact) => (
                <View key={contact.id} style={styles.contactRow}>
                  {contact.method === 'whatsapp'
                    ? <MessageCircleMore size={16} color={Colors.success} />
                    : <MessageSquareText size={16} color={Colors.cta} />}
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactMeta}>
                      {contact.phone} • {contact.method === 'whatsapp'
                        ? t('settings.safety.methodWhatsApp')
                        : t('settings.safety.methodSMS')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDelete(contact)} style={styles.deleteBtn}>
                    <Trash2 size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.safety.defaultInterval')}</Text>
            <View style={styles.chipsWrap}>
              {INTERVAL_OPTIONS.map((interval) => (
                <TouchableOpacity
                  key={interval}
                  style={[
                    styles.chip,
                    safetySettings.defaultIntervalMinutes === interval && styles.chipActive,
                  ]}
                  onPress={() => updateSafetySettings({ defaultIntervalMinutes: interval })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      safetySettings.defaultIntervalMinutes === interval && styles.chipTextActive,
                    ]}
                  >
                    {formatInterval(interval, t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.safety.defaultAutoAlert')}</Text>
            <View style={styles.chipsWrap}>
              {AUTO_ALERT_OPTIONS.map((delaySeconds) => (
                <TouchableOpacity
                  key={delaySeconds}
                  style={[
                    styles.chip,
                    safetySettings.defaultAutoAlertDelaySeconds === delaySeconds && styles.chipActive,
                  ]}
                  onPress={() => updateSafetySettings({ defaultAutoAlertDelaySeconds: delaySeconds })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      safetySettings.defaultAutoAlertDelaySeconds === delaySeconds && styles.chipTextActive,
                    ]}
                  >
                    {formatAutoAlert(delaySeconds, t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <GlassCard style={[styles.card, styles.disclaimerCard]}>
            <View style={styles.disclaimerHeader}>
              <Shield size={16} color={Colors.warning} />
              <Text style={styles.disclaimerTitle}>{t('settings.safety.title')}</Text>
            </View>
            <Text style={styles.disclaimerText}>{t('settings.safety.disclaimer')}</Text>
          </GlassCard>
        </Animated.View>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard} variant="solid">
            <Text style={styles.modalTitle}>{t('settings.safety.addContact')}</Text>

            <Text style={styles.fieldLabel}>{t('settings.safety.editContact')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('settings.safety.editContact')}
              placeholderTextColor={Colors.muted2}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>{t('settings.safety.contacts')}</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+33612345678"
              placeholderTextColor={Colors.muted2}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <View style={styles.methodRow}>
              <Text style={styles.fieldLabel}>{t('settings.safety.methodSMS')}</Text>
              <Switch
                value={method === 'whatsapp'}
                onValueChange={(value) => setMethod(value ? 'whatsapp' : 'sms')}
                disabled={!whatsAppAvailable}
                trackColor={{ true: Colors.success, false: Colors.cardSolid }}
                thumbColor="#fff"
              />
              <Text style={styles.fieldLabel}>{t('settings.safety.methodWhatsApp')}</Text>
            </View>
            {!whatsAppAvailable && (
              <Text style={styles.unavailableText}>{t('settings.safety.whatsappUnavailable')}</Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryAction} onPress={() => setShowAddModal(false)}>
                <Text style={styles.secondaryActionText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryAction, !canAdd && styles.primaryActionDisabled]}
                onPress={handleSaveContact}
                disabled={!canAdd}
              >
                <Text style={styles.primaryActionText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </Modal>

      <CustomAlertModal
        visible={selectedDelete !== null}
        type="warning"
        title={t('settings.safety.deleteContact')}
        message={t('settings.safety.deleteConfirm', { name: selectedDelete?.name ?? '' })}
        onClose={() => setSelectedDelete(null)}
        buttons={[
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: () => {
              if (selectedDelete) handleDeleteContact(selectedDelete.id);
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: { flex: 1, color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  headerSpacer: { width: 42 },
  card: { padding: Spacing.md },
  cardTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  addButtonDisabled: { opacity: 0.45 },
  addButtonText: { color: Colors.bg, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  maxContactsText: { color: Colors.warning, fontSize: FontSize.xs, marginBottom: Spacing.sm },
  emptyText: { color: Colors.muted, fontSize: FontSize.sm },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  contactInfo: { flex: 1 },
  contactName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  contactMeta: { color: Colors.muted, fontSize: FontSize.xs, marginTop: 2 },
  deleteBtn: { padding: Spacing.xs },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.stroke,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.overlay,
  },
  chipActive: { borderColor: Colors.teal, backgroundColor: Colors.tealLight },
  chipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  chipTextActive: { color: Colors.text, fontWeight: FontWeight.bold },
  disclaimerCard: {
    borderColor: 'rgba(245,166,35,0.45)',
    backgroundColor: 'rgba(245,166,35,0.12)',
  },
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  disclaimerTitle: { color: Colors.warning, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  disclaimerText: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: { padding: Spacing.lg },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginBottom: Spacing.md },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    backgroundColor: Colors.overlay,
  },
  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  unavailableText: { color: Colors.warning, fontSize: FontSize.xs, marginTop: Spacing.xs },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  secondaryAction: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  secondaryActionText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  primaryAction: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.cta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  primaryActionDisabled: { opacity: 0.45 },
  primaryActionText: { color: Colors.bg, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});

