// App.jsx - Professional with Message Grouping + Reactions
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Zustand Stores
import useMessageStore from './src/stores/messageStore';
import useParticipantStore from './src/stores/participantStore';
import useSessionStore from './src/stores/sessionStore';

// API Service
import apiService from './src/services/apiService';

// Professional grouping logic
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

export default function App() {
  // Local UI state
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Zustand stores
  const messages = useMessageStore(state => state.messages);
  const messagesLoading = useMessageStore(state => state.loading);
  const messagesError = useMessageStore(state => state.error);
  
  const participants = useParticipantStore(state => state.participants);
  const getParticipantName = useParticipantStore(state => state.getParticipantName);
  
  const connected = useSessionStore(state => state.connected);
  const sessionUuid = useSessionStore(state => state.sessionUuid);
  const apiVersion = useSessionStore(state => state.apiVersion);

  // Professional message grouping
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
      useParticipantStore.getState().setLoading(true);
      useMessageStore.getState().clearError();

      const serverInfo = await apiService.getServerInfo();
      
      useSessionStore.setState({
        sessionUuid: serverInfo.sessionUuid,
        apiVersion: serverInfo.apiVersion,
        connected: true,
        lastConnectedAt: Date.now(),
        connectionAttempts: 0
      });

      const [participantsData, messagesData] = await Promise.all([
        apiService.getAllParticipants(),
        apiService.getLatestMessages(),
      ]);

      useParticipantStore.getState().setParticipants(participantsData);
      useMessageStore.getState().setMessages(messagesData);

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      useSessionStore.setState({ connected: false });
      useMessageStore.getState().setError(error.message);
    } finally {
      setInitializing(false);
      useMessageStore.getState().setLoading(false);
      useParticipantStore.getState().setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);
    useMessageStore.getState().clearError();

    try {
      if (connected) {
        const serverMessage = await apiService.sendMessage(messageText);
        useMessageStore.getState().addMessage(serverMessage);
      } else {
        const localMessage = {
          uuid: `local-${Date.now()}`,
          text: messageText,
          authorUuid: 'you',
          sentAt: Date.now(),
          createdAt: new Date().toISOString(),
          attachments: [],
          reactions: [],
        };
        useMessageStore.getState().addMessage(localMessage);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      useMessageStore.getState().setError(error.message);
      Alert.alert('Send Failed', 'Could not send message. Please try again.');
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  // Render reactions row
  const renderReactions = (reactions) => {
    if (!reactions || reactions.length === 0) return null;
    
    // Group reactions by emoji
    const reactionMap = {};
    reactions.forEach(reaction => {
      const emoji = reaction.emoji || reaction.type || '👍';
      if (reactionMap[emoji]) {
        reactionMap[emoji].count++;
      } else {
        reactionMap[emoji] = { count: 1, emoji };
      }
    });

    const reactionGroups = Object.values(reactionMap);
    if (reactionGroups.length === 0) return null;

    return (
      <View style={styles.reactionsContainer}>
        {reactionGroups.map((reaction, index) => (
          <View key={index} style={styles.reactionBubble}>
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            <Text style={styles.reactionCount}>{reaction.count}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.authorUuid === 'you';
    const displayName = getParticipantName ? getParticipantName(item.authorUuid) : 
                       (item.authorUuid === 'you' ? 'You' : 'Unknown User');
    
    const messageTime = item.sentAt || item.createdAt ? 
      new Date(item.sentAt || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
      'Now';

    const grouping = item.grouping || { position: 'single', showHeader: true, showTail: true };
    const { position, showHeader, showTail } = grouping;

    // Professional spacing
    const getSpacing = () => {
      switch (position) {
        case 'single': return { marginVertical: 6 };
        case 'first': return { marginTop: 6, marginBottom: 2 };
        case 'middle': return { marginVertical: 1 };
        case 'last': return { marginTop: 2, marginBottom: 6 };
        default: return { marginVertical: 4 };
      }
    };

    const borderRadiusStyle = getGroupedBorderRadius(position, isOwnMessage);

    return (
      <View style={[styles.messageContainer, getSpacing()]}>
        <View style={[
          styles.messageBubble, 
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          borderRadiusStyle
        ]}>
          {/* Participant name for first message in group */}
          {showHeader && !isOwnMessage && (
            <Text style={styles.messageUser}>
              {displayName}
            </Text>
          )}
          
          {/* Message text */}
          <Text style={[
            styles.messageText, 
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
          
          {/* Edited indicator */}
          {item.editedAt && (
            <Text style={[
              styles.editedText,
              isOwnMessage ? styles.ownEditedText : styles.otherEditedText
            ]}>
              edited
            </Text>
          )}
          
          {/* Timestamp for last message in group */}
          {showTail && (
            <Text style={[
              styles.messageTime, 
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
            ]}>
              {messageTime}
            </Text>
          )}
        </View>
        
        {/* Reactions */}
        {renderReactions(item.reactions)}
      </View>
    );
  };

  if (initializing) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading Chat...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Professional Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat</Text>
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
          keyExtractor={(item) => item.uuid}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          inverted
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
        />

        {/* Professional Input Bar */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message..."
              multiline
              editable={!sending}
              maxLength={1000}
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
                <Text style={styles.sendButtonText}>↗</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

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
    padding: 16,
  },
  messageContainer: {
    // Dynamic spacing applied via getSpacing()
  },
  messageBubble: {
    padding: 12,
    maxWidth: '75%',
    // Dynamic border radius applied via getGroupedBorderRadius()
  },
  ownMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#E5E5EA',
    alignSelf: 'flex-start',
  },
  messageUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
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
    marginTop: 2,
  },
  ownEditedText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherEditedText: {
    color: '#8E8E93',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#8E8E93',
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    marginLeft: 8,
    flexWrap: 'wrap',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  inputContainer: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    color: '#000000',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});