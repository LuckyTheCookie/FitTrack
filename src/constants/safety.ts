export const PHONE_NUMBER_REGEX = /^\+[0-9]{7,16}$/;
export const WHATSAPP_CAPABILITY_TEST_URL = 'whatsapp://send?phone=+10000000000&text=ping';
export const DEFAULT_SAFETY_INTERVAL_MINUTES = 30;
export const DEFAULT_SAFETY_AUTO_ALERT_DELAY_SECONDS = 60;
export const SAFETY_INTERVAL_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
export const SAFETY_AUTO_ALERT_OPTIONS = [30, 60, 120, 300] as const;
