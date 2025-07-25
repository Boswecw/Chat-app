cat > src/screens/ChatScreen.jsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import colors from '../constants/colors';

// Import stores
import useMessageStore from '../state/messageStore';
import useParticipantStore from '../state/participantStore';
import useSessionStore from '../state/sessionStore';

// Import APIs
import { fetchLatestMessages, sendMessage } from '../api/messages';
import { fetchServerInfo } from '../api/info';
import { fetchAllParticipants } from '../api/participants';

const ChatScreen = () => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Zustand stores
  const { messages, loading, setMessages, addMessage, setLoading, setError } = useMessageStore();
  const { participants, setParticipants } = useParticipantStore();
  const { connected, setSession } = useSessionStore();

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Get server info
      const serverInfo = await fetchServerInfo();
      setSession(serverInfo);
      
      // Load initial data
      const [messagesData, participantsData] = await Promise.all([
        fetchLatestMessages(),
        fetchAllParticipants()
      ]);
      
      setMessages(messagesData);
      setParticipants(participantsData);
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setError(error.message);
      Alert.alert(
        'Connection Error', 
        'Could not connect to chat server. Using offline mode.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      // Add optimistic message
      const optimisticMessage = {
        uuid: `temp-${Date.now()}`,
        text: messageText,
        participant: { name: 'You', uuid: 'you' },
        createdAt: new Date().toISOString(),
        status: 'sending'
      };
      addMessage(optimisticMessage);

      // Send to server
      const serverMessage = await sendMessage(messageText);
      
      // Replace optimistic message with server response
      setMessages([serverMessage, ...messages.filter(m => m.uuid !== optimisticMessage.uuid)]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Send Failed', 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getParticipantName = (participantUuid) => {
    if (participantUuid === 'you') return 'You';
    const participant = participants.find(p => p.uuid === participantUuid);
    return participant?.name || 'Unknown User';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.participant?.uuid === 'you';
    const participantName = getParticipantName(item.participant?.uuid);
    
    return (
      <View style={[styles.message, isOwn && styles.ownMessage]}>
        <Text style={styles.user}>{participantName}</Text>
        <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
          {item.text}
        </Text>
        <View style={styles.messageFooter}>
          {item.status === 'sending' && (
            <ActivityIndicator size="small" color={isOwn ? '#fff' : colors.primary} />
          )}
          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Connecting to chat server...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>💬 Chat App</Text>
        <Text style={styles.statusText}>
          {connected ? '🟢 Connected' : '🔴 Offline'}
        </Text>
      </View>
      
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.uuid}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        inverted
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity 
          onPress={handleSendMessage} 
          style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
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
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  message: {
    backgroundColor: colors.surface,
    padding: 12,
    marginVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  ownMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  user: {
    fontWeight: 'bold',
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
  },
  ownMessageText: {
    color: 'white',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 60,
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
EOF