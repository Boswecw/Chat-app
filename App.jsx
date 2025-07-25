// App.jsx - Final Production Version with All Features
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
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Image,
  RefreshControl
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// ✅ ALL IMPORTS - Stores, Services, Components, Hooks
import useMessageStore from './src/stores/messageStore';
import useParticipantStore from './src/stores/participantStore';
import useSessionStore from './src/stores/sessionStore';
import apiService from './src/services/apiService';
import { useRealtimeUpdates, useConnectionMonitor } from './src/hooks/useRealtimeUpdates';

// Enhanced Components
import { 
  MessagesListSkeleton, 
  TypingIndicator, 
  LoadingOverlay,
  EmptyMessagesState,
  ConnectionErrorState,
  SendingMessageIndicator
} from './src/components/LoadingStates';
import { ReactionDetailsSheet } from './src/components/ReactionDetailsSheet';
import { MessageSearch } from './src/components/MessageSearch';

// =====================================
// UTILITY FUNCTIONS
// =====================================

const shouldGroup = (msg1, msg2) => {
  if (!msg1 || !msg2) return false;
  if (msg1.authorUuid !== msg2.authorUuid) return false;
  
  const getTime = (msg) => {
    const time = msg.sentAt || msg.createdAt;
    return typeof time === 'number' ? time : new Date(time).getTime();
  };
  
  const timeDiff = Math.abs(getTime(msg1) - getTime(msg2));
  return timeDiff < (5 * 60 * 1000);
};

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
// ENHANCED COMPONENTS
// =====================================

const Avatar = React.memo(({ participant, size = 32 }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (uuid) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const index = uuid ? uuid.length % colors.length : 0;
    return colors[index];
  };

  return (
    <View style={[
      styles.avatar, 
      { 
        width: size, 
        height: size, 
        backgroundColor: getAvatarColor(participant?.uuid),
        borderRadius: size / 2 
      }
    ]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
        {getInitials(participant?.name)}
      </Text>
    </View>
  );
});

const ReactionBubble = React.memo(({ reaction, onPress, isOwnReaction = false }) => (
  <TouchableOpacity
    style={[
      styles.reactionBubble,
      isOwnReaction && styles.reactionBubbleActive
    ]}
    onPress={() => onPress(reaction)}
    activeOpacity={0.7}
  >
    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
    <Text style={[
      styles.reactionCount,
      isOwnReaction && styles.reactionCountActive
    ]}>
      {reaction.count}
    </Text>
  </TouchableOpacity>
));

const ReactionPicker = React.memo(({ onReact, onClose, visible }) => {
  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];
  
  if (!visible) return null;
  
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
// ENHANCED MESSAGE COMPONENT
// =====================================

const MessageBubble = React.memo(({ 
  message, 
  grouping, 
  onReact, 
  onReactionPress, 
  onImagePress,
  onLongPress 
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  
  const participant = message.participant || { name: 'Unknown User', uuid: 'unknown' };
  const isOwnMessage = participant.uuid === 'you';
  const displayName = participant.name || 'Unknown User';
  const isMessageSending = message.status === 'sending' || message.uuid?.startsWith('temp-');
  
  // ✅ Memoized reaction groups
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
          participants: [...existing.participants, ...participants],
          isOwnReaction: existing.isOwnReaction || participants.includes('you')
        });
      } else {
        reactionMap.set(emoji, {
          emoji,
          count,
          participants: [...participants],
          isOwnReaction: participants.includes('you')
        });
      }
    });
    
    return Array.from(reactionMap.values()).filter(r => r.count > 0);
  }, [message.reactions]);
  
  const hasReactions = reactionGroups.length > 0;
  
  const messageTime = useMemo(() => {
    const time = message.sentAt || message.createdAt;
    if (!time) return 'Now';
    const date = typeof time === 'number' ? new Date(time) : new Date(time);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.sentAt, message.createdAt]);
  
  const { position, showHeader } = grouping;
  const borderRadiusStyle = getGroupedBorderRadius(position, isOwnMessage);
  
  const handleReact = useCallback((emoji) => {
    if (isMessageSending) {
      Alert.alert('Message Sending', 'Please wait for the message to be sent before adding reactions.');
      return;
    }
    onReact(message.uuid, emoji);
    setShowReactionPicker(false);
  }, [message.uuid, onReact, isMessageSending]);
  
  const handleReactionPress = useCallback((reaction) => {
    onReactionPress(message, reaction);
  }, [message, onReactionPress]);

  const handleImagePress = useCallback(() => {
    if (message.attachments?.[0]?.url && onImagePress) {
      onImagePress(message.attachments[0].url);
    }
  }, [message.attachments, onImagePress]);

  const handleLongPress = useCallback(() => {
    onLongPress?.(message);
  }, [message, onLongPress]);

  const toggleReactionPicker = useCallback(() => {
    if (isMessageSending) {
      Alert.alert('Message Sending', 'Please wait for the message to be sent before adding reactions.');
      return;
    }
    setShowReactionPicker(prev => !prev);
  }, [isMessageSending]);
  
  return (
    <TouchableOpacity
      style={styles.messageContainer}
      onLongPress={handleLongPress}
      activeOpacity={1}
      delayLongPress={500}
    >
      <View style={[
        styles.messageRow,
        isOwnMessage ? styles.messageRowOwn : styles.messageRowOther
      ]}>
        {!isOwnMessage && showHeader && (
          <Avatar participant={participant} size={32} />
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          borderRadiusStyle,
          isMessageSending && styles.messageSending
        ]}>
          {showHeader && !isOwnMessage && (
            <Text style={styles.messageUser}>{displayName}</Text>
          )}
          
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.text || ''}
          </Text>

          {message.attachments?.[0]?.type === 'image' && (
            <TouchableOpacity 
              onPress={handleImagePress}
              style={styles.imageContainer}
              activeOpacity={0.8}
            >
              <Image 
                source={{ uri: message.attachments[0].url }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          
          {message.editedAt && (
            <Text style={[
              styles.editedText,
              isOwnMessage ? styles.editedTextOwn : styles.editedTextOther
            ]}>
              (edited)
            </Text>
          )}
          
          {showHeader && (
            <Text style={[
              styles.timeText,
              isOwnMessage ? styles.timeTextOwn : styles.timeTextOther
            ]}>
              {messageTime}
            </Text>
          )}

          {isMessageSending && (
            <View style={styles.sendingIndicator}>
              <ActivityIndicator size="small" color={isOwnMessage ? "#FFFFFF80" : "#00000080"} />
            </View>
          )}
        </View>

        {isOwnMessage && <View style={styles.avatarSpacer} />}
      </View>
      
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
              isOwnReaction={reaction.isOwnReaction}
            />
          ))}
        </View>
      )}
      
      <ReactionPicker
        visible={showReactionPicker}
        onReact={handleReact}
        onClose={() => setShowReactionPicker(false)}
      />
      
      {!isMessageSending && (
        <TouchableOpacity
          onPress={toggleReactionPicker}
          style={[
            styles.addReactionButton,
            isOwnMessage ? styles.addReactionButtonOwn : styles.addReactionButtonOther,
            showReactionPicker && styles.addReactionButtonActive
          ]}
          activeOpacity={0.7}
        >
          <Text style={styles.addReactionText}>
            {showReactionPicker ? '×' : '+'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

// =====================================
// MAIN APP COMPONENT
// =====================================

export default function App() {
  // UI State
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [reactionSheetVisible, setReactionSheetVisible] = useState(false);
  const [selectedReactionMessage, setSelectedReactionMessage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Store State
  const messages = useMessageStore(state => state.messages);
  const messagesLoading = useMessageStore(state => state.loading);
  const messagesError = useMessageStore(state => state.error);
  const addReaction = useMessageStore(state => state.addReaction);
  
  const participants = useParticipantStore(state => state.participants);
  const getParticipantName = useParticipantStore(state => state.getParticipantName);
  
  const connected = useSessionStore(state => state.connected);
  const sessionUuid = useSessionStore(state => state.sessionUuid);

  // ✅ Real-time Updates & Connection Monitoring
  const { isOnline } = useConnectionMonitor();
  const { 
    isPolling, 
    lastError: syncError, 
    forceSync,
    retryCount 
  } = useRealtimeUpdates({
    pollInterval: 5000,
    maxRetries: 3,
    enablePolling: connected && isOnline
  });

  // ✅ Message Grouping
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

  // =====================================
  // INITIALIZATION
  // =====================================

  const initializeApp = useCallback(async () => {
    try {
      setInitializing(true);
      useMessageStore.getState().setLoading(true);
      useMessageStore.getState().clearError();
      useParticipantStore.getState().clearError();
      
      console.log('🚀 Initializing app with real API...');
      
      // Get server info
      const serverInfo = await apiService.retryRequest(
        () => apiService.getServerInfo(),
        3,
        1000
      );
      
      useSessionStore.setState({
        sessionUuid: serverInfo.sessionUuid,
        apiVersion: serverInfo.apiVersion,
        connected: true,
        lastConnectedAt: Date.now(),
      });

      // Load initial data
      const [participantsData, messagesData] = await Promise.allSettled([
        apiService.retryRequest(() => apiService.getAllParticipants(), 2),
        apiService.retryRequest(() => apiService.getLatestMessages(50), 2)
      ]);

      // Handle participants
      if (participantsData.status === 'fulfilled') {
        useParticipantStore.getState().setParticipants(participantsData.value);
        console.log(`✅ Loaded ${participantsData.value.length} participants`);
      } else {
        console.warn('⚠️ Failed to load participants:', participantsData.reason);
      }

      // Handle messages
      if (messagesData.status === 'fulfilled') {
        useMessageStore.getState().setMessages(messagesData.value);
        console.log(`✅ Loaded ${messagesData.value.length} messages`);
      } else {
        console.warn('⚠️ Failed to load messages:', messagesData.reason);
        throw messagesData.reason;
      }

      console.log('🎉 App initialized successfully');

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      useSessionStore.setState({ connected: false });
      useMessageStore.getState().setError(
        error.message || 'Failed to connect to server. Please check your connection.'
      );
    } finally {
      setInitializing(false);
      useMessageStore.getState().setLoading(false);
      useParticipantStore.getState().setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // =====================================
  // MESSAGE ACTIONS
  // =====================================

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);
    
    try {
      if (!connected || !isOnline) {
        throw new Error('No internet connection');
      }

      // Create optimistic message
      const optimisticMessage = {
        uuid: `temp-${Date.now()}`,
        text: messageText,
        authorUuid: 'you',
        participant: { uuid: 'you', name: 'You' },
        createdAt: Date.now(),
        sentAt: Date.now(),
        status: 'sending',
        reactions: [],
        attachments: []
      };

      useMessageStore.getState().addMessage(optimisticMessage);

      // Send via API
      const serverMessage = await apiService.sendMessage(messageText);
      
      // Replace optimistic message with server response
      useMessageStore.getState().removeMessage(optimisticMessage.uuid);
      useMessageStore.getState().addMessage(serverMessage);

    } catch (error) {
      console.error('Failed to send message:', error);
      useMessageStore.getState().setError('Failed to send message');
      Alert.alert(
        'Send Failed', 
        error.message || 'Could not send message. Please try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => setInputText(messageText) }
        ]
      );
    } finally {
      setSending(false);
    }
  }, [inputText, sending, connected, isOnline]);

  const handleReact = useCallback(async (messageUuid, emoji) => {
    try {
      // Try API first, fallback to local state
      const result = await apiService.addReaction(messageUuid, emoji);
      
      if (result.success === false && result.reason === 'endpoint_not_implemented') {
        // Use local state management
        addReaction(messageUuid, emoji, 'you');
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
      // Fallback to local state
      addReaction(messageUuid, emoji, 'you');
    }
  }, [addReaction]);

  const handleReactionPress = useCallback((message, reaction) => {
    setSelectedReactionMessage(message);
    setReactionSheetVisible(true);
  }, []);

  const handleMessageLongPress = useCallback((message) => {
    Alert.alert(
      'Message Options',
      `Message from ${getParticipantName(message.participant?.uuid || message.authorUuid)}`,
      [
        { text: 'Copy Text', onPress: () => console.log('Copy:', message.text) },
        { text: 'Reply', onPress: () => console.log('Reply to:', message.uuid) },
        { text: 'Forward', onPress: () => console.log('Forward:', message.uuid) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [getParticipantName]);

  const handleImagePress = useCallback((imageUrl) => {
    Alert.alert(
      'Image Preview',
      'Open image in full screen?',
      [
        { text: 'Cancel' },
        { text: 'Open', onPress: () => console.log('Open image:', imageUrl) }
      ]
    );
  }, []);

  const handleParticipantPress = useCallback((participant) => {
    Alert.alert(
      participant.name || 'Unknown User',
      `UUID: ${participant.uuid}\nRole: ${participant.role || 'Member'}`,
      [{ text: 'OK' }]
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await forceSync();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [forceSync]);

  const handleMessageSelect = useCallback((message) => {
    // Scroll to message or highlight it
    console.log('Selected message:', message.uuid);
    Alert.alert('Message Selected', `Found: "${message.text}"`);
  }, []);

  // =====================================
  // RENDER FUNCTIONS
  // =====================================

  const renderMessage = useCallback(({ item }) => (
    <MessageBubble
      message={item}
      grouping={item.grouping}
      onReact={handleReact}
      onReactionPress={handleReactionPress}
      onImagePress={handleImagePress}
      onLongPress={handleMessageLongPress}
    />
  ), [handleReact, handleReactionPress, handleImagePress, handleMessageLongPress]);

  const keyExtractor = useCallback((item) => item.uuid, []);

  // =====================================
  // LOADING & ERROR STATES
  // =====================================

  if (initializing) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, styles.centered]}>
          <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
          <LoadingOverlay visible={true} message="Connecting to server..." />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (messagesError && !connected) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />
          <ConnectionErrorState 
            error={messagesError} 
            onRetry={initializeApp}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={styles.container}>
          <StatusBar 
            barStyle="light-content" 
            backgroundColor={connected ? "#007AFF" : "#FF9500"} 
          />
          
          {/* Header */}
          <View style={[
            styles.header,
            !connected && styles.headerDisconnected
          ]}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Team Chat</Text>
              <TouchableOpacity 
                onPress={() => setSearchVisible(true)}
                style={styles.searchButton}
                activeOpacity={0.7}
              >
                <Text style={styles.searchButtonText}>🔍</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>
              {connected ? (
                isOnline ? (
                  `🟢 Online • ${messages.length} messages • ${Object.keys(participants).length} members`
                ) : (
                  '🟡 Offline • Using cached data'
                )
              ) : (
                `🔴 Disconnected${retryCount > 0 ? ` • Retry ${retryCount}/3` : ''}`
              )}
            </Text>
          </View>

          {/* Sync Status */}
          {isPolling && (
            <View style={styles.syncIndicator}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.syncText}>Syncing...</Text>
            </View>
          )}

          {/* Error Banner */}
          {(messagesError || syncError) && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                ⚠️ {messagesError || syncError?.message || 'Connection issues'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  useMessageStore.getState().clearError();
                  handleRefresh();
                }} 
                style={styles.dismissButton}
              >
                <Text style={styles.dismissText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Messages List */}
          {messages.length === 0 && !messagesLoading ? (
            <EmptyMessagesState onRefresh={handleRefresh} />
          ) : (
            <>
              {messagesLoading && messages.length === 0 && (
                <MessagesListSkeleton count={8} />
              )}
              
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
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    title="Pull to refresh"
                    colors={['#007AFF']}
                    tintColor="#007AFF"
                  />
                }
                ListFooterComponent={
                  // Show typing indicator when implemented
                  false && <TypingIndicator participants={['Alice']} />
                }
              />
            </>
          )}

          {/* Sending Indicator */}
          <SendingMessageIndicator visible={sending} />

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                multiline={true}
                maxLength={2000}
                editable={!sending && connected}
                blurOnSubmit={false}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity 
                onPress={sendMessage} 
                style={[
                  styles.sendButton, 
                  (sending || !inputText.trim() || !connected) && styles.sendButtonDisabled
                ]}
                disabled={sending || !inputText.trim() || !connected}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.sendButtonText}>→</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Enhanced Modals */}
          <MessageSearch
            visible={searchVisible}
            onClose={() => setSearchVisible(false)}
            onMessageSelect={handleMessageSelect}
          />

          <ReactionDetailsSheet
            visible={reactionSheetVisible}
            onClose={() => setReactionSheetVisible(false)}
            message={selectedReactionMessage}
            onParticipantPress={handleParticipantPress}
            onRemoveReaction={handleReact}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}

// =====================================
// STYLES (Same as before, with additions)
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
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerDisconnected: {
    backgroundColor: '#FF9500',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  syncText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#007AFF',
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
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#D32F2F',
    borderRadius: 4,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 2,
    position: 'relative',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    position: 'relative',
  },
  ownMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  messageSending: {
    opacity: 0.7,
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
  sendingIndicator: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  imageContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  
  // Avatar
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  avatarSpacer: {
    width: 40,
  },
  
  // Reactions
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginHorizontal: 8,
    gap: 6,
  },
  reactionsContainerOwn: {
    justifyContent: 'flex-end',
    marginRight: 48,
  },
  reactionsContainerOther: {
    justifyContent: 'flex-start',
    marginLeft: 48,
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
  reactionBubbleActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
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
  reactionCountActive: {
    color: '#FFFFFF',
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
    alignSelf: 'center',
  },
  emojiButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 16,
  },
  emoji: {
    fontSize: 22,
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
  addReactionButtonActive: {
    backgroundColor: '#007AFF',
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
  
  // Input
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
    borderWidth: 1,
    borderColor: '#E5E5EA',
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