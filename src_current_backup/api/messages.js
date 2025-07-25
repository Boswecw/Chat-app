// src/api/messages.js - REPLACE YOUR EXISTING FILE
import axios from 'axios';

// Hardcode API base for testing (remove process.env for now)
const API_BASE = 'https://dummy-chat-server.tribechat.com/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Remove localStorage usage for Expo Go compatibility
apiClient.interceptors.request.use(
  (config) => {
    // Skip auth for testing - localStorage doesn't exist in React Native
    // const token = localStorage.getItem('authToken'); // REMOVED
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Keep your existing response interceptor
apiClient.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toUpperCase() || 'UNKNOWN';
    const url = response.config?.url || 'unknown';
    console.log(`✅ API: ${method} ${url} - ${response.status}`);
    return response;
  },
  (error) => {
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

// Add data validation helper
const validateMessageData = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response data format');
  }
  return data;
};

// Your existing API functions (keep these exactly as they are)
export const fetchLatestMessages = async (abortController = null) => {
  try {
    const response = await apiClient.get('/messages/latest', {
      signal: abortController?.signal
    });
    
    const validatedData = validateMessageData(response.data);
    return validatedData;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Messages request was cancelled');
      throw new Error('Request cancelled');
    }
    
    const userFriendlyMessage = 'Failed to fetch messages. Please try again.';
    console.error('Failed to fetch messages:', error);
    throw new Error(userFriendlyMessage);
  }
};

export const sendMessage = async (text, abortController = null) => {
  try {
    const response = await apiClient.post('/messages', 
      { text },
      { signal: abortController?.signal }
    );
    
    const validatedData = validateMessageData(response.data);
    return validatedData;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Send message request was cancelled');
      throw new Error('Request cancelled');
    }
    
    const userFriendlyMessage = 'Failed to send message. Please try again.';
    console.error('Failed to send message:', error);
    throw new Error(userFriendlyMessage);
  }
};

// Add other functions you need...