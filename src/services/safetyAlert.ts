import * as Linking from 'expo-linking';
import * as SMS from 'expo-sms';
import i18n from '../i18n';
import type { SafetyContact } from '../types';
import type { LatLng } from '../stores/runStore';
import { serviceLogger } from '../utils/logger';
import { WHATSAPP_CAPABILITY_TEST_URL } from '../constants/safety';

export interface AlertPayload {
  type: 'no_response' | 'help_requested';
  position: LatLng;
  runDurationMinutes: number;
  distanceKm: number;
  timestamp: Date;
}

const DEFAULT_APP_NAME = 'Spix';
const DEFAULT_USER_NAME = 'Utilisateur';

function buildMessage(payload: AlertPayload): string {
  const resolvedUserName = DEFAULT_USER_NAME;
  const resolvedAppName = DEFAULT_APP_NAME;
  const mapsUrl = `https://maps.google.com/?q=${payload.position.latitude},${payload.position.longitude}`;
  const formattedTimestamp = payload.timestamp.toLocaleString();

  const key = payload.type === 'no_response'
    ? 'safety.alert.messageNoResponse'
    : 'safety.alert.message';

  return i18n.t(key, {
    userName: resolvedUserName,
    mapsUrl,
    runDurationMinutes: Math.max(0, Math.round(payload.runDurationMinutes)),
    distanceKm: payload.distanceKm.toFixed(2),
    timestamp: formattedTimestamp,
    appName: resolvedAppName,
  });
}

function buildAllClearMessage(userName?: string, appName?: string): string {
  const resolvedUserName = userName?.trim() || DEFAULT_USER_NAME;
  const resolvedAppName = appName?.trim() || DEFAULT_APP_NAME;
  return i18n.t('safety.alert.messageAllClear', {
    userName: resolvedUserName,
    appName: resolvedAppName,
  });
}

async function sendSms(phone: string, message: string): Promise<boolean> {
  const smsAvailable = await SMS.isAvailableAsync();
  if (smsAvailable) {
    try {
      await SMS.sendSMSAsync([phone], message);
      return true;
    } catch {
      // Fallback below
    }
  }

  const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
  const canOpenSmsUrl = await Linking.canOpenURL(smsUrl);
  if (!canOpenSmsUrl) {
    const telUrl = `tel:${phone}`;
    const canOpenTelUrl = await Linking.canOpenURL(telUrl);
    if (!canOpenTelUrl) {
      return false;
    }
    await Linking.openURL(telUrl);
    return true;
  }
  await Linking.openURL(smsUrl);
  return true;
}

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const canUseWhatsApp = await Linking.canOpenURL(WHATSAPP_CAPABILITY_TEST_URL);
  if (!canUseWhatsApp) return false;
  const waUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
  const canOpen = await Linking.canOpenURL(waUrl);
  if (!canOpen) return false;
  await Linking.openURL(waUrl);
  return true;
}

export async function sendSafetyAlert(
  contacts: SafetyContact[],
  payload: AlertPayload
): Promise<{ success: SafetyContact[]; failed: SafetyContact[] }> {
  const success: SafetyContact[] = [];
  const failed: SafetyContact[] = [];
  const message = buildMessage(payload);

  for (const contact of contacts) {
    try {
      if (contact.method === 'whatsapp') {
        const waSent = await sendWhatsApp(contact.phone, message);
        if (waSent) {
          success.push(contact);
          continue;
        }
        serviceLogger.warn(`[SafetyAlert] WhatsApp unavailable, fallback to SMS for ${contact.phone}`);
      }

      const smsSent = await sendSms(contact.phone, message);
      if (smsSent) success.push(contact);
      else failed.push(contact);
    } catch (error) {
      serviceLogger.warn('[SafetyAlert] Failed to send alert', contact.phone, error);
      failed.push(contact);
    }
  }

  return { success, failed };
}

export async function sendAllClearSafetyAlert(
  contacts: SafetyContact[],
  userName?: string,
  appName?: string
): Promise<{ success: SafetyContact[]; failed: SafetyContact[] }> {
  const success: SafetyContact[] = [];
  const failed: SafetyContact[] = [];
  const message = buildAllClearMessage(userName, appName);

  for (const contact of contacts) {
    try {
      const sent = await sendSms(contact.phone, message);
      if (sent) success.push(contact);
      else failed.push(contact);
    } catch (error) {
      serviceLogger.warn('[SafetyAlert] Failed to send all-clear', contact.phone, error);
      failed.push(contact);
    }
  }

  return { success, failed };
}
