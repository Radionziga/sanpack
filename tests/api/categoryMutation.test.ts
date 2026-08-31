import { beforeEach, describe, expect, it, vi } from 'vitest';
import { taxonomyCategories, createAttribute } from '@/tests/fixtures/categories';
import { createProduct, createVariant } from '@/tests/fixtures/products';

const { store, writes } = vi.hoisted(() => ({ store: new Map<string, Record<string, unknown>>(), writes: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getAdminSession: async () => ({ uid: 'test-admin', role: 'super_admin' }) }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => {
  function query(name: string, filters: Array<[string, unknown]> = []) {
    return {
      doc: (id: string) => ({
        path: `${name}/${id}`,
        get: async () => ({ id, exists: store.has(`${name}/${id}`), data: () => store.get(`${name}/${id}`) }),
        set: async (data: Record<string, unknown>) => { store.set(`${name}/${id}`, data); writes(`${name}/${id}`, data); },
      }),
      where: (key: string, _operator: string, value: unknown) => query(name, [...filters, [key, value]]),
      limit: () => query(name, filters),
      get: async () => {
        const docs = [...store.entries()].filter(([key, data]) => key.startsWith(`${name}/`) && filters.every(([field, value]) => data[field] === value))
          .map(([key, data]) => ({ id: key.split('/')[1], exists: true, data: () => data }));
        return { docs, empty: !docs.length };
      },
    };
  }
  return { getAdminDb: () => ({
    collection: query,
    runTransaction: async (callback: (transaction: unknown) => Promise<unknown>) => callback({
      get: (reference: { get: () => Promise<unknown> }) => reference.get(),
      set: (reference: { path: string }, data: Record<string, unknown>) => { store.set(reference.path, data); writes(reference.path, data); },
    }),
  }) };
});

import { POST } from '@/app/api/admin/data/route';

function save(resource: string, id: string, data: unknown) {
  return POST(new Request('http://localhost/api/admin/data', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'save', resource, id, data }) }));
}

beforeEach(() => {
  store.clear(); writes.mockClear();
  taxonomyCategories.forEach((category) => store.set(`categories/${category.id}`, category as unknown as Record<string, unknown>));
});

describe('admin category API taxonomy validation', () => {
  it('persists a subcategory through the real API validation branch', async () => {
    const response = await save('categories', 'new-sub', { parentId: 'grocery', slug: 'new-sub', titleRu: 'Новая', titleUz: 'Yangi', status: 'active' });
    expect(response.status).toBe(200);
    expect(writes).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({ id: 'new-sub', parentId: 'grocery' });
  });
  it.each([
    ['new', 'grains'], ['new', 'missing'], ['grocery', 'grains'], ['grocery', 'grocery'], ['grocery', 'dairy'],
  ])('rejects invalid save %s → %s before writing', async (id, parentId) => {
    const response = await save('categories', id, { parentId, slug: id });
    expect(response.status).toBe(409);
    expect(writes).not.toHaveBeenCalled();
  });
  it('rejects promotion to Group when direct products exist', async () => {
    store.set('products/p', { categoryId: 'grains' });
    expect((await save('categories', 'grains', { parentId: null, slug: 'grains' })).status).toBe(409);
    expect(writes).not.toHaveBeenCalled();
  });
  it('rejects duplicate and static reserved URLs', async () => {
    expect((await save('categories', 'new', { parentId: 'grocery', slug: 'grains' })).status).toBe(409);
    expect((await save('categories', 'new', { parentId: 'grocery', slug: 'print' })).status).toBe(409);
    expect(writes).not.toHaveBeenCalled();
  });
});

describe('admin Product assignment / inherited requirements', () => {
  it.each(['grocery', 'grains'])('accepts existing categoryId at %s without a path field', async (categoryId) => {
    const product = createProduct({ id: 'new-product', categoryId, categorySlug: 'stale-slug' });
    const response = await save('products', product.id, product);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ categoryId, categorySlug: categoryId });
  });
  it('rejects Group assignment', async () => {
    const response = await save('products', 'new', createProduct({ id: 'new', categoryId: 'food' }));
    expect(response.status).toBe(409);
    expect(writes).not.toHaveBeenCalled();
  });
  it('enforces Group and Category required definitions at Subcategory for all variants', async () => {
    store.set('attributes/brand', createAttribute('brand', ['food']) as unknown as Record<string, unknown>);
    store.set('attributes/weight', createAttribute('weight', ['grocery']) as unknown as Record<string, unknown>);
    const product = createProduct({ id: 'new', categoryId: 'grains', attributes: { brand: 'Example' }, variants: [createVariant({ attributes: {} })] });
    expect((await save('products', 'new', product)).status).toBe(409);
    expect(writes).not.toHaveBeenCalled();
    product.variants[0].attributes.weight = 25;
    expect((await save('products', 'new', product)).status).toBe(200);
  });
});
