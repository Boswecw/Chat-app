import { create } from 'zustand';

const useParticipantStore = create((set, get) => ({
  participants: [],
  
  setParticipants: (participants) => {
    console.log('👥 Setting participants:', participants.length);
    set({ participants });
  },

  findParticipant: (uuid) => {
    const { participants } = get();
    return participants.find(p => p.uuid === uuid) || null;
  },

  clearParticipants: () => set({ participants: [] }),
}));

export default useParticipantStore;