// src/components/MessageBubble.jsx
import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import dayjs from 'dayjs';
import colors from '../constants/colors';

const MessageBubble = memo(({
  message,
  participant,
  isOwnMessage,
  showHeader,
  isGrouped,
  onLongPress,
  onReactionPress,
}) => {
  const renderAvatar = () => {
    if (isGrouped && !showHeader) return <View style={styles.avatarSpacer} />;
    
    return (
      <View style={[styles.avatar, isOwnMessage && styles.avatarOwn]}>
        <Text style={styles.avatarText}>
          {(participant?.name || 'U')[0].toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    // Group reactions by emoji
    const reactionGroups = message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          participants: [],
        };
      }
      acc[reaction.emoji].count++;
      acc[reaction.emoji].participants.push(reaction.participant);
      return acc;
    }, {});

    return (
      <View style={[
        styles.reactionsContainer,
        isOwnMessage ? styles.reactionsContainerOwn : styles.reactionsContainerOther,
      ]}>
        {Object.values(reactionGroups).map((group, index) => (
          <TouchableOpacity
            key={`${group.emoji}-${index}`}
            style={styles.reactionBubble}
            onPress={() => onReactionPress && onReactionPress(group)}
          >
            <Text style={styles.reactionEmoji}>{group.emoji}</Text>
            {group.count > 1 && (
              <Text style={styles.reactionCount}>{group.count}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, isGrouped && styles.containerGrouped]}>
      <View style={[styles.messageRow, isOwnMessage && styles.messageRowOwn]}>
        {!isOwnMessage && renderAvatar()}
        
        <TouchableOpacity
          onLongPress={() => onLongPress && onLongPress(message)}
          style={[
            styles.bubble,
            isOwnMessage ? styles.bubbleOwn : styles.bubbleOther,
            isGrouped && (showHeader ? styles.bubbleGroupedFirst : styles.bubbleGroupedMiddle),
          ]}
          activeOpacity={0.7}
        >
          {showHeader && !isOwnMessage && (
            <Text style={styles.authorName}>{participant?.name || 'Unknown'}</Text>
          )}
          
          {/* Reply preview if exists */}
          {message.replyToMessage && (
            <View style={styles.replyContainer}>
              <Text style={styles.replyAuthor}>
                {message.replyToMessage.participant?.name || 'Unknown'}
              </Text>
              <Text style={styles.replyText} numberOfLines={2}>
                {message.replyToMessage.text}
              </Text>
            </View>
          )}
          
          {/* Message text */}
          <Text style={[
            styles.messageText,
            isOwnMessage && styles.messageTextOwn,
          ]}>
            {message.text}
          </Text>
          
          {/* Image attachment */}
          {message.attachments && message.attachments[0]?.type === 'image' && (
            <Image
              source={{ uri: message.attachments[0].url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          
          {/* Time and edited indicator */}
          <View style={styles.messageFooter}>
            <Text style={[
              styles.timeText,
              isOwnMessage && styles.timeTextOwn,
            ]}>
              {dayjs(message.createdAt).format('HH:mm')}
            </Text>
            {message.editedAt && (
              <Text style={[
                styles.editedText,
                isOwnMessage && styles.editedTextOwn,
              ]}>
                {' • edited'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        
        {isOwnMessage && renderAvatar()}
      </View>
      
      {renderReactions()}
    </View>
  );
});

MessageBubble.displayName = 'MessageBubble';

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
  },
  containerGrouped: {
    marginVertical: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  
  // Avatar styles
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  avatarOwn: {
    backgroundColor: colors.textMuted,
  },
  avatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarSpacer: {
    width: 52, // 36 + 8 + 8 margins
  },
  
  // Bubble styles
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
  },
  bubbleGroupedFirst: {
    borderBottomLeftRadius: 8,
  },
  bubbleGroupedMiddle: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  
  // Text styles
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: colors.text,
  },
  messageTextOwn: {
    color: 'white',
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  timeTextOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  editedText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  editedTextOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  
  // Footer
  messageFooter: {
    flexDirection: 'row',
    marginTop: 4,
  },
  
  // Reply styles
  replyContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 8,
    borderRadius: 4,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  
  // Image styles
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginTop: 8,
  },
  
  // Reactions
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginHorizontal: 8,
  },
  reactionsContainerOwn: {
    justifyContent: 'flex-end',
  },
  reactionsContainerOther: {
    marginLeft: 52,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 12,
    marginLeft: 4,
    color: colors.text,
    fontWeight: '600',
  },
});

export default MessageBubble;