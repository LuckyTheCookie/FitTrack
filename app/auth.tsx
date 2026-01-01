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
} from 'lucide-react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../src/components/ui';
import { useSocialStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';

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
            Alert.alert('Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('Erreur', 'Adresse email invalide');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        if (mode === 'signup') {
            if (password !== confirmPassword) {
                Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
                return;
            }

            if (!username) {
                Alert.alert('Erreur', 'Veuillez choisir un nom d\'utilisateur');
                return;
            }

            if (!validateUsername(username)) {
                Alert.alert(
                    'Erreur', 
                    'Le nom d\'utilisateur doit contenir entre 3 et 20 caractères (lettres, chiffres, underscore)'
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
                    '🚀 Tu es paré à l\'action !',
                    `Bienvenue ${username} ! Ton compte a été créé avec succès. Prêt à défier tes amis ?`,
                    [{ text: 'C\'est parti !', onPress: () => router.back() }]
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
                            {mode === 'login' ? 'Bon retour !' : 'Rejoins-nous !'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {mode === 'login' 
                                ? 'Connecte-toi pour accéder à tes stats sociales'
                                : 'Crée un compte pour comparer tes performances'
                            }
                        </Text>
                    </Animated.View>

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
                                    placeholder="Nom d'utilisateur"
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
                                placeholder="Email"
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
                                placeholder="Mot de passe"
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
                                    placeholder="Confirmer le mot de passe"
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
                                    {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Switch mode */}
                        <View style={styles.switchContainer}>
                            <Text style={styles.switchText}>
                                {mode === 'login' 
                                    ? 'Pas encore de compte ?' 
                                    : 'Déjà un compte ?'
                                }
                            </Text>
                            <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                                <Text style={styles.switchLink}>
                                    {mode === 'login' ? 'S\'inscrire' : 'Se connecter'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Privacy note */}
                    <Animated.View entering={FadeIn.delay(400)}>
                        <Text style={styles.privacyNote}>
                            En créant un compte, tu acceptes que tes stats de la semaine (XP, séances, streak) soient partagées avec tes amis.
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
});
