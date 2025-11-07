import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCxRrhwANQz_0UEF1m3qxhTcKKlgPMtcek",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "journals-app-eaa7e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "journals-app-eaa7e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "journals-app-eaa7e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "975153403282",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:975153403282:web:bf3545b3f48467abd3dd4b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
