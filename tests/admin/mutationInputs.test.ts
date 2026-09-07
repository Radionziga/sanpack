import { describe, expect, it } from 'vitest';
import {
  toAttributeMutationInput,
  toBannerMutationInput,
  toCategoryMutationInput,
  toClientMutationInput,
  toProductMutationInput,
} from '@/lib/admin/mutationInputs';

describe('CMS read → edit → mutation boundaries', () => {
  const metadata = { id: 'read-id', createdAt: 'old', updatedAt: 'new', createdBy: 'u1', updatedBy: 'u2' };
  for (const [name, build] of Object.entries({
    product: toProductMutationInput,
    category: toCategoryMutationInput,
    attribute: toAttributeMutationInput,
    client: toClientMutationInput,
    banner: toBannerMutationInput,
  })) {
    it(`${name} strips server-owned read metadata on a second save`, () => {
      const result = build({ ...metadata, titleRu: 'Изменено', name: 'Изменено' } as never) as Record<string, unknown>;
      expect(result).toMatchObject({ titleRu: 'Изменено', name: 'Изменено' });
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('createdBy');
      expect(result).not.toHaveProperty('updatedBy');
    });
  }
});
