import { afterEach, describe, expect, it, vi } from 'vitest';
import { filterPublicProducts } from '@/lib/catalog/publicProducts';
import { PublicSanpackRepository } from '@/lib/repositories/publicRepository';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import type { Product } from '@/types';
import { createProduct } from '@/tests/fixtures/products';

function productWithRuntimeStatus(
  id: string,
  status: unknown,
): Product {
  const { status: _status, ...product } = createProduct({ id, slug: id });
  return (status === undefined ? product : { ...product, status }) as Product;
}

describe('public product contract', () => {
  const published = createProduct({
    id: 'published-product',
    slug: 'published-product',
    status: 'published',
  });
  const draft = createProduct({ id: 'draft-product', slug: 'draft-product', status: 'draft' });
  const hidden = createProduct({ id: 'hidden-product', slug: 'hidden-product', status: 'hidden' });
  const archived = createProduct({ id: 'archived-product', slug: 'archived-product', status: 'archived' });
  const missingStatus = productWithRuntimeStatus('missing-status-product', undefined);
  const unknownStatus = productWithRuntimeStatus('unknown-status-product', 'scheduled');
  const products = [published, draft, hidden, archived, missingStatus, unknownStatus];

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns only products whose runtime status is published', () => {
    expect(filterPublicProducts(products)).toEqual([published]);
  });

  it('does not find a non-public product by slug', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(products)));

    await expect(PublicSanpackRepository.getProductBySlug(hidden.slug)).resolves.toBeNull();
    await expect(PublicSanpackRepository.getProductBySlug(published.slug)).resolves.toEqual(published);
  });

  it('does not find a non-public product by id', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(products)));

    await expect(PublicSanpackRepository.getProductById(draft.id)).resolves.toBeNull();
    await expect(PublicSanpackRepository.getProductById(published.id)).resolves.toEqual(published);
  });
});

describe('admin product contract', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the admin endpoint and preserves products of every status', async () => {
    const products = [
      createProduct({ id: 'published', status: 'published' }),
      createProduct({ id: 'draft', status: 'draft' }),
      createProduct({ id: 'hidden', status: 'hidden' }),
      createProduct({ id: 'archived', status: 'archived' }),
    ];
    const fetchMock = vi.fn(async () => Response.json(products));
    vi.stubGlobal('fetch', fetchMock);

    await expect(SanpackRepository.getProducts()).resolves.toEqual(products);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/data?resource=products',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
});
