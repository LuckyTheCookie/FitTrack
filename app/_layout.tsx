import { Tabs } from 'expo-router';
import React from 'react';
import { TabBar } from '../src/components/ui';
import { Colors } from '../src/constants';

export default function Layout() {
    return (
        <Tabs
            tabBar={props => <TabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.bg, // Fallback
                    borderTopWidth: 0,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Today",
                }}
            />
            <Tabs.Screen
                name="workout"
                options={{
                    title: "Workout",
                }}
            />
            <Tabs.Screen
                name="progress"
                options={{
                    title: "Progress",
                }}
            />
            <Tabs.Screen
                name="tools"
                options={{
                    title: "Tools",
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                }}
            />
        </Tabs>
    );
}
