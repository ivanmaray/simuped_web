// src/hooks/useNotifications.js
import { useEffect, useCallback } from 'react';
import {
  getNotificationPreferences,
  scheduleNotification,
  notifyActivityReminder,
  NOTIFICATION_TYPES
} from '../utils/notificationService';

/**
 * Custom hook to manage notifications and reminders
 */
export function useNotifications() {
  const scheduleSessionNotifications = useCallback((session) => {
    const prefs = getNotificationPreferences();

    if (!prefs.enabled) return;

    const sessionTime = new Date(session.scheduled_at);
    const now = new Date();

    // Schedule reminder notification (if enabled)
    if (prefs.types[NOTIFICATION_TYPES.SESSION_REMINDER]) {
      const reminderMinutes = prefs.advanceWarning?.SESSION_REMINDER || 60;
      const reminderTime = new Date(sessionTime.getTime() - (reminderMinutes * 60 * 1000));

      if (reminderTime > now) {
        const delay = reminderTime.getTime() - now.getTime();
        scheduleNotification(NOTIFICATION_TYPES.SESSION_REMINDER, {
          session,
          minutesBefore: reminderMinutes
        }, delay, prefs);
      }
    }

    // Schedule session starting notification (if enabled)
    if (prefs.types[NOTIFICATION_TYPES.SESSION_STARTING]) {
      const startingMinutes = prefs.advanceWarning?.SESSION_STARTING || 15;
      const startingTime = new Date(sessionTime.getTime() - (startingMinutes * 60 * 1000));

      if (startingTime > now) {
        const delay = startingTime.getTime() - now.getTime();
        scheduleNotification(NOTIFICATION_TYPES.SESSION_STARTING, {
          session
        }, delay, prefs);
      }
    }
  }, []);

  const checkActivityReminder = useCallback((lastActivityDate) => {
    const prefs = getNotificationPreferences();

    if (!prefs.enabled || !prefs.types[NOTIFICATION_TYPES.ACTIVITY_REMINDER]) {
      return;
    }

    const lastActivity = new Date(lastActivityDate);
    const now = new Date();
    const daysSince = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));

    // Only remind if it's been more than 7 days and less than 30 days
    if (daysSince >= 7 && daysSince < 30) {
      notifyActivityReminder(daysSince, prefs);
    }
  }, []);

  // Schedule notifications when component mounts
  useEffect(() => {
    // This would typically load sessions and schedule notifications
    // For now, it's a placeholder for when sessions are available
    const loadAndScheduleNotifications = async () => {
      try {
        // In a real implementation, you would:
        // 1. Load user's registered sessions
        // 2. Schedule notifications for each upcoming session
        // 3. Check activity patterns for reminders

        // Example:
        // const sessions = await loadUserSessions();
        // sessions.forEach(session => scheduleSessionNotifications(session));

        // const lastActivity = await getLastUserActivity();
        // checkActivityReminder(lastActivity);

      } catch (error) {
        console.warn('Failed to load and schedule notifications:', error);
      }
    };

    loadAndScheduleNotifications();
  }, [scheduleSessionNotifications, checkActivityReminder]);

  return {
    scheduleSessionNotifications,
    checkActivityReminder
  };
}
