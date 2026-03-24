// ============================================================================
// RUN TRACKER COMPONENT — Full-screen run tracking with MapLibre + motivation
// ============================================================================

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import {
  Play,
  Pause,
  Square,
  ArrowLeft,
  Navigation,
  MapPin,
  Shield,
  CheckCircle2,
  Siren,
  PhoneCall,
  Clock3,
  Loader,
  ChevronRight,
} from 'lucide-react-native';
import { useRunStore, type LatLng, type RunSegment } from '../../stores/runStore';
import { useAppStore } from '../../stores';
import { useSafetyStore } from '../../stores/safetyStore';
import { getMapLibreModule } from '../../services/maplibre';
import {
  startTracking,
  stopTracking,
  requestLocationPermission,
  haversineDistance,
  calculateInstantPace,
  calculateAvgPace,
  calculateElevationGain,
} from '../../services/runTracker';
import i18n from '../../i18n';
import { SafetyCheckConfig } from './SafetyCheckConfig';
import { sendSafetyAlert, sendAllClearSafetyAlert, type AlertPayload } from '../../services/safetyAlert';
import { CustomAlertModal } from '../ui/CustomAlertModal';
import type { SafetyContact } from '../../types';
import { getDefaultSafetySettings } from '../../utils/safety';

const { width: SW, height: SH } = Dimensions.get('window');
const MapLibreRN = getMapLibreModule();

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:          '#070709',
  surface:     '#0e0f14',
  surfaceUp:   '#13151e',
  border:      'rgba(255,255,255,0.07)',
  borderUp:    'rgba(255,255,255,0.12)',
  text:        '#f0ece4',
  textSub:     'rgba(240,236,228,0.55)',
  textMuted:   'rgba(240,236,228,0.28)',
  blue:        '#5599ff',
  blueSoft:    'rgba(85,153,255,0.10)',
  green:       '#34d370',
  greenSoft:   'rgba(52,211,112,0.10)',
  greenBorder: 'rgba(52,211,112,0.22)',
  orange:      '#f5a623',
  orangeSoft:  'rgba(245,166,35,0.15)',
  red:         '#f87171',
  redSoft:     'rgba(248,113,113,0.15)',
  gold:        '#e8b84b',
  goldSoft:    'rgba(232,184,75,0.10)',
  violet:      '#a78bfa',
  violetSoft:  'rgba(167,139,250,0.12)',
};
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const R = { sm: 6, md: 10, lg: 14, xl: 18, xxl: 22, full: 999 };
const T = { nano: 9, xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 34, display: 48 };
const W: Record<string, any> = { reg: '400', med: '500', semi: '600', bold: '700', xbold: '800', black: '900' };

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

// ============================================================================
// HELPERS
// ============================================================================

function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !isFinite(secPerKm) || secPerKm < 60 || secPerKm > 1800) return '--:--';
  const min = Math.floor(secPerKm / 60);
  const sec = Math.floor(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/** Pick a random hardcoded motivation message from i18n arrays */
function pickMotivation(key: string): string | null {
  const messages = i18n.t(key, { returnObjects: true });
  if (!Array.isArray(messages) || messages.length === 0) return null;
  return messages[Math.floor(Math.random() * messages.length)];
}

/** Check if a motivation message should be shown based on segment progress */
function checkSegmentMotivation(
  segments: RunSegment[],
  currentSegmentIndex: number,
  distanceKm: number,
  elapsedSeconds: number,
  triggeredMilestones: number[],
  plan: { targetDistanceKm?: number; targetPaceSecPerKm?: number; planType?: string } | null,
  currentPace: number,
): string | null {
  if (!plan) return null;

  // Segment change messages
  if (segments.length > 0 && currentSegmentIndex < segments.length) {
    const seg = segments[currentSegmentIndex];
    if (seg.type === 'run') return pickMotivation('run.motivation.interval.startRun');
    if (seg.type === 'walk') return pickMotivation('run.motivation.interval.startWalk');
    if (seg.type === 'rest') return pickMotivation('run.motivation.interval.startRest');
  }

  const targetDist = plan.targetDistanceKm ?? 0;
  if (targetDist <= 0) return null;
  const progress = distanceKm / targetDist;

  // Long run milestones
  if (plan.planType === 'long_run') {
    if (progress >= 0.25 && !triggeredMilestones.includes(25)) return pickMotivation('run.motivation.longRun.quarter');
    if (progress >= 0.50 && !triggeredMilestones.includes(50)) return pickMotivation('run.motivation.longRun.half');
    if (progress >= 0.75 && !triggeredMilestones.includes(75)) return pickMotivation('run.motivation.longRun.threeQuarters');
    if (progress >= 0.90 && !triggeredMilestones.includes(90)) return pickMotivation('run.motivation.longRun.almostDone');
  }

  // Interval milestones
  if (plan.planType === 'interval' && segments.length > 0) {
    const halfwayIdx = Math.floor(segments.length / 2);
    if (currentSegmentIndex === halfwayIdx && !triggeredMilestones.includes(50)) {
      return pickMotivation('run.motivation.interval.halfway');
    }
    if (currentSegmentIndex === segments.length - 1 && !triggeredMilestones.includes(99)) {
      return pickMotivation('run.motivation.interval.lastSegment');
    }
  }

  // Pace feedback (only with valid pace + target)
  const targetPace = plan.targetPaceSecPerKm ?? 0;
  if (targetPace > 0 && currentPace > 60 && currentPace < 1800) {
    if (currentPace > targetPace * 1.15) return pickMotivation('run.motivation.tooSlow');
    if (currentPace < targetPace * 0.85) return pickMotivation('run.motivation.tooFast');
  }

  return null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

function buildGeoJSON(coords: LatLng[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: coords.length >= 2 ? [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords.map(c => [c.longitude, c.latitude]),
      },
    }] : [],
  };
}

// ============================================================================
// METRIC CARD
// ============================================================================

const MetricCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, color ? { color } : {}]}>{value}</Text>
  </View>
);

// ============================================================================
// MOTIVATION BUBBLE (8s display, hardcoded i18n messages)
// ============================================================================

const MotivationBubble = React.memo(({ message }: { message: string | null }) => {
  const [visible, setVisible] = useState(false);
  const [displayedMsg, setDisplayedMsg] = useState<string | null>(null);
  const prevMessage = useRef<string | null>(null);

  useEffect(() => {
    if (message && message !== prevMessage.current) {
      prevMessage.current = message;
      setDisplayedMsg(message);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!visible || !displayedMsg) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.coachBubble}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setVisible(false)}
        style={styles.coachBubbleInner}
      >
        <Text style={styles.coachBubbleText}>{displayedMsg}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ============================================================================
// SEGMENT INDICATOR (shows current segment for interval plans)
// ============================================================================

const SegmentIndicator = ({ segment, index, total }: {
  segment: RunSegment; index: number; total: number;
}) => {
  const segColor = segment.type === 'run' ? C.green
    : segment.type === 'walk' ? C.orange
    : C.textMuted;

  return (
    <View style={[styles.segmentIndicator, { borderColor: `${segColor}44` }]}>
      <Text style={styles.segmentEmoji}>{segment.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.segmentLabel, { color: segColor }]}>{segment.label}</Text>
        <Text style={styles.segmentMeta}>
          {index + 1}/{total}
          {segment.distanceKm ? ` · ${segment.distanceKm} km` : ''}
          {segment.durationMinutes ? ` · ${segment.durationMinutes} min` : ''}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// SEGMENTED PROGRESS BAR (colored by segment type)
// ============================================================================

const SegmentedProgressBar = ({ segments, currentIndex, progressInSegment }: {
  segments: RunSegment[];
  currentIndex: number;
  progressInSegment: number; // 0-1 within current segment
}) => {
  const total = segments.length;
  if (total === 0) return null;

  return (
    <View style={styles.segProgressContainer}>
      {segments.map((seg, i) => {
        const segColor = seg.type === 'run' ? C.green
          : seg.type === 'walk' ? C.orange
          : C.textMuted;
        const fill = i < currentIndex ? 1
          : i === currentIndex ? Math.min(1, progressInSegment)
          : 0;

        return (
          <View key={i} style={[styles.segProgressSlot, { flex: 1 }]}>
            <View style={[styles.segProgressBg, i === 0 && { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }, i === total - 1 && { borderTopRightRadius: 3, borderBottomRightRadius: 3 }]}>
              <View style={[styles.segProgressFill, {
                width: `${fill * 100}%`,
                backgroundColor: segColor,
              }, i === 0 && { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }, i === total - 1 && fill >= 1 && { borderTopRightRadius: 3, borderBottomRightRadius: 3 }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const SlideAction = ({
  label,
  color,
  icon,
  onComplete,
  disabled,
}: {
  label: string;
  color: string;
  icon: React.ReactNode;
  onComplete: () => void;
  disabled?: boolean;
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [thumbX, setThumbX] = useState(0);
  const thresholdRatio = 0.88;
  const thumbSize = 44;
  const maxX = Math.max(0, trackWidth - thumbSize - 6);

  const disabledRef = useRef(disabled);
  const maxXRef = useRef(maxX);
  const onCompleteRef = useRef(onComplete);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderMove: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
        const nextX = Math.max(0, Math.min(maxXRef.current, gesture.dx));
        setThumbX(nextX);
      },
      onPanResponderRelease: (_evt: GestureResponderEvent, gesture: PanResponderGestureState) => {
        const nextX = Math.max(0, Math.min(maxXRef.current, gesture.dx));
        if (maxXRef.current > 0 && nextX >= maxXRef.current * thresholdRatio) {
          setThumbX(maxXRef.current);
          onCompleteRef.current();
          setTimeout(() => setThumbX(0), 160);
        } else {
          setThumbX(0);
        }
      },
      onPanResponderTerminate: () => setThumbX(0),
    })
  ).current;

  useEffect(() => {
    disabledRef.current = disabled;
    maxXRef.current = maxX;
    onCompleteRef.current = onComplete;
  }, [disabled, maxX, onComplete]);

  return (
    <View
      style={[styles.slideTrack, { borderColor: `${color}66`, backgroundColor: `${color}18` }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.slideLabelWrap}>
        {icon}
        <Text style={[styles.slideLabel, { color }]}>{label}</Text>
      </View>
      <View
        style={[
          styles.slideThumb,
          {
            backgroundColor: color,
            transform: [{ translateX: thumbX }],
          },
          disabled && { opacity: 0.4 },
        ]}
        {...(!disabled ? panResponder.panHandlers : {})}
      >
        <ChevronRight size={20} color="#fff" />
      </View>
    </View>
  );
};

// ============================================================================
// CONFIRMATION MODAL (replaces Alert.alert)
// ============================================================================

const ConfirmOverlay = ({
  visible, title, onCancel, onConfirm, confirmLabel, confirmColor,
}: {
  visible: boolean; title: string;
  onCancel: () => void; onConfirm: () => void;
  confirmLabel: string; confirmColor?: string;
}) => {
  if (!visible) return null;
  return (
    <View style={styles.modalOverlay}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <View style={styles.modalBtns}>
          <TouchableOpacity onPress={onCancel} style={styles.modalCancelBtn}>
            <Text style={styles.modalCancelText}>{i18n.t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            style={[styles.modalConfirmBtn, confirmColor ? { backgroundColor: `${confirmColor}22`, borderColor: `${confirmColor}44` } : {}]}
          >
            <Text style={[styles.modalConfirmText, confirmColor ? { color: confirmColor } : {}]}>
              {confirmLabel}
            </Text>
          </TouchableOpacity> 
        </View>
      </Animated.View>
    </View>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

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
  const isMountedRef = useRef(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean; title: string; onConfirm: () => void;
    confirmLabel: string; confirmColor?: string;
  }>({ visible: false, title: '', onConfirm: () => {}, confirmLabel: '' });
  const [showSafetyConfig, setShowSafetyConfig] = useState(false);
  const [showAddTimePicker, setShowAddTimePicker] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    retryContacts?: SafetyContact[];
  }>({ visible: false, type: 'info', title: '', message: '' });
  const sendingRef = useRef(false);

  // Initialize mode
  useEffect(() => {
    store.setMode(mode);
  }, [mode]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopTracking();
      useSafetyStore.getState().resetCheck();
    };
  }, []);

  // Immediate geolocation on mount — get position before starting
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
        // Center camera on initial position
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [pos.longitude, pos.latitude],
            zoomLevel: 16,
            animationDuration: 800,
          });
        }
      } catch {
        // Non-blocking — will get position when starting
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Timer
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
      if (current.checkStatus === 'pending') {
        current.tickPending();
      } else {
        current.tickCountdown();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [store.status]);

  // Follow user on camera
  useEffect(() => {
    if (!MapLibreRN || !isMountedRef.current) return;
    const coords = store.coords;
    if (coords.length > 0 && cameraRef.current) {
      const last = coords[coords.length - 1];
      cameraRef.current.setCamera({
        centerCoordinate: [last.longitude, last.latitude],
        zoomLevel: 16,
        animationDuration: 500,
      });
    }
  }, [store.coords.length]);

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

    const coords = state.coords;
    let newDistance = state.distanceKm;

    if (coords.length > 0) {
      const last = coords[coords.length - 1];
      const delta = haversineDistance(
        last.latitude, last.longitude,
        pos.latitude, pos.longitude,
      );
      newDistance += delta;
    }

    state.appendPosition(pos);
    useSafetyStore.getState().updatePosition(pos);
    state.setDistanceKm(newDistance);

    const updatedCoords = [...coords, pos];
    const instantPace = calculateInstantPace(updatedCoords, 5);
    const avgPace = calculateAvgPace(newDistance, state.elapsedSeconds);
    state.setCurrentPaceSecPerKm(instantPace);
    state.setAvgPaceSecPerKm(avgPace);
  }, []);

  const sendAlert = useCallback(async (type: 'no_response' | 'help_requested', contactsOverride?: SafetyContact[]) => {
    const currentSafety = useSafetyStore.getState();
    if (!currentSafety.lastKnownPosition) return;
    const contacts = contactsOverride ?? currentSafety.contacts;
    if (!contacts.length) return;
    if (sendingRef.current) return;

    sendingRef.current = true;
    const payload: AlertPayload = {
      type,
      position: currentSafety.lastKnownPosition,
      runDurationMinutes: store.elapsedSeconds / 60,
      distanceKm: store.distanceKm,
      timestamp: new Date(),
    };

    const result = await sendSafetyAlert(contacts, payload);
    useSafetyStore.getState().markAlertSent();

    if (result.failed.length === 0) {
      setAlertFeedback({
        visible: true,
        type: 'success',
        title: t('safety.alert.sendSuccess'),
        message: t('safety.overlay.alertSent', { count: result.success.length }),
      });
    } else if (result.success.length > 0) {
      setAlertFeedback({
        visible: true,
        type: 'warning',
        title: t('safety.alert.sendPartialFailure'),
        message: `${t('safety.overlay.alertSent', { count: result.success.length })}\n${result.failed.map((c) => `• ${c.name}`).join('\n')}`,
        retryContacts: result.failed,
      });
    } else {
      setAlertFeedback({
        visible: true,
        type: 'error',
        title: t('safety.alert.sendFailure'),
        message: result.failed.map((c) => `• ${c.name}`).join('\n'),
        retryContacts: result.failed,
      });
    }

    sendingRef.current = false;
  }, [store.distanceKm, store.elapsedSeconds, t]);

  useEffect(() => {
    if (!safety.isEnabled) return;
    if (safety.checkStatus === 'auto_alerting' && safety.alertSentAt === null) {
      sendAlert('no_response');
    }
  }, [sendAlert, safety.alertSentAt, safety.checkStatus, safety.isEnabled]);

  // Start GPS tracking
  const handleStart = useCallback(async () => {
    try {
      await requestLocationPermission();
      store.start();
      startTimeRef.current = Date.now();
      await startTracking(handlePosition);
    } catch (err: any) {
      if (err?.message === 'PERMISSION_DENIED') {
        setPermissionDenied(true);
      }
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

  // Permission denied screen
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
              } catch {
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

  // Derived metrics
  const runSettings = (settings as any).runSettings;
  const safetyDefaults = settings.safety ?? getDefaultSafetySettings();

  useEffect(() => {
    useSafetyStore.getState().setContacts(safetyDefaults.contacts);
  }, [safetyDefaults.contacts]);
  const displayedMetrics: string[] = runSettings?.displayedMetrics ?? [
    'distance', 'duration', 'currentPace', 'avgPace',
  ];
  const plan = store.plan;
  const segments = plan?.segments ?? [];
  const progressPercent = plan?.targetDistanceKm
    ? Math.min(100, Math.round((store.distanceKm / plan.targetDistanceKm) * 100))
    : null;

  // Current segment progress (for segmented bar)
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

  const routeGeoJSON = buildGeoJSON(store.coords);
  const lastCoord = store.coords.length > 0 ? store.coords[store.coords.length - 1] : null;
  const initialPos = store.initialPosition;
  const nextMinutes = safety.nextCheckAt
    ? Math.max(0, Math.ceil((safety.nextCheckAt - Date.now()) / 60000))
    : 0;

  // Map center: prefer last coord → initial position → fallback
  const mapCenter = lastCoord
    ? [lastCoord.longitude, lastCoord.latitude]
    : initialPos
    ? [initialPos.longitude, initialPos.latitude]
    : [2.3522, 48.8566];

  const markerGeoJSON: GeoJSON.FeatureCollection = lastCoord ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [lastCoord.longitude, lastCoord.latitude] },
    }],
  } : { type: 'FeatureCollection', features: [] };

  // Initial position marker (shown before run starts)
  const initialMarkerGeoJSON: GeoJSON.FeatureCollection = (!lastCoord && initialPos) ? {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [initialPos.longitude, initialPos.latitude] },
    }],
  } : { type: 'FeatureCollection', features: [] };

  return (
    <View style={styles.container}>
      {/* MAP — Full screen background */}
      {MapLibreRN ? (
        <MapLibreRN.MapView
          style={StyleSheet.absoluteFill}
          mapStyle={MAP_STYLE}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={false}
        >
          <MapLibreRN.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: mapCenter as [number, number],
              zoomLevel: 16,
            }}
          />

          {/* Route polyline */}
          <MapLibreRN.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <MapLibreRN.LineLayer
              id="routeLine"
              style={{
                lineColor: C.blue,
                lineWidth: 4,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          </MapLibreRN.ShapeSource>

          {/* Current position marker */}
          {lastCoord && (
            <MapLibreRN.ShapeSource id="markerSource" shape={markerGeoJSON}>
              <MapLibreRN.CircleLayer
                id="markerOuter"
                style={{
                  circleRadius: 12,
                  circleColor: 'rgba(85,153,255,0.25)',
                  circleStrokeWidth: 0,
                }}
              />
              <MapLibreRN.CircleLayer
                id="markerInner"
                style={{
                  circleRadius: 6,
                  circleColor: C.blue,
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#fff',
                }}
              />
            </MapLibreRN.ShapeSource>
          )}

          {/* Initial position marker (pulsing, before run starts) */}
          {!lastCoord && initialPos && (
            <MapLibreRN.ShapeSource id="initialMarkerSource" shape={initialMarkerGeoJSON}>
              <MapLibreRN.CircleLayer
                id="initialMarkerOuter"
                style={{
                  circleRadius: 16,
                  circleColor: 'rgba(52,211,112,0.15)',
                  circleStrokeWidth: 0,
                }}
              />
              <MapLibreRN.CircleLayer
                id="initialMarkerInner"
                style={{
                  circleRadius: 7,
                  circleColor: C.green,
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#fff',
                }}
              />
            </MapLibreRN.ShapeSource>
          )}
        </MapLibreRN.MapView>
      ) : (
        <LinearGradient
          colors={['#06070b', '#0a0e18', '#111827']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

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

      {safety.isEnabled && safety.checkStatus === 'countdown' && safety.countdownSeconds <= 60 && (
        <TouchableOpacity
          style={styles.safetyCountdownBanner}
          activeOpacity={0.85}
          onPress={() => useSafetyStore.getState().startPendingCheck()}
        >
          <Shield size={16} color={C.green} />
          <Text style={styles.safetyCountdownText}>
            {t('safety.overlay.countdown', { seconds: safety.countdownSeconds })}
          </Text>
        </TouchableOpacity>
      )}

      {/* Plan objective banner */}
      {plan && (
        <Animated.View entering={FadeIn.delay(200)} style={styles.planBanner}>
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
        <Animated.View entering={FadeIn.delay(300)} style={styles.segmentBannerWrap}>
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
        {/* Big distance + time */}
        <View style={styles.bigRow}>
          <View style={styles.bigMetric}>
            <Navigation size={14} color={C.blue} />
            <Text style={styles.bigValue}>{store.distanceKm.toFixed(2)}</Text>
            <Text style={styles.bigUnit}>km</Text>
          </View>
          <View style={styles.bigDivider} />
          <View style={styles.bigMetric}>
            <Text style={styles.bigValue}>{formatDuration(store.elapsedSeconds)}</Text>
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
            <TouchableOpacity onPress={handleStart} activeOpacity={0.8}>
              <LinearGradient colors={[C.green, '#28b860']} style={styles.mainBtn}>
                <Play size={28} color="#fff" fill="#fff" />
                <Text style={styles.mainBtnText}>{t('run.start')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {store.status === 'running' && (
            <TouchableOpacity onPress={handlePause} activeOpacity={0.8}>
              <LinearGradient colors={[C.orange, '#d48e1e']} style={styles.mainBtn}>
                <Pause size={28} color="#fff" fill="#fff" />
                <Text style={styles.mainBtnText}>{t('run.pause')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {store.status === 'paused' && (
            <View style={styles.pausedControls}>
              <TouchableOpacity onPress={handleResume} activeOpacity={0.8}>
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

      {/* Confirm modal */}
      <ConfirmOverlay
        visible={confirmModal.visible}
        title={confirmModal.title}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
        onConfirm={confirmModal.onConfirm}
        confirmLabel={confirmModal.confirmLabel}
        confirmColor={confirmModal.confirmColor}
      />

      {(safety.checkStatus === 'pending' || safety.checkStatus === 'auto_alerting') && (
        <View style={styles.safetyOverlay}>
          <View style={styles.safetyOverlayCard}>
            <View style={styles.safetyOverlayHeader}>
              <Shield size={22} color={C.green} />
              <Text style={styles.safetyOverlayTitle}>{t('safety.overlay.title')}</Text>
            </View>
            <Text style={styles.safetyOverlaySubtitle}>{t('safety.overlay.subtitle')}</Text>

            <View style={styles.safetyCountdownCircle}>
              {safety.checkStatus === 'auto_alerting' ? (
                <>
                  <Loader size={20} color={C.orange} />
                  <Text style={styles.safetyCountdownCircleText}>{t('safety.overlay.sending')}</Text>
                </>
              ) : (
                <Text
                  style={[
                    styles.safetyCountdownCircleText,
                    safety.pendingSeconds < 30
                      ? { color: C.red }
                      : safety.pendingSeconds < 60
                        ? { color: C.orange }
                        : { color: C.green },
                  ]}
                >
                  {t('safety.overlay.countdown', { seconds: safety.pendingSeconds })}
                </Text>
              )}
            </View>

            <SlideAction
              label={t('safety.overlay.imOk')}
              color={C.green}
              icon={<CheckCircle2 size={16} color={C.green} />}
              onComplete={async () => {
                const sentBefore = useSafetyStore.getState().alertSentAt !== null;
                useSafetyStore.getState().dismissCheck();
                if (sentBefore) {
                  const allClearResult = await sendAllClearSafetyAlert(useSafetyStore.getState().contacts);
                  if (allClearResult.failed.length === 0) {
                    setAlertFeedback({
                      visible: true,
                      type: 'success',
                      title: t('safety.overlay.allClear'),
                      message: t('safety.overlay.allClear'),
                    });
                  } else if (allClearResult.success.length > 0) {
                    setAlertFeedback({
                      visible: true,
                      type: 'warning',
                      title: t('safety.alert.sendPartialFailure'),
                      message: `${t('safety.overlay.allClear')}\n${allClearResult.failed.map((c) => `• ${c.name}`).join('\n')}`,
                      retryContacts: allClearResult.failed,
                    });
                  } else {
                    setAlertFeedback({
                      visible: true,
                      type: 'error',
                      title: t('safety.alert.sendFailure'),
                      message: allClearResult.failed.map((c) => `• ${c.name}`).join('\n'),
                      retryContacts: allClearResult.failed,
                    });
                  }
                }
              }}
            />
            <SlideAction
              label={t('safety.overlay.needHelp')}
              color={C.orange}
              icon={<Siren size={16} color={C.orange} />}
              onComplete={async () => {
                useSafetyStore.getState().triggerHelp();
                await sendAlert('help_requested');
              }}
            />
            <SlideAction
              label={t('safety.overlay.call112')}
              color={C.red}
              icon={<PhoneCall size={16} color={C.red} />}
              onComplete={() => {
                Linking.openURL('tel:112');
              }}
            />

            <TouchableOpacity style={styles.addTimeButton} onPress={() => setShowAddTimePicker(true)}>
              <Clock3 size={14} color={C.gold} />
              <Text style={styles.addTimeText}>{t('safety.overlay.addTime')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <SafetyCheckConfig
        visible={showSafetyConfig}
        contacts={safetyDefaults.contacts}
        initialEnabled={safety.isEnabled}
        defaultIntervalMinutes={safetyDefaults.defaultIntervalMinutes}
        defaultAutoAlertDelaySeconds={safetyDefaults.defaultAutoAlertDelaySeconds}
        onClose={() => setShowSafetyConfig(false)}
        onGoToSettings={() => {
          setShowSafetyConfig(false);
          router.push('/settings/safety');
        }}
        onActivate={({ enabled, intervalMinutes, autoAlertDelaySeconds }) => {
          if (!enabled) {
            useSafetyStore.getState().resetCheck();
            return;
          }
          useSafetyStore.getState().initCheck(
            intervalMinutes,
            autoAlertDelaySeconds,
            safetyDefaults.contacts
          );
        }}
      />

      <CustomAlertModal
        visible={showAddTimePicker}
        type="info"
        title={t('safety.overlay.addTime')}
        message={t('safety.overlay.addTimeOptions')}
        onClose={() => setShowAddTimePicker(false)}
        showCloseButton
        buttons={[
          {
            text: `+15 ${t('common.minShort')}`,
            onPress: () => useSafetyStore.getState().extendCheck(15),
          },
          {
            text: `+30 ${t('common.minShort')}`,
            onPress: () => useSafetyStore.getState().extendCheck(30),
          },
          {
            text: `+1${t('common.hour')}`,
            onPress: () => useSafetyStore.getState().extendCheck(60),
          },
        ]}
      />

      <CustomAlertModal
        visible={alertFeedback.visible}
        type={alertFeedback.type}
        title={alertFeedback.title}
        message={alertFeedback.message}
        onClose={() => setAlertFeedback((prev) => ({ ...prev, visible: false }))}
        showCloseButton
        buttons={[
          ...(alertFeedback.retryContacts && alertFeedback.retryContacts.length > 0
            ? [{
              text: t('safety.alert.retry'),
              onPress: () => sendAlert('help_requested', alertFeedback.retryContacts),
            }]
            : []),
          {
            text: t('common.ok'),
            style: 'cancel' as const,
          },
        ]}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Top bar
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S.lg, paddingTop: S.sm,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: R.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    paddingHorizontal: S.md, paddingVertical: S.xs,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: R.full, borderWidth: 1, borderColor: C.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: T.xs, fontWeight: W.semi, color: C.textSub },
  safetyButton: {
    minWidth: 64,
    height: 42,
    borderRadius: R.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: S.xs,
    paddingHorizontal: S.md,
  },
  safetyButtonActive: {
    backgroundColor: 'rgba(52,211,112,0.12)',
    borderColor: C.greenBorder,
  },
  safetyButtonInactive: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderColor: C.border,
  },
  safetyButtonText: {
    color: C.textSub,
    fontSize: T.xs,
    fontWeight: W.bold,
  },
  safetyCountdownBanner: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderWidth: 1,
    borderColor: C.greenBorder,
    borderRadius: R.full,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
  },
  safetyCountdownText: {
    color: C.text,
    fontSize: T.sm,
    fontWeight: W.semi,
  },

  // Plan banner
  planBanner: {
    position: 'absolute', top: 100, left: S.lg, right: S.lg, zIndex: 15,
    padding: S.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: R.lg, borderWidth: 1, borderColor: 'rgba(85,153,255,0.22)',
  },
  planBannerText: { fontSize: T.xs, fontWeight: W.semi, color: C.blue, textAlign: 'center' },
  progressBar: {
    marginTop: S.sm, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: C.blue },

  // Motivation bubble
  coachBubble: {
    position: 'absolute', bottom: 340, left: S.lg, right: S.lg, zIndex: 25,
  },
  coachBubbleInner: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    padding: S.md,
    backgroundColor: 'rgba(14,15,20,0.92)',
    borderRadius: R.xl, borderWidth: 1,
    borderColor: 'rgba(52,211,112,0.22)',
  },
  coachBubbleText: { flex: 1, fontSize: T.sm, color: C.text, lineHeight: 20 },

  // Segment indicator
  segmentBannerWrap: {
    position: 'absolute', top: 148, left: S.lg, right: S.lg, zIndex: 14,
  },
  segmentIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    padding: S.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: R.lg, borderWidth: 1,
  },
  segmentEmoji: { fontSize: 20 },
  segmentLabel: { fontSize: T.sm, fontWeight: W.bold },
  segmentMeta: { fontSize: T.nano, color: C.textMuted, marginTop: 2 },

  // Segmented progress bar
  segProgressContainer: {
    flexDirection: 'row', marginTop: S.sm, height: 6, gap: 2,
  },
  segProgressSlot: { overflow: 'hidden' },
  segProgressBg: {
    height: '100%', backgroundColor: 'rgba(255,255,255,0.08)',
  },
  segProgressFill: { height: '100%' },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
    backgroundColor: 'rgba(14,15,20,0.94)',
    borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingHorizontal: S.lg, paddingTop: S.xl,
    paddingBottom: Platform.OS === 'ios' ? 44 : S.xxl,
  },
  bigRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: S.lg,
  },
  bigMetric: { flexDirection: 'row', alignItems: 'baseline', gap: S.xs },
  bigValue: { fontSize: 38, fontWeight: W.black, color: C.text, letterSpacing: -1 },
  bigUnit: { fontSize: T.lg, fontWeight: W.semi, color: C.textSub },
  bigDivider: {
    width: 1, height: 32, backgroundColor: C.border, marginHorizontal: S.xl,
  },

  // Metrics
  metricsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.lg,
  },
  metricCard: {
    flex: 1, minWidth: (SW - S.lg * 2 - S.sm) / 2 - 1,
    padding: S.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: R.lg, borderWidth: 1, borderColor: C.border,
  },
  metricLabel: { fontSize: T.nano, fontWeight: W.bold, color: C.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: S.xs },
  metricValue: { fontSize: T.xl, fontWeight: W.xbold, color: C.text },

  // Controls
  controls: { alignItems: 'center', paddingBottom: S.sm },
  mainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: S.md,
    paddingHorizontal: 48, paddingVertical: 18, borderRadius: R.full,
  },
  mainBtnText: { fontSize: T.lg, fontWeight: W.bold, color: '#fff' },
  pausedControls: { flexDirection: 'row', gap: S.lg },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: R.full,
  },
  secondaryBtnText: { fontSize: T.md, fontWeight: W.bold, color: '#fff' },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    paddingHorizontal: 28, paddingVertical: 16, borderRadius: R.full,
    backgroundColor: C.redSoft,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)',
  },

  // Confirm modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    width: SW - 64, padding: S.xl,
    backgroundColor: '#13151e', borderRadius: R.xxl,
    borderWidth: 1, borderColor: C.borderUp,
    alignItems: 'center', gap: S.xl,
  },
  modalTitle: { fontSize: T.lg, fontWeight: W.bold, color: C.text, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: S.md, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: R.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  modalCancelText: { fontSize: T.md, fontWeight: W.semi, color: C.textSub },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: R.lg,
    backgroundColor: 'rgba(248,113,113,0.15)',
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(248,113,113,0.3)',
  },
  modalConfirmText: { fontSize: T.md, fontWeight: W.bold, color: C.red },
  safetyOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: S.lg,
  },
  safetyOverlayCard: {
    backgroundColor: '#141722',
    borderWidth: 1,
    borderColor: C.borderUp,
    borderRadius: R.xxl,
    padding: S.xl,
    gap: S.md,
  },
  safetyOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
  },
  safetyOverlayTitle: {
    color: C.text,
    fontSize: T.xl,
    fontWeight: W.bold,
    textAlign: 'center',
  },
  safetyOverlaySubtitle: {
    color: C.textSub,
    fontSize: T.sm,
    textAlign: 'center',
  },
  safetyCountdownCircle: {
    borderRadius: R.full,
    width: 130,
    height: 130,
    alignSelf: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: S.md,
  },
  safetyCountdownCircleText: {
    color: C.text,
    fontSize: T.md,
    fontWeight: W.bold,
    textAlign: 'center',
  },
  slideTrack: {
    height: 56,
    borderRadius: R.full,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: S.md,
    overflow: 'hidden',
  },
  slideLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S.sm,
  },
  slideLabel: {
    fontSize: T.md,
    fontWeight: W.semi,
  },
  slideThumb: {
    position: 'absolute',
    left: 3,
    width: 44,
    height: 44,
    borderRadius: R.full,
    justifyContent: 'center',
    alignItems: 'center',
    top: 5,
  },
  addTimeButton: {
    marginTop: S.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.xs,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(232,184,75,0.35)',
    borderRadius: R.full,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
  },
  addTimeText: {
    color: C.gold,
    fontSize: T.sm,
    fontWeight: W.bold,
  },

  // Permission screen
  permissionScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: S.xl, gap: S.lg,
  },
  permissionTitle: { fontSize: T.lg, fontWeight: W.bold, color: C.text, textAlign: 'center' },
  permissionBtn: {
    paddingHorizontal: 32, paddingVertical: 14,
    backgroundColor: C.blue, borderRadius: R.full,
  },
  permissionBtnText: { fontSize: T.md, fontWeight: W.bold, color: '#fff' },
});
