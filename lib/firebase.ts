import { initializeApp, getApps } from 'firebase/app';
import { browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth';

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

const CUSTOMER_APP_NAME = 'sanpack-customer';
const customerApp = getApps().find((candidate) => candidate.name === CUSTOMER_APP_NAME)
  ?? initializeApp(firebaseConfig, CUSTOMER_APP_NAME);

function getBrowserAuth(firebaseApp: typeof app) {
  try {
    return initializeAuth(firebaseApp, { persistence: browserLocalPersistence });
  } catch {
    return getAuth(firebaseApp);
  }
}

export const auth = getBrowserAuth(app);
export const customerAuth = getBrowserAuth(customerApp);
export default app;
