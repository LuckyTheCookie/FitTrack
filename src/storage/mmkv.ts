// ============================================================================
// STORAGE ASYNC - FitTrack App
// Stockage local persistant avec AsyncStorage
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

// Adapter pour Zustand persist
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

// Helpers pour accès direct
export const storageHelpers = {
  getString: (key: string) => AsyncStorage.getItem(key),
  setString: (key: string, value: string) => AsyncStorage.setItem(key, value),
  delete: (key: string) => AsyncStorage.removeItem(key),
  clearAll: () => AsyncStorage.clear(),
  getAllKeys: () => AsyncStorage.getAllKeys(),
};
