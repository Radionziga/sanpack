import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  throw new Error(
    'Firebase client configuration is incomplete. Copy .env.example to .env.local and fill every NEXT_PUBLIC_FIREBASE_* value.'
  );
}

const CLIENT_APP_NAME = 'sanpack-client';
const app = getApps().find((candidate) => candidate.name === CLIENT_APP_NAME)
  ?? initializeApp(firebaseConfig, CLIENT_APP_NAME);

export const auth = getAuth(app);
export default app;
