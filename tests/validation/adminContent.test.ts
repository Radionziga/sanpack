import { describe, expect, it } from 'vitest';
import {
  attributeMutationSchema,
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

describe('attribute admin validation', () => {
  const validAttribute = {
    key: 'package_weight',
    titleRu: 'Вес упаковки',
    titleUz: 'Qadoq og‘irligi',
    type: 'select' as const,
    options: [
      { value: '500_g', labelRu: '500 г', labelUz: '500 g' },
    ],
    filterable: true,
    cardVisible: true,
    productVisible: true,
    sortOrder: 1,
  };

  it('accepts a complete attribute and supplies the backward-compatible required flag', () => {
    const result = attributeMutationSchema.safeParse(validAttribute);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.required).toBe(false);
  });

  it.each(['Package Weight', 'package-weight', '_weight', 'вес'])('rejects invalid key %j', (key) => {
    expect(attributeMutationSchema.safeParse({ ...validAttribute, key }).success).toBe(false);
  });

  it('rejects duplicate option values case-insensitively', () => {
    expect(attributeMutationSchema.safeParse({
      ...validAttribute,
      options: [
        ...validAttribute.options,
        { value: '500_G', labelRu: 'Дубликат', labelUz: 'Dublikat' },
      ],
    }).success).toBe(false);
  });
});
