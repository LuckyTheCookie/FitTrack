// ============================================================================
// BUILD CONFIG - Configuration des flavors (standard vs FOSS)
// ============================================================================

import Constants from 'expo-constants';

/**
 * Détecte automatiquement le type de build basé sur:
 * 1. Variable d'environnement EXPO_PUBLIC_BUILD_FLAVOR
 * 2. Présence de la config google-services (Expo extra)
 * 3. ApplicationId contenant "foss"
 */
function detectBuildFlavor(): 'standard' | 'foss' {
    // 1. Check environment variable (highest priority)
    const envFlavor = process.env.EXPO_PUBLIC_BUILD_FLAVOR;
    if (envFlavor === 'foss') return 'foss';
    if (envFlavor === 'standard') return 'standard';

    // 2. Check Expo extra config
    const extra = Constants.expoConfig?.extra;
    if (extra?.buildFlavor === 'foss') return 'foss';

    // 3. Check package name for "foss" suffix
    const packageName = Constants.expoConfig?.android?.package || '';
    if (packageName.includes('.foss')) return 'foss';

    // Default to standard build
    return 'standard';
}

/**
 * Type de build actuel
 */
export const BUILD_FLAVOR = detectBuildFlavor();

/**
 * Configuration basée sur le flavor
 */
export const BuildConfig = {
    /** Type de build: 'standard' (Google Play) ou 'foss' (F-Droid) */
    flavor: BUILD_FLAVOR,

    /** Est-ce un build FOSS (sans Firebase/FCM) */
    isFoss: BUILD_FLAVOR === 'foss',

    /** Est-ce un build standard (avec toutes les fonctionnalités) */
    isStandard: BUILD_FLAVOR === 'standard',

    /** Notifications push activées (uniquement sur standard) */
    pushNotificationsEnabled: BUILD_FLAVOR === 'standard',

    /** FCM activé (uniquement sur standard) */
    fcmEnabled: BUILD_FLAVOR === 'standard',

    /** Expo Push Tokens (uniquement sur standard) */
    expoPushEnabled: BUILD_FLAVOR === 'standard',

    /** URL GitHub Releases pour télécharger la version complète */
    githubReleasesUrl: 'https://github.com/LuckyTheCookie/FitTrack/releases',

    /** Nom d'affichage du flavor */
    flavorDisplayName: BUILD_FLAVOR === 'foss' ? 'FOSS Edition' : 'Standard',
} as const;

/**
 * Vérifie si les notifications push sont disponibles pour ce build
 */
export function isPushAvailable(): boolean {
    return BuildConfig.pushNotificationsEnabled;
}

/**
 * Vérifie si c'est un build FOSS
 */
export function isFossBuild(): boolean {
    return BuildConfig.isFoss;
}

export default BuildConfig;
