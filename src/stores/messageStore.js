// src/stores/messageStore.js - FIXED VERSION WITH SINGLE DEFAULT EXPORT
import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useMessageStore = create(
  persist(
    subscribeWithSelector((set, get) => ({
      // =====================================
      // STATE
      // =====================================
      messages: [],
      loading: false,
      error: null,
      lastUpdateTime: null,
      optimisticMessages: new Map(),

      // =====================================
      // CORE MESSAGE ACTIONS
      // =====================================
      
      setMessages: (msgs) => {
        if (!Array.isArray(msgs)) {
          console.error('setMessages: Expected array, received:', typeof msgs);
          return;
        }
        
        // Validate and sanitize each message
        const validMessages = msgs
          .filter(msg => {
            if (!msg || typeof msg !== 'object') {
              console.warn('Invalid message object filtered out:', msg);
              return false;
            }
            return true;
          })
          .map(msg => {
            const processedMsg = {
              ...msg,
              // Ensure participant exists
              participant: msg.participant || {
                name: 'Unknown User',
                uuid: 'unknown'
              },
              // Ensure required fields have defaults
              uuid: msg.uuid || `fallback-${Date.now()}-${Math.random()}`,
              text: msg.text || '',
              createdAt: msg.createdAt || new Date().toISOString(),
              status: msg.status || 'sent',
              reactions: Array.isArray(msg.reactions) ? msg.reactions : []
            };
            
            // ✅ CRITICAL FIX: Properly compute hasReactions
            processedMsg.hasReactions = processedMsg.reactions.length > 0;
            
            return processedMsg;
          });
        
        console.log(`💾 Setting ${validMessages.length} messages in store`);
        set({ 
          messages: validMessages,
          lastUpdateTime: Date.now(),
          error: null 
        });
      },

      addMessage: (msg) => {
        if (!msg || typeof msg !== 'object') {
          console.error('addMessage: Invalid message object:', msg);
          return;
        }
        
        if (!msg.uuid) {
          console.error('addMessage: Message missing UUID:', msg);
          return;
        }
        
        const { messages } = get();
        
        // Check if message already exists
        const exists = messages.some(m => m.uuid === msg.uuid);
        if (exists) {
          console.warn(`addMessage: Message with UUID ${msg.uuid} already exists`);
          return;
        }
        
        // Ensure participant exists and is valid
        const messageWithDefaults = {
          ...msg,
          participant: msg.participant || {
            name: 'Unknown User',
            uuid: 'unknown'
          },
          text: msg.text || '',
          createdAt: msg.createdAt || new Date().toISOString(),
          status: msg.status || 'sent',
          reactions: Array.isArray(msg.reactions) ? msg.reactions : []
        };
        
        // Additional participant validation
        if (!messageWithDefaults.participant.name) {
          messageWithDefaults.participant.name = 'Unknown User';
        }
        if (!messageWithDefaults.participant.uuid) {
          messageWithDefaults.participant.uuid = 'unknown';
        }
        
        // ✅ CRITICAL FIX: Compute hasReactions properly
        messageWithDefaults.hasReactions = messageWithDefaults.reactions.length > 0;
        
        console.log('✅ Adding message:', {
          uuid: msg.uuid,
          participant: messageWithDefaults.participant.name,
          text: (msg.text || '').substring(0, 50) + '...',
          status: messageWithDefaults.status,
          hasReactions: messageWithDefaults.hasReactions
        });
        
        set({ 
          messages: [messageWithDefaults, ...messages],
          lastUpdateTime: Date.now() 
        });
      },

      addMessages: (newMessages) => {
        if (!Array.isArray(newMessages)) {
          console.error('addMessages: Expected array, received:', typeof newMessages);
          return;
        }
        
        const currentMessages = get().messages;
        const existingUuids = new Set(currentMessages.map(m => m.uuid));
        
        // Only add messages that don't already exist
        const uniqueNewMessages = newMessages
          .filter(m => m && m.uuid && !existingUuids.has(m.uuid))
          .map(msg => {
            const processedMsg = {
              ...msg,
              participant: msg.participant || { name: 'Unknown User', uuid: 'unknown' },
              reactions: Array.isArray(msg.reactions) ? msg.reactions : []
            };
            processedMsg.hasReactions = processedMsg.reactions.length > 0;
            return processedMsg;
          });
        
        if (uniqueNewMessages.length > 0) {
          console.log(`➕ Adding ${uniqueNewMessages.length} new messages`);
          set({ 
            messages: [...uniqueNewMessages, ...currentMessages],
            lastUpdateTime: Date.now() 
          });
        }
      },

      updateMessage: (uuid, updates) => {
        if (!uuid) {
          console.error('updateMessage: UUID is required');
          return;
        }
        
        if (!updates || typeof updates !== 'object') {
          console.error('updateMessage: Invalid updates object:', updates);
          return;
        }
        
        const { messages } = get();
        const messageIndex = messages.findIndex(m => m.uuid === uuid);
        
        if (messageIndex === -1) {
          console.warn(`updateMessage: Message with UUID ${uuid} not found`);
          return;
        }
        
        const originalMessage = messages[messageIndex];
        
        // ✅ CRITICAL FIX: Preserve participant and other essential data during updates
        const updatedMessage = {
          ...originalMessage, // Start with original message as base
          ...updates,         // Apply updates
          
          // Always preserve participant unless explicitly overridden with valid data
          participant: (updates.participant && updates.participant.name) 
            ? updates.participant 
            : originalMessage.participant || {
                name: 'Unknown User',
                uuid: 'unknown'
              },
              
          // Ensure arrays are preserved correctly
          reactions: Array.isArray(updates.reactions) 
            ? updates.reactions 
            : (Array.isArray(originalMessage.reactions) ? originalMessage.reactions : [])
        };
        
        // ✅ CRITICAL FIX: Always recompute hasReactions after update
        updatedMessage.hasReactions = updatedMessage.reactions.length > 0;
        
        console.log('🔄 Updating message:', {
          uuid: uuid,
          changes: Object.keys(updates),
          participant: updatedMessage.participant?.name || 'No participant',
          status: updatedMessage.status || 'no status',
          hasReactions: updatedMessage.hasReactions
        });
        
        const newMessages = [...messages];
        newMessages[messageIndex] = updatedMessage;
        
        set({ 
          messages: newMessages,
          lastUpdateTime: Date.now() 
        });
      },

      removeMessage: (uuid) => {
        if (!uuid) {
          console.error('removeMessage: UUID is required');
          return;
        }
        
        const { messages } = get();
        const initialCount = messages.length;
        const filteredMessages = messages.filter(m => m.uuid !== uuid);
        
        if (filteredMessages.length === initialCount) {
          console.warn(`removeMessage: Message with UUID ${uuid} not found`);
          return;
        }
        
        console.log(`🗑️ Removed message: ${uuid}`);
        set({ 
          messages: filteredMessages,
          lastUpdateTime: Date.now() 
        });
      },

      // =====================================
      // REACTION MANAGEMENT - ✅ NEW & FIXED
      // =====================================
      
      addReaction: (messageUuid, emoji, userId = 'you') => {
        if (!messageUuid || !emoji) {
          console.error('addReaction: messageUuid and emoji are required');
          return;
        }
        
        const { messages } = get();
        const messageIndex = messages.findIndex(m => m.uuid === messageUuid);
        
        if (messageIndex === -1) {
          console.warn(`addReaction: Message ${messageUuid} not found`);
          return;
        }
        
        const message = messages[messageIndex];
        const existingReactions = message.reactions || [];
        
        // Check if user already has this reaction
        const existingReactionIndex = existingReactions.findIndex(r => 
          (r.emoji || r.type) === emoji && r.participants?.includes(userId)
        );
        
        let updatedReactions;
        
        if (existingReactionIndex !== -1) {
          // Remove user's reaction
          const reaction = existingReactions[existingReactionIndex];
          const updatedParticipants = reaction.participants?.filter(p => p !== userId) || [];
          
          if (updatedParticipants.length === 0) {
            // Remove reaction entirely if no participants left
            updatedReactions = existingReactions.filter((_, i) => i !== existingReactionIndex);
          } else {
            // Update participant list
            updatedReactions = existingReactions.map((r, i) => 
              i === existingReactionIndex 
                ? { ...r, count: updatedParticipants.length, participants: updatedParticipants }
                : r
            );
          }
        } else {
          // Find existing reaction for this emoji
          const existingEmojiIndex = existingReactions.findIndex(r => 
            (r.emoji || r.type) === emoji
          );
          
          if (existingEmojiIndex !== -1) {
            // Add user to existing reaction
            const reaction = existingReactions[existingEmojiIndex];
            updatedReactions = existingReactions.map((r, i) => 
              i === existingEmojiIndex 
                ? { 
                    ...r, 
                    count: (r.count || 0) + 1, 
                    participants: [...(r.participants || []), userId] 
                  }
                : r
            );
          } else {
            // Create new reaction
            updatedReactions = [
              ...existingReactions,
              {
                emoji: emoji,
                type: emoji, // Support both formats
                count: 1,
                participants: [userId]
              }
            ];
          }
        }
        
        // Update the message
        const updatedMessage = {
          ...message,
          reactions: updatedReactions,
          hasReactions: updatedReactions.length > 0 // ✅ CRITICAL FIX
        };
        
        const newMessages = [...messages];
        newMessages[messageIndex] = updatedMessage;
        
        set({ 
          messages: newMessages,
          lastUpdateTime: Date.now() 
        });
        
        console.log(`✅ Reaction ${emoji} ${existingReactionIndex !== -1 ? 'removed from' : 'added to'} message ${messageUuid}`);
      },

      // =====================================
      // UTILITY ACTIONS
      // =====================================
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      clearMessages: () => set({ 
        messages: [], 
        lastUpdateTime: null,
        error: null 
      }),

      // =====================================
      // GETTERS
      // =====================================
      
      getMessageById: (uuid) => {
        return get().messages.find(m => m.uuid === uuid);
      },
      
      getMessagesByAuthor: (authorUuid) => {
        return get().messages.filter(m => m.participant?.uuid === authorUuid);
      },
      
      getMessagesCount: () => {
        return get().messages.length;
      },

      // =====================================
      // DEBUG UTILITIES
      // =====================================
      
      validateStoreIntegrity: () => {
        const { messages } = get();
        let issues = [];
        
        messages.forEach((msg, index) => {
          if (!msg.uuid) {
            issues.push(`Message at index ${index} missing UUID`);
          }
          
          if (!msg.participant) {
            issues.push(`Message ${msg.uuid} missing participant`);
          } else {
            if (!msg.participant.name) {
              issues.push(`Message ${msg.uuid} participant missing name`);
            }
            if (!msg.participant.uuid) {
              issues.push(`Message ${msg.uuid} participant missing UUID`);
            }
          }
          
          if (!msg.text && msg.text !== '') {
            issues.push(`Message ${msg.uuid} missing text`);
          }
          
          if (!msg.createdAt) {
            issues.push(`Message ${msg.uuid} missing createdAt`);
          }

          // Check hasReactions consistency
          const computedHasReactions = Boolean(msg.reactions?.length > 0);
          if (msg.hasReactions !== computedHasReactions) {
            issues.push(`Message ${msg.uuid} hasReactions mismatch: stored=${msg.hasReactions}, computed=${computedHasReactions}`);
          }
        });
        
        if (issues.length > 0) {
          console.warn('Store integrity issues found:', issues);
        } else {
          console.log('✅ Store integrity check passed');
        }
        
        return issues;
      }
    })),
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

// ✅ SUBSCRIBE TO CHANGES FOR DEBUGGING (DEVELOPMENT ONLY)
if (__DEV__) {
  useMessageStore.subscribe(
    (state) => state.messages,
    (messages, previousMessages) => {
      if (messages.length !== previousMessages.length) {
        console.log(`📊 Message count changed: ${previousMessages.length} → ${messages.length}`);
      }
    }
  );
}

// =====================================  
// ✅ SINGLE DEFAULT EXPORT - FIXES THE ERROR
// =====================================
export default useMessageStore;