import { describe, expect, it } from 'vitest';
import { authorizeAdminIdentity } from '@/lib/auth/adminAuthorization';

const identity = {
  uid: 'owner-uid',
  email: 'Owner@Example.com',
  name: 'Firebase Name',
};

describe('admin authorization policy', () => {
  it('preserves the active admin role and profile from admins/{uid}', () => {
    expect(authorizeAdminIdentity({
      identity,
      storedAdmin: { active: true, role: 'sales_manager', name: 'Sales Owner' },
      enforceAdminDocument: true,
    })).toEqual({
      uid: 'owner-uid',
      email: 'owner@example.com',
      name: 'Sales Owner',
      role: 'sales_manager',
    });
  });

  it('denies an inactive admin in both compatibility and enforcement modes', () => {
    expect(authorizeAdminIdentity({
      identity,
      storedAdmin: { active: false, role: 'super_admin' },
      enforceAdminDocument: false,
    })).toBeNull();
  });

  it('denies a missing admin document when enforcement is enabled', () => {
    expect(authorizeAdminIdentity({
      identity,
      storedAdmin: null,
      enforceAdminDocument: true,
    })).toBeNull();
  });

  it('keeps the legacy owner path available before enforcement is approved', () => {
    expect(authorizeAdminIdentity({
      identity,
      storedAdmin: null,
      enforceAdminDocument: false,
    })).toMatchObject({ role: 'super_admin' });
  });

  it('denies malformed roles when enforcement is enabled', () => {
    expect(authorizeAdminIdentity({
      identity,
      storedAdmin: { active: true, role: 'owner' },
      enforceAdminDocument: true,
    })).toBeNull();
  });
});
