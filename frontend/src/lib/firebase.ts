import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const requiredEnv = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

for (const [key, value] of Object.entries(requiredEnv)) {
  if (!value?.trim()) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }
}

const firebaseConfig = {
  apiKey: requiredEnv.apiKey,
  authDomain: requiredEnv.authDomain,
  projectId: requiredEnv.projectId,
  appId: requiredEnv.appId,
  messagingSenderId: requiredEnv.messagingSenderId,
};

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
