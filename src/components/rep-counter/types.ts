// ============================================================================
// REP COUNTER TYPES - Shared types for rep counter components
// ============================================================================

import type { PlankDebugInfo, EllipticalState } from '../../utils/poseDetection';

export type ExerciseType = 'pushups' | 'situps' | 'squats' | 'jumping_jacks' | 'plank' | 'elliptical';
export type DetectionMode = 'sensor' | 'camera' | 'manual';
export type CameraView = 'front' | 'side';
export type TutorialStep = 'select' | 'position' | 'ready' | 'counting' | 'done';
export type EllipticalCalibrationPhase = 
    | 'none' 
    | 'intro' 
    | 'get_ready' 
    | 'still' 
    | 'still_done' 
    | 'pedaling' 
    | 'complete' 
    | 'start_moving' 
    | 'moving' 
    | 'start_stopping' 
    | 'stopping' 
    | 'done';

export interface ExerciseConfig {
    id: ExerciseType;
    name: string;
    icon: string;
    color: string;
    instruction?: string;
    cameraInstruction?: string;
    instructionKey?: string;
    cameraInstructionKey?: string;
    manualInstructionKey?: string;
    threshold: number;
    axis: 'x' | 'y' | 'z';
    cooldown: number;
    supportsCameraMode: boolean;
    supportsManualMode?: boolean;
    requiresCalibration?: boolean;
    preferredCameraView: CameraView;
    isTimeBased?: boolean;
    keepGoingIntervalSeconds?: number;
}

export interface RepCounterState {
    step: TutorialStep;
    selectedExercise: ExerciseConfig | null;
    isTracking: boolean;
    repCount: number;
    elapsedTime: number;
    detectionMode: DetectionMode;
    currentPhase: 'up' | 'down' | 'neutral';
    motivationalMessage: { text: string; emoji: string } | null;
    aiFeedback: string | null;
    isPlankActive: boolean;
    plankSeconds: number;
    plankDebugInfo: PlankDebugInfo | null;
    showNewRecord: boolean;
    personalBest: number;
    ellipticalCalibrationPhase: EllipticalCalibrationPhase;
    ellipticalSeconds: number;
    isEllipticalActive: boolean;
    ellipticalState: EllipticalState | null;
    showExitModal: boolean;
    workoutSaved: boolean;
    waitingForMovement: boolean;
    calibrationCountdown: number;
    calibrationFunnyPhrase: string;
    ellipticalCalibrationFailed: boolean;
}

// Exercise configurations
export const EXERCISES: ExerciseConfig[] = [
    {
        id: 'pushups',
        name: 'Pompes',
        icon: '💪',
        color: '#4ade80',
        instructionKey: 'repCounter.instructions.pushups.default',
        cameraInstructionKey: 'repCounter.instructions.pushups.camera',
        threshold: 0.4,
        axis: 'z',
        cooldown: 600,
        supportsCameraMode: true,
        preferredCameraView: 'side',
    },
    {
        id: 'situps',
        name: 'Abdos',
        icon: '🔥',
        color: '#f97316',
        instructionKey: 'repCounter.instructions.situps.default',
        cameraInstructionKey: 'repCounter.instructions.situps.camera',
        threshold: 0.5,
        axis: 'z',
        cooldown: 800,
        supportsCameraMode: true,
        preferredCameraView: 'side',
    },
    {
        id: 'squats',
        name: 'Squats',
        icon: '🦵',
        color: '#8b5cf6',
        instructionKey: 'repCounter.instructions.squats.default',
        cameraInstructionKey: 'repCounter.instructions.squats.camera',
        threshold: 0.35,
        axis: 'y',
        cooldown: 700,
        supportsCameraMode: true,
        preferredCameraView: 'front',
    },
    {
        id: 'jumping_jacks',
        name: 'Jumping Jacks',
        icon: '⭐',
        color: '#eab308',
        instructionKey: 'repCounter.instructions.jumpingJacks.default',
        cameraInstructionKey: 'repCounter.instructions.jumpingJacks.camera',
        threshold: 0.6,
        axis: 'y',
        cooldown: 400,
        supportsCameraMode: true,
        preferredCameraView: 'front',
    },
    {
        id: 'plank',
        name: 'Planche',
        icon: '🧘',
        color: '#06b6d4',
        instructionKey: 'repCounter.instructions.plank.default',
        cameraInstructionKey: 'repCounter.instructions.plank.camera',
        threshold: 0.3,
        axis: 'z',
        cooldown: 500,
        supportsCameraMode: true,
        preferredCameraView: 'side',
        isTimeBased: true,
    },
    {
        id: 'elliptical',
        name: 'Vélo elliptique',
        icon: '🚴',
        color: '#10b981',
        instructionKey: 'repCounter.instructions.elliptical.default',
        cameraInstructionKey: 'repCounter.instructions.elliptical.camera',
        manualInstructionKey: 'repCounter.instructions.elliptical.manual',
        threshold: 0.3,
        axis: 'y',
        cooldown: 500,
        supportsCameraMode: true,
        supportsManualMode: true,
        requiresCalibration: true,
        preferredCameraView: 'front',
        isTimeBased: true,
        keepGoingIntervalSeconds: 300,
    },
];
