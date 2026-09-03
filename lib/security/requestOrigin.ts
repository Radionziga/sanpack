/** Browser cookie mutations must originate from this storefront, not another site/subdomain. */
export function hasTrustedMutationOrigin(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  const allowed = new Set([new URL(request.url).origin]);
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try { allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin); } catch { /* Invalid config grants nothing. */ }
  }
  return allowed.has(origin);
}
