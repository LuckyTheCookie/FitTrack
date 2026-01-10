// ============================================================================
// USE REP COUNTER SOUNDS - Hook for managing rep counter audio
// ============================================================================

import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';

/**
 * Hook that manages all sound effects for the rep counter
 * Provides memoized play functions for each sound type
 */
export function useRepCounterSounds() {
    const repSound = useAudioPlayer(require('../../../assets/rep.mp3'));
    const keepGoingSound = useAudioPlayer(require('../../../assets/keepgoing.mp3'));
    const secondsSound = useAudioPlayer(require('../../../assets/seconds.mp3'));
    const newRecordSound = useAudioPlayer(require('../../../assets/new-record.mp3'));
    const finishedSound = useAudioPlayer(require('../../../assets/finished.mp3'));

    const playRepSound = useCallback(() => {
        try {
            repSound.seekTo(0);
            repSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [repSound]);

    const playKeepGoingSound = useCallback(() => {
        try {
            keepGoingSound.seekTo(0);
            keepGoingSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [keepGoingSound]);

    const playSecondsSound = useCallback(() => {
        try {
            secondsSound.seekTo(0);
            secondsSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [secondsSound]);

    const playNewRecordSound = useCallback(() => {
        try {
            newRecordSound.seekTo(0);
            newRecordSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [newRecordSound]);

    const playFinishedSound = useCallback(() => {
        try {
            finishedSound.seekTo(0);
            finishedSound.play();
        } catch (error) {
            // Ignore sound errors
        }
    }, [finishedSound]);

    return {
        playRepSound,
        playKeepGoingSound,
        playSecondsSound,
        playNewRecordSound,
        playFinishedSound,
    };
}
