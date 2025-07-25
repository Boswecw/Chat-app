import axios from 'axios';

// 1. Use environment variables for API base URL
const API_BASE = process.env.REACT_APP_API_BASE || 'https://dummy-chat-server.tribechat.com/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Add request interceptor for consistent headers/auth
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Improved response interceptor with better error handling
apiClient.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = response.config?.url || 'unknown';
    console.log(`✅ API: ${method} ${url} - ${response.status}`);
    return response;
  },
  (error) => {
    // 4. Better error handling for different error types
    if (error.code === 'ECONNABORTED') {
      console.error('❌ API Timeout Error');
    } else if (error.response) {
      const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
      const url = error.config?.url || 'unknown';
      console.error(`❌ API Error: ${method} ${url} - ${error.response.status}`);
    } else if (error.request) {
      console.error('❌ Network Error: No response received');
    } else {
      console.error('❌ Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// 5. Add data validation helper
const validateMessageData = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response data format');
  }
  return data;
};

// 6. Add retry logic helper
const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      if (error.response?.status >= 400 && error.response?.status < 500) {
        // Don't retry client errors
        throw error;
      }
      console.log(`Retrying request... Attempt ${i + 2}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
};

export const fetchLatestMessages = async (abortController = null) => {
  try {
    const requestFn = () => apiClient.get('/messages/latest', {
      // 7. Add abort signal for request cancellation
      signal: abortController?.signal
    });
    
    // 8. Use retry logic for important requests
    const response = await retryRequest(requestFn);
    
    // 9. Validate response data
    const validatedData = validateMessageData(response.data);
    return validatedData;
  } catch (error) {
    // 10. Provide more specific error messages
    if (error.name === 'AbortError') {
      console.log('Request was cancelled');
      throw new Error('Request cancelled');
    }
    
    const userFriendlyMessage = error.response?.status === 404 
      ? 'No messages found' 
      : 'Failed to fetch latest messages. Please try again.';
    
    console.error('Failed to fetch messages:', error);
    throw new Error(userFriendlyMessage);
  }
};

export const sendMessage = async (text, abortController = null) => {
  // Input validation
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Message text is required and cannot be empty');
  }

  try {
    const requestFn = () => apiClient.post('/messages/new', 
      { text: text.trim() },
      { signal: abortController?.signal }
    );
    
    const response = await requestFn(); // Don't retry POST requests
    const validatedData = validateMessageData(response.data);
    return validatedData;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Send message request was cancelled');
      throw new Error('Request cancelled');
    }
    
    const userFriendlyMessage = error.response?.status === 429 
      ? 'Too many messages sent. Please wait a moment.' 
      : 'Failed to send message. Please try again.';
    
    console.error('Failed to send message:', error);
    throw new Error(userFriendlyMessage);
  }
};

export const fetchAllMessages = async (abortController = null) => {
  try {
    const requestFn = () => apiClient.get('/messages/all', {
      signal: abortController?.signal
    });
    
    const response = await retryRequest(requestFn);
    const validatedData = validateMessageData(response.data);
    
    // Additional validation for array data
    if (!Array.isArray(validatedData)) {
      throw new Error('Expected messages array');
    }
    
    return validatedData;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Fetch all messages request was cancelled');
      throw new Error('Request cancelled');
    }
    
    const userFriendlyMessage = 'Failed to fetch all messages. Please try again.';
    console.error('Failed to fetch all messages:', error);
    throw new Error(userFriendlyMessage);
  }
};