import { Tabs, usePathname, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { useSettings, useSocialStore } from '../src/stores';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { LayoutDashboard, Dumbbell, ChartBar, Wrench, Settings, Trophy, Users } from 'lucide-react-native';
import { Colors, Spacing } from '../src/constants';
import { ErrorBoundary } from '../src/components';

// Initialize i18n
import '../src/i18n';

// Configuration des icônes
const TAB_CONFIG = [
    { name: 'index', label: 'Today', Icon: LayoutDashboard },
    { name: 'workout', label: 'Workout', Icon: Dumbbell },
    { name: 'gamification', label: 'Ploppy', Icon: Trophy },
    { name: 'social', label: 'Social', Icon: Users },
    { name: 'progress', label: 'Progress', Icon: ChartBar },
    { name: 'tools', label: 'Tools', Icon: Wrench },
    { name: 'settings', label: 'Settings', Icon: Settings },
];

// Composant Bouton avec transition douce
const TabButton = ({ route, descriptor, isFocused, navigation, config }: any) => {
    const Icon = config.Icon;

    // Valeurs d'animation pour l'opacité et l'échelle
    const opacity = useSharedValue(0.5);
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);

    useEffect(() => {
        if (isFocused) {
            // Transition douce vers l'état actif
            opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) });
            scale.value = withTiming(1.1, { duration: 250, easing: Easing.out(Easing.quad) });
            translateY.value = withTiming(-2, { duration: 250, easing: Easing.out(Easing.quad) });
        } else {
            // Retour doux à l'état inactif
            opacity.value = withTiming(0.4, { duration: 250 });
            scale.value = withTiming(1, { duration: 250 });
            translateY.value = withTiming(0, { duration: 250 });
        }
    }, [isFocused]);

    const animatedIconStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }, { translateY: translateY.value }],
    }));

    const activeColor = '#E3A090'; // Accent saumon
    const inactiveColor = '#FFFFFF'; // Blanc (l'opacité gère le gris)

    const onPress = () => {
        const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
        }
    };

    return (
        <Pressable onPress={onPress} style={styles.tabItem}>
            <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                <Icon
                    size={26}
                    color={isFocused ? activeColor : inactiveColor}
                    strokeWidth={isFocused ? 2.5 : 2}
                />
                {/* Indicateur lumineux subtil au lieu du point */}
                {isFocused && (
                    <Animated.View
                        style={{
                            position: 'absolute',
                            width: 20,
                            height: 20,
                            backgroundColor: activeColor,
                            borderRadius: 20,
                            opacity: 0.15, // Lueur très légère derrière l'icône
                            transform: [{ scale: 1.5 }]
                        }}
                    />
                )}
            </Animated.View>
        </Pressable>
    );
};

function CustomTabBar({ state, descriptors, navigation, visibleTabs }: any) {
    const insets = useSafeAreaInsets();
    const pathname = usePathname();
    const settings = useSettings();

    // Cacher la tab bar sur l'écran rep-counter
    if (pathname === '/rep-counter') {
        return null;
    }

    // Cacher la tab bar sur l'écran health-connect
    if (pathname === '/health-connect') {
        return null;
    }

    // Cacher la tab bar sur l'écran onboarding
    if (pathname === '/onboarding') {
        return null;
    }

    // Ne montrer que les onglets visibles
    const visibleRoutes = state.routes.filter((route: any) =>
        visibleTabs.some((tab: any) => tab.name === route.name)
    );

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md }]}>
            <View style={[styles.floatingBarWrapper, settings.fullOpacityNavbar && styles.floatingBarOpaque]}>
                {!settings.fullOpacityNavbar && (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(26, 27, 34, 0.85)' }]} />

                )}

                <View style={styles.tabBarContent}>
                    {visibleRoutes.map((route: any) => {
                        const config = visibleTabs.find((c: any) => c.name === route.name) || { name: route.name, label: route.name, Icon: LayoutDashboard };
                        const index = state.routes.findIndex((r: any) => r.key === route.key);
                        return (
                            <TabButton
                                key={`tab-${route.name}`}
                                route={route}
                                descriptor={descriptors[route.key]}
                                isFocused={state.index === index}
                                navigation={navigation}
                                config={config}
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

export default function Layout() {
    const settings = useSettings();
    const { socialEnabled } = useSocialStore();
    const router = useRouter();
    const segments = useSegments();
    const rootNavigationState = useRootNavigationState();

    // Redirect to onboarding if not completed
    useEffect(() => {
        // Wait for navigation to be ready and segments to be populated
        if (!rootNavigationState?.key) return;
        if (!segments) return;

        const isOnboardingRoute = segments[0] === 'onboarding';
        const onboardingCompleted = settings.onboardingCompleted ?? false;

        if (!onboardingCompleted && !isOnboardingRoute) {
            // Delay navigation one tick so the root navigator has mounted
            const timer = setTimeout(() => {
                try {
                    router.replace('/onboarding');
                } catch (err) {
                    // swallowing navigation errors that can happen during mount
                    // they are benign and we'll try again on next effect run
                    // eslint-disable-next-line no-console
                    console.warn('Onboarding redirect failed:', err);
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [settings.onboardingCompleted, segments, rootNavigationState?.key]);

    // Filtrer les onglets visibles pour le CustomTabBar
    const visibleTabs = TAB_CONFIG.filter(tab => {
        if (tab.name === 'workout' && settings.hiddenTabs?.workout) return false;
        if (tab.name === 'tools' && settings.hiddenTabs?.tools) return false;
        if (tab.name === 'social' && !socialEnabled) return false;
        return true;
    });

    return (
        <ErrorBoundary>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
                <Tabs
                    tabBar={(props) => <CustomTabBar {...props} visibleTabs={visibleTabs} />}
                    screenOptions={{
                        headerShown: false,
                        tabBarStyle: { display: 'none' },
                    }}
                >
                    <Tabs.Screen name="index" options={{ title: "Today" }} />
                    <Tabs.Screen
                        name="workout"
                        options={{
                            title: "Workout",
                            href: settings.hiddenTabs?.workout ? null : undefined,
                        }}
                    />
                    <Tabs.Screen name="gamification" options={{ title: "Ploppy" }} />
                    <Tabs.Screen
                        name="social"
                        options={{
                            title: "Social",
                            href: socialEnabled ? undefined : null,
                        }}
                    />
                    <Tabs.Screen name="progress" options={{ title: "Progress" }} />
                    <Tabs.Screen
                        name="tools"
                        options={{
                            title: "Tools",
                            href: settings.hiddenTabs?.tools ? null : undefined,
                        }}
                    />
                    <Tabs.Screen name="settings" options={{ title: "Settings" }} />
                </Tabs>
            </GestureHandlerRootView>
        </ErrorBoundary>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        pointerEvents: 'box-none', // Laisse passer les clics autour de la barre
    },
    floatingBarWrapper: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    floatingBarOpaque: {
        backgroundColor: Colors.cardSolid,
        borderColor: Colors.stroke,
    },
    tabBarContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 68,
        paddingHorizontal: Spacing.sm,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
    },
});
