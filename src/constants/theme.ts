// ============================================================================
// THÈME ET CONSTANTES DE STYLE - FitTrack App
// Style glassmorphism sombre inspiré de la maquette
// ============================================================================

export const Colors = {
  // Backgrounds
  bg: '#0b0c0f',
  card: 'rgba(26, 27, 34, 0.8)',
  cardSolid: '#1a1b22',
  
  // Text
  text: '#f2f3f5',
  muted: '#b9bcc8',
  muted2: '#8a8fa3',
  
  // Accents
  teal: '#1f6a66',
  tealLight: 'rgba(31, 106, 102, 0.35)',
  cta: '#d79686',
  cta2: '#e3a090',
  accent: '#ff6b5a',
  
  // Strokes & Overlays
  stroke: 'rgba(255, 255, 255, 0.08)',
  strokeLight: 'rgba(255, 255, 255, 0.14)',
  overlay: 'rgba(255, 255, 255, 0.06)',
  overlayMedium: 'rgba(255, 255, 255, 0.10)',
  
  // States
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
  
  // Specific
  ringBg: 'rgba(255, 255, 255, 0.22)',
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
