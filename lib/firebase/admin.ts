import 'server-only';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function getCredential() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!encoded) {
    return applicationDefault();
  }

  try {
    return cert(JSON.parse(encoded));
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
  }
}

function getAdminApp() {
  const adminAppName = 'sanpack-admin';
  return (
    getApps().find((app) => app.name === adminAppName) ??
    initializeApp({
      credential: getCredential(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    }, adminAppName)
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}
