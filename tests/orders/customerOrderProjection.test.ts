import { describe, expect, it } from 'vitest';
import { projectCustomerOrder } from '@/lib/orders/customerOrderProjection';

describe('customer order projection', () => {
  it('does not expose admin identity, audit or notification internals', () => {
    const projected = projectCustomerOrder({
      id: 'o1', requestNumber: 'ORD-1', contactName: 'A', phone: '+998', items: [],
      status: 'new', createdAt: '2026-01-01', customerUid: 'secret',
      auditTrail: [{ id: 'a', action: 'created', actorUid: 'admin', actorLabel: 'owner@example.com', createdAt: 'x', summary: 'x', revision: 1 }],
      notification: { delivered: true },
    } as never);
    expect(projected).not.toHaveProperty('customerUid');
    expect(projected).not.toHaveProperty('auditTrail');
    expect(projected).not.toHaveProperty('notification');
  });
});
