import { describe, expect, it } from 'vitest';
import {
  productMutationSchema,
  productVariantSchema,
} from '@/lib/validation/adminContent';
import { createVariant } from '@/tests/fixtures/products';

describe('commerce admin validation', () => {
  it.each(['fixed', 'from', 'request', 'informational'] as const)(
    'accepts the shared product price mode %s',
    (priceMode) => {
      expect(productMutationSchema.safeParse({ priceMode }).success).toBe(true);
      expect(productVariantSchema.safeParse(createVariant({ priceMode })).success).toBe(true);
    },
  );

  it.each(['free', 'display-only', ''])('rejects an unknown price mode %j', (priceMode) => {
    expect(productMutationSchema.safeParse({ priceMode }).success).toBe(false);
    expect(productVariantSchema.safeParse({ ...createVariant(), priceMode }).success).toBe(false);
  });
});
