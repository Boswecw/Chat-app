// src/utils/messageGrouping.js
/**
 * Message grouping utilities for creating WhatsApp-style grouped messages
 */

const TIME_GROUP_THRESHOLD = 10 * 60 * 1000; // 10 minutes in milliseconds (increased for easier testing)

/**
 * Determines if two messages should be grouped together
 */
export const shouldGroupMessages = (currentMessage, previousMessage) => {
  if (!currentMessage || !previousMessage) return false;
  
  // Different authors = no grouping
  if (currentMessage.authorUuid !== previousMessage.authorUuid) return false;
  
  // Get timestamps - handle both sentAt and createdAt
  const getCurrentTime = (msg) => {
    const time = msg.sentAt || msg.createdAt;
    if (!time) return Date.now(); // Fallback to now
    return typeof time === 'number' ? time : new Date(time).getTime();
  };
  
  const currentTime = getCurrentTime(currentMessage);
  const previousTime = getCurrentTime(previousMessage);
  
  // Too much time between messages = no grouping
  const timeDiff = Math.abs(currentTime - previousTime);
  if (timeDiff > TIME_GROUP_THRESHOLD) return false;
  
  return true;
};

/**
 * Processes messages array and adds grouping metadata
 * Handles inverted message order (newest first) correctly
 */
export const processMessagesForGrouping = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  
  // Since messages are in reverse chronological order (newest first),
  // we need to reverse the logic for grouping
  return messages.map((message, index) => {
    // In inverted order: "previous" is actually newer, "next" is actually older
    const newerMessage = index > 0 ? messages[index - 1] : null;
    const olderMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    // For grouping, we want to group with chronologically adjacent messages
    // In the inverted array, we group "down" toward older messages
    const isGroupedWithNewer = shouldGroupMessages(message, newerMessage);
    const isGroupedWithOlder = shouldGroupMessages(olderMessage, message);
    
    let groupPosition = 'single'; // single, first, middle, last
    
    if (isGroupedWithNewer && isGroupedWithOlder) {
      groupPosition = 'middle';
    } else if (isGroupedWithNewer && !isGroupedWithOlder) {
      groupPosition = 'first'; // First chronologically = last in group visually
    } else if (!isGroupedWithNewer && isGroupedWithOlder) {
      groupPosition = 'last'; // Last chronologically = first in group visually  
    } else {
      groupPosition = 'single';
    }
    
    return {
      ...message,
      grouping: {
        position: groupPosition,
        showHeader: !isGroupedWithOlder, // Show name only on oldest in group (first visually)
        showTail: !isGroupedWithNewer, // Show time only on newest in group (last visually)
        isGrouped: isGroupedWithNewer || isGroupedWithOlder,
      }
    };
  });
};

/**
 * Get appropriate styling for message bubble based on grouping
 */
export const getGroupedMessageStyle = (groupPosition, isOwnMessage) => {
  const baseStyle = {
    marginVertical: 2, // Reduced spacing for grouped messages
  };
  
  const positions = {
    single: {
      marginVertical: 8, // Normal spacing for single messages
    },
    first: {
      marginBottom: 2,
      marginTop: 8,
    },
    middle: {
      marginVertical: 1, // Minimal spacing between grouped messages
    },
    last: {
      marginTop: 2,
      marginBottom: 8,
    }
  };
  
  return {
    ...baseStyle,
    ...positions[groupPosition],
  };
};

/**
 * Get appropriate border radius for grouped messages
 * Updated to work with corrected grouping positions for inverted display
 */
export const getGroupedBorderRadius = (groupPosition, isOwnMessage) => {
  const normalRadius = 12;
  const reducedRadius = 4;
  
  const side = isOwnMessage ? 'right' : 'left';
  
  switch (groupPosition) {
    case 'single':
      return {
        borderRadius: normalRadius,
      };
    case 'first': // First in group (visually last chronologically)
      return side === 'left' ? {
        borderTopLeftRadius: normalRadius,
        borderTopRightRadius: normalRadius,
        borderBottomLeftRadius: reducedRadius,
        borderBottomRightRadius: normalRadius,
      } : {
        borderTopLeftRadius: normalRadius,
        borderTopRightRadius: normalRadius,
        borderBottomLeftRadius: normalRadius,
        borderBottomRightRadius: reducedRadius,
      };
    case 'middle':
      return side === 'left' ? {
        borderTopLeftRadius: reducedRadius,
        borderTopRightRadius: normalRadius,
        borderBottomLeftRadius: reducedRadius,
        borderBottomRightRadius: normalRadius,
      } : {
        borderTopLeftRadius: normalRadius,
        borderTopRightRadius: reducedRadius,
        borderBottomLeftRadius: normalRadius,
        borderBottomRightRadius: reducedRadius,
      };
    case 'last': // Last in group (visually first chronologically)
      return side === 'left' ? {
        borderTopLeftRadius: reducedRadius,
        borderTopRightRadius: normalRadius,
        borderBottomLeftRadius: normalRadius,
        borderBottomRightRadius: normalRadius,
      } : {
        borderTopLeftRadius: normalRadius,
        borderTopRightRadius: reducedRadius,
        borderBottomLeftRadius: normalRadius,
        borderBottomRightRadius: normalRadius,
      };
    default:
      return { borderRadius: normalRadius };
  }
};