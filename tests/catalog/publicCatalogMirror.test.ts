import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getPublicCatalogMirrorOrigin,
  readPublicCatalogMirror,
} from '@/lib/catalog/publicCatalogMirror';

describe('local public catalog mirror', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('is an explicit non-production data source', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SANPACK_PUBLIC_CATALOG_ORIGIN', 'https://sanpack.uz');
    expect(getPublicCatalogMirrorOrigin()).toBe('https://sanpack.uz');

    vi.stubEnv('NODE_ENV', 'production');
    expect(getPublicCatalogMirrorOrigin()).toBeUndefined();
  });

  it('rejects unsafe or ambiguous origins', () => {
    vi.stubEnv('NODE_ENV', 'development');

    vi.stubEnv('SANPACK_PUBLIC_CATALOG_ORIGIN', 'http://sanpack.uz');
    expect(() => getPublicCatalogMirrorOrigin()).toThrow(/HTTPS/);

    vi.stubEnv('SANPACK_PUBLIC_CATALOG_ORIGIN', 'https://sanpack.uz/catalog');
    expect(() => getPublicCatalogMirrorOrigin()).toThrow(/only an origin/);

    vi.stubEnv('SANPACK_PUBLIC_CATALOG_ORIGIN', 'https://user:password@sanpack.uz');
    expect(() => getPublicCatalogMirrorOrigin()).toThrow(/only an origin/);
  });

  it('reads only the selected public API projection and fails honestly', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SANPACK_PUBLIC_CATALOG_ORIGIN', 'https://sanpack.uz');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'product-1' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 }));

    await expect(readPublicCatalogMirror<{ id: string }[]>('products'))
      .resolves.toEqual([{ id: 'product-1' }]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://sanpack.uz/api/catalog?resource=products',
      expect.objectContaining({ cache: 'no-store' })
    );

    await expect(readPublicCatalogMirror('settings')).rejects.toThrow(/HTTP 503/);
  });
});
