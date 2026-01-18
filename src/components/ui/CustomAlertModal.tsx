// ============================================================================
// CUSTOM ALERT MODAL - Modal personnalisé pour remplacer les Alert natifs
// Design glassmorphism cohérent avec le reste de l'app
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
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react-native';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// TYPES
// ============================================================================

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertModalProps {
    visible: boolean;
    title: string;
    message: string;
    type?: AlertType;
    buttons?: AlertButton[];
    onClose?: () => void;
    showCloseButton?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

const getTypeConfig = (type: AlertType) => {
    switch (type) {
        case 'success':
            return {
                icon: CheckCircle,
                color: '#22c55e',
                bgColor: 'rgba(34, 197, 94, 0.15)',
            };
        case 'error':
            return {
                icon: XCircle,
                color: '#ef4444',
                bgColor: 'rgba(239, 68, 68, 0.15)',
            };
        case 'warning':
            return {
                icon: AlertTriangle,
                color: '#fbbf24',
                bgColor: 'rgba(251, 191, 36, 0.15)',
            };
        case 'info':
        default:
            return {
                icon: Info,
                color: '#8B5CF6',
                bgColor: 'rgba(139, 92, 246, 0.15)',
            };
    }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
    visible,
    title,
    message,
    type = 'info',
    buttons = [{ text: 'OK', style: 'default' }],
    onClose,
    showCloseButton = true,
}) => {
    const config = getTypeConfig(type);
    const Icon = config.icon;

    const handleButtonPress = (button: AlertButton) => {
        button.onPress?.();
        onClose?.();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
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
                        {showCloseButton && (
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.closeButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X size={20} color={Colors.muted} />
                            </TouchableOpacity>
                        )}

                        {/* Icon */}
                        <Animated.View
                            entering={FadeIn.delay(100)}
                            style={[styles.iconContainer, { backgroundColor: config.bgColor }]}
                        >
                            <Icon size={32} color={config.color} />
                        </Animated.View>

                        {/* Title */}
                        <Text style={styles.title}>{title}</Text>

                        {/* Message */}
                        <Text style={styles.message}>{message}</Text>

                        {/* Buttons */}
                        <View style={styles.buttonsContainer}>
                            {buttons.map((button, index) => {
                                const isDestructive = button.style === 'destructive';
                                const isCancel = button.style === 'cancel';

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            isCancel && styles.cancelButton,
                                            isDestructive && styles.destructiveButton,
                                            buttons.length === 1 && styles.singleButton,
                                        ]}
                                        onPress={() => handleButtonPress(button)}
                                    >
                                        {!isCancel && !isDestructive ? (
                                            <LinearGradient
                                                colors={['#8B5CF6', '#A78BFA']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.buttonGradient}
                                            >
                                                <Text style={styles.buttonText}>{button.text}</Text>
                                            </LinearGradient>
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.buttonTextFlat,
                                                    isDestructive && styles.destructiveText,
                                                    isCancel && styles.cancelText,
                                                ]}
                                            >
                                                {button.text}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </LinearGradient>
                </Animated.View>
            </BlurView>
        </Modal>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: SCREEN_WIDTH - 48,
        maxWidth: 360,
    },
    modalContent: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    closeButton: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    message: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.xl,
    },
    buttonsContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
        width: '100%',
    },
    button: {
        flex: 1,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    singleButton: {
        flex: 1,
    },
    buttonGradient: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: '#fff',
    },
    buttonTextFlat: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        textAlign: 'center',
        paddingVertical: Spacing.md,
    },
    cancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cancelText: {
        color: Colors.muted,
    },
    destructiveButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    destructiveText: {
        color: '#ef4444',
    },
});

export default CustomAlertModal;
