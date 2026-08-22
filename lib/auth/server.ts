import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import {
  authorizeAdminIdentity,
  type StoredAdminAuthorization,
} from '@/lib/auth/adminAuthorization';
import type { UserRole } from '@/types';

export const SESSION_COOKIE_NAME = '__session';
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export interface AdminSession {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}

export async function verifyAdminToken(token: DecodedIdToken): Promise<AdminSession | null> {
  const enforceAdminDocument = process.env.SANPACK_ENFORCE_ADMIN_DOCUMENTS === 'true';
  let storedAdmin: StoredAdminAuthorization | null = null;

  try {
    const snapshot = await getAdminDb().collection('admins').doc(token.uid).get();
    storedAdmin = snapshot.exists
      ? snapshot.data() as StoredAdminAuthorization
      : null;
  } catch (error) {
    if (enforceAdminDocument) throw error;
    console.warn('Admin document could not be checked; using compatibility authorization.');
  }

  return authorizeAdminIdentity({
    identity: {
      uid: token.uid,
      email: token.email,
      name: token.name,
    },
    storedAdmin,
    enforceAdminDocument,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const isLocalIdToken = process.env.NODE_ENV !== 'production'
      && sessionCookie.startsWith('local:');
    const decoded = isLocalIdToken
      ? await getAdminAuth().verifyIdToken(sessionCookie.slice('local:'.length), false)
      : await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return verifyAdminToken(decoded);
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');
  return admin;
}
