import { describe, expect, it, vi } from 'vitest';
import {
  assertPublicDataReadAllowed,
  loadPublicData,
  PublicDataUnavailableError,
} from '@/lib/catalog/publicDataSource';

describe('public data source policy', () => {
  it('fails before cached reads during credentialless production builds', () => {
    expect(() => assertPublicDataReadAllowed({
      resource: 'settings',
      seedEnabled: false,
      phase: 'phase-production-build',
    })).toThrow(PublicDataUnavailableError);

    expect(() => assertPublicDataReadAllowed({
      resource: 'settings',
      seedEnabled: true,
      phase: 'phase-production-build',
    })).not.toThrow();

    expect(() => assertPublicDataReadAllowed({
      resource: 'settings',
      seedEnabled: false,
      phase: 'phase-production-build',
      serviceAccountJson: '{}',
    })).not.toThrow();
  });

  it('uses seed data only when demo mode is explicitly enabled', async () => {
    const load = vi.fn(async () => ['stored']);

    await expect(loadPublicData({
      resource: 'products',
      seedEnabled: true,
      seed: ['seed'],
      load,
    })).resolves.toEqual(['seed']);
    expect(load).not.toHaveBeenCalled();
  });

  it('preserves an empty successful result instead of substituting seed data', async () => {
    await expect(loadPublicData({
      resource: 'products',
      seedEnabled: false,
      seed: ['seed'],
      load: async () => [],
    })).resolves.toEqual([]);
  });

  it('reports infrastructure failures instead of presenting seed data as current', async () => {
    const cause = new Error('credentials unavailable');

    await expect(loadPublicData({
      resource: 'products',
      seedEnabled: false,
      seed: ['seed'],
      load: async () => {
        throw cause;
      },
    })).rejects.toMatchObject({
      name: 'PublicDataUnavailableError',
      cause,
    } satisfies Partial<PublicDataUnavailableError>);
  });
});
