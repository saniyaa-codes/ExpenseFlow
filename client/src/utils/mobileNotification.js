/**
 * Mobile & Browser Push Notification Utility
 * Handles native HTML5 notifications and mobile vibration
 */

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
};

export const getNotificationPermission = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

/**
 * Triggers a mobile device notification with vibration
 */
export const triggerMobileNotification = (title, message, options = {}) => {
  // 1. Mobile Physical Vibration API
  if ('vibrate' in navigator) {
    try {
      // Vibrate pattern: buzz-pause-buzz-pause-buzz
      navigator.vibrate([300, 100, 300, 100, 400]);
    } catch (e) {
      console.warn('Vibration API not allowed or supported:', e);
    }
  }

  // 2. Native System/Browser Push Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: message,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `expenseflow-${Date.now()}`,
        requireInteraction: true,
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }
};

/**
 * Handle budget alerts returned from creating a transaction
 */
export const handleTransactionBudgetAlerts = (budgetAlerts) => {
  if (!budgetAlerts || !Array.isArray(budgetAlerts) || budgetAlerts.length === 0) return;

  budgetAlerts.forEach((alert) => {
    triggerMobileNotification(
      `⚠️ ${alert.title}`,
      `${alert.message} (${alert.threshold}% threshold reached)`
    );
  });
};
