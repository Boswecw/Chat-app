// src/components/DateSeparator.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDate } from '../../src_backup/utils/formatDate';

const DateSeparator = ({ timestamp }) => {
  if (!timestamp) return null;

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>{formatDate(timestamp)}</Text>
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 12,
    color: '#888',
    marginHorizontal: 8,
    fontWeight: '500',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
});

export default DateSeparator;
