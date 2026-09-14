import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getCategoryBreadcrumbs,
  getCategoryDepth,
  getCategoryPath,
  resolveCategoryRoute,
} from '@/lib/catalog/categoryHierarchy';
import type { Category } from '@/types';

type MappingArtifact = {
  baselineCounts: { products: number; categories: number; attributes: number; published: number };
  baselineTaxonomy: Category[];
  targetCounts: { products: number; categories: number; published: number; expectedSitemapDelta: number };
  summary: {
    productsMoved: number;
    productsUnchanged: number;
    categoriesCreated: number;
    reparentedCategories: number;
    orphanProducts: number;
    invalidLineage: number;
    duplicateSlugs: number;
  };
  taxonomyCreates: Category[];
  taxonomyUpdates: Array<{ id: string; patch: Partial<Category> }>;
  productMappings: Array<{
    productId: string;
    sku: string;
    currentCategoryId: string;
    targetCategoryId: string;
    status: 'unchanged' | 'moved';
  }>;
  mediaRepairs: Array<{ id: string; patch: { mainImage: string } }>;
};

const artifact = JSON.parse(readFileSync(
  resolve('docs/catalog/production-taxonomy-map-2026-09.json'),
  'utf8',
)) as MappingArtifact;

function targetCategories() {
  const updates = new Map(artifact.taxonomyUpdates.map(({ id, patch }) => [id, patch]));
  return [
    ...artifact.baselineTaxonomy.map((category) => ({ ...category, ...(updates.get(category.id) ?? {}) })),
    ...artifact.taxonomyCreates,
  ];
}

describe('production catalog taxonomy 2026-09 mapping', () => {
  it('accounts for every production Product without changing identity or placement', () => {
    expect(artifact.baselineCounts).toEqual({ products: 238, categories: 27, attributes: 16, published: 238 });
    expect(artifact.targetCounts.products).toBe(238);
    expect(artifact.targetCounts.published).toBe(238);
    expect(artifact.productMappings).toHaveLength(238);
    expect(new Set(artifact.productMappings.map(({ productId }) => productId)).size).toBe(238);
    expect(new Set(artifact.productMappings.map(({ sku }) => sku)).size).toBe(238);
    expect(artifact.productMappings.every(({ currentCategoryId, targetCategoryId, status }) => (
      currentCategoryId === targetCategoryId && status === 'unchanged'
    ))).toBe(true);
    expect(artifact.summary).toMatchObject({ productsMoved: 0, productsUnchanged: 238, orphanProducts: 0 });
  });

  it('produces exactly the bounded Group → Category → Subcategory tree', () => {
    const categories = targetCategories();
    expect(categories).toHaveLength(31);
    expect(artifact.summary).toMatchObject({ categoriesCreated: 4, reparentedCategories: 19, invalidLineage: 0, duplicateSlugs: 0 });
    expect(categories.every((category) => {
      const depth = getCategoryDepth(category.id, categories);
      return depth !== undefined && depth <= 2;
    })).toBe(true);
    expect(new Set(categories.map(({ slug }) => slug)).size).toBe(categories.length);
  });

  it('keeps existing slugs and redirects old flat leaf URLs to canonical nested paths', () => {
    const categories = targetCategories();
    const fruits = categories.find(({ id }) => id === 'cat-fruits')!;
    const grocery = categories.find(({ id }) => id === 'cat-grocery')!;

    expect(fruits.slug).toBe('frukty');
    expect(getCategoryPath(fruits, categories)).toBe('/catalog/ovoshchi-frukty-zelen/frukty');
    expect(resolveCategoryRoute(['frukty'], categories)).toMatchObject({
      path: '/catalog/ovoshchi-frukty-zelen/frukty',
      redirect: true,
    });
    expect(resolveCategoryRoute(['ovoshchi-frukty-zelen', 'frukty'], categories)?.redirect).toBe(false);
    expect(getCategoryBreadcrumbs(fruits, categories).map(({ category }) => category.id)).toEqual(['cat-fresh-produce', 'cat-fruits']);
    expect(getCategoryPath(grocery, categories)).toBe('/catalog/bakaleya-i-ingredienty');
    expect(artifact.targetCounts.expectedSitemapDelta).toBe(16);
  });

  it('supplies localized labels and separate navigation/showcase artwork for new commercial parents', () => {
    expect(artifact.taxonomyCreates).toHaveLength(4);
    for (const category of artifact.taxonomyCreates) {
      expect(category.titleRu).toBeTruthy();
      expect(category.titleUz).toBeTruthy();
      expect(category.titleEn).toBeTruthy();
      expect(category.titleZh).toBeTruthy();
      expect(category.navigationImage).toBeTruthy();
      expect(category.cardImage).toBeTruthy();
      expect(category.navigationImage).not.toBe(category.cardImage);
      expect(existsSync(resolve(`public${category.navigationImage}`))).toBe(true);
      expect(existsSync(resolve(`public${category.cardImage}`))).toBe(true);
    }
  });

  it('promotes only the six existing compatibility images and keeps their assets available', () => {
    expect(artifact.mediaRepairs).toHaveLength(6);
    for (const repair of artifact.mediaRepairs) {
      expect(repair.patch.mainImage).toMatch(/^\/catalog\/generated-products\//);
      expect(existsSync(resolve(`public${repair.patch.mainImage}`))).toBe(true);
    }
  });
});
