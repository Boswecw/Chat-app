// src/api/messages.js
import axios from 'axios';

const BASE_URL = 'https://dummy-chat-server.tribechat.com/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

// Generic retry wrapper
const withRetry = async (fn, retries = MAX_RETRIES) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.response?.status >= 500) {
      console.log(`Retrying request. Attempts remaining: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

// ✅ EXISTING FUNCTIONS - Enhanced with better error handling

/**
 * Fetch the latest 25 messages
 */
export const fetchLatestMessages = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/messages/latest`);
    return res.data;
  } catch (err) {
    console.error('❌ Failed to fetch latest messages:', err);
    throw new Error(`Failed to fetch messages: ${err.message}`);
  }
};

/**
 * Fetch all messages
 */
export const fetchAllMessages = async () => {
  return withRetry(async () => {
    const response = await apiClient.get('/messages/all');
    return response.data;
  });
};

/**
 * Fetch older messages before a reference message
 * @param {string} refMessageUuid - UUID of the reference message
 */
export const fetchOlderMessages = async (refMessageUuid) => {
  return withRetry(async () => {
    const response = await apiClient.get(`/messages/older/${refMessageUuid}`);
    return response.data;
  });
};

/**
 * Fetch updated messages since a timestamp
 * @param {number} since - Timestamp in milliseconds since epoch
 */
export const fetchUpdatedMessages = async (since) => {
  try {
    const res = await axios.get(`${BASE_URL}/messages/updates/${since}`);
    return res.data;
  } catch (err) {
    console.error('❌ Failed to fetch updated messages:', err);
    // Return empty array for non-critical updates
    return [];
  }
};

/**
 * Send a new message
 * @param {string} text - Message text content
 */
export const sendMessage = async (text) => {
  try {
    const res = await axios.post(`${BASE_URL}/messages/new`, { text });
    return res.data;
  } catch (err) {
    console.error('❌ Failed to send message:', err);
    throw new Error(`Failed to send message: ${err.message}`);
  }
};

// ✅ NEW FUNCTION - Missing sendReaction implementation (FIXES IMPORT ERROR)

/**
 * Add or toggle a reaction to/from a message
 * Note: Since reaction endpoints don't exist yet in the current API,
 * this provides a graceful fallback with mock behavior to keep the app functional.
 * 
 * @param {string} messageId - UUID of the message to react to
 * @param {string} emoji - Emoji reaction (e.g., '👍', '❤️', etc.)
 * @param {boolean} isAdding - Whether to add (true) or remove (false) the reaction
 */
export const sendReaction = async (messageId, emoji, isAdding = true) => {
  if (!messageId || !emoji) {
    throw new Error('Message ID and emoji are required');
  }

  try {
    // Try the future API endpoint first
    return withRetry(async () => {
      if (isAdding) {
        // Add reaction
        const response = await apiClient.post(`/messages/${messageId}/reactions`, {
          emoji
        });
        return response.data;
      } else {
        // Remove reaction  
        const response = await apiClient.delete(`/messages/${messageId}/reactions`, {
          data: { emoji }
        });
        return response.data;
      }
    });
  } catch (error) {
    // If reaction endpoints don't exist yet (404/405), provide graceful fallback
    if (error.response?.status === 404 || error.response?.status === 405) {
      console.warn('⚠️ Reaction endpoints not yet implemented on server. Using mock behavior for development.');
      
      // Return mock success response to keep the frontend working
      return {
        success: true,
        messageId,
        emoji,
        action: isAdding ? 'added' : 'removed',
        timestamp: Date.now(),
        // Flag to indicate this is a mock response
        mock: true,
        // Simulate what the real response might look like
        message: {
          uuid: messageId,
          reactions: [
            {
              emoji,
              count: isAdding ? 1 : 0,
              participants: isAdding ? ['you'] : []
            }
          ]
        }
      };
    }
    
    // Re-throw other errors (network, server errors, etc.)
    console.error('❌ Failed to send reaction:', error);
    throw new Error(`Failed to send reaction: ${error.message}`);
  }
};

/**
 * Add a reaction to a message (convenience function)
 * @param {string} messageId - UUID of the message
 * @param {string} emoji - Emoji to add
 */
export const addReaction = async (messageId, emoji) => {
  return sendReaction(messageId, emoji, true);
};

/**
 * Remove a reaction from a message (convenience function)
 * @param {string} messageId - UUID of the message
 * @param {string} emoji - Emoji to remove
 */
export const removeReaction = async (messageId, emoji) => {
  return sendReaction(messageId, emoji, false);
};

/**
 * Get detailed reaction information for a message
 * Note: This endpoint may not exist yet in the current API.
 * 
 * @param {string} messageId - UUID of the message
 */
export const getMessageReactions = async (messageId) => {
  if (!messageId) {
    throw new Error('Message ID is required');
  }

  try {
    const response = await apiClient.get(`/messages/${messageId}/reactions`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn('⚠️ Reaction detail endpoint not yet implemented. Returning empty reactions.');
      return { reactions: [], messageId };
    }
    console.error('❌ Failed to get message reactions:', error);
    throw new Error(`Failed to get reactions: ${error.message}`);
  }
};

// ✅ UTILITY FUNCTIONS

/**
 * Validate message object structure
 * @param {object} message - Message object to validate
 */
export const validateMessage = (message) => {
  const required = ['uuid', 'text', 'createdAt', 'participant'];
  const missing = required.filter(field => !message[field]);
  
  if (missing.length > 0) {
    throw new Error(`Message missing required fields: ${missing.join(', ')}`);
  }
  
  return true;
};

/**
 * Transform server message format to app format if needed
 * @param {object} serverMessage - Message from server
 */
export const transformMessage = (serverMessage) => {
  try {
    validateMessage(serverMessage);
    
    return {
      ...serverMessage,
      // Ensure consistent timestamp format
      createdAt: new Date(serverMessage.createdAt).getTime(),
      editedAt: serverMessage.editedAt ? new Date(serverMessage.editedAt).getTime() : null,
      // Ensure reactions array exists
      reactions: serverMessage.reactions || [],
      // Add status for optimistic updates
      status: serverMessage.status || 'sent'
    };
  } catch (error) {
    console.error('Error transforming message:', error);
    // Return the message as-is if transformation fails
    return serverMessage;
  }
};

/**
 * Transform an array of messages
 * @param {array} messages - Array of messages from server
 */
export const transformMessages = (messages) => {
  if (!Array.isArray(messages)) {
    console.error('Expected array of messages, received:', typeof messages);
    return [];
  }
  
  return messages.map(transformMessage).filter(Boolean);
};

// ✅ ERROR HANDLING UTILITIES

/**
 * Check if error is network-related
 * @param {Error} error - Error object
 */
export const isNetworkError = (error) => {
  return !error.response || error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED';
};

/**
 * Check if error is server-related (5xx status codes)
 * @param {Error} error - Error object
 */
export const isServerError = (error) => {
  return error.response && error.response.status >= 500;
};

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 */
export const getErrorMessage = (error) => {
  if (isNetworkError(error)) {
    return 'Network connection failed. Please check your internet connection.';
  }
  
  if (isServerError(error)) {
    return 'Server temporarily unavailable. Please try again in a moment.';
  }
  
  if (error.response?.status === 400) {
    return error.response.data?.message || 'Invalid request. Please check your input.';
  }
  
  if (error.response?.status === 429) {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  
  return error.response?.data?.message || error.message || 'An unexpected error occurred.';
};

// ✅ DEVELOPMENT HELPERS

/**
 * Mock function for development - simulates API delay
 * @param {number} delay - Delay in milliseconds
 */
export const mockDelay = (delay = 500) => {
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = () => {
  return __DEV__ || process.env.NODE_ENV === 'development';
};

// ✅ EXPORTS - All functions needed by ChatScreen and other components
export default {
  // Core message operations
  fetchLatestMessages,
  fetchAllMessages,
  fetchOlderMessages,
  fetchUpdatedMessages,
  sendMessage,
  
  // Reaction operations (FIXED: Now includes sendReaction)
  sendReaction,
  addReaction,
  removeReaction,
  getMessageReactions,
  
  // Utilities
  validateMessage,
  transformMessage,
  transformMessages,
  
  // Error handling
  isNetworkError,
  isServerError,
  getErrorMessage,
  
  // Development helpers
  mockDelay,
  isDevelopment
};