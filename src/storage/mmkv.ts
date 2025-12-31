// ============================================================================
// STORAGE - FitTrack App
// Stockage local persistant avec AsyncStorage
// ============================================================================

import { StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

console.log('[Storage] Using AsyncStorage (MMKV disabled)');

export const zustandStorage: StateStorage = {
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

export const storageHelpers = {
    getString: (key: string) => {
        return AsyncStorage.getItem(key);
    },
    setString: (key: string, value: string) => {
        return AsyncStorage.setItem(key, value);
    },
    delete: (key: string) => {
        return AsyncStorage.removeItem(key);
    },
    clearAll: () => {
        return AsyncStorage.clear();
    },
    getAllKeys: () => {
        return AsyncStorage.getAllKeys();
    },
    isUsingMMKV: () => false,
    getStorageType: () => 'AsyncStorage',
};
