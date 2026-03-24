import { create } from 'zustand';
import type { SafetyContact } from '../types';
import type { LatLng } from './runStore';

type SafetyCheckStatus = 'idle' | 'countdown' | 'pending' | 'auto_alerting' | 'dismissed';

interface SafetyCheckState {
  isEnabled: boolean;
  intervalMinutes: number;
  autoAlertDelaySeconds: number;
  contacts: SafetyContact[];
  checkStatus: SafetyCheckStatus;
  nextCheckAt: number | null;
  countdownSeconds: number;
  pendingSeconds: number;
  lastKnownPosition: LatLng | null;
  alertSentAt: number | null;

  initCheck: (intervalMinutes: number, autoAlertDelaySeconds?: number, contacts?: SafetyContact[]) => void;
  tickCountdown: () => void;
  tickPending: () => void;
  dismissCheck: () => void;
  triggerHelp: () => void;
  startPendingCheck: () => void;
  extendCheck: (newIntervalMinutes: number) => void;
  resetCheck: () => void;
  updatePosition: (pos: LatLng) => void;
  setContacts: (contacts: SafetyContact[]) => void;
  setAutoAlertDelaySeconds: (seconds: number) => void;
  markAlertSent: () => void;
}

const COUNTDOWN_WARNING_SECONDS = 60;
const DEFAULT_AUTO_ALERT_DELAY_SECONDS = 60;

export const useSafetyStore = create<SafetyCheckState>((set, get) => ({
  isEnabled: false,
  intervalMinutes: 30,
  autoAlertDelaySeconds: DEFAULT_AUTO_ALERT_DELAY_SECONDS,
  contacts: [],
  checkStatus: 'idle',
  nextCheckAt: null,
  countdownSeconds: 0,
  pendingSeconds: DEFAULT_AUTO_ALERT_DELAY_SECONDS,
  lastKnownPosition: null,
  alertSentAt: null,

  initCheck: (intervalMinutes, autoAlertDelaySeconds = DEFAULT_AUTO_ALERT_DELAY_SECONDS, contacts = []) => {
    const now = Date.now();
    const nextCheckAt = now + intervalMinutes * 60 * 1000;
    set({
      isEnabled: true,
      intervalMinutes,
      autoAlertDelaySeconds,
      contacts,
      checkStatus: 'countdown',
      nextCheckAt,
      countdownSeconds: Math.max(0, Math.ceil((nextCheckAt - now) / 1000)),
      pendingSeconds: autoAlertDelaySeconds,
      alertSentAt: null,
    });
  },

  tickCountdown: () => {
    const state = get();
    if (!state.isEnabled || state.checkStatus === 'pending' || state.checkStatus === 'auto_alerting') return;
    if (!state.nextCheckAt) return;

    const remainingSeconds = Math.max(0, Math.ceil((state.nextCheckAt - Date.now()) / 1000));

    if (remainingSeconds <= 0) {
      set({
        checkStatus: 'pending',
        countdownSeconds: 0,
        pendingSeconds: state.autoAlertDelaySeconds,
      });
      return;
    }

    if (remainingSeconds <= COUNTDOWN_WARNING_SECONDS) {
      set({
        checkStatus: 'pending',
        countdownSeconds: 0,
        pendingSeconds: state.autoAlertDelaySeconds,
      });
      return;
    }

    set({
      checkStatus: 'idle',
      countdownSeconds: remainingSeconds,
    });
  },

  tickPending: () => {
    const state = get();
    if (!state.isEnabled || state.checkStatus !== 'pending') return;

    const nextPending = Math.max(0, state.pendingSeconds - 1);
    if (nextPending <= 0) {
      set({
        pendingSeconds: 0,
        checkStatus: 'auto_alerting',
      });
      return;
    }

    set({ pendingSeconds: nextPending });
  },

  dismissCheck: () => {
    const state = get();
    if (!state.isEnabled) return;
    const now = Date.now();
    const nextCheckAt = now + state.intervalMinutes * 60 * 1000;
    set({
      checkStatus: 'dismissed',
      nextCheckAt,
      countdownSeconds: Math.max(0, Math.ceil((nextCheckAt - now) / 1000)),
      pendingSeconds: state.autoAlertDelaySeconds,
    });
  },

  triggerHelp: () => {
    if (!get().isEnabled) return;
    set({
      checkStatus: 'auto_alerting',
    });
  },

  startPendingCheck: () => {
    const state = get();
    if (!state.isEnabled) return;
    set({
      checkStatus: 'pending',
      pendingSeconds: state.autoAlertDelaySeconds,
      countdownSeconds: 0,
    });
  },

  extendCheck: (newIntervalMinutes) => {
    const state = get();
    if (!state.isEnabled) return;
    const now = Date.now();
    const nextCheckAt = now + newIntervalMinutes * 60 * 1000;
    set({
      intervalMinutes: newIntervalMinutes,
      checkStatus: 'dismissed',
      nextCheckAt,
      countdownSeconds: Math.max(0, Math.ceil((nextCheckAt - now) / 1000)),
      pendingSeconds: state.autoAlertDelaySeconds,
    });
  },

  resetCheck: () => {
    set({
      isEnabled: false,
      checkStatus: 'idle',
      nextCheckAt: null,
      countdownSeconds: 0,
      pendingSeconds: DEFAULT_AUTO_ALERT_DELAY_SECONDS,
      lastKnownPosition: null,
      alertSentAt: null,
    });
  },

  updatePosition: (pos) => {
    set({ lastKnownPosition: pos });
  },

  setContacts: (contacts) => {
    set({ contacts });
  },

  setAutoAlertDelaySeconds: (seconds) => {
    set({
      autoAlertDelaySeconds: seconds,
      pendingSeconds: seconds,
    });
  },

  markAlertSent: () => {
    set({
      alertSentAt: Date.now(),
      checkStatus: 'auto_alerting',
    });
  },
}));
