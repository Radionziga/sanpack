import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
const { remove, db } = vi.hoisted(() => ({ remove: vi.fn(), db: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: db, getAdminStorage: () => ({ bucket: () => ({ file: () => ({ delete: remove }) }) }) }));
import { prepareMediaUpload } from '@/lib/media/prepareUpload';
import { deleteMediaFileWithSafety } from '@/lib/media/storageService';

describe('media security', () => {
  it('rasterizes SVG, removing executable content from public output', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script><rect width="10" height="10" fill="red"/></svg>');
    const result = await prepareMediaUpload(svg, 'image/svg+xml');
    expect(result.mimeType).toBe('image/webp');
    expect((await sharp(result.buffer).metadata()).format).toBe('webp');
    expect(result.buffer.toString()).not.toContain('<script>');
  });
  it('rejects disguised bytes instead of uploading on decoder failure', async () => {
    await expect(prepareMediaUpload(Buffer.from('<html><script>alert(1)</script></html>'), 'image/png')).rejects.toThrow();
    await expect(prepareMediaUpload(Buffer.from('not PDF'), 'application/pdf')).rejects.toThrow();
  });
  it('forces PDF download and rejects oversized pixel dimensions', async () => {
    expect(await prepareMediaUpload(Buffer.from('%PDF-1.7\nfixture'), 'application/pdf')).toMatchObject({ extension: 'pdf', disposition: 'attachment' });
    await expect(prepareMediaUpload(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100000" height="100000"/>'), 'image/svg+xml')).rejects.toThrow();
  });
  it('never deletes when usage scan failed', async () => {
    db.mockReturnValue({ collection: () => ({ get: () => Promise.reject(new Error('unavailable')) }) });
    await expect(deleteMediaFileWithSafety({ path: 'media/products/a.webp' })).rejects.toThrow('Deletion is blocked');
    expect(remove).not.toHaveBeenCalled();
  });
});
