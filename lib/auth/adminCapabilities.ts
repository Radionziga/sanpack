import type { UserRole } from '@/types';

export type AdminCapability = 'catalog.write' | 'orders.write' | 'settings.write';

const capabilities: Record<UserRole, ReadonlySet<AdminCapability>> = {
  super_admin: new Set(['catalog.write', 'orders.write', 'settings.write']),
  content_manager: new Set(['catalog.write']),
  sales_manager: new Set(['orders.write']),
  viewer: new Set(),
};

export function hasAdminCapability(role: UserRole, capability: AdminCapability) {
  return capabilities[role].has(capability);
}

export function canMutateAdminResource(role: UserRole, resource?: string) {
  if (resource === 'requests') return false;
  if (resource === 'settings') return hasAdminCapability(role, 'settings.write');
  return ['products', 'categories', 'attributes', 'clients', 'banners'].includes(resource || '')
    && hasAdminCapability(role, 'catalog.write');
}

export function canAccessAdminPath(role: UserRole, path: string) {
  if (role === 'super_admin' || path === '/admin') return true;
  if (path.startsWith('/admin/requests') || path.startsWith('/admin/bag-designer')) {
    return role === 'sales_manager';
  }
  if (path.startsWith('/admin/settings') || path.startsWith('/admin/contact-settings')
    || path.startsWith('/admin/integrations') || path.startsWith('/admin/document-settings')
    || path.startsWith('/admin/services')) return false;
  return role === 'content_manager';
}
