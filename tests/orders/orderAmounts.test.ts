import { describe, expect, it } from 'vitest';
import { formatOrderAmount, getOrderAmountOrZero } from '@/lib/orders/orderAmounts';

describe('order monetary values', () => {
  it.each([
    { value: undefined, normalized: 0, formatted: 'По запросу' },
    { value: 0, normalized: 0, formatted: '0 сум' },
    { value: -1_500, normalized: -1_500, formatted: '-1 500 сум' },
    { value: 25_000, normalized: 25_000, formatted: '25 000 сум' },
  ])('keeps $value distinct from a missing amount', ({ value, normalized, formatted }) => {
    expect(getOrderAmountOrZero(value)).toBe(normalized);
    expect(formatOrderAmount(value)).toBe(formatted);
  });
});
