// Firebase Messaging Service Worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCxRrhwANQz_0UEF1m3qxhTcKKlgPMtcek",
  authDomain: "journals-app-eaa7e.firebaseapp.com",
  projectId: "journals-app-eaa7e",
  storageBucket: "journals-app-eaa7e.firebasestorage.app",
  messagingSenderId: "975153403282",
  appId: "1:975153403282:web:bf3545b3f48467abd3dd4b"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Camply Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'Time to journal your thoughts!',
    icon: '/journal-logo-removebg-preview.png',
    badge: '/journal-logo-removebg-preview.png',
    tag: payload.data?.tag || 'camply-notification',
    data: payload.data,
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Open Camply' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle push event directly (fallback)
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[firebase-messaging-sw.js] Push event data:', data);
    } catch (e) {
      console.log('[firebase-messaging-sw.js] Push event text:', event.data.text());
    }
  }
});
