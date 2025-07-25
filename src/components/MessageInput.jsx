// Enhanced MessageBubble.jsx - Clean version that passes ESLint
import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  AccessibilityInfo 
} from 'react-native';
import Avatar from './Avatar';
import ReactionRow from './ReactionRow';
import { formatTime } from '../../src_backup/utils/formatDate';

const MessageBubble = ({ message, isGrouped, onReact, onReactionPress, onParticipantPress }) => {
  const [showReactionRow, setShowReactionRow] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const participant = message.participant;
  const displayName = participant?.name || 'Unknown';
  const hasReactions = message.reactions && message.reactions.length > 0;
  
  // Check if this is the current user's message
  const isOwnMessage = participant?.uuid === 'you';
  
  // ✅ NEW: Check if message is still being sent or is temporary
  const isMessageSending = message.status === 'sending' || message.uuid?.startsWith('temp-');
  const reactionsDisabled = isMessageSending;

  // Memoize formatted time to prevent recalculation
  const formattedTime = useMemo(() => formatTime(message.createdAt), [message.createdAt]);
  
  // Memoize accessibility label
  const accessibilityLabel = useMemo(() => {
    let label = `Message from ${displayName}, sent at ${formattedTime}: ${message.text}`;
    if (message.editedAt) label += ' (edited)';
    if (hasReactions) label += ` with ${message.reactions.length} reactions`;
    return label;
  }, [displayName, formattedTime, message.text, message.editedAt, hasReactions, message.reactions]);

  const handleReact = useCallback(async (emoji) => {
    try {
      if (onReact) {
        await onReact(message.uuid, emoji);
        AccessibilityInfo.announceForAccessibility(`Added ${emoji} reaction`);
      }
      setShowReactionRow(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
      AccessibilityInfo.announceForAccessibility('Failed to add reaction');
    }
  }, [onReact, message.uuid]);

  const handleReactionPress = useCallback((reaction) => {
    if (onReactionPress) {
      onReactionPress(message.uuid, reaction);
    }
  }, [onReactionPress, message.uuid]);

  const handleParticipantPress = useCallback(() => {
    if (onParticipantPress && participant) {
      onParticipantPress(participant);
    }
  }, [onParticipantPress, participant]);

  const toggleReactionRow = useCallback(() => {
    // ✅ NEW: Prevent opening reactions on sending messages
    if (reactionsDisabled) {
      Alert.alert(
        'Message Still Sending', 
        'Please wait for the message to be sent before adding reactions.'
      );
      return;
    }

    setShowReactionRow(prev => {
      const newState = !prev;
      AccessibilityInfo.announceForAccessibility(
        newState ? 'Reaction options shown' : 'Reaction options hidden'
      );
      return newState;
    });
  }, [reactionsDisabled]);

  const handleImagePress = useCallback(() => {
    console.log('Image pressed:', message.image);
    AccessibilityInfo.announceForAccessibility('Opening image preview');
    // TODO: Implement image preview modal
  }, [message.image]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    AccessibilityInfo.announceForAccessibility('Failed to load image');
  }, []);

  return (
    <View 
      style={[
        styles.container,
        isGrouped ? styles.containerGrouped : styles.containerNotGrouped,
        isOwnMessage && styles.containerOwn
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      {!isGrouped && (
        <View style={styles.header}>
          <TouchableOpacity onPress={handleParticipantPress}>
            <Avatar participant={participant} size={32} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleParticipantPress}>
            <Text 
              style={styles.name}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`Message from ${displayName}`}
            >
              {displayName}
            </Text>
          </TouchableOpacity>
          <Text 
            style={styles.time}
            accessible={true}
            accessibilityLabel={`Sent at ${formattedTime}`}
          >
            {formattedTime}
          </Text>
        </View>
      )}

      <View style={[
        styles.bubble,
        isOwnMessage && styles.bubbleOwn
      ]}>
        <Text 
          style={[
            styles.text,
            isOwnMessage && styles.textOwn
          ]}
          selectable={true}
          accessible={true}
          accessibilityRole="text"
        >
          {message.text}
        </Text>
        
        {message.image && (
          <TouchableOpacity 
            onPress={handleImagePress} 
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="View image attachment"
            accessibilityHint="Double tap to open image preview"
          >
            <Image 
              source={{ uri: message.image }} 
              style={styles.image}
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
              accessible={true}
              accessibilityIgnoresInvertColors={true}
            />
            {imageLoading && (
              <View style={styles.imageLoadingOverlay}>
                <Text style={styles.imageLoadingText}>Loading...</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {message.editedAt && (
          <Text 
            style={styles.edited}
            accessible={true}
            accessibilityLabel="This message was edited"
          >
            (edited)
          </Text>
        )}

        {/* Display existing reactions */}
        {hasReactions && (
          <View 
            style={styles.existingReactions}
            accessible={true}
            accessibilityLabel={`${message.reactions.length} reactions on this message`}
          >
            {message.reactions.map((reaction, index) => (
              <TouchableOpacity
                key={`${reaction.emoji}-${index}`}
                style={[
                  styles.reactionBubble,
                  reaction.isOwnReaction && styles.reactionBubbleActive
                ]}
                onPress={() => handleReactionPress(reaction)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${reaction.emoji} reaction, ${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}`}
                accessibilityHint="Double tap to see who reacted"
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                <Text style={[
                  styles.reactionCount,
                  reaction.isOwnReaction && styles.reactionCountActive
                ]}>
                  {reaction.count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ✅ ENHANCED: Add reaction button with disabled state */}
        <TouchableOpacity 
          style={[
            styles.addReactionButton,
            reactionsDisabled && styles.addReactionButtonDisabled
          ]}
          onPress={toggleReactionRow}
          activeOpacity={reactionsDisabled ? 1 : 0.7}
          disabled={reactionsDisabled}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={
            reactionsDisabled 
              ? "Reactions disabled while message is sending"
              : (showReactionRow ? "Hide reaction options" : "Show reaction options")
          }
          accessibilityHint={
            reactionsDisabled 
              ? "This message is still being sent"
              : "Double tap to toggle reaction options"
          }
        >
          <Text style={[
            styles.addReactionText,
            reactionsDisabled && styles.addReactionTextDisabled
          ]}>
            {reactionsDisabled ? '⏳' : (showReactionRow ? '✕' : '😊+')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reaction row for adding new reactions */}
      {showReactionRow && !reactionsDisabled && (
        <View style={styles.reactionRowContainer}>
          <ReactionRow onReact={handleReact} />
        </View>
      )}

      {/* Reply to message functionality */}
      {message.replyToMessage && (
        <View 
          style={styles.replyToContainer}
          accessible={true}
          accessibilityLabel={`Replying to ${message.replyToMessage.participant?.name || 'Unknown'}: ${message.replyToMessage.text}`}
        >
          <View style={styles.replyToLine} />
          <View style={styles.replyToContent}>
            <Text style={styles.replyToLabel}>
              Replying to {message.replyToMessage.participant?.name || 'Unknown'}
            </Text>
            <Text style={styles.replyToText} numberOfLines={2}>
              {message.replyToMessage.text}
            </Text>
          </View>
        </View>
      )}

      {/* Message status indicator */}
      {message.status && message.status !== 'sent' && (
        <View style={styles.statusContainer}>
          <Text 
            style={[
              styles.statusText, 
              message.status === 'failed' && styles.statusFailed,
              message.status === 'sending' && styles.statusSending
            ]}
            accessible={true}
            accessibilityLabel={`Message status: ${message.status}`}
          >
            {message.status === 'sending' && '⏳ Sending...'}
            {message.status === 'failed' && '❌ Failed to send'}
            {message.status === 'deleted' && '🗑️ Deleted'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    width: '100%',
  },
  
  containerGrouped: {
    marginTop: 2,
  },
  
  containerNotGrouped: {
    marginTop: 12,
  },
  
  containerOwn: {
    alignItems: 'flex-end',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
    width: '100%',
  },
  
  name: {
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
    color: '#333',
  },
  
  time: {
    marginLeft: 'auto',
    fontSize: 10,
    color: '#888',
  },
  
  bubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 12,
    position: 'relative',
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  
  bubbleOwn: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  
  textOwn: {
    color: '#FFFFFF',
  },
  
  edited: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  
  image: {
    marginTop: 8,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  
  imageLoadingOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  imageLoadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  existingReactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  
  reactionBubbleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  
  reactionEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1976d2',
  },
  
  reactionCountActive: {
    color: '#FFFFFF',
  },
  
  addReactionButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  // ✅ NEW: Disabled button styles
  addReactionButtonDisabled: {
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    borderColor: '#ccc',
  },
  
  addReactionText: {
    fontSize: 12,
    color: '#666',
  },
  
  // ✅ NEW: Disabled text styles
  addReactionTextDisabled: {
    color: '#999',
  },
  
  reactionRowContainer: {
    marginTop: 8,
    marginLeft: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  replyToContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  
  replyToLine: {
    width: 3,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginRight: 8,
  },
  
  replyToContent: {
    flex: 1,
  },
  
  replyToLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  
  replyToText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  
  statusContainer: {
    marginTop: 4,
    alignItems: 'flex-end',
  },
  
  statusText: {
    fontSize: 10,
    color: '#888',
  },
  
  statusFailed: {
    color: '#dc3545',
  },
  
  statusSending: {
    color: '#6c757d',
  },
});

export default React.memo(MessageBubble);