import { describe, expect, it } from 'vitest';
import { authorizeAdminIdentity } from '@/lib/auth/adminAuthorization';

const identity = {
  uid: 'owner-uid',
  email: 'Owner@Example.com',
  name: 'Firebase Name',
};

describe('admin authorization policy', () => {
  it('grants the explicit role from an active admin record', () => {
    expect(authorizeAdminIdentity(identity, { active: true, role: 'super_admin' })).toEqual({
      uid: 'owner-uid',
      email: 'owner@example.com',
      name: 'Firebase Name',
      role: 'super_admin',
    });
  });

  it('uses the normalized email when Firebase has no display name', () => {
    expect(authorizeAdminIdentity({ uid: 'owner-uid', email: ' Admin@Example.com ' }, { active: true, role: 'super_admin' }))
      .toMatchObject({ name: 'admin@example.com', role: 'super_admin' });
  });

  it('denies a Firebase identity without an email', () => {
    expect(authorizeAdminIdentity({ uid: 'phone-only-user' })).toBeNull();
  });

  it.each([undefined, null, {}, { active: false, role: 'super_admin' }, { role: 'super_admin' },
    { active: true, role: 'owner' }, { active: 'true', role: 'super_admin' }])('denies absent, disabled or malformed grants: %j', (grant) => {
    expect(authorizeAdminIdentity(identity, grant)).toBeNull();
  });

  it.each(['content_manager', 'sales_manager', 'viewer'])('never promotes %s to super_admin', (role) => {
    expect(authorizeAdminIdentity(identity, { active: true, role })?.role).toBe(role);
  });
});
