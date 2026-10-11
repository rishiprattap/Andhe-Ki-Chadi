// Browser Notifications Service for Emergency Distress Signals

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return {
      supported: false,
      granted: false,
      status: 'unsupported',
      message: 'This browser does not support desktop notifications.',
    };
  }

  // If already denied, notify user how to re-enable in browser settings
  if (Notification.permission === 'denied') {
    return {
      supported: true,
      granted: false,
      status: 'denied',
      message: 'Notifications are blocked in your browser site permissions. Click the lock/tune icon near the URL bar to allow notifications.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      supported: true,
      granted: permission === 'granted',
      status: permission,
      message: permission === 'granted'
        ? 'Desktop emergency alerts enabled!'
        : 'Notification permissions were not granted.',
    };
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return {
      supported: true,
      granted: false,
      status: 'denied',
      error: err,
      message: 'Could not request notification permissions.',
    };
  }
}

export function getNotificationPermissionStatus() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default', 'granted', 'denied'
}

export function showEmergencyDesktopNotification(alert) {
  if (!('Notification' in window)) return null;

  if (Notification.permission !== 'granted') {
    return null;
  }

  const isSimulated = Boolean(
    alert.isSimulated ||
    alert.simulated ||
    (alert.id && alert.id.startsWith('mock-')) ||
    (alert.note && (alert.note.includes('SIMULAT') || alert.note.includes('Simulated') || alert.note.includes('Local Simulation')))
  );

  const title = isSimulated
    ? `⚠️ [SIMULATION / DRILL] Test SOS: ${deviceId}`
    : `🚨 EMERGENCY SOS ALERT: ${deviceId}`;

  const body = isSimulated
    ? `[TEST ONLY - NOT AN ACTUAL EMERGENCY] Simulated SOS drill event for ${deviceId} at ${timeStr}.`
    : `Distress signal triggered on Pin D2 at ${timeStr}. The visually impaired user requires urgent assistance!`;

  const options = {
    body,
    icon: '/sos-icon.svg',
    badge: '/sos-icon.svg',
    tag: `sos-${alert.id || Date.now()}`,
    requireInteraction: !isSimulated,
    silent: false,
    vibrate: isSimulated ? [100, 100, 100] : [400, 200, 400, 200, 400],
  };

  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return notification;
  } catch (err) {
    console.warn('Failed to show desktop notification:', err);
    return null;
  }
}
