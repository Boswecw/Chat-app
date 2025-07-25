// App.jsx - Complete Updated Version with Fixed Emoji Reactions
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  ActivityIndicator,
  Platform 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// ✅ FIXED: Import updated stores
import useMessageStore from './src/stores/messageStore';
import useParticipantStore from './src/stores/participantStore';
import useSessionStore from './src/stores/sessionStore';

// API Service (you'll need to create/update this)
// import apiService from './src/services/apiService';

// =====================================
// UTILITY FUNCTIONS
// =====================================

// Professional message grouping logic
const shouldGroup = (msg1, msg2) => {
  if (!msg1 || !msg2) return false;
  if (msg1.authorUuid !== msg2.authorUuid) return false;
  
  // 5 minute grouping window
  const getTime = (msg) => {
    const time = msg.sentAt || msg.createdAt;
    return typeof time === 'number' ? time : new Date(time).getTime();
  };
  
  const timeDiff = Math.abs(getTime(msg1) - getTime(msg2));
  return timeDiff < (5 * 60 * 1000); // 5 minutes
};

// Professional border radius for grouped messages
const getGroupedBorderRadius = (position, isOwnMessage) => {
  const normalRadius = 18;
  const reducedRadius = 6;
  
  switch (position) {
    case 'single':
      return { borderRadius: normalRadius };
    case 'first':
      return isOwnMessage ? {
        borderTopLeftRadius: normalRadius,
        borderTopRightRadius: normalRadius,
        borderBottomLeftRadius: normalRadius,
        borderBottomRightRadius: reducedRadius,
      } : {
        borderTopLeftRadius: normalRadius,
        borderTopRightRadius: normalRadius,
        borderBottomLeftRadius: reducedRadius,
        borderBottomRightRadius: normalRadius,
      };
    case 'middle':
      return isOwnMessage ? {
        borderTopLeftRadius: normalRadius,
        borderTopRightRadius: reducedRadius,
        borderBottomLeftRadius: normalRadius,
        borderBottomRightRadius: reducedRadius,
      } : {
        borderTopLeftRadius: reducedRadius,
        borderTopRightRadius: normalRadius,
        borderBottomLeftRadius: reducedRadius,
        borderBottomRightRadius: normalRadius,
      };
    case 'last':
      return isOwnMessage ? {
        borderTopLeftRadius: normalRadius,
        borderTopRightRadius: reducedRadius,
        borderBottomLeftRadius: normalRadius,
        borderBottomRightRadius: normalRadius,
      } : {
        borderTopLeftRadius: reducedRadius,
        borderTopRightRadius: normalRadius,
        borderBottomLeftRadius: normalRadius,
        borderBottomRightRadius: normalRadius,
      };
    default:
      return { borderRadius: normalRadius };
  }
};

// =====================================
// REACTION COMPONENTS
// =====================================

const ReactionBubble = React.memo(({ reaction, onPress }) => (
  <TouchableOpacity
    style={styles.reactionBubble}
    onPress={() => onPress(reaction)}
    activeOpacity={0.7}
  >
    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
    <Text style={styles.reactionCount}>{reaction.count}</Text>
  </TouchableOpacity>
));

const ReactionPicker = React.memo(({ onReact, onClose }) => {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  
  return (
    <View style={styles.reactionPicker}>
      {emojis.map(emoji => (
        <TouchableOpacity
          key={emoji}
          onPress={() => onReact(emoji)}
          style={styles.emojiButton}
          activeOpacity={0.7}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

// =====================================
// MESSAGE COMPONENT
// =====================================

const MessageBubble = React.memo(({ message, grouping, onReact, onReactionPress }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  // ✅ FIXED: Proper participant handling
  const participant = message.participant || { name: 'Unknown User', uuid: 'unknown' };
  const isOwnMessage = participant.uuid === 'you';
  const displayName = participant.name || 'Unknown User';
  
  // ✅ FIXED: Memoized reaction groups to prevent infinite renders
  const reactionGroups = useMemo(() => {
    if (!message.reactions || !Array.isArray(message.reactions) || message.reactions.length === 0) {
      return [];
    }
    
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
  }, [message.reactions]);
  
  const hasReactions = reactionGroups.length > 0;
  
  // Message time formatting
  const messageTime = useMemo(() => {
    const time = message.sentAt || message.createdAt;
    if (!time) return 'Now';
    const date = typeof time === 'number' ? new Date(time) : new Date(time);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.sentAt, message.createdAt]);
  
  // Grouping styles
  const { position, showHeader } = grouping;
  const borderRadiusStyle = getGroupedBorderRadius(position, isOwnMessage);
  
  const handleReact = useCallback((emoji) => {
    onReact(message.uuid, emoji);
    setShowReactionPicker(false);
  }, [message.uuid, onReact]);
  
  const handleReactionPress = useCallback((reaction) => {
    onReactionPress(message.uuid, reaction);
  }, [message.uuid, onReactionPress]);
  
  return (
    <View style={styles.messageContainer}>
      <View style={[
        styles.messageBubble,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        borderRadiusStyle
      ]}>
        {/* Participant name for first message in group */}
        {showHeader && !isOwnMessage && (
          <Text style={styles.messageUser}>{displayName}</Text>
        )}
        
        {/* Message text */}
        <Text style={[
          styles.messageText,
          isOwnMessage ? styles.ownMessageText : styles.otherMessageText
        ]}>
          {message.text || ''}
        </Text>
        
        {/* Edited indicator */}
        {message.editedAt && (
          <Text style={[
            styles.editedText,
            isOwnMessage ? styles.editedTextOwn : styles.editedTextOther
          ]}>
            (edited)
          </Text>
        )}
        
        {/* Time stamp */}
        {showHeader && (
          <Text style={[
            styles.timeText,
            isOwnMessage ? styles.timeTextOwn : styles.timeTextOther
          ]}>
            {messageTime}
          </Text>
        )}
      </View>
      
      {/* ✅ FIXED: Reactions display with proper grouping */}
      {hasReactions && (
        <View style={[
          styles.reactionsContainer,
          isOwnMessage ? styles.reactionsContainerOwn : styles.reactionsContainerOther
        ]}>
          {reactionGroups.map((reaction, index) => (
            <ReactionBubble
              key={`${reaction.emoji}-${index}`}
              reaction={reaction}
              onPress={handleReactionPress}
            />
          ))}
        </View>
      )}
      
      {/* Reaction picker */}
      {showReactionPicker && (
        <ReactionPicker
          onReact={handleReact}
          onClose={() => setShowReactionPicker(false)}
        />
      )}
      
      {/* Add reaction button */}
      <TouchableOpacity
        onPress={() => setShowReactionPicker(!showReactionPicker)}
        style={[
          styles.addReactionButton,
          isOwnMessage ? styles.addReactionButtonOwn : styles.addReactionButtonOther
        ]}
        activeOpacity={0.7}
      >
        <Text style={styles.addReactionText}>+</Text>
      </TouchableOpacity>
    </View>
  );
});

// =====================================
// MAIN APP COMPONENT
// =====================================

export default function App() {
  // Local UI state
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // ✅ FIXED: Zustand stores with proper selectors
  const messages = useMessageStore(state => state.messages);
  const messagesLoading = useMessageStore(state => state.loading);
  const messagesError = useMessageStore(state => state.error);
  const addReaction = useMessageStore(state => state.addReaction); // ✅ NEW
  
  const participants = useParticipantStore(state => state.participants);
  const getParticipantName = useParticipantStore(state => state.getParticipantName);
  
  const connected = useSessionStore(state => state.connected);
  const sessionUuid = useSessionStore(state => state.sessionUuid);

  // ✅ Memoized message grouping
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    return messages.map((message, index) => {
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
      const prevMessage = index > 0 ? messages[index - 1] : null;
      
      const groupWithNext = shouldGroup(message, nextMessage);
      const groupWithPrev = shouldGroup(message, prevMessage);
      
      let position = 'single';
      if (groupWithNext && groupWithPrev) position = 'middle';
      else if (groupWithNext) position = 'first';
      else if (groupWithPrev) position = 'last';
      
      return {
        ...message,
        grouping: {
          position,
          showHeader: !groupWithPrev,
          showTail: !groupWithNext,
          isGrouped: groupWithNext || groupWithPrev,
        }
      };
    });
  }, [messages]);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setInitializing(true);
      useMessageStore.getState().setLoading(true);
      
      // ✅ Mock initialization - replace with your API service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock session data
      useSessionStore.setState({
        sessionUuid: 'mock-session-123',
        apiVersion: 1,
        connected: true,
        lastConnectedAt: Date.now(),
      });

      // Mock participants
      useParticipantStore.getState().setParticipants({
        'you': { uuid: 'you', name: 'You' },
        'user1': { uuid: 'user1', name: 'Alice' },
        'user2': { uuid: 'user2', name: 'Bob' },
      });

      // Mock messages with reactions
      const mockMessages = [
        {
          uuid: 'msg-1',
          text: 'Hello everyone! 👋',
          authorUuid: 'user1',
          participant: { uuid: 'user1', name: 'Alice' },
          createdAt: Date.now() - 300000,
          reactions: [
            { emoji: '👍', count: 2, participants: ['you', 'user2'] },
            { emoji: '❤️', count: 1, participants: ['user2'] }
          ]
        },
        {
          uuid: 'msg-2',
          text: 'How is everyone doing today?',
          authorUuid: 'user1',
          participant: { uuid: 'user1', name: 'Alice' },
          createdAt: Date.now() - 240000,
          reactions: []
        },
        {
          uuid: 'msg-3',
          text: 'Great! Thanks for asking 😊',
          authorUuid: 'you',
          participant: { uuid: 'you', name: 'You' },
          createdAt: Date.now() - 180000,
          reactions: [
            { emoji: '👍', count: 1, participants: ['user1'] }
          ]
        }
      ];

      useMessageStore.getState().setMessages(mockMessages);

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      useSessionStore.setState({ connected: false });
      useMessageStore.getState().setError(error.message);
    } finally {
      setInitializing(false);
      useMessageStore.getState().setLoading(false);
    }
  };

  // ✅ FIXED: Message sending with proper error handling
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);
    
    try {
      // Create optimistic message
      const optimisticMessage = {
        uuid: `temp-${Date.now()}`,
        text: messageText,
        authorUuid: 'you',
        participant: { uuid: 'you', name: 'You' },
        createdAt: Date.now(),
        sentAt: Date.now(),
        status: 'sending',
        reactions: []
      };

      useMessageStore.getState().addMessage(optimisticMessage);

      // ✅ Mock API call - replace with your actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update with server message
      const serverMessage = {
        ...optimisticMessage,
        uuid: `msg-${Date.now()}`,
        status: 'sent'
      };

      useMessageStore.getState().removeMessage(optimisticMessage.uuid);
      useMessageStore.getState().addMessage(serverMessage);

    } catch (error) {
      console.error('Failed to send message:', error);
      useMessageStore.getState().setError('Failed to send message');
      Alert.alert('Send Failed', 'Could not send message. Please try again.');
      setInputText(messageText); // Restore text on error
    } finally {
      setSending(false);
    }
  }, [inputText, sending]);

  // ✅ FIXED: Emoji reaction handlers
  const handleReact = useCallback((messageUuid, emoji) => {
    try {
      addReaction(messageUuid, emoji, 'you');
    } catch (error) {
      console.error('Failed to add reaction:', error);
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
    }
  }, [addReaction]);

  const handleReactionPress = useCallback((messageUuid, reaction) => {
    console.log('Reaction pressed:', { messageUuid, reaction });
    // TODO: Show reaction details bottom sheet
    Alert.alert(
      'Reaction Details',
      `${reaction.emoji} - ${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}`
    );
  }, []);

  // ✅ Memoized render functions for performance
  const renderMessage = useCallback(({ item }) => (
    <MessageBubble
      message={item}
      grouping={item.grouping}
      onReact={handleReact}
      onReactionPress={handleReactionPress}
    />
  ), [handleReact, handleReactionPress]);

  const keyExtractor = useCallback((item) => item.uuid, []);

  // Loading state
  if (initializing || messagesLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat App</Text>
          <Text style={styles.headerSubtitle}>
            {connected ? 'Online' : 'Offline'} • {messages.length} messages
          </Text>
        </View>

        {/* Error Banner */}
        {messagesError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {messagesError}</Text>
            <TouchableOpacity 
              onPress={() => useMessageStore.getState().clearError()} 
              style={styles.dismissButton}
            >
              <Text style={styles.dismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Messages List */}
        <FlatList
          data={groupedMessages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          inverted={true}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          getItemLayout={null} // Let FlatList calculate heights
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              multiline={true}
              maxLength={1000}
              editable={!sending}
              blurOnSubmit={false}
            />
            <TouchableOpacity 
              onPress={sendMessage} 
              style={[
                styles.sendButton, 
                (sending || !inputText.trim()) && styles.sendButtonDisabled
              ]}
              disabled={sending || !inputText.trim()}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.sendButtonText}>→</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#FFCDD2',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    flex: 1,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 2,
    position: 'relative',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
  },
  ownMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    marginRight: 16,
  },
  otherMessage: {
    backgroundColor: '#E9ECEF',
    alignSelf: 'flex-start',
    marginLeft: 16,
  },
  messageUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#000000',
  },
  editedText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  editedTextOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  editedTextOther: {
    color: '#666666',
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  timeTextOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeTextOther: {
    color: '#666666',
  },
  
  // ✅ REACTION STYLES
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginHorizontal: 8,
    gap: 6,
  },
  reactionsContainerOwn: {
    justifyContent: 'flex-end',
    marginRight: 16,
  },
  reactionsContainerOther: {
    justifyContent: 'flex-start',
    marginLeft: 16,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  reactionPicker: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emojiButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 16,
  },
  emoji: {
    fontSize: 20,
  },
  addReactionButton: {
    position: 'absolute',
    top: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addReactionButtonOwn: {
    right: -8,
  },
  addReactionButtonOther: {
    left: -8,
  },
  addReactionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
  },
  
  // INPUT STYLES
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
    color: '#000000',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});