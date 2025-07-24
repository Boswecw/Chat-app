// src/hooks/useReply.js
import { useState, useCallback } from 'react';

const useReply = () => {
  const [replyTo, setReplyTo] = useState(null);

  // Set the message being replied to
  const startReply = useCallback((message) => {
    setReplyTo(message);
  }, []);

  // Cancel reply
  const cancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  return {
    replyTo,
    startReply,
    cancelReply,
    isReplying: !!replyTo,
  };
};

export default useReply;
