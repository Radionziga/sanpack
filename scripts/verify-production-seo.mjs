const baseUrl = new URL(process.env.SEO_BASE_URL || 'https://sanpack.uz');
const concurrency = Math.max(1, Math.min(12, Number(process.env.SEO_CONCURRENCY || 6)));
const locales = ['ru', 'uz', 'en', 'zh'];

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)=["']([^"']*)["']/g)].map((match) => [match[1].toLowerCase(), match[2]]),
  );
}

function extractLinks(html, rel) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((attrs) => attrs.rel?.toLowerCase() === rel);
}

function expectedAlternates(url) {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^\/(ru|uz|en|zh)(\/.*)?$/);
  if (!match) return null;
  const suffix = match[2] || '';
  return Object.fromEntries([
    ...locales.map((locale) => [locale, new URL(`/${locale}${suffix}`, baseUrl).toString()]),
    ['x-default', new URL(`/ru${suffix}`, baseUrl).toString()],
  ]);
}

function jsonLdTypes(html) {
  const types = new Set();
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(match[1]);
      const visit = (value) => {
        if (!value || typeof value !== 'object') return;
        if (typeof value['@type'] === 'string') types.add(value['@type']);
        if (Array.isArray(value)) value.forEach(visit);
        else Object.values(value).forEach(visit);
      };
      visit(data);
    } catch {
      types.add('INVALID_JSON_LD');
    }
  }
  return [...types].sort();
}

async function inspect(url) {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { 'user-agent': 'SANPACK-SEO-Release-Verification/1.0' },
  });
  const html = await response.text();
  const canonical = extractLinks(html, 'canonical')[0]?.href || '';
  const alternates = Object.fromEntries(
    extractLinks(html, 'alternate')
      .filter((link) => link.hreflang && link.href)
      .map((link) => [link.hreflang.toLowerCase(), link.href]),
  );
  const expected = expectedAlternates(url);
  const headerAlternates = Object.fromEntries(
    [...(response.headers.get('link') || '').matchAll(/<([^>]+)>;\s*rel="alternate";\s*hreflang="([^"]+)"/gi)]
      .map((match) => [match[2].toLowerCase(), match[1]]),
  );
  const robotsMeta = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((match) => attributes(match[0]))
    .filter((attrs) => attrs.name?.toLowerCase() === 'robots')
    .map((attrs) => attrs.content || '')
    .join(',');
  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const errors = [];
  if (response.status !== 200) errors.push(`status=${response.status}`);
  if (response.headers.get('location')) errors.push(`redirect=${response.headers.get('location')}`);
  if (!response.headers.get('content-type')?.includes('text/html')) errors.push('non-html');
  if (response.headers.get('x-robots-tag')?.toLowerCase().includes('noindex')) errors.push('x-robots-tag=noindex');
  if (robotsMeta.toLowerCase().includes('noindex')) errors.push('meta-robots=noindex');
  if (canonical !== url) errors.push(`canonical=${canonical || 'missing'}`);
  if (!h1) errors.push('missing-h1');
  if (expected) {
    for (const [locale, target] of Object.entries(expected)) {
      if (alternates[locale] !== target) errors.push(`hreflang-${locale}=${alternates[locale] || 'missing'}`);
      if (Object.keys(headerAlternates).length && headerAlternates[locale] !== target) {
        errors.push(`link-header-hreflang-${locale}=${headerAlternates[locale] || 'missing'}`);
      }
    }
  }
  const types = jsonLdTypes(html);
  if (types.includes('INVALID_JSON_LD')) errors.push('invalid-json-ld');
  if (new URL(url).pathname.includes('/product/')) {
    if (!types.includes('Product')) errors.push('missing-product-json-ld');
    if (!types.includes('BreadcrumbList')) errors.push('missing-product-breadcrumb-json-ld');
  }
  if (new URL(url).pathname.includes('/catalog/') && !types.includes('BreadcrumbList')) {
    errors.push('missing-category-breadcrumb-json-ld');
  }
  return { url, status: response.status, canonical, h1, types, errors };
}

async function mapConcurrent(values, worker) {
  const results = new Array(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = next++;
      if (index >= values.length) return;
      try {
        results[index] = await worker(values[index]);
      } catch (error) {
        results[index] = { url: values[index], status: 0, canonical: '', h1: '', types: [], errors: [`fetch=${error instanceof Error ? error.message : String(error)}`] };
      }
    }
  }));
  return results;
}

const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();
const sitemapResponse = await fetch(sitemapUrl, { redirect: 'manual' });
if (sitemapResponse.status !== 200) throw new Error(`Sitemap returned ${sitemapResponse.status}.`);
const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeXml(match[1].trim()));
const uniqueUrls = [...new Set(urls)];
if (urls.length !== uniqueUrls.length) throw new Error(`Sitemap contains ${urls.length - uniqueUrls.length} duplicate URL(s).`);
if (urls.some((url) => !url.startsWith(`${baseUrl.origin}/`))) throw new Error('Sitemap contains a URL outside the configured origin.');
if (urls.some((url) => new URL(url).search)) throw new Error('Sitemap contains query parameters.');
if (urls.some((url) => new URL(url).pathname !== '/' && new URL(url).pathname.endsWith('/'))) throw new Error('Sitemap contains a trailing-slash variant.');

console.log(`SANPACK production SEO verification: ${urls.length} sitemap URLs, concurrency ${concurrency}.`);
const results = await mapConcurrent(urls, inspect);
const failures = results.filter((result) => result.errors.length);
const typeCounts = new Map();
for (const result of results) {
  for (const type of result.types) typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
}

console.log(`Passed: ${results.length - failures.length}`);
console.log(`Failed: ${failures.length}`);
console.log(`Composition: products=${urls.filter((url) => new URL(url).pathname.includes('/product/')).length}, taxonomy=${urls.filter((url) => new URL(url).pathname.includes('/catalog/')).length}, static=${urls.filter((url) => !new URL(url).pathname.includes('/product/') && !new URL(url).pathname.includes('/catalog/')).length}`);
console.log(`JSON-LD types: ${[...typeCounts.entries()].sort().map(([type, count]) => `${type}=${count}`).join(', ') || 'none'}`);
if (failures.length) {
  for (const failure of failures.slice(0, 100)) console.error(`- ${failure.url}: ${failure.errors.join(', ')}`);
  if (failures.length > 100) console.error(`...and ${failures.length - 100} more failure(s).`);
  process.exitCode = 1;
} else {
  console.log('All sitemap URLs are canonical, indexable 200 HTML pages with consistent hreflang and required structured data.');
}
