// ============================================================================
// STORAGE - FitTrack App
// Stockage local persistant avec MMKV (fallback AsyncStorage)
// ============================================================================

import { StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tentative d'import MMKV de manière sécurisée
let mmkvInstance: any = null;
let useMMKV = false;

try {
  const { MMKV } = require('react-native-mmkv');
  if (MMKV) {
    mmkvInstance = new MMKV({
      id: 'fittrack-storage',
    });
    useMMKV = true;
    console.log('[Storage] MMKV initialized successfully');
  }
} catch (error) {
  console.log('[Storage] MMKV not available, falling back to AsyncStorage');
  useMMKV = false;
}

// Adapter pour Zustand persist - utilise MMKV si disponible, sinon AsyncStorage
export const zustandStorage: StateStorage = {
  getItem: async (name: string) => {
    if (useMMKV && mmkvInstance) {
      const value = mmkvInstance.getString(name);
      return value ?? null;
    }
    const value = await AsyncStorage.getItem(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.set(name, value);
      return;
    }
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.delete(name);
      return;
    }
    await AsyncStorage.removeItem(name);
  },
};

// Helpers pour accès direct
export const storageHelpers = {
  getString: (key: string) => {
    if (useMMKV && mmkvInstance) {
      return Promise.resolve(mmkvInstance.getString(key) ?? null);
    }
    return AsyncStorage.getItem(key);
  },
  setString: (key: string, value: string) => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.set(key, value);
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  delete: (key: string) => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.delete(key);
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
  clearAll: () => {
    if (useMMKV && mmkvInstance) {
      mmkvInstance.clearAll();
      return Promise.resolve();
    }
    return AsyncStorage.clear();
  },
  getAllKeys: () => {
    if (useMMKV && mmkvInstance) {
      return Promise.resolve(mmkvInstance.getAllKeys());
    }
    return AsyncStorage.getAllKeys();
  },
  isUsingMMKV: () => useMMKV,
};
