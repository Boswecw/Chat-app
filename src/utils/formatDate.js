// src/utils/formatDate.js
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';

dayjs.extend(relativeTime);
dayjs.extend(calendar);

export const formatTime = (timestamp) => {
  return dayjs(timestamp).format('h:mm A');
};

export const formatDate = (timestamp) => {
  return dayjs(timestamp).calendar(null, {
    sameDay: '[Today]',
    nextDay: '[Tomorrow]',
    lastDay: '[Yesterday]',
    lastWeek: 'dddd',
    sameElse: 'MMMM D, YYYY',
  });
};

export const isSameDay = (a, b) => {
  return dayjs(a).isSame(b, 'day');
};
