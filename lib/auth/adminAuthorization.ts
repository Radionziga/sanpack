import type { UserRole } from '@/types';

const adminRoles: ReadonlySet<UserRole> = new Set([
  'super_admin',
  'content_manager',
  'sales_manager',
  'viewer',
]);

export interface AdminIdentity {
  uid: string;
  email?: string;
  name?: string;
}

export interface StoredAdminAuthorization {
  active?: unknown;
  role?: unknown;
  name?: unknown;
}

export interface AuthorizedAdmin {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}

function storedRole(value: unknown): UserRole | null {
  return typeof value === 'string' && adminRoles.has(value as UserRole)
    ? value as UserRole
    : null;
}

export function authorizeAdminIdentity({
  identity,
  storedAdmin,
  enforceAdminDocument,
}: {
  identity: AdminIdentity;
  storedAdmin: StoredAdminAuthorization | null;
  enforceAdminDocument: boolean;
}): AuthorizedAdmin | null {
  const email = identity.email?.trim().toLowerCase();
  if (!email) return null;

  if (storedAdmin?.active === false) return null;

  const role = storedRole(storedAdmin?.role);
  if (!role && enforceAdminDocument) return null;

  const storedName = typeof storedAdmin?.name === 'string'
    ? storedAdmin.name.trim()
    : '';

  return {
    uid: identity.uid,
    email,
    name: storedName || identity.name?.trim() || email,
    role: role || 'super_admin',
  };
}
