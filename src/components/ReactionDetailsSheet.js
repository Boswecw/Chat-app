// src/components/ReactionDetailsSheet.js - Enhanced Reaction Details
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import useParticipantStore from '../stores/participantStore';

const { height: screenHeight } = Dimensions.get('window');
const SHEET_HEIGHT = screenHeight * 0.6;

// =====================================
// AVATAR COMPONENT
// =====================================

const Avatar = ({ participant, size = 32 }) => {
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (uuid) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const index = uuid ? uuid.length % colors.length : 0;
    return colors[index];
  };

  return (
    <View style={[
      styles.avatar, 
      { 
        width: size, 
        height: size, 
        backgroundColor: getAvatarColor(participant?.uuid),
        borderRadius: size / 2 
      }
    ]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
        {getInitials(participant?.name)}
      </Text>
    </View>
  );
};

// =====================================
// REACTION TAB COMPONENT
// =====================================

const ReactionTab = ({ emoji, count, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.reactionTab, isActive && styles.reactionTabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.reactionTabEmoji}>{emoji}</Text>
    <Text style={[
      styles.reactionTabCount,
      isActive && styles.reactionTabCountActive
    ]}>
      {count}
    </Text>
  </TouchableOpacity>
);

// =====================================
// PARTICIPANT ROW COMPONENT
// =====================================

const ParticipantRow = ({ participant, timestamp, onParticipantPress }) => {
  const timeAgo = useMemo(() => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }, [timestamp]);

  return (
    <TouchableOpacity
      style={styles.participantRow}
      onPress={() => onParticipantPress?.(participant)}
      activeOpacity={0.7}
    >
      <Avatar participant={participant} size={40} />
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>
          {participant?.name || 'Unknown User'}
        </Text>
        {participant?.title && (
          <Text style={styles.participantTitle}>{participant.title}</Text>
        )}
      </View>
      {timeAgo && (
        <Text style={styles.reactionTime}>{timeAgo}</Text>
      )}
    </TouchableOpacity>
  );
};

// =====================================
// MAIN BOTTOM SHEET COMPONENT
// =====================================

export const ReactionDetailsSheet = ({
  visible,
  onClose,
  message,
  onParticipantPress,
  onRemoveReaction,
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // Get participant data
  const getParticipant = useParticipantStore(state => state.getParticipant);

  // Process reaction data
  const reactionData = useMemo(() => {
    if (!message?.reactions || !Array.isArray(message.reactions)) {
      return { tabs: [], participants: [], totalCount: 0 };
    }

    // Group reactions by emoji
    const reactionMap = new Map();
    const allParticipants = [];

    message.reactions.forEach((reaction, index) => {
      const emoji = reaction.emoji || reaction.type || '👍';
      const participants = reaction.participants || [];
      const timestamp = reaction.timestamp || message.createdAt;

      // Add to emoji groups
      if (reactionMap.has(emoji)) {
        const existing = reactionMap.get(emoji);
        reactionMap.set(emoji, {
          ...existing,
          count: existing.count + (reaction.count || participants.length),
          participants: [...existing.participants, ...participants]
        });
      } else {
        reactionMap.set(emoji, {
          emoji,
          count: reaction.count || participants.length,
          participants: [...participants],
          timestamp
        });
      }

      // Add to all participants list
      participants.forEach(participantUuid => {
        const participant = getParticipant(participantUuid);
        allParticipants.push({
          participant: participant || { uuid: participantUuid, name: 'Unknown User' },
          emoji,
          timestamp,
          reactionIndex: index
        });
      });
    });

    // Create tabs
    const tabs = [
      { 
        id: 'all', 
        emoji: '👥', 
        count: allParticipants.length,
        label: 'All' 
      },
      ...Array.from(reactionMap.values()).map(reaction => ({
        id: reaction.emoji,
        emoji: reaction.emoji,
        count: reaction.count,
        participants: reaction.participants
      }))
    ];

    return {
      tabs,
      participants: allParticipants,
      reactionMap,
      totalCount: allParticipants.length
    };
  }, [message?.reactions, message?.createdAt, getParticipant]);

  // Filter participants based on active tab
  const filteredParticipants = useMemo(() => {
    if (activeTab === 'all') {
      return reactionData.participants;
    }
    return reactionData.participants.filter(p => p.emoji === activeTab);
  }, [reactionData.participants, activeTab]);

  // =====================================
  // ANIMATION SETUP
  // =====================================

  useEffect(() => {
    if (visible) {
      setActiveTab('all'); // Reset to 'all' tab when opening
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  // =====================================
  // PAN GESTURE HANDLING
  // =====================================

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward swipes
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > SHEET_HEIGHT * 0.3) {
          // Close if swiped down more than 30%
          onClose();
        } else {
          // Snap back to open position
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // =====================================
  // HANDLERS
  // =====================================

  const handleTabPress = (tabId) => {
    setActiveTab(tabId);
  };

  const handleParticipantPress = (participant) => {
    onParticipantPress?.(participant);
  };

  const handleRemoveMyReaction = (emoji) => {
    if (onRemoveReaction) {
      onRemoveReaction(message.uuid, emoji);
    }
  };

  const handleBackdropPress = () => {
    onClose();
  };

  // Don't render if no reactions
  if (!message?.reactions || reactionData.totalCount === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View 
        style={[styles.backdrop, { opacity: backdropOpacity }]}
      >
        <TouchableOpacity 
          style={styles.backdropTouchable}
          onPress={handleBackdropPress}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {reactionData.totalCount} {reactionData.totalCount === 1 ? 'Reaction' : 'Reactions'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {reactionData.tabs.map((tab) => (
              <ReactionTab
                key={tab.id}
                emoji={tab.emoji}
                count={tab.count}
                isActive={activeTab === tab.id}
                onPress={() => handleTabPress(tab.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Participants List */}
        <ScrollView 
          style={styles.participantsList}
          showsVerticalScrollIndicator={false}
        >
          {filteredParticipants.length > 0 ? (
            filteredParticipants.map((item, index) => (
              <View key={`${item.participant.uuid}-${item.emoji}-${index}`}>
                <ParticipantRow
                  participant={item.participant}
                  timestamp={item.timestamp}
                  onParticipantPress={handleParticipantPress}
                />
                
                {/* Show remove option for current user's reactions */}
                {item.participant.uuid === 'you' && (
                  <TouchableOpacity
                    style={styles.removeReactionButton}
                    onPress={() => handleRemoveMyReaction(item.emoji)}
                  >
                    <Text style={styles.removeReactionText}>
                      Remove {item.emoji} reaction
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No reactions found for {activeTab === 'all' ? 'this message' : `${activeTab}`}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Message Preview */}
        <View style={styles.messagePreview}>
          <Text style={styles.messagePreviewLabel}>Message:</Text>
          <Text style={styles.messagePreviewText} numberOfLines={2}>
            {message.text || 'No text content'}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
};

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666666',
  },
  
  // Tabs
  tabContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabScrollContent: {
    paddingHorizontal: 20,
  },
  reactionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reactionTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  reactionTabEmoji: {
    fontSize: 16,
    marginRight: 4,
  },
  reactionTabCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  reactionTabCountActive: {
    color: '#FFFFFF',
  },

  // Participants
  participantsList: {
    flex: 1,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  participantTitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  reactionTime: {
    fontSize: 12,
    color: '#999999',
  },
  removeReactionButton: {
    marginLeft: 72,
    marginRight: 20,
    marginBottom: 8,
    paddingVertical: 4,
  },
  removeReactionText: {
    fontSize: 14,
    color: '#FF3B30',
  },

  // Avatar
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },

  // Message Preview
  messagePreview: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  messagePreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  messagePreviewText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 18,
  },
});

export default ReactionDetailsSheet;