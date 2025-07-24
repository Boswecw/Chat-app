// src/state/participantStore.js
import { create } from 'zustand';

const useParticipantStore = create((set, get) => ({
  participants: [],
  isLoaded: false,
  lastUpdated: 0,

  setParticipants: (list) => {
    if (!Array.isArray(list)) {
      console.error('setParticipants: Expected array, received:', typeof list);
      return;
    }
    
    set({ 
      participants: list, 
      isLoaded: true,
      lastUpdated: Date.now()
    });
  },
  
  updateParticipant: (updatedParticipant) => {
    if (!updatedParticipant || !updatedParticipant.uuid) {
      console.error('Invalid participant object:', updatedParticipant);
      return;
    }
    
    const { participants } = get();
    const updated = participants.map(p => 
      p.uuid === updatedParticipant.uuid 
        ? { ...p, ...updatedParticipant }
        : p
    );
    
    set({ participants: updated, lastUpdated: Date.now() });
  },
  
  addParticipant: (participant) => {
    if (!participant || !participant.uuid) {
      console.error('Invalid participant object:', participant);
      return;
    }
    
    const { participants } = get();
    const exists = participants.some(p => p.uuid === participant.uuid);
    
    if (!exists) {
      set({ 
        participants: [...participants, participant],
        lastUpdated: Date.now()
      });
    }
  },
  
  findParticipant: (uuid) => {
    const { participants } = get();
    return participants.find(p => p.uuid === uuid) || null;
  },
  
  searchParticipants: (searchTerm) => {
    const { participants } = get();
    if (!searchTerm) return participants;
    
    const term = searchTerm.toLowerCase();
    return participants.filter(p => 
      p.name?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term)
    );
  },
  
  clearParticipants: () => {
    set({ participants: [], isLoaded: false, lastUpdated: 0 });
  },
  
  getTimeSinceUpdate: () => {
    const { lastUpdated } = get();
    return lastUpdated ? Date.now() - lastUpdated : Infinity;
  },
  
  needsRefresh: (maxAge = 5 * 60 * 1000) => {
    const { lastUpdated } = get();
    return !lastUpdated || (Date.now() - lastUpdated) > maxAge;
  }
}));

export default useParticipantStore;