// ============================================================================
// USE ELLIPTICAL CALIBRATION - Hook for elliptical bike calibration
// ============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import {
    startEllipticalStillFirstCalibration,
    completeEllipticalStillPhase,
    completeEllipticalPedalingPhase,
    resetEllipticalState,
    resetEllipticalSamples,
    hasEllipticalMovementStarted,
} from '../../utils/poseDetection';
import type { EllipticalCalibrationPhase } from './types';

interface UseEllipticalCalibrationProps {
    playSecondsSound: () => void;
    playNewRecordSound: () => void;
    onCalibrationComplete: () => void;
    onCalibrationFailed: () => void;
}

/**
 * Hook that manages the elliptical bike calibration process
 * Handles the multi-phase calibration: get ready → still → pedaling → complete
 */
export function useEllipticalCalibration({
    playSecondsSound,
    playNewRecordSound,
    onCalibrationComplete,
    onCalibrationFailed,
}: UseEllipticalCalibrationProps) {
    const { t } = useTranslation();
    
    const [calibrationPhase, setCalibrationPhase] = useState<EllipticalCalibrationPhase>('none');
    const [calibrationCountdown, setCalibrationCountdown] = useState(0);
    const [calibrationFunnyPhrase, setCalibrationFunnyPhrase] = useState('');
    const [waitingForMovement, setWaitingForMovement] = useState(false);
    const [calibrationFailed, setCalibrationFailed] = useState(false);
    
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const movementDetectionRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Get random funny phrase from translations
    const getRandomPhrase = useCallback((key: 'funnyStillPhrases' | 'funnyStillDone') => {
        const phrases = t(`repCounter.elliptical.${key}`, { returnObjects: true }) as string[];
        if (Array.isArray(phrases) && phrases.length > 0) {
            return phrases[Math.floor(Math.random() * phrases.length)];
        }
        return '';
    }, [t]);

    // Clear all intervals
    const clearAllIntervals = useCallback(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        if (movementDetectionRef.current) {
            clearInterval(movementDetectionRef.current);
            movementDetectionRef.current = null;
        }
    }, []);

    // Complete pedaling phase and finalize calibration
    const completePedalingPhaseCallback = useCallback(() => {
        const success = completeEllipticalPedalingPhase();
        if (success) {
            setCalibrationPhase('complete');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playNewRecordSound();
            
            // Start tracking after brief celebration
            setTimeout(() => {
                onCalibrationComplete();
            }, 2000);
        } else {
            setCalibrationPhase('intro');
            setCalibrationFailed(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onCalibrationFailed();
        }
    }, [playNewRecordSound, onCalibrationComplete, onCalibrationFailed]);

    // Start the actual pedaling countdown (after movement detected)
    const startPedalingCountdown = useCallback(() => {
        resetEllipticalSamples();
        setCalibrationCountdown(7);
        
        setTimeout(() => {
            countdownIntervalRef.current = setInterval(() => {
                setCalibrationCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current!);
                        completePedalingPhaseCallback();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, 1000);
    }, [completePedalingPhaseCallback]);

    // Wait for user to actually start moving before starting the pedaling timer
    const waitForUserToStartPedaling = useCallback(() => {
        setCalibrationPhase('pedaling');
        resetEllipticalSamples();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        setWaitingForMovement(true);
        setCalibrationCountdown(7);
        
        movementDetectionRef.current = setInterval(() => {
            if (hasEllipticalMovementStarted()) {
                clearInterval(movementDetectionRef.current!);
                movementDetectionRef.current = null;
                setWaitingForMovement(false);
                startPedalingCountdown();
            }
        }, 200);
    }, [startPedalingCountdown]);

    // Complete the still phase
    const completeStillPhase = useCallback(() => {
        const variance = completeEllipticalStillPhase();
        if (variance >= 0) {
            setCalibrationFunnyPhrase(getRandomPhrase('funnyStillDone'));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            setTimeout(() => {
                waitForUserToStartPedaling();
            }, 1500);
        } else {
            setCalibrationPhase('intro');
            setCalibrationFailed(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onCalibrationFailed();
        }
    }, [getRandomPhrase, waitForUserToStartPedaling, onCalibrationFailed]);

    // Start the "don't move" phase (5 seconds)
    const startStillPhase = useCallback(() => {
        setCalibrationPhase('still');
        setCalibrationFunnyPhrase(getRandomPhrase('funnyStillPhrases'));
        startEllipticalStillFirstCalibration();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        setCalibrationCountdown(5);
        
        setTimeout(() => {
            countdownIntervalRef.current = setInterval(() => {
                setCalibrationCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current!);
                        completeStillPhase();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, 1000);
    }, [getRandomPhrase, completeStillPhase]);

    // Start the calibration sequence
    const beginCalibrationSequence = useCallback(() => {
        setCalibrationPhase('get_ready');
        setCalibrationCountdown(3);
        playSecondsSound();
        
        setTimeout(() => {
            countdownIntervalRef.current = setInterval(() => {
                setCalibrationCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownIntervalRef.current!);
                        startStillPhase();
                        return 0;
                    }
                    playSecondsSound();
                    return prev - 1;
                });
            }, 1000);
        }, 1000);
    }, [playSecondsSound, startStillPhase]);

    // Start calibration from intro
    const startCalibration = useCallback(() => {
        setCalibrationFailed(false);
        resetEllipticalState();
        setCalibrationPhase('intro');
    }, []);

    // Reset calibration
    const resetCalibration = useCallback(() => {
        clearAllIntervals();
        resetEllipticalState();
        setCalibrationPhase('none');
        setCalibrationCountdown(0);
        setCalibrationFunnyPhrase('');
        setWaitingForMovement(false);
        setCalibrationFailed(false);
    }, [clearAllIntervals]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearAllIntervals();
        };
    }, [clearAllIntervals]);

    return {
        calibrationPhase,
        setCalibrationPhase,
        calibrationCountdown,
        calibrationFunnyPhrase,
        waitingForMovement,
        calibrationFailed,
        startCalibration,
        beginCalibrationSequence,
        resetCalibration,
    };
}
