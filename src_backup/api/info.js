// src/api/info.js
import axios from 'axios';

const BASE_URL = 'https://dummy-chat-server.tribechat.com/api';

export const fetchServerInfo = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/info`);
    return res.data; // { sessionUuid, apiVersion }
  } catch (err) {
    console.error('❌ Failed to fetch server info:', err);
    throw err;
  }
};
