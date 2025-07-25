// src/state/sessionStore.js
import { create } from 'zustand';

const useSessionStore = create((set) => ({
  sessionUuid: '',
  apiVersion: 0,
  lastUpdateTime: 0,

  setSession: ({ sessionUuid, apiVersion }) =>
    set({ sessionUuid, apiVersion }),

  setLastUpdateTime: (time) => set({ lastUpdateTime: time }),

  clearSession: () =>
    set({ sessionUuid: '', apiVersion: 0, lastUpdateTime: 0 }),
}));

export default useSessionStore;