// ============================================================================
// POLLINATION CALLBACK - Route pour gérer le deep link OAuth
// spix://pollination-callback?token=xxx
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { CheckCircle, XCircle, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../src/constants';
import { useAppStore } from '../src/stores';
import { 
    extractApiKeyFromUrl, 
    savePollinationApiKey 
} from '../src/services/pollination';

type Status = 'processing' | 'success' | 'error';

export default function PollinationCallbackScreen() {
    const { t } = useTranslation();
    const { updateSettings } = useAppStore();
    const params = useLocalSearchParams<{ token?: string }>();
    const [status, setStatus] = useState<Status>('processing');

    useEffect(() => {
        const processCallback = async () => {
            try {
                // Récupérer le token depuis les params ou l'URL complète
                let apiKey: string | undefined = params.token ?? undefined;
                
                // Si pas de token dans les params, essayer d'extraire de l'URL
                if (!apiKey) {
                    const fullUrl = `spix://pollination-callback${params.token ? `?token=${params.token}` : ''}`;
                    apiKey = extractApiKeyFromUrl(fullUrl) ?? undefined;
                }
                
                if (apiKey) {
                    await savePollinationApiKey(apiKey);
                    updateSettings({ pollinationConnected: true });
                    setStatus('success');
                    
                    // Rediriger vers Labs après 2 secondes
                    setTimeout(() => {
                        router.replace('/settings/labs');
                    }, 2000);
                } else {
                    setStatus('error');
                    
                    // Rediriger vers Labs après 2 secondes même en cas d'erreur
                    setTimeout(() => {
                        router.replace('/settings/labs');
                    }, 2000);
                }
            } catch (error) {
                console.error('[PollinationCallback] Error:', error);
                setStatus('error');
                
                setTimeout(() => {
                    router.replace('/settings/labs');
                }, 2000);
            }
        };

        processCallback();
    }, [params.token, updateSettings]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar style="light" />
            
            <View style={styles.content}>
                {status === 'processing' && (
                    <Animated.View entering={FadeIn} style={styles.statusContainer}>
                        <View style={styles.iconContainer}>
                            <ActivityIndicator size="large" color="#8B5CF6" />
                        </View>
                        <Text style={styles.title}>{t('settings.pollinationCallback.processing')}</Text>
                        <Text style={styles.message}>{t('settings.pollinationCallback.processingMessage')}</Text>
                    </Animated.View>
                )}
                
                {status === 'success' && (
                    <Animated.View entering={ZoomIn.springify()} style={styles.statusContainer}>
                        <LinearGradient
                            colors={['rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0.05)']}
                            style={styles.iconGradient}
                        >
                            <CheckCircle size={48} color="#22c55e" />
                        </LinearGradient>
                        <Text style={styles.title}>{t('settings.pollinationCallback.success')}</Text>
                        <Text style={styles.message}>{t('settings.pollinationCallback.successMessage')}</Text>
                        
                        <View style={styles.mascotContainer}>
                            <Sparkles size={20} color="#8B5CF6" />
                            <Text style={styles.mascotText}>{t('settings.pollinationCallback.plopReady')}</Text>
                        </View>
                    </Animated.View>
                )}
                
                {status === 'error' && (
                    <Animated.View entering={ZoomIn.springify()} style={styles.statusContainer}>
                        <LinearGradient
                            colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)']}
                            style={styles.iconGradient}
                        >
                            <XCircle size={48} color="#ef4444" />
                        </LinearGradient>
                        <Text style={styles.title}>{t('settings.pollinationCallback.error')}</Text>
                        <Text style={styles.message}>{t('settings.pollinationCallback.errorMessage')}</Text>
                    </Animated.View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    statusContainer: {
        alignItems: 'center',
        maxWidth: 300,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    iconGradient: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: FontSize.xxl,
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
    },
    mascotContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderRadius: BorderRadius.lg,
    },
    mascotText: {
        fontSize: FontSize.sm,
        fontWeight: FontWeight.medium,
        color: '#A78BFA',
    },
});
