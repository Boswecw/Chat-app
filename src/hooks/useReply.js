// src/hooks/useReply.js
import { create } from 'zustand';

/**
 * Global reply state management hook
 * Manages the reply-to functionality across the chat app
 */
const useReply = create((set, get) => ({
  // State
  replyTo: null, // The message being replied to
  
  // Computed values
  get isReplying() {
    return get().replyTo !== null;
  },
  
  // Actions
  setReplyTo: (message) => {
    if (!message || typeof message !== 'object') {
      console.warn('Invalid message provided to setReplyTo');
      return;
    }
    
    set({ 
      replyTo: {
        uuid: message.uuid,
        text: message.text,
        participant: message.participant,
        authorUuid: message.authorUuid,
        createdAt: message.createdAt,
      }
    });
  },
  
  cancelReply: () => {
    set({ replyTo: null });
  },
  
  // Helper to check if a message is being replied to
  isReplyingTo: (messageUuid) => {
    const { replyTo } = get();
    return replyTo?.uuid === messageUuid;
  },
}));

export default useReply;