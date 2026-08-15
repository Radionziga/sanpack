export function createPublicSiteUrl(pathname: string, requestUrl: string) {
  if (!pathname.startsWith('/')) {
    throw new Error('Public redirect path must be relative to the site origin.');
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const baseUrl = new URL(configuredSiteUrl || requestUrl);
  if (baseUrl.protocol !== 'https:' && baseUrl.protocol !== 'http:') {
    throw new Error('Public site URL must use HTTP or HTTPS.');
  }

  return new URL(pathname, `${baseUrl.origin}/`);
}
