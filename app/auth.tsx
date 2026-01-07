// ============================================================================
// AUTH SCREEN - Inscription / Connexion
// ============================================================================

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
    Mail, 
    Lock, 
    User, 
    Eye, 
    EyeOff,
    ArrowLeft,
    Dumbbell,
    AlertTriangle,
    ExternalLink,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../src/components/ui';
import { useSocialStore } from '../src/stores';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { BuildConfig } from '../src/config';

type AuthMode = 'login' | 'signup';

export default function AuthScreen() {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { signIn, signUp } = useSocialStore();

    const { t } = useTranslation();

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validateUsername = (username: string) => {
        const re = /^[a-zA-Z0-9_]{3,20}$/;
        return re.test(username);
    };

    const handleSubmit = async () => {
        // Validation
        if (!email || !password) {
            Alert.alert(t('common.error'), t('auth.errors.emptyFields'));
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert(t('common.error'), t('auth.errors.invalidEmail'));
            return;
        }

        if (password.length < 6) {
            Alert.alert(t('common.error'), t('auth.errors.shortPassword'));
            return;
        }

        if (mode === 'signup') {
            if (password !== confirmPassword) {
                Alert.alert(t('common.error'), t('auth.errors.passwordsNotMatch'));
                return;
            }

            if (!username) {
                Alert.alert(t('common.error'), t('auth.errors.usernameRequired'));
                return;
            }

            if (!validateUsername(username)) {
                Alert.alert(
                    t('common.error'), 
                    t('auth.errors.invalidUsername')
                );
                return;
            }
        }

        setIsLoading(true);

        try {
            if (mode === 'login') {
                await signIn(email, password);
                router.back();
            } else {
                await signUp(email, password, username);
                Alert.alert(
                    t('auth.signupSuccessTitle'),
                    t('auth.signupSuccessMessage', { username }),
                    [{ text: t('common.ok'), onPress: () => router.back() }]
                );
            }
        } catch (error: any) {
            console.error('Auth error:', error);
            Alert.alert('Erreur', error.message || 'Une erreur est survenue');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView 
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Back button */}
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <ArrowLeft size={24} color={Colors.text} />
                    </TouchableOpacity>

                    {/* Header */}
                    <Animated.View 
                        entering={FadeIn.delay(100)}
                        style={styles.header}
                    >
                        <LinearGradient
                            colors={[Colors.cta, Colors.teal]}
                            style={styles.logoContainer}
                        >
                            <Dumbbell size={40} color="#fff" />
                        </LinearGradient>
                            <Text style={styles.title}>
                            {mode === 'login' ? t('auth.title.login') : t('auth.title.signup')}
                        </Text>
                        <Text style={styles.subtitle}>
                            {mode === 'login' ? t('auth.subtitle.login') : t('auth.subtitle.signup')}
                        </Text>
                    </Animated.View>

                    {/* FOSS Build Notice */}
                    {BuildConfig.isFoss && (
                        <Animated.View entering={FadeInDown.delay(150).springify()}>
                            <GlassCard style={styles.fossNotice}>
                                <View style={styles.fossNoticeHeader}>
                                    <AlertTriangle size={20} color="#fbbf24" />
                                    <Text style={styles.fossNoticeTitle}>
                                        {t('auth.fossNotice.title')}
                                    </Text>
                                </View>
                                <Text style={styles.fossNoticeText}>
                                    {t('auth.fossNotice.text')}
                                </Text>
                                <TouchableOpacity 
                                    style={styles.fossNoticeButton}
                                    onPress={() => Linking.openURL(BuildConfig.githubReleasesUrl)}
                                >
                                    <Text style={styles.fossNoticeButtonText}>
                                        {t('auth.fossNotice.button')}
                                    </Text>
                                    <ExternalLink size={14} color={Colors.cta} />
                                </TouchableOpacity>
                            </GlassCard>
                        </Animated.View>
                    )}

                    {/* Form */}
                    <Animated.View 
                        entering={FadeInDown.delay(200).springify()}
                        style={styles.form}
                    >
                        {/* Username (signup only) */}
                        {mode === 'signup' && (
                            <View style={styles.inputContainer}>
                                <User size={20} color={Colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('auth.form.usernamePlaceholder')}
                                    placeholderTextColor={Colors.muted}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        )}

                        {/* Email */}
                        <View style={styles.inputContainer}>
                            <Mail size={20} color={Colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.form.emailPlaceholder')}
                                placeholderTextColor={Colors.muted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        {/* Password */}
                        <View style={styles.inputContainer}>
                            <Lock size={20} color={Colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder={t('auth.form.passwordPlaceholder')}
                                placeholderTextColor={Colors.muted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity 
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeButton}
                            >
                                {showPassword 
                                    ? <EyeOff size={20} color={Colors.muted} />
                                    : <Eye size={20} color={Colors.muted} />
                                }
                            </TouchableOpacity>
                        </View>

                        {/* Confirm Password (signup only) */}
                        {mode === 'signup' && (
                            <View style={styles.inputContainer}>
                                <Lock size={20} color={Colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('auth.form.confirmPasswordPlaceholder')}
                                    placeholderTextColor={Colors.muted}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />
                            </View>
                        )}

                        {/* Submit button */}
                        <TouchableOpacity 
                            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {mode === 'login' ? t('auth.buttons.login') : t('auth.buttons.signup')}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Switch mode */}
                        <View style={styles.switchContainer}>
                            <Text style={styles.switchText}>
                                {mode === 'login' ? t('auth.switch.noAccount') : t('auth.switch.haveAccount')}
                            </Text>
                            <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                                <Text style={styles.switchLink}>
                                    {mode === 'login' ? t('auth.switch.linkSignup') : t('auth.switch.linkLogin')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Privacy note */}
                    <Animated.View entering={FadeIn.delay(400)}>
                        <Text style={styles.privacyNote}>
                            {t('auth.privacyNote')}
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: Spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    title: {
        fontSize: 28,
        fontWeight: FontWeight.extrabold,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: FontSize.md,
        color: Colors.muted,
        textAlign: 'center',
        paddingHorizontal: Spacing.lg,
        lineHeight: 22,
    },
    form: {
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: Spacing.md,
    },
    inputIcon: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.md,
        fontSize: FontSize.md,
        color: Colors.text,
    },
    eyeButton: {
        padding: Spacing.sm,
    },
    submitButton: {
        backgroundColor: Colors.cta,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.md,
    },
    switchText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
    },
    switchLink: {
        fontSize: FontSize.sm,
        color: Colors.cta,
        fontWeight: FontWeight.semibold,
    },
    privacyNote: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: Spacing.lg,
    },
    // FOSS Notice styles
    fossNotice: {
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderColor: 'rgba(251, 191, 36, 0.3)',
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    fossNoticeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    fossNoticeTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: '#fbbf24',
    },
    fossNoticeText: {
        fontSize: FontSize.sm,
        color: Colors.muted,
        lineHeight: 20,
        marginBottom: Spacing.md,
    },
    fossNoticeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        backgroundColor: 'rgba(215, 150, 134, 0.15)',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    fossNoticeButtonText: {
        fontSize: FontSize.sm,
        color: Colors.cta,
        fontWeight: FontWeight.medium,
    },
});
