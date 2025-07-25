// src/utils/groupMessages.js
import { isSameDay } from './formatDate';

/**
 * Groups consecutive messages by the same user, and optionally by date.
 * Returns an array of groups with metadata like showHeader, dateSeparator, etc.
 */
export function groupMessages(messages) {
  const grouped = [];

  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];
    const prev = messages[i - 1];

    const isSameSender = prev && current.participant?.uuid === prev.participant?.uuid;
    const isSameDayFlag = prev && isSameDay(current.createdAt, prev.createdAt);

    grouped.push({
      ...current,
      isGrouped: isSameSender && isSameDayFlag,
      dateSeparator: !isSameDayFlag,
    });
  }

  return grouped;
}
