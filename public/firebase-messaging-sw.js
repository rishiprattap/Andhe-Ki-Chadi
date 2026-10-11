// Firebase Messaging Service Worker for Background Web Push Notifications
// Runs in the browser background even when the website tab is closed.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize Firebase inside the Service Worker
// The parameters can be injected dynamically or populated with your project config
const defaultConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

try {
  firebase.initializeApp(defaultConfig);
  const messaging = firebase.messaging();

  // Background Push Event Handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background push message: ', payload);

    const notificationTitle = payload.notification?.title || '🚨 EMERGENCY SOS ALERT: Smart Cane';
    const notificationOptions = {
      body: payload.notification?.body || 'Distress signal received from Smart Cane on Pin D2!',
      icon: '/sos-icon.svg',
      badge: '/sos-icon.svg',
      requireInteraction: true,
      tag: 'emergency-sos',
      data: payload.data || {},
      vibrate: [400, 200, 400, 200, 400],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log('[firebase-messaging-sw.js] Running in passive/demo mode:', e);
}

// Notification Click Handler: Focus or open the emergency dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
