import { Text } from 'react-native';
import { Flame, Footprints, Gamepad2, Home, Ruler, UtensilsCrossed } from 'lucide-react-native';
import { ScreenPalettes } from '../../src/constants';
import type {
  Entry,
  HomeWorkoutEntry,
  RepTimelineData,
  RepTimelinePoint,
  RunEntry,
  SportConfig,
} from '../../src/types';

const C = ScreenPalettes.cool;

export type TranslateFunction = (key: string, options?: Record<string, unknown>) => string;

export const getEntryTypeConfig = (type: string, sportConfig?: SportConfig) => {
  switch (type) {
    case 'home':      return { icon: <Home size={22} color={C.green} />,       color: C.green,  bg: C.greenSoft,  border: C.greenBorder, emoji: '💪' };
    case 'run':       return { icon: <Footprints size={22} color={C.blue} />,  color: C.blue,   bg: C.blueSoft,   border: C.blueBorder, emoji: '🏃' };
    case 'beatsaber': return { icon: <Gamepad2 size={22} color={C.violet} />,  color: C.violet, bg: C.violetSoft, border: C.violetBorder, emoji: '🕹️' };
    case 'meal':      return { icon: <UtensilsCrossed size={22} color={C.gold} />, color: C.gold, bg: C.goldSoft, border: C.goldBorder, emoji: '🍽️' };
    case 'measure':   return { icon: <Ruler size={22} color={C.teal} />,       color: C.teal,   bg: C.tealSoft,   border: C.tealBorder, emoji: '📏' };
    case 'custom':
      if (sportConfig) {
        const color = sportConfig.color;
        return { icon: <Text style={{ fontSize: 20 }}>{sportConfig.emoji}</Text>, color, bg: `${color}15`, border: `${color}28`, emoji: sportConfig.emoji };
      }
      return { icon: <Flame size={22} color={C.ember} />, color: C.ember, bg: C.emberGlow, border: C.emberBorder, emoji: '🔥' };
    default:
      return { icon: <Flame size={22} color={C.ember} />, color: C.ember, bg: C.emberGlow, border: C.emberBorder, emoji: '🔥' };
  }
};

export const getTypeLabel = (type: string, t: TranslateFunction) => {
  const labels: Record<string, string> = {
    home: t('entries.workout'),
    run: t('entries.run'),
    beatsaber: t('entries.beatsaber'),
    meal: t('entries.meal'),
    measure: t('entries.measure'),
    custom: t('entries.custom'),
  };
  return labels[type] || type;
};

export function computeSessionStats(entry: Entry, allEntries: Entry[]) {
  const sameTypeEntries = allEntries
    .filter(e => e.type === entry.type && e.id !== entry.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const lastSameType = sameTypeEntries[0] || null;
  const last3SameType = sameTypeEntries.slice(0, 3);

  const getMetrics = (e: Entry) => {
    const m: Record<string, number> = {};
    if ('durationMinutes' in e && typeof e.durationMinutes === 'number') m.duration = e.durationMinutes;
    if ('distanceKm' in e && typeof e.distanceKm === 'number') m.distance = e.distanceKm;
    if ('totalReps' in e && typeof e.totalReps === 'number') m.reps = e.totalReps;
    if ('calories' in e && typeof e.calories === 'number') m.calories = e.calories;
    return m;
  };

  const currentMetrics = getMetrics(entry);
  const lastMetrics = lastSameType ? getMetrics(lastSameType) : null;

  const deltas: Record<string, number> = {};
  if (lastMetrics) {
    for (const key of Object.keys(currentMetrics)) {
      if (lastMetrics[key]) {
        deltas[key] = ((currentMetrics[key] - lastMetrics[key]) / lastMetrics[key]) * 100;
      }
    }
  }

  const allSameType = allEntries.filter(e => e.type === entry.type);
  let isBestSession = false;

  if (entry.type === 'run') {
    const bestDistance = Math.max(...allSameType.map(e => (e as RunEntry).distanceKm || 0));
    isBestSession = ((entry as RunEntry).distanceKm || 0) >= bestDistance;
  } else if (entry.type === 'home') {
    const bestReps = Math.max(...allSameType.map(e => (e as HomeWorkoutEntry).totalReps || 0));
    isBestSession = ((entry as HomeWorkoutEntry).totalReps || 0) >= bestReps && bestReps > 0;
  } else if (entry.type === 'beatsaber' || entry.type === 'custom') {
    const bestDuration = Math.max(...allSameType.map((item) => (
      'durationMinutes' in item && typeof item.durationMinutes === 'number' ? item.durationMinutes : 0
    )));
    const currentDuration = 'durationMinutes' in entry && typeof entry.durationMinutes === 'number'
      ? entry.durationMinutes
      : 0;
    isBestSession = currentDuration >= bestDuration && bestDuration > 0;
  }

  const progressionMetrics = last3SameType.map(e => getMetrics(e));

  return {
    lastSameType,
    last3SameType,
    currentMetrics,
    lastMetrics,
    deltas,
    isBestSession,
    progressionMetrics,
    sameTypeCount: allSameType.length,
  };
}

export interface RepInsights {
  reps: RepTimelinePoint[];
  sessionStartMs: number;
  averageRestMs: number | null;
  totalActiveMs: number;
  totalRestMs: number;
  fastestRepMs: number;
  slowestRepMs: number;
  averageRepMs: number;
  consistencyScore: number;
}

export type RepChartMetricKey = 'repNumber' | 'elapsedSeconds' | 'durationSeconds' | 'restBeforeSeconds';

export interface RepChartRow {
  repNumber: number;
  elapsedSeconds: number;
  durationSeconds: number;
  restBeforeSeconds: number | null;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function computeRepInsights(repTimeline?: RepTimelineData | null): RepInsights | null {
  if (!repTimeline?.reps?.length) {
    return null;
  }

  const reps = [...repTimeline.reps]
    .filter((rep) => rep.endTimeMs >= rep.startTimeMs)
    .sort((a, b) => a.repNumber - b.repNumber);

  if (!reps.length) {
    return null;
  }

  const durations = reps.map((rep) => Math.max(0, rep.durationMs));
  const restDurations = reps
    .map((rep, index) => {
      if (index === 0) return null;

      if (rep.restMsBefore != null) {
        return Math.max(0, rep.restMsBefore);
      }

      const previous = reps[index - 1];
      return Math.max(0, rep.startTimeMs - previous.endTimeMs);
    })
    .filter((value): value is number => value != null);

  const totalActiveMs = durations.reduce((sum, value) => sum + value, 0);
  const totalRestMs = restDurations.reduce((sum, value) => sum + value, 0);
  const averageRepMs = totalActiveMs / durations.length;
  const averageRestMs = restDurations.length ? totalRestMs / restDurations.length : null;
  const fastestRepMs = Math.min(...durations);
  const slowestRepMs = Math.max(...durations);

  const variance = durations.reduce((sum, value) => sum + Math.pow(value - averageRepMs, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = averageRepMs > 0 ? stdDev / averageRepMs : 0;
  const consistencyScore = Math.round(clamp((1 - coefficientOfVariation) * 100, 0, 100));

  const parsedStart = Date.parse(repTimeline.sessionStartedAt);
  const sessionStartMs = Number.isFinite(parsedStart) ? parsedStart : reps[0].startTimeMs;

  return {
    reps,
    sessionStartMs,
    averageRestMs,
    totalActiveMs,
    totalRestMs,
    fastestRepMs,
    slowestRepMs,
    averageRepMs,
    consistencyScore,
  };
}
