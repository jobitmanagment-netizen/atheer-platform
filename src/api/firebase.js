// src/api/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

// Firebase configuration from environment variables (secure, not hardcoded)
function getFirebaseConfig() {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];
  
  const missing = requiredKeys.filter(key => !import.meta.env[key]);
  if (missing.length > 0 && import.meta.env.VITE_APP_ENV === 'production') {
    throw new Error(`Missing required Firebase env vars: ${missing.join(', ')}`);
  }
  
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
  };
}

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const firebaseAuth = {
  // Register new user (optionally set a display name on the profile)
  register: async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    return userCredential.user;
  },

  // Login existing user
  login: async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // Login with Google — platform-aware.
  // On native (Capacitor / the Android APK) signInWithPopup never resolves
  // inside the WebView, so we run the native Google flow via the plugin, then
  // exchange the returned credential for a Firebase JS SDK session. On the web
  // the popup works as before.
  loginWithGoogle: async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;
      const accessToken = result.credential?.accessToken;
      if (!idToken && !accessToken) {
        throw new Error('Google sign-in was cancelled or returned no credential.');
      }
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const userCredential = await signInWithCredential(auth, credential);
      return userCredential.user;
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  },

  // Logout — also clear any native plugin session.
  logout: async () => {
    if (Capacitor.isNativePlatform()) {
      try { await FirebaseAuthentication.signOut(); } catch { /* non-fatal */ }
    }
    return signOut(auth);
  },

  // Update the current user's display name
  updateDisplayName: (displayName) => updateProfile(auth.currentUser, { displayName }),

  // Send a password-reset email
  sendPasswordReset: (email) => sendPasswordResetEmail(auth, email),

  // Confirm a password reset using the oobCode from the email link
  confirmPasswordReset: (oobCode, newPassword) => confirmPasswordReset(auth, oobCode, newPassword),

  // Listen to auth state changes
  onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),

  // Get current user
  getCurrentUser: () => auth.currentUser,
};

export default firebaseAuth;
