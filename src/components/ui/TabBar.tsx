import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    withTiming,
    interpolate,
    Extrapolation
} from 'react-native-reanimated';
import { Colors } from '../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
    index: 'home',
    workout: 'activity',
    progress: 'bar-chart-2',
    tools: 'grid',
    settings: 'settings',
};

const LABELS: Record<string, string> = {
    index: 'Today',
    workout: 'Fitt',
    progress: 'Stats',
    tools: 'Tools',
    settings: 'Settings',
};

/* -------------------------------------------------------------------------- */
/*                               TAB ITEM COMPONENT                           */
/* -------------------------------------------------------------------------- */

const TabItem = ({
    routeName,
    isFocused,
    onPress,
    onLongPress
}: {
    routeName: string,
    isFocused: boolean,
    onPress: () => void,
    onLongPress: () => void
}) => {
    // Animation values
    const opacity = useSharedValue(isFocused ? 1 : 0.5);

    // Update animated values when focus changes
    React.useEffect(() => {
        opacity.value = withTiming(isFocused ? 1 : 0.5, { duration: 400 });
    }, [isFocused]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    const iconName = ICONS[routeName] || 'circle';

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
        >
            <Animated.View style={[styles.tabContent, animatedStyle]}>
                <View style={styles.iconContainer}>
                    <Feather
                        name={iconName}
                        size={22}
                        color={isFocused ? Colors.cta : Colors.text}
                    />
                </View>
                {isFocused && (
                    <Animated.Text style={[styles.label, { color: Colors.cta }]}>
                        {LABELS[routeName]}
                    </Animated.Text>
                )}
            </Animated.View>
        </Pressable>
    );
};

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

export const TabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const insets = useSafeAreaInsets();

    // Only show tab bar if not hidden by screen options
    const focusedRoute = state.routes[state.index];
    const focusedDescriptor = descriptors[focusedRoute.key];
    const tabBarStyle = StyleSheet.flatten(focusedDescriptor.options.tabBarStyle) as any;
    const isTabBarVisible = tabBarStyle?.display !== 'none';

    if (!isTabBarVisible) return null;

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
            <View
                style={[styles.blurContainer, { backgroundColor: 'rgba(11, 12, 15, 0.9)' }]}
            >
                <View style={styles.tabsRow}>
                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                        };

                        const onLongPress = () => {
                            navigation.emit({
                                type: 'tabLongPress',
                                target: route.key,
                            });
                        };

                        return (
                            <TabItem
                                key={route.key}
                                routeName={route.name}
                                isFocused={isFocused}
                                onPress={onPress}
                                onLongPress={onLongPress}
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        // We let the paddingBottom handle the safe area
        paddingTop: 0,
        alignItems: 'center',
        justifyContent: 'flex-end',
        pointerEvents: 'box-none', // Allow touches to pass through empty areas if any
    },
    blurContainer: {
        width: '100%',
        maxWidth: 500, // Limit width on tablets
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        backgroundColor: 'rgba(11, 12, 15, 0.75)', // Fallback / Tint base
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    tabsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        height: 70,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        // Default state is transparent
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 2,
    }
});
