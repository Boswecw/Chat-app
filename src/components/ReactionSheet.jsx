// src/components/ReactionSheet.jsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import colors from '../constants/colors';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'];
const ALL_REACTIONS = [
  ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊'],
  ['😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛'],
  ['🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣'],
  ['😮', '😯', '😲', '😳', '🤯', '😱', '😨', '😰'],
  ['😢', '😭', '😤', '😡', '🤬', '🤮', '🤢', '😵'],
  ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙'],
  ['👏', '🙌', '👐', '🤲', '🙏', '💪', '✊', '👊'],
  ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔'],
];

const ReactionSheet = ({ visible, message, onClose, onReact }) => {
  if (!visible || !message) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={e => e.stopPropagation()}>
          {/* Message Preview */}
          <View style={styles.messagePreview}>
            <Text style={styles.previewText} numberOfLines={2}>
              {message.text}
            </Text>
          </View>

          {/* Quick Reactions */}
          <View style={styles.quickReactions}>
            {QUICK_REACTIONS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionButton}
                onPress={() => {
                  onReact(emoji);
                  onClose();
                }}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* All Reactions */}
          <ScrollView
            style={styles.allReactionsContainer}
            showsVerticalScrollIndicator={false}
          >
            {ALL_REACTIONS.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.reactionRow}>
                {row.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reactionButton}
                    onPress={() => {
                      onReact(emoji);
                      onClose();
                    }}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 16,
    maxHeight: '70%',
  },
  messagePreview: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  quickReactions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  allReactionsContainer: {
    maxHeight: 300,
  },
  reactionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  reactionButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});

// ✅ IMPORTANT: Export the component!
export default ReactionSheet;