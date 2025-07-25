// Fixed storage adapter for all stores
// Save this in: src/utils/storage.js

/**
 * Enhanced storage adapter that properly handles both native and web environments
 * This fixes the "storage currently unavailable" warnings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const createStorageAdapter = (storeName = 'unknown') => {
  // Detect environment
  const isWeb = typeof window !== 'undefined';
  
  if (isWeb) {
    // Web storage adapter with proper synchronous localStorage operations
    return {
      getItem: (key) => {
        try {
          if (typeof Storage !== 'undefined' && window.localStorage) {
            return Promise.resolve(window.localStorage.getItem(key));
          }
          console.warn(`[${storeName}] localStorage not available`);
          return Promise.resolve(null);
        } catch (_error) {
          console.warn(`[${storeName}] localStorage getItem failed`);
          return Promise.resolve(null);
        }
      },
      
      setItem: (key, value) => {
        try {
          if (typeof Storage !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
            return Promise.resolve();
          }
          console.warn(`[${storeName}] localStorage not available for setItem`);
          return Promise.resolve();
        } catch (_error) {
          console.warn(`[${storeName}] localStorage setItem failed`);
          // Don't throw - gracefully degrade
          return Promise.resolve();
        }
      },
      
      removeItem: (key) => {
        try {
          if (typeof Storage !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
            return Promise.resolve();
          }
          console.warn(`[${storeName}] localStorage not available for removeItem`);
          return Promise.resolve();
        } catch (_error) {
          console.warn(`[${storeName}] localStorage removeItem failed`);
          return Promise.resolve();
        }
      },
    };
  } else {
    // Native storage adapter
    return {
      getItem: AsyncStorage.getItem,
      setItem: AsyncStorage.setItem,
      removeItem: AsyncStorage.removeItem,
    };
  }
};

/**
 * Alternative: In-memory storage fallback for when persistence fails
 * Use this as a last resort to prevent app crashes
 */
export const createMemoryStorage = () => {
  const memoryStorage = new Map();
  
  return {
    getItem: (key) => Promise.resolve(memoryStorage.get(key) || null),
    setItem: (key, value) => {
      memoryStorage.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      memoryStorage.delete(key);
      return Promise.resolve();
    },
  };
};

/**
 * Robust storage adapter with automatic fallback
 */
export const createRobustStorageAdapter = (storeName = 'unknown') => {
  let primaryStorage = createStorageAdapter(storeName);
  let fallbackStorage = createMemoryStorage();
  let usingFallback = false;
  
  return {
    getItem: async (key) => {
      if (usingFallback) {
        return fallbackStorage.getItem(key);
      }
      
      try {
        return await primaryStorage.getItem(key);
      } catch (_error) {
        console.warn(`[${storeName}] Primary storage failed, switching to fallback`);
        usingFallback = true;
        return fallbackStorage.getItem(key);
      }
    },
    
    setItem: async (key, value) => {
      if (usingFallback) {
        return fallbackStorage.setItem(key, value);
      }
      
      try {
        return await primaryStorage.setItem(key, value);
      } catch (_error) {
        console.warn(`[${storeName}] Primary storage failed, switching to fallback`);
        usingFallback = true;
        return fallbackStorage.setItem(key, value);
      }
    },
    
    removeItem: async (key) => {
      if (usingFallback) {
        return fallbackStorage.removeItem(key);
      }
      
      try {
        return await primaryStorage.removeItem(key);
      } catch (_error) {
        console.warn(`[${storeName}] Primary storage failed, switching to fallback`);
        usingFallback = true;
        return fallbackStorage.removeItem(key);
      }
    },
  };
};