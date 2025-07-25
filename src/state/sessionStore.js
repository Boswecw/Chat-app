import { create } from 'zustand';

const useSessionStore = create((set) => ({
  sessionUuid: '',
  apiVersion: 0,
  connected: false,

  setSession: ({ sessionUuid, apiVersion }) => {
    console.log('🔗 Session connected:', sessionUuid.substring(0, 8) + '...');
    set({ sessionUuid, apiVersion, connected: true });
  },

  clearSession: () => set({ 
    sessionUuid: '', 
    apiVersion: 0, 
    connected: false 
  }),
}));

export default useSessionStore;