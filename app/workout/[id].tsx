import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
} from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Home,
  UtensilsCrossed,
  Ruler,
  Clock,
  TrendingUp,
  Flame,
  Activity,
  Zap,
  Calendar,
  Bot,
  Trash2,
  Edit3,
  RefreshCw,
  Navigation,
  Mountain,
  Share2,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import { shareGPXFile } from '../../src/services/gpxExport';
import { getMapLibreModule } from '../../src/services/maplibre';
import { storageHelpers } from '../../src/storage/mmkv';
import { useAppStore, useSettings, useSportsConfig } from '../../src/stores';
import { useGamificationStore } from '../../src/stores';
import { formatDisplayDate, getRelativeTime } from '../../src/utils/date';
import { generateTextAnalysis } from '../../src/services/pollination/textAnalysis';
import { isPollinationConnected } from '../../src/services/pollination';
import i18n from '../../src/i18n';
import { Colors, ScreenPalettes } from '../../src/constants';
import { styles } from './_workout-detail.styles';
import {
  clamp,
  computeRepInsights,
  computeSessionStats,
  getEntryTypeConfig,
  getTypeLabel,
  type RepChartMetricKey,
  type RepChartRow,
} from './_workout-detail-helpers';
import type {
  Entry,
  HomeWorkoutEntry,
  RunEntry,
  BeatSaberEntry,
  MealEntry,
  MeasureEntry,
  CustomSportEntry,
  SportConfig,
} from '../../src/types';

const { width: SW } = Dimensions.get('window');
const MapLibreRN = getMapLibreModule();

const C = ScreenPalettes.cool;
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 44 };
type RoutePoint = { longitude: number; latitude: number };
type RouteLineFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
};
type RouteFeatureCollection = { type: 'FeatureCollection'; features: RouteLineFeature[] };

const StatRow = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) => (
  <View style={styles.statRow}>
    <View style={[styles.statIcon, color ? { backgroundColor: `${color}15` } : {}]}>
      {icon}
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
  </View>
);

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { entries, deleteEntry } = useAppStore();
  const settings = useSettings();
  const aiFeaturesEnabled = settings.aiFeaturesEnabled ?? false;
  const sportsConfig = useSportsConfig();
  const { xp, level } = useGamificationStore();



  const entry = useMemo(() => entries.find(e => e.id === id), [entries, id]);

  const sportConfig = useMemo(() => {
    if (entry?.type === 'custom') {
      return sportsConfig.find((s: SportConfig) => s.id === (entry as CustomSportEntry).sportId);
    }
    return undefined;
  }, [entry, sportsConfig]);

  const typeConfig = useMemo(() => {
    if (!entry) return null;
    return getEntryTypeConfig(entry.type, sportConfig);
  }, [entry, sportConfig]);

  const sessionStats = useMemo(() => {
    if (!entry) return null;
    return computeSessionStats(entry, entries);
  }, [entry, entries]);

  const homeEntry = useMemo(() => {
    if (entry?.type !== 'home') return null;
    return entry as HomeWorkoutEntry;
  }, [entry]);

  const repInsights = useMemo(() => {
    return computeRepInsights(homeEntry?.repTimeline);
  }, [homeEntry?.repTimeline]);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [showRepInsights, setShowRepInsights] = useState(true);
  const [chartZoom, setChartZoom] = useState(1);
  const [chartWidth, setChartWidth] = useState(0);
  const [selectedRepIndex, setSelectedRepIndex] = useState<number | null>(null);
  const [chartXAxisMetric, setChartXAxisMetric] = useState<RepChartMetricKey>('elapsedSeconds');
  const [chartYAxisMetric, setChartYAxisMetric] = useState<RepChartMetricKey>('repNumber');

  useEffect(() => {
    if (!repInsights?.reps.length) {
      setSelectedRepIndex(null);
      return;
    }

    setSelectedRepIndex(repInsights.reps.length - 1);
  }, [repInsights?.reps.length]);

  const formatClock = useCallback((totalSeconds: number) => {
    const safeSeconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const formatRepDuration = useCallback((valueMs: number) => {
    return `${(valueMs / 1000).toFixed(1)} ${t('common.seconds')}`;
  }, [t]);

  const formatTotalDuration = useCallback((valueMs: number) => {
    return formatClock(valueMs / 1000);
  }, [formatClock]);

  const chartSpacing = useMemo(() => Math.round(28 * chartZoom), [chartZoom]);

  const repChartRows = useMemo<RepChartRow[]>(() => {
    if (!repInsights) return [];

    return repInsights.reps.map((rep, index) => {
      const previous = index > 0 ? repInsights.reps[index - 1] : null;
      const restMs = index === 0
        ? null
        : (rep.restMsBefore != null
          ? Math.max(0, rep.restMsBefore)
          : Math.max(0, rep.startTimeMs - (previous?.endTimeMs ?? rep.startTimeMs)));

      return {
        repNumber: rep.repNumber,
        elapsedSeconds: Math.max(0, (rep.endTimeMs - repInsights.sessionStartMs) / 1000),
        durationSeconds: Math.max(0, rep.durationMs / 1000),
        restBeforeSeconds: restMs == null ? null : restMs / 1000,
      };
    });
  }, [repInsights]);

  const chartMetricOptions = useMemo(() => ([
    { key: 'repNumber' as RepChartMetricKey, label: t('workout.detail.repInsights.metricRepNumber') },
    { key: 'elapsedSeconds' as RepChartMetricKey, label: t('workout.detail.repInsights.metricElapsed') },
    { key: 'durationSeconds' as RepChartMetricKey, label: t('workout.detail.repInsights.metricDuration') },
    { key: 'restBeforeSeconds' as RepChartMetricKey, label: t('workout.detail.repInsights.metricRestBefore') },
  ]), [t]);

  const getChartMetricValue = useCallback((row: RepChartRow, metric: RepChartMetricKey): number | null => {
    if (metric === 'repNumber') return row.repNumber;
    if (metric === 'elapsedSeconds') return row.elapsedSeconds;
    if (metric === 'durationSeconds') return row.durationSeconds;
    return row.restBeforeSeconds;
  }, []);

  const formatChartMetricValue = useCallback((metric: RepChartMetricKey, value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) {
      return t('workout.detail.repInsights.notAvailable');
    }

    if (metric === 'repNumber') {
      return `${Math.round(value)}`;
    }

    if (metric === 'elapsedSeconds') {
      return formatClock(value);
    }

    return `${value.toFixed(1)} ${t('common.seconds')}`;
  }, [formatClock, t]);

  const repChartData = useMemo(() => {
    if (repChartRows.length === 0) return [];

    return repChartRows.map((row, index) => {
      const xValue = getChartMetricValue(row, chartXAxisMetric);
      const yValue = getChartMetricValue(row, chartYAxisMetric);
      const shouldLabel = index === 0 || index === repChartRows.length - 1 || (index + 1) % 5 === 0;

      return {
        value: yValue == null || !Number.isFinite(yValue) ? 0 : yValue,
        label: shouldLabel ? formatChartMetricValue(chartXAxisMetric, xValue) : '',
        dataPointColor: selectedRepIndex === index ? C.gold : C.violet,
        onPress: () => setSelectedRepIndex(index),
      };
    });
  }, [
    chartXAxisMetric,
    chartYAxisMetric,
    formatChartMetricValue,
    getChartMetricValue,
    repChartRows,
    selectedRepIndex,
  ]);

  const chartMaxValue = useMemo(() => {
    const values = repChartRows
      .map((row) => getChartMetricValue(row, chartYAxisMetric))
      .filter((value): value is number => value != null && Number.isFinite(value));

    if (values.length === 0) return 1;
    const max = Math.max(...values);
    return Math.max(1, Math.ceil(max * 1.1));
  }, [chartYAxisMetric, getChartMetricValue, repChartRows]);

  const selectedRep = useMemo(() => {
    if (!repInsights || selectedRepIndex == null) return null;
    return repInsights.reps[selectedRepIndex] ?? null;
  }, [repInsights, selectedRepIndex]);

  const selectedRepRow = useMemo(() => {
    if (selectedRepIndex == null) return null;
    return repChartRows[selectedRepIndex] ?? null;
  }, [repChartRows, selectedRepIndex]);

  const selectedRepRestMs = useMemo(() => {
    if (!repInsights || selectedRepIndex == null || selectedRepIndex === 0) return null;

    const rep = repInsights.reps[selectedRepIndex];
    if (rep.restMsBefore != null) return Math.max(0, rep.restMsBefore);

    const previous = repInsights.reps[selectedRepIndex - 1];
    return Math.max(0, rep.startTimeMs - previous.endTimeMs);
  }, [repInsights, selectedRepIndex]);

  const handleRepPointFocus = useCallback((_: unknown, index?: number) => {
    if (typeof index === 'number' && index >= 0) {
      setSelectedRepIndex(index);
    }
  }, []);

  const fetchAnalysis = useCallback(async (force: boolean = false) => {
    if (!aiFeaturesEnabled) return;
    if (!entry || !settings.aiWorkoutEnabled || !isConnected) return;
    if (!['home', 'run', 'beatsaber', 'custom'].includes(entry.type)) return;
    if (!sessionStats) return;

    const cacheKey = `aiAnalysis:${entry.id}:${settings.aiModel || 'openai'}:${i18n.language}:${settings.aiTone || 'neutral'}`;
    if (!force) {
      const cached = await storageHelpers.getString(cacheKey) as string | null;
      if (cached) {
        setAiAnalysis(cached);
        return;
      }
    }

    setAiLoading(true);
    setAiError(false);
    try {
      const lang = ({ fr: 'français', it: 'italiano', de: 'Deutsch' } as Record<string, string>)[i18n.language] ?? 'English';
      const typeLabel = getTypeLabel(entry.type, t);

      const toneDesc = settings.aiTone === 'technical'
        ? 'Use a precise, technical tone.'
        : settings.aiTone === 'warm'
        ? 'Use a very warm and encouraging tone.'
        : 'Use a neutral balanced tone.';

      // Build pre-calculated stats for the prompt
      const statsLines: string[] = [];
      statsLines.push(`Activity type: ${typeLabel}`);
      statsLines.push(`Date: ${formatDisplayDate(entry.date)}`);

      const cm = sessionStats.currentMetrics;
      if (cm.duration) statsLines.push(`Duration: ${cm.duration} min`);
      if (cm.distance) statsLines.push(`Distance: ${cm.distance} km`);
      if (cm.reps) statsLines.push(`Total reps: ${cm.reps}`);
      if (cm.calories) statsLines.push(`Calories: ${cm.calories}`);

      if (sessionStats.isBestSession) {
        statsLines.push('⭐ This is the BEST session ever for this activity type!');
      }

      if (sessionStats.lastMetrics) {
        statsLines.push('\nComparison with last session of the same type:');
        for (const [key, delta] of Object.entries(sessionStats.deltas)) {
          const sign = delta >= 0 ? '+' : '';
          statsLines.push(`  ${key}: ${sign}${delta.toFixed(1)}%`);
        }
      }

      if (sessionStats.last3SameType.length > 0) {
        statsLines.push(`\nTotal sessions of this type: ${sessionStats.sameTypeCount}`);
        statsLines.push(`Last 3 sessions metrics:`);
        sessionStats.progressionMetrics.forEach((m, i) => {
          const parts = Object.entries(m).map(([k, v]) => `${k}=${v}`).join(', ');
          statsLines.push(`  Session ${i + 1}: ${parts || 'N/A'}`);
        });
      }

      if (entry.type === 'home') {
        const he = entry as HomeWorkoutEntry;
        if (he.exercises) statsLines.push(`\nExercises done:\n${he.exercises}`);
        if (he.absBlock) statsLines.push('Includes abs block');
      }

      const systemPrompt = `You are Ploppy, a motivating and friendly fitness coach assistant. ${toneDesc} You analyze workout sessions and provide encouraging, personalized feedback. Respond in ${lang}. Keep your response concise (4-6 sentences). Use emojis sparingly. Be specific about the data provided.`;

      const userPrompt = `Here are the pre-calculated statistics for this workout session:\n\n${statsLines.join('\n')}\n\nProvide a brief analysis: what went well, areas for improvement, and a motivational tip for the next session of this type. Be specific about the numbers provided.`;

      const result = await generateTextAnalysis({
        systemPrompt,
        userPrompt,
        model: settings.aiModel || 'openai',
      });
      setAiAnalysis(result);
      await storageHelpers.setString(cacheKey, result);
    } catch (error) {
      if (__DEV__) {
        console.warn('[WorkoutDetail] AI analysis failed', error);
      }
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, [aiFeaturesEnabled, entry?.id, settings.aiWorkoutEnabled, isConnected, sessionStats, t, settings.aiModel, settings.aiTone]);

  useEffect(() => {
    if (!aiFeaturesEnabled) {
      setIsConnected(false);
      return;
    }
    void isPollinationConnected()
      .then(setIsConnected)
      .catch((error) => {
        if (__DEV__) {
          console.warn('[WorkoutDetail] Pollination connectivity check failed', error);
        }
        setIsConnected(false);
      });
  }, [aiFeaturesEnabled]);

  useEffect(() => {
    if (aiFeaturesEnabled && entry && settings.aiWorkoutEnabled && isConnected && isSport && sessionStats) {
      fetchAnalysis();
    }
  }, [aiFeaturesEnabled, entry?.id, settings.aiWorkoutEnabled, isConnected, sessionStats, settings.aiModel, settings.aiTone, i18n.language]);


  if (!entry || !typeConfig) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{t('errors.notFound')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleDelete = () => setDeleteModalVisible(true);

  const confirmDelete = () => {
    setDeleteModalVisible(false);
    deleteEntry(entry.id);
    router.back();
  };

  const renderContent = () => {
    switch (entry.type) {
      case 'home': {
        const e = entry as HomeWorkoutEntry;
        return (
          <>
            {e.name && (
              <StatRow icon={<Home size={16} color={C.green} />} label={t('forms.workoutName')} value={e.name} />
            )}
            {e.durationMinutes !== undefined && (
              <StatRow icon={<Clock size={16} color={C.textSub} />} label={t('workout.detail.duration')} value={`${e.durationMinutes} min`} />
            )}
            {e.totalReps !== undefined && e.totalReps > 0 && (
              <StatRow icon={<TrendingUp size={16} color={C.green} />} label={t('workout.detail.reps')} value={`${e.totalReps}`} color={C.green} />
            )}
            {e.absBlock && (
              <View style={[styles.tagBadge, { backgroundColor: C.emberGlow, borderColor: C.emberBorder }]}>
                <Flame size={12} color={C.ember} />
                <Text style={[styles.tagText, { color: C.ember }]}>{t('workout.detail.absBlock')}</Text>
              </View>
            )}
            {e.exercises && (
              <Animated.View entering={FadeInDown.delay(200)} style={styles.exercisesCard}>
                <Text style={styles.exercisesLabel}>{t('workout.detail.exercises')}</Text>
                <Text style={styles.exercisesText}>{e.exercises}</Text>
              </Animated.View>
            )}
          </>
        );
      }
      case 'run': {
        const e = entry as RunEntry;
        const hasRoute = e.route && e.route.length >= 2;
        const routeGeoJSON: RouteFeatureCollection = hasRoute ? {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: e.route!.map((c: RoutePoint) => [c.longitude, c.latitude] as [number, number]),
            },
          }],
        } : { type: 'FeatureCollection', features: [] };

        // Calculate bounds for the route
        const routeBounds = hasRoute ? (() => {
          const lngs = e.route!.map((c: RoutePoint) => c.longitude);
          const lats = e.route!.map((c: RoutePoint) => c.latitude);
          return {
            ne: [Math.max(...lngs) + 0.002, Math.max(...lats) + 0.002] as [number, number],
            sw: [Math.min(...lngs) - 0.002, Math.min(...lats) - 0.002] as [number, number],
          };
        })() : null;

        return (
          <>
            {/* Mini-map */}
            {hasRoute && MapLibreRN && (
              <View style={styles.miniMapWrap}>
                <MapLibreRN.MapView
                  style={styles.miniMap}
                  mapStyle="https://tiles.openfreemap.org/styles/dark"
                  logoEnabled={false}
                  attributionEnabled={false}
                  compassEnabled={false}
                  scrollEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  zoomEnabled={false}
                >
                  <MapLibreRN.Camera
                    defaultSettings={{
                      centerCoordinate: [
                        (routeBounds!.ne[0] + routeBounds!.sw[0]) / 2,
                        (routeBounds!.ne[1] + routeBounds!.sw[1]) / 2,
                      ],
                      zoomLevel: 14,
                    }}
                    bounds={{
                      ne: routeBounds!.ne,
                      sw: routeBounds!.sw,
                      paddingLeft: 30,
                      paddingRight: 30,
                      paddingTop: 30,
                      paddingBottom: 30,
                    }}
                  />
                  <MapLibreRN.ShapeSource id="routeDetail" shape={routeGeoJSON}>
                    <MapLibreRN.LineLayer
                      id="routeDetailLine"
                      style={{
                        lineColor: C.blue,
                        lineWidth: 3,
                        lineJoin: 'round',
                        lineCap: 'round',
                      }}
                    />
                  </MapLibreRN.ShapeSource>
                </MapLibreRN.MapView>
              </View>
            )}

            <StatRow icon={<Navigation size={16} color={C.blue} />} label={t('workout.detail.distance')} value={`${e.distanceKm} km`} color={C.blue} />
            <StatRow icon={<Clock size={16} color={C.textSub} />} label={t('workout.detail.duration')} value={`${e.durationMinutes} min`} />
            {e.avgPaceSecPerKm != null && (
              <StatRow icon={<Zap size={16} color={C.green} />} label={t('run.avgPace')} value={`${Math.floor(e.avgPaceSecPerKm / 60)}:${String(Math.floor(e.avgPaceSecPerKm % 60)).padStart(2, '0')}/km`} color={C.green} />
            )}
            {e.avgSpeed != null && (
              <StatRow icon={<Zap size={16} color={C.gold} />} label={t('workout.detail.speed')} value={`${e.avgSpeed} km/h`} color={C.gold} />
            )}
            {e.elevationGainM != null && e.elevationGainM > 0 && (
              <StatRow icon={<Mountain size={16} color={C.textSub} />} label={t('run.elevation')} value={`+${e.elevationGainM} m`} />
            )}
            {e.calories != null && (
              <StatRow icon={<Flame size={16} color={C.gold} />} label={t('run.calories')} value={`${e.calories} kcal`} color={C.gold} />
            )}
            {e.bpmAvg != null && (
              <StatRow icon={<Activity size={16} color={C.error} />} label={t('workout.detail.bpmAvg')} value={`${e.bpmAvg}`} color={C.error} />
            )}
            {e.bpmMax != null && (
              <StatRow icon={<Activity size={16} color={C.error} />} label={t('workout.detail.bpmMax')} value={`${e.bpmMax}`} color={C.error} />
            )}
            {e.cardiacLoad != null && (
              <StatRow icon={<Zap size={16} color={C.violet} />} label={t('workout.detail.cardiacLoad')} value={`${e.cardiacLoad}`} color={C.violet} />
            )}

            {/* GPX share button */}
            {e.gpxFilePath && (
              <TouchableOpacity
                onPress={() => shareGPXFile(e.gpxFilePath as string)}
                style={styles.gpxShareBtn}
              >
                <Share2 size={16} color={C.blue} />
                <Text style={styles.gpxShareText}>{t('run.shareGPX')}</Text>
              </TouchableOpacity>
            )}
          </>
        );
      }
      case 'beatsaber': {
        const e = entry as BeatSaberEntry;
        return (
          <>
            <StatRow icon={<Clock size={16} color={C.textSub} />} label={t('workout.detail.duration')} value={`${e.durationMinutes} min`} />
            {e.bpmAvg !== undefined && (
              <StatRow icon={<Activity size={16} color={C.error} />} label={t('workout.detail.bpmAvg')} value={`${e.bpmAvg}`} color={C.error} />
            )}
            {e.bpmMax !== undefined && (
              <StatRow icon={<Activity size={16} color={C.error} />} label={t('workout.detail.bpmMax')} value={`${e.bpmMax}`} color={C.error} />
            )}
            {e.cardiacLoad !== undefined && (
              <StatRow icon={<Zap size={16} color={C.violet} />} label={t('workout.detail.cardiacLoad')} value={`${e.cardiacLoad}`} color={C.violet} />
            )}
          </>
        );
      }
      case 'meal': {
        const e = entry as MealEntry;
        return (
          <>
            {e.mealName && (
              <StatRow icon={<UtensilsCrossed size={16} color={C.gold} />} label={t('workout.detail.mealName')} value={e.mealName} />
            )}
            {e.description && (
              <Animated.View entering={FadeInDown.delay(200)} style={styles.exercisesCard}>
                <Text style={styles.exercisesLabel}>{t('workout.detail.description')}</Text>
                <Text style={styles.exercisesText}>{e.description}</Text>
              </Animated.View>
            )}
            {e.score !== undefined && (
              <StatRow icon={<Zap size={16} color={C.gold} />} label={t('workout.detail.score')} value={`${e.score}/100`} color={C.gold} />
            )}
            {e.suggestions && e.suggestions.length > 0 && (
              <Animated.View entering={FadeInDown.delay(250)} style={styles.exercisesCard}>
                <Text style={styles.exercisesLabel}>{t('workout.detail.suggestions')}</Text>
                {e.suggestions.map((s, i) => (
                  <Text key={`${s}-${i}`} style={styles.exercisesText}>• {s}</Text>
                ))}
              </Animated.View>
            )}
          </>
        );
      }
      case 'measure': {
        const e = entry as MeasureEntry;
        return (
          <>
            {e.weight !== undefined && (
              <StatRow icon={<Ruler size={16} color={C.teal} />} label={t('workout.detail.weight')} value={`${e.weight} kg`} color={C.teal} />
            )}
            {e.bodyFatPercent !== undefined && (
              <StatRow icon={<TrendingUp size={16} color={C.gold} />} label={t('workout.detail.bodyFat')} value={`${e.bodyFatPercent}%`} color={C.gold} />
            )}
            {e.waist !== undefined && (
              <StatRow icon={<Ruler size={16} color={C.textSub} />} label={t('workout.detail.waist')} value={`${e.waist} cm`} />
            )}
            {e.arm !== undefined && (
              <StatRow icon={<Ruler size={16} color={C.textSub} />} label={t('workout.detail.arm')} value={`${e.arm} cm`} />
            )}
            {e.hips !== undefined && (
              <StatRow icon={<Ruler size={16} color={C.textSub} />} label={t('workout.detail.hips')} value={`${e.hips} cm`} />
            )}
          </>
        );
      }
      case 'custom': {
        const e = entry as CustomSportEntry;
        return (
          <>
            {e.durationMinutes !== undefined && (
              <StatRow icon={<Clock size={16} color={C.textSub} />} label={t('workout.detail.duration')} value={`${e.durationMinutes} min`} />
            )}
            {e.distanceKm !== undefined && (
              <StatRow icon={<TrendingUp size={16} color={C.blue} />} label={t('workout.detail.distance')} value={`${e.distanceKm} km`} color={C.blue} />
            )}
            {e.totalReps !== undefined && e.totalReps > 0 && (
              <StatRow icon={<TrendingUp size={16} color={C.green} />} label={t('workout.detail.reps')} value={`${e.totalReps}`} color={C.green} />
            )}
            {e.calories !== undefined && (
              <StatRow icon={<Flame size={16} color={C.gold} />} label={t('workout.detail.calories')} value={`${e.calories} kcal`} color={C.gold} />
            )}
            {e.bpmAvg !== undefined && (
              <StatRow icon={<Activity size={16} color={C.error} />} label={t('workout.detail.bpmAvg')} value={`${e.bpmAvg}`} color={C.error} />
            )}
            {e.exercises && (
              <Animated.View entering={FadeInDown.delay(200)} style={styles.exercisesCard}>
                <Text style={styles.exercisesLabel}>{t('workout.detail.exercises')}</Text>
                <Text style={styles.exercisesText}>{e.exercises}</Text>
              </Animated.View>
            )}
          </>
        );
      }
      default:
        return null;
    }
  };

  const isSport = ['home', 'run', 'beatsaber', 'custom'].includes(entry.type);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Background glow */}
      <LinearGradient
        colors={[`${typeConfig.color}12`, 'transparent']}
        style={styles.bgGlow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.delay(50)} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
            <Trash2 size={18} color={C.error} />
          </TouchableOpacity>
        </Animated.View>

        {/* Type badge + title */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.typeBadgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg, borderColor: typeConfig.border }]}>
            {typeConfig.icon}
            <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
              {sportConfig?.name || getTypeLabel(entry.type, t)}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)}>
          <Text style={styles.title}>{t('workout.detail.title')}</Text>
          <View style={styles.dateRow}>
            <Calendar size={13} color={C.textMuted} />
            <Text style={styles.dateText}>{formatDisplayDate(entry.date)}</Text>
            <View style={styles.dot} />
            <Text style={styles.dateText}>{getRelativeTime(entry.createdAt)}</Text>
          </View>
        </Animated.View>

        {/* Best session badge */}
        {sessionStats?.isBestSession && isSport && (
          <Animated.View entering={FadeInRight.delay(250)} style={styles.bestBadge}>
            <LinearGradient
              colors={[Colors.overlayGold15, Colors.overlayWhite05]}
              style={styles.bestBadgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.bestBadgeText}>{t('workout.ai.bestSession')}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Stats card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.statsCard}>
          {renderContent()}
        </Animated.View>

        {/* Rep insights (tracked rep-counter sessions) */}
        {entry.type === 'home' && (
          <Animated.View entering={FadeInDown.delay(260)} style={styles.repInsightsCard}>
            <TouchableOpacity
              style={styles.repInsightsHeader}
              onPress={() => setShowRepInsights((prev) => !prev)}
              accessibilityLabel={showRepInsights ? t('workout.detail.repInsights.collapse') : t('workout.detail.repInsights.expand')}
            >
              <View style={styles.repInsightsHeaderLeft}>
                <TrendingUp size={16} color={C.violet} />
                <Text style={styles.repInsightsTitle}>{t('workout.detail.repInsights.title')}</Text>
              </View>
              {showRepInsights ? <ChevronUp size={18} color={C.textMuted} /> : <ChevronDown size={18} color={C.textMuted} />}
            </TouchableOpacity>

            {showRepInsights && (
              repInsights ? (
                <>
                  <View style={styles.repMetricGrid}>
                    <View style={styles.repMetricCard}>
                      <Text style={styles.repMetricLabel}>{t('workout.detail.repInsights.averageRest')}</Text>
                      <Text style={styles.repMetricValue}>
                        {repInsights.averageRestMs == null ? t('workout.detail.repInsights.notAvailable') : formatRepDuration(repInsights.averageRestMs)}
                      </Text>
                    </View>
                    <View style={styles.repMetricCard}>
                      <Text style={styles.repMetricLabel}>{t('workout.detail.repInsights.averageRep')}</Text>
                      <Text style={styles.repMetricValue}>{formatRepDuration(repInsights.averageRepMs)}</Text>
                    </View>
                    <View style={styles.repMetricCard}>
                      <Text style={styles.repMetricLabel}>{t('workout.detail.repInsights.totalActive')}</Text>
                      <Text style={styles.repMetricValue}>{formatTotalDuration(repInsights.totalActiveMs)}</Text>
                    </View>
                    <View style={styles.repMetricCard}>
                      <Text style={styles.repMetricLabel}>{t('workout.detail.repInsights.totalRest')}</Text>
                      <Text style={styles.repMetricValue}>{formatTotalDuration(repInsights.totalRestMs)}</Text>
                    </View>
                    <View style={styles.repMetricCard}>
                      <Text style={styles.repMetricLabel}>{t('workout.detail.repInsights.fastestRep')}</Text>
                      <Text style={styles.repMetricValue}>{formatRepDuration(repInsights.fastestRepMs)}</Text>
                    </View>
                    <View style={styles.repMetricCard}>
                      <Text style={styles.repMetricLabel}>{t('workout.detail.repInsights.slowestRep')}</Text>
                      <Text style={styles.repMetricValue}>{formatRepDuration(repInsights.slowestRepMs)}</Text>
                    </View>
                  </View>

                  <View style={styles.consistencyRow}>
                    <Text style={styles.consistencyLabel}>{t('workout.detail.repInsights.consistency')}</Text>
                    <Text style={styles.consistencyValue}>
                      {t('workout.detail.repInsights.consistencyValue', { value: repInsights.consistencyScore })}
                    </Text>
                  </View>

                  <View
                    style={styles.repChartWrap}
                    onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
                  >
                    <View style={styles.repChartHeader}>
                      <Text style={styles.repChartTitle}>{t('workout.detail.repInsights.chartTitle')}</Text>
                      <View style={styles.repChartZoomControls}>
                        <TouchableOpacity
                          style={styles.repChartZoomBtn}
                          onPress={() => setChartZoom((prev) => clamp(prev - 0.2, 0.8, 1.8))}
                          accessibilityLabel={t('workout.detail.repInsights.zoomOut')}
                        >
                          <ZoomOut size={14} color={C.textSub} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.repChartZoomBtn}
                          onPress={() => setChartZoom((prev) => clamp(prev + 0.2, 0.8, 1.8))}
                          accessibilityLabel={t('workout.detail.repInsights.zoomIn')}
                        >
                          <ZoomIn size={14} color={C.textSub} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.repAxisControls}>
                      <View style={styles.repAxisGroup}>
                        <Text style={styles.repAxisGroupLabel}>{t('workout.detail.repInsights.xAxis')}</Text>
                        <View style={styles.repAxisChipRow}>
                          {chartMetricOptions.map((option) => {
                            const isActive = chartXAxisMetric === option.key;
                            const chipStyle = isActive
                              ? [styles.repAxisChip, styles.repAxisChipActive]
                              : styles.repAxisChip;
                            const chipTextStyle = isActive
                              ? [styles.repAxisChipText, styles.repAxisChipTextActive]
                              : styles.repAxisChipText;

                            return (
                              <TouchableOpacity
                                key={`x-${option.key}`}
                                style={chipStyle}
                                activeOpacity={0.82}
                                onPress={() => setChartXAxisMetric(option.key)}
                              >
                                <Text style={chipTextStyle}>{option.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.repAxisGroup}>
                        <Text style={styles.repAxisGroupLabel}>{t('workout.detail.repInsights.yAxis')}</Text>
                        <View style={styles.repAxisChipRow}>
                          {chartMetricOptions.map((option) => {
                            const isActive = chartYAxisMetric === option.key;
                            const chipStyle = isActive
                              ? [styles.repAxisChip, styles.repAxisChipActive]
                              : styles.repAxisChip;
                            const chipTextStyle = isActive
                              ? [styles.repAxisChipText, styles.repAxisChipTextActive]
                              : styles.repAxisChipText;

                            return (
                              <TouchableOpacity
                                key={`y-${option.key}`}
                                style={chipStyle}
                                activeOpacity={0.82}
                                onPress={() => setChartYAxisMetric(option.key)}
                              >
                                <Text style={chipTextStyle}>{option.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>

                    <Text style={styles.repChartHint}>{t('workout.detail.repInsights.panHint')}</Text>

                    <LineChart
                      data={repChartData}
                      spacing={chartSpacing}
                      initialSpacing={16}
                      thickness={3}
                      color={C.teal}
                      dataPointsColor={C.violet}
                      dataPointsRadius={4}
                      noOfSections={4}
                      maxValue={chartMaxValue}
                      yAxisColor={C.border}
                      xAxisColor={C.border}
                      yAxisTextStyle={styles.repChartAxisText}
                      xAxisLabelTextStyle={styles.repChartAxisText}
                      rulesColor={C.border}
                      hideRules={false}
                      adjustToWidth={false}
                      disableScroll={false}
                      nestedScrollEnabled
                      showScrollIndicator
                      scrollEventThrottle={16}
                      focusEnabled
                      focusedDataPointIndex={selectedRepIndex ?? undefined}
                      onFocus={handleRepPointFocus}
                      onPress={handleRepPointFocus}
                      unFocusOnPressOut={false}
                      width={Math.max(Math.max(chartWidth - 24, 220), repChartData.length * chartSpacing + 40)}
                    />
                  </View>

                  {selectedRep && (
                    <View style={styles.repTooltip}>
                      <Text style={styles.repTooltipTitle}>{t('workout.detail.repInsights.tooltipRep', { value: selectedRep.repNumber })}</Text>
                      {selectedRepRow && (
                        <>
                          <View style={styles.repTooltipRow}>
                            <Text style={styles.repTooltipLabel}>{t('workout.detail.repInsights.xAxis')}</Text>
                            <Text style={styles.repTooltipValue}>
                              {formatChartMetricValue(chartXAxisMetric, getChartMetricValue(selectedRepRow, chartXAxisMetric))}
                            </Text>
                          </View>
                          <View style={styles.repTooltipRow}>
                            <Text style={styles.repTooltipLabel}>{t('workout.detail.repInsights.yAxis')}</Text>
                            <Text style={styles.repTooltipValue}>
                              {formatChartMetricValue(chartYAxisMetric, getChartMetricValue(selectedRepRow, chartYAxisMetric))}
                            </Text>
                          </View>
                        </>
                      )}
                      <View style={styles.repTooltipRow}>
                        <Text style={styles.repTooltipLabel}>{t('workout.detail.repInsights.tooltipDuration')}</Text>
                        <Text style={styles.repTooltipValue}>{formatRepDuration(selectedRep.durationMs)}</Text>
                      </View>
                      <View style={styles.repTooltipRow}>
                        <Text style={styles.repTooltipLabel}>{t('workout.detail.repInsights.tooltipRest')}</Text>
                        <Text style={styles.repTooltipValue}>
                          {selectedRepRestMs == null ? t('workout.detail.repInsights.notAvailable') : formatRepDuration(selectedRepRestMs)}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.repInsightsEmpty}>
                  <Text style={styles.repInsightsEmptyText}>{t('workout.detail.repInsights.unavailable')}</Text>
                </View>
              )
            )}
          </Animated.View>
        )}

        {/* AI Analysis Section */}
        {isSport && aiFeaturesEnabled && settings.aiWorkoutEnabled && (
          <Animated.View entering={FadeInDown.delay(350)} style={styles.aiSection}>
            <View style={[styles.aiHeader, { justifyContent: 'space-between' }]}>  
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                <Bot size={18} color={C.violet} />
                <Text style={styles.aiTitle}>{t('workout.ai.title')}</Text>
              </View>
              {aiAnalysis && !aiLoading && !aiError && (
                <TouchableOpacity
                  onPress={() => fetchAnalysis(true)}
                  style={styles.regenBtn}
                  accessibilityLabel={t('workout.ai.regenerate')}
                >
                  <RefreshCw size={18} color={C.violet} />
                </TouchableOpacity>
              )}
            </View>

            {!isConnected ? (
              <View style={styles.aiDisabled}>
                <Text style={styles.aiDisabledText}>{t('workout.ai.connectRequired')}</Text>
              </View>
            ) : aiLoading ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="small" color={C.violet} />
                <Text style={styles.aiLoadingText}>{t('workout.ai.loading')}</Text>
              </View>
            ) : aiError ? (
              <View style={styles.aiDisabled}>
                <Text style={styles.aiDisabledText}>{t('workout.ai.error')}</Text>
              </View>
            ) : aiAnalysis ? (
              <Text style={styles.aiText}>{aiAnalysis}</Text>
            ) : null}
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Delete confirm modal */}
      {deleteModalVisible && (
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.duration(200)} style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('entries.deleteConfirm.title')}</Text>
            <Text style={styles.modalMessage}>{t('entries.deleteConfirm.message')}</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={styles.modalConfirmBtn}>
                <Text style={styles.modalConfirmText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

