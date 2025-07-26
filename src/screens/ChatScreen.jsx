import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Initialize dayjs plugins
dayjs.extend(relativeTime);

// Import stores - Using correct paths
import useMessageStore from '../stores/messageStore';
import useParticipantStore from '../stores/participantStore';
import useSessionStore from '../stores/sessionStore';

// Import API service
import apiService from '../services/apiService';

// Import components
import MessageBubble from '../components/MessageBubble';
import DateSeparator from '../components/DateSeparator';
import TypingIndicator from '../components/TypingIndicator';
import ReactionSheet from '../components/ReactionSheet';

// Import constants
import colors from '../constants/colors';

const ChatScreen = () => {
  // Local state
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReactionSheet, setShowReactionSheet] = useState(false);
  
  // Refs
  const flatListRef = useRef(null);
  const lastMessageRef = useRef(null);
  
  // Store hooks
  const {
    messages,
    loading,
    error,
    setMessages,
    addMessage,
    updateMessage,
    setLoading,
    setError,
    clearError,
  } = useMessageStore();
  
  const {
    participants,
    setParticipants,
    getParticipant,
  } = useParticipantStore();
  
  const {
    sessionUuid,
    connected,
    setSession,
    clearSession,
  } = useSessionStore();

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
    
    // Set up polling for updates
    const pollInterval = setInterval(pollForUpdates, 5000);
    
    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  // Initialize app with server connection
  const initializeApp = async () => {
    try {
      setLoading(true);
      clearError();
      
      // Get server info
      const serverInfo = await apiService.getServerInfo();
      
      // Check if session changed (need to clear local data)
      if (sessionUuid && sessionUuid !== serverInfo.sessionUuid) {
        clearSession();
        setMessages([]);
        setParticipants([]);
      }
      
      setSession(serverInfo);
      
      // Load initial data in parallel
      const [messagesData, participantsData] = await Promise.all([
        apiService.getLatestMessages(),
        apiService.getAllParticipants(),
      ]);
      
      setMessages(messagesData);
      setParticipants(participantsData);
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setError(error.message || 'Failed to connect to chat server');
      Alert.alert(
        'Connection Error',
        'Could not connect to chat server. You can still view offline messages.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Poll for updates
  const pollForUpdates = async () => {
    if (!connected) return;
    
    try {
      const lastUpdateTime = messages[0]?.updatedAt || messages[0]?.createdAt;
      
      if (lastUpdateTime) {
        const updatedMessages = await apiService.getUpdatedMessages(
          new Date(lastUpdateTime).getTime()
        );
        
        if (updatedMessages.length > 0) {
          // Merge updates with existing messages
          const updatedMap = new Map(updatedMessages.map(m => [m.uuid, m]));
          const mergedMessages = messages.map(msg =>
            updatedMap.has(msg.uuid) ? updatedMap.get(msg.uuid) : msg
          );
          
          // Add new messages
          const existingUuids = new Set(messages.map(m => m.uuid));
          const newMessages = updatedMessages.filter(m => !existingUuids.has(m.uuid));
          
          setMessages([...newMessages, ...mergedMessages]);
        }
      }
    } catch (error) {
      console.error('Failed to poll updates:', error);
    }
  };

  // Refresh messages
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [messagesData, participantsData] = await Promise.all([
        apiService.getLatestMessages(),
        apiService.getAllParticipants(),
      ]);
      
      setMessages(messagesData);
      setParticipants(participantsData);
    } catch (error) {
      Alert.alert('Refresh Failed', 'Could not refresh messages');
    } finally {
      setRefreshing(false);
    }
  };

  // Load more messages (pagination)
  const handleLoadMore = async () => {
    if (loadingMore || !messages.length) return;
    
    setLoadingMore(true);
    try {
      const oldestMessage = messages[messages.length - 1];
      const olderMessages = await apiService.getMessagesBefore(
        oldestMessage.uuid,
        25
      );
      
      if (olderMessages.length > 0) {
        setMessages([...messages, ...olderMessages]);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || sending) return;
    
    setInputText('');
    setSending(true);
    
    // Create optimistic message
    const optimisticMessage = {
      uuid: `temp-${Date.now()}`,
      text: trimmedText,
      authorUuid: 'you',
      participant: {
        uuid: 'you',
        name: 'You',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reactions: [],
      status: 'sending',
    };
    
    addMessage(optimisticMessage);
    
    try {
      // Send to server
      const serverMessage = await apiService.sendMessage(trimmedText);
      
      // Replace optimistic message with server response
      updateMessage(optimisticMessage.uuid, {
        ...serverMessage,
        status: 'sent',
      });
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update optimistic message to show error
      updateMessage(optimisticMessage.uuid, {
        status: 'failed',
      });
      
      Alert.alert(
        'Send Failed',
        'Could not send message. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setInputText(trimmedText);
              updateMessage(optimisticMessage.uuid, { status: 'sending' });
              handleSendMessage();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } finally {
      setSending(false);
    }
  };

  // Handle reaction
  const handleAddReaction = async (messageUuid, emoji) => {
    try {
      // Optimistically add reaction
      const message = messages.find(m => m.uuid === messageUuid);
      if (!message) return;
      
      const newReaction = {
        emoji,
        participantUuid: 'you',
        participant: { uuid: 'you', name: 'You' },
      };
      
      updateMessage(messageUuid, {
        reactions: [...(message.reactions || []), newReaction],
      });
      
      // Send to server
      await apiService.addReaction(messageUuid, emoji);
      
    } catch (error) {
      console.error('Failed to add reaction:', error);
      // Revert on error
      pollForUpdates();
    }
  };

  // Show reaction sheet
  const handleLongPressMessage = (message) => {
    setSelectedMessage(message);
    setShowReactionSheet(true);
  };

  // Group messages by sender and time
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    const grouped = [];
    let currentGroup = null;
    
    messages.forEach((message, index) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const messageDate = dayjs(message.createdAt);
      const prevMessageDate = prevMessage ? dayjs(prevMessage.createdAt) : null;
      
      // Add date separator if needed
      if (!prevMessage || !messageDate.isSame(prevMessageDate, 'day')) {
        grouped.push({
          type: 'separator',
          date: messageDate.format('MMMM D, YYYY'),
          key: `separator-${messageDate.format('YYYY-MM-DD')}`,
        });
      }
      
      // Check if should group with previous
      const shouldGroup = prevMessage &&
        prevMessage.authorUuid === message.authorUuid &&
        messageDate.diff(prevMessageDate, 'minute') < 5;
      
      grouped.push({
        type: 'message',
        data: message,
        showHeader: !shouldGroup,
        isGrouped: shouldGroup,
        key: message.uuid,
      });
    });
    
    return grouped;
  }, [messages]);

  // Render message item
  const renderItem = ({ item }) => {
    if (item.type === 'separator') {
      return <DateSeparator date={item.date} />;
    }
    
    const participant = getParticipant(item.data.authorUuid);
    const isOwnMessage = item.data.authorUuid === 'you';
    
    return (
      <MessageBubble
        message={item.data}
        participant={participant}
        isOwnMessage={isOwnMessage}
        showHeader={item.showHeader}
        isGrouped={item.isGrouped}
        onLongPress={() => handleLongPressMessage(item.data)}
        onReactionPress={(reaction) => {
          // Show who reacted
          Alert.alert(
            reaction.emoji,
            `Reacted by ${reaction.participant?.name || 'Unknown'}`,
          );
        }}
      />
    );
  };

  // Loading state
  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && messages.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>⚠️</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeApp}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat Room</Text>
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionDot,
              { backgroundColor: connected ? '#4CAF50' : '#FF5252' }
            ]} />
            <Text style={styles.connectionText}>
              {connected ? 'Connected' : 'Offline'}
            </Text>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Be the first to say hello! 👋</Text>
            </View>
          }
        />

        {/* Typing Indicator */}
        {false && <TypingIndicator participants={[]} />}

        {/* Input Container */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Reaction Sheet */}
      <ReactionSheet
        visible={showReactionSheet}
        message={selectedMessage}
        onClose={() => {
          setShowReactionSheet(false);
          setSelectedMessage(null);
        }}
        onReact={(emoji) => {
          if (selectedMessage) {
            handleAddReaction(selectedMessage.uuid, emoji);
          }
          setShowReactionSheet(false);
          setSelectedMessage(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    color: 'white',
    fontSize: 12,
  },
  
  // Loading states
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
  
  // Error states
  errorText: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Messages list
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textMuted,
  },
  
  // Input container
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  sendText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ChatScreen;