import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import AnimatedView, { FadeIn, FadeOut, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Check, Clock3, PhoneCall, Shield, Siren } from 'lucide-react-native';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RING_SIZE = 112;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_CENTER = RING_SIZE / 2;

function withAlpha(hexColor: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const normalized = hexColor.replace('#', '');

  if (normalized.length !== 6) {
    return `rgba(255,255,255,${safeAlpha})`;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${safeAlpha})`;
}

function getRingColor(ratio: number): string {
  if (ratio > 0.5) return Colors.success;
  if (ratio > 0.2) return Colors.warning;
  return Colors.error;
}

interface SlideActionProps {
  label: string;
  color: string;
  icon: React.ReactNode;
  onComplete: () => void;
  disabled?: boolean;
}

function SlideAction({ label, color, icon, onComplete, disabled = false }: SlideActionProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbX = useRef(new Animated.Value(0)).current;
  const chevronsOpacity = useRef(new Animated.Value(0.25)).current;
  const maxX = Math.max(0, trackWidth - 52 - 8);
  const xRef = useRef(0);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronsOpacity, {
          toValue: 0.85,
          duration: 520,
          useNativeDriver: true,
        }),
        Animated.timing(chevronsOpacity, {
          toValue: 0.25,
          duration: 520,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [chevronsOpacity]);

  useEffect(() => {
    const id = thumbX.addListener(({ value }) => {
      xRef.current = value;
    });

    return () => {
      thumbX.removeListener(id);
    };
  }, [thumbX]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderMove: (_event, gestureState) => {
        const clamped = Math.max(0, Math.min(maxX, gestureState.dx));
        thumbX.setValue(clamped);
      },
      onPanResponderRelease: () => {
        if (disabled) {
          Animated.spring(thumbX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
          return;
        }

        if (maxX > 0 && xRef.current >= maxX * 0.85) {
          Animated.timing(thumbX, {
            toValue: maxX,
            duration: 110,
            useNativeDriver: true,
          }).start(() => {
            onComplete();
            Animated.timing(thumbX, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }).start();
          });
          return;
        }

        Animated.spring(thumbX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 8,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(thumbX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 8,
        }).start();
      },
    }),
    [disabled, maxX, onComplete, thumbX]
  );

  const labelOpacity = thumbX.interpolate({
    inputRange: [0, Math.max(1, maxX * 0.5)],
    outputRange: [0.7, 0.08],
    extrapolate: 'clamp',
  });

  const chevronsTranslate = thumbX.interpolate({
    inputRange: [0, Math.max(1, maxX)],
    outputRange: [0, 10],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.slideTrack,
        {
          backgroundColor: withAlpha(color, 0.12),
          borderColor: withAlpha(color, 0.35),
        },
      ]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.Text style={[styles.slideLabel, { opacity: labelOpacity }]} numberOfLines={1}>
        {label}
      </Animated.Text>

      <Animated.View
        style={[
          styles.chevrons,
          {
            opacity: chevronsOpacity,
            transform: [{ translateX: chevronsTranslate }],
          },
        ]}
      >
        <Text style={styles.chevronText}>{'›››'}</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.slideThumb,
          {
            backgroundColor: color,
            opacity: disabled ? 0.45 : 1,
            transform: [{ translateX: thumbX }],
          },
        ]}
        {...(!disabled ? panResponder.panHandlers : {})}
      >
        {icon}
      </Animated.View>
    </View>
  );
}

interface SafetyCheckOverlayProps {
  visible: boolean;
  isFallMode: boolean;
  pendingSeconds: number;
  autoAlertDelaySeconds: number;
  isSending: boolean;
  onImOk: () => void;
  onNeedHelp: () => void;
  onCall112: () => void;
  onExtendTime: (minutes: number) => void;
}

export function SafetyCheckOverlay({
  visible,
  isFallMode,
  pendingSeconds,
  autoAlertDelaySeconds,
  isSending,
  onImOk,
  onNeedHelp,
  onCall112,
  onExtendTime,
}: SafetyCheckOverlayProps) {
  const { t } = useTranslation();
  const [showAddTimeSheet, setShowAddTimeSheet] = useState(false);
  const ringPulse = useRef(new Animated.Value(1)).current;

  const total = Math.max(1, autoAlertDelaySeconds);
  const ratio = Math.max(0, Math.min(1, pendingSeconds / total));
  const ringColor = getRingColor(ratio);
  const dashOffset = RING_CIRCUMFERENCE * (1 - ratio);

  useEffect(() => {
    if (pendingSeconds >= 15 || isSending) {
      ringPulse.stopAnimation();
      ringPulse.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, {
          toValue: 1.06,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [isSending, pendingSeconds, ringPulse]);

  if (!visible) {
    return null;
  }

  return (
    <AnimatedView.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.overlay}>
      <View style={styles.overlayTint} />
      <BlurView intensity={20} tint="dark" style={styles.overlayBlur} />

      <AnimatedView.View entering={FadeInUp.duration(300)} exiting={FadeOut.duration(200)} style={styles.contentWrap}>
        <View style={styles.identityCard}>
          <View style={styles.identityRow}>
            <View style={styles.identityIconWrap}>
              {isFallMode ? <Siren size={32} color={Colors.warning} /> : <Shield size={32} color={Colors.text} />}
            </View>
            {isFallMode ? (<Text style={styles.identityTitle}>{t('safety.fall.title')}</Text>) : (<Text style={styles.identityTitle}>{t('safety.overlay.title')}</Text>)}
          </View>
          <View style={styles.identitySeparator} />
          <Text style={styles.identitySubtitle}>
            {isFallMode ? t('safety.fall.subtitle') : t('safety.overlay.subtitle')}
          </Text>
        </View>

        <Animated.View style={[styles.ringWrap, { transform: [{ scale: ringPulse }] }]}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={ringColor}
              strokeWidth={RING_STROKE}
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Text style={styles.ringValue}>{pendingSeconds}</Text>
            )}
            <Text style={styles.ringLabel}>{t('common.seconds')}</Text>
          </View>
        </Animated.View>

        <View style={styles.slidersWrap}>
          <SlideAction
            label={t('safety.overlay.slideImOk')}
            color={Colors.success}
            icon={<Check size={22} color="#fff" />}
            onComplete={onImOk}
            disabled={isSending}
          />
          <SlideAction
            label={t('safety.overlay.slideNeedHelp')}
            color={Colors.warning}
            icon={<Siren size={20} color="#fff" />}
            onComplete={onNeedHelp}
            disabled={isSending}
          />
          <SlideAction
            label={t('safety.overlay.slideCall112')}
            color={Colors.error}
            icon={<PhoneCall size={20} color="#fff" />}
            onComplete={onCall112}
            disabled={isSending}
          />
        </View>

        <TouchableOpacity style={styles.addTimeAction} onPress={() => setShowAddTimeSheet(true)} disabled={isSending}>
          <Clock3 size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.addTimeActionText}>{t('safety.overlay.addTime')}</Text>
        </TouchableOpacity>
      </AnimatedView.View>

      {showAddTimeSheet && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setShowAddTimeSheet(false)} />
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>{t('safety.overlay.addTimeOptions')}</Text>
            <View style={styles.sheetPillsRow}>
              <TouchableOpacity
                style={styles.sheetPill}
                onPress={() => {
                  onExtendTime(15);
                  setShowAddTimeSheet(false);
                }}
              >
                <Text style={styles.sheetPillText}>+15 {t('common.minShort')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetPill}
                onPress={() => {
                  onExtendTime(30);
                  setShowAddTimeSheet(false);
                }}
              >
                <Text style={styles.sheetPillText}>+30 {t('common.minShort')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetPill}
                onPress={() => {
                  onExtendTime(60);
                  setShowAddTimeSheet(false);
                }}
              >
                <Text style={styles.sheetPillText}>+1 {t('common.hour')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </AnimatedView.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  overlayBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrap: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 420,
    alignItems: 'center',
    gap: Spacing.md,
  },
  identityCard: {
    width: '88%',
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  identityRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  identityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  identityTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  identitySeparator: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  identitySubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ringValue: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: FontWeight.bold,
  },
  ringLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: FontSize.xs,
    textTransform: 'lowercase',
  },
  slidersWrap: {
    width: '100%',
    gap: 12,
  },
  slideTrack: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slideLabel: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    paddingHorizontal: 84,
  },
  chevrons: {
    position: 'absolute',
    left: 68,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  chevronText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  slideThumb: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeAction: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  addTimeActionText: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 14,
    fontWeight: FontWeight.medium,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 122,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheetCard: {
    minHeight: 200,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(11,12,15,0.98)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  sheetTitle: {
    color: Colors.text,
    textAlign: 'center',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  sheetPillsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sheetPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sheetPillText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
