import { describe, expect, it } from 'vitest';
import { initialSiteSettings } from '@/lib/seedData';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import { createCategory, taxonomyCategories } from '@/tests/fixtures/categories';
import {
  buildCategoryMetadata,
  buildProductImageAlt,
  buildProductMetadata,
  getEffectiveCategorySeo,
  getEffectiveProductSeo,
  isProductSeoIndexable,
  safeSitemapLastModified,
} from '@/lib/seo/policy';
import type { Language } from '@/types';

describe('automatic Product SEO policy', () => {
  const product = createProduct({
    categoryId: 'grains', categorySlug: 'grains', mainImage: '/media/product.webp',
    shortDescriptionRu: '', shortDescriptionUz: '', shortDescriptionEn: '',
  });

  it('builds complete effective metadata without manual SEO fields', () => {
    const effective = getEffectiveProductSeo(product, 'ru', initialSiteSettings, taxonomyCategories);
    expect(effective).toMatchObject({
      titleSource: 'generated',
      descriptionSource: 'generated',
      imageSource: 'entity',
      indexable: true,
      canonical: '/ru/product/test-product',
      image: '/media/product.webp',
      issues: [],
    });
    expect(effective.title).toContain('Тестовый товар');
    expect(effective.title).toContain('SANPACK');
    expect(effective.description).toContain('Характеристики');
    expect(effective.alternates).toMatchObject({
      ru: expect.stringMatching(/\/ru\/product\/test-product$/),
      uz: expect.stringMatching(/\/uz\/product\/test-product$/),
      en: expect.stringMatching(/\/en\/product\/test-product$/),
      zh: expect.stringMatching(/\/zh\/product\/test-product$/),
      'x-default': expect.stringMatching(/\/ru\/product\/test-product$/),
    });
  });

  it('uses exact localized overrides first without leaking them into other locales', () => {
    const customized = createProduct({
      ...product,
      seo: { titleRu: 'Ручной title', descriptionRu: 'Ручное описание' },
    });
    const ru = getEffectiveProductSeo(customized, 'ru', initialSiteSettings, taxonomyCategories);
    const en = getEffectiveProductSeo(customized, 'en', initialSiteSettings, taxonomyCategories);
    expect(ru).toMatchObject({ title: 'Ручной title', description: 'Ручное описание', titleSource: 'override', descriptionSource: 'override' });
    expect(en.title).not.toBe('Ручной title');
    expect(en.description).not.toBe('Ручное описание');
  });

  it.each(['ru', 'uz', 'en', 'zh'] as Language[])('uses a reviewed %s request-price fallback and self-canonical', (locale) => {
    const effective = getEffectiveProductSeo(
      { ...product, priceMode: 'request', showPrice: false }, locale, initialSiteSettings, taxonomyCategories,
    );
    expect(effective.description).toBeTruthy();
    expect(effective.canonical).toBe(`/${locale}/product/test-product`);
    expect(effective.description).not.toMatch(/\b0\b/);
  });

  it('falls back to the site social image and noindexes hidden taxonomy lineage', () => {
    const categories = taxonomyCategories.map((category) => category.id === 'grocery' ? { ...category, status: 'hidden' as const } : category);
    const hiddenProduct = { ...product, mainImage: '' };
    const effective = getEffectiveProductSeo(hiddenProduct, 'ru', initialSiteSettings, categories);
    const metadata = buildProductMetadata(hiddenProduct, 'ru', initialSiteSettings, categories);
    expect(effective).toMatchObject({ image: initialSiteSettings.company.logo, imageSource: 'site', indexable: false });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(isProductSeoIndexable(hiddenProduct, categories)).toBe(false);
  });

  it('diagnoses a draft that has no meaningful entity title instead of masking it with the site name', () => {
    const effective = getEffectiveProductSeo(
      { ...product, status: 'draft', titleRu: '', titleUz: '', titleEn: '', titleZh: '' },
      'ru', initialSiteSettings, taxonomyCategories,
    );
    expect(effective.title).toBe('');
    expect(effective.issues).toEqual(expect.arrayContaining(['Нет названия товара для SEO', 'Нет индексируемого title']));
  });
});

describe('automatic Category SEO policy', () => {
  it.each(['food', 'grocery', 'grains'])('builds metadata for taxonomy node %s', (id) => {
    const category = taxonomyCategories.find((candidate) => candidate.id === id)!;
    const effective = getEffectiveCategorySeo(category, 'en', initialSiteSettings, taxonomyCategories);
    expect(effective.title).toContain(category.titleEn);
    expect(effective.description).toContain('SANPACK');
    expect(effective.indexable).toBe(true);
    expect(buildCategoryMetadata(category, 'en', initialSiteSettings, taxonomyCategories).alternates)
      .toMatchObject({ canonical: effective.canonical });
  });

  it('prefers a localized manual override but keeps canonical generated', () => {
    const category = createCategory('manual', 'food', {
      seo: { titleUz: 'Maxsus bo‘lim', descriptionUz: 'Tasdiqlangan tavsif' },
    });
    const categories = [...taxonomyCategories, category];
    const effective = getEffectiveCategorySeo(category, 'uz', initialSiteSettings, categories);
    expect(effective).toMatchObject({
      title: 'Maxsus bo‘lim', description: 'Tasdiqlangan tavsif',
      canonical: '/uz/catalog/manual', titleSource: 'override', descriptionSource: 'override',
    });
  });
});

describe('automatic image alt and sitemap signals', () => {
  const product = createProduct({ titleRu: 'Контейнер алюминиевый FP-005' });

  it('uses explicit, Product, Variant and gallery fallbacks without keyword stuffing', () => {
    expect(buildProductImageAlt({ product, locale: 'ru', explicitAlt: 'Фото упаковки' })).toBe('Фото упаковки');
    expect(buildProductImageAlt({ product, locale: 'ru' })).toBe('Контейнер алюминиевый FP-005');
    expect(buildProductImageAlt({ product, locale: 'ru', variant: createVariant({ titleRu: '750 мл' }) }))
      .toBe('Контейнер алюминиевый FP-005, 750 мл');
    expect(buildProductImageAlt({ product, locale: 'ru', galleryIndex: 2 }))
      .toBe('Контейнер алюминиевый FP-005 — вид 2');
    expect(buildProductImageAlt({ product: {}, locale: 'ru' })).toBe('');
  });

  it('emits lastModified only for a real timestamp', () => {
    expect(safeSitemapLastModified('2026-09-22T10:00:00.000Z')).toBeInstanceOf(Date);
    expect(safeSitemapLastModified('not-a-date')).toBeUndefined();
    expect(safeSitemapLastModified()).toBeUndefined();
  });
});
