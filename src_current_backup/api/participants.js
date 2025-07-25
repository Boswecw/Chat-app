import axios from 'axios';

const API_BASE = 'https://dummy-chat-server.tribechat.com/api';

export const fetchAllParticipants = async () => {
  try {
    const response = await axios.get(`${API_BASE}/participants/all`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch participants:', error);
    throw error;
  }
};