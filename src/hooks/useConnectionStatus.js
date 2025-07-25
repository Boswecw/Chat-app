// src/hooks/useConnectionStatus.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchServerInfo } from '../api/info';

const CONNECTION_CHECK_INTERVAL = 15000; // 15 seconds
const RETRY_INTERVAL = 5000; // 5 seconds for retry when offline
const MAX_RETRY_ATTEMPTS = 3;
const CONNECTION_TIMEOUT = 10000; // 10 seconds timeout

const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  // Cleanup function to clear all timers - stable reference
  const clearAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Start regular connection checking - depends on clearAllTimers
  const startRegularChecking = useCallback(() => {
    clearAllTimers();
    
    if (!isMountedRef.current) return;
    
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current && !isChecking) {
        // Use ref to avoid stale closure
        checkConnectionRef.current();
      }
    }, CONNECTION_CHECK_INTERVAL);
  }, [clearAllTimers, isChecking]);

  // Use ref to store the latest checkConnection function
  const checkConnectionRef = useRef();

  // Enhanced connection check with timeout and proper error handling
  const checkConnection = useCallback(async () => {
    if (!isMountedRef.current || isChecking) return;
    
    setIsChecking(true);
    
    try {
      // Create a promise that races between the API call and a timeout
      const connectionPromise = Promise.race([
        fetchServerInfo(),
        new Promise((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            reject(new Error('Connection timeout'));
          }, CONNECTION_TIMEOUT);
        })
      ]);

      const serverInfo = await connectionPromise;
      
      // Clear timeout if API call succeeds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (isMountedRef.current) {
        // Connection successful
        setIsOnline(true);
        setLastSyncTime(new Date());
        setRetryCount(0);
        
        // Start regular interval if not already running
        if (!intervalRef.current) {
          startRegularChecking();
        }
        
        console.log('✅ Connection check successful', serverInfo);
      }
      
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (isMountedRef.current) {
        console.warn('❌ Connection check failed:', err.message);
        setIsOnline(false);
        
        // Implement exponential backoff for retries
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          setRetryCount(prev => prev + 1);
          const retryDelay = RETRY_INTERVAL * Math.pow(2, retryCount); // Exponential backoff
          
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              checkConnectionRef.current();
            }
          }, retryDelay);
          
          console.log(`🔄 Retrying connection check in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
        } else {
          // Max retries reached, fall back to regular interval checking
          console.log('⚠️ Max retry attempts reached, falling back to regular checking');
          setRetryCount(0);
          startRegularChecking();
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [isChecking, retryCount, startRegularChecking]);

  // Update the ref whenever checkConnection changes
  useEffect(() => {
    checkConnectionRef.current = checkConnection;
  }, [checkConnection]);

  // Manual connection check for user-triggered retries
  const forceCheck = useCallback(() => {
    setRetryCount(0);
    checkConnection();
  }, [checkConnection]);

  // Initialize connection checking on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Perform initial connection check
    checkConnection();
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [checkConnection, clearAllTimers]);

  // Handle browser/app visibility changes to pause/resume checking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        if (document.hidden) {
          // App went to background, pause checking
          clearAllTimers();
        } else {
          // App came to foreground, resume checking
          if (isMountedRef.current) {
            forceCheck();
          }
        }
      }
    };

    // Add event listener for web platforms
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [forceCheck, clearAllTimers]);

  // Return connection status and utilities
  return {
    isOnline,
    lastSyncTime,
    isChecking,
    retryCount,
    forceCheck, // Allows components to manually trigger a connection check
    
    // Computed values for UI feedback
    isRetrying: retryCount > 0 && retryCount < MAX_RETRY_ATTEMPTS,
    hasMaxRetriesReached: retryCount >= MAX_RETRY_ATTEMPTS,
    
    // Connection quality indicator
    connectionQuality: isOnline ? 'good' : (isChecking || retryCount > 0) ? 'poor' : 'offline',
    
    // Human-readable status
    statusText: isOnline 
      ? 'Connected' 
      : isChecking 
        ? 'Checking connection...' 
        : retryCount > 0 
          ? `Retrying... (${retryCount}/${MAX_RETRY_ATTEMPTS})`
          : 'Offline'
  };
};

export default useConnectionStatus;