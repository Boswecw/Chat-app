// src/components/LoadingStates.js - Professional Loading Components
import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions,
  ActivityIndicator 
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// =====================================
// SHIMMER ANIMATION
// =====================================

const ShimmerEffect = ({ children, isLoading = true }) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading) return;

    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );

    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [isLoading, shimmerValue]);

  if (!isLoading) {
    return children;
  }

  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View style={styles.shimmerContainer}>
      {children}
      <Animated.View
        style={[
          styles.shimmerOverlay,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

// =====================================
// SKELETON COMPONENTS
// =====================================

export const SkeletonBox = ({ width, height, borderRadius = 4, style = {} }) => (
  <View
    style={[
      styles.skeletonBox,
      { width, height, borderRadius },
      style,
    ]}
  />
);

export const SkeletonText = ({ width = '100%', height = 16, style = {} }) => (
  <SkeletonBox width={width} height={height} borderRadius={8} style={style} />
);

export const SkeletonCircle = ({ size = 32 }) => (
  <SkeletonBox 
    width={size} 
    height={size} 
    borderRadius={size / 2} 
  />
);

// =====================================
// MESSAGE SKELETON
// =====================================

export const MessageSkeleton = ({ isOwnMessage = false, showAvatar = true }) => (
  <ShimmerEffect>
    <View style={[
      styles.messageSkeletonContainer,
      isOwnMessage ? styles.ownMessageSkeleton : styles.otherMessageSkeleton
    ]}>
      {/* Avatar for other messages */}
      {!isOwnMessage && showAvatar && (
        <SkeletonCircle size={32} />
      )}
      
      {/* Message bubble */}
      <View style={[
        styles.messageSkeletonBubble,
        isOwnMessage ? styles.ownBubbleSkeleton : styles.otherBubbleSkeleton
      ]}>
        {/* Username for first message in group */}
        {!isOwnMessage && showAvatar && (
          <SkeletonText width="40%" height={12} style={{ marginBottom: 6 }} />
        )}
        
        {/* Message text lines */}
        <SkeletonText width="90%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonText width="60%" height={16} style={{ marginBottom: 4 }} />
        
        {/* Timestamp */}
        <SkeletonText width="25%" height={10} style={{ marginTop: 4 }} />
      </View>
      
      {/* Spacer for own messages */}
      {isOwnMessage && <View style={{ width: 40 }} />}
    </View>
  </ShimmerEffect>
);

// =====================================
// MESSAGES LIST SKELETON
// =====================================

export const MessagesListSkeleton = ({ count = 8 }) => (
  <View style={styles.messagesListSkeleton}>
    {Array.from({ length: count }, (_, index) => {
      const isOwnMessage = Math.random() > 0.6; // 40% chance of own message
      const showAvatar = index === 0 || Math.random() > 0.7; // Simulate grouping
      
      return (
        <MessageSkeleton
          key={index}
          isOwnMessage={isOwnMessage}
          showAvatar={showAvatar}
        />
      );
    })}
  </View>
);

// =====================================
// PARTICIPANT SKELETON
// =====================================

export const ParticipantSkeleton = () => (
  <ShimmerEffect>
    <View style={styles.participantSkeleton}>
      <SkeletonCircle size={40} />
      <View style={styles.participantSkeletonInfo}>
        <SkeletonText width="70%" height={16} style={{ marginBottom: 4 }} />
        <SkeletonText width="50%" height={12} />
      </View>
      <SkeletonBox width={8} height={8} borderRadius={4} />
    </View>
  </ShimmerEffect>
);

// =====================================
// TYPING INDICATOR
// =====================================

export const TypingIndicator = ({ participants = ['Someone'] }) => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDots = () => {
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ]).start();
      
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 200);
      
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]).start();
      }, 400);
    };

    const interval = setInterval(animateDots, 1200);
    animateDots(); // Start immediately

    return () => clearInterval(interval);
  }, [dot1, dot2, dot3]);

  const participantText = participants.length === 1 
    ? `${participants[0]} is typing...`
    : `${participants.length} people are typing...`;

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Text style={styles.typingText}>{participantText}</Text>
        <View style={styles.typingDots}>
          <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
          <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
        </View>
      </View>
    </View>
  );
};

// =====================================
// LOADING OVERLAYS
// =====================================

export const LoadingOverlay = ({ visible, message = 'Loading...' }) => {
  if (!visible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingMessage}>{message}</Text>
      </View>
    </View>
  );
};

export const PullToRefreshIndicator = ({ refreshing }) => {
  if (!refreshing) return null;

  return (
    <View style={styles.pullToRefreshContainer}>
      <ActivityIndicator size="small" color="#007AFF" />
      <Text style={styles.pullToRefreshText}>Updating messages...</Text>
    </View>
  );
};

// =====================================
// EMPTY STATES
// =====================================

export const EmptyMessagesState = ({ onRefresh }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateEmoji}>💬</Text>
    <Text style={styles.emptyStateTitle}>No messages yet</Text>
    <Text style={styles.emptyStateSubtitle}>
      Start a conversation by sending the first message!
    </Text>
    {onRefresh && (
      <TouchableOpacity style={styles.emptyStateButton} onPress={onRefresh}>
        <Text style={styles.emptyStateButtonText}>Refresh</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const ConnectionErrorState = ({ onRetry, error }) => (
  <View style={styles.errorState}>
    <Text style={styles.errorStateEmoji}>📡</Text>
    <Text style={styles.errorStateTitle}>Connection Problem</Text>
    <Text style={styles.errorStateSubtitle}>
      {error?.message || 'Unable to connect to the server'}
    </Text>
    <TouchableOpacity style={styles.errorStateButton} onPress={onRetry}>
      <Text style={styles.errorStateButtonText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

// =====================================
// SENDING MESSAGE INDICATOR
// =====================================

export const SendingMessageIndicator = ({ visible }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View style={[styles.sendingIndicator, { opacity }]}>
      <ActivityIndicator size="small" color="#007AFF" />
      <Text style={styles.sendingText}>Sending...</Text>
    </Animated.View>
  );
};

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  // Shimmer Effect
  shimmerContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: screenWidth,
  },

  // Skeleton Base
  skeletonBox: {
    backgroundColor: '#E1E9EE',
    overflow: 'hidden',
  },

  // Message Skeleton
  messageSkeletonContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessageSkeleton: {
    justifyContent: 'flex-end',
  },
  otherMessageSkeleton: {
    justifyContent: 'flex-start',
  },
  messageSkeletonBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 8,
  },
  ownBubbleSkeleton: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-end',
  },
  otherBubbleSkeleton: {
    backgroundColor: '#F8F8F8',
    alignSelf: 'flex-start',
  },

  // Messages List Skeleton
  messagesListSkeleton: {
    padding: 16,
  },

  // Participant Skeleton
  participantSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  participantSkeletonInfo: {
    flex: 1,
    marginLeft: 12,
  },

  // Typing Indicator
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '75%',
  },
  typingText: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  typingDots: {
    flexDirection: 'row',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999999',
    marginHorizontal: 1,
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingMessage: {
    marginTop: 12,
    fontSize: 16,
    color: '#333333',
  },

  // Pull to Refresh
  pullToRefreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  pullToRefreshText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
  },

  // Empty States
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error States
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorStateSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorStateButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Sending Indicator
  sendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 16,
    margin: 8,
  },
  sendingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
});

export default {
  ShimmerEffect,
  SkeletonBox,
  SkeletonText,
  SkeletonCircle,
  MessageSkeleton,
  MessagesListSkeleton,
  ParticipantSkeleton,
  TypingIndicator,
  LoadingOverlay,
  PullToRefreshIndicator,
  EmptyMessagesState,
  ConnectionErrorState,
  SendingMessageIndicator,
};