// ============================================================================
// i18n Configuration - Spix App
// Internationalization with i18next + react-i18next + expo-localization
// ============================================================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { storageHelpers } from '../storage/mmkv';

import fr from './locales/fr.json';
import en from './locales/en.json';

// Available languages
export const LANGUAGES = {
    fr: { name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
    en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Get saved language or detect from device
const getInitialLanguage = (): LanguageCode => {
    // Try to get saved preference
    const saved = storageHelpers.getString('language');
    if (typeof saved === 'string' && (saved === 'fr' || saved === 'en')) {
        return saved;
    }
    
    // Detect from device locale
    const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'fr';
    return deviceLocale === 'en' ? 'en' : 'fr'; // Default to French
};

// Initialize i18next
i18n
    .use(initReactI18next)
    .init({
        resources: {
            fr: { translation: fr },
            en: { translation: en },
        },
        lng: getInitialLanguage(),
        fallbackLng: 'fr',
        interpolation: {
            escapeValue: false, // React already escapes
        },
        react: {
            useSuspense: false, // Avoid issues with Suspense in React Native
        },
    });

// Function to change language and persist
export const changeLanguage = async (language: LanguageCode): Promise<void> => {
    await i18n.changeLanguage(language);
    storageHelpers.setString('language', language);
};

// Get current language
export const getCurrentLanguage = (): LanguageCode => {
    return (i18n.language as LanguageCode) || 'fr';
};

export default i18n;
