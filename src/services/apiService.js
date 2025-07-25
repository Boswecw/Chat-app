// src/services/apiService.js
const API_BASE = 'https://dummy-chat-server.tribechat.com/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE;
    this.timeout = 10000;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ API Error [${endpoint}]:`, error.message);
      throw error;
    }
  }

  // Server Info
  async getServerInfo() {
    console.log('📡 Fetching server info...');
    const data = await this.request('/info');
    console.log('✅ Server info received:', data);
    return data;
  }

  // Messages
  async getLatestMessages() {
    console.log('📩 Fetching latest messages...');
    const data = await this.request('/messages/latest');
    console.log(`✅ Loaded ${data?.length || 0} messages`);
    return data || [];
  }

  async getAllMessages() {
    console.log('📩 Fetching all messages...');
    const data = await this.request('/messages/all');
    console.log(`✅ Loaded ${data?.length || 0} total messages`);
    return data || [];
  }

  async getUpdatedMessages(since) {
    console.log(`📩 Fetching message updates since ${since}...`);
    const data = await this.request(`/messages/updates/${since}`);
    console.log(`✅ Found ${data?.length || 0} message updates`);
    return data || [];
  }

  async sendMessage(text) {
    console.log('📤 Sending message:', text.substring(0, 50) + '...');
    const data = await this.request('/messages/new', {
      method: 'POST',
      body: JSON.stringify({ text: text.trim() }),
    });
    console.log('✅ Message sent successfully');
    return data;
  }

  // Participants
  async getAllParticipants() {
    console.log('👥 Fetching participants...');
    const data = await this.request('/participants/all');
    console.log(`✅ Loaded ${data?.length || 0} participants`);
    return data || [];
  }

  async getUpdatedParticipants(since) {
    console.log(`👥 Fetching participant updates since ${since}...`);
    const data = await this.request(`/participants/updates/${since}`);
    console.log(`✅ Found ${data?.length || 0} participant updates`);
    return data || [];
  }

  // Health check
  async isServerHealthy() {
    try {
      await this.getServerInfo();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export default new ApiService();