// src/screens/ChatScreen.jsx - Fixed ESLint issues version
import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import { 
  FlatList, 
  View, 
  StyleSheet, 
  RefreshControl, 
  Text, 
  Alert,
  AccessibilityInfo,
  ActivityIndicator,
  TouchableOpacity,
  AppState
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Store imports
import useMessageStore from '../state/messageStore';
import useParticipantStore from '../state/participantStore';
import useSessionStore from '../state/sessionStore';

// API imports
import { fetchLatestMessages, sendReaction } from '../api/messages';

// Utility imports
import { groupMessages } from '../utils/groupMessages';

// Hook imports
import useChatSync from '../hooks/useChatSync';
import { useAsyncOperation } from '../hooks/useAsyncOperation';

// Component imports
import MessageGroup from '../components/MessageGroup';
import MessageInput from '../components/MessageInput';
import BottomSheet from '../components/BottomSheet';

// Constants imports
import colors from '../constants/colors';

// Utility functions
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Request queue for preventing 409 conflicts
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 1; // Prevent concurrent requests
  }

  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject, timestamp: Date.now() });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const { request, resolve, reject } = this.queue.shift();
    
    try {
      const result = await request();
      resolve(result);
    } catch (error) {
      // Handle 409 conflicts gracefully
      if (error.response?.status === 409) {
        console.warn('Request conflict detected, retrying...', error.message);
        // Add back to queue for retry with delay
        setTimeout(() => {
          this.queue.unshift({ request, resolve, reject, timestamp: Date.now() });
          this.processing = false;
          this.process();
        }, 1000);
        return;
      }
      reject(error);
    } finally {
      this.processing = false;
      // Small delay to prevent rapid-fire requests
      setTimeout(() => this.process(), 100);
    }
  }

  clear() {
    this.queue = [];
    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

// Constants
const ITEM_APPROXIMATE_HEIGHT = 100;
const SCROLL_DEBOUNCE_MS = 300;
const REACTION_THROTTLE_MS = 1000;
const REFRESH_THROTTLE_MS = 2000;

// Enhanced ErrorBoundary with 409 error handling
class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      retryCount: 0,
      lastError: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Track development server issues
    if (__DEV__) {
      if (error.message?.includes('Network request failed') || 
          error.message?.includes('409') ||
          error.message?.includes('createEntryFileAsync')) {
        console.warn('🚨 Development server issue detected - consider restarting');
        console.warn('Common causes: Rapid re-renders, concurrent requests, or Metro bundler conflicts');
      }
    }

    // Auto-recovery for certain errors
    if (this.state.retryCount < 3 && this.shouldAutoRecover(error)) {
      setTimeout(() => {
        this.setState(prevState => ({ 
          hasError: false, 
          error: null,
          retryCount: prevState.retryCount + 1 
        }));
      }, 2000);
    }
  }

  shouldAutoRecover(error) {
    const recoverableErrors = [
      'Network request failed',
      'Connection timeout',
      '409',
      'Request conflict'
    ];
    return recoverableErrors.some(msg => error.message?.includes(msg));
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {__DEV__ && this.state.error?.message ? 
              `Dev Error: ${this.state.error.message}` : 
              'Please try refreshing the app'
            }
          </Text>
          {this.state.retryCount < 3 && (
            <Text style={styles.errorHint}>
              Auto-retry in progress... ({this.state.retryCount}/3)
            </Text>
          )}
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={this.handleRetry}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// Memoized components for performance
const MemoizedMessageGroup = memo(MessageGroup, (prevProps, nextProps) => {
  return (
    prevProps.group.uuid === nextProps.group.uuid &&
    prevProps.group.messages?.length === nextProps.group.messages?.length &&
    JSON.stringify(prevProps.group.reactions) === JSON.stringify(nextProps.group.reactions)
  );
});

// Add display name for debugging
MemoizedMessageGroup.displayName = 'MemoizedMessageGroup';

const ConnectionBanner = memo(({ status, onRetry }) => {
  if (status === 'connected') return null;
  
  return (
    <View style={styles.connectionBanner}>
      <Text style={styles.connectionText}>
        {status === 'disconnected' ? '⚠️ Connection lost. Trying to reconnect...' : 'Syncing messages...'}
      </Text>
      {status === 'disconnected' && (
        <TouchableOpacity onPress={onRetry} style={styles.retryTextContainer}>
          <Text style={styles.retryText}>Pull down to refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// Add display name for debugging
ConnectionBanner.displayName = 'ConnectionBanner';

const ChatScreen = () => {
  // Zustand store hooks
  const { 
    messages, 
    setMessages, 
    addReactionOptimistic, 
    confirmReaction, 
    revertReaction,
    clearStaleOptimisticUpdates 
  } = useMessageStore();
  
  const { participants } = useParticipantStore();
  const { sessionUuid } = useSessionStore();

  // Local state with better organization
  const [state, setState] = useState({
    refreshing: false,
    loadingOlder: false,
    hasMoreMessages: true,
    connectionStatus: 'connected',
    syncError: null
  });
  
  const [bottomSheets, setBottomSheets] = useState({
    reaction: { visible: false, messageId: null, reaction: null },
    participant: { visible: false, participant: null }
  });

  // Refs for performance optimization
  const flatListRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const lastScrollRef = useRef(0);
  const isScrollingRef = useRef(false);

  // Custom hooks
  const { isSyncing: syncLoading } = useChatSync();
  const { execute: executeReactionOperation } = useAsyncOperation();
  const { execute: executeSyncOperation } = useAsyncOperation();

  // Create scroll function without debounce first
  const scrollToBottomBase = useCallback((animated = true) => {
    if (flatListRef.current && !isScrollingRef.current) {
      const now = Date.now();
      if (now - lastScrollRef.current < SCROLL_DEBOUNCE_MS) return;
      
      lastScrollRef.current = now;
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated });
        } catch (error) {
          console.warn('Failed to scroll to bottom:', error);
        }
      }, 50);
    }
  }, []);

  // Create debounced version using useMemo to avoid recreation
  const debouncedScrollToBottom = useMemo(
    () => debounce(scrollToBottomBase, SCROLL_DEBOUNCE_MS),
    [scrollToBottomBase]
  );

  // Optimized message processing with useMemo
  const processedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    try {
      const grouped = groupMessages(messages, participants);
      return [...grouped].reverse(); // Newest at bottom
    } catch (error) {
      console.error('Error processing messages:', error);
      return [];
    }
  }, [messages, participants]);

  // Enhanced refresh handler with request queueing
  const performRefresh = useCallback(async () => {
    if (state.refreshing) return;

    setState(prev => ({ ...prev, refreshing: true, syncError: null }));
    
    try {
      await executeSyncOperation(
        async () => {
          return await requestQueue.add(() => fetchLatestMessages());
        },
        (result) => {
          setMessages(result);
          setState(prev => ({ ...prev, connectionStatus: 'connected' }));
          
          AccessibilityInfo.announceForAccessibility(
            `Loaded ${result.length} messages`
          );
        },
        (error) => {
          console.error('Failed to refresh messages:', error);
          setState(prev => ({ 
            ...prev, 
            syncError: error, 
            connectionStatus: 'disconnected' 
          }));
          
          if (error.response?.status !== 409) {
            Alert.alert(
              'Connection Error',
              'Unable to refresh messages. Please check your internet connection.',
              [
                { text: 'OK' },
                { text: 'Retry', onPress: () => performRefresh() }
              ]
            );
          }
        }
      );
    } catch (error) {
      console.error('Refresh operation failed:', error);
    } finally {
      setState(prev => ({ ...prev, refreshing: false }));
    }
  }, [state.refreshing, executeSyncOperation, setMessages]);

  // Create throttled refresh function
  const throttledRefresh = useMemo(
    () => throttle(performRefresh, REFRESH_THROTTLE_MS),
    [performRefresh]
  );

  // Performance-optimized effect for auto-scroll
  useEffect(() => {
    const currentCount = processedMessages.length;
    const prevCount = prevMessageCountRef.current;
    
    if (currentCount > prevCount && prevCount > 0) {
      // New message - scroll with animation
      debouncedScrollToBottom(true);
    } else if (currentCount > 0 && prevCount === 0) {
      // Initial load - scroll without animation
      debouncedScrollToBottom(false);
    }
    
    prevMessageCountRef.current = currentCount;
  }, [processedMessages.length, debouncedScrollToBottom]);

  // App state handling
  const handleAppStateChange = useCallback((nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - gentle refresh
      if (sessionUuid && processedMessages.length > 0) {
        performRefresh();
      }
    }
    appStateRef.current = nextAppState;
  }, [sessionUuid, processedMessages.length, performRefresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [handleAppStateChange]);

  // Enhanced reaction handler with throttling
  const handleReactBase = useCallback(async (messageId, emoji) => {
    try {
      // Prevent reactions on temporary messages
      if (messageId.startsWith('temp-')) {
        Alert.alert(
          'Message Still Sending', 
          'Please wait for the message to be sent before adding reactions.'
        );
        return;
      }

      // Optimistic update
      const optimisticId = addReactionOptimistic(messageId, emoji, 'you');
      
      await executeReactionOperation(
        async () => {
          return await requestQueue.add(() => sendReaction(messageId, emoji, true));
        },
        (response) => {
          confirmReaction(optimisticId, response);
          AccessibilityInfo.announceForAccessibility(`Added ${emoji} reaction`);
        },
        (error) => {
          revertReaction(optimisticId);
          
          if (error.response?.status === 409) {
            console.warn('Reaction request conflict - will retry automatically');
            return; // Don't show error for 409s
          }
          
          console.error('Failed to send reaction:', error);
          Alert.alert(
            'Failed to Add Reaction',
            'Please try again.',
            [
              { 
                text: 'Retry', 
                onPress: () => handleReactBase(messageId, emoji) 
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      );
    } catch (error) {
      console.error('Reaction error:', error);
    }
  }, [addReactionOptimistic, executeReactionOperation, confirmReaction, revertReaction]);

  // Create throttled version using useMemo
  const handleReact = useMemo(
    () => throttle(handleReactBase, REACTION_THROTTLE_MS),
    [handleReactBase]
  );

  // Optimized handlers
  const handleReactionPress = useCallback((messageId, reaction) => {
    setBottomSheets(prev => ({
      ...prev,
      reaction: { visible: true, messageId, reaction }
    }));
    
    AccessibilityInfo.announceForAccessibility(
      `Showing ${reaction.emoji} reaction details`
    );
  }, []);

  const handleParticipantPress = useCallback((participant) => {
    setBottomSheets(prev => ({
      ...prev,
      participant: { visible: true, participant }
    }));
    
    AccessibilityInfo.announceForAccessibility(
      `Showing details for ${participant.name}`
    );
  }, []);

  const closeBottomSheets = useCallback(() => {
    setBottomSheets({
      reaction: { visible: false, messageId: null, reaction: null },
      participant: { visible: false, participant: null }
    });
  }, []);

  // FlatList optimization callbacks
  const keyExtractor = useCallback((item, index) => {
    return item.uuid || `message-group-${index}`;
  }, []);

  const renderItem = useCallback(({ item, index }) => (
    <MemoizedMessageGroup 
      group={item} 
      onReact={handleReact}
      onReactionPress={handleReactionPress}
      onParticipantPress={handleParticipantPress}
      index={index}
    />
  ), [handleReact, handleReactionPress, handleParticipantPress]);

  const getItemLayout = useCallback((data, index) => ({
    length: ITEM_APPROXIMATE_HEIGHT,
    offset: ITEM_APPROXIMATE_HEIGHT * index,
    index,
  }), []);

  const handleScrollBeginDrag = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    isScrollingRef.current = false;
  }, []);

  // Focus effect with cleanup
  useFocusEffect(
    useCallback(() => {
      if (sessionUuid && processedMessages.length === 0) {
        throttledRefresh();
      }
      
      // Cleanup stale optimistic updates
      clearStaleOptimisticUpdates();
      
      return () => {
        // Clear timeouts and queues
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        requestQueue.clear();
      };
    }, [sessionUuid, processedMessages.length, throttledRefresh, clearStaleOptimisticUpdates])
  );

  // Cleanup debounced/throttled functions on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending debounced calls
      if (debouncedScrollToBottom.cancel) {
        debouncedScrollToBottom.cancel();
      }
    };
  }, [debouncedScrollToBottom]);

  // Empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Welcome to the chat!</Text>
      <Text style={styles.emptyStateSubtitle}>
        Start a conversation by sending your first message below.
      </Text>
    </View>
  ), []);

  // Connection Banner component with proper dependencies
  const connectionBannerOnRetry = useCallback(() => {
    performRefresh();
  }, [performRefresh]);

  // Error state with proper dependencies  
  const renderErrorState = useCallback(() => {
    if (!state.syncError) return null;
    
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>Unable to load messages</Text>
        <Text style={styles.errorMessage}>
          {state.syncError?.message || 'Something went wrong while loading messages.'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={performRefresh}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }, [state.syncError, performRefresh]);

  return (
    <EnhancedErrorBoundary>
      <SafeAreaView style={styles.container}>
        <View style={styles.chatContainer}>
          {/* Connection status */}
          <ConnectionBanner 
            status={state.connectionStatus} 
            onRetry={connectionBannerOnRetry}
          />
          
          {/* Sync loading indicator */}
          {syncLoading && (
            <View style={styles.syncBanner}>
              <ActivityIndicator size="small" color={colors.background} />
              <Text style={styles.syncText}>Syncing messages...</Text>
            </View>
          )}
          
          {/* Error state */}
          {renderErrorState()}
          
          {/* Messages list */}
          <FlatList
            ref={flatListRef}
            data={processedMessages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={100}
            windowSize={8}
            initialNumToRender={12}
            
            // Scroll handling
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onContentSizeChange={() => debouncedScrollToBottom(false)}
            onLayout={() => debouncedScrollToBottom(false)}
            
            // Pull to refresh
            refreshControl={
              <RefreshControl
                refreshing={state.refreshing}
                onRefresh={throttledRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            
            // Empty state
            ListEmptyComponent={renderEmptyState}
            
            // Styling
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContent,
              processedMessages.length === 0 && styles.messagesContentEmpty
            ]}
            
            // Accessibility
            accessible={true}
            accessibilityRole="list"
            accessibilityLabel="Chat messages"
          />
          
          {/* Message Input */}
          <MessageInput />
          
          {/* Bottom Sheets */}
          <BottomSheet
            visible={bottomSheets.reaction.visible}
            onClose={closeBottomSheets}
            title="Reaction Details"
          >
            {/* Reaction details content */}
          </BottomSheet>
          
          <BottomSheet
            visible={bottomSheets.participant.visible}
            onClose={closeBottomSheets}
            title="Participant Details"
          >
            {/* Participant details content */}
          </BottomSheet>
        </View>
      </SafeAreaView>
    </EnhancedErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  messagesContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  connectionBanner: {
    backgroundColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  connectionText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  retryTextContainer: {
    marginTop: 4,
  },
  retryText: {
    color: colors.background,
    fontSize: 12,
    opacity: 0.8,
  },
  syncBanner: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncText: {
    color: colors.background,
    fontSize: 12,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    backgroundColor: colors.error.background,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.error.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorHint: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ChatScreen;