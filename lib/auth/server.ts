import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth } from '@/lib/firebase/admin';
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
  const email = token.email?.toLowerCase();
  if (!email) return null;

  return {
    uid: token.uid,
    email,
    name: token.name || email,
    role: 'super_admin',
  };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
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
