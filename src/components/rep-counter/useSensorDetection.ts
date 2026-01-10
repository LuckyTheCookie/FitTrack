// ============================================================================
// USE SENSOR DETECTION - Hook for accelerometer-based rep detection
// ============================================================================

import { useRef, useCallback, useEffect } from 'react';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
import { runOnJS } from 'react-native-reanimated';
import type { ExerciseConfig } from './types';

interface UseSensorDetectionProps {
    selectedExercise: ExerciseConfig | null;
    isTracking: boolean;
    onRepDetected: () => void;
}

/**
 * Hook that manages accelerometer-based rep detection
 * Handles calibration, threshold detection with hysteresis, and cooldown
 */
export function useSensorDetection({
    selectedExercise,
    isTracking,
    onRepDetected,
}: UseSensorDetectionProps) {
    const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
    const lastRepTime = useRef(0);
    const isInRep = useRef(false);
    const baselineZ = useRef(0);
    const calibrationSamples = useRef<number[]>([]);
    const recentValues = useRef<number[]>([]);
    const peakValue = useRef(0);
    const wasAboveThreshold = useRef(false);
    const isCalibrated = useRef(false);

    const startSensorTracking = useCallback(() => {
        if (!selectedExercise) return;

        // Reset state
        calibrationSamples.current = [];
        recentValues.current = [];
        isInRep.current = false;
        lastRepTime.current = 0;
        peakValue.current = 0;
        wasAboveThreshold.current = false;
        isCalibrated.current = false;

        Accelerometer.setUpdateInterval(30); // ~33 Hz

        let calibrationCount = 0;
        const CALIBRATION_SAMPLES = 15;

        subscriptionRef.current = Accelerometer.addListener((data: AccelerometerMeasurement) => {
            const now = Date.now();
            const axis = selectedExercise.axis;
            const value = data[axis];

            // Calibration phase (first ~450ms)
            if (calibrationCount < CALIBRATION_SAMPLES) {
                calibrationSamples.current.push(value);
                calibrationCount++;
                if (calibrationCount === CALIBRATION_SAMPLES) {
                    baselineZ.current = calibrationSamples.current.reduce((a, b) => a + b, 0) / CALIBRATION_SAMPLES;
                    isCalibrated.current = true;
                }
                return;
            }

            // Add to smoothing buffer (moving average over 3 values)
            recentValues.current.push(value);
            if (recentValues.current.length > 3) {
                recentValues.current.shift();
            }

            // Calculate smoothed value
            const smoothedValue = recentValues.current.reduce((a, b) => a + b, 0) / recentValues.current.length;
            const delta = Math.abs(smoothedValue - baselineZ.current);
            const threshold = selectedExercise.threshold;
            const cooldown = selectedExercise.cooldown;

            // Detection with hysteresis
            // Count a rep when going ABOVE threshold then BELOW
            const isAboveThreshold = delta > threshold;

            if (isAboveThreshold) {
                // Track peak
                if (delta > peakValue.current) {
                    peakValue.current = delta;
                }
                wasAboveThreshold.current = true;
            } else if (wasAboveThreshold.current && delta < threshold * 0.4) {
                // Just went below threshold after being above
                // Check cooldown and minimum peak
                if ((now - lastRepTime.current) > cooldown && peakValue.current > threshold * 1.2) {
                    lastRepTime.current = now;
                    runOnJS(onRepDetected)();
                }
                // Reset for next rep
                wasAboveThreshold.current = false;
                peakValue.current = 0;
            }
        });
    }, [selectedExercise, onRepDetected]);

    const stopSensorTracking = useCallback(() => {
        if (subscriptionRef.current) {
            subscriptionRef.current.remove();
            subscriptionRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (subscriptionRef.current) {
                subscriptionRef.current.remove();
            }
        };
    }, []);

    return {
        startSensorTracking,
        stopSensorTracking,
        isCalibrated: isCalibrated.current,
    };
}
