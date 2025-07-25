// src/state/messageStore.js - Complete Updated Version
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useMessageStore = create(
  subscribeWithSelector((set, get) => ({
    messages: [],
    optimisticMessages: new Map(),
    
    // ✅ ENHANCED: Set messages with validation
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
        .map(msg => ({
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
        }));
      
      console.log(`💾 Setting ${validMessages.length} messages in store`);
      set({ messages: validMessages });
    },
    
    // ✅ ENHANCED: Add message with comprehensive validation
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
      
      // ✅ ENSURE PARTICIPANT EXISTS AND IS VALID
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
      
      console.log('✅ Adding message:', {
        uuid: msg.uuid,
        participant: messageWithDefaults.participant.name,
        text: (msg.text || '').substring(0, 50) + '...',
        status: messageWithDefaults.status
      });
      
      set({ messages: [messageWithDefaults, ...messages] });
    },
    
    // ✅ ENHANCED: Update message with participant preservation and debugging
    updateMessage: (updatedMsg) => {
      if (!updatedMsg || typeof updatedMsg !== 'object') {
        console.error('updateMessage: Invalid message object:', updatedMsg);
        return;
      }
      
      if (!updatedMsg.uuid) {
        console.error('updateMessage: Message missing UUID:', updatedMsg);
        return;
      }
      
      const { messages } = get();
      
      // Find the message to update
      const messageIndex = messages.findIndex(m => m.uuid === updatedMsg.uuid);
      
      if (messageIndex === -1) {
        console.warn(`updateMessage: Message with UUID ${updatedMsg.uuid} not found. Available messages:`, 
          messages.map(m => ({ 
            uuid: m.uuid, 
            participant: m.participant?.name || 'No participant',
            status: m.status || 'no status'
          }))
        );
        return;
      }
      
      const originalMessage = messages[messageIndex];
      
      // ✅ CRITICAL FIX: Preserve participant and other essential data during updates
      const updatedMessage = {
        ...originalMessage, // Start with original message as base
        ...updatedMsg,      // Apply updates
        
        // Always preserve participant unless explicitly overridden with valid data
        participant: (updatedMsg.participant && updatedMsg.participant.name) 
          ? updatedMsg.participant 
          : originalMessage.participant || {
              name: 'Unknown User',
              uuid: 'unknown'
            },
            
        // Ensure arrays are preserved correctly
        reactions: Array.isArray(updatedMsg.reactions) 
          ? updatedMsg.reactions 
          : (Array.isArray(originalMessage.reactions) ? originalMessage.reactions : [])
      };
      
      console.log('🔄 Updating message:', {
        uuid: updatedMsg.uuid,
        changes: Object.keys(updatedMsg),
        participant: updatedMessage.participant?.name || 'No participant',
        status: updatedMessage.status || 'no status'
      });
      
      const newMessages = [...messages];
      newMessages[messageIndex] = updatedMessage;
      
      set({ messages: newMessages });
    },
    
    // ✅ NEW: Remove message (useful for failed messages)
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
      set({ messages: filteredMessages });
    },
    
    // ✅ NEW: Replace message (useful for temp -> real message transitions)
    replaceMessage: (oldUuid, newMessage) => {
      if (!oldUuid || !newMessage || !newMessage.uuid) {
        console.error('replaceMessage: Invalid parameters', { oldUuid, newMessage });
        return;
      }
      
      const { messages } = get();
      const messageIndex = messages.findIndex(m => m.uuid === oldUuid);
      
      if (messageIndex === -1) {
        console.warn(`replaceMessage: Message with UUID ${oldUuid} not found`);
        return;
      }
      
      const originalMessage = messages[messageIndex];
      
      // Preserve important data from original message
      const finalMessage = {
        ...newMessage,
        participant: newMessage.participant || originalMessage.participant || {
          name: 'Unknown User',
          uuid: 'unknown'
        },
        status: 'sent',
        reactions: Array.isArray(newMessage.reactions) ? newMessage.reactions : []
      };
      
      console.log(`🔄 Replacing message ${oldUuid} with ${newMessage.uuid}`);
      
      const newMessages = [...messages];
      newMessages[messageIndex] = finalMessage;
      
      set({ messages: newMessages });
    },
    
    // ✅ ENHANCED: Optimistic reaction methods with better error handling
    addReactionOptimistic: (messageId, emoji, participantId = 'you') => {
      if (!messageId || !emoji) {
        console.error('addReactionOptimistic: messageId and emoji are required');
        return null;
      }
      
      const { messages, optimisticMessages } = get();
      
      // Check if message exists
      const messageExists = messages.some(m => m.uuid === messageId);
      if (!messageExists) {
        console.warn(`addReactionOptimistic: Message ${messageId} not found`);
        return null;
      }
      
      // Create unique key for this optimistic update
      const optimisticKey = `${messageId}-${emoji}-${Date.now()}-${Math.random()}`;
      
      // Check if user already has this reaction (prevent duplicates)
      const message = messages.find(m => m.uuid === messageId);
      if (message?.reactions?.some(r => r.emoji === emoji && r.participants?.includes(participantId))) {
        console.log('User already has this reaction');
        return null;
      }
      
      const newOptimisticMessages = new Map(optimisticMessages);
      newOptimisticMessages.set(optimisticKey, { 
        messageId, 
        emoji, 
        participantId,
        type: 'add',
        timestamp: Date.now()
      });
      
      console.log(`⚡ Adding optimistic reaction: ${emoji} to ${messageId}`);
      
      set({ optimisticMessages: newOptimisticMessages });
      
      return optimisticKey;
    },
    
    confirmReaction: (optimisticKey) => {
      if (!optimisticKey) {
        console.error('confirmReaction: optimisticKey is required');
        return;
      }
      
      const { optimisticMessages } = get();
      
      if (!optimisticMessages.has(optimisticKey)) {
        console.warn(`confirmReaction: Optimistic key ${optimisticKey} not found`);
        return;
      }
      
      const newOptimisticMessages = new Map(optimisticMessages);
      newOptimisticMessages.delete(optimisticKey);
      
      console.log(`✅ Confirmed optimistic reaction: ${optimisticKey}`);
      
      set({ optimisticMessages: newOptimisticMessages });
    },
    
    revertReaction: (optimisticKey) => {
      if (!optimisticKey) {
        console.error('revertReaction: optimisticKey is required');
        return;
      }
      
      const { optimisticMessages } = get();
      
      if (!optimisticMessages.has(optimisticKey)) {
        console.warn(`revertReaction: Optimistic key ${optimisticKey} not found`);
        return;
      }
      
      const newOptimisticMessages = new Map(optimisticMessages);
      newOptimisticMessages.delete(optimisticKey);
      
      console.log(`❌ Reverted optimistic reaction: ${optimisticKey}`);
      
      set({ optimisticMessages: newOptimisticMessages });
    },
    
    // ✅ ENHANCED: Clear stale optimistic updates with better logging
    clearStaleOptimisticUpdates: () => {
      const { optimisticMessages } = get();
      const now = Date.now();
      const staleThreshold = 30000; // 30 seconds
      let removedCount = 0;
      
      const newOptimisticMessages = new Map();
      
      for (const [tempId, data] of optimisticMessages.entries()) {
        const timestamp = data.timestamp || parseInt(tempId.split('-').pop());
        
        if (now - timestamp > staleThreshold) {
          removedCount++;
          console.warn(`Removing stale optimistic update: ${tempId}`);
        } else {
          newOptimisticMessages.set(tempId, data);
        }
      }
      
      if (removedCount > 0) {
        console.log(`🧹 Cleared ${removedCount} stale optimistic updates`);
        set({ optimisticMessages: newOptimisticMessages });
      }
    },
    
    // ✅ NEW: Clear all messages (useful for session resets)
    clearMessages: () => {
      console.log('🗑️ Clearing all messages and optimistic updates');
      set({ 
        messages: [], 
        optimisticMessages: new Map() 
      });
    },
    
    // ✅ NEW: Get message by UUID (helper method)
    getMessageByUuid: (uuid) => {
      if (!uuid) return null;
      
      const { messages } = get();
      return messages.find(m => m.uuid === uuid) || null;
    },
    
    // ✅ NEW: Get messages by participant (helper method)
    getMessagesByParticipant: (participantUuid) => {
      if (!participantUuid) return [];
      
      const { messages } = get();
      return messages.filter(m => m.participant?.uuid === participantUuid);
    },
    
    // ✅ NEW: Get message count (helper method)
    getMessageCount: () => {
      const { messages } = get();
      return messages.length;
    },
    
    // ✅ NEW: Validate store integrity (debugging helper)
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
      });
      
      if (issues.length > 0) {
        console.warn('Store integrity issues found:', issues);
      } else {
        console.log('✅ Store integrity check passed');
      }
      
      return issues;
    }
  }))
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
  
  useMessageStore.subscribe(
    (state) => state.optimisticMessages,
    (optimisticMessages) => {
      if (optimisticMessages.size > 0) {
        console.log(`⚡ Optimistic updates: ${optimisticMessages.size}`);
      }
    }
  );
}

export default useMessageStore;