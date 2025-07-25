import { create } from 'zustand';

const useMessageStore = create((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  setMessages: (messages) => {
    console.log('📥 Setting messages:', messages.length);
    set({ messages, error: null });
  },

  addMessage: (message) => {
    const { messages } = get();
    set({ messages: [message, ...messages] });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  clearMessages: () => set({ messages: [], error: null }),
}));

export default useMessageStore;