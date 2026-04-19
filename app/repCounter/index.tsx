// repCounter/index.tsx
// ============================================================================
// REP COUNTER SCREEN — Main orchestrator
// All logic → useRepCounter hook
// All UI    → individual components
// ============================================================================

import { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowLeft } from 'lucide-react-native';
import { SessionRecoveryModal } from '../../src/components/ui';
import { useTranslation } from 'react-i18next';

import { RC, SP, FONT, W, SCREEN_HEIGHT } from '@/repCounter/constants';
import { useRepCounter } from '@/repCounter/hooks/useRepCounter';
import { ExerciseSelector } from '@/repCounter/components/ExerciseSelector';
import { PositionScreen } from '@/repCounter/components/PositionScreen';
import { EllipticalCalibration } from '@/repCounter/components/EllipticalCalibration';
import { CountingScreen } from '@/repCounter/components/CountingScreen';
import { DoneScreen } from '@/repCounter/components/DoneScreen';
import { ExitModal } from '@/repCounter/components/ExitModal';

export default function RepCounterScreen() {
    useKeepAwake();
    const { t } = useTranslation();
    const rc = useRepCounter();

    const showCameraPreview  = rc.settings.preferCameraDetection ?? false;
    const showDebugOverlay   = rc.settings.debugCamera ?? false;

    // Android back button
    useFocusEffect(
        useCallback(() => {
            if (rc.workoutSaved) {
                rc.setStep('select');
            }
            const sub = BackHandler.addEventListener('hardwareBackPress', () => {
                if (rc.step === 'counting' || rc.step === 'position') {
                    rc.setShowExitModal(true);
                    return true;
                }
                return false;
            });
            return () => sub.remove();
        }, [rc.step, rc.workoutSaved])
    );

    const handleBackPress = useCallback(() => {
        if (rc.step === 'counting' || rc.step === 'position') rc.setShowExitModal(true);
        else router.back();
    }, [rc.step]);

    const headerTitle =
        rc.step === 'select'   ? t('repCounter.selectExercise') :
        rc.step === 'position' ? t('repCounter.positioning') :
        rc.step === 'counting' ? (rc.selectedExercise ? t(`repCounter.exercises.${rc.selectedExercise.id}`) : t('repCounter.title')) :
        rc.step === 'done'     ? t('repCounter.done') : '';

    return (
        <View style={s.root}>
            <StatusBar style="light" />

            {/* Dynamic background */}
            <LinearGradient
                colors={[
                    rc.selectedExercise ? `${rc.selectedExercise.color}12` : RC.emberGlow,
                    RC.bg,
                    RC.bg,
                ]}
                style={s.bgGrad}
            />

            <SafeAreaView style={s.safe} edges={['top']}>

                {/* ── Header ── */}
                <Animated.View entering={FadeIn.delay(20)} style={s.header}>
                    <TouchableOpacity onPress={handleBackPress} style={s.backBtn} activeOpacity={0.75}>
                        <ArrowLeft size={22} color={RC.text} strokeWidth={2} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>{headerTitle}</Text>
                    <View style={s.headerRight} />
                </Animated.View>

                {/* ── Content ── */}
                <View style={s.content}>

                    {/* SELECT */}
                    {rc.step === 'select' && (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={s.scrollContent}
                        >
                            <ExerciseSelector
                                selectedExercise={rc.selectedExercise}
                                detectionMode={rc.detectionMode}
                                onSelect={rc.handleExerciseSelect}
                                onDetectionModeChange={rc.setDetectionMode}
                                onNext={rc.handleNext}
                            />
                        </ScrollView>
                    )}

                    {/* POSITION */}
                    {rc.step === 'position' && rc.selectedExercise && (
                        rc.selectedExercise.id === 'elliptical' && rc.detectionMode === 'camera' ? (
                            <EllipticalCalibration
                                exercise={rc.selectedExercise}
                                phase={rc.ellipticalCalibrationPhase}
                                countdown={rc.calibrationCountdown}
                                funnyPhrase={rc.calibrationFunnyPhrase}
                                waitingForMovement={rc.waitingForMovement}
                                calibrationFailed={rc.ellipticalCalibrationFailed}
                                onBegin={rc.beginCalibrationSequence}
                            />
                        ) : (
                            <PositionScreen
                                exercise={rc.selectedExercise}
                                detectionMode={rc.detectionMode}
                                onReady={rc.handleNext}
                            />
                        )
                    )}

                    {/* COUNTING */}
                    {rc.step === 'counting' && rc.selectedExercise && (
                        <CountingScreen
                            exercise={rc.selectedExercise}
                            detectionMode={rc.detectionMode}
                            isTracking={rc.isTracking}
                            repCount={rc.repCount}
                            elapsedTime={rc.elapsedTime}
                            plankSeconds={rc.plankSeconds}
                            ellipticalSeconds={rc.ellipticalSeconds}
                            isPlankActive={rc.isPlankActive}
                            isEllipticalActive={rc.isEllipticalActive}
                            showNewRecord={rc.showNewRecord}
                            personalBest={rc.personalBest}
                            calories={rc.getCalories()}
                            progress={rc.getProgress()}
                            motivationalMessage={rc.motivationalMessage}
                            aiFeedback={rc.aiFeedback}
                            plankDebugInfo={rc.plankDebugInfo}
                            countScale={rc.countScale}
                            pulseOpacity={rc.pulseOpacity}
                            messageOpacity={rc.messageOpacity}
                            showCameraPreview={showCameraPreview}
                            showDebugOverlay={showDebugOverlay}
                            debugPlank={rc.settings.debugPlank}
                            formatTime={rc.formatTime}
                            onToggleTracking={rc.isTracking ? rc.stopTracking : rc.startTracking}
                            onReset={rc.resetWorkout}
                            onFinish={rc.finishWorkout}
                            onCameraRepDetected={rc.handleCameraRepDetected}
                            onPlankStateChange={rc.handlePlankStateChange}
                            onEllipticalStateChange={rc.handleEllipticalStateChange}
                        />
                    )}

                    {/* DONE */}
                    {rc.step === 'done' && rc.selectedExercise && (
                        <DoneScreen
                            exercise={rc.selectedExercise}
                            repCount={rc.repCount}
                            plankSeconds={rc.plankSeconds}
                            ellipticalSeconds={rc.ellipticalSeconds}
                            elapsedTime={rc.elapsedTime}
                            calories={rc.getCalories()}
                            showNewRecord={rc.showNewRecord}
                            formatTime={rc.formatTime}
                            onReset={rc.resetWorkout}
                            onSave={rc.saveWorkout}
                        />
                    )}
                </View>
            </SafeAreaView>

            {/* ── Modals ── */}
            <ExitModal
                visible={rc.showExitModal}
                onCancel={rc.handleExitCancel}
                onConfirm={rc.handleExitConfirm}
            />

            <SessionRecoveryModal
                visible={rc.showRecoveryModal}
                session={rc.recoverySession}
                onResume={rc.handleResumeSession}
                onDiscard={rc.handleDiscardSession}
            />
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: RC.bg },
    bgGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT * 0.55 },
    safe:   { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SP.lg, paddingVertical: SP.md,
    },
    backBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: RC.overlay, borderWidth: 1, borderColor: RC.border,
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: {
        fontSize: FONT.lg, fontWeight: W.xbold, color: RC.text,
        letterSpacing: -0.3,
    },
    headerRight:   { width: 42 },
    content:       { flex: 1, paddingHorizontal: SP.lg },
    scrollContent: { paddingBottom: 120 },
});
