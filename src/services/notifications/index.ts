// ============================================================================
// NOTIFICATION SERVICE - Android native notifications
// ============================================================================

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configuration handler - affichage même en foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export type PushTokenResult = 
    | { success: true; token: string }
    | { success: false; reason: 'not_device' | 'permission_denied' | 'network_error' | 'unknown' };

/**
 * Enregistre le device pour les notifications push
 * Avec retry logic pour les erreurs FIS_AUTH_ERROR
 * @returns Résultat avec le token ou la raison de l'échec
 */
export async function registerForPushNotifications(): Promise<PushTokenResult> {
    // Vérifier si c'est un appareil physique
    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return { success: false, reason: 'not_device' };
    }

    // Vérifier/demander les permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Notification permissions denied');
        return { success: false, reason: 'permission_denied' };
    }

    // Configurer le canal Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#D79686',
        });

        // Canal pour les encouragements
        await Notifications.setNotificationChannelAsync('encouragements', {
            name: 'Encouragements',
            description: 'Notifications d\'encouragement de tes amis',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 100, 100, 100],
            lightColor: '#E3A090',
        });

        // Canal pour les demandes d'amis
        await Notifications.setNotificationChannelAsync('friends', {
            name: 'Amis',
            description: 'Demandes d\'ami et acceptations',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 200],
            lightColor: '#4ade80',
        });
    }

    // Obtenir le token Expo avec retry logic
    const projectId = 'fa564092-790e-4f01-9663-7b0420577cc8';
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const token = await Notifications.getExpoPushTokenAsync({
                projectId,
            });

            console.log('Expo Push Token:', token.data);
            return { success: true, token: token.data };
        } catch (error: any) {
            lastError = error;
            console.warn(`Push token attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            // FIS_AUTH_ERROR - wait and retry
            if (error.message?.includes('FIS_AUTH_ERROR') && attempt < maxRetries) {
                // Wait exponentially longer between retries (1s, 2s, 4s)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
                continue;
            }
            
            // Other errors - break immediately
            break;
        }
    }

    console.error('Failed to get push token after retries:', lastError?.message);
    
    // FIS_AUTH_ERROR or network related errors
    if (lastError?.message?.includes('FIS_AUTH_ERROR') || 
        lastError?.message?.includes('network') ||
        lastError?.message?.includes('fetch')) {
        return { success: false, reason: 'network_error' };
    }
    
    return { success: false, reason: 'unknown' };
}

/**
 * Envoie une notification locale pour un encouragement reçu
 */
export async function showEncouragementNotification(
    senderName: string,
    message: string,
    emoji: string = '💪'
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: `${emoji} ${senderName} t'encourage !`,
            body: message,
            sound: 'default',
            data: { type: 'encouragement' },
        },
        trigger: null, // Immédiat
    });
}

/**
 * Envoie une notification locale pour une demande d'ami
 */
export async function showFriendRequestNotification(
    senderName: string
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '👋 Nouvelle demande d\'ami',
            body: `${senderName} veut être ton ami !`,
            sound: 'default',
            data: { type: 'friend_request' },
        },
        trigger: null,
    });
}

/**
 * Envoie une notification locale pour une demande acceptée
 */
export async function showFriendAcceptedNotification(
    friendName: string
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '🎉 Demande acceptée',
            body: `${friendName} et toi êtes maintenant amis !`,
            sound: 'default',
            data: { type: 'friend_accepted' },
        },
        trigger: null,
    });
}

/**
 * Planifie un rappel de streak
 */
export async function scheduleStreakReminder(
    hour: number = 20,
    minute: number = 0
): Promise<string> {
    // Annuler les rappels précédents
    await cancelStreakReminder();

    const identifier = await Notifications.scheduleNotificationAsync({
        content: {
            title: '🔥 N\'oublie pas ta séance !',
            body: 'Continue ta streak et reste motivé !',
            sound: 'default',
            data: { type: 'streak_reminder' },
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
        },
    });

    return identifier;
}

/**
 * Annule le rappel de streak
 */
export async function cancelStreakReminder(): Promise<void> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
        if (notif.content.data?.type === 'streak_reminder') {
            await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
    }
}

/**
 * Écoute les notifications reçues
 */
export function addNotificationReceivedListener(
    handler: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Écoute les notifications tapées (quand l'utilisateur clique)
 */
export function addNotificationResponseListener(
    handler: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Obtient le nombre de badges actuels
 */
export async function getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
}

/**
 * Définit le nombre de badges
 */
export async function setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
}

/**
 * Efface tous les badges
 */
export async function clearBadges(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
}
