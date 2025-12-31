// ============================================================================
// POSE CAMERA VIEW - Camera with MLKit Pose Detection
// Uses react-native-vision-camera with vision-camera-pose-detector plugin
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
    useFrameProcessor,
    CameraPosition,
} from 'react-native-vision-camera';
import { detectPose } from 'vision-camera-pose-detector';
import { Worklets } from 'react-native-worklets-core';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line } from 'react-native-svg';

import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants';
import { 
    ExerciseType, 
    PoseLandmarks, 
    countRepsFromPose, 
    convertMLKitPose,
    resetExerciseState 
} from '../../utils/poseDetection';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Skeleton connections for visualization
const SKELETON_CONNECTIONS = [
    // Torso
    ['leftShoulder', 'rightShoulder'],
    ['leftShoulder', 'leftHip'],
    ['rightShoulder', 'rightHip'],
    ['leftHip', 'rightHip'],
    // Left arm
    ['leftShoulder', 'leftElbow'],
    ['leftElbow', 'leftWrist'],
    // Right arm
    ['rightShoulder', 'rightElbow'],
    ['rightElbow', 'rightWrist'],
    // Left leg
    ['leftHip', 'leftKnee'],
    ['leftKnee', 'leftAnkle'],
    // Right leg
    ['rightHip', 'rightKnee'],
    ['rightKnee', 'rightAnkle'],
];

interface PoseCameraViewProps {
    facing?: CameraPosition;
    showDebugOverlay?: boolean;
    exerciseType?: ExerciseType;
    onRepDetected?: (newCount: number, feedback?: string) => void;
    onPoseDetected?: (landmarks: PoseLandmarks | null) => void;
    onCameraReady?: () => void;
    currentCount?: number;
    style?: any;
    isActive?: boolean;
}

export const PoseCameraView: React.FC<PoseCameraViewProps> = ({
    facing = 'back',
    showDebugOverlay = false,
    exerciseType = 'squats',
    onRepDetected,
    onPoseDetected,
    onCameraReady,
    currentCount = 0,
    style,
    isActive = true,
}) => {
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice(facing);
    const [isReady, setIsReady] = useState(false);
    const [currentPose, setCurrentPose] = useState<PoseLandmarks | null>(null);
    const [frameSize, setFrameSize] = useState({ width: 1, height: 1 });
    
    const countRef = useRef(currentCount);
    const exerciseTypeRef = useRef(exerciseType);

    // Update refs when props change
    useEffect(() => {
        countRef.current = currentCount;
    }, [currentCount]);

    useEffect(() => {
        exerciseTypeRef.current = exerciseType;
        resetExerciseState(exerciseType);
    }, [exerciseType]);

    // JS callback for pose processing
    const processPose = Worklets.createRunOnJS((poseData: any, width: number, height: number) => {
        if (!poseData || !poseData.landmarks) {
            setCurrentPose(null);
            onPoseDetected?.(null);
            return;
        }

        setFrameSize({ width, height });
        const landmarks = convertMLKitPose(poseData.landmarks);
        setCurrentPose(landmarks);
        onPoseDetected?.(landmarks);

        if (landmarks && exerciseTypeRef.current) {
            const result = countRepsFromPose(landmarks, exerciseTypeRef.current, countRef.current);
            
            if (result.count > countRef.current) {
                countRef.current = result.count;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRepDetected?.(result.count, result.feedback);
            }
        }
    });

    // Frame processor for pose detection
    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';
        try {
            const pose = detectPose(frame);
            processPose(pose, frame.width, frame.height);
        } catch (e) {
            // Silently handle frame processing errors
        }
    }, [processPose]);

    const handleCameraReady = useCallback(() => {
        console.log('[PoseCamera] Camera ready');
        setIsReady(true);
        onCameraReady?.();
    }, [onCameraReady]);

    // Request permission on mount
    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission, requestPermission]);

    // Render skeleton overlay
    const renderSkeleton = () => {
        if (!showDebugOverlay || !currentPose) return null;

        const containerWidth = style?.width || SCREEN_WIDTH;
        const containerHeight = style?.height || 400;

        const scaleX = containerWidth / frameSize.width;
        const scaleY = containerHeight / frameSize.height;

        const getPoint = (name: keyof PoseLandmarks) => {
            const lm = currentPose[name];
            if (!lm || (lm.visibility ?? 1) < 0.5) return null;
            return {
                x: facing === 'front' 
                    ? containerWidth - (lm.x * scaleX)
                    : lm.x * scaleX,
                y: lm.y * scaleY,
            };
        };

        return (
            <Svg style={StyleSheet.absoluteFill}>
                {/* Draw skeleton lines */}
                {SKELETON_CONNECTIONS.map(([from, to], idx) => {
                    const p1 = getPoint(from as keyof PoseLandmarks);
                    const p2 = getPoint(to as keyof PoseLandmarks);
                    if (!p1 || !p2) return null;
                    return (
                        <Line
                            key={`line-${idx}`}
                            x1={p1.x}
                            y1={p1.y}
                            x2={p2.x}
                            y2={p2.y}
                            stroke="#00ff00"
                            strokeWidth={2}
                            opacity={0.8}
                        />
                    );
                })}

                {/* Draw landmark points */}
                {Object.entries(currentPose).map(([name, lm]) => {
                    if (!lm || (lm.visibility ?? 1) < 0.5) return null;
                    const point = getPoint(name as keyof PoseLandmarks);
                    if (!point) return null;
                    return (
                        <Circle
                            key={name}
                            cx={point.x}
                            cy={point.y}
                            r={6}
                            fill="#00ff00"
                            stroke="#ffffff"
                            strokeWidth={2}
                        />
                    );
                })}
            </Svg>
        );
    };

    // Permission not granted
    if (!hasPermission) {
        return (
            <View style={[styles.container, styles.noPermission, style]}>
                <Text style={styles.noPermissionText}>Permission caméra requise</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Autoriser</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // No camera device
    if (!device) {
        return (
            <View style={[styles.container, styles.noPermission, style]}>
                <Text style={styles.noPermissionText}>Caméra non disponible</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                frameProcessor={frameProcessor}
                onInitialized={handleCameraReady}
                pixelFormat="yuv"
            />

            {/* Loading overlay */}
            {!isReady && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.cta} />
                    <Text style={styles.loadingText}>Initialisation caméra...</Text>
                </View>
            )}

            {/* Pose skeleton overlay */}
            {renderSkeleton()}

            {/* Gradient overlays for better UI visibility */}
            <View style={styles.gradientTop} />
            <View style={styles.gradientBottom} />

            {/* Debug badge */}
            {showDebugOverlay && (
                <View style={styles.debugBadge}>
                    <Text style={styles.debugBadgeText}>
                        {currentPose ? '🟢 POSE' : '🔴 NO POSE'}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 350,
        backgroundColor: '#000',
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    camera: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    noPermission: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.card,
        padding: Spacing.xl,
    },
    noPermissionText: {
        fontSize: FontSize.lg,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    permissionButton: {
        backgroundColor: Colors.cta,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.full,
        marginTop: Spacing.md,
    },
    permissionButtonText: {
        color: '#fff',
        fontWeight: FontWeight.bold,
        fontSize: FontSize.md,
    },
    gradientTop: {
        position: 'absolute',
        top: 0, left: 0, right: 0, height: 80,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    gradientBottom: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0, height: 120,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    counterContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterInner: {
        alignItems: 'center',
    },
    repCount: {
        fontSize: 96,
        fontWeight: '900',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 20,
        textAlign: 'center',
    },
    repLabel: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: 'rgba(255,255,255,0.9)',
        textTransform: 'uppercase',
        letterSpacing: 3,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
        textAlign: 'center',
    },
    pulseCircle: {
        position: 'absolute',
        top: '50%', left: '50%',
        width: 200, height: 200,
        marginLeft: -100, marginTop: -100,
        borderRadius: 100,
        borderWidth: 4,
    },
    debugBadge: {
        position: 'absolute',
        top: Spacing.md, right: Spacing.md,
        backgroundColor: '#f97316',
        paddingHorizontal: Spacing.sm, paddingVertical: 4,
        borderRadius: BorderRadius.sm,
    },
    debugBadgeText: {
        fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff', letterSpacing: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center', alignItems: 'center',
    },
    loadingText: {
        color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.md,
    },
});

export default PoseCameraView;
