// ============================================================================
// PROFILE SCREEN - Modifier le profil utilisateur
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { 
    ArrowLeft,
    User,
    AtSign,
    Save,
    LogOut,
    Trash2,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { GlassCard } from '../src/components/ui';
import { useSocialStore } from '../src/stores';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';

export default function ProfileScreen() {
    const { profile, signOut, updateProfile } = useSocialStore();
    
    const [username, setUsername] = useState(profile?.username || '');
    const [displayName, setDisplayName] = useState(profile?.display_name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Detect changes
    useEffect(() => {
        if (profile) {
            const changed = 
                username !== profile.username ||
                displayName !== (profile.display_name || '');
            setHasChanges(changed);
        }
    }, [username, displayName, profile]);

    // Validate username
    const validateUsername = (username: string) => {
        const re = /^[a-zA-Z0-9_]{3,20}$/;
        return re.test(username);
    };

    // Save profile
    const handleSave = async () => {
        if (!username) {
            Alert.alert('Erreur', 'Le nom d\'utilisateur est requis');
            return;
        }

        if (!validateUsername(username)) {
            Alert.alert(
                'Erreur',
                'Le nom d\'utilisateur doit contenir entre 3 et 20 caractères (lettres, chiffres, underscore)'
            );
            return;
        }

        setIsSaving(true);

        try {
            await updateProfile({
                username,
                display_name: displayName || null,
            });
            Alert.alert('Succès', 'Profil mis à jour !');
            setHasChanges(false);
        } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Impossible de sauvegarder');
        } finally {
            setIsSaving(false);
        }
    };

    // Sign out
    const handleSignOut = () => {
        Alert.alert(
            'Déconnexion',
            'Es-tu sûr de vouloir te déconnecter ?',
            [
                { text: 'Annuler', style: 'cancel' },
                { 
                    text: 'Déconnexion', 
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/social' as any);
                    }
                },
            ]
        );
    };

    if (!profile) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.cta} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <ArrowLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Mon Profil</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Avatar */}
                <Animated.View 
                    entering={FadeIn.delay(100)}
                    style={styles.avatarSection}
                >
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(displayName || username).charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.levelText}>Niveau {profile.level}</Text>
                </Animated.View>

                {/* Form */}
                <Animated.View 
                    entering={FadeInDown.delay(200).springify()}
                    style={styles.form}
                >
                    {/* Username */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Nom d'utilisateur</Text>
                        <View style={styles.inputContainer}>
                            <AtSign size={20} color={Colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="username"
                                placeholderTextColor={Colors.muted}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        <Text style={styles.hint}>
                            3-20 caractères, lettres, chiffres et underscore uniquement
                        </Text>
                    </View>

                    {/* Display Name */}
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>Nom d'affichage (optionnel)</Text>
                        <View style={styles.inputContainer}>
                            <User size={20} color={Colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="Ton nom"
                                placeholderTextColor={Colors.muted}
                            />
                        </View>
                        <Text style={styles.hint}>
                            Affiché à la place du nom d'utilisateur dans le classement
                        </Text>
                    </View>

                    {/* Save Button */}
                    {hasChanges && (
                        <TouchableOpacity 
                            style={styles.saveButton}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Save size={20} color="#fff" />
                                    <Text style={styles.saveButtonText}>
                                        Sauvegarder
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Stats Card */}
                <Animated.View entering={FadeInDown.delay(300).springify()}>
                    <GlassCard style={styles.statsCard}>
                        <Text style={styles.statsTitle}>Mes stats</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{profile.total_xp}</Text>
                                <Text style={styles.statLabel}>XP Total</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{profile.weekly_xp}</Text>
                                <Text style={styles.statLabel}>XP Semaine</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{profile.weekly_workouts}</Text>
                                <Text style={styles.statLabel}>Séances</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{profile.current_streak}</Text>
                                <Text style={styles.statLabel}>Streak</Text>
                            </View>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* Actions */}
                <Animated.View 
                    entering={FadeInDown.delay(400).springify()}
                    style={styles.actions}
                >
                    <TouchableOpacity 
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                    >
                        <LogOut size={20} color={Colors.error} />
                        <Text style={styles.signOutButtonText}>Se déconnecter</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* Email info */}
                <Animated.View entering={FadeIn.delay(500)}>
                    <Text style={styles.emailInfo}>
                        Connecté avec : {'email non disponible'}
                    </Text>
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: FontSize.xl,
        fontWeight: FontWeight.bold,
        color: Colors.text,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.cta,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: FontWeight.bold,
        color: Colors.bg,
    },
    levelText: {
        fontSize: FontSize.md,
        color: Colors.muted,
        fontWeight: FontWeight.semibold,
    },
    form: {
        gap: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    fieldContainer: {
        gap: Spacing.xs,
    },
    label: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.semibold,
        color: Colors.text,
        marginLeft: Spacing.xs,
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
    hint: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginLeft: Spacing.xs,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.cta,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
        marginTop: Spacing.sm,
    },
    saveButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: '#fff',
    },
    statsCard: {
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    statsTitle: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.bold,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    statItem: {
        width: '50%',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    statValue: {
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: Colors.cta,
    },
    statLabel: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        marginTop: 2,
    },
    actions: {
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.md,
    },
    signOutButtonText: {
        fontSize: FontSize.md,
        fontWeight: FontWeight.semibold,
        color: Colors.error,
    },
    emailInfo: {
        fontSize: FontSize.xs,
        color: Colors.muted,
        textAlign: 'center',
    },
});
