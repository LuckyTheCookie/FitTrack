// ============================================================================
// STORAGE - Spix App
// Stockage local persistant avec MMKV et fallback sur AsyncStorage
// ============================================================================

import { StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMMKV, type MMKV } from 'react-native-mmkv';

// Try to initialize MMKV
let mmkvInstance: MMKV | null = null;
let useMMKV = false;

try {
    const instance = createMMKV({
        id: 'spix-storage',
    });
    // Test write/read to ensure MMKV works
    instance.set('__test__', 'ok');
    const testValue = instance.getString('__test__');
    if (testValue === 'ok') {
        useMMKV = true;
        instance.remove('__test__');
        mmkvInstance = instance;
        console.log('[Storage] ✅ Using MMKV (fast native storage)');
    } else {
        throw new Error('MMKV test failed');
    }
} catch (error) {
    console.log('[Storage] ⚠️ MMKV not available, falling back to AsyncStorage:', error);
    mmkvInstance = null;
    useMMKV = false;
}

// MMKV-based storage (synchronous)
const mmkvStorage: StateStorage = {
    getItem: (name: string) => {
        const value = mmkvInstance?.getString(name) ?? null;
        return value;
    },
    setItem: (name: string, value: string) => {
        mmkvInstance?.set(name, value);
    },
    removeItem: (name: string) => {
        mmkvInstance?.remove(name);
    },
};

// AsyncStorage-based storage (async, but wrapped to match interface)
const asyncStorage: StateStorage = {
    getItem: async (name: string) => {
        const value = await AsyncStorage.getItem(name);
        return value ?? null;
    },
    setItem: async (name: string, value: string) => {
        await AsyncStorage.setItem(name, value);
    },
    removeItem: async (name: string) => {
        await AsyncStorage.removeItem(name);
    },
};

// Export the appropriate storage based on MMKV availability
export const zustandStorage: StateStorage = useMMKV ? mmkvStorage : asyncStorage;

// Helper functions for direct storage access
export const storageHelpers = {
    getString: (key: string): string | null | Promise<string | null> => {
        if (useMMKV && mmkvInstance) {
            return mmkvInstance.getString(key) ?? null;
        }
        return AsyncStorage.getItem(key);
    },
    setString: (key: string, value: string): void | Promise<void> => {
        if (useMMKV && mmkvInstance) {
            mmkvInstance.set(key, value);
            return;
        }
        return AsyncStorage.setItem(key, value) as unknown as Promise<void>;
    },
    getNumber: (key: string): number | null => {
        if (useMMKV && mmkvInstance) {
            return mmkvInstance.getNumber(key) ?? null;
        }
        return null; // AsyncStorage doesn't support numbers directly
    },
    setNumber: (key: string, value: number): void => {
        if (useMMKV && mmkvInstance) {
            mmkvInstance.set(key, value);
        }
    },
    getBoolean: (key: string): boolean | null => {
        if (useMMKV && mmkvInstance) {
            return mmkvInstance.getBoolean(key) ?? null;
        }
        return null; // AsyncStorage doesn't support booleans directly
    },
    setBoolean: (key: string, value: boolean): void => {
        if (useMMKV && mmkvInstance) {
            mmkvInstance.set(key, value);
        }
    },
    delete: (key: string): void | Promise<void> => {
        if (useMMKV && mmkvInstance) {
            mmkvInstance.remove(key);
            return;
        }
        return AsyncStorage.removeItem(key) as unknown as Promise<void>;
    },
    clearAll: (): void | Promise<void> => {
        if (useMMKV && mmkvInstance) {
            mmkvInstance.clearAll();
            return;
        }
        return AsyncStorage.clear() as unknown as Promise<void>;
    },
    getAllKeys: (): string[] | Promise<readonly string[]> => {
        if (useMMKV && mmkvInstance) {
            return mmkvInstance.getAllKeys();
        }
        return AsyncStorage.getAllKeys();
    },
    isUsingMMKV: () => useMMKV,
    getStorageType: () => useMMKV ? 'MMKV' : 'AsyncStorage',
};
