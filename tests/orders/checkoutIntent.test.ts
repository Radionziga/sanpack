import { describe, expect, it } from 'vitest';
import { checkoutIntentsMatch, readPendingCheckoutIntent } from '@/lib/orders/checkoutIntent';

const input = {
  contactName: 'Customer', phone: '+998 90 123 45 67', deliveryAddress: 'Tashkent address',
  deliveryDate: '2026-09-10', deliveryWindow: '09:00-13:00',
  items: [{ productId: 'product-1', quantity: 1 }],
};

describe('pending checkout intent', () => {
  it('keeps the exact key and business intent across reload', () => {
    const values = new Map([['pending', JSON.stringify({ key: 'checkout-intent-0001', input })]]);
    const storage = { getItem: (key: string) => values.get(key) || null, removeItem: (key: string) => values.delete(key) };
    expect(readPendingCheckoutIntent(storage, 'pending')).toEqual({ key: 'checkout-intent-0001', input });
  });

  it('distinguishes an exact retry from a changed form', () => {
    expect(checkoutIntentsMatch(input, { ...input })).toBe(true);
    expect(checkoutIntentsMatch(input, { ...input, notes: 'changed' })).toBe(false);
  });

  it('keeps transport authentication outside the persisted business identity', () => {
    const restored = readPendingCheckoutIntent({
      getItem: () => JSON.stringify({
        key: 'checkout-intent-0001',
        input: { ...input, telegramInitData: 'expired-transport-proof' },
      }),
      removeItem: () => undefined,
    }, 'pending');
    expect(restored).toEqual({ key: 'checkout-intent-0001', input });
    expect('telegramInitData' in (restored?.input || {})).toBe(false);
  });
});
