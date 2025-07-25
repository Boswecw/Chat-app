import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

const MessageBubble = ({ message, onReact, onReactionPress }) => {
  const [showReactionRow, setShowReactionRow] = useState(false);
  
  // ✅ FIXED: Proper hasReactions computation with multiple checks
  const hasReactions = useMemo(() => {
    return Boolean(
      message.reactions && 
      Array.isArray(message.reactions) && 
      message.reactions.length > 0
    );
  }, [message.reactions]);
  
  // ✅ FIXED: Memoized reaction groups to prevent infinite renders
  const reactionGroups = useMemo(() => {
    if (!hasReactions) return [];
    
    const reactionMap = new Map();
    
    message.reactions.forEach(reaction => {
      const emoji = reaction.emoji || reaction.type || '👍';
      const count = reaction.count || 1;
      const participants = reaction.participants || [];
      
      if (reactionMap.has(emoji)) {
        const existing = reactionMap.get(emoji);
        reactionMap.set(emoji, {
          emoji,
          count: existing.count + count,
          participants: [...existing.participants, ...participants]
        });
      } else {
        reactionMap.set(emoji, {
          emoji,
          count,
          participants: [...participants]
        });
      }
    });
    
    return Array.from(reactionMap.values()).filter(r => r.count > 0);
  }, [message.reactions, hasReactions]);
  
  const handleReact = useCallback(async (emoji) => {
    try {
      if (onReact) {
        await onReact(message.uuid, emoji);
      }
      setShowReactionRow(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
    }
  }, [onReact, message.uuid]);
  
  const handleReactionPress = useCallback((reaction) => {
    if (onReactionPress) {
      onReactionPress(message.uuid, reaction);
    }
  }, [onReactionPress, message.uuid]);
  
  return (
    <View style={styles.container}>
      {/* Message content */}
      <View style={styles.bubble}>
        <Text style={styles.text}>{message.text}</Text>
      </View>
      
      {/* ✅ FIXED: Reactions display with proper grouping */}
      {hasReactions && (
        <View style={styles.reactionsContainer}>
          {reactionGroups.map((reaction, index) => (
            <TouchableOpacity
              key={`${reaction.emoji}-${index}`}
              style={styles.reactionBubble}
              onPress={() => handleReactionPress(reaction)}
            >
              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              <Text style={styles.reactionCount}>{reaction.count}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Reaction picker */}
      {showReactionRow && (
        <View style={styles.reactionPicker}>
          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleReact(emoji)}
              style={styles.emojiButton}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Add reaction button */}
      <TouchableOpacity
        onPress={() => setShowReactionRow(!showReactionRow)}
        style={styles.addReactionButton}
      >
        <Text>+</Text>
      </TouchableOpacity>
    </View>
  );
};