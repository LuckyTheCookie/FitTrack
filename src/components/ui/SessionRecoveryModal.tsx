// ============================================================================
// SESSION RECOVERY MODAL - Modal pour reprendre une séance interrompue
// ============================================================================

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { RotateCcw, X, Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../constants';
import type { ActiveSession } from '../../services/sessionRecovery';
import { formatSessionTime, getRoundedSessionData } from '../../services/sessionRecovery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SessionRecoveryModalProps {
    visible: boolean;
    session: ActiveSession | null;
    onResume: () => void;
    onDiscard: () => void;
}

export const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({
    visible,
    session,
    onResume,
    onDiscard,
}) => {
    const { t } = useTranslation();
    
    if (!session) return null;
    
    const formattedTime = formatSessionTime(session);
    const { roundedReps } = getRoundedSessionData(session);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDiscard}
        >
            <BlurView intensity={30} tint="dark" style={styles.overlay}>
                <Animated.View 
                    entering={ZoomIn.springify()} 
                    style={styles.modalContainer}
                >
                    <LinearGradient
                        colors={['rgba(31, 41, 55, 0.98)', 'rgba(17, 24, 39, 0.98)']}
                        style={styles.modalContent}
                    >
                        {/* Close button */}
                        <TouchableOpacity 
                            onPress={onDiscard}
                            style={styles.closeButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={20} color={Colors.muted} />
                        </TouchableOpacity>

                        {/* Emoji icon */}
                        <Animated.View 
                            entering={FadeInDown.delay(100).springify()}
                            style={styles.emojiContainer}
                        >
                            <Text style={styles.emoji}>{session.exerciseEmoji || '💪'}</Text>
                        </Animated.View>

                        {/* Title */}
                        <Animated.Text 
                            entering={FadeInDown.delay(200).springify()}
                            style={styles.title}
                        >
                            {t('sessionRecovery.title', { defaultValue: 'Oups !' })}
                        </Animated.Text>

                        {/* Message */}
                        <Animated.Text 
                            entering={FadeInDown.delay(300).springify()}
                            style={styles.message}
                        >
                            {t('sessionRecovery.message', { 
                                defaultValue: 'Vous n\'aviez pas terminé votre dernière séance de {{exercise}}.',
                                exercise: session.exerciseName,
                            })}
                        </Animated.Text>

                        {/* Session info */}
                        <Animated.View 
                            entering={FadeInDown.delay(400).springify()}
                            style={styles.sessionInfo}
                        >
                            <View style={styles.sessionInfoItem}>
                                <Text style={styles.sessionInfoLabel}>
                                    {session.isTimeBased ? t('common.time', { defaultValue: 'Temps' }) : t('common.reps', { defaultValue: 'Reps' })}
                                </Text>
                                <Text style={styles.sessionInfoValue}>
                                    {session.isTimeBased ? formattedTime : `${roundedReps} reps`}
                                </Text>
                            </View>
                        </Animated.View>

                        {/* Question */}
                        <Animated.Text 
                            entering={FadeInDown.delay(500).springify()}
                            style={styles.question}
                        >
                            {t('sessionRecovery.question', { defaultValue: 'Voulez-vous reprendre ?' })}
                        </Animated.Text>

                        {/* Buttons */}
                        <Animated.View 
                            entering={FadeInDown.delay(600).springify()}
                            style={styles.buttons}
                        >
                            <TouchableOpacity
                                onPress={onDiscard}
                                style={styles.secondaryButton}
                            >
                                <X size={18} color={Colors.muted} />
                                <Text style={styles.secondaryButtonText}>
                                    {t('sessionRecovery.discard', { defaultValue: 'Non, abandonner' })}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={onResume}
                                style={styles.primaryButton}
                            >
                                <LinearGradient
                                    colors={[Colors.cta, Colors.cta2]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.primaryButtonGradient}
                                >
                                    <Play size={18} color="#fff" fill="#fff" />
                                    <Text style={styles.primaryButtonText}>
                                        {t('sessionRecovery.resume', { defaultValue: 'Oui, reprendre' })}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </LinearGradient>
                </Animated.View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: SCREEN_WIDTH - Spacing.xl * 2,
        maxWidth: 400,
        borderRadius: BorderRadius.xxl,
        overflow: 'hidden',
    },
    modalContent: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    emoji: {
        fontSize: 40,
    },
    title: {
        fontSize: FontSize.xxl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: Spacing.sm,
    },
    message: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.lg,
    },
    sessionInfo: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    sessionInfoItem: {
        alignItems: 'center',
    },
    sessionInfoLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    sessionInfoValue: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.cta,
    },
    question: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        marginBottom: Spacing.lg,
    },
    buttons: {
        width: '100%',
        gap: Spacing.sm,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    secondaryButtonText: {
        fontSize: FontSize.md,
        color: Colors.muted,
        fontWeight: FontWeight.medium,
    },
    primaryButton: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    primaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    primaryButtonText: {
        fontSize: FontSize.md,
        color: '#fff',
        fontWeight: FontWeight.bold,
    },
});

export default SessionRecoveryModal;
