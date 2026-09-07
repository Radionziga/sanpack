import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ order: {} as Record<string, unknown> }));
vi.mock('@/lib/auth/server', () => ({ getAdminSession: async () => ({ uid: 'sales', email: 'sales@example.test', role: 'sales_manager' }) }));
vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: () => {
    const reference = {
      id: 'order-1',
      get: async () => ({ id: 'order-1', exists: true, data: () => ({ ...state.order }) }),
    };
    return {
      collection: () => ({ doc: () => reference }),
      runTransaction: async (callback: (transaction: unknown) => Promise<unknown>) => callback({
        get: reference.get,
        update: (_reference: unknown, patch: Record<string, unknown>) => { state.order = { ...state.order, ...patch }; },
      }),
    };
  },
}));

import { PATCH } from '@/app/api/admin/orders/[orderId]/route';

function statusRequest(status: string, expectedRevision: number) {
  return new Request('http://localhost/api/admin/orders/order-1', {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'status', status, expectedRevision }),
  });
}

describe('admin order optimistic concurrency', () => {
  beforeEach(() => {
    state.order = { requestNumber: 'ORD-1', contactName: 'A', phone: '+998901234567', items: [], status: 'new', revision: 1, auditTrail: [], createdAt: '2026-01-01' };
  });

  it('returns 409 instead of silently overwriting a newer revision', async () => {
    expect((await PATCH(statusRequest('fulfilled', 1), { params: Promise.resolve({ orderId: 'order-1' }) })).status).toBe(200);
    expect(state.order.revision).toBe(2);
    expect((await PATCH(statusRequest('processing', 1), { params: Promise.resolve({ orderId: 'order-1' }) })).status).toBe(409);
    expect(state.order.status).toBe('fulfilled');
  });
});
