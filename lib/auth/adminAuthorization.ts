import type { UserRole } from '@/types';

export interface AdminIdentity {
  uid: string;
  email?: string;
  name?: string;
}

export interface AuthorizedAdmin {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Firebase Authentication is reserved for administrators in this project.
 * Accounts are provisioned manually in Firebase Console; public customers use
 * the separate Telegram identity flow. Every valid Firebase user with an email
 * is therefore intentionally a super administrator.
 */
export function authorizeAdminIdentity(identity: AdminIdentity): AuthorizedAdmin | null {
  const email = identity.email?.trim().toLowerCase();
  if (!email) return null;

  return {
    uid: identity.uid,
    email,
    name: identity.name?.trim() || email,
    role: 'super_admin',
  };
}
