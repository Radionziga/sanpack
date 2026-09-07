import { describe, expect, it } from 'vitest';
import { buildSiteMediaUsageIndex, lookupMediaUsage } from '@/lib/media/mediaUsageScanner';

function fakeDb() {
  const data: Record<string, Array<{ id: string; value: Record<string, unknown> }>> = {
    products: [{ id: 'p1', value: {
      titleRu: 'Товар', mainImage: 'https://x/o/media%2Fmain.webp?token=x', mainImagePath: 'media/main.webp',
      images: ['https://x/o/media%2Fgallery.webp'], imagePaths: ['media/gallery.webp'],
      variants: [{ id: 'v1', imagePath: 'media/variant.webp' }],
      documents: [{ id: 'd1', titleRu: 'PDF', url: 'https://x/o/media%2Fdocument.pdf' }],
    }}],
    categories: [], banners: [], clients: [], bagDesignRequests: [],
  };
  return {
    collection(name: string) {
      return {
        async get() { return { docs: (data[name] || []).map((entry) => ({ id: entry.id, data: () => entry.value })) }; },
        doc() { return { async get() { return { exists: false, data: () => undefined }; } }; },
      };
    },
  };
}

describe('media usage scanner', () => {
  it('blocks deletion for every current Product media field', async () => {
    const index = await buildSiteMediaUsageIndex(fakeDb() as never);
    for (const path of ['media/main.webp', 'media/gallery.webp', 'media/variant.webp', 'media/document.pdf']) {
      expect(lookupMediaUsage(index, path).isUsed, path).toBe(true);
    }
  });
});
