'use client';

import {
  browserLocalPersistence,
  setPersistence,
  signInAnonymously,
} from 'firebase/auth';
import { customerAuth } from '@/lib/firebase';

let sessionPromise: Promise<string> | null = null;

function toCustomerSessionError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : '';

  if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
    return new Error('Оформление и история заявок временно недоступны. Пожалуйста, свяжитесь с менеджером.');
  }

  return new Error('Не удалось открыть защищённую сессию. Проверьте соединение и попробуйте ещё раз.');
}

export function ensureCustomerSession() {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    await setPersistence(customerAuth, browserLocalPersistence);
    const user = customerAuth.currentUser
      ?? (await signInAnonymously(customerAuth)).user;
    return user.getIdToken();
  })().catch((error) => {
    sessionPromise = null;
    console.error('Customer session initialization failed.', error);
    throw toCustomerSessionError(error);
  });

  return sessionPromise;
}

export async function getCustomerIdToken() {
  const user = customerAuth.currentUser;
  if (user) return user.getIdToken();
  return ensureCustomerSession();
}
