import { describe, expect, it } from 'vitest';
import { isStatusOnlyOrderEdit } from '@/lib/orders/adminOrderEdit';
import type { RequestOrder } from '@/types';

const current = {
  id: 'request-1', status: 'new', contactName: 'Owner', phone: '+998901234567',
  deliveryAddress: 'Address', deliveryDate: '2026-09-25', deliveryWindow: '13:00-17:00',
  notes: 'Controlled test', adjustment: 0, items: [{ productId: 'p1', quantity: 1, price: 900 }],
} as RequestOrder;

describe('Admin order status-only edit', () => {
  it('uses the status mutation when only status changes', () => {
    expect(isStatusOnlyOrderEdit({ ...current, status: 'processing' }, current)).toBe(true);
  });

  it('does not route business-data edits through the status-only mutation', () => {
    expect(isStatusOnlyOrderEdit({ ...current, status: 'processing', phone: '+998998887766' }, current)).toBe(false);
    expect(isStatusOnlyOrderEdit({ ...current, status: 'processing', items: [...current.items] }, current)).toBe(false);
    expect(isStatusOnlyOrderEdit({ ...current, status: 'processing', adjustment: -100 }, current)).toBe(false);
  });

  it('does not create an audit entry when status is unchanged', () => {
    expect(isStatusOnlyOrderEdit(current, current)).toBe(false);
  });
});
