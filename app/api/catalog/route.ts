import { logError } from '@/lib/observability/logger';
import { NextResponse } from 'next/server';
import {
  getPublicAttributes,
  getPublicBanners,
  getPublicCategories,
  getPublicClients,
  getPublicProducts,
  getPublicSettings,
} from '@/lib/repositories/serverCatalogRepository';

export const runtime = 'nodejs';

const resources = {
  products: getPublicProducts,
  categories: getPublicCategories,
  attributes: getPublicAttributes,
  clients: getPublicClients,
  banners: getPublicBanners,
  settings: getPublicSettings,
} as const;

export async function GET(request: Request) {
  const resource = new URL(request.url).searchParams.get('resource');
  if (!resource || !(resource in resources)) {
    return NextResponse.json({ error: 'Unknown catalog resource.' }, { status: 400 });
  }

  try {
    const data = await resources[resource as keyof typeof resources]();
    // The repository owns caching and tag invalidation. A second CDN stale
    // layer here could keep serving pre-mutation catalog responses.
    return NextResponse.json(data);
  } catch (error) {
    logError(`Catalog read failed for ${resource}.`, error);
    return NextResponse.json(
      { error: 'Catalog data is temporarily unavailable.' },
      { status: 503 }
    );
  }
}
