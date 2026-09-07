import { beforeEach, describe, expect, it, vi } from 'vitest';
import { taxonomyCategories, createAttribute } from '@/tests/fixtures/categories';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import { AdminRepository } from '@/lib/repositories/adminRepository';

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
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const source = input instanceof Request ? input : new Request(new URL(String(input), 'http://localhost'), init);
    return POST(source);
  });
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
  it('saves a published Product through the real repository DTO and handler', async () => {
    const saved = await AdminRepository.saveProduct(createProduct({ id: 'published-through-repository', categoryId: 'grocery' }));
    expect(saved).toMatchObject({ id: 'published-through-repository', status: 'published' });
    expect(store.get('products/published-through-repository')).toMatchObject({
      id: 'published-through-repository',
      createdBy: 'test-admin',
      updatedBy: 'test-admin',
    });
  });

  it('preserves creation metadata across response → edit → save and rejects client spoofing', async () => {
    store.set('products/existing-draft', createProduct({
      id: 'existing-draft', categoryId: 'grocery', status: 'draft', createdAt: '2025-01-01T00:00:00.000Z', createdBy: 'original-owner',
    }) as unknown as Record<string, unknown>);
    const response = await AdminRepository.updateProduct('existing-draft', {
      ...createProduct({ id: 'spoofed-id', categoryId: 'grocery', status: 'draft' }),
      titleRu: 'Первое редактирование',
      createdAt: '2099-01-01T00:00:00.000Z',
      createdBy: 'attacker',
      updatedBy: 'attacker',
    });
    expect(response).toMatchObject({
      id: 'existing-draft', titleRu: 'Первое редактирование',
      createdAt: '2025-01-01T00:00:00.000Z', createdBy: 'original-owner', updatedBy: 'test-admin',
    });

    const savedAgain = await AdminRepository.saveProduct({ ...response, titleRu: 'Второе редактирование' });
    expect(savedAgain).toMatchObject({
      id: 'existing-draft', titleRu: 'Второе редактирование',
      createdAt: '2025-01-01T00:00:00.000Z', createdBy: 'original-owner', updatedBy: 'test-admin',
    });
  });

  it('creates server-owned creation metadata for a new draft', async () => {
    const saved = await AdminRepository.saveProduct(createProduct({
      id: 'new-draft', categoryId: 'grocery', status: 'draft', createdAt: '2099-01-01T00:00:00.000Z', createdBy: 'attacker',
    }));
    expect(saved.id).toBe('new-draft');
    expect(saved.createdBy).toBe('test-admin');
    expect(saved.createdAt).not.toBe('2099-01-01T00:00:00.000Z');
  });

  it('uses the envelope identity and ignores audit fields in a hand-crafted payload', async () => {
    const product = createProduct({ id: 'payload-id', categoryId: 'grocery', status: 'draft' });
    const response = await save('products', 'trusted-envelope-id', {
      ...product,
      id: 'payload-id',
      createdAt: '2099-01-01T00:00:00.000Z',
      createdBy: 'attacker',
      updatedBy: 'attacker',
    });
    expect(response.status).toBe(200);
    expect(store.get('products/trusted-envelope-id')).toMatchObject({
      id: 'trusted-envelope-id', createdBy: 'test-admin', updatedBy: 'test-admin',
    });
    expect(store.has('products/payload-id')).toBe(false);
  });
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

describe('admin Attribute key stability', () => {
  it('rejects changing an existing key before writing', async () => {
    store.set('attributes/brand', createAttribute('brand', ['food']) as unknown as Record<string, unknown>);
    const { id: _id, ...attribute } = createAttribute('brand', ['food']);
    const response = await save('attributes', 'brand', { ...attribute, key: 'manufacturer' });
    expect(response.status).toBe(409);
    expect(writes).not.toHaveBeenCalled();
  });

  it('allows editing labels while retaining the same key', async () => {
    store.set('attributes/brand', createAttribute('brand', ['food']) as unknown as Record<string, unknown>);
    const { id: _id, ...attribute } = createAttribute('brand', ['food']);
    const response = await save('attributes', 'brand', { ...attribute, titleRu: 'Производитель' });
    expect(response.status).toBe(200);
    expect(writes).toHaveBeenCalledOnce();
  });
});
