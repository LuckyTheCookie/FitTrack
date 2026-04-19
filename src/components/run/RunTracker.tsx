import { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import {
  Play,
  Pause,
  Square,
  X,
  ArrowLeft,
  Navigation,
  Clock3,
  MapPin,
  Shield,
  TriangleAlert,
} from 'lucide-react-native';
import { useRunStore, type LatLng } from '../../stores/runStore';
import { useAppStore } from '../../stores';
import { useSafetyStore, type SafetyAutoAlertType } from '../../stores/safetyStore';
import { getMapLibreModule } from '../../services/maplibre';
import { BuildConfig } from '../../config/buildConfig';
import {
  startTracking,
  stopTracking,
  requestLocationPermission,
  haversineDistance,
  calculateInstantPace,
  calculateAvgPace,
  calculateElevationGain,
} from '../../services/runTracker';
import { SafetyCheckConfig } from '@/components/run/SafetyCheckConfig';
import { sendSafetyAlert, sendAllClearSafetyAlert, type AlertPayload } from '@/services/safetyAlert';
import type { SafetyContact } from '../../types';
import { getDefaultSafetySettings } from '../../utils/safety';
import { startFallDetection } from '../../services/fallDetection';
import { simplifyRouteRdp } from '../../utils/geoUtils';
import { serviceLogger } from '../../utils/logger';
import { SafetyCheckOverlay } from './SafetyCheckOverlay';
import { CountdownBanner } from './CountdownBanner';
import { C, MAP_STYLE, S, T } from './runTrackerTokens';
import { styles } from './runTrackerStyles';
import {
  EMPTY_GEOJSON,
  type GeoJSONFeatureCollection,
  AlertSentOverlay,
  IosSendPromptOverlay,
  MetricCard,
  MotivationBubble,
  SegmentIndicator,
  SegmentedProgressBar,
  ConfirmOverlay,
  buildGeoJSON,
  buildPointGeoJSON,
  checkSegmentMotivation,
  formatDistance,
  formatDuration,
  formatPace,
} from './runTrackerHelpers';
const MapLibreRN = getMapLibreModule();
interface RunTrackerProps {
  mode: 'simple' | 'ai';
}
export function RunTracker({ mode }: RunTrackerProps) {
  const { t } = useTranslation();
  const settings = useAppStore(s => s.settings);
  const safety = useSafetyStore();
  const store = useRunStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const cameraRef = useRef<any>(null);
  const routeSourceRef = useRef<any>(null);
  const markerSourceRef = useRef<any>(null);
  const fallDetectionCleanupRef = useRef<(() => void) | null>(null);
  const coordsRef = useRef<LatLng[]>([]);
  const lastPointRef = useRef<LatLng | null>(null);
  const distanceRef = useRef<number>(0);
  const throttledUpdateRef = useRef<number>(0);
  const latestSpeedRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const alertHapticsLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertGlow = useSharedValue(0.35);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean; title: string; onConfirm: () => void;
    confirmLabel: string; confirmColor?: string;
  }>({ visible: false, title: '', onConfirm: () => {}, confirmLabel: '' });
  const [showSafetyConfig, setShowSafetyConfig] = useState(false);
  const [showFossMapNotice, setShowFossMapNotice] = useState(BuildConfig.isFoss);
  const [iosSendPromptVisible, setIosSendPromptVisible] = useState(false);
  const sendingRef = useRef(false);
  const alertGlowStyle = useAnimatedStyle(() => ({
    opacity: alertGlow.value,
  }));
  useEffect(() => {
    store.setMode(mode);
  }, [mode]);

  useEffect(() => {
    coordsRef.current = store.coords;
    lastPointRef.current = store.coords.length > 0 ? store.coords[store.coords.length - 1] : null;
    distanceRef.current = store.distanceKm;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (fallDetectionCleanupRef.current) {
        fallDetectionCleanupRef.current();
        fallDetectionCleanupRef.current = null;
      }
      if (alertHapticsLoopRef.current) {
        clearInterval(alertHapticsLoopRef.current);
        alertHapticsLoopRef.current = null;
      }
      void stopTracking();
      useSafetyStore.getState().resetCheck();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled || !isMountedRef.current) return;
        const pos: LatLng = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          altitude: loc.coords.altitude ?? undefined,
          timestamp: loc.timestamp,
          accuracy: loc.coords.accuracy ?? undefined,
        };
        store.setInitialPosition(pos);
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [pos.longitude, pos.latitude],
            zoomLevel: 16,
            animationDuration: 800,
          });
        }
      } catch (error) {
        serviceLogger.warn('[RunTracker] Initial position lookup failed', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (store.status === 'running') {
      if (startTimeRef.current === 0) {
        startTimeRef.current = Date.now() - pausedTimeRef.current * 1000;
      }
      timerRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        store.setElapsedSeconds(Math.floor(elapsed));
      }, 1000);
    } else if (store.status === 'paused') {
      pausedTimeRef.current = store.elapsedSeconds;
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [store.status]);

  useEffect(() => {
    if (store.status !== 'running' && store.status !== 'paused') return;

    const interval = setInterval(() => {
      const current = useSafetyStore.getState();
      if (!current.isEnabled) return;
      if (current.checkStatus === 'pending' || current.checkStatus === 'fall_detected') {
        current.tickPending();
      } else {
        current.tickCountdown();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [store.status]);

  // Motivation message check (every 30s or on segment change)
  useEffect(() => {
    if (store.status !== 'running' || mode !== 'ai' || !store.plan) return;

    const segments = store.plan.segments ?? [];
    const msg = checkSegmentMotivation(
      segments,
      store.currentSegmentIndex,
      store.distanceKm,
      store.elapsedSeconds,
      store.triggeredMilestones,
      store.plan,
      store.currentPaceSecPerKm,
    );
    if (msg) {
      setMotivationMessage(msg);
      // Track milestone to avoid re-triggering
      const targetDist = store.plan.targetDistanceKm ?? 0;
      if (targetDist > 0) {
        const progress = store.distanceKm / targetDist;
        if (progress >= 0.25 && !store.triggeredMilestones.includes(25)) store.addTriggeredMilestone(25);
        if (progress >= 0.50 && !store.triggeredMilestones.includes(50)) store.addTriggeredMilestone(50);
        if (progress >= 0.75 && !store.triggeredMilestones.includes(75)) store.addTriggeredMilestone(75);
        if (progress >= 0.90 && !store.triggeredMilestones.includes(90)) store.addTriggeredMilestone(90);
        if (store.currentSegmentIndex === segments.length - 1 && !store.triggeredMilestones.includes(99)) {
          store.addTriggeredMilestone(99);
        }
      }
      store.updateMotivationCheckpoint(store.distanceKm, Date.now());
    }
  }, [store.currentSegmentIndex, Math.floor(store.distanceKm * 4)]);

  // Segment tracking — advance segment index based on distance/duration
  useEffect(() => {
    if (store.status !== 'running' || !store.plan?.segments) return;
    const segments = store.plan.segments;
    if (segments.length === 0 || store.currentSegmentIndex >= segments.length) return;

    let accumulatedDistance = 0;
    let accumulatedDuration = 0;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].distanceKm) accumulatedDistance += segments[i].distanceKm!;
      if (segments[i].durationMinutes) accumulatedDuration += segments[i].durationMinutes!;

      if (i > store.currentSegmentIndex) break;

      // Check if we've passed this segment
      const passedByDistance = segments[i].distanceKm && store.distanceKm >= accumulatedDistance;
      const passedByDuration = segments[i].durationMinutes && (store.elapsedSeconds / 60) >= accumulatedDuration;

      if (i === store.currentSegmentIndex && (passedByDistance || passedByDuration)) {
        if (i + 1 < segments.length) {
          store.setCurrentSegmentIndex(i + 1);
        }
        break;
      }
    }
  }, [store.distanceKm, store.elapsedSeconds]);

  // Position handler
  const handlePosition = useCallback((pos: LatLng) => {
    if (!isMountedRef.current) return;
    const state = useRunStore.getState();
    if (state.status !== 'running') return;

    coordsRef.current.push(pos);

    if (lastPointRef.current) {
      const delta = haversineDistance(
        lastPointRef.current.latitude,
        lastPointRef.current.longitude,
        pos.latitude,
        pos.longitude,
      );
      distanceRef.current += delta;
    }

    lastPointRef.current = pos;

    if (typeof pos.speed === 'number' && pos.speed > 0) {
      latestSpeedRef.current = pos.speed;
    }

    const routePoints = coordsRef.current.length > 500
      ? simplifyRouteRdp(coordsRef.current, 0.00001)
      : coordsRef.current;

    routeSourceRef.current?.setNativeProps({ shape: buildGeoJSON(routePoints) });
    markerSourceRef.current?.setNativeProps({ shape: buildPointGeoJSON(pos) });

    cameraRef.current?.setCamera({
      centerCoordinate: [pos.longitude, pos.latitude],
      zoomLevel: 16,
      animationDuration: 800,
    });

    useSafetyStore.getState().updatePosition(pos);

    const now = Date.now();
    if (now - throttledUpdateRef.current < 1000) {
      return;
    }

    throttledUpdateRef.current = now;

    state.appendPosition(pos);
    state.setDistanceKm(distanceRef.current);

    const paceFromSpeed = latestSpeedRef.current > 0 ? 1000 / latestSpeedRef.current : 0;
    const instantPace = paceFromSpeed > 0
      ? paceFromSpeed
      : calculateInstantPace(coordsRef.current, 5);
    const avgPace = calculateAvgPace(distanceRef.current, state.elapsedSeconds);

    state.setCurrentPaceSecPerKm(instantPace);
    state.setAvgPaceSecPerKm(avgPace);
  }, []);

  const sendAlert = useCallback(async (type: SafetyAutoAlertType, contactsOverride?: SafetyContact[]) => {
    if (sendingRef.current) return;

    sendingRef.current = true;
    await Promise.resolve(useSafetyStore.getState().markAlertSending(type));

    const currentSafety = useSafetyStore.getState();
    const contacts = contactsOverride ?? currentSafety.contacts;

    try {
      if (!contacts.length) {
        await Promise.resolve(useSafetyStore.getState().markAlertSent({
          type,
          success: [],
          failed: [],
        }));
        return;
      }

      if (!currentSafety.lastKnownPosition) {
        await Promise.resolve(useSafetyStore.getState().markAlertSent({
          type,
          success: [],
          failed: contacts,
        }));
        return;
      }

      const payload: AlertPayload = {
        type,
        position: currentSafety.lastKnownPosition,
        runDurationMinutes: store.elapsedSeconds / 60,
        distanceKm: store.distanceKm,
        timestamp: new Date(),
      };

      const result = await sendSafetyAlert(contacts, payload);
      await Promise.resolve(useSafetyStore.getState().markAlertSent({
        type,
        success: result.success,
        failed: result.failed,
      }));

      if (result.iosUserActionRequired) {
        setIosSendPromptVisible(true);
      }
    } catch (error) {
      serviceLogger.warn('[RunTracker] Automatic safety alert failed', error);
      await Promise.resolve(useSafetyStore.getState().markAlertSent({
        type,
        success: [],
        failed: contacts,
      }));
    } finally {
      sendingRef.current = false;
    }
  }, [store.distanceKm, store.elapsedSeconds]);

  useEffect(() => {
    if (!safety.isEnabled) return;
    if (safety.checkStatus === 'auto_alerting' && safety.alertSummary === null) {
      const runAutoAlert = async () => {
        await sendAlert(safety.autoAlertType ?? 'no_response');
      };
      void runAutoAlert();
    }
  }, [sendAlert, safety.alertSummary, safety.autoAlertType, safety.checkStatus, safety.isEnabled]);

  useEffect(() => {
    if (store.status === 'running' && safety.fallDetectionEnabled) {
      fallDetectionCleanupRef.current?.();
      fallDetectionCleanupRef.current = startFallDetection(
        () => {
          useSafetyStore.getState().triggerFallCheck();
        },
        () => useRunStore.getState().status === 'running',
        () => latestSpeedRef.current,
      );
      return;
    }

    if (fallDetectionCleanupRef.current) {
      fallDetectionCleanupRef.current();
      fallDetectionCleanupRef.current = null;
    }
  }, [safety.fallDetectionEnabled, store.status]);

  useEffect(() => {
    if (safety.checkStatus !== 'fall_detected') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  }, [safety.checkStatus]);

  useEffect(() => {
    if (safety.checkStatus !== 'alert_sent') {
      if (alertHapticsLoopRef.current) {
        clearInterval(alertHapticsLoopRef.current);
        alertHapticsLoopRef.current = null;
      }
      return;
    }

    alertGlow.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 900 }),
        withTiming(0.8, { duration: 1100 }),
      ),
      -1,
      true,
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    alertHapticsLoopRef.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }, 2000);

    return () => {
      if (alertHapticsLoopRef.current) {
        clearInterval(alertHapticsLoopRef.current);
        alertHapticsLoopRef.current = null;
      }
    };
  }, [alertGlow, safety.checkStatus]);

  const handleStart = useCallback(async () => {
    try {
      await requestLocationPermission();
      coordsRef.current = [];
      lastPointRef.current = null;
      distanceRef.current = 0;
      throttledUpdateRef.current = 0;
      latestSpeedRef.current = 0;
      routeSourceRef.current?.setNativeProps({ shape: EMPTY_GEOJSON });
      store.start();
      startTimeRef.current = Date.now();
      await startTracking(handlePosition);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
        setPermissionDenied(true);
        return;
      }
      serviceLogger.warn('[RunTracker] Failed to start tracking', error);
    }
  }, [handlePosition]);

  const handlePause = useCallback(async () => {
    store.pause();
    await stopTracking();
  }, []);

  const handleResume = useCallback(async () => {
    store.resume();
    startTimeRef.current = Date.now() - store.elapsedSeconds * 1000;
    await startTracking(handlePosition);
  }, [handlePosition]);

  const handleStop = useCallback(() => {
    setConfirmModal({
      visible: true,
      title: t('run.confirmStop'),
      confirmLabel: t('run.stop'),
      confirmColor: C.red,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        await stopTracking();
        useRunStore.getState().setCoords(coordsRef.current);
        useRunStore.getState().setDistanceKm(distanceRef.current);
        store.finish();
        useSafetyStore.getState().resetCheck();
      },
    });
  }, [t]);

  const handleBack = useCallback(() => {
    if (store.status === 'running' || store.status === 'paused') {
      setConfirmModal({
        visible: true,
        title: t('run.confirmStop'),
        confirmLabel: t('run.stop'),
        confirmColor: C.red,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, visible: false }));
          await stopTracking();
          useRunStore.getState().setCoords(coordsRef.current);
          useRunStore.getState().setDistanceKm(distanceRef.current);
          store.reset();
          useSafetyStore.getState().resetCheck();
          router.back();
        },
      });
    } else {
      store.reset();
      router.back();
    }
  }, [store.status, t]);

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.permissionScreen} edges={['top']}>
          <MapPin size={48} color={C.red} />
          <Text style={styles.permissionTitle}>{t('run.permissionDenied')}</Text>
          <TouchableOpacity
            style={styles.permissionBtn}
            onPress={async () => {
              setPermissionDenied(false);
              try {
                await requestLocationPermission();
              } catch (error) {
                serviceLogger.warn('[RunTracker] Permission retry failed', error);
                setPermissionDenied(true);
              }
            }}
          >
            <Text style={styles.permissionBtnText}>{t('run.permissionButton')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: S.lg }}>
            <Text style={{ color: C.textSub, fontSize: T.sm }}>{t('common.back')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  const runSettings = (settings as { runSettings?: { displayedMetrics?: string[] } }).runSettings;
  const safetyDefaults = settings.safety ?? getDefaultSafetySettings();

  useEffect(() => {
    useSafetyStore.getState().setContacts(safetyDefaults.contacts);
    useSafetyStore.getState().setFallDetectionEnabled(Boolean(safetyDefaults.fallDetectionEnabled));
  }, [safetyDefaults.contacts, safetyDefaults.fallDetectionEnabled]);
  const displayedMetrics: string[] = runSettings?.displayedMetrics ?? [
    'distance', 'duration', 'currentPace', 'avgPace',
  ];
  const plan = store.plan;
  const segments = plan?.segments ?? [];
  const progressPercent = plan?.targetDistanceKm
    ? Math.min(100, Math.round((store.distanceKm / plan.targetDistanceKm) * 100))
    : null;

  let progressInSegment = 0;
  if (segments.length > 0 && store.currentSegmentIndex < segments.length) {
    const seg = segments[store.currentSegmentIndex];
    if (seg.distanceKm) {
      let prevDist = 0;
      for (let i = 0; i < store.currentSegmentIndex; i++) {
        prevDist += segments[i].distanceKm ?? 0;
      }
      progressInSegment = Math.min(1, Math.max(0, (store.distanceKm - prevDist) / seg.distanceKm));
    } else if (seg.durationMinutes) {
      let prevDur = 0;
      for (let i = 0; i < store.currentSegmentIndex; i++) {
        prevDur += segments[i].durationMinutes ?? 0;
      }
      progressInSegment = Math.min(1, Math.max(0, ((store.elapsedSeconds / 60) - prevDur) / seg.durationMinutes));
    }
  }

  const routeGeoJSON = coordsRef.current.length > 0
    ? buildGeoJSON(coordsRef.current)
    : EMPTY_GEOJSON;
  const lastCoord = lastPointRef.current;
  const initialPos = store.initialPosition;
  const nextMinutes = safety.nextCheckAt
    ? Math.max(0, Math.ceil((safety.nextCheckAt - Date.now()) / 60000))
    : 0;

  const mapCenter = lastCoord
    ? [lastCoord.longitude, lastCoord.latitude]
    : initialPos
    ? [initialPos.longitude, initialPos.latitude]
    : [2.3522, 48.8566];

  const markerGeoJSON = buildPointGeoJSON(lastCoord);
  const mapModule = BuildConfig.isFoss ? null : MapLibreRN;
  const shouldShowFossMapNotice = BuildConfig.isFoss && showFossMapNotice;
  const planTopOffset = shouldShowFossMapNotice ? 174 : 100;
  const segmentTopOffset = shouldShowFossMapNotice ? 222 : 148;

  const initialMarkerGeoJSON: GeoJSONFeatureCollection = (!lastCoord && initialPos) ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [initialPos.longitude, initialPos.latitude] },
    }],
  } : { type: 'FeatureCollection', features: [] };

  return (
    <View style={styles.container}>
      {mapModule ? (
        <mapModule.MapView
          style={StyleSheet.absoluteFill}
          mapStyle={MAP_STYLE}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={false}
        >
          <mapModule.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: mapCenter as [number, number],
              zoomLevel: 16,
            }}
          />

          {/* Route polyline */}
          <mapModule.ShapeSource ref={routeSourceRef} id="routeSource" shape={routeGeoJSON}>
            <mapModule.LineLayer
              id="routeLine"
              style={{
                lineColor: C.blue,
                lineWidth: 4,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          </mapModule.ShapeSource>

          {/* Current position marker */}
          {lastCoord && (
            <mapModule.ShapeSource ref={markerSourceRef} id="markerSource" shape={markerGeoJSON}>
              <mapModule.CircleLayer
                id="markerOuter"
                style={{
                  circleRadius: 12,
                  circleColor: 'rgba(85,153,255,0.25)',
                  circleStrokeWidth: 0,
                }}
              />
              <mapModule.CircleLayer
                id="markerInner"
                style={{
                  circleRadius: 6,
                  circleColor: C.blue,
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#fff',
                }}
              />
            </mapModule.ShapeSource>
          )}

          {/* Initial position marker (pulsing, before run starts) */}
          {!lastCoord && initialPos && (
            <mapModule.ShapeSource id="initialMarkerSource" shape={initialMarkerGeoJSON}>
              <mapModule.CircleLayer
                id="initialMarkerOuter"
                style={{
                  circleRadius: 16,
                  circleColor: 'rgba(52,211,112,0.15)',
                  circleStrokeWidth: 0,
                }}
              />
              <mapModule.CircleLayer
                id="initialMarkerInner"
                style={{
                  circleRadius: 7,
                  circleColor: C.green,
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#fff',
                }}
              />
            </mapModule.ShapeSource>
          )}
        </mapModule.MapView>
      ) : (
        <LinearGradient
          colors={['#06070b', '#0a0e18', '#111827']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(8,12,24,0.72)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topAmbientGlow}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(9,13,22,0.9)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomAmbientGlow}
      />

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={22} color={C.text} />
        </TouchableOpacity>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, {
            backgroundColor: store.status === 'running' ? C.green
              : store.status === 'paused' ? C.orange
              : C.textMuted,
          }]} />
          <Text style={styles.statusText}>
            {store.status === 'running' ? t('run.tracking')
              : store.status === 'paused' ? t('run.pause')
              : t('run.ready')}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.safetyButton,
            safety.isEnabled ? styles.safetyButtonActive : styles.safetyButtonInactive,
          ]}
          onPress={() => setShowSafetyConfig(true)}
          activeOpacity={0.85}
        >
          <Shield size={18} color={safety.isEnabled ? C.green : C.textSub} />
          <Text style={[styles.safetyButtonText, safety.isEnabled && { color: C.green }]}>
            {safety.isEnabled ? `${nextMinutes} ${t('common.minShort')}` : '--'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>

      {shouldShowFossMapNotice ? (
        <Animated.View entering={FadeIn.duration(220)} style={styles.fossMapNotice}>
          <View style={styles.fossMapNoticeIconBox}>
            <TriangleAlert size={16} color={C.orange} />
          </View>
          <View style={styles.fossMapNoticeTextWrap}>
            <Text style={styles.fossMapNoticeTitle}>{t('run.fossMapDisabled.title')}</Text>
            <Text style={styles.fossMapNoticeBody}>{t('run.fossMapDisabled.message')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowFossMapNotice(false)}
            style={styles.fossMapNoticeCloseBtn}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <X size={16} color={C.textSub} />
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      {/* Plan objective banner */}
      {plan && (
        <Animated.View entering={FadeIn.delay(200)} style={[styles.planBanner, { top: planTopOffset }]}>
          <Text style={styles.planBannerText}>
            🎯 {plan.targetDistanceKm ? `${plan.targetDistanceKm} km` : ''}
            {plan.targetDurationMinutes ? ` · ~${plan.targetDurationMinutes} min` : ''}
            {plan.targetPaceSecPerKm ? ` · ${formatPace(plan.targetPaceSecPerKm)}/km` : ''}
          </Text>
          {/* Segmented progress bar for interval plans */}
          {segments.length > 0 ? (
            <SegmentedProgressBar
              segments={segments}
              currentIndex={store.currentSegmentIndex}
              progressInSegment={progressInSegment}
            />
          ) : progressPercent !== null ? (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          ) : null}
        </Animated.View>
      )}

      {/* Current segment indicator */}
      {segments.length > 0 && store.currentSegmentIndex < segments.length && (
        <Animated.View entering={FadeIn.delay(300)} style={[styles.segmentBannerWrap, { top: segmentTopOffset }]}>
          <SegmentIndicator
            segment={segments[store.currentSegmentIndex]}
            index={store.currentSegmentIndex}
            total={segments.length}
          />
        </Animated.View>
      )}

      {/* Motivation bubble — above bottom sheet */}
      {mode === 'ai' && (
        <MotivationBubble message={motivationMessage} />
      )}

      {/* Bottom metric sheet */}
      <View style={styles.bottomSheet}>
        <LinearGradient
          colors={['rgba(85,153,255,0.10)', 'rgba(14,15,20,0.96)', 'rgba(14,15,20,0.98)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottomSheetGradient}
          pointerEvents="none"
        />
        <View style={styles.bottomSheetHandle} />

        {/* Big distance + time */}
        <View style={styles.bigRow}>
          <View style={styles.bigMetric}>
            <View style={styles.bigMetricLabelRow}>
              <Navigation size={13} color={C.blue} />
              <Text style={styles.bigMetricLabel}>{t('run.distance', { defaultValue: 'Distance' })}</Text>
            </View>
            <View style={styles.bigMetricValueRow}>
              <Text style={styles.bigValue}>{store.distanceKm.toFixed(2)}</Text>
              <Text style={styles.bigUnit}>km</Text>
            </View>
          </View>
          <View style={styles.bigDivider} />
          <View style={styles.bigMetric}>
            <View style={styles.bigMetricLabelRow}>
              <Clock3 size={13} color={C.gold} />
              <Text style={styles.bigMetricLabel}>{t('common.duration', { defaultValue: 'Durée' })}</Text>
            </View>
            <View style={styles.bigMetricValueRow}>
              <Text style={styles.bigValue}>{formatDuration(store.elapsedSeconds)}</Text>
            </View>
          </View>
        </View>

        {/* Metrics grid */}
        <View style={styles.metricsGrid}>
          {displayedMetrics.includes('currentPace') && (
            <MetricCard label={t('run.pace')} value={`${formatPace(store.currentPaceSecPerKm)}/km`} color={C.green} />
          )}
          {displayedMetrics.includes('avgPace') && (
            <MetricCard label={t('run.avgPace')} value={`${formatPace(store.avgPaceSecPerKm)}/km`} />
          )}
          {displayedMetrics.includes('remainingKm') && plan?.targetDistanceKm && (
            <MetricCard label={t('run.remainingKm')} value={formatDistance(Math.max(0, plan.targetDistanceKm - store.distanceKm))} color={C.gold} />
          )}
          {displayedMetrics.includes('progress') && progressPercent !== null && (
            <MetricCard label={t('run.progress')} value={`${progressPercent}%`} color={C.violet} />
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {store.status === 'idle' && (
            <TouchableOpacity onPress={() => void handleStart()} activeOpacity={0.8}>
              <LinearGradient colors={[C.green, '#28b860']} style={styles.mainBtn}>
                <Play size={28} color="#fff" fill="#fff" />
                <Text style={styles.mainBtnText}>{t('run.start')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {store.status === 'running' && (
            <TouchableOpacity onPress={() => void handlePause()} activeOpacity={0.8}>
              <LinearGradient colors={[C.orange, '#d48e1e']} style={styles.mainBtn}>
                <Pause size={28} color="#fff" fill="#fff" />
                <Text style={styles.mainBtnText}>{t('run.pause')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {store.status === 'paused' && (
            <View style={styles.pausedControls}>
              <TouchableOpacity onPress={() => void handleResume()} activeOpacity={0.8}>
                <LinearGradient colors={[C.green, '#28b860']} style={styles.secondaryBtn}>
                  <Play size={22} color="#fff" fill="#fff" />
                  <Text style={styles.secondaryBtnText}>{t('run.resume')}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleStop} activeOpacity={0.8}>
                <View style={styles.stopBtn}>
                  <Square size={22} color={C.red} fill={C.red} />
                  <Text style={[styles.secondaryBtnText, { color: C.red }]}>{t('run.stop')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.safetyCountdownBottomWrap}>
        <CountdownBanner
          visible={safety.checkStatus === 'countdown'}
          seconds={safety.countdownSeconds}
          onPress={() => useSafetyStore.getState().startPendingCheck()}
        />
      </View>

      <ConfirmOverlay
        visible={confirmModal.visible}
        title={confirmModal.title}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
        onConfirm={confirmModal.onConfirm}
        confirmLabel={confirmModal.confirmLabel}
        confirmColor={confirmModal.confirmColor}
      />

      <SafetyCheckOverlay
        visible={safety.checkStatus === 'pending' || safety.checkStatus === 'fall_detected' || safety.checkStatus === 'auto_alerting'}
        isFallMode={safety.checkStatus === 'fall_detected' || safety.pendingReason === 'fall'}
        pendingSeconds={safety.pendingSeconds}
        autoAlertDelaySeconds={safety.autoAlertDelaySeconds}
        isSending={safety.checkStatus === 'auto_alerting'}
        onImOk={() => useSafetyStore.getState().dismissCheck()}
        onNeedHelp={() => {
          useSafetyStore.getState().triggerHelp();
          void sendAlert('help_requested');
        }}
        onCall112={() => {
          void Linking.openURL('tel:112');
        }}
        onExtendTime={(minutes) => {
          useSafetyStore.getState().extendCheck(minutes);
        }}
      />

      <AlertSentOverlay
        visible={safety.checkStatus === 'alert_sent' && !!safety.alertSummary}
        alertSummary={safety.alertSummary}
        lastKnownPosition={safety.lastKnownPosition}
        alertGlowStyle={alertGlowStyle}
        t={t}
        onCallEmergency={() => {
          void Linking.openURL('tel:112');
        }}
        onOpenMap={(latitude, longitude) => {
          void Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
        }}
        onConfirmAllClear={async () => {
          const result = await sendAllClearSafetyAlert(useSafetyStore.getState().contacts);
          if (result.iosUserActionRequired) {
            setIosSendPromptVisible(true);
          }
          useSafetyStore.getState().clearAlertSummary();
        }}
      />

      <SafetyCheckConfig
        visible={showSafetyConfig}
        contacts={safetyDefaults.contacts}
        initialEnabled={safety.isEnabled}
        defaultIntervalMinutes={safetyDefaults.defaultIntervalMinutes}
        defaultAutoAlertDelaySeconds={safetyDefaults.defaultAutoAlertDelaySeconds}
        defaultFallDetectionEnabled={Boolean(safetyDefaults.fallDetectionEnabled)}
        onClose={() => setShowSafetyConfig(false)}
        onGoToSettings={() => {
          setShowSafetyConfig(false);
          router.push('/settings/safety');
        }}
        onActivate={({
          enabled,
          intervalMinutes,
          autoAlertDelaySeconds,
          fallDetectionEnabled,
        }: {
          enabled: boolean;
          intervalMinutes: number;
          autoAlertDelaySeconds: number;
          fallDetectionEnabled: boolean;
        }) => {
          if (!enabled) {
            useSafetyStore.getState().resetCheck();
            return;
          }
          useSafetyStore.getState().initCheck(
            intervalMinutes,
            autoAlertDelaySeconds,
            safetyDefaults.contacts,
            fallDetectionEnabled,
          );
        }}
      />

      <IosSendPromptOverlay
        visible={iosSendPromptVisible}
        t={t}
        onClose={() => setIosSendPromptVisible(false)}
      />
    </View>
  );
}


