import 'server-only';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

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
  return (
    getApps()[0] ??
    initializeApp({
      credential: getCredential(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  );
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
