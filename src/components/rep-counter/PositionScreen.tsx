// ============================================================================
// POSITION SCREEN - Instructions before starting exercise
// ============================================================================

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { Play, Camera, Timer, Smartphone, ArrowDown, Volume2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants';
import type { ExerciseConfig, DetectionMode } from './types';

interface PositionScreenProps {
    exercise: ExerciseConfig;
    onReady: () => void;
    detectionMode: DetectionMode;
}

/**
 * Screen showing positioning instructions before starting an exercise
 */
export function PositionScreen({ exercise, onReady, detectionMode }: PositionScreenProps) {
    const { t } = useTranslation();
    const bounce = useSharedValue(0);

    useEffect(() => {
        bounce.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000 }),
                withTiming(0, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    const bounceStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(bounce.value, [0, 1], [0, 10]) }],
    }));

    const instruction = detectionMode === 'camera'
        ? t((exercise.cameraInstructionKey || exercise.cameraInstruction) as string)
        : t((exercise.instructionKey || exercise.instruction) as string);

    return (
        <Animated.View entering={FadeIn} style={styles.container}>
            <Animated.View style={[styles.phoneIconWrapper, bounceStyle]}>
                <View style={[styles.phoneIcon, { borderColor: exercise.color }]}>
                    {detectionMode === 'camera' ? (
                        <Camera size={48} color={exercise.color} />
                    ) : exercise.isTimeBased ? (
                        <Timer size={48} color={exercise.color} />
                    ) : (
                        <Smartphone size={48} color={exercise.color} />
                    )}
                </View>
                {!exercise.isTimeBased && (
                    <ArrowDown size={32} color={exercise.color} style={styles.arrowIcon} />
                )}
            </Animated.View>

            <Text style={styles.title}>{instruction}</Text>
            <Text style={styles.subtitle}>
                {exercise.isTimeBased
                    ? t('repCounter.pressPlay')
                    : detectionMode === 'camera'
                        ? t('repCounter.cameraNote')
                        : t('repCounter.whenReady')
                }
            </Text>

            {/* Volume recommendation for time-based exercises */}
            {exercise.isTimeBased && (
                <View style={styles.volumeRecommendation}>
                    <Volume2 size={18} color="#facc15" />
                    <Text style={styles.volumeRecommendationText}>
                        {t('repCounter.volumeHint')}
                    </Text>
                </View>
            )}

            <TouchableOpacity onPress={onReady} activeOpacity={0.9} style={styles.readyButton}>
                <LinearGradient
                    colors={[exercise.color, `${exercise.color}dd`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.readyButtonGradient}
                >
                    <Play size={24} color="#fff" fill="#fff" />
                    <Text style={styles.readyButtonText}>{t('common.start')}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    phoneIconWrapper: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    phoneIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    arrowIcon: {
        marginTop: Spacing.sm,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    volumeRecommendation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: 'rgba(250, 204, 21, 0.15)',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.xl,
    },
    volumeRecommendationText: {
        fontSize: FontSize.sm,
        color: '#facc15',
    },
    readyButton: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    readyButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        paddingVertical: Spacing.lg,
    },
    readyButtonText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
});

export default PositionScreen;
