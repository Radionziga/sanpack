import { describe, expect, it } from 'vitest';
import {
  clientMutationSchema,
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

describe('client admin validation', () => {
  const validClient = {
    name: 'Example Partner',
    logo: '/partners/example.svg',
    category: 'partner' as const,
    sortOrder: 1,
  };

  it('accepts internal asset paths and full logo URLs', () => {
    expect(clientMutationSchema.safeParse(validClient).success).toBe(true);
    expect(clientMutationSchema.safeParse({
      ...validClient,
      logo: 'https://cdn.example.com/partner.png',
    }).success).toBe(true);
  });

  it.each(['', 'logo.png', '//cdn.example.com/logo.png'])('rejects invalid logo %j', (logo) => {
    expect(clientMutationSchema.safeParse({ ...validClient, logo }).success).toBe(false);
  });
});
