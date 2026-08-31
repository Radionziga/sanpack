import { beforeEach, describe, expect, it, vi } from 'vitest';
import { taxonomyCategories } from '@/tests/fixtures/categories';
import { createProduct } from '@/tests/fixtures/products';

vi.mock('@/components/layout/Header', () => ({ Header: () => null }));
vi.mock('@/components/layout/Footer', () => ({ Footer: () => null }));
vi.mock('@/components/catalog/CatalogListing', () => ({ CatalogListing: () => null }));
vi.mock('@/lib/repositories/serverCatalogRepository', () => ({ getPublicCategories: vi.fn(), getPublicProducts: vi.fn(), getPublicAttributes: vi.fn() }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); }, permanentRedirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));

import { getPublicCategories, getPublicProducts, getPublicAttributes } from '@/lib/repositories/serverCatalogRepository';
import { CategoryRoutePage } from '@/components/catalog/CategoryRoutePage';
import sitemap from '@/app/sitemap';

beforeEach(() => {
  vi.mocked(getPublicCategories).mockResolvedValue(taxonomyCategories);
  vi.mocked(getPublicProducts).mockResolvedValue([createProduct({ categoryId: 'grains', categorySlug: 'grains' })]);
  vi.mocked(getPublicAttributes).mockResolvedValue([]);
});

describe('actual category route boundary', () => {
  it.each([['grocery'], ['grocery', 'grains']])('renders %j', async (...segments) => {
    expect(await CategoryRoutePage({ locale: 'ru', segments })).toBeTruthy();
  });
  it('redirects a former flat category URL with locale intact', async () => {
    await expect(CategoryRoutePage({ locale: 'uz', segments: ['grains'] })).rejects.toThrow('REDIRECT:/uz/catalog/grocery/grains');
  });
  it('rejects invalid parent, unsupported locale and hidden ancestry', async () => {
    await expect(CategoryRoutePage({ locale: 'ru', segments: ['dairy', 'grains'] })).rejects.toThrow('NOT_FOUND');
    await expect(CategoryRoutePage({ locale: 'de', segments: ['grocery'] })).rejects.toThrow('NOT_FOUND');
    vi.mocked(getPublicCategories).mockResolvedValue(taxonomyCategories.map((category) => category.id === 'grocery' ? { ...category, status: 'hidden' } : category));
    await expect(CategoryRoutePage({ locale: 'ru', segments: ['grocery', 'grains'] })).rejects.toThrow('NOT_FOUND');
  });
  it('does not disguise an unavailable backend as a missing category', async () => {
    vi.mocked(getPublicCategories).mockRejectedValue(new Error('BACKEND_UNAVAILABLE'));
    await expect(CategoryRoutePage({ locale: 'ru', segments: ['grocery'] })).rejects.toThrow('BACKEND_UNAVAILABLE');
  });
  it('emits only canonical nested sitemap entries across all locales', async () => {
    const entries = await sitemap();
    for (const locale of ['ru', 'uz', 'en', 'zh']) {
      expect(entries.some((entry) => entry.url.endsWith(`/${locale}/catalog/grocery/grains`))).toBe(true);
      expect(entries.some((entry) => entry.url.endsWith(`/${locale}/catalog/grains`))).toBe(false);
    }
  });
});
