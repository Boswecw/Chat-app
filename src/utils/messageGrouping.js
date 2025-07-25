// src/utils/messageGrouping.js
/**
 * Message grouping utilities for creating WhatsApp-style grouped messages
 */

const TIME_GROUP_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Determines if two messages should be grouped together
 */
export const shouldGroupMessages = (currentMessage, previousMessage) => {
  if (!currentMessage || !previousMessage) return false;
  
  // Different authors = no grouping
  if (currentMessage.authorUuid !== previousMessage.authorUuid) return false;
  
  // Get timestamps
  const currentTime = new Date(currentMessage.sentAt || currentMessage.createdAt).getTime();
  const previousTime = new Date(previousMessage.sentAt || previousMessage.createdAt).getTime();
  
  // Too much time between messages = no grouping
  const timeDiff = Math.abs(currentTime - previousTime);
  if (timeDiff > TIME_GROUP_THRESHOLD) return false;
  
  return true;
};

/**
 * Processes messages array and adds grouping metadata
 */
export const processMessagesForGrouping = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  
  return messages.map((message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    // Determine grouping position
    const isGroupedWithPrevious = shouldGroupMessages(message, previousMessage);
    const isGroupedWithNext = shouldGroupMessages(nextMessage, message);
    
    let groupPosition = 'single'; // single, first, middle, last
    
    if (isGroupedWithPrevious && isGroupedWithNext) {
      groupPosition = 'middle';
    } else if (isGroupedWithPrevious && !isGroupedWithNext) {
      groupPosition = 'last';
    } else if (!isGroupedWithPrevious && isGroupedWithNext) {
      groupPosition = 'first';
    } else {
      groupPosition = 'single';
    }
    
    return {
      ...message,
      grouping: {
        position: groupPosition,
        showHeader: !isGroupedWithPrevious, // Show name/avatar only if not grouped with previous
        showTail: !isGroupedWithNext, // Show timestamp only if not grouped with next
        isGrouped: isGroupedWithPrevious || isGroupedWithNext,
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
    case 'first':
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
    case 'last':
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