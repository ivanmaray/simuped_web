// src/utils/notificationService.js
// Servicio de notificaciones y recordatorios para SimuPed

/**
 * Notification Service for SimuPed
 * Handles push notifications, reminders, and real-time alerts
 */

const NOTIFICATION_TYPES = {
  SESSION_REMINDER: 'session_reminder',
  BADGE_EARNED: 'badge_earned',
  FEEDBACK_AVAILABLE: 'feedback_available',
  SESSION_STARTING: 'session_starting',
  SESSION_CANCELLED: 'session_cancelled',
  PARTICIPANT_JOINED: 'participant_joined',
  ACTIVITY_REMINDER: 'activity_reminder'
};

const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Local storage key for user notification preferences
const NOTIFICATION_PREFERENCES_KEY = 'simuped_notification_preferences';

/**
 * Get user notification preferences
 */
export function getNotificationPreferences() {
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Error reading notification preferences:', error);
  }

  // Default preferences
  return {
    enabled: true,
    types: {
      [NOTIFICATION_TYPES.SESSION_REMINDER]: true,
      [NOTIFICATION_TYPES.BADGE_EARNED]: true,
      [NOTIFICATION_TYPES.FEEDBACK_AVAILABLE]: true,
      [NOTIFICATION_TYPES.SESSION_STARTING]: true,
      [NOTIFICATION_TYPES.SESSION_CANCELLED]: true,
      [NOTIFICATION_TYPES.ACTIVITY_REMINDER]: false
    },
    advanceWarning: {
      [NOTIFICATION_TYPES.SESSION_REMINDER]: 60, // minutes before session
      [NOTIFICATION_TYPES.SESSION_STARTING]: 15   // minutes before session starts
    },
    soundEnabled: true,
    vibrationEnabled: true
  };
}

/**
 * Save user notification preferences
 */
export function setNotificationPreferences(preferences) {
  try {
    localStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving notification preferences:', error);
  }
}

/**
 * Request notification permission from browser
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Show a browser notification
 */
export function showNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.warn('Notifications not supported or not permitted');
    return null;
  }

  const notification = new Notification(title, {
    icon: '/logo-negative.png',
    badge: '/favicon-32x32.png',
    ...options
  });

  // Auto-close desktop notifications after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);

  return notification;
}

/**
 * Show a toast notification (non-blocking)
 */
export function showToastNotification(message, type = 'info', duration = 5000) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg transform transition-transform duration-300 translate-x-full`;

  // Set styles based on type
  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white'
  };

  toast.className += ` ${styles[type] || styles.info}`;

  toast.innerHTML = `
    <div class="flex items-center">
      <div class="flex-1">${message}</div>
      <button class="ml-4 text-current opacity-70 hover:opacity-100" onclick="this.parentElement.parentElement.remove()">
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-x-full');
  }, 10);

  // Auto remove
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }, duration);
  }

  return toast;
}

/**
 * Send notification about earned badge (browser + email)
 */
export function notifyBadgeEarned(badge, userInfo = {}, preferences = null) {
  const prefs = preferences || getNotificationPreferences();

  if (!prefs.enabled || !prefs.types[NOTIFICATION_TYPES.BADGE_EARNED]) {
    return;
  }

  // Browser notification
  const title = '¡Nuevo logro desbloqueado!';
  const body = `Has obtenido el badge "${badge.name}" en SimuPed.`;

  showNotification(title, {
    body,
    icon: badge.icon || '/favicon-32x32.png',
    data: { type: NOTIFICATION_TYPES.BADGE_EARNED, badgeId: badge.id }
  });

  showToastNotification(body, 'success');

  // Email notification
  if (userInfo.email && userInfo.nombre) {
    sendEmailNotification({
      email: userInfo.email,
      nombre: userInfo.nombre,
      sessionTitle: badge.name,
      sessionDate: badge.description || '',
      reminderType: NOTIFICATION_TYPES.BADGE_EARNED
    }).catch(err => console.warn('Email notification failed:', err));
  }
}

/**
 * Send notification about feedback availability
 */
export function notifyFeedbackAvailable(sessionTitle, preferences = null) {
  const prefs = preferences || getNotificationPreferences();

  if (!prefs.enabled || !prefs.types[NOTIFICATION_TYPES.FEEDBACK_AVAILABLE]) {
    return;
  }

  const title = 'Nuevo feedback disponible';
  const body = `El feedback de tu sesión "${sessionTitle}" está listo para revisar.`;

  showNotification(title, {
    body,
    data: { type: NOTIFICATION_TYPES.FEEDBACK_AVAILABLE }
  });

  showToastNotification(body, 'info');
}

/**
 * Schedule notification for future event
 */
export function scheduleNotification(notificationType, data, delayMs, preferences = null) {
  const timeoutId = setTimeout(() => {
    switch (notificationType) {
      case NOTIFICATION_TYPES.SESSION_REMINDER:
        notifySessionReminder(data.session, data.minutesBefore, data.userInfo || {}, preferences);
        break;
      case NOTIFICATION_TYPES.SESSION_STARTING:
        notifySessionStarting(data.session, data.userInfo || {}, preferences);
        break;
      case NOTIFICATION_TYPES.ACTIVITY_REMINDER:
        notifyActivityReminder(data.daysSince, data.userInfo || {}, preferences);
        break;
      default:
        console.warn('Unknown notification type:', notificationType);
    }
  }, delayMs);

  return timeoutId;
}

/**
 * Clear all scheduled notifications
 */
export function clearScheduledNotifications() {
  // In a real implementation, you'd keep track of timeout IDs
  // and clear them here
}

/**
 * Send email notification via API
 */
export async function sendEmailNotification({ email, nombre, sessionTitle, sessionDate, minutesBefore, reminderType }) {
  try {
    const response = await fetch('/api/send_session_reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        nombre,
        sessionTitle,
        sessionDate,
        minutesBefore,
        reminderType
      })
    });

    if (!response.ok) {
      throw new Error(`Email API error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    throw error;
  }
}

/**
 * Send session reminder with email (browser + email)
 */
export function notifySessionReminder(session, minutesBefore, userInfo = {}, preferences = null) {
  const prefs = preferences || getNotificationPreferences();

  if (!prefs.enabled || !prefs.types[NOTIFICATION_TYPES.SESSION_REMINDER]) {
    return;
  }

  // Browser notification
  const title = 'Recordatorio de sesión';
  const body = `Tu sesión "${session.title}" comienza en ${minutesBefore} minutos.`;

  showNotification(title, {
    body,
    requireInteraction: true,
    data: { type: NOTIFICATION_TYPES.SESSION_REMINDER, sessionId: session.id }
  });

  showToastNotification(body, 'warning');

  // Email notification
  if (userInfo.email && userInfo.nombre) {
    sendEmailNotification({
      email: userInfo.email,
      nombre: userInfo.nombre,
      sessionTitle: session.title,
      sessionDate: session.scheduled_at,
      minutesBefore,
      reminderType: NOTIFICATION_TYPES.SESSION_REMINDER
    }).catch(err => console.warn('Email notification failed:', err));
  }
}

/**
 * Send session starting notification with email
 */
export function notifySessionStarting(session, userInfo = {}, preferences = null) {
  const prefs = preferences || getNotificationPreferences();

  if (!prefs.enabled || !prefs.types[NOTIFICATION_TYPES.SESSION_STARTING]) {
    return;
  }

  const title = 'Sesión iniciándose';
  const body = `Tu sesión "${session.title}" está a punto de comenzar.`;

  showNotification(title, {
    body,
    requireInteraction: true,
    data: { type: NOTIFICATION_TYPES.SESSION_STARTING, sessionId: session.id }
  });

  showToastNotification(body, 'warning');

  // Add vibration for mobile devices
  if (prefs.vibrationEnabled && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }

  // Email notification
  if (userInfo.email && userInfo.nombre) {
    sendEmailNotification({
      email: userInfo.email,
      nombre: userInfo.nombre,
      sessionTitle: session.title,
      sessionDate: session.scheduled_at,
      reminderType: NOTIFICATION_TYPES.SESSION_STARTING
    }).catch(err => console.warn('Email notification failed:', err));
  }
}

/**
 * Send session cancelled notification with email
 */
export function notifySessionCancelled(session, userInfo = {}, preferences = null) {
  const prefs = preferences || getNotificationPreferences();

  if (!prefs.enabled || !prefs.types[NOTIFICATION_TYPES.SESSION_CANCELLED]) {
    return;
  }

  const title = 'Sesión cancelada';
  const body = `La sesión "${session.title}" programada para ${new Date(session.scheduled_at).toLocaleDateString('es-ES')} ha sido cancelada.`;

  showNotification(title, {
    body,
    data: { type: NOTIFICATION_TYPES.SESSION_CANCELLED, sessionId: session.id }
  });

  showToastNotification(body, 'error');

  // Email notification
  if (userInfo.email && userInfo.nombre) {
    sendEmailNotification({
      email: userInfo.email,
      nombre: userInfo.nombre,
      sessionTitle: session.title,
      sessionDate: session.scheduled_at,
      reminderType: NOTIFICATION_TYPES.SESSION_CANCELLED
    }).catch(err => console.warn('Email notification failed:', err));
  }
}

/**
 * Send activity reminder with email
 */
export function notifyActivityReminder(daysSinceLastActivity, userInfo = {}, preferences = null) {
  const prefs = preferences || getNotificationPreferences();

  if (!prefs.enabled || !prefs.types[NOTIFICATION_TYPES.ACTIVITY_REMINDER]) {
    return;
  }

  const title = '¡No olvides practicar!';
  const body = `Hace ${daysSinceLastActivity} días que no realizas simulaciones. ¡Es hora de mantener tus habilidades!`;

  showNotification(title, {
    body,
    data: { type: NOTIFICATION_TYPES.ACTIVITY_REMINDER }
  });

  showToastNotification(body, 'info');

  // Email notification
  if (userInfo.email && userInfo.nombre) {
    sendEmailNotification({
      email: userInfo.email,
      nombre: userInfo.nombre,
      sessionTitle: `Hace ${daysSinceLastActivity} días sin práctica`,
      sessionDate: new Date().toISOString(),
      minutesBefore: daysSinceLastActivity, // reusing parameter
      reminderType: NOTIFICATION_TYPES.ACTIVITY_REMINDER
    }).catch(err => console.warn('Email notification failed:', err));
  }
}

/**
 * Test notification functionality
 */
export async function testNotifications() {
  const permission = await requestNotificationPermission();

  if (permission) {
    showNotification('Notificaciones activas', {
      body: 'El sistema de notificaciones de SimuPed está funcionando correctamente.',
      icon: '/favicon-32x32.png'
    });
  }

  showToastNotification('Notificaciones de prueba enviadas', 'info', 3000);

  return permission;
}
