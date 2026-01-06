// ============================================================================
// THÈME ET CONSTANTES DE STYLE - FitTrack App
// Style glassmorphism sombre inspiré de la maquette
// ============================================================================

export const Colors = {
    // Backgrounds
    bg: '#0b0c0f',
    card: 'rgba(26, 27, 34, 0.85)',
    cardSolid: '#1a1b22',
    cardElevated: 'rgba(32, 34, 42, 0.9)',

    // Text - Improved contrast
    text: '#f4f5f7',
    textSecondary: 'rgba(255, 255, 255, 0.85)',
    muted: '#c8cad4',       // Improved from #b9bcc8
    muted2: '#a0a5b8',      // Improved from #8a8fa3

    // Accents
    teal: '#1f6a66',
    tealLight: 'rgba(31, 106, 102, 0.35)',
    cta: '#d79686',
    cta2: '#e3a090',
    accent: '#ff6b5a',

    // Premium & Cozy colors
    gold: '#f5c842',
    goldLight: 'rgba(245, 200, 66, 0.25)',
    cozyWarm: '#e8b4a0',
    cozyWarmLight: 'rgba(232, 180, 160, 0.15)',

    // Strokes & Overlays
    stroke: 'rgba(255, 255, 255, 0.10)',
    strokeLight: 'rgba(255, 255, 255, 0.16)',
    overlay: 'rgba(255, 255, 255, 0.08)',
    overlayMedium: 'rgba(255, 255, 255, 0.12)',

    // States
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',

    // Specific
    ringBg: 'rgba(255, 255, 255, 0.24)',
    modalBg: 'rgba(20, 20, 26, 0.95)',
} as const;

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 14,
    xl: 16,
    xxl: 20,
    xxxl: 24,
} as const;

export const BorderRadius = {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    xxl: 24,
    full: 999,
} as const;

export const FontSize = {
    xs: 11,
    sm: 12,
    md: 13,
    lg: 14,
    xl: 16,
    xxl: 18,
    xxxl: 24,
    display: 32,
} as const;

export const FontWeight = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
} as const;

export const Shadows = {
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
        elevation: 12,
    },
    cta: {
        shadowColor: '#d79686',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 8,
    },
} as const;

// Gradients (pour LinearGradient)
export const Gradients = {
    tealCard: ['rgba(31, 106, 102, 0.75)', 'rgba(31, 106, 102, 0.35)'],
    cta: ['#e3a090', '#d79686'],
    ctaReverse: ['#d79686', '#e3a090'],
    gold: ['#f5c842', '#e5a832'],
    goldSubtle: ['rgba(245, 200, 66, 0.35)', 'rgba(229, 168, 50, 0.15)'],
    cozyWarm: ['rgba(232, 180, 160, 0.25)', 'rgba(215, 150, 134, 0.10)'],
    premium: ['rgba(45, 48, 60, 0.95)', 'rgba(26, 27, 34, 0.90)'],
} as const;

// Labels
export const Labels = {
    focusArea: {
        upper: 'Haut du corps',
        abs: 'Abdos',
        legs: 'Jambes',
        full: 'Full body',
    },
    intensity: {
        easy: 'Facile',
        medium: 'Moyen',
        hard: 'Difficile',
    },
    duration: {
        10: '10 min',
        20: '20 min',
        30: '30 min',
    },
    entryType: {
        home: 'Maison',
        run: 'Course',
        meal: 'Repas',
        measure: 'Mesures',
    },
} as const;

// Icons (emoji ou noms pour expo vector icons)
export const Icons = {
    home: '🏠',
    run: '🏃',
    meal: '🍽️',
    measure: '📏',
    streak: '🔥',
    badge: '🏆',
    check: '✓',
    plus: '+',
    settings: '⚙️',
    export: '📤',
    copy: '📋',
} as const;
