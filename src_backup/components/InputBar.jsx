// src/components/InputBar.jsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';

import useMessageStore from '../state/messageStore';
import { sendMessage } from '../api/messages';
import useReply from '../hooks/useReply';

const InputBar = () => {
  const [text, setText] = useState('');
  const { addMessage } = useMessageStore();
  const {
    replyTo,
    isReplying,
    cancelReply,
  } = useReply();

  const handleSend = async () => {
    if (!text.trim()) return;

    try {
      const payload = {
        text,
        ...(isReplying && replyTo ? { replyToMessage: replyTo.uuid } : {}),
      };

      const newMessage = await sendMessage(payload.text); // NOTE: adjust if you customize API
      addMessage(newMessage);
      setText('');
      cancelReply();
    } catch (err) {
      console.error('❌ Error sending message:', err.message);
    }
  };

  return (
    <View style={styles.wrapper}>
      {isReplying && replyTo && (
        <View style={styles.replyPreview}>
          <Text style={styles.replyLabel}>Replying to: {replyTo.participant?.name}</Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {replyTo.text}
          </Text>
          <TouchableOpacity onPress={cancelReply}>
            <Text style={styles.cancel}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={isReplying ? 'Write a reply…' : 'Type a message…'}
          value={text}
          onChangeText={setText}
        />
        <Button title="Send" onPress={handleSend} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  replyPreview: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyLabel: {
    fontWeight: '600',
    marginRight: 6,
  },
  replyText: {
    flex: 1,
    color: '#555',
  },
  cancel: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
});

export default InputBar;
