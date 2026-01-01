# FitTrack - AI Agent Instructions

## Project Overview
FitTrack is a React Native fitness tracking app built with **Expo 54** and **Expo Router v6** for file-based routing. It tracks workouts (home/run/beatsaber), meals, and measurements with a gamification layer featuring XP, levels, quests, and badges. The app uses a **glassmorphism dark theme** with carefully tuned animations and a persistent bottom tab navigation.

## Critical Architecture Patterns

### State Management: Zustand + AsyncStorage
- **Two main stores**: `appStore` (entries, settings, badges) and `gamificationStore` (XP, levels, quests)
- Both stores use `zustand/middleware/persist` with AsyncStorage adapter from `src/storage/mmkv.ts`
- **Important**: Store actions must update both local state AND recalculate dependent data. Example: when deleting an entry, call `recalculateAllQuests()` from gamificationStore
- State is persisted automatically - no manual save calls needed

### Gamification Sync Pattern
When modifying entries that affect XP/quests, ALWAYS follow this pattern:
```typescript
// After adding/deleting sport entries:
import { calculateQuestTotals } from '../src/utils/questCalculator';
const totals = calculateQuestTotals(entries);
recalculateAllQuests(totals); // Syncs quest progress
```
Quest types: `exercises`, `workouts`, `distance`, `duration`. The system tracks progress automatically and awards XP on completion.

### Data Types & Entry Structure
All entries extend `BaseEntry` with `id`, `type`, `createdAt` (ISO), and `date` (YYYY-MM-DD). Four entry types:
- `HomeWorkoutEntry`: freeform exercise text, optional abs block, totalReps for quest tracking
- `RunEntry`: distance/duration with auto-calculated avgSpeed
- `BeatSaberEntry`: duration with optional cardiac data
- `MealEntry` & `MeasureEntry`: tracking only, no gamification

Filter sport entries: `entries.filter(e => e.type === 'home' || e.type === 'run' || e.type === 'beatsaber')`

### Theme & Component Patterns
- **Glassmorphism cards**: Always use `<GlassCard variant="default|teal|solid">` from `src/components/ui`
- **Colors**: Import from `src/constants/theme.ts` - never hardcode colors. Main palette: `Colors.bg`, `Colors.card`, `Colors.cta`, `Colors.teal`
- **Animations**: Use `react-native-reanimated` with `useSharedValue` + `withTiming` for smooth transitions (see `app/_layout.tsx` tab buttons)
- **Spacing/Typography**: Use constants from theme.ts: `Spacing.xl`, `FontSize.lg`, `BorderRadius.xl`

### Navigation & Routing
- **Expo Router** file-based: screens in `app/` directory map to routes automatically
- Bottom tabs defined in `app/_layout.tsx` with custom animated tab bar (not `@gorhom/animated-tabbar`)
- Tab config: `TAB_CONFIG` array with name/label/Icon from `lucide-react-native`
- Navigate with `navigation.navigate(route.name)` - no manual path strings

### Bottom Sheets & Modals
- Use `@lodev09/react-native-true-sheet` for bottom sheets (see `AddEntryBottomSheet.tsx`)
- Expose ref methods: `present()`, `dismiss()`
- Always wrap in `GestureHandlerRootView` at screen root
- Modal patterns use custom `EntryDetailModal` component for entry details

## Developer Workflows

### Commands (use `bunx` not `npx`)
```bash
bunx expo start          # Dev server with QR code
bunx expo run:android    # Dev build on Android
bunx expo run:ios        # Dev build on iOS
```

### Adding New Entry Types
1. Define type in `src/types/index.ts` extending `BaseEntry`
2. Add action in `appStore.ts`: `add[Type]` with nanoid() ID and date helpers
3. Update quest calculator if affects gamification
4. Create form component in `src/components/forms/`
5. Add to `AddEntryBottomSheet` type picker

### Adding UI Components
- Place in `src/components/ui/` and export from `index.ts`
- Use StyleSheet.create, never inline styles for performance
- Apply theme constants, never hardcode values
- Add TypeScript props interface above component

### Badge System
- Badges defined in `src/utils/badges.ts` with id/name/description/icon
- `checkBadges()` runs on entry changes, returns newly unlocked BadgeIds
- Store only IDs in `appStore.unlockedBadges`, full badge data from `BADGE_DEFINITIONS`

## Common Pitfalls

- **Don't** use `react-native-mmkv` directly - it's imported but not used. Use AsyncStorage via `zustandStorage`
- **Don't** forget to recalculate quests when entries change - it won't auto-sync
- **Don't** break the glassmorphism style - always use semi-transparent backgrounds with borders
- **Don't** use outdated Expo Router patterns - this is v6 with file-based routing only
- **Never** hardcode tab indexes or route paths - use config arrays and route names
- **Streak calculation**: Uses `calculateStreak()` from `src/utils/date.ts` - checks consecutive days with sport entries

## File Paths & Imports
TypeScript path aliases configured in `tsconfig.json`:
```typescript
import { Colors } from '@constants'; // or '../src/constants'
import { GlassCard } from '@components/ui';
```
Both absolute (`@/`) and relative paths work, but prefer relative for clarity.

## Key Files for Reference
- **[src/stores/appStore.ts](src/stores/appStore.ts)**: Main data store structure and computed getters
- **[app/_layout.tsx](app/_layout.tsx)**: Navigation structure and animation patterns
- **[src/constants/theme.ts](src/constants/theme.ts)**: Complete design system
- **[src/types/index.ts](src/types/index.ts)**: All TypeScript interfaces
- **[src/utils/questCalculator.ts](src/utils/questCalculator.ts)**: Gamification sync logic
- **[README.md](README.md)**: Feature list and architecture diagram
