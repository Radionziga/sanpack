import 'server-only';

export type PublicCatalogResource =
  | 'products'
  | 'categories'
  | 'attributes'
  | 'clients'
  | 'banners'
  | 'settings';

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

/**
 * Local development may explicitly read the deployed public BFF projection when
 * Firebase ADC is unavailable. This is a selected data source, never a fallback:
 * a failed mirror request remains a visible PublicDataUnavailableError.
 */
export function getPublicCatalogMirrorOrigin() {
  if (process.env.NODE_ENV === 'production') return undefined;

  const configured = process.env.SANPACK_PUBLIC_CATALOG_ORIGIN?.trim();
  if (!configured) return undefined;

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error('SANPACK_PUBLIC_CATALOG_ORIGIN must be an absolute URL origin.');
  }

  const secure = url.protocol === 'https:';
  const localHttp = url.protocol === 'http:' && isLocalHostname(url.hostname);
  if (!secure && !localHttp) {
    throw new Error('SANPACK_PUBLIC_CATALOG_ORIGIN must use HTTPS (except localhost).');
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SANPACK_PUBLIC_CATALOG_ORIGIN must contain only an origin.');
  }

  return url.origin;
}

export async function readPublicCatalogMirror<T>(resource: PublicCatalogResource): Promise<T> {
  const origin = getPublicCatalogMirrorOrigin();
  if (!origin) throw new Error('The public catalog mirror is not configured.');

  const response = await fetch(`${origin}/api/catalog?resource=${encodeURIComponent(resource)}`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`The public catalog mirror returned HTTP ${response.status}.`);
  }

  return await response.json() as T;
}
