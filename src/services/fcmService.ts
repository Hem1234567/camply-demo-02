import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';

// FCM VAPID key - you'll need to generate this in Firebase Console
// Go to Project Settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let messagingInstance: Messaging | null = null;

// Initialize messaging lazily
async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('Firebase Messaging is not supported in this browser');
      return null;
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Get FCM token
export async function getFCMToken(userId: string): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  try {
    // Register service worker first
    const swRegistration = await registerServiceWorker();
    if (!swRegistration) return null;

    // Request notification permission if not granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }
    }

    // Get the token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });

    if (token) {
      console.log('FCM Token obtained:', token.substring(0, 20) + '...');
      // Save token to Firestore
      await saveFCMToken(userId, token);
      return token;
    }

    console.warn('No FCM token available');
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

// Save FCM token to Firestore
async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    const tokenRef = doc(db, 'users', userId, 'fcmTokens', 'web');
    await setDoc(tokenRef, {
      token,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      platform: 'web',
      userAgent: navigator.userAgent
    }, { merge: true });
    console.log('FCM token saved to Firestore');
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

// Get saved FCM token
export async function getSavedFCMToken(userId: string): Promise<string | null> {
  try {
    const tokenRef = doc(db, 'users', userId, 'fcmTokens', 'web');
    const tokenDoc = await getDoc(tokenRef);
    
    if (tokenDoc.exists()) {
      return tokenDoc.data().token;
    }
    return null;
  } catch (error) {
    console.error('Error getting saved FCM token:', error);
    return null;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: any) => void): () => void {
  let unsubscribe: (() => void) | null = null;

  getMessagingInstance().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
      });
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

// Check if FCM is supported
export async function isFCMSupported(): Promise<boolean> {
  return await isSupported();
}
