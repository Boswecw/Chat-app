// src/components/ReactionRow.jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import emojis from '../constants/emojis';

const ReactionRow = ({ onReact }) => (
  <View style={styles.row}>
    {emojis.map((emoji) => (
      <TouchableOpacity key={emoji.label} onPress={() => onReact(emoji.symbol)}>
        <Text style={styles.emoji}>{emoji.symbol}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 6,
  },
  emoji: {
    fontSize: 20,
    marginHorizontal: 4,
  },
});

export default ReactionRow;
