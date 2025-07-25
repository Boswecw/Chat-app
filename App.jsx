// App.jsx - Enhanced with Message Grouping
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Zustand Stores
import useMessageStore from './src/stores/messageStore';
import useParticipantStore from './src/stores/participantStore';
import useSessionStore from './src/stores/sessionStore';

// API Service
import apiService from './src/services/apiService';

// Message Grouping Utilities
import { 
  processMessagesForGrouping, 
  getGroupedMessageStyle, 
  getGroupedBorderRadius 
} from './src/utils/messageGrouping';

export default function App() {
  // Local UI state
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Zustand stores - access state directly
  const messages = useMessageStore(state => state.messages);
  const messagesLoading = useMessageStore(state => state.loading);
  const messagesError = useMessageStore(state => state.error);
  
  const participants = useParticipantStore(state => state.participants);
  const getParticipantName = useParticipantStore(state => state.getParticipantName);
  
  const connected = useSessionStore(state => state.connected);
  const sessionUuid = useSessionStore(state => state.sessionUuid);
  const apiVersion = useSessionStore(state => state.apiVersion);

  // Process messages with grouping metadata
  const groupedMessages = useMemo(() => {
    return processMessagesForGrouping(messages);
  }, [messages]);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setInitializing(true);
      
      // Set loading states
      useMessageStore.getState().setLoading(true);
      useParticipantStore.getState().setLoading(true);
      useMessageStore.getState().clearError();

      console.log('🚀 Initializing Chat App with Zustand...');

      // Step 1: Test server connection
      const serverInfo = await apiService.getServerInfo();
      
      // Step 2: Update session store
      const sessionStore = useSessionStore.getState();
      const currentSession = sessionStore.sessionUuid;
      const sessionChanged = currentSession && currentSession !== serverInfo.sessionUuid;
      
      // Set server info manually
      useSessionStore.setState({
        sessionUuid: serverInfo.sessionUuid,
        apiVersion: serverInfo.apiVersion,
        connected: true,
        lastConnectedAt: Date.now(),
        connectionAttempts: 0
      });

      if (sessionChanged) {
        console.log('🔄 Session changed, clearing caches...');
        Alert.alert(
          'Server Restarted',
          'The chat server was restarted. Refreshing data...',
          [{ text: 'OK' }]
        );
      }

      // Step 3: Load participants and messages in parallel
      const [participantsData, messagesData] = await Promise.all([
        apiService.getAllParticipants(),
        apiService.getLatestMessages(),
      ]);

      // Step 4: Update stores directly
      useParticipantStore.getState().setParticipants(participantsData);
      useMessageStore.getState().setMessages(messagesData);

      console.log('✅ App initialized successfully');

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      
      // Set error states
      useSessionStore.setState({ connected: false });
      useMessageStore.getState().setError(error.message);

      const currentAttempts = useSessionStore.getState().connectionAttempts;
      useSessionStore.setState({ connectionAttempts: currentAttempts + 1 });
      
      if (currentAttempts < 3) {
        Alert.alert(
          'Connection Error',
          `Failed to connect to chat server (Attempt ${currentAttempts + 1}). Using offline mode.`,
          [
            { text: 'Retry', onPress: () => initializeApp() },
            { text: 'Offline Mode', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert(
          'Connection Failed',
          'Could not connect to chat server. Using offline mode with cached data.',
          [{ text: 'OK' }]
        );
      }
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
        // Send to real server
        const serverMessage = await apiService.sendMessage(messageText);
        useMessageStore.getState().addMessage(serverMessage);
        console.log('✅ Message sent and added to store');
      } else {
        // Offline mode - add local message
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
        console.log('📴 Message added in offline mode');
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

  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.authorUuid === 'you';
    const displayName = getParticipantName ? getParticipantName(item.authorUuid) : 
                       (item.authorUuid === 'you' ? 'You' : 'Unknown User');
    
    const messageTime = item.sentAt || item.createdAt ? 
      new Date(item.sentAt || item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
      'Now';

    // Get grouping metadata
    const grouping = item.grouping || { position: 'single', showHeader: true, showTail: true };
    const { position, showHeader, showTail } = grouping;

    // Get dynamic styles based on grouping
    const messageStyle = getGroupedMessageStyle(position, isOwnMessage);
    const borderRadiusStyle = getGroupedBorderRadius(position, isOwnMessage);

    return (
      <View style={[styles.messageContainer, messageStyle]}>
        <View style={[
          styles.messageBubble, 
          isOwnMessage && styles.ownMessage,
          borderRadiusStyle
        ]}>
          {/* Show participant name only for first message in group */}
          {showHeader && (
            <Text style={[
              styles.messageUser, 
              isOwnMessage && styles.ownMessageUser
            ]}>
              {displayName}
            </Text>
          )}
          
          {/* Message text */}
          <Text style={[
            styles.messageText, 
            isOwnMessage && styles.ownMessageText,
            !showHeader && styles.groupedMessageText
          ]}>
            {item.text}
          </Text>
          
          {/* Show timestamp only for last message in group */}
          {showTail && (
            <Text style={[
              styles.messageTime, 
              isOwnMessage && styles.ownMessageTime
            ]}>
              {messageTime}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Show loading screen during initialization
  if (initializing) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Initializing Chat App...</Text>
          <Text style={styles.subText}>Loading with message grouping...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Header with enhanced status */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat App 💬</Text>
          <Text style={styles.status}>
            {connected ? '🟢 Connected' : '🔴 Offline Mode'}
          </Text>
          <Text style={styles.statsText}>
            {messages.length} messages • {Object.keys(participants).length} participants
          </Text>
          {sessionUuid && (
            <Text style={styles.sessionText}>
              Session: {sessionUuid.substring(0, 8)}... • API v{apiVersion}
            </Text>
          )}
        </View>

        {/* Error Display */}
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

        {/* Messages List with Grouping */}
        <FlatList
          data={groupedMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.uuid}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          inverted
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true} // Performance optimization
          maxToRenderPerBatch={10} // Performance optimization
        />

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={connected ? "Type a message..." : "Offline - Type a message..."}
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
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  status: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  statsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 2,
  },
  sessionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 8,
    marginTop: 2,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  subText: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  errorBanner: {
    backgroundColor: '#ffebee',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#ffcdd2',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    flex: 1,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    color: '#c62828',
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
    // Dynamic margins applied here
  },
  messageBubble: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    alignSelf: 'flex-start',
    maxWidth: '80%',
    // Dynamic border radius applied here
  },
  ownMessage: {
    backgroundColor: '#007bff',
    alignSelf: 'flex-end',
  },
  messageUser: {
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
    color: '#666',
  },
  ownMessageUser: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 20,
  },
  groupedMessageText: {
    // Slightly different styling for grouped messages
  },
  ownMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    textAlign: 'right',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});