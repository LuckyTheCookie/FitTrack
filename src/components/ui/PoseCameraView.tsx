// ============================================================================
// POSE CAMERA VIEW - Camera with MediaPipe Pose Detection
// Uses react-native-mediapipe-posedetection with react-native-vision-camera
// ============================================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
} from 'react-native-vision-camera';
import {
    usePoseDetection,
    RunningMode,
    Delegate,
    KnownPoseLandmarks,
    type PoseDetectionResultBundle,
} from 'react-native-mediapipe-posedetection';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line } from 'react-native-svg';

import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants';
import { useTranslation } from 'react-i18next';
import { 
    ExerciseType, 
    PoseLandmarks,
    countRepsFromPose,
    resetExerciseState,
    isPoseValid,
    detectPlankPosition,
    detectEllipticalMovement,
    type PlankDebugInfo,
    type EllipticalState,
} from '../../utils/poseDetection';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Skeleton connections for visualization (indices from KnownPoseLandmarks)
const SKELETON_CONNECTIONS: [number, number][] = [
    // Torso
    [KnownPoseLandmarks.leftShoulder, KnownPoseLandmarks.rightShoulder],
    [KnownPoseLandmarks.leftShoulder, KnownPoseLandmarks.leftHip],
    [KnownPoseLandmarks.rightShoulder, KnownPoseLandmarks.rightHip],
    [KnownPoseLandmarks.leftHip, KnownPoseLandmarks.rightHip],
    // Left arm
    [KnownPoseLandmarks.leftShoulder, KnownPoseLandmarks.leftElbow],
    [KnownPoseLandmarks.leftElbow, KnownPoseLandmarks.leftWrist],
    // Right arm
    [KnownPoseLandmarks.rightShoulder, KnownPoseLandmarks.rightElbow],
    [KnownPoseLandmarks.rightElbow, KnownPoseLandmarks.rightWrist],
    // Left leg
    [KnownPoseLandmarks.leftHip, KnownPoseLandmarks.leftKnee],
    [KnownPoseLandmarks.leftKnee, KnownPoseLandmarks.leftAnkle],
    // Right leg
    [KnownPoseLandmarks.rightHip, KnownPoseLandmarks.rightKnee],
    [KnownPoseLandmarks.rightKnee, KnownPoseLandmarks.rightAnkle],
];

interface PoseCameraViewProps {
    facing?: 'front' | 'back';
    showDebugOverlay?: boolean;
    exerciseType?: ExerciseType;
    onRepDetected?: (newCount: number, feedback?: string) => void;
    onPoseDetected?: (landmarks: PoseLandmarks | null) => void;
    onPlankStateChange?: (isInPlank: boolean, confidence: number, debugInfo?: PlankDebugInfo) => void;
    onEllipticalStateChange?: (state: EllipticalState) => void;
    onCameraReady?: () => void;
    currentCount?: number;
    style?: any;
    isActive?: boolean;
    debugPlank?: boolean;
}

export const PoseCameraView: React.FC<PoseCameraViewProps> = ({
    facing = 'front', // Use front camera by default
    showDebugOverlay = false,
    exerciseType = 'squats',
    onRepDetected,
    onPoseDetected,
    onPlankStateChange,
    onEllipticalStateChange,
    onCameraReady,
    currentCount = 0,
    style,
    isActive = true,
    debugPlank = false,
}) => {
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice(facing);
    const [isReady, setIsReady] = useState(false);
    const [currentPose, setCurrentPose] = useState<PoseLandmarks | null>(null);
    const [cameraLayout, setCameraLayout] = useState({ width: 1, height: 1 });
    const [poseStatus, setPoseStatus] = useState<'detecting' | 'pose' | 'no-pose'>('detecting');
    const { t } = useTranslation();
    
    const countRef = useRef(currentCount);
    const exerciseTypeRef = useRef(exerciseType);

    // Update refs when props change
    useEffect(() => {
        countRef.current = currentCount;
    }, [currentCount]);

    // Track previous exercise type to only reset on actual change
    const prevExerciseTypeRef = useRef<ExerciseType | undefined>(undefined);
    
    useEffect(() => {
        // Only reset state when actually changing exercise type (not on initial mount for same type)
        if (prevExerciseTypeRef.current !== undefined && prevExerciseTypeRef.current !== exerciseType) {
            resetExerciseState(exerciseType);
        }
        exerciseTypeRef.current = exerciseType;
        prevExerciseTypeRef.current = exerciseType;
    }, [exerciseType]);

    // Track previous plank state to detect changes
    const prevPlankStateRef = useRef<boolean>(false);

    // Pose detection using MediaPipe
    const poseDetection = usePoseDetection(
        {
            onResults: useCallback((result: PoseDetectionResultBundle) => {
                // Get the first detected pose (if any)
                // Structure: result.results[0]?.landmarks[0] -> Landmark[]
                const poseResult = result.results?.[0];
                const landmarks = poseResult?.landmarks?.[0] as PoseLandmarks | undefined;
                
                // For elliptical, we only need the nose landmark, not full body validation
                const isElliptical = exerciseTypeRef.current === 'elliptical';
                const hasValidLandmarks = landmarks && landmarks.length >= 33;
                const poseIsValid = hasValidLandmarks && (isElliptical || isPoseValid(landmarks));
                
                if (poseIsValid && landmarks) {
                    setCurrentPose(landmarks);
                    setPoseStatus('pose');
                    onPoseDetected?.(landmarks);

                    // Handle plank exercise separately
                    if (exerciseTypeRef.current === 'plank') {
                        const plankState = detectPlankPosition(landmarks, debugPlank);
                        // Notify on state change or always if debug mode
                        if (plankState.isInPlankPosition !== prevPlankStateRef.current || debugPlank) {
                            if (plankState.isInPlankPosition !== prevPlankStateRef.current) {
                                prevPlankStateRef.current = plankState.isInPlankPosition;
                                if (plankState.isInPlankPosition) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                }
                            }
                            onPlankStateChange?.(plankState.isInPlankPosition, plankState.confidence, plankState.debugInfo);
                        }
                    } else if (exerciseTypeRef.current === 'elliptical') {
                        // Handle elliptical exercise - detect head movement
                        const ellipticalState = detectEllipticalMovement(landmarks);
                        onEllipticalStateChange?.(ellipticalState);
                    } else if (exerciseTypeRef.current) {
                        // Count reps for other exercises
                        const repResult = countRepsFromPose(
                            landmarks, 
                            exerciseTypeRef.current, 
                            countRef.current
                        );
                        
                        if (repResult.count > countRef.current) {
                            countRef.current = repResult.count;
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onRepDetected?.(repResult.count, repResult.feedback);
                        }
                    }
                } else {
                    setCurrentPose(null);
                    setPoseStatus('no-pose');
                    onPoseDetected?.(null);
                    
                    // If no pose detected during plank, consider it as "not in plank"
                    if (exerciseTypeRef.current === 'plank' && prevPlankStateRef.current) {
                        prevPlankStateRef.current = false;
                        onPlankStateChange?.(false, 0);
                    }
                }
            }, [onPoseDetected, onRepDetected, onPlankStateChange, onEllipticalStateChange, debugPlank]),
            onError: useCallback((error: any) => {
                console.error('[PoseCamera] Detection error:', error.message);
                setPoseStatus('no-pose');
            }, []),
        },
        RunningMode.LIVE_STREAM,
        'pose_landmarker_lite.task',
        {
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
            delegate: Delegate.GPU,
            mirrorMode: facing === 'front' ? 'mirror-front-only' : 'no-mirror',
        }
    );

    // Request permission on mount
    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission, requestPermission]);

    // Notify pose detection when device changes
    useEffect(() => {
        if (device) {
            poseDetection.cameraDeviceChangeHandler(device);
        }
    }, [device, poseDetection.cameraDeviceChangeHandler]);

    // Handle camera ready
    const handleCameraReady = useCallback(() => {
        console.log('[PoseCamera] Camera ready');
        setIsReady(true);
        onCameraReady?.();
    }, [onCameraReady]);

    // Handle layout change
    const handleLayout = useCallback((event: any) => {
        const { width, height } = event.nativeEvent.layout;
        setCameraLayout({ width, height });
        poseDetection.cameraViewLayoutChangeHandler(event);
    }, [poseDetection.cameraViewLayoutChangeHandler]);

    // Render skeleton overlay
    const renderSkeletonOverlay = () => {
        if (!currentPose || !showDebugOverlay) return null;

        const { width, height } = cameraLayout;

        // Transform landmark coordinates based on camera orientation
        // MediaPipe returns normalized coords [0-1], we need to map to view coords
        // For front camera in portrait mode, we may need to swap/mirror coordinates
        const transformPoint = (landmark: { x: number; y: number }) => {
            // The landmarks from MediaPipe are already in the correct orientation
            // Just mirror X for front camera (selfie mode)
            const x = facing === 'front' ? width * (1 - landmark.x) : width * landmark.x;
            const y = height * landmark.y;
            return { x, y };
        };

        return (
            <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${width} ${height}`}>
                {/* Draw skeleton lines */}
                {SKELETON_CONNECTIONS.map(([startIdx, endIdx], index) => {
                    const start = currentPose[startIdx];
                    const end = currentPose[endIdx];
                    
                    if (!start || !end) return null;
                    if ((start.visibility ?? 1) < 0.5 || (end.visibility ?? 1) < 0.5) return null;

                    const startPoint = transformPoint(start);
                    const endPoint = transformPoint(end);

                    return (
                        <Line
                            key={`line-${index}`}
                            x1={startPoint.x}
                            y1={startPoint.y}
                            x2={endPoint.x}
                            y2={endPoint.y}
                            stroke={Colors.cta}
                            strokeWidth={3}
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* Draw landmark points */}
                {currentPose.map((landmark, index) => {
                    if (!landmark || (landmark.visibility ?? 1) < 0.5) return null;

                    const point = transformPoint(landmark);

                    return (
                        <Circle
                            key={`point-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r={5}
                            fill={Colors.cta}
                            stroke="#fff"
                            strokeWidth={2}
                        />
                    );
                })}
            </Svg>
        );
    };

    // No permission
    if (!hasPermission) {
        return (
            <View style={[styles.container, style]}>
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionText}>
                        {t('repCounter.cameraPermissionRequired')}
                    </Text>
                    <TouchableOpacity 
                        style={styles.permissionButton}
                        onPress={requestPermission}
                    >
                        <Text style={styles.permissionButtonText}>
                            {t('repCounter.allowCamera')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // No device
    if (!device) {
        return (
            <View style={[styles.container, style]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.cta} />
                    <Text style={styles.loadingText}>{t('repCounter.cameraSearching')}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]} onLayout={handleLayout}>
            {isActive && (
                <Camera
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={isActive}
                    frameProcessor={poseDetection.frameProcessor}
                    onStarted={handleCameraReady}
                    onError={(error) => console.error('[PoseCamera] Camera error:', error)}
                    onOutputOrientationChanged={poseDetection.cameraOrientationChangedHandler}
                    pixelFormat="rgb"
                    photo={true}
                />
            )}

            {/* Skeleton overlay */}
            {renderSkeletonOverlay()}

            {/* Status indicator */}
            {showDebugOverlay && (
                <View style={styles.statusContainer}>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: poseStatus === 'pose' ? Colors.success : 
                                          poseStatus === 'no-pose' ? Colors.error : Colors.warning }
                    ]} />
                    <Text style={styles.statusText}>
                        {poseStatus === 'pose' ? t('repCounter.pose.detected') : 
                         poseStatus === 'no-pose' ? t('repCounter.pose.noPose') : t('repCounter.pose.detecting')}
                    </Text>
                </View>
            )}

            {/* Loading overlay */}
            {!isReady && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.cta} />
                    <Text style={styles.loadingText}>{t('common.loading')}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    permissionText: {
        fontSize: FontSize.lg,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    permissionButton: {
        backgroundColor: Colors.cta,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    permissionButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: FontSize.md,
        color: Colors.muted,
        marginTop: Spacing.md,
    },
    statusContainer: {
        position: 'absolute',
        top: Spacing.md,
        left: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: Spacing.sm,
    },
    statusText: {
        fontSize: FontSize.sm,
        color: Colors.text,
    },
});

export default PoseCameraView;
