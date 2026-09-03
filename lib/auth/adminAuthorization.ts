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

/** Identity is not authorization: only an explicitly provisioned admins/{uid} grants access. */
export function authorizeAdminIdentity(
  identity: AdminIdentity,
  grant?: { role?: unknown; active?: unknown } | null,
): AuthorizedAdmin | null {
  const email = identity.email?.trim().toLowerCase();
  const roles: UserRole[] = ['super_admin', 'content_manager', 'sales_manager', 'viewer'];
  if (!email || !grant || grant.active !== true || !roles.includes(grant.role as UserRole)) return null;

  return {
    uid: identity.uid,
    email,
    name: identity.name?.trim() || email,
    role: grant.role as UserRole,
  };
}
