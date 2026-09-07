import type { Language } from '@/types';
import { initialSiteSettings } from '@/lib/seedData';
import { getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import { buildStaticRouteMetadata, type StaticRouteKey } from '@/lib/seo/metadata';

export async function getStaticRouteMetadata(key: StaticRouteKey, locale: Language) {
  const settings = await getPublicSettings().catch(() => initialSiteSettings);
  return buildStaticRouteMetadata(key, locale, settings);
}
