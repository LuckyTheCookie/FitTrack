import { DEFAULT_SAFETY_AUTO_ALERT_DELAY_SECONDS, DEFAULT_SAFETY_INTERVAL_MINUTES } from '../constants/safety';

export const getDefaultSafetySettings = () => ({
  contacts: [],
  defaultIntervalMinutes: DEFAULT_SAFETY_INTERVAL_MINUTES,
  defaultAutoAlertDelaySeconds: DEFAULT_SAFETY_AUTO_ALERT_DELAY_SECONDS,
});

export function formatSafetyInterval(minutes: number, minShortLabel: string, hourLabel: string): string {
  if (minutes < 60) return `${minutes} ${minShortLabel}`;
  if (minutes % 60 === 0) return `${minutes / 60}${hourLabel}`;
  return `${Math.floor(minutes / 60)}h${minutes % 60}`;
}

export function formatSafetyDelay(seconds: number, minShortLabel: string): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} ${minShortLabel}`;
}

