# FitTrack - AI Agent Instructions

## Project Overview
FitTrack is a **privacy-first offline-first** React Native fitness tracking app built with **Expo 54** and **Expo Router v6**. It tracks workouts (home/run/beatsaber), meals, measurements with gamification (XP, levels, quests, badges) and optional social features. Uses **glassmorphism dark theme** with carefully tuned animations and persistent bottom tab navigation.

### Tech Stack
- **React Native 0.81** + **Expo SDK 54** + **TypeScript**
- **Expo Router v6** (file-based routing)
- **Zustand** (state management with persistence)
- **react-native-reanimated** (60fps animations)
- **Supabase** (optional social backend)
- **Health Connect** (Android fitness data import)
- **MediaPipe** (AI pose detection for rep counter)

---

## Critical Architecture Patterns

### State Management: Triple Store Pattern
Three **Zustand stores** with AsyncStorage persistence via `zustand/middleware/persist`:

1. **`appStore`** ([src/stores/appStore.ts](src/stores/appStore.ts)): Core data (entries, settings, badges)
2. **`gamificationStore`** ([src/stores/gamificationStore.ts](src/stores/gamificationStore.ts)): XP, levels, quests, history
3. **`socialStore`** ([src/stores/socialStore.ts](src/stores/socialStore.ts)): Auth, profile, leaderboards, friends

**CRITICAL RULE**: When modifying entries that affect gamification, ALWAYS sync both stores:
```typescript
// Example: After adding/deleting sport entries
import { calculateQuestTotals } from '../src/utils/questCalculator';
import { useGamificationStore } from '../src/stores';

const totals = calculateQuestTotals(entries); // Calculate from all entries
useGamificationStore.getState().recalculateAllQuests(totals); // Sync quests
```

Quest types: `exercises` (total reps), `workouts` (count), `distance` (km), `duration` (minutes). Completed quests award XP automatically.

### Data Types & Entry Structure
All entries extend `BaseEntry` with `id` (nanoid), `type`, `createdAt` (ISO 8601), `date` (YYYY-MM-DD). Five entry types:
- **`HomeWorkoutEntry`**: freeform text exercises, optional absBlock, `totalReps` for quest tracking, optional `durationMinutes`
- **`RunEntry`**: `distanceKm`, `durationMinutes`, auto-calculated `avgSpeed`
- **`BeatSaberEntry`**: `durationMinutes`, optional cardiac data
- **`MealEntry`**: description, calories (tracking only)
- **`MeasureEntry`**: weight, optional waist/chest/hips (tracking only)

Filter sport entries: `entries.filter(e => ['home', 'run', 'beatsaber'].includes(e.type))`

### Build Flavors: Standard vs FOSS
**Build configuration system** in [src/config/buildConfig.ts](src/config/buildConfig.ts) enables two build variants:
- **`standard`** (Google Play): Full features with Firebase/FCM push notifications, Google services
- **`foss`** (F-Droid): No Google trackers, no push notifications, privacy-focused

**Flavor detection**:
1. `EXPO_PUBLIC_BUILD_FLAVOR` env var (highest priority)
2. `extra.buildFlavor` in `app.json`
3. Package name contains `.foss`

**Usage pattern**:
```typescript
import { BuildConfig } from '../src/config';

if (BuildConfig.isFoss) {
    // Skip push notification registration
}
```

Affects: Notifications service, auth flow (shows F-Droid warning), and package name. See [docs/FOSS_BUILD_CHANGES.md](docs/FOSS_BUILD_CHANGES.md).

### Health Connect Integration (Android Only)
[src/services/healthConnect/index.ts](src/services/healthConnect/index.ts) imports workouts from Android Health Connect:
- **Lazy-loaded module** to prevent iOS crashes
- **Exercise type mappings**: Maps Health Connect exercise type IDs to FitTrack types (`home`/`run`/`beatsaber`/`skip`)
- **Custom date support**: Pass `customDate` param to entry actions to preserve original workout date
- **Duplicate detection**: Compare `startTime`/`endTime` to avoid re-importing

Example mapping:
```typescript
DEFAULT_EXERCISE_MAPPINGS: {
    56: 'run',          // RUNNING
    16: 'beatsaber',    // DANCING
    0: 'home',          // SPORT (custom)
    74: 'home',         // WORKOUT
}
```

### Theme & Component Patterns
- **Glassmorphism cards**: Always use `<GlassCard variant="default|teal|solid">` from `src/components/ui`
- **Colors**: Import from `src/constants/theme.ts` - **NEVER hardcode colors**. Main palette: `Colors.bg`, `Colors.card`, `Colors.cta`, `Colors.teal`
- **Animations**: Use `react-native-reanimated` with `useSharedValue` + `withTiming(duration: 250, easing: Easing.out(Easing.quad))` for smooth transitions
- **Spacing/Typography**: Use constants from theme.ts: `Spacing.xl`, `FontSize.lg`, `BorderRadius.xl`
- **Icon library**: `lucide-react-native` (not `@expo/vector-icons`)

Animation example from [app/_layout.tsx](app/_layout.tsx) tab buttons:
```typescript
const opacity = useSharedValue(0.5);
useEffect(() => {
    opacity.value = isFocused 
        ? withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) })
        : withTiming(0.4, { duration: 250 });
}, [isFocused]);
```

### Navigation & Routing
- **Expo Router v6** file-based: `app/` directory structure maps to routes automatically
- Bottom tabs defined in [app/_layout.tsx](app/_layout.tsx) with **custom animated tab bar** (not `@gorhom/animated-tabbar`)
- Tab config in `TAB_CONFIG` array with `name`/`label`/`Icon`
- Tab bar hides on: `/rep-counter`, `/health-connect`, `/onboarding`
- Navigate: `navigation.navigate(route.name)` - no hardcoded paths

### Bottom Sheets & Modals
- Use **`@lodev09/react-native-true-sheet`** for bottom sheets (see `src/components/sheets/AddEntryBottomSheet.tsx`)
- Expose ref methods: `present()`, `dismiss()`
- **ALWAYS wrap root screen** in `<GestureHandlerRootView style={{ flex: 1 }}>`
- Modal patterns use custom components in `src/components/` for entry details

---

## Developer Workflows

### Commands (IMPORTANT: Use `bunx`, not `npx`)
```bash
bunx expo start          # Dev server with QR code
bunx expo run:android    # Dev build on Android
bunx expo run:ios        # Dev build on iOS
node scripts/release.js  # Build release APKs (standard + foss)
```

**Release script** (`scripts/release.js`): Automates building both flavors, generates checksums, creates GitHub release drafts.

### Adding New Entry Types
1. Define type in [src/types/index.ts](src/types/index.ts) extending `BaseEntry`
2. Add action in `appStore.ts`: `add[Type](data, customDate?)` with `nanoid()` ID and date helpers (`getTodayDateString()`, `getNowISO()`)
3. **If affects gamification**: Update [src/utils/questCalculator.ts](src/utils/questCalculator.ts) `calculateQuestTotals()`
4. Create form component in `src/components/forms/`
5. Add to `AddEntryBottomSheet` type picker

### Adding UI Components
- Place in `src/components/ui/` and export from `index.ts`
- Use `StyleSheet.create()` - **NEVER inline styles** (performance)
- Apply theme constants - **NEVER hardcode colors/spacing**
- Add TypeScript props interface above component

### Badge System
- Badges defined in [src/utils/badges.ts](src/utils/badges.ts) with `id`/`name`/`description`/`icon`
- `checkBadges(entries, streak)` runs on entry changes, returns newly unlocked `BadgeId[]`
- Store only IDs in `appStore.unlockedBadges`, full badge data from `BADGE_DEFINITIONS`

### Internationalization (i18n)
- **i18next** + **react-i18next** for translations
- Locale files: `src/i18n/locales/en.json`, `fr.json`
- Initialized in [src/i18n/index.ts](src/i18n/index.ts), imported in [app/_layout.tsx](app/_layout.tsx)
- Usage: `const { t } = useTranslation();` → `t('key.path')`

---

## Common Pitfalls

- **Don't** use `react-native-mmkv` directly - storage adapter is in [src/storage/mmkv.ts](src/storage/mmkv.ts), use `zustandStorage`
- **Don't** forget to `recalculateAllQuests()` after entry changes - it doesn't auto-sync
- **Don't** break glassmorphism style - always semi-transparent backgrounds with borders
- **Don't** use outdated Expo Router patterns - this is v6 file-based routing only
- **Never** hardcode tab indexes or route paths - use `TAB_CONFIG` array and `route.name`
- **Never** use `npx` - always `bunx` (project uses Bun)
- **Streak calculation**: Uses `calculateStreak()` from [src/utils/date.ts](src/utils/date.ts) - checks consecutive days with sport entries
- **Social features**: Check `isSocialAvailable()` before using Supabase - returns false if not configured

---

## File Paths & Imports
TypeScript path aliases configured in `tsconfig.json`:
```typescript
import { Colors } from '@constants'; // or '../src/constants'
import { GlassCard } from '@components/ui';
```
Both absolute (`@/`) and relative paths work, but **prefer relative** for clarity.

---

## Key Files for Reference
- **[src/stores/appStore.ts](src/stores/appStore.ts)**: Main data store with computed getters
- **[src/stores/gamificationStore.ts](src/stores/gamificationStore.ts)**: XP/level/quest logic
- **[src/stores/socialStore.ts](src/stores/socialStore.ts)**: Optional social features
- **[app/_layout.tsx](app/_layout.tsx)**: Navigation structure and animation patterns
- **[src/constants/theme.ts](src/constants/theme.ts)**: Complete design system
- **[src/types/index.ts](src/types/index.ts)**: All TypeScript interfaces
- **[src/utils/questCalculator.ts](src/utils/questCalculator.ts)**: Gamification sync logic
- **[src/config/buildConfig.ts](src/config/buildConfig.ts)**: Build flavor detection
- **[src/services/healthConnect/index.ts](src/services/healthConnect/index.ts)**: Android Health Connect import
- **[README.md](README.md)**: Feature list and privacy philosophy
- **[docs/FOSS_BUILD_CHANGES.md](docs/FOSS_BUILD_CHANGES.md)**: Build flavor implementation details
