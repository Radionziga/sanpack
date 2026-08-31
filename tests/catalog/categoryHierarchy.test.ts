import { describe, expect, it } from 'vitest';
import { getCategoryBreadcrumbs, getCategoryDepth, getCategoryLabel, getCategoryLineage, getCategoryPath, getCategoryScopeIds, getProductsInCategoryScope, getVisibleCategories, isProductCategory, resolveCategoryRoute, validateCategoryPlacement, validateCategorySave } from '@/lib/catalog/categoryHierarchy';
import { getCategoryMetadata } from '@/lib/catalog/categoryMetadata';
import { getApplicableAttributes } from '@/lib/catalog/attributeApplicability';
import { hasRequiredProductOrVariantAttribute } from '@/lib/catalog/productAttributeRequirements';
import { getStorefrontCategoryGroups } from '@/lib/catalog/popularCategoryArtwork';
import { taxonomyCategories as categories, createAttribute, createCategory } from '@/tests/fixtures/categories';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import { initialCategories, initialProducts } from '@/lib/seedData';

describe('bounded Category taxonomy', () => {
  it('supports exactly group/category/optional subcategory without persisted type/depth', () => {
    expect(['food', 'grocery', 'grains'].map((id) => getCategoryDepth(id, categories))).toEqual([0, 1, 2]);
    expect(validateCategoryPlacement('new', 'grocery', categories)).toBeNull();
    expect(validateCategoryPlacement('new', 'grains', categories)).toMatch(/три уровня/);
  });
  it('rejects self-parent, a cycle and moving into a descendant', () => {
    expect(validateCategoryPlacement('grocery', 'grocery', categories)).toMatch(/самой себя/);
    expect(validateCategoryPlacement('grocery', 'grains', categories)).toMatch(/цикл/);
    expect(validateCategoryPlacement('food', 'flour', categories)).toMatch(/цикл/);
  });
  it('checks the moved subtree, not only the moved root', () => {
    expect(validateCategoryPlacement('grocery', 'dairy', categories)).toMatch(/три уровня/);
    expect(validateCategoryPlacement('grains', 'dairy', categories)).toBeNull();
    expect(validateCategoryPlacement('grocery', 'packaging', categories)).toBeNull();
  });
  it('rejects missing and invalid parents', () => {
    expect(validateCategoryPlacement('new', 'missing', categories)).toBeTruthy();
    const broken = [...categories, createCategory('orphan', 'missing')];
    expect(validateCategoryPlacement('new', 'orphan', broken)).toBeTruthy();
    expect(getCategoryLineage('orphan', broken)).toEqual([]);
    expect(isProductCategory('orphan', broken)).toBe(false);
  });
  it('fails closed on cycles and excessive depth read from legacy/external data', () => {
    expect(getCategoryLineage('loop', [createCategory('loop', 'loop')])).toEqual([]);
    expect(getCategoryLineage('deep', [...categories, createCategory('deep', 'grains')])).toEqual([]);
  });
  it('keeps globally unique slugs and reserves the static print route', () => {
    expect(validateCategorySave('new', { parentId: 'grocery', slug: 'grains' }, categories)).toMatch(/URL/);
    expect(validateCategorySave('new', { parentId: 'grocery', slug: 'print' }, categories)).toMatch(/зарезервирован/);
    expect(validateCategorySave('grains', categories[2], categories)).toBeNull();
  });
  it('excludes hidden ancestors with their active descendants', () => {
    const hidden = categories.map((category) => category.id === 'grocery' ? { ...category, status: 'hidden' as const } : category);
    expect(getVisibleCategories(hidden).map(({ id }) => id)).not.toContain('grains');
    expect(resolveCategoryRoute(['grocery', 'grains'], hidden)).toBeNull();
  });
});

describe('unified product scopes', () => {
  const products = ['grocery', 'grains', 'flour', 'dairy', 'cheese', 'bags'].map((categoryId) => createProduct({ id: categoryId, categoryId, categorySlug: categoryId }));
  it.each([
    ['food', ['grocery', 'grains', 'flour', 'dairy', 'cheese']],
    ['grocery', ['grocery', 'grains', 'flour']],
    ['grains', ['grains']],
  ])('%s includes its direct products and supported descendants', (id, expected) => {
    expect(getProductsInCategoryScope(products, categories, id).map((product) => product.id)).toEqual(expected);
  });
  it('uses the actual categoryId over stale categorySlug', () => {
    const product = createProduct({ categoryId: 'grains', categorySlug: 'bags' });
    expect(getProductsInCategoryScope([product], categories, 'packaging')).toEqual([]);
    expect(getProductsInCategoryScope([product], categories, 'grocery')).toHaveLength(1);
  });
  it('preserves category assignment even with children and legacy slug fallback', () => {
    expect(isProductCategory('grocery', categories)).toBe(true);
    expect(isProductCategory('grains', categories)).toBe(true);
    expect(isProductCategory('food', categories)).toBe(false);
    expect(getProductsInCategoryScope([createProduct({ categoryId: 'old-id', categorySlug: 'grains' })], categories, 'food')).toHaveLength(1);
  });
  it('requires no migration for existing seed categories/products', () => {
    for (const product of initialProducts) {
      expect(isProductCategory(product.categoryId, initialCategories)).toBe(true);
      expect(getProductsInCategoryScope([product], initialCategories, product.categoryId)).toHaveLength(1);
    }
  });
});

describe('subcategory inheritance / CMS definitions', () => {
  const definitions = [createAttribute('brand', ['food']), createAttribute('weight', ['grocery']), createAttribute('grain', ['grains']), createAttribute('flour-kind', ['flour'])];
  it('inherits group and category definitions, without sibling leakage', () => {
    expect(getApplicableAttributes(definitions, 'grains', categories).map(({ key }) => key)).toEqual(['brand', 'weight', 'grain']);
    expect(getApplicableAttributes(definitions, 'grocery', categories).map(({ key }) => key)).toEqual(['brand', 'weight']);
    expect(getCategoryScopeIds('grocery', categories)).toEqual(new Set(['grocery', 'grains', 'flour']));
  });
  it('preserves required/filterable/cardVisible/productVisible on inherited definitions and variants', () => {
    const applicable = getApplicableAttributes(definitions, 'grains', categories);
    expect(applicable.every((attribute) => attribute.required && attribute.filterable && attribute.cardVisible && attribute.productVisible)).toBe(true);
    const product = createProduct({ attributes: { brand: 'Example', grain: 'rice' }, variants: [createVariant({ attributes: { weight: 25 } })] });
    expect(applicable.every((attribute) => hasRequiredProductOrVariantAttribute(product, attribute.key))).toBe(true);
    expect(hasRequiredProductOrVariantAttribute({ ...product, variants: [...product.variants, createVariant({ attributes: {} })] }, 'weight')).toBe(false);
  });
});

describe('routes, breadcrumbs and SEO', () => {
  it('keeps flat group/category URLs and nests subcategories without the group slug', () => {
    expect(getCategoryPath(categories[0], categories)).toBe('/catalog/food');
    expect(resolveCategoryRoute(['grocery'], categories)?.path).toBe('/catalog/grocery');
    expect(resolveCategoryRoute(['grocery', 'grains'], categories)).toMatchObject({ path: '/catalog/grocery/grains', redirect: false });
    expect(resolveCategoryRoute(['grains'], categories)).toMatchObject({ path: '/catalog/grocery/grains', redirect: true });
  });
  it.each([['dairy', 'grains'], ['food', 'grocery'], ['grocery', 'missing'], ['food', 'grocery', 'grains']])('rejects invalid path %j', (...segments) => {
    expect(resolveCategoryRoute(segments, categories)).toBeNull();
  });
  it('builds public breadcrumbs and full admin labels from the same lineage', () => {
    expect(getCategoryBreadcrumbs(categories[1], categories).map(({ href }) => href)).toEqual(['/catalog/grocery']);
    expect(getCategoryBreadcrumbs(categories[2], categories).map(({ href }) => href)).toEqual(['/catalog/grocery', '/catalog/grocery/grains']);
    expect(getCategoryLabel('grains', categories)).toBe('food / grocery / grains');
  });
  it.each(['ru', 'uz', 'en', 'zh'] as const)('generates canonical and hreflang for %s', (locale) => {
    const meta = getCategoryMetadata(['grocery', 'grains'], locale, categories);
    expect(meta.alternates?.canonical).toBe(`/${locale}/catalog/grocery/grains`);
    expect(meta.alternates?.languages?.en).toBe('/en/catalog/grocery/grains');
    expect(getCategoryMetadata(['grains'], locale, categories).alternates).toEqual(meta.alternates);
  });
  it('keeps subcategories out of automatic showcase and permits explicit promotion', () => {
    const withArtwork = categories.map((category) => ({ ...category, cardImage: '/test.webp' }));
    expect(getStorefrontCategoryGroups(withArtwork).flatMap((group) => group.categories).map(({ id }) => id)).not.toContain('grains');
    const promoted = withArtwork.map((category) => category.id === 'grains' ? { ...category, featured: true } : category);
    expect(getStorefrontCategoryGroups(promoted)[0].categories.map(({ id }) => id)).toContain('grains');
  });
});
