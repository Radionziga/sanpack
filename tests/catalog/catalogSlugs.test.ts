import { describe, expect, it } from 'vitest';
import { createCatalogSlug } from '@/lib/catalog/catalogSlugs';

describe('createCatalogSlug', () => {
  it('creates a stable URL slug from Cyrillic product titles', () => {
    expect(createCatalogSlug('Сыр Сваля, 3 кг', 'DA-013')).toBe('syr-svalya-3-kg-da-013');
  });

  it('uses the SKU when the title has no transliterable characters', () => {
    expect(createCatalogSlug('奶酪', 'ZH-001')).toBe('zh-001');
  });

  it('uses a safe fallback when both title and SKU are empty', () => {
    expect(createCatalogSlug('', '')).toBe('product');
  });
});
