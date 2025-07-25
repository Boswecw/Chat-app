// src/stores/participantStore.js - FIXED VERSION
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
      
      // ✅ FIXED: Handle both arrays and objects
      setParticipants: (participantData) => {
        try {
          let participantMap = {};
          
          if (Array.isArray(participantData)) {
            // Handle array format (API response)
            participantData.forEach(participant => {
              if (participant && participant.uuid) {
                participantMap[participant.uuid] = participant;
              }
            });
          } else if (participantData && typeof participantData === 'object') {
            // Handle object format (direct mapping)
            participantMap = { ...participantData };
          } else {
            console.error('setParticipants: Invalid data format:', typeof participantData);
            set({ error: 'Invalid participant data format' });
            return;
          }
          
          console.log(`👥 Setting ${Object.keys(participantMap).length} participants`);
          
          set({ 
            participants: participantMap,
            lastUpdateTime: Date.now(),
            error: null 
          });
        } catch (error) {
          console.error('❌ setParticipants error:', error);
          set({ error: error.message });
        }
      },
      
      addParticipant: (participant) => {
        if (!participant || !participant.uuid) {
          console.error('addParticipant: Invalid participant object:', participant);
          return;
        }
        
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
        if (!uuid || !updates || typeof updates !== 'object') {
          console.error('updateParticipant: Invalid parameters:', { uuid, updates });
          return;
        }
        
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
        } else {
          console.warn(`updateParticipant: Participant ${uuid} not found`);
        }
      },
      
      removeParticipant: (uuid) => {
        if (!uuid) {
          console.error('removeParticipant: UUID is required');
          return;
        }
        
        const currentParticipants = get().participants;
        if (!currentParticipants[uuid]) {
          console.warn(`removeParticipant: Participant ${uuid} not found`);
          return;
        }
        
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
      
      // =====================================
      // GETTERS
      // =====================================
      
      getParticipant: (uuid) => {
        if (!uuid) return null;
        return get().participants[uuid] || null;
      },
      
      getParticipantName: (uuid) => {
        if (!uuid) return 'Unknown User';
        if (uuid === 'you') return 'You';
        
        const participant = get().participants[uuid];
        return participant?.name || 'Unknown User';
      },
      
      getAllParticipants: () => {
        const participants = get().participants;
        return Object.values(participants);
      },
      
      getParticipantsArray: () => {
        // Helper method to get participants as array (for compatibility)
        const participants = get().participants;
        return Object.values(participants);
      },
      
      getParticipantsCount: () => {
        return Object.keys(get().participants).length;
      },
      
      isParticipantLoaded: (uuid) => {
        if (!uuid) return false;
        return Boolean(get().participants[uuid]);
      },
      
      // =====================================
      // SEARCH AND UTILITY METHODS
      // =====================================
      
      searchParticipants: (searchTerm) => {
        const participants = get().participants;
        const participantArray = Object.values(participants);
        
        if (!searchTerm || typeof searchTerm !== 'string') {
          return participantArray;
        }
        
        const term = searchTerm.toLowerCase();
        return participantArray.filter(participant => 
          participant.name?.toLowerCase().includes(term) ||
          participant.email?.toLowerCase().includes(term) ||
          participant.uuid?.toLowerCase().includes(term)
        );
      },
      
      getParticipantsByRole: (role) => {
        const participants = get().participants;
        return Object.values(participants).filter(p => p.role === role);
      },
      
      // =====================================
      // DEBUG AND VALIDATION
      // =====================================
      
      validateStore: () => {
        const { participants } = get();
        const issues = [];
        
        Object.entries(participants).forEach(([key, participant]) => {
          if (!participant) {
            issues.push(`Null participant found with key: ${key}`);
            return;
          }
          
          if (!participant.uuid) {
            issues.push(`Participant missing UUID: ${JSON.stringify(participant)}`);
          }
          
          if (participant.uuid !== key) {
            issues.push(`Participant key mismatch: key=${key}, uuid=${participant.uuid}`);
          }
          
          if (!participant.name) {
            issues.push(`Participant ${key} missing name`);
          }
        });
        
        if (issues.length > 0) {
          console.warn('Participant store validation issues:', issues);
        } else {
          console.log('✅ Participant store validation passed');
        }
        
        return issues;
      },
      
      getStoreStats: () => {
        const { participants, lastUpdateTime } = get();
        const count = Object.keys(participants).length;
        const lastUpdate = lastUpdateTime ? new Date(lastUpdateTime).toLocaleString() : 'Never';
        
        return {
          count,
          lastUpdate,
          participants: Object.keys(participants),
        };
      }
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
            
            // Validate restored data in development
            if (__DEV__) {
              const store = useParticipantStore.getState();
              store.validateStore();
            }
          }
        }
      },
    }
  )
);

// ✅ DEVELOPMENT DEBUGGING
if (__DEV__) {
  // Subscribe to participant changes for debugging
  useParticipantStore.subscribe(
    (state) => state.participants,
    (participants, previousParticipants) => {
      const currentCount = Object.keys(participants).length;
      const previousCount = Object.keys(previousParticipants).length;
      
      if (currentCount !== previousCount) {
        console.log(`👥 Participant count changed: ${previousCount} → ${currentCount}`);
      }
    }
  );
}

export default useParticipantStore;