// src/api/reactions.js
import axios from 'axios';

const BASE_URL = 'https://dummy-chat-server.tribechat.com/api';

/**
 * Add a reaction to a message
 * NOTE: This endpoint doesn't exist yet in the current API
 * This is prepared for future API extension
 */
export const addReactionToMessage = async (messageId, emoji) => {
  try {
    const response = await axios.post(`${BASE_URL}/messages/${messageId}/reactions`, {
      emoji,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to add reaction:', error);
    throw new Error(`Failed to add reaction: ${error.message}`);
  }
};

/**
 * Remove a reaction from a message
 * NOTE: This endpoint doesn't exist yet in the current API
 * This is prepared for future API extension
 */
export const removeReactionFromMessage = async (messageId, emoji) => {
  try {
    const response = await axios.delete(`${BASE_URL}/messages/${messageId}/reactions`, {
      data: { emoji }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to remove reaction:', error);
    throw new Error(`Failed to remove reaction: ${error.message}`);
  }
};

/**
 * Get detailed reaction information for a message
 * NOTE: This endpoint doesn't exist yet in the current API
 * This is prepared for future API extension
 */
export const getMessageReactions = async (messageId) => {
  try {
    const response = await axios.get(`${BASE_URL}/messages/${messageId}/reactions`);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get message reactions:', error);
    throw new Error(`Failed to get reactions: ${error.message}`);
  }
};

/**
 * Mock function to simulate reaction data for development
 * Remove this when real API is available
 */
export const mockAddReaction = (message, emoji, userId = 'you') => {
  const existingReactions = message.reactions || [];
  const existingReaction = existingReactions.find(r => r.emoji === emoji);
  
  if (existingReaction) {
    // Check if user already reacted with this emoji
    const userAlreadyReacted = existingReaction.participants?.includes(userId);
    
    if (userAlreadyReacted) {
      // Remove user's reaction
      return {
        ...message,
        reactions: existingReactions.map(r =>
          r.emoji === emoji
            ? {
                ...r,
                count: Math.max(0, r.count - 1),
                participants: r.participants?.filter(p => p !== userId) || []
              }
            : r
        ).filter(r => r.count > 0)
      };
    } else {
      // Add user's reaction
      return {
        ...message,
        reactions: existingReactions.map(r =>
          r.emoji === emoji
            ? {
                ...r,
                count: r.count + 1,
                participants: [...(r.participants || []), userId]
              }
            : r
        )
      };
    }
  } else {
    // Add new reaction
    return {
      ...message,
      reactions: [
        ...existingReactions,
        {
          emoji,
          count: 1,
          participants: [userId]
        }
      ]
    };
  }
};