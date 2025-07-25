// src/stores/messageStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useMessageStore = create(
  persist(
    (set, get) => ({
      // State
      messages: [],
      loading: false,
      error: null,
      lastUpdateTime: null,
      
      // Actions
      setMessages: (messages) => {
        set({ 
          messages,
          lastUpdateTime: Date.now(),
          error: null 
        });
      },
      
      addMessage: (message) => {
        const currentMessages = get().messages;
        // Prevent duplicates
        if (!currentMessages.find(m => m.uuid === message.uuid)) {
          set({ 
            messages: [message, ...currentMessages],
            lastUpdateTime: Date.now() 
          });
        }
      },
      
      addMessages: (newMessages) => {
        const currentMessages = get().messages;
        const existingUuids = new Set(currentMessages.map(m => m.uuid));
        
        // Only add messages that don't already exist
        const uniqueNewMessages = newMessages.filter(m => !existingUuids.has(m.uuid));
        
        if (uniqueNewMessages.length > 0) {
          set({ 
            messages: [...uniqueNewMessages, ...currentMessages],
            lastUpdateTime: Date.now() 
          });
        }
      },
      
      updateMessage: (uuid, updates) => {
        const currentMessages = get().messages;
        const updatedMessages = currentMessages.map(message =>
          message.uuid === uuid ? { ...message, ...updates } : message
        );
        set({ 
          messages: updatedMessages,
          lastUpdateTime: Date.now() 
        });
      },
      
      removeMessage: (uuid) => {
        const currentMessages = get().messages;
        const filteredMessages = currentMessages.filter(m => m.uuid !== uuid);
        set({ 
          messages: filteredMessages,
          lastUpdateTime: Date.now() 
        });
      },
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      clearMessages: () => set({ 
        messages: [], 
        lastUpdateTime: null,
        error: null 
      }),
      
      // Getters
      getMessageById: (uuid) => {
        return get().messages.find(m => m.uuid === uuid);
      },
      
      getMessagesByAuthor: (authorUuid) => {
        return get().messages.filter(m => m.authorUuid === authorUuid);
      },
      
      getMessagesCount: () => {
        return get().messages.length;
      },
    }),
    {
      name: 'chat-messages', // unique name for AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      
      // Only persist essential data, not loading/error states
      partialize: (state) => ({
        messages: state.messages,
        lastUpdateTime: state.lastUpdateTime,
      }),
      
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('❌ Message store rehydration failed:', error);
        } else {
          console.log('✅ Message store rehydrated successfully');
          if (state?.messages) {
            console.log(`📩 Restored ${state.messages.length} messages from storage`);
          }
        }
      },
    }
  )
);

export default useMessageStore;