// src/services/apiService.js - Real Tribe API Integration
const API_BASE = 'https://dummy-chat-server.tribechat.com/api';

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 10000;

// Helper function to create fetch with timeout
const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};

// Enhanced error handling
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const handleApiResponse = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Unknown error occurred' };
    }
    
    throw new ApiError(
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData
    );
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
};

// =====================================
// API SERVICE
// =====================================

export const apiService = {
  
  // ✅ Server Info
  async getServerInfo() {
    try {
      console.log('📡 Fetching server info...');
      const response = await fetchWithTimeout(`${API_BASE}/info`);
      const data = await handleApiResponse(response);
      console.log('✅ Server info received:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to get server info:', error);
      throw new ApiError('Failed to connect to server', error.status || 500);
    }
  },

  // ✅ Participants
  async getAllParticipants() {
    try {
      console.log('👥 Fetching participants...');
      const response = await fetchWithTimeout(`${API_BASE}/participants`);
      const data = await handleApiResponse(response);
      console.log(`✅ Received ${data.length} participants`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Failed to get participants:', error);
      throw new ApiError('Failed to load participants', error.status || 500);
    }
  },

  async getUpdatedParticipants(since) {
    try {
      const url = since 
        ? `${API_BASE}/participants?since=${encodeURIComponent(since)}`
        : `${API_BASE}/participants`;
      
      const response = await fetchWithTimeout(url);
      const data = await handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Failed to get updated participants:', error);
      return []; // Return empty array on error to prevent crashes
    }
  },

  // ✅ Messages
  async getLatestMessages(limit = 50) {
    try {
      console.log('📨 Fetching latest messages...');
      const response = await fetchWithTimeout(`${API_BASE}/messages?limit=${limit}`);
      const data = await handleApiResponse(response);
      console.log(`✅ Received ${data.length} messages`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Failed to get messages:', error);
      throw new ApiError('Failed to load messages', error.status || 500);
    }
  },

  async getUpdatedMessages(since) {
    try {
      if (!since) {
        return this.getLatestMessages();
      }

      const sinceParam = typeof since === 'number' 
        ? new Date(since).toISOString()
        : since;

      const response = await fetchWithTimeout(
        `${API_BASE}/messages?since=${encodeURIComponent(sinceParam)}`
      );
      const data = await handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Failed to get updated messages:', error);
      return []; // Return empty array on error to prevent crashes
    }
  },

  async getMessagesBefore(beforeTimestamp, limit = 20) {
    try {
      const beforeParam = typeof beforeTimestamp === 'number'
        ? new Date(beforeTimestamp).toISOString()
        : beforeTimestamp;

      const response = await fetchWithTimeout(
        `${API_BASE}/messages?before=${encodeURIComponent(beforeParam)}&limit=${limit}`
      );
      const data = await handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Failed to get older messages:', error);
      return [];
    }
  },

  async sendMessage(text, attachments = []) {
    try {
      console.log('📤 Sending message...');
      
      const messageData = {
        text: text.trim(),
        attachments,
        sentAt: new Date().toISOString()
      };

      const response = await fetchWithTimeout(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      const data = await handleApiResponse(response);
      console.log('✅ Message sent successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw new ApiError('Failed to send message', error.status || 500);
    }
  },

  // ✅ Reactions (Note: These endpoints may not exist yet in the API)
  async addReaction(messageId, emoji) {
    try {
      console.log(`➕ Adding reaction ${emoji} to message ${messageId}`);
      
      const response = await fetchWithTimeout(`${API_BASE}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      const data = await handleApiResponse(response);
      console.log('✅ Reaction added successfully');
      return data;
    } catch (error) {
      if (error.status === 404) {
        console.warn('⚠️ Reaction endpoint not implemented yet, using local state');
        return { success: false, reason: 'endpoint_not_implemented' };
      }
      console.error('❌ Failed to add reaction:', error);
      throw error;
    }
  },

  async removeReaction(messageId, emoji) {
    try {
      console.log(`➖ Removing reaction ${emoji} from message ${messageId}`);
      
      const response = await fetchWithTimeout(`${API_BASE}/messages/${messageId}/reactions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      });

      const data = await handleApiResponse(response);
      console.log('✅ Reaction removed successfully');
      return data;
    } catch (error) {
      if (error.status === 404) {
        console.warn('⚠️ Reaction endpoint not implemented yet, using local state');
        return { success: false, reason: 'endpoint_not_implemented' };
      }
      console.error('❌ Failed to remove reaction:', error);
      throw error;
    }
  },

  // ✅ Health Check
  async healthCheck() {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  // ✅ Retry mechanism for failed requests
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        // Wait before retry
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }
    
    throw lastError;
  }
};

// =====================================
// NETWORK STATUS HELPER
// =====================================

export const networkStatus = {
  isOnline: true,
  
  async checkConnection() {
    try {
      const isHealthy = await apiService.healthCheck();
      this.isOnline = isHealthy;
      return isHealthy;
    } catch {
      this.isOnline = false;
      return false;
    }
  },

  // Monitor network status changes
  subscribe(callback) {
    const handleOnline = () => {
      this.isOnline = true;
      callback(true);
    };
    
    const handleOffline = () => {
      this.isOnline = false;
      callback(false);
    };

    // For React Native, you might want to use NetInfo instead
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
    
    return () => {}; // No-op for React Native
  }
};

// =====================================
// RATE LIMITING HELPER
// =====================================

export const rateLimiter = {
  requests: new Map(),
  
  canMakeRequest(key, limit = 10, windowMs = 60000) {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  },
  
  reset(key) {
    this.requests.delete(key);
  }
};

// =====================================
// EXPORTS
// =====================================

export { ApiError };
export default apiService;