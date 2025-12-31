// ============================================================================
// POSE DETECTION UTILS - Using react-native-mediapipe-posedetection
// ============================================================================

import { KnownPoseLandmarks } from 'react-native-mediapipe-posedetection';

// Types for pose detection
export type ExerciseType = 'pushups' | 'situps' | 'squats' | 'jumping_jacks';

// MediaPipe landmark structure (from the package)
export interface Landmark {
    x: number;  // Normalized 0-1
    y: number;  // Normalized 0-1
    z: number;  // Depth (relative)
    visibility?: number;  // Confidence 0-1
    presence?: number;    // Presence confidence 0-1
}

// A pose is an array of 33 landmarks indexed by KnownPoseLandmarks
export type PoseLandmarks = Landmark[];

export interface RepState {
    count: number;
    stage: 'up' | 'down' | null;
    lastUpdate: number;
}

// Minimum confidence threshold for considering a landmark valid
const VISIBILITY_THRESHOLD = 0.5;

// Cooldown between reps in milliseconds
const REP_COOLDOWN = 500;

// Internal state tracking per exercise
const exerciseStates: Record<string, RepState> = {};

/**
 * Get a landmark from the pose array with confidence check
 */
export const getLandmark = (
    landmarks: PoseLandmarks,
    index: number
): Landmark | null => {
    const lm = landmarks[index];
    if (!lm) return null;
    if ((lm.visibility ?? 1) < VISIBILITY_THRESHOLD) return null;
    return lm;
};

/**
 * Calculate the angle between three points (A, B, C) where B is the vertex
 * Returns angle in degrees
 */
export const calculateAngle = (
    a: Landmark | null,
    b: Landmark | null,
    c: Landmark | null
): number => {
    if (!a || !b || !c) return 0;

    const radians =
        Math.atan2(c.y - b.y, c.x - b.x) -
        Math.atan2(a.y - b.y, a.x - b.x);

    let angle = Math.abs((radians * 180.0) / Math.PI);

    if (angle > 180.0) {
        angle = 360 - angle;
    }

    return angle;
};

/**
 * Get the better angle from left or right side (average or best available)
 */
const getBestAngle = (
    landmarks: PoseLandmarks,
    leftA: number,
    leftB: number,
    leftC: number,
    rightA: number,
    rightB: number,
    rightC: number
): number => {
    const leftAngle = calculateAngle(
        getLandmark(landmarks, leftA),
        getLandmark(landmarks, leftB),
        getLandmark(landmarks, leftC)
    );
    const rightAngle = calculateAngle(
        getLandmark(landmarks, rightA),
        getLandmark(landmarks, rightB),
        getLandmark(landmarks, rightC)
    );
    
    if (leftAngle > 0 && rightAngle > 0) {
        return (leftAngle + rightAngle) / 2;
    } else if (leftAngle > 0) {
        return leftAngle;
    } else if (rightAngle > 0) {
        return rightAngle;
    }
    return 0;
};

/**
 * Reset the exercise state (call when switching exercises)
 */
export const resetExerciseState = (exerciseType?: ExerciseType): void => {
    if (exerciseType) {
        delete exerciseStates[exerciseType];
    } else {
        Object.keys(exerciseStates).forEach((key) => delete exerciseStates[key]);
    }
};

/**
 * Process pose landmarks to count reps based on exercise type
 * @param landmarks - Array of 33 MediaPipe landmarks
 * @param exerciseType - Type of exercise being performed
 * @param currentCount - Current rep count
 * @returns Updated count, optional feedback, and current stage
 */
export const countRepsFromPose = (
    landmarks: PoseLandmarks,
    exerciseType: ExerciseType,
    currentCount: number
): { count: number; feedback?: string; stage: 'up' | 'down' | null } => {
    // Initialize state if needed
    if (!exerciseStates[exerciseType]) {
        exerciseStates[exerciseType] = { count: 0, stage: null, lastUpdate: 0 };
    }

    const state = exerciseStates[exerciseType];
    const now = Date.now();
    let newCount = currentCount;
    let feedback: string | undefined;

    // Check cooldown
    if (now - state.lastUpdate < REP_COOLDOWN && state.lastUpdate > 0) {
        return { count: newCount, stage: state.stage };
    }

    // Verify we have enough landmarks
    if (!landmarks || landmarks.length < 33) {
        return { count: newCount, stage: state.stage };
    }

    switch (exerciseType) {
        case 'pushups': {
            // Pushups: Track elbow angle (shoulder - elbow - wrist)
            const elbowAngle = getBestAngle(
                landmarks,
                KnownPoseLandmarks.leftShoulder, KnownPoseLandmarks.leftElbow, KnownPoseLandmarks.leftWrist,
                KnownPoseLandmarks.rightShoulder, KnownPoseLandmarks.rightElbow, KnownPoseLandmarks.rightWrist
            );

            if (elbowAngle > 0) {
                // Arms extended (up position): angle > 150
                if (elbowAngle > 150) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = 'Bien joué! 💪';
                        state.lastUpdate = now;
                    }
                    state.stage = 'up';
                }
                // Arms bent (down position): angle < 90
                else if (elbowAngle < 90) {
                    state.stage = 'down';
                }
            }
            break;
        }

        case 'squats': {
            // Squats: Track knee angle (hip - knee - ankle)
            const kneeAngle = getBestAngle(
                landmarks,
                KnownPoseLandmarks.leftHip, KnownPoseLandmarks.leftKnee, KnownPoseLandmarks.leftAnkle,
                KnownPoseLandmarks.rightHip, KnownPoseLandmarks.rightKnee, KnownPoseLandmarks.rightAnkle
            );

            if (kneeAngle > 0) {
                // Standing (up position): angle > 160
                if (kneeAngle > 160) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = 'Squat parfait! 🦵';
                        state.lastUpdate = now;
                    }
                    state.stage = 'up';
                }
                // Deep squat (down position): angle < 100
                else if (kneeAngle < 100) {
                    state.stage = 'down';
                }
            }
            break;
        }

        case 'situps': {
            // Situps: Track hip angle (shoulder - hip - knee)
            const hipAngle = getBestAngle(
                landmarks,
                KnownPoseLandmarks.leftShoulder, KnownPoseLandmarks.leftHip, KnownPoseLandmarks.leftKnee,
                KnownPoseLandmarks.rightShoulder, KnownPoseLandmarks.rightHip, KnownPoseLandmarks.rightKnee
            );

            if (hipAngle > 0) {
                // Up position (sitting up): angle < 90
                if (hipAngle < 90) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = 'Super! 🔥';
                        state.lastUpdate = now;
                    }
                    state.stage = 'up';
                }
                // Lying down position: angle > 140
                else if (hipAngle > 140) {
                    state.stage = 'down';
                }
            }
            break;
        }

        case 'jumping_jacks': {
            // Jumping jacks: Track arm position relative to body
            const leftShoulder = getLandmark(landmarks, KnownPoseLandmarks.leftShoulder);
            const rightShoulder = getLandmark(landmarks, KnownPoseLandmarks.rightShoulder);
            const leftWrist = getLandmark(landmarks, KnownPoseLandmarks.leftWrist);
            const rightWrist = getLandmark(landmarks, KnownPoseLandmarks.rightWrist);

            if (leftShoulder && rightShoulder && leftWrist && rightWrist) {
                // Arms up: wrists above shoulders
                const armsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
                // Arms down: wrists below shoulders and relatively close to body
                const armsDown = leftWrist.y > leftShoulder.y && rightWrist.y > rightShoulder.y;

                if (armsUp) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = 'Jumping Jack! ⭐';
                        state.lastUpdate = now;
                    }
                    state.stage = 'up';
                } else if (armsDown) {
                    state.stage = 'down';
                }
            }
            break;
        }
    }

    // Sync the state count with actual count
    state.count = newCount;

    return { count: newCount, feedback, stage: state.stage };
};

/**
 * Get the current stage for an exercise
 */
export const getExerciseStage = (exerciseType: ExerciseType): 'up' | 'down' | null => {
    return exerciseStates[exerciseType]?.stage ?? null;
};

/**
 * Check if a pose is valid (has enough visible landmarks)
 */
export const isPoseValid = (landmarks: PoseLandmarks | null | undefined): boolean => {
    if (!landmarks || landmarks.length < 33) return false;
    
    // Check critical landmarks are visible
    const criticalIndices = [
        KnownPoseLandmarks.leftShoulder,
        KnownPoseLandmarks.rightShoulder,
        KnownPoseLandmarks.leftHip,
        KnownPoseLandmarks.rightHip,
    ];

    let visibleCount = 0;
    for (const idx of criticalIndices) {
        const lm = landmarks[idx];
        if (lm && (lm.visibility ?? 1) >= VISIBILITY_THRESHOLD) {
            visibleCount++;
        }
    }

    return visibleCount >= 3; // At least 3 of 4 critical points visible
};
