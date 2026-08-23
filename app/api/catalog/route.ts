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
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error(`Catalog read failed for ${resource}.`, error);
    return NextResponse.json(
      { error: 'Catalog data is temporarily unavailable.' },
      { status: 503 }
    );
  }
}
