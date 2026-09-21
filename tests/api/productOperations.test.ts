import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProduct, createVariant } from '@/tests/fixtures/products';
import { createAttribute, taxonomyCategories } from '@/tests/fixtures/categories';

const { store, updates } = vi.hoisted(() => ({ store: new Map<string, Record<string, unknown>>(), updates: vi.fn() }));

vi.mock('@/lib/auth/server', () => ({ getAdminSession: async () => ({ uid: 'content-admin', role: 'content_manager' }) }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => {
  function collection(name: string) {
    return {
      path: name,
      doc: (id: string) => ({
        path: `${name}/${id}`,
        get: async () => ({ id, exists: store.has(`${name}/${id}`), data: () => store.get(`${name}/${id}`) }),
      }),
      get: async () => {
        const docs = [...store.entries()].filter(([path]) => path.startsWith(`${name}/`)).map(([path, data]) => ({ id: path.split('/')[1], exists: true, data: () => data }));
        return { docs, empty: docs.length === 0 };
      },
    };
  }
  return { getAdminDb: () => ({
    collection,
    runTransaction: async (callback: (transaction: unknown) => Promise<unknown>) => callback({
      get: (reference: { get: () => Promise<unknown> }) => reference.get(),
      update: (reference: { path: string }, patch: Record<string, unknown>) => {
        const previous = store.get(reference.path) || {};
        store.set(reference.path, { ...previous, ...patch }); updates(reference.path, patch);
      },
      create: (reference: { path: string }, data: Record<string, unknown>) => {
        if (store.has(reference.path)) throw new Error('already exists');
        store.set(reference.path, data); updates(reference.path, data);
      },
    }),
  }) };
});

import { POST } from '@/app/api/admin/products/operations/route';

function invoke(body: unknown) {
  return POST(new Request('https://sanpack.uz/api/admin/products/operations', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));
}

beforeEach(() => {
  store.clear(); updates.mockClear();
  taxonomyCategories.forEach((category) => store.set(`categories/${category.id}`, category as unknown as Record<string, unknown>));
});

describe('Product Operations API', () => {
  it('quick-edits only allowlisted fields and rejects a stale snapshot', async () => {
    const original = createProduct({ id: 'p1', categoryId: 'grocery', categorySlug: 'grocery', updatedAt: 'v1', descriptionRu: 'Сохранить' });
    store.set('products/p1', original as unknown as Record<string, unknown>);
    const response = await invoke({ action: 'quick_edit', target: { id: 'p1', expectedUpdatedAt: 'v1' }, patch: { brandName: 'SANPACK', stockStatus: 'on_order' } });
    expect(response.status).toBe(200);
    expect(store.get('products/p1')).toMatchObject({ brandName: 'SANPACK', stockStatus: 'on_order', descriptionRu: 'Сохранить' });
    const stale = await invoke({ action: 'quick_edit', target: { id: 'p1', expectedUpdatedAt: 'v1' }, patch: { brandName: 'Wrong' } });
    expect(stale.status).toBe(409);
    expect(store.get('products/p1')).toMatchObject({ brandName: 'SANPACK' });
  });

  it('duplicates as a draft with new identities and blank SKUs while retaining media references', async () => {
    const original = createProduct({ id: 'source', categoryId: 'grocery', updatedAt: 'v1', mainImage: 'https://cdn/image.webp', variants: [createVariant()] });
    store.set('products/source', original as unknown as Record<string, unknown>);
    const response = await invoke({ action: 'duplicate', target: { id: 'source', expectedUpdatedAt: 'v1' } });
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.product).toMatchObject({ status: 'draft', sku: '', mainImage: original.mainImage });
    expect(payload.product.id).not.toBe(original.id);
    expect(payload.product.variants[0].id).not.toBe(original.variants[0].id);
    expect(payload.product.variants[0].sku).toBe('');
    expect(store.get('products/source')).toMatchObject({ sku: original.sku, status: 'published' });
  });

  it('moves multiple Products atomically and preserves unrelated fields', async () => {
    const first = createProduct({ id: 'p1', categoryId: 'grocery', updatedAt: 'v1', descriptionRu: 'Первый' });
    const second = createProduct({ id: 'p2', categoryId: 'grains', updatedAt: 'v2', descriptionRu: 'Второй' });
    store.set('products/p1', first as unknown as Record<string, unknown>);
    store.set('products/p2', second as unknown as Record<string, unknown>);
    const response = await invoke({ action: 'bulk_category', categoryId: 'dairy', targets: [{ id: 'p1', expectedUpdatedAt: 'v1' }, { id: 'p2', expectedUpdatedAt: 'v2' }] });
    expect(response.status).toBe(200);
    expect(store.get('products/p1')).toMatchObject({ categoryId: 'dairy', descriptionRu: 'Первый' });
    expect(store.get('products/p2')).toMatchObject({ categoryId: 'dairy', descriptionRu: 'Второй' });
  });

  it('does not move a published Product into a category where required data is missing', async () => {
    const product = createProduct({ id: 'p1', categoryId: 'grocery', status: 'published', updatedAt: 'v1', attributes: {} });
    store.set('products/p1', product as unknown as Record<string, unknown>);
    const required = createAttribute('dairy-required', ['dairy']);
    store.set(`attributes/${required.id}`, required as unknown as Record<string, unknown>);
    const response = await invoke({ action: 'bulk_category', categoryId: 'dairy', targets: [{ id: 'p1', expectedUpdatedAt: 'v1' }] });
    expect(response.status).toBe(400);
    expect(store.get('products/p1')).toMatchObject({ categoryId: 'grocery', updatedAt: 'v1' });
  });

  it('blocks the complete bulk publish when one Product is not ready', async () => {
    const ready = createProduct({ id: 'ready', categoryId: 'grocery', status: 'draft', updatedAt: 'v1', mainImage: '/media/a.webp' });
    const blocked = createProduct({ id: 'blocked', categoryId: 'grocery', status: 'draft', updatedAt: 'v2', sku: '', price: undefined });
    store.set('products/ready', ready as unknown as Record<string, unknown>);
    store.set('products/blocked', blocked as unknown as Record<string, unknown>);
    const response = await invoke({ action: 'bulk_status', status: 'published', targets: [{ id: 'ready', expectedUpdatedAt: 'v1' }, { id: 'blocked', expectedUpdatedAt: 'v2' }] });
    expect(response.status).toBe(400);
    expect(store.get('products/ready')).toMatchObject({ status: 'draft', updatedAt: 'v1' });
    expect(store.get('products/blocked')).toMatchObject({ status: 'draft', updatedAt: 'v2' });
  });
});
