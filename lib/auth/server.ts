import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import type { UserRole } from '@/types';

export const SESSION_COOKIE_NAME = '__session';
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export interface AdminSession {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}

const roles: UserRole[] = ['super_admin', 'content_manager', 'sales_manager', 'viewer'];

function bootstrapAdminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function verifyAdminToken(token: DecodedIdToken): Promise<AdminSession | null> {
  const email = token.email?.toLowerCase();
  if (!email || token.email_verified === false) return null;

  const adminDocument = await getAdminDb().collection('admins').doc(token.uid).get();
  const data = adminDocument.data();
  const bootstrapAllowed = bootstrapAdminEmails().has(email);

  if (!adminDocument.exists && !bootstrapAllowed) return null;
  if (data?.active === false) return null;

  const configuredRole = data?.role as UserRole | undefined;
  const role = configuredRole && roles.includes(configuredRole)
    ? configuredRole
    : 'super_admin';

  return {
    uid: token.uid,
    email,
    name: data?.name || token.name || email,
    role,
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
