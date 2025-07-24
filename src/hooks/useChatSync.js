// src/hooks/useChatSync.js - Optimized version to prevent 409 conflicts
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { AppState } from 'react-native';

// API imports
import { fetchServerInfo } from '../api/info';
import { fetchUpdatedMessages } from '../api/messages';
import { fetchAllParticipants, fetchUpdatedParticipants } from '../api/participants';

// Store imports
import useMessageStore from '../state/messageStore';
import useParticipantStore from '../state/participantStore';
import useSessionStore from '../state/sessionStore';

// Utils
import { debounce, throttle, createRequestDeduplicator } from '../utils/debounce';

// Optimized sync intervals to reduce server load
const SYNC_INTERVALS = {
  ACTIVE: 30000,     // 30 seconds when app is active (reduced from 8s)
  BACKGROUND: 120000, // 2 minutes when app is backgrounded (increased from 30s)
  IDLE: 300000,      // 5 minutes when no user activity (increased from 60s)
  RETRY_BASE: 5000,  // Base retry delay
  RETRY_MAX: 60000,  // Maximum retry delay
};

const MAX_RETRY_ATTEMPTS = 5; // Increased for better resilience
const ACTIVITY_TIMEOUT = 60000; // Consider idle after 1 minute of no activity

const useChatSync = () => {
  // State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs for managing sync state
  const syncInProgress = useRef(false);
  const isMountedRef = useRef(true);
  const syncTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);
  const lastSyncAttempt = useRef(0);
  const consecutiveErrors = useRef(0);
  
  // Request deduplication
  const requestDeduplicator = useRef(createRequestDeduplicator());
  
  // Store actions
  const { setMessages, updateMessage } = useMessageStore();
  const { setParticipants, updateParticipant, clearParticipants } = useParticipantStore();
  const { sessionUuid, lastUpdateTime, setSession, setLastUpdateTime, clearSession } = useSessionStore();

  // Activity tracking - create base function first
  const updateActivityBase = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Create debounced version using useMemo
  const updateActivity = useMemo(
    () => debounce(updateActivityBase, 1000),
    [updateActivityBase]
  );

  // Reset application state
  const resetAppState = useCallback(() => {
    console.log('🔄 Resetting application state...');
    setMessages([]);
    clearParticipants();
    clearSession();
    setSyncError(null);
    setRetryCount(0);
    consecutiveErrors.current = 0;
    // Copy ref to variable to avoid ESLint warning
    const deduplicator = requestDeduplicator.current;
    if (deduplicator) {
      deduplicator.clear();
    }
  }, [setMessages, clearParticipants, clearSession]);

  // Calculate exponential backoff delay
  const getRetryDelay = useCallback((attempt) => {
    const baseDelay = SYNC_INTERVALS.RETRY_BASE;
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt),
      SYNC_INTERVALS.RETRY_MAX
    );
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }, []);

  // Enhanced error handling
  const handleSyncError = useCallback((error, context = 'sync') => {
    console.error(`❌ ${context} error:`, error);
    
    consecutiveErrors.current += 1;
    setSyncError(error);
    
    // Handle specific error types
    if (error.response?.status === 409) {
      console.warn('🔄 Conflict detected - will retry with exponential backoff');
      // Don't increment retry count for 409s, they're usually transient
      return true; // Indicate we should retry
    }
    
    if (error.response?.status >= 500 && error.response?.status < 600) {
      console.warn('🚨 Server error detected - reducing sync frequency');
      return true; // Server errors are usually temporary
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network request failed')) {
      console.warn('📡 Network error - will retry when connection improves');
      return true;
    }
    
    // For client errors (4xx), don't retry as aggressively
    if (error.response?.status >= 400 && error.response?.status < 500) {
      console.warn('⚠️ Client error - may need user intervention');
      return false;
    }
    
    return true; // Default to retrying
  }, []);

  // Session change handler with deduplication
  const handleSessionChange = useCallback(async (newSessionInfo) => {
    const dedupeKey = `session-${newSessionInfo.sessionUuid}`;
    
    // Copy ref to variable to avoid ESLint warning
    const deduplicator = requestDeduplicator.current;
    if (!deduplicator) return;
    
    return deduplicator.deduplicate(dedupeKey, async () => {
      console.log('🔁 Session UUID changed — resetting state...');
      resetAppState();
      setSession(newSessionInfo);

      try {
        const allParticipants = await fetchAllParticipants();
        if (isMountedRef.current) {
          setParticipants(allParticipants);
          console.log('✅ Participants loaded for new session');
        }
      } catch (err) {
        handleSyncError(err, 'participants fetch');
      }
    });
  }, [resetAppState, setSession, setParticipants, handleSyncError]);

  // Optimized batch updates with error resilience
  const performBatchUpdates = useCallback(async (lastUpdate) => {
    const dedupeKey = `batch-${lastUpdate}`;
    
    // Copy ref to variable to avoid ESLint warning
    const deduplicator = requestDeduplicator.current;
    if (!deduplicator) return;
    
    return deduplicator.deduplicate(dedupeKey, async () => {
      try {
        // Use Promise.allSettled to handle partial failures gracefully
        const results = await Promise.allSettled([
          fetchUpdatedMessages(lastUpdate),
          fetchUpdatedParticipants(lastUpdate)
        ]);

        // Only proceed if component is still mounted
        if (!isMountedRef.current) return;

        // Process messages result
        const messagesResult = results[0];
        if (messagesResult.status === 'fulfilled' && messagesResult.value.length > 0) {
          console.log(`📥 Updating ${messagesResult.value.length} messages`);
          messagesResult.value.forEach(message => {
            updateMessage(message);
          });
        } else if (messagesResult.status === 'rejected') {
          handleSyncError(messagesResult.reason, 'messages update');
        }

        // Process participants result
        const participantsResult = results[1];
        if (participantsResult.status === 'fulfilled' && participantsResult.value.length > 0) {
          console.log(`👥 Updating ${participantsResult.value.length} participants`);
          participantsResult.value.forEach(participant => {
            updateParticipant(participant);
          });
        } else if (participantsResult.status === 'rejected') {
          handleSyncError(participantsResult.reason, 'participants update');
        }

        // Update timestamp only if at least one operation succeeded
        if (messagesResult.status === 'fulfilled' || participantsResult.status === 'fulfilled') {
          setLastUpdateTime(Date.now());
          consecutiveErrors.current = 0; // Reset error count on success
          setSyncError(null);
          setRetryCount(0);
        }
        
      } catch (err) {
        console.error('❌ Unexpected error during batch updates:', err);
        throw err;
      }
    });
  }, [updateMessage, updateParticipant, setLastUpdateTime, handleSyncError]);

  // Intelligent sync interval calculation
  const getCurrentSyncInterval = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const currentAppState = appStateRef.current;
    
    // Base interval based on app state
    let interval = SYNC_INTERVALS.ACTIVE;
    
    if (currentAppState === 'background') {
      interval = SYNC_INTERVALS.BACKGROUND;
    } else if (timeSinceActivity > ACTIVITY_TIMEOUT) {
      interval = SYNC_INTERVALS.IDLE;
    }
    
    // Increase interval if we're having consecutive errors
    if (consecutiveErrors.current > 0) {
      interval *= Math.min(consecutiveErrors.current, 5); // Cap multiplier at 5x
    }
    
    return interval;
  }, []);

  // Throttled sync function - create base function first
  const performSyncBase = useCallback(async () => {
    // Prevent overlapping syncs
    if (syncInProgress.current || !isMountedRef.current) return;
    
    // Rate limiting - don't sync too frequently
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncAttempt.current;
    const minInterval = Math.min(getCurrentSyncInterval() / 4, 10000); // At least 10s between attempts
    
    if (timeSinceLastSync < minInterval) {
      console.log(`⏱️ Sync rate limited - waiting ${minInterval - timeSinceLastSync}ms`);
      return;
    }
    
    lastSyncAttempt.current = now;
    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      // Check server info first (lightweight operation)
      const serverInfo = await fetchServerInfo();
      
      if (!isMountedRef.current) return;

      // Handle session changes
      if (sessionUuid && sessionUuid !== serverInfo.sessionUuid) {
        await handleSessionChange(serverInfo);
        return; // Early return after session change
      }

      // Set session if not already set
      if (!sessionUuid) {
        setSession(serverInfo);
        return; // Let next sync handle the actual data fetching
      }

      // Perform batch updates if we have a lastUpdateTime
      if (lastUpdateTime) {
        await performBatchUpdates(lastUpdateTime);
      }

    } catch (error) {
      if (!isMountedRef.current) return;
      
      const shouldRetry = handleSyncError(error, 'sync');
      
      if (shouldRetry && retryCount < MAX_RETRY_ATTEMPTS) {
        const delay = getRetryDelay(retryCount);
        console.log(`🔄 Scheduling retry ${retryCount + 1}/${MAX_RETRY_ATTEMPTS} in ${delay}ms`);
        
        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setRetryCount(prev => prev + 1);
            performSyncBase(); // Use base function to avoid circular dependency
          }
        }, delay);
      }
    } finally {
      syncInProgress.current = false;
      setIsSyncing(false);
    }
  }, [
    sessionUuid, 
    lastUpdateTime, 
    handleSessionChange, 
    performBatchUpdates, 
    setSession, 
    handleSyncError,
    getCurrentSyncInterval,
    getRetryDelay,
    retryCount
  ]);

  // Create throttled version using useMemo to prevent ESLint issues
  const performSync = useMemo(
    () => throttle(performSyncBase, 5000), // Throttle sync calls to max once per 5 seconds
    [performSyncBase]
  );

  // Schedule next sync with adaptive intervals
  const scheduleNextSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    const interval = getCurrentSyncInterval();
    console.log(`⏰ Next sync scheduled in ${interval / 1000}s`);
    
    syncTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        performSyncBase(); // Use base function for consistency
        scheduleNextSync(); // Schedule the next one
      }
    }, interval);
  }, [getCurrentSyncInterval, performSyncBase]);

  // App state change handler
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log(`📱 App state changed: ${appStateRef.current} → ${nextAppState}`);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App became active - perform immediate sync and reschedule
        updateActivity();
        performSyncBase(); // Use base function for consistency
        scheduleNextSync();
      } else if (nextAppState === 'background') {
        // App went to background - clear short intervals
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        scheduleNextSync(); // Reschedule with background interval
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [performSyncBase, scheduleNextSync, updateActivity]);

  // Main sync effect
  useEffect(() => {
    if (!sessionUuid) {
      // Initial sync to get session info
      performSyncBase();
    } else {
      // Start regular sync cycle
      scheduleNextSync();
    }

    return () => {
      // Cleanup
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [sessionUuid, performSyncBase, scheduleNextSync]);

  // Cleanup on unmount - fix ref issue by copying to variable
  useEffect(() => {
    // Copy ref to variable at effect creation time to avoid ESLint warning
    const deduplicator = requestDeduplicator.current;
    
    return () => {
      isMountedRef.current = false;
      // Use copied variable instead of ref
      if (deduplicator) {
        deduplicator.clear();
      }
      
      // Cancel any pending debounced/throttled calls
      if (updateActivity.cancel) {
        updateActivity.cancel();
      }
      // Note: throttle functions from our util don't have cancel methods,
      // but their internal timeouts will be cleared when component unmounts
    };
  }, [updateActivity]);

  // Expose manual sync function for pull-to-refresh
  const manualSync = useCallback(() => {
    consecutiveErrors.current = 0; // Reset error count for manual sync
    setRetryCount(0);
    performSyncBase(); // Use base function to avoid issues
  }, [performSyncBase]);

  return {
    isSyncing,
    syncError,
    retryCount,
    manualSync,
    updateActivity,
    // Expose both base and throttled sync functions
    performSync: performSyncBase, // For immediate sync needs
    performSyncThrottled: performSync, // For throttled sync needs
    // Expose connection quality info
    connectionQuality: consecutiveErrors.current === 0 ? 'good' : 
                      consecutiveErrors.current < 3 ? 'poor' : 'bad'
  };
};

export default useChatSync;