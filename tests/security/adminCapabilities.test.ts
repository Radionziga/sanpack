import { describe, expect, it } from 'vitest';
import { canAccessAdminPath, canMutateAdminResource, getAdminLandingPath, hasAdminCapability } from '@/lib/auth/adminCapabilities';

describe('admin role capabilities', () => {
  it('lets content managers maintain catalog without privileged settings/orders', () => {
    expect(canMutateAdminResource('content_manager', 'products')).toBe(true);
    expect(canMutateAdminResource('content_manager', 'categories')).toBe(true);
    expect(canMutateAdminResource('content_manager', 'settings')).toBe(false);
    expect(canAccessAdminPath('content_manager', '/admin/requests')).toBe(false);
  });

  it('keeps sales and viewer boundaries coherent', () => {
    expect(canAccessAdminPath('sales_manager', '/admin/requests')).toBe(true);
    expect(canAccessAdminPath('sales_manager', '/admin/products')).toBe(false);
    expect(canMutateAdminResource('viewer', 'products')).toBe(false);
    expect(canAccessAdminPath('viewer', '/admin/products')).toBe(false);
    expect(canAccessAdminPath('viewer', '/admin/settings')).toBe(false);
    expect(canAccessAdminPath('viewer', '/admin')).toBe(false);
    expect(canAccessAdminPath('content_manager', '/admin/links')).toBe(false);
    expect(canAccessAdminPath('super_admin', '/admin/links')).toBe(true);
    expect(canAccessAdminPath('super_admin', '/admin/analytics')).toBe(true);
    expect(canAccessAdminPath('content_manager', '/admin/analytics')).toBe(false);
    expect(canAccessAdminPath('sales_manager', '/admin/analytics')).toBe(false);
    expect(getAdminLandingPath('content_manager')).toBe('/admin/products');
    expect(getAdminLandingPath('sales_manager')).toBe('/admin/requests');
  });

  it('reserves bulk price writes for the super admin', () => {
    expect(hasAdminCapability('super_admin', 'pricing.write')).toBe(true);
    expect(canAccessAdminPath('super_admin', '/admin/prices')).toBe(true);
    for (const role of ['content_manager', 'sales_manager', 'viewer'] as const) {
      expect(hasAdminCapability(role, 'pricing.write')).toBe(false);
      expect(canAccessAdminPath(role, '/admin/prices')).toBe(false);
    }
  });
});
