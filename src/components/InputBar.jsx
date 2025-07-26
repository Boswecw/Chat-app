// src/components/InputBar.jsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

import useMessageStore from '../stores/messageStore';
import apiService from '../services/apiService';
import useReply from '../hooks/useReply';
import colors from '../constants/colors';

const InputBar = () => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  
  const { addMessage, updateMessage } = useMessageStore();
  const { replyTo, isReplying, cancelReply } = useReply();

  const handleSend = async () => {
    const trimmedText = text.trim();
    if (!trimmedText || sending) return;

    setSending(true);
    setText(''); // Clear input immediately for better UX

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
      ...(isReplying && replyTo ? { replyToMessage: replyTo } : {}),
    };

    // Add optimistic message to store
    addMessage(optimisticMessage);

    try {
      // Send to server
      const serverMessage = await apiService.sendMessage(trimmedText, []);
      
      // Replace optimistic message with server response
      updateMessage(optimisticMessage.uuid, {
        ...serverMessage,
        status: 'sent',
        replyToMessage: isReplying ? replyTo : undefined,
      });
      
      // Clear reply state if replying
      if (isReplying) {
        cancelReply();
      }
    } catch (err) {
      console.error('❌ Error sending message:', err.message);
      
      // Update message status to failed
      updateMessage(optimisticMessage.uuid, { status: 'failed' });
      
      // Restore text for retry
      setText(trimmedText);
      
      // Show error alert
      Alert.alert(
        'Send Failed',
        'Could not send message. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.wrapper}>
        {isReplying && replyTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyIndicator} />
            <View style={styles.replyContent}>
              <Text style={styles.replyLabel}>
                Replying to {replyTo.participant?.name || 'Unknown'}
              </Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {replyTo.text}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelReply} style={styles.cancelButton}>
              <Text style={styles.cancelIcon}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={isReplying ? 'Write a reply…' : 'Type a message…'}
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            editable={!sending}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!text.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  
  // Reply preview styles
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  replyIndicator: {
    width: 3,
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  cancelButton: {
    padding: 4,
    marginLeft: 8,
  },
  cancelIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  
  // Input row styles
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
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

export default InputBar;