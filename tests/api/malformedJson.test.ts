import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/security/rateLimit', () => ({
  checkRateLimit: () => ({ allowed: true, retryAfter: 0 }),
}));
vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: vi.fn(() => {
    throw new Error('Database must not be called for malformed JSON.');
  }),
}));
vi.mock('@/lib/auth/server', () => ({
  getAdminSession: vi.fn(async () => ({
    uid: 'admin-1',
    email: 'admin@example.com',
    role: 'super_admin',
  })),
}));

import { POST as createCallback } from '@/app/api/callbacks/route';
import { POST as createOrder } from '@/app/api/requests/route';
import { PATCH as updateOrder } from '@/app/api/admin/orders/[orderId]/route';

function malformedRequest(path: string, method = 'POST') {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
}

describe('malformed mutation JSON', () => {
  it.each([
    {
      name: 'callback',
      invoke: () => createCallback(malformedRequest('/api/callbacks')),
    },
    {
      name: 'checkout',
      invoke: () => createOrder(malformedRequest('/api/requests')),
    },
    {
      name: 'admin order update',
      invoke: () => updateOrder(
        malformedRequest('/api/admin/orders/order-1', 'PATCH'),
        { params: Promise.resolve({ orderId: 'order-1' }) },
      ),
    },
  ])('returns 400 before storage for $name', async ({ invoke }) => {
    const response = await invoke();
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toHaveProperty('error');
  });
});
