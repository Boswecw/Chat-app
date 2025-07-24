// src/components/MessageGroup.jsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';

/**
 * A message group handles rendering one or more consecutive messages
 * from the same participant, optionally separated by date.
 */
const MessageGroup = ({ group, onReact, onReactionPress }) => {
  if (!group) return null;

  return (
    <View style={styles.wrapper}>
      {/* Date separator for messages sent on different days */}
      {group.dateSeparator && (
        <DateSeparator timestamp={group.createdAt} />
      )}

      {/* Main message bubble */}
      <MessageBubble 
        message={group} 
        isGrouped={group.isGrouped || false}
        onReact={onReact}
        onReactionPress={onReactionPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
});

export default MessageGroup;