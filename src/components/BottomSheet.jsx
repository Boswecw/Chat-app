// src/components/BottomSheet.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';

const BottomSheet = ({ isVisible, onClose, title, children }) => {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      backdropTransitionOutTiming={0}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.dragHandle} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <ScrollView style={styles.content}>
          {children}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dragHandle: {
    width: 50,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    marginBottom: 8,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
  },
  content: {
    flexGrow: 1,
    marginBottom: 12,
  },
  closeBtn: {
    padding: 10,
    alignItems: 'center',
  },
  closeText: {
    color: '#007bff',
    fontWeight: '600',
  },
});

export default BottomSheet;
