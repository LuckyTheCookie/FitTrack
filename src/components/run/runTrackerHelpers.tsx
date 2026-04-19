import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Siren, TriangleAlert } from 'lucide-react-native';
import i18n from '../../i18n';
import { type LatLng, type RunSegment } from '../../stores/runStore';
import type { SafetyContact } from '../../types';
import { C } from './runTrackerTokens';
import { styles } from './runTrackerStyles';

export function formatPace(secPerKm: number): string {
  if (secPerKm <= 0 || !isFinite(secPerKm) || secPerKm < 60 || secPerKm > 1800) return '--:--';
  const min = Math.floor(secPerKm / 60);
  const sec = Math.floor(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function pickMotivation(key: string): string | null {
  const messages = i18n.t(key, { returnObjects: true });
  if (!Array.isArray(messages) || messages.length === 0) return null;
  return messages[Math.floor(Math.random() * messages.length)];
}

export function checkSegmentMotivation(
  segments: RunSegment[],
  currentSegmentIndex: number,
  distanceKm: number,
  elapsedSeconds: number,
  triggeredMilestones: number[],
  plan: { targetDistanceKm?: number; targetPaceSecPerKm?: number; planType?: string } | null,
  currentPace: number,
): string | null {
  if (!plan) return null;

  if (segments.length > 0 && currentSegmentIndex < segments.length) {
    const seg = segments[currentSegmentIndex];
    if (seg.type === 'run') return pickMotivation('run.motivation.interval.startRun');
    if (seg.type === 'walk') return pickMotivation('run.motivation.interval.startWalk');
    if (seg.type === 'rest') return pickMotivation('run.motivation.interval.startRest');
  }

  const targetDist = plan.targetDistanceKm ?? 0;
  if (targetDist <= 0) return null;
  const progress = distanceKm / targetDist;

  if (plan.planType === 'long_run') {
    if (progress >= 0.25 && !triggeredMilestones.includes(25)) return pickMotivation('run.motivation.longRun.quarter');
    if (progress >= 0.50 && !triggeredMilestones.includes(50)) return pickMotivation('run.motivation.longRun.half');
    if (progress >= 0.75 && !triggeredMilestones.includes(75)) return pickMotivation('run.motivation.longRun.threeQuarters');
    if (progress >= 0.90 && !triggeredMilestones.includes(90)) return pickMotivation('run.motivation.longRun.almostDone');
  }

  if (plan.planType === 'interval' && segments.length > 0) {
    const halfwayIdx = Math.floor(segments.length / 2);
    if (currentSegmentIndex === halfwayIdx && !triggeredMilestones.includes(50)) {
      return pickMotivation('run.motivation.interval.halfway');
    }
    if (currentSegmentIndex === segments.length - 1 && !triggeredMilestones.includes(99)) {
      return pickMotivation('run.motivation.interval.lastSegment');
    }
  }

  const targetPace = plan.targetPaceSecPerKm ?? 0;
  if (targetPace > 0 && currentPace > 60 && currentPace < 1800) {
    if (currentPace > targetPace * 1.15) return pickMotivation('run.motivation.tooSlow');
    if (currentPace < targetPace * 0.85) return pickMotivation('run.motivation.tooFast');
  }

  return null;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

type GeoJSONPointGeometry = {
  type: 'Point';
  coordinates: [number, number];
};

type GeoJSONLineStringGeometry = {
  type: 'LineString';
  coordinates: [number, number][];
};

type GeoJSONFeature = {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: GeoJSONPointGeometry | GeoJSONLineStringGeometry;
};

export type GeoJSONFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
};

export function buildGeoJSON(coords: LatLng[]): GeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: coords.length >= 2 ? [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: coords.map(c => [c.longitude, c.latitude] as [number, number]),
      },
    }] : [],
  };
}

export function buildPointGeoJSON(coord: LatLng | null): GeoJSONFeatureCollection {
  if (!coord) {
    return { type: 'FeatureCollection', features: [] };
  }

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [coord.longitude, coord.latitude] },
    }],
  };
}

export const EMPTY_GEOJSON: GeoJSONFeatureCollection = { type: 'FeatureCollection', features: [] };
const RING_SIZE = 128;

export const MetricCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, color ? { color } : {}]}>{value}</Text>
  </View>
);

export const MotivationBubble = React.memo(({ message }: { message: string | null }) => {
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

export const SegmentIndicator = ({ segment, index, total }: {
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

export const SegmentedProgressBar = ({ segments, currentIndex, progressInSegment }: {
  segments: RunSegment[];
  currentIndex: number;
  progressInSegment: number;
}) => {
  const total = segments.length;
  if (total === 0) return null;

  return (
    <View style={styles.segProgressContainer}>
      {segments.map((seg, i) => {
        const segmentColor = seg.type === 'run' ? C.green
          : seg.type === 'walk' ? C.orange
          : C.textMuted;
        const fill = i < currentIndex ? 1
          : i === currentIndex ? Math.min(1, progressInSegment)
          : 0;

        return (
          <View key={`${seg.type}-${seg.label}-${i}`} style={[styles.segProgressSlot, { flex: 1 }]}>
            <View style={[styles.segProgressBg, i === 0 && { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }, i === total - 1 && { borderTopRightRadius: 3, borderBottomRightRadius: 3 }]}> 
              <View style={[styles.segProgressFill, {
                width: `${fill * 100}%`,
                backgroundColor: segmentColor,
              }, i === 0 && { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }, i === total - 1 && fill >= 1 && { borderTopRightRadius: 3, borderBottomRightRadius: 3 }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
};

export const ConfirmOverlay = ({
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

interface AlertSummary {
  success: SafetyContact[];
  failed: SafetyContact[];
  sentAt: number | string;
}

interface AlertSentOverlayProps {
  visible: boolean;
  alertSummary: AlertSummary | null;
  lastKnownPosition?: LatLng | null;
  alertGlowStyle: any;
  t: (key: string, options?: any) => string;
  onCallEmergency: () => void;
  onConfirmAllClear: () => void | Promise<void>;
  onOpenMap: (latitude: number, longitude: number) => void;
}

export const AlertSentOverlay = ({
  visible,
  alertSummary,
  lastKnownPosition,
  alertGlowStyle,
  t,
  onCallEmergency,
  onConfirmAllClear,
  onOpenMap,
}: AlertSentOverlayProps) => {
  if (!visible || !alertSummary) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.alertSentOverlay}>
      <Animated.View style={[styles.alertSentGlowEdges, alertGlowStyle]} />
      <SafeAreaView style={styles.alertSentSafeArea} edges={['top', 'bottom']}>
        <View style={styles.alertSentContent}>
          <View style={styles.alertSentIconWrap}>
            <Siren size={56} color="#ffd4d4" />
          </View>
          <Text style={styles.alertSentTitle}>{t('safety.alertSent.title')}</Text>
          <Text style={styles.alertSentSubtitle}>{t('safety.alertSent.subtitle')}</Text>

          <View style={styles.alertSentContactsCard}>
            <Text style={styles.alertSentContactsTitle}>{t('safety.alertSent.contacts')}</Text>
            {[...alertSummary.success.map((contact) => ({ contact, ok: true })), ...alertSummary.failed.map((contact) => ({ contact, ok: false }))].map(({ contact, ok }) => (
              <View key={contact.id} style={styles.alertSentContactRow}>
                {ok ? <CheckCircle2 size={14} color={C.green} /> : <TriangleAlert size={14} color={C.orange} />}
                <Text style={styles.alertSentContactName}>{contact.name}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.alertSentMeta}>
            {t('safety.alertSent.timestamp', { time: new Date(alertSummary.sentAt).toLocaleTimeString() })}
          </Text>

          {lastKnownPosition && (
            <TouchableOpacity
              onPress={() => onOpenMap(lastKnownPosition.latitude, lastKnownPosition.longitude)}
              style={styles.alertSentMapLinkBtn}
            >
              <Text style={styles.alertSentMapLinkText}>
                {t('safety.alertSent.position', {
                  latitude: lastKnownPosition.latitude.toFixed(5),
                  longitude: lastKnownPosition.longitude.toFixed(5),
                })}
              </Text>
              <Text style={styles.alertSentMapLinkSecondary}>{t('safety.alertSent.openMap')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.alertSentActions}>
          <TouchableOpacity style={styles.alertSentCallButton} onPress={onCallEmergency}>
            <Text style={styles.alertSentCallButtonText}>{t('safety.alertSent.callEmergency')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.alertSentOkButton} onPress={onConfirmAllClear}>
            <Text style={styles.alertSentOkButtonText}>{t('safety.alertSent.imOkCancel')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

interface IosSendPromptOverlayProps {
  visible: boolean;
  t: (key: string, options?: any) => string;
  onClose: () => void;
}

export const IosSendPromptOverlay = ({ visible, t, onClose }: IosSendPromptOverlayProps) => {
  if (!visible) return null;

  return (
    <View style={styles.iosPromptOverlay}>
      <View style={styles.iosPromptCard}>
        <Text style={styles.iosPromptTitle}>{t('safety.alert.sendSuccess')}</Text>
        <Text style={styles.iosPromptText}>{t('safety.alert.iosSendPrompt')}</Text>
        <TouchableOpacity style={styles.iosPromptButton} onPress={onClose}>
          <Text style={styles.iosPromptButtonText}>{t('common.ok')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
