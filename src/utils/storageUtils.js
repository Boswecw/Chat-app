// src/utils/storageUtils.js
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Enhanced storage adapter with comprehensive error handling
 * and fallback mechanisms for cross-platform compatibility
 */
export const createEnhancedStorageAdapter = (storeName) => {
  const webStorage = {
    async getItem(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const item = window.localStorage.getItem(key);
          return item;
        }
        return null;
      } catch (error) {
        console.warn(`[${storeName}] Web storage getItem failed:`, error);
        return null;
      }
    },
    
    async setItem(key, value) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return true;
        }
        return false;
      } catch (error) {
        console.warn(`[${storeName}] Web storage setItem failed:`, error);
        
        // Check for quota exceeded error
        if (error.name === 'QuotaExceededError') {
          console.warn(`[${storeName}] Storage quota exceeded, attempting cleanup`);
          try {
            // Clear old data or implement LRU cleanup
            const oldKeys = [];
            for (let i = 0; i < window.localStorage.length; i++) {
              const key = window.localStorage.key(i);
              if (key && key.startsWith('chat-') && key !== key) {
                oldKeys.push(key);
              }
            }
            // Remove oldest entries
            oldKeys.slice(0, Math.min(5, oldKeys.length)).forEach(oldKey => {
              window.localStorage.removeItem(oldKey);
            });
            // Retry the operation
            window.localStorage.setItem(key, value);
            return true;
          } catch (retryError) {
            console.error(`[${storeName}] Storage cleanup failed:`, retryError);
          }
        }
        return false;
      }
    },
    
    async removeItem(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return true;
        }
        return false;
      } catch (error) {
        console.warn(`[${storeName}] Web storage removeItem failed:`, error);
        return false;
      }
    },
  };

  // Return appropriate storage based on platform
  if (typeof window !== 'undefined') {
    return webStorage;
  } else {
    // Enhanced AsyncStorage wrapper for native
    return {
      async getItem(key) {
        try {
          return await AsyncStorage.getItem(key);
        } catch (error) {
          console.warn(`[${storeName}] AsyncStorage getItem failed:`, error);
          return null;
        }
      },
      
      async setItem(key, value) {
        try {
          await AsyncStorage.setItem(key, value);
          return true;
        } catch (error) {
          console.warn(`[${storeName}] AsyncStorage setItem failed:`, error);
          return false;
        }
      },
      
      async removeItem(key) {
        try {
          await AsyncStorage.removeItem(key);
          return true;
        } catch (error) {
          console.warn(`[${storeName}] AsyncStorage removeItem failed:`, error);
          return false;
        }
      },
    };
  }
};

/**
 * Create Zustand persist config with enhanced error handling
 */
export const createPersistConfig = (name, additionalOptions = {}) => ({
  name,
  getStorage: () => createEnhancedStorageAdapter(name),
  version: 1,
  onRehydrateStorage: () => (state, error) => {
    if (error) {
      console.error(`[${name}] Storage rehydration failed:`, error);
    } else if (state) {
      console.log(`[${name}] Storage rehydrated successfully`);
    }
  },
  partialize: (state) => {
    // Exclude optimistic updates and temporary data from persistence
    const { optimisticMessages, ...persistentState } = state;
    return persistentState;
  },
  ...additionalOptions,
});