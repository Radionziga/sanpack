import { describe, expect, it } from 'vitest';
import { authorizeAdminIdentity } from '@/lib/auth/adminAuthorization';

const identity = {
  uid: 'owner-uid',
  email: 'Owner@Example.com',
  name: 'Firebase Name',
};

describe('admin authorization policy', () => {
  it('grants super_admin to a manually provisioned Firebase user', () => {
    expect(authorizeAdminIdentity(identity)).toEqual({
      uid: 'owner-uid',
      email: 'owner@example.com',
      name: 'Firebase Name',
      role: 'super_admin',
    });
  });

  it('uses the normalized email when Firebase has no display name', () => {
    expect(authorizeAdminIdentity({ uid: 'owner-uid', email: ' Admin@Example.com ' }))
      .toMatchObject({ name: 'admin@example.com', role: 'super_admin' });
  });

  it('denies a Firebase identity without an email', () => {
    expect(authorizeAdminIdentity({ uid: 'phone-only-user' })).toBeNull();
  });
});
