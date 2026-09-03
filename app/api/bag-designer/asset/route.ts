import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminStorage } from '@/lib/firebase/admin';
import { isPrivateBagAssetPath } from '@/lib/media/storagePaths';
import { verifyPrivateBagAssetUrl } from '@/lib/bag-designer/privateAssets';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';
import { logError } from '@/lib/observability/logger';

export const runtime = 'nodejs';
const headers = {
  'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; sandbox",
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.searchParams.get('path') || '';
    if (!isPrivateBagAssetPath(path)) return NextResponse.json({ error: 'Not found.' }, { status: 404, headers });
    if (!verifyPrivateBagAssetUrl(url)) {
      const admin = await getAdminSession();
      if (!admin || !['super_admin', 'sales_manager'].includes(admin.role)) {
        return NextResponse.json({ error: 'Not authorized.' }, { status: 403, headers });
      }
    }
    const limit = await checkDistributedRateLimit(request, 'bag-private-asset', 60, 10 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: { ...headers, 'Retry-After': String(limit.retryAfter) } });
    const file = getAdminStorage().bucket().file(path);
    const [metadata] = await file.getMetadata();
    const mime = metadata.contentType || '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime) || Number(metadata.size) > 12 * 1024 * 1024) {
      return NextResponse.json({ error: 'Unsupported asset.' }, { status: 415, headers });
    }
    const [buffer] = await file.download();
    return new NextResponse(new Uint8Array(buffer), { headers: { ...headers, 'Content-Type': mime } });
  } catch (error) {
    logError('bag_designer.asset_failed', error);
    return NextResponse.json({ error: 'Asset unavailable.' }, { status: 503, headers });
  }
}
