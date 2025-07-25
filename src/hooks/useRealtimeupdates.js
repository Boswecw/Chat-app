// src/hooks/useRealtimeUpdates.js - Real-time Chat Synchronization
import { useEffect, useRef, useCallback, useState } from 'react';
import apiService from '../services/apiService';
import useMessageStore from '../stores/messageStore';
import useParticipantStore from '../stores/participantStore';
import useSessionStore from '../stores/sessionStore';

// =====================================
// REAL-TIME UPDATES HOOK
// =====================================

export const useRealtimeUpdates = ({
  pollInterval = 5000,        // 5 seconds
  maxRetries = 3,
  backoffMultiplier = 2,
  enablePolling = true
} = {}) => {
  
  const [isPolling, setIsPolling] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs for cleanup and avoiding stale closures
  const pollIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const lastUpdateRef = useRef(Date.now());
  
  // Store actions
  const { addMessages, updateMessage, setError: setMessageError } = useMessageStore();
  const { setParticipants, updateParticipant } = useParticipantStore();
  const { connected, setConnected, sessionUuid } = useSessionStore();

  // =====================================
  // POLLING LOGIC
  // =====================================

  const performSync = useCallback(async () => {
    if (!connected || !mountedRef.current) {
      return;
    }

    try {
      setIsPolling(true);
      setLastError(null);

      console.log('🔄 Performing sync...');
      const syncStart = Date.now();

      // Use Promise.allSettled to handle partial failures gracefully
      const [messagesResult, participantsResult] = await Promise.allSettled([
        apiService.getUpdatedMessages(lastUpdateRef.current),
        apiService.getUpdatedParticipants(lastUpdateRef.current)
      ]);

      // Process messages
      if (messagesResult.status === 'fulfilled' && messagesResult.value.length > 0) {
        console.log(`📥 Received ${messagesResult.value.length} new messages`);
        
        // Transform messages and add participant data
        const processedMessages = messagesResult.value.map(message => ({
          ...message,
          // Ensure participant data is included
          participant: message.participant || {
            uuid: message.authorUuid || 'unknown',
            name: 'Unknown User'
          }
        }));

        addMessages(processedMessages);
        
        // Update last sync time to latest message time
        const latestMessageTime = Math.max(
          ...processedMessages.map(m => new Date(m.createdAt).getTime())
        );
        lastUpdateRef.current = Math.max(lastUpdateRef.current, latestMessageTime);
      }

      // Process participants
      if (participantsResult.status === 'fulfilled' && participantsResult.value.length > 0) {
        console.log(`👥 Received ${participantsResult.value.length} participant updates`);
        
        // Update individual participants rather than replacing all
        participantsResult.value.forEach(participant => {
          updateParticipant(participant.uuid, participant);
        });
      }

      // Handle errors
      const errors = [messagesResult, participantsResult]
        .filter(result => result.status === 'rejected')
        .map(result => result.reason);

      if (errors.length > 0) {
        console.warn('⚠️ Partial sync failure:', errors);
        // Don't throw - partial success is still valuable
      }

      // Reset retry count on success
      setRetryCount(0);
      
      const syncDuration = Date.now() - syncStart;
      console.log(`✅ Sync completed in ${syncDuration}ms`);

    } catch (error) {
      console.error('❌ Sync failed:', error);
      setLastError(error);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      // Set disconnected if too many failures
      if (retryCount >= maxRetries) {
        console.warn('🔌 Too many sync failures, marking as disconnected');
        setConnected(false);
        setMessageError('Connection lost. Trying to reconnect...');
      }
      
      throw error;
    } finally {
      setIsPolling(false);
    }
  }, [connected, addMessages, updateParticipant, setConnected, setMessageError, retryCount, maxRetries]);

  // =====================================
  // POLLING MANAGEMENT
  // =====================================

  const startPolling = useCallback(() => {
    if (!enablePolling || pollIntervalRef.current) {
      return; // Already polling
    }

    console.log(`🔄 Starting real-time polling (${pollInterval}ms interval)`);
    
    const poll = async () => {
      if (!mountedRef.current) return;
      
      try {
        await performSync();
        
        // Schedule next poll with normal interval
        if (mountedRef.current) {
          pollIntervalRef.current = setTimeout(poll, pollInterval);
        }
      } catch (error) {
        // Schedule retry with exponential backoff
        if (mountedRef.current && retryCount < maxRetries) {
          const backoffDelay = pollInterval * Math.pow(backoffMultiplier, retryCount);
          console.log(`⏳ Retrying sync in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          pollIntervalRef.current = setTimeout(poll, backoffDelay);
        }
      }
    };

    // Start immediately
    poll();
  }, [enablePolling, pollInterval, performSync, retryCount, maxRetries, backoffMultiplier]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      console.log('⏹️ Stopping real-time polling');
      clearTimeout(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const forceSync = useCallback(async () => {
    console.log('🔄 Forcing immediate sync...');
    try {
      await performSync();
    } catch (error) {
      console.error('❌ Force sync failed:', error);
    }
  }, [performSync]);

  // =====================================
  // SESSION MANAGEMENT
  // =====================================

  const handleSessionChange = useCallback(async (newSessionUuid) => {
    if (newSessionUuid !== sessionUuid) {
      console.log('🔄 Session changed, resetting state...');
      
      // Stop current polling
      stopPolling();
      
      // Clear stores
      useMessageStore.getState().clearMessages();
      useParticipantStore.getState().clearParticipants();
      
      // Reset sync timestamp
      lastUpdateRef.current = Date.now();
      setRetryCount(0);
      setLastError(null);
      
      // Restart polling with new session
      if (connected && enablePolling) {
        setTimeout(startPolling, 1000); // Small delay to ensure stores are cleared
      }
    }
  }, [sessionUuid, stopPolling, startPolling, connected, enablePolling]);

  // =====================================
  // EFFECTS
  // =====================================

  // Start/stop polling based on connection status
  useEffect(() => {
    if (connected && enablePolling) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [connected, enablePolling, startPolling, stopPolling]);

  // Handle session changes
  useEffect(() => {
    handleSessionChange(sessionUuid);
  }, [sessionUuid, handleSessionChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  // =====================================
  // APP VISIBILITY HANDLING
  // =====================================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background - reduce polling frequency or stop
        console.log('📱 App backgrounded - reducing sync frequency');
        stopPolling();
      } else {
        // App came to foreground - resume normal polling and force sync
        console.log('📱 App foregrounded - resuming sync');
        if (connected && enablePolling) {
          forceSync(); // Immediate sync
          startPolling(); // Resume regular polling
        }
      }
    };

    // For web
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    // For React Native, you'd use AppState instead:
    // import { AppState } from 'react-native';
    // const subscription = AppState.addEventListener('change', handleAppStateChange);
    // return () => subscription?.remove();
  }, [connected, enablePolling, forceSync, startPolling, stopPolling]);

  // =====================================
  // RETURN VALUES
  // =====================================

  return {
    // Status
    isPolling,
    isConnected: connected,
    lastError,
    retryCount,
    
    // Actions
    forceSync,
    startPolling,
    stopPolling,
    
    // Sync info
    lastUpdateTime: lastUpdateRef.current,
    syncInterval: pollInterval
  };
};

// =====================================
// CONNECTION MONITOR HOOK
// =====================================

export const useConnectionMonitor = () => {
  const [isOnline, setIsOnline] = useState(true);
  const { setConnected } = useSessionStore();

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const serverInfo = await apiService.getServerInfo();
        setIsOnline(true);
        setConnected(true);
        return true;
      } catch (error) {
        console.warn('🔌 Connection check failed:', error);
        setIsOnline(false);
        setConnected(false);
        return false;
      }
    };

    // Check immediately
    checkConnection();

    // Set up periodic connection checks
    const interval = setInterval(checkConnection, 30000); // Every 30 seconds

    // Listen for online/offline events (web only)
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection(); // Verify server is actually reachable
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnected(false);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [setConnected]);

  return { isOnline };
};

// =====================================
// USAGE EXAMPLE
// =====================================

/*
// In your main App component:

import { useRealtimeUpdates, useConnectionMonitor } from './hooks/useRealtimeUpdates';

export default function App() {
  // Connection monitoring
  const { isOnline } = useConnectionMonitor();
  
  // Real-time updates
  const { 
    isPolling, 
    isConnected, 
    lastError, 
    forceSync 
  } = useRealtimeUpdates({
    pollInterval: 5000,  // 5 seconds
    maxRetries: 3,
    enablePolling: true
  });

  // Show connection status in UI
  const connectionStatus = isConnected ? 'Connected' : 'Disconnected';
  
  return (
    <View>
      <Text>Status: {connectionStatus}</Text>
      {isPolling && <Text>Syncing...</Text>}
      {lastError && <Text>Error: {lastError.message}</Text>}
      <Button title="Force Sync" onPress={forceSync} />
    </View>
  );
}
*/