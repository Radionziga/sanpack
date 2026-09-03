import sharp from 'sharp';
import { MAX_MEDIA_FILE_SIZE } from './presets';

/** Never publish unvalidated bytes or active SVG as public library media. */
export async function prepareMediaUpload(buffer: Buffer, mimeType: string) {
  if (!buffer.length || buffer.length > MAX_MEDIA_FILE_SIZE) throw new Error('Invalid media size.');
  if (mimeType === 'application/pdf') {
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF.');
    return { buffer, mimeType, extension: 'pdf', disposition: 'attachment' };
  }
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'].includes(mimeType)) {
    throw new Error('Unsupported media format.');
  }
  const image = sharp(buffer, { failOn: 'error', limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'webp', 'svg', 'gif'].includes(metadata.format || '')) throw new Error('Invalid image.');
  return {
    buffer: await image.rotate().webp({ quality: 90, effort: 4 }).toBuffer(),
    mimeType: 'image/webp', extension: 'webp', disposition: 'inline',
  };
}
