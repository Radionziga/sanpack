// Runs the real application in an isolated disposable source copy. Never loads .env.local.
// Authentication and admin reads are fixtures; all cloud access/admin writes are disabled.
import { cpSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = mkdtempSync(path.join(tmpdir(), 'sanpack-taxonomy-'));
const port = process.env.TAXONOMY_PORT || '3101';
for (const directory of ['app', 'components', 'context', 'hooks', 'i18n', 'lib', 'messages', 'types', 'tests/fixtures']) {
  cpSync(path.join(source, directory), path.join(fixture, directory), { recursive: true });
}
for (const name of readdirSync(source)) {
  if (/^(package(-lock)?\.json|tsconfig\.json|next-env\.d\.ts|next\.config\..+|postcss\.config\..+|middleware\.ts|proxy\.ts|stylesheet\.css|.*\.woff2?)$/.test(name)) {
    cpSync(path.join(source, name), path.join(fixture, name));
  }
}
for (const directory of ['node_modules', 'public']) symlinkSync(path.join(source, directory), path.join(fixture, directory));
const seedPath = path.join(fixture, 'lib/seedData.ts');
const seed = readFileSync(seedPath, 'utf8');
writeFileSync(seedPath, `import { taxonomyCategories, createAttribute } from '@/tests/fixtures/categories';
import { createProduct } from '@/tests/fixtures/products';
${seed}`
  .replace('initialCategories = priceList2026Categories', 'initialCategories = [...priceList2026Categories, ...taxonomyCategories]')
  .replace('initialAttributes = priceList2026Attributes', "initialAttributes = [...priceList2026Attributes, createAttribute('group-fixture-attribute', ['food']), createAttribute('category-fixture-attribute', ['grocery']), createAttribute('sub-fixture-attribute', ['grains'])]")
  .replace('initialProducts = priceList2026Products', `initialProducts = [...priceList2026Products, ...['grocery', 'grains', 'flour', 'cheese'].map((id) => createProduct({
    id: 'fixture-' + id, slug: 'fixture-' + id, sku: 'FIXTURE-' + id, categoryId: id, categorySlug: id,
    titleRu: 'Fixture ' + id, titleEn: 'Fixture ' + id, titleUz: 'Fixture ' + id, titleZh: 'Fixture ' + id,
    attributes: { 'group-fixture-attribute': 'common', 'category-fixture-attribute': 'grocery', 'sub-fixture-attribute': 'grains' }
  }))]`));
// These replacements exist ONLY in the temporary fixture directory, never in the working tree.
writeFileSync(path.join(fixture, 'lib/auth/server.ts'), `
export const SESSION_COOKIE_NAME = '__session';
export const SESSION_MAX_AGE_MS = 1;
export async function getAdminSession() { return { uid: 'fixture', email: 'fixture@example.test', name: 'Fixture', role: 'super_admin' }; }
export const requireAdmin = getAdminSession;
export async function verifyAdminToken() { return null; }
`);
writeFileSync(path.join(fixture, 'lib/firebase/admin.ts'), `
function blocked(): never { throw new Error('Cloud access disabled in isolated taxonomy fixture'); }
export const getAdminAuth = blocked;
export const getAdminDb = blocked;
export const getAdminStorage = blocked;
`);
writeFileSync(path.join(fixture, 'app/api/admin/data/route.ts'), `
import { NextResponse } from 'next/server';
import { initialCategories, initialProducts, initialAttributes, initialSiteSettings } from '@/lib/seedData';
export async function GET(request: Request) {
  const data: Record<string, unknown> = { categories: initialCategories, products: initialProducts, attributes: initialAttributes, settings: initialSiteSettings };
  return NextResponse.json(data[new URL(request.url).searchParams.get('resource') || ''] || []);
}
export async function POST() { return NextResponse.json({ error: 'Read-only fixture' }, { status: 405 }); }
`);
// Production runtime avoids long-lived Next dev/HMR cache stalls. Fixture-only
// auth/DB stubs intentionally don't implement Firebase types; the REAL working
// tree is typechecked/built separately with ignoreBuildErrors:false.
const configPath = path.join(fixture, 'next.config.ts');
writeFileSync(configPath, readFileSync(configPath, 'utf8')
  .replace('ignoreBuildErrors: false', 'ignoreBuildErrors: true')
  // Standalone copying is unnecessary: dependencies are intentionally symlinked.
  .replace("output: 'standalone',", ''));
console.log(`Isolated taxonomy fixture: ${fixture}`);
const options = {
  cwd: fixture, stdio: 'inherit',
  env: {
    PATH: process.env.PATH, TMPDIR: tmpdir(), NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    SANPACK_USE_SEED_DATA: 'true', NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
    NEXT_PUBLIC_FIREBASE_API_KEY: 'fixture-not-a-real-key', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-taxonomy',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-taxonomy.invalid', NEXT_PUBLIC_FIREBASE_APP_ID: 'fixture',
  },
};
const next = path.join(source, 'node_modules/next/dist/bin/next');
// Webpack supports the read-only node_modules symlink outside this temporary root.
let child = spawn(process.execPath, [next, 'build', '--webpack'], options);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
const buildCode = await new Promise((resolve) => child.on('exit', resolve));
if (buildCode !== 0) process.exit(buildCode || 1);
child = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', port], options);
child.on('exit', (code) => process.exit(code || 0));
