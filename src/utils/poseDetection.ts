// ============================================================================
// POSE DETECTION UTILS - Using react-native-mediapipe-posedetection
// ============================================================================

import { KnownPoseLandmarks } from 'react-native-mediapipe-posedetection';

// Types for pose detection
export type ExerciseType = 'pushups' | 'situps' | 'squats' | 'jumping_jacks' | 'plank';

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

// Plank detection state
export interface PlankState {
    isInPlankPosition: boolean;
    lastUpdate: number;
    confidence: number;
}

// Current plank state (exported for external use)
let currentPlankState: PlankState = {
    isInPlankPosition: false,
    lastUpdate: 0,
    confidence: 0,
};

// Minimum confidence threshold for considering a landmark valid
const VISIBILITY_THRESHOLD = 0.3; // Lowered for better detection

// Cooldown between reps in milliseconds
const REP_COOLDOWN = 400; // Faster response

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
 * Detect if user is in plank position
 * A plank is detected when:
 * - Body is roughly horizontal (shoulders and hips at similar heights)
 * - Arms are extended (elbows relatively straight)
 * - User is facing down (nose below shoulders)
 */
export const detectPlankPosition = (landmarks: PoseLandmarks): PlankState => {
    const now = Date.now();
    
    // Get key landmarks
    const leftShoulder = getLandmark(landmarks, KnownPoseLandmarks.leftShoulder);
    const rightShoulder = getLandmark(landmarks, KnownPoseLandmarks.rightShoulder);
    const leftHip = getLandmark(landmarks, KnownPoseLandmarks.leftHip);
    const rightHip = getLandmark(landmarks, KnownPoseLandmarks.rightHip);
    const leftElbow = getLandmark(landmarks, KnownPoseLandmarks.leftElbow);
    const rightElbow = getLandmark(landmarks, KnownPoseLandmarks.rightElbow);
    const leftWrist = getLandmark(landmarks, KnownPoseLandmarks.leftWrist);
    const rightWrist = getLandmark(landmarks, KnownPoseLandmarks.rightWrist);
    const nose = getLandmark(landmarks, KnownPoseLandmarks.nose);
    const leftAnkle = getLandmark(landmarks, KnownPoseLandmarks.leftAnkle);
    const rightAnkle = getLandmark(landmarks, KnownPoseLandmarks.rightAnkle);

    // Need minimum landmarks
    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
        currentPlankState = { isInPlankPosition: false, lastUpdate: now, confidence: 0 };
        return currentPlankState;
    }

    let confidenceScore = 0;
    const checks: boolean[] = [];

    // Check 1: Body is horizontal - shoulders and hips at similar Y level
    // In camera view, Y increases downward, so horizontal means similar Y values
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const bodyTilt = Math.abs(avgShoulderY - avgHipY);
    const isHorizontal = bodyTilt < 0.15; // Allow some tilt
    checks.push(isHorizontal);
    if (isHorizontal) confidenceScore += 0.25;

    // Check 2: User is low (not standing up) - hips should be in lower half of frame
    // Or shoulders and hips both relatively high in Y (meaning body is low in camera)
    const isLowPosition = avgHipY > 0.4 && avgShoulderY > 0.3;
    checks.push(isLowPosition);
    if (isLowPosition) confidenceScore += 0.25;

    // Check 3: Arms extended (elbow angle > 150 degrees) - supporting the body
    if (leftElbow && leftWrist && rightElbow && rightWrist) {
        const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
        const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
        const armsExtended = avgArmAngle > 140;
        checks.push(armsExtended);
        if (armsExtended) confidenceScore += 0.25;
    }

    // Check 4: Body forms a straight line (shoulder-hip-ankle alignment)
    if (leftAnkle && rightAnkle) {
        const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
        // In plank, ankle Y should be similar or slightly lower than hip Y
        const legsInLine = Math.abs(avgAnkleY - avgHipY) < 0.2;
        checks.push(legsInLine);
        if (legsInLine) confidenceScore += 0.25;
    }

    // Consider it a plank if confidence is high enough
    const isInPlank = confidenceScore >= 0.5; // At least 2 of 4 checks pass
    
    // Hysteresis: require higher confidence to enter, lower to exit
    const wasInPlank = currentPlankState.isInPlankPosition;
    const enterThreshold = 0.5;
    const exitThreshold = 0.25;
    
    let finalIsInPlank = isInPlank;
    if (wasInPlank && confidenceScore >= exitThreshold) {
        finalIsInPlank = true; // Stay in plank
    } else if (!wasInPlank && confidenceScore >= enterThreshold) {
        finalIsInPlank = true; // Enter plank
    } else {
        finalIsInPlank = false; // Exit or stay out
    }

    currentPlankState = {
        isInPlankPosition: finalIsInPlank,
        lastUpdate: now,
        confidence: confidenceScore,
    };

    console.log(`[Plank] Confidence: ${(confidenceScore * 100).toFixed(0)}% | Horizontal: ${isHorizontal} | Low: ${isLowPosition} | InPlank: ${finalIsInPlank}`);

    return currentPlankState;
};

/**
 * Get current plank state
 */
export const getPlankState = (): PlankState => currentPlankState;

/**
 * Reset plank state
 */
export const resetPlankState = (): void => {
    currentPlankState = { isInPlankPosition: false, lastUpdate: 0, confidence: 0 };
};

/**
 * Reset the exercise state (call when switching exercises)
 */
export const resetExerciseState = (exerciseType?: ExerciseType): void => {
    if (exerciseType) {
        delete exerciseStates[exerciseType];
        if (exerciseType === 'plank') {
            resetPlankState();
        }
    } else {
        Object.keys(exerciseStates).forEach((key) => delete exerciseStates[key]);
        resetPlankState();
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

    // Motivational feedbacks for variety
    const pushupFeedbacks = ['Bien joué! 💪', 'Continue! 🔥', 'Parfait! ⚡', 'Excellent! 🎯', 'Tu gères! 💥'];
    const squatFeedbacks = ['Squat parfait! 🦵', 'Belle forme! 💪', 'Continue! 🔥', 'Top! ⭐', 'Bravo! 🎉'];
    const situpFeedbacks = ['Super! 🔥', 'Les abdos brûlent! 💪', 'Continue! ⚡', 'Excellent! 🎯', 'Tu gères! 💥'];
    const jumpingFeedbacks = ['Jumping Jack! ⭐', 'Excellent! 🌟', 'Continue! 💫', 'Super! ✨', 'Yeah! 🎉'];

    const getRandomFeedback = (feedbacks: string[]) => feedbacks[Math.floor(Math.random() * feedbacks.length)];

    switch (exerciseType) {
        case 'pushups': {
            // Pushups: Track elbow angle (shoulder - elbow - wrist)
            const elbowAngle = getBestAngle(
                landmarks,
                KnownPoseLandmarks.leftShoulder, KnownPoseLandmarks.leftElbow, KnownPoseLandmarks.leftWrist,
                KnownPoseLandmarks.rightShoulder, KnownPoseLandmarks.rightElbow, KnownPoseLandmarks.rightWrist
            );

            if (elbowAngle > 0) {
                // Arms extended (up position): angle > 140 (relaxed from 150)
                if (elbowAngle > 140) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = getRandomFeedback(pushupFeedbacks);
                        state.lastUpdate = now;
                    }
                    state.stage = 'up';
                }
                // Arms bent (down position): angle < 100 (relaxed from 90)
                else if (elbowAngle < 100) {
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
                // Standing (up position): angle > 150 (relaxed from 160)
                if (kneeAngle > 150) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = getRandomFeedback(squatFeedbacks);
                        state.lastUpdate = now;
                    }
                    state.stage = 'up';
                }
                // Deep squat (down position): angle < 120 (relaxed from 100)
                else if (kneeAngle < 120) {
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
                // Up position (sitting up): angle < 100 (relaxed from 90)
                if (hipAngle < 100) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = getRandomFeedback(situpFeedbacks);
                        state.lastUpdate = now;
                    }
                    state.stage = 'up';
                }
                // Lying down position: angle > 130 (relaxed from 140)
                else if (hipAngle > 130) {
                    state.stage = 'down';
                }
            }
            break;
        }

        case 'jumping_jacks': {
            // Jumping jacks: Track arm position relative to body
            // On utilise les angles des bras plutôt que les positions absolues
            const leftShoulder = getLandmark(landmarks, KnownPoseLandmarks.leftShoulder);
            const rightShoulder = getLandmark(landmarks, KnownPoseLandmarks.rightShoulder);
            const leftWrist = getLandmark(landmarks, KnownPoseLandmarks.leftWrist);
            const rightWrist = getLandmark(landmarks, KnownPoseLandmarks.rightWrist);
            const leftElbow = getLandmark(landmarks, KnownPoseLandmarks.leftElbow);
            const rightElbow = getLandmark(landmarks, KnownPoseLandmarks.rightElbow);
            const leftHip = getLandmark(landmarks, KnownPoseLandmarks.leftHip);
            const rightHip = getLandmark(landmarks, KnownPoseLandmarks.rightHip);

            if (leftShoulder && rightShoulder && leftWrist && rightWrist && leftHip && rightHip) {
                // Calculer l'angle des bras par rapport au corps (hip-shoulder-wrist)
                const leftArmAngle = calculateAngle(leftHip, leftShoulder, leftWrist);
                const rightArmAngle = calculateAngle(rightHip, rightShoulder, rightWrist);
                
                // Arms up: angle > 120 (bras levés au-dessus de la tête ou sur les côtés)
                const armsUp = leftArmAngle > 100 && rightArmAngle > 100;
                // Arms down: angle < 60 (bras le long du corps)
                const armsDown = leftArmAngle < 70 && rightArmAngle < 70;

                if (armsUp) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = getRandomFeedback(jumpingFeedbacks);
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
