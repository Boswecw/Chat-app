// src/stores/participantStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useParticipantStore = create(
  persist(
    (set, get) => ({
      // State - using Map-like object for fast lookups
      participants: {},
      loading: false,
      error: null,
      lastUpdateTime: null,
      
      // Actions
      setParticipants: (participantArray) => {
        // Convert array to lookup object
        const participantMap = {};
        participantArray.forEach(participant => {
          participantMap[participant.uuid] = participant;
        });
        
        set({ 
          participants: participantMap,
          lastUpdateTime: Date.now(),
          error: null 
        });
      },
      
      addParticipant: (participant) => {
        const currentParticipants = get().participants;
        set({ 
          participants: {
            ...currentParticipants,
            [participant.uuid]: participant
          },
          lastUpdateTime: Date.now() 
        });
      },
      
      updateParticipant: (uuid, updates) => {
        const currentParticipants = get().participants;
        const existingParticipant = currentParticipants[uuid];
        
        if (existingParticipant) {
          set({ 
            participants: {
              ...currentParticipants,
              [uuid]: { ...existingParticipant, ...updates }
            },
            lastUpdateTime: Date.now() 
          });
        }
      },
      
      removeParticipant: (uuid) => {
        const currentParticipants = get().participants;
        const { [uuid]: removed, ...remainingParticipants } = currentParticipants;
        set({ 
          participants: remainingParticipants,
          lastUpdateTime: Date.now() 
        });
      },
      
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      clearParticipants: () => set({ 
        participants: {}, 
        lastUpdateTime: null,
        error: null 
      }),
      
      // Getters
      getParticipant: (uuid) => {
        return get().participants[uuid];
      },
      
      getParticipantName: (uuid) => {
        const participant = get().participants[uuid];
        if (uuid === 'you') return 'You';
        return participant?.name || 'Unknown User';
      },
      
      getAllParticipants: () => {
        const participants = get().participants;
        return Object.values(participants);
      },
      
      getParticipantsCount: () => {
        return Object.keys(get().participants).length;
      },
      
      isParticipantLoaded: (uuid) => {
        return !!get().participants[uuid];
      },
    }),
    {
      name: 'chat-participants',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      
      partialize: (state) => ({
        participants: state.participants,
        lastUpdateTime: state.lastUpdateTime,
      }),
      
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('❌ Participant store rehydration failed:', error);
        } else {
          console.log('✅ Participant store rehydrated successfully');
          if (state?.participants) {
            const count = Object.keys(state.participants).length;
            console.log(`👥 Restored ${count} participants from storage`);
          }
        }
      },
    }
  )
);

export default useParticipantStore;