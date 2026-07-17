import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Firebase web config identifies the Firebase project; it is not a private
// credential and is bundled into every browser client by Firebase's SDK. The
// fallback makes static/Git-based deployments work before host environment
// variables have been configured. VITE_* values still take precedence.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBG02A_z-cHkEOKCXqxnXHqOao0oXzAiJY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "languagelab-411df.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "languagelab-411df",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "languagelab-411df.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "747245981807",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:747245981807:web:1e58e8c729f9c05571bd9a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WFKJSK0P0K"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export { signInWithEmailAndPassword, signOut };
