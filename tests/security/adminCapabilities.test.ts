import { describe, expect, it } from 'vitest';
import { canAccessAdminPath, canMutateAdminResource, getAdminLandingPath } from '@/lib/auth/adminCapabilities';

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
    expect(getAdminLandingPath('content_manager')).toBe('/admin/products');
    expect(getAdminLandingPath('sales_manager')).toBe('/admin/requests');
  });
});
