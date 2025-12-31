// ============================================================================
// POSE DETECTION UTILS - Using MLKit via vision-camera-pose-detector
// ============================================================================

// Types for pose detection
export type ExerciseType = 'pushups' | 'situps' | 'squats' | 'jumping_jacks';

export interface Landmark {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
}

export interface PoseLandmarks {
    nose?: Landmark;
    leftEye?: Landmark;
    rightEye?: Landmark;
    leftEar?: Landmark;
    rightEar?: Landmark;
    leftShoulder?: Landmark;
    rightShoulder?: Landmark;
    leftElbow?: Landmark;
    rightElbow?: Landmark;
    leftWrist?: Landmark;
    rightWrist?: Landmark;
    leftHip?: Landmark;
    rightHip?: Landmark;
    leftKnee?: Landmark;
    rightKnee?: Landmark;
    leftAnkle?: Landmark;
    rightAnkle?: Landmark;
    leftPinky?: Landmark;
    rightPinky?: Landmark;
    leftIndex?: Landmark;
    rightIndex?: Landmark;
    leftThumb?: Landmark;
    rightThumb?: Landmark;
    leftHeel?: Landmark;
    rightHeel?: Landmark;
    leftFootIndex?: Landmark;
    rightFootIndex?: Landmark;
}

export interface RepState {
    count: number;
    stage: 'up' | 'down' | null;
    lastUpdate: number;
}

// Minimum confidence threshold for considering a landmark valid
const CONFIDENCE_THRESHOLD = 0.5;

// Cooldown between reps in milliseconds
const REP_COOLDOWN = 500;

// Internal state tracking per exercise
const exerciseStates: Record<string, RepState> = {};

/**
 * Calculate the angle between three points (A, B, C) where B is the vertex
 */
export const calculateAngle = (
    a: Landmark | undefined,
    b: Landmark | undefined,
    c: Landmark | undefined
): number => {
    if (!a || !b || !c) return 0;
    if ((a.visibility ?? 1) < CONFIDENCE_THRESHOLD) return 0;
    if ((b.visibility ?? 1) < CONFIDENCE_THRESHOLD) return 0;
    if ((c.visibility ?? 1) < CONFIDENCE_THRESHOLD) return 0;

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
 * Get the better angle from left or right side
 */
const getBestAngle = (
    leftA: Landmark | undefined,
    leftB: Landmark | undefined,
    leftC: Landmark | undefined,
    rightA: Landmark | undefined,
    rightB: Landmark | undefined,
    rightC: Landmark | undefined
): number => {
    const leftAngle = calculateAngle(leftA, leftB, leftC);
    const rightAngle = calculateAngle(rightA, rightB, rightC);
    
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
 * Process pose landmarks to count reps based on exercise type
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

    switch (exerciseType) {
        case 'pushups': {
            // Pushups: Track elbow angle (shoulder - elbow - wrist)
            const elbowAngle = getBestAngle(
                landmarks.leftShoulder, landmarks.leftElbow, landmarks.leftWrist,
                landmarks.rightShoulder, landmarks.rightElbow, landmarks.rightWrist
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
                landmarks.leftHip, landmarks.leftKnee, landmarks.leftAnkle,
                landmarks.rightHip, landmarks.rightKnee, landmarks.rightAnkle
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
                landmarks.leftShoulder, landmarks.leftHip, landmarks.leftKnee,
                landmarks.rightShoulder, landmarks.rightHip, landmarks.rightKnee
            );

            if (hipAngle > 0) {
                // Sitting up (small angle): < 70
                if (hipAngle < 70) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = 'Abdos en feu! 🔥';
                        state.lastUpdate = now;
                    }
                    state.stage = 'up';
                }
                // Laying down (large angle): > 120
                else if (hipAngle > 120) {
                    state.stage = 'down';
                }
            }
            break;
        }

        case 'jumping_jacks': {
            // Jumping jacks: Track arm position relative to shoulders
            const leftWrist = landmarks.leftWrist;
            const rightWrist = landmarks.rightWrist;
            const leftShoulder = landmarks.leftShoulder;
            const rightShoulder = landmarks.rightShoulder;
            const leftHip = landmarks.leftHip;
            const rightHip = landmarks.rightHip;

            if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
                // Hands above shoulders (up position)
                const handsUp = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
                // Hands at/below hips (down position)  
                const handsDown = leftHip && rightHip && 
                    leftWrist.y > leftHip.y && rightWrist.y > rightHip.y;

                if (handsUp) {
                    if (state.stage === 'down') {
                        newCount++;
                        feedback = 'Super saut! ⭐';
                        state.lastUpdate = now;
                    }
                    state.stage = 'up';
                } else if (handsDown) {
                    state.stage = 'down';
                }
            }
            break;
        }
    }

    // Update internal state count
    state.count = newCount;
    
    return { count: newCount, feedback, stage: state.stage };
};

/**
 * Reset exercise state
 */
export const resetExerciseState = (exerciseType: ExerciseType): void => {
    if (exerciseStates[exerciseType]) {
        exerciseStates[exerciseType] = { count: 0, stage: null, lastUpdate: 0 };
    }
};

/**
 * Reset all exercise states
 */
export const resetAllExerciseStates = (): void => {
    Object.keys(exerciseStates).forEach(key => {
        exerciseStates[key] = { count: 0, stage: null, lastUpdate: 0 };
    });
};

/**
 * Convert MLKit pose array to our PoseLandmarks format
 * MLKit returns 33 landmarks in a specific order
 */
export const convertMLKitPose = (mlkitLandmarks: any[]): PoseLandmarks | null => {
    if (!mlkitLandmarks || mlkitLandmarks.length < 25) {
        return null;
    }

    // MLKit Pose landmark indices
    // 0: nose, 1: left eye inner, 2: left eye, 3: left eye outer
    // 4: right eye inner, 5: right eye, 6: right eye outer
    // 7: left ear, 8: right ear, 9: mouth left, 10: mouth right
    // 11: left shoulder, 12: right shoulder
    // 13: left elbow, 14: right elbow
    // 15: left wrist, 16: right wrist
    // 17: left pinky, 18: right pinky
    // 19: left index, 20: right index
    // 21: left thumb, 22: right thumb
    // 23: left hip, 24: right hip
    // 25: left knee, 26: right knee
    // 27: left ankle, 28: right ankle
    // 29: left heel, 30: right heel
    // 31: left foot index, 32: right foot index

    const getLandmark = (index: number): Landmark | undefined => {
        const lm = mlkitLandmarks[index];
        if (!lm) return undefined;
        return {
            x: lm.x ?? lm.position?.x ?? 0,
            y: lm.y ?? lm.position?.y ?? 0,
            z: lm.z ?? lm.position?.z,
            visibility: lm.inFrameLikelihood ?? lm.visibility ?? 1,
        };
    };

    return {
        nose: getLandmark(0),
        leftEye: getLandmark(2),
        rightEye: getLandmark(5),
        leftEar: getLandmark(7),
        rightEar: getLandmark(8),
        leftShoulder: getLandmark(11),
        rightShoulder: getLandmark(12),
        leftElbow: getLandmark(13),
        rightElbow: getLandmark(14),
        leftWrist: getLandmark(15),
        rightWrist: getLandmark(16),
        leftHip: getLandmark(23),
        rightHip: getLandmark(24),
        leftKnee: getLandmark(25),
        rightKnee: getLandmark(26),
        leftAnkle: getLandmark(27),
        rightAnkle: getLandmark(28),
        leftPinky: getLandmark(17),
        rightPinky: getLandmark(18),
        leftIndex: getLandmark(19),
        rightIndex: getLandmark(20),
        leftThumb: getLandmark(21),
        rightThumb: getLandmark(22),
        leftHeel: getLandmark(29),
        rightHeel: getLandmark(30),
        leftFootIndex: getLandmark(31),
        rightFootIndex: getLandmark(32),
    };
};
