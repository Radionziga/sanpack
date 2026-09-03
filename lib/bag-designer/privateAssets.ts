import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getAdminStorage } from '@/lib/firebase/admin';
import { deriveTelegramKey } from '@/lib/telegram/secrets';
import { isPrivateBagAssetPath } from '@/lib/media/storagePaths';
import type { BagDesignRequestRecord } from './types';

const MAX_AGE_SECONDS = 60 * 60;
function signature(path: string, expires: number) {
  return createHmac('sha256', deriveTelegramKey('bag-private-asset-v1')).update(`${path}\n${expires}`).digest('base64url');
}

/** Without a signature this same URL requires an owner/sales session. */
export function privateBagAssetUrl(path: string, guest = false, now = Date.now()) {
  if (!isPrivateBagAssetPath(path)) throw new Error('Invalid private asset path.');
  const url = new URL('/api/bag-designer/asset', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  url.searchParams.set('path', path);
  if (guest) {
    const expires = Math.floor(now / 1000) + MAX_AGE_SECONDS;
    url.searchParams.set('expires', String(expires));
    url.searchParams.set('signature', signature(path, expires));
  }
  return url.toString();
}

export function verifyPrivateBagAssetUrl(url: URL, now = Date.now()) {
  const path = url.searchParams.get('path') || '';
  const expires = Number(url.searchParams.get('expires'));
  const provided = url.searchParams.get('signature') || '';
  const seconds = Math.floor(now / 1000);
  if (!isPrivateBagAssetPath(path) || !Number.isSafeInteger(expires) || expires <= seconds
    || expires > seconds + MAX_AGE_SECONDS || !/^[a-zA-Z0-9_-]{43}$/.test(provided)) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(signature(path, expires)));
}

export async function savePrivateBagAsset(path: string, buffer: Buffer, contentType: string) {
  if (!isPrivateBagAssetPath(path) || !['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) throw new Error('Invalid private asset.');
  await getAdminStorage().bucket().file(path).save(buffer, {
    resumable: false, validation: 'crc32c', metadata: {
      contentType, cacheControl: 'private,no-store',
      // Explicit empty metadata: do not mint long-lived Firebase bearer tokens.
      metadata: {},
    },
  });
  return privateBagAssetUrl(path);
}

/** Resolve legacy URLs in memory; no document migration and no token in output. */
export function withPrivateBagAssetUrls<T extends Partial<BagDesignRequestRecord>>(record: T, guest = false): T {
  const result = { ...record };
  for (const [field, asset] of [['logoUrl', 'logo'], ['technicalPreviewUrl', 'technicalPreview'], ['aiMockupUrl', 'aiMockup']] as const) {
    let path = record.assetPaths?.[asset];
    if (!path && record[field]) {
      try {
        const url = new URL(record[field], 'http://local');
        const legacy = url.pathname.match(/\/o\/([^/]+)$/);
        path = url.searchParams.get('path') || (legacy ? decodeURIComponent(legacy[1]) : undefined);
      } catch { /* Invalid legacy references stay unavailable, not public. */ }
    }
    result[field] = path && isPrivateBagAssetPath(path) ? privateBagAssetUrl(path, guest) : undefined;
  }
  return result;
}
