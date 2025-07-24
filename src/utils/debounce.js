// src/utils/debounce.js
/**
 * Debounce function - delays execution until after wait time has elapsed
 * since the last time it was invoked
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  
  const debounced = function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
  
  // Add cancel method to clear pending execution
  debounced.cancel = () => {
    clearTimeout(timeout);
    timeout = null;
  };
  
  // Add flush method to execute immediately
  debounced.flush = function(...args) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      func.apply(this, args);
    }
  };
  
  return debounced;
};

/**
 * Throttle function - limits execution to once per limit period
 */
export const throttle = (func, limit) => {
  let inThrottle;
  let lastFunc;
  let lastRan;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

/**
 * Advanced debounce with leading and trailing options
 */
export const advancedDebounce = (func, wait, options = {}) => {
  const { leading = false, trailing = true, maxWait } = options;
  let timeout;
  let maxTimeout;
  let lastCallTime;
  let lastInvokeTime = 0;
  let result;

  function invokeFunc(time) {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    lastInvokeTime = time;
    timeout = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (lastCallTime === undefined || 
            timeSinceLastCall >= wait ||
            timeSinceLastCall < 0 || 
            (maxWait !== undefined && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeout = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timeout = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  let lastArgs, lastThis;

  function debounced(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait) {
        timeout = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeout === undefined) {
      timeout = setTimeout(timerExpired, wait);
    }
    return result;
  }

  debounced.cancel = () => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    if (maxTimeout !== undefined) {
      clearTimeout(maxTimeout);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timeout = undefined;
  };

  debounced.flush = () => {
    return timeout === undefined ? result : trailingEdge(Date.now());
  };

  return debounced;
};

/**
 * Request deduplication utility
 */
export const createRequestDeduplicator = () => {
  const pendingRequests = new Map();
  
  return {
    deduplicate: (key, requestFn) => {
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }
      
      const promise = requestFn()
        .finally(() => {
          pendingRequests.delete(key);
        });
      
      pendingRequests.set(key, promise);
      return promise;
    },
    
    clear: () => {
      pendingRequests.clear();
    },
    
    hasPending: (key) => {
      return pendingRequests.has(key);
    }
  };
};

export default { debounce, throttle, advancedDebounce, createRequestDeduplicator };