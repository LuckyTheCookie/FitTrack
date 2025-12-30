# FitTrack - Application de Suivi Fitness

Application React Native / Expo pour tracker tes séances de sport, courses, repas et mensurations avec gamification.

## 🚀 Démarrage

```bash
# Installation des dépendances
bun install

# Lancer l'app en mode développement
bunx expo start

# Lancer sur Android (dev build)
bunx expo run:android

# Lancer sur iOS
bunx expo run:ios
```

## 📱 Fonctionnalités

### MVP Implémenté

- **Today Screen**
  - Weekly goal avec progress ring
  - Best streak affiché
  - Vue semaine avec jours cochés
  - Bouton CTA "Start New Workout"
  - Séances récentes en scroll horizontal
  - Progress mensuel en grille

- **Ajout d'entrées** (4 types)
  - 🏠 **Séance maison** : nom, exercices (texte libre), bloc abdos
  - 🏃 **Course** : distance, durée, vitesse calculée, BPM
  - 🍽️ **Repas** : nom + description libre
  - 📏 **Mensurations** : poids, taille, bras, hanches

- **Progress Screen**
  - Streak actuel et meilleur
  - Stats globales (total séances, km, etc.)
  - Graphique séances/mois (SVG)
  - Évolution du poids
  - Badges débloqués

- **Tools Screen**
  - Générateur de séance "chambre"
  - Paramètres : durée (10/20/30), focus (haut/abdos/jambes/full), intensité
  - Génère une liste d'exercices avec sets/reps
  - Bloc abdos optionnel
  - Bouton "Démarrer cette séance" qui crée l'entrée

- **Workout Screen**
  - Historique complet de toutes les entrées
  - Filtres par type (sport/repas/mesures)
  - Suppression par appui long

- **Settings Screen**
  - Modifier l'objectif hebdomadaire
  - Export JSON de la semaine (copie dans le clipboard)
  - Stats des données
  - Réinitialisation complète

### Gamification

- **Streak** : jours consécutifs avec activité sport
- **Badges** :
  - Premier pas (1ère séance)
  - Semaine de feu (7 jours)
  - Mois de fer (30 jours)
  - Régulier (10 séances)
  - Déterminé (50 séances)
  - Légende (100 séances)
  - Coureur (10km)
  - Marathon (50km)
  - Constant (4 semaines objectif atteint)

## 🏗️ Architecture

```
fittrack-app/
├── app/                    # Expo Router - Écrans
│   ├── _layout.tsx         # Layout avec tabs
│   ├── index.tsx           # Today Screen
│   ├── progress.tsx        # Progress Screen
│   ├── tools.tsx           # Tools Screen (générateur)
│   ├── workout.tsx         # Historique
│   └── settings.tsx        # Paramètres
│
├── src/
│   ├── components/
│   │   ├── ui/             # Composants UI réutilisables
│   │   │   ├── GlassCard.tsx
│   │   │   ├── ProgressRing.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── SegmentedControl.tsx
│   │   │   ├── DayBadge.tsx
│   │   │   ├── WorkoutCard.tsx
│   │   │   ├── MonthCard.tsx
│   │   │   ├── SectionHeader.tsx
│   │   │   ├── BadgeDisplay.tsx
│   │   │   └── EmptyState.tsx
│   │   └── forms/
│   │       └── AddEntryForm.tsx
│   │
│   ├── stores/
│   │   └── appStore.ts     # Zustand store avec persistence
│   │
│   ├── storage/
│   │   └── mmkv.ts         # AsyncStorage adapter
│   │
│   ├── utils/
│   │   ├── date.ts         # Helpers date (date-fns)
│   │   ├── workoutGenerator.ts
│   │   ├── badges.ts
│   │   └── export.ts
│   │
│   ├── constants/
│   │   └── theme.ts        # Couleurs, spacing, etc.
│   │
│   └── types/
│       └── index.ts        # Types TypeScript
│
└── assets/                 # Images, icônes
```

## 🎨 Design

- **Thème sombre** avec effet glassmorphism
- **Couleurs principales** :
  - Background: `#0b0c0f`
  - Cards: `rgba(26, 27, 34, 0.8)`
  - CTA: `#d79686` → `#e3a090` (gradient)
  - Teal accent: `#1f6a66`
- **Typo** : System fonts (SF Pro, Roboto, etc.)
- **Bordures arrondies** : 14-24px

## 🛠️ Stack Technique

| Outil | Usage |
|-------|-------|
| **Expo SDK 54** | Framework React Native |
| **Expo Router** | Navigation file-based |
| **TypeScript** | Typage statique |
| **Zustand** | State management |
| **AsyncStorage** | Persistence locale |
| **date-fns** | Manipulation de dates |
| **react-native-svg** | Graphiques |
| **expo-linear-gradient** | Dégradés |
| **expo-clipboard** | Export JSON |

## 📋 Choix Techniques

### Pourquoi AsyncStorage vs MMKV ?
AsyncStorage est compatible Expo Go sans build natif. Pour une app en production, MMKV serait plus performant mais nécessite un dev build.

### Pourquoi Zustand ?
- Léger (~1kb)
- API simple (hooks)
- Persistence facile
- Pas de boilerplate

### Pourquoi pas de base d'aliments ?
MVP : texte libre pour les repas. Une base de données nutritionnelle peut être ajoutée en V2.

## 🚀 Next Steps (V2)

### Timer pendant les séances
- Compte à rebours pour les repos
- Timer pour les exercices en durée
- Mode "séance guidée"

### Coaching léger
- Suggestions basées sur l'historique
- Alertes si streak en danger
- Recommandations progression

### Intégrations santé
- Google Fit / Apple Health
- Import automatique des courses
- Sync des données sommeil/pas

### Sync & Compte
- Backend (Supabase, Firebase)
- Authentification
- Multi-device

### Notifications intelligentes
- Rappels séances
- Félicitations streak
- Suggestions horaires

## 📄 License

MIT - Usage personnel, publiable sur stores.
