import { describe, expect, it } from 'vitest';
import {
  attributeMutationSchema,
  clientMutationSchema,
  productMutationSchema,
  productVariantSchema,
  settingsMutationSchema,
} from '@/lib/validation/adminContent';
import { createProduct, createVariant } from '@/tests/fixtures/products';

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

  it('accepts the product attribute value types used by the shared model', () => {
    expect(productMutationSchema.safeParse({
      attributes: {
        label: 'Reusable',
        weight: 0,
        available: false,
        colors: ['red', 'blue'],
      },
    }).success).toBe(true);
  });

  it.each([
    'in_stock',
    'on_order',
    'temporarily_unavailable',
    'discontinued',
    'unavailable',
    'informational',
  ] as const)('accepts the shared variant availability %s', (availability) => {
    expect(productVariantSchema.safeParse(createVariant({ availability })).success).toBe(true);
  });

  it('accepts a complete product from the shared TypeScript model', () => {
    expect(productMutationSchema.safeParse(createProduct()).success).toBe(true);
  });

  it('accepts typed variant attributes and generic comparison pricing', () => {
    expect(productVariantSchema.safeParse(createVariant({
      attributes: { storage: 256, color: 'blue', nfc: true, bands: ['5g', 'lte'] },
      unitPricing: { quantity: 500, unit: 'gram', displayUnit: 'kilogram' },
    })).success).toBe(true);
    expect(productMutationSchema.safeParse({
      catalogPriceBasis: 'comparison',
      unitPricing: { quantity: 2, unit: 'kilogram', displayUnit: 'kilogram' },
    }).success).toBe(true);
  });

  it('rejects comparison pricing across incompatible physical dimensions', () => {
    expect(productMutationSchema.safeParse({
      unitPricing: { quantity: 2, unit: 'kilogram', displayUnit: 'liter' },
    }).success).toBe(false);
  });

  it.each([
    { field: 'slug', patch: { slug: 'Bad slug' } },
    { field: 'images', patch: { images: ['javascript:alert(1)'] } },
    { field: 'showPrice', patch: { showPrice: 'yes' } },
    { field: 'status', patch: { status: 'deleted' } },
  ])('rejects an invalid known product field: $field', ({ patch }) => {
    expect(productMutationSchema.safeParse(patch).success).toBe(false);
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

  it.each(['text', 'number', 'select', 'multiselect', 'range', 'boolean', 'color'] as const)(
    'accepts the shared attribute type %s',
    (type) => {
      expect(attributeMutationSchema.safeParse({ ...validAttribute, type }).success).toBe(true);
    },
  );

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

describe('storefront service settings validation', () => {
  it('accepts service visibility and a managed navigation image', () => {
    expect(settingsMutationSchema.safeParse({
      modules: {
        branding: {
          enabled: true,
          navigationImage: 'https://cdn.example.com/branding.webp',
          navigationImagePath: 'media/services/branding.webp',
        },
        bagDesigner: {
          enabled: false,
          navigationImage: '/catalog/category-icons-v3/bag-designer-service-v2.webp',
        },
      },
    }).success).toBe(true);
  });

  it('rejects an unsafe service image URL', () => {
    expect(settingsMutationSchema.safeParse({
      modules: {
        branding: {
          enabled: true,
          navigationImage: 'javascript:alert(1)',
        },
      },
    }).success).toBe(false);
  });
});
