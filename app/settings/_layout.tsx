// ============================================================================
// SETTINGS LAYOUT - Stack navigation for settings sub-screens
// ============================================================================

import { Stack } from 'expo-router';
import { Colors } from '../../src/constants';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="language" />
      <Stack.Screen name="social" />
      <Stack.Screen name="data" />
      <Stack.Screen name="labs" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="developer" />
    </Stack>
  );
}
