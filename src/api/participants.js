// src/api/participants.js
import axios from 'axios';

const BASE_URL = 'https://dummy-chat-server.tribechat.com/api';

export const fetchAllParticipants = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/participants/all`);
    return res.data; // Array of TParticipant
  } catch (err) {
    console.error('❌ Failed to fetch participants:', err);
    throw err;
  }
};

export const fetchUpdatedParticipants = async (since) => {
  try {
    const res = await axios.get(`${BASE_URL}/participants/updates/${since}`);
    return res.data; // Array of updated TParticipant
  } catch (err) {
    console.error('❌ Failed to fetch updated participants:', err);
    throw err;
  }
};
