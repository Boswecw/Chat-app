import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://dummy-chat-server.tribechat.com/api';

// Reuse the same axios configuration as message.js
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add the same interceptors for consistency
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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

export const fetchServerInfo = async (abortController = null) => {
  try {
    const response = await apiClient.get('/info', {
      signal: abortController?.signal
    });
    
    console.log('📡 Server info:', response.data);
    
    // Validate response data
    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid server info format');
    }
    
    return response.data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Server info request was cancelled');
      throw new Error('Request cancelled');
    }
    
    const userFriendlyMessage = 'Failed to fetch server information. Please try again.';
    console.error('Failed to fetch server info:', error);
    throw new Error(userFriendlyMessage);
  }
};