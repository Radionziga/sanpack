// Runs the real application in an isolated disposable source copy. Never loads .env.local.
// Authentication and admin reads are fixtures; all cloud access/admin writes are disabled.
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = mkdtempSync(path.join(tmpdir(), 'sanpack-taxonomy-'));
const port = process.env.TAXONOMY_PORT || '3101';

let cleaned = false;
function cleanupFixture() {
  if (cleaned) return;
  cleaned = true;
  const expectedPrefix = path.join(tmpdir(), 'sanpack-taxonomy-');
  if (!fixture.startsWith(expectedPrefix)) {
    throw new Error(`Refusing to clean unexpected fixture path: ${fixture}`);
  }
  rmSync(fixture, { recursive: true, force: true });
}

// A force-killed test runner cannot execute its shutdown hook. Remove only
// dedicated SANPACK fixture directories before starting the next isolated run.
for (const entry of readdirSync(tmpdir())) {
  if (!entry.startsWith('sanpack-taxonomy-')) continue;
  const staleFixture = path.join(tmpdir(), entry);
  if (staleFixture === fixture) continue;
  if (!staleFixture.startsWith(path.join(tmpdir(), 'sanpack-taxonomy-'))) {
    throw new Error(`Refusing to clean unexpected fixture path: ${staleFixture}`);
  }
  rmSync(staleFixture, { recursive: true, force: true });
}

let child;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child?.kill(signal);
    cleanupFixture();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

const sourceDirectories = ['app', 'components', 'context', 'hooks', 'i18n', 'lib', 'messages', 'types', 'tests/fixtures']
  .filter((directory) => existsSync(path.join(source, directory)));
const rootFiles = readdirSync(source)
  .filter((name) => /^(package(-lock)?\.json|tsconfig\.json|next-env\.d\.ts|next\.config\..+|postcss\.config\..+|middleware\.ts|proxy\.ts|stylesheet\.css|.*\.woff2?)$/.test(name));
const fixtureSources = [...sourceDirectories, ...rootFiles];

try {
  // A bounded worktree archive includes the active patch and new source files,
  // but excludes build artifacts, dependencies and unrelated project files.
  const archive = spawnSync('tar', ['-cf', '-', ...fixtureSources], {
    cwd: source,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (archive.status !== 0) throw new Error(archive.stderr?.toString() || 'Unable to create fixture archive');
  const extraction = spawnSync('tar', ['-xf', '-', '-C', fixture], { input: archive.stdout });
  if (extraction.status !== 0) throw new Error(extraction.stderr?.toString() || 'Unable to extract fixture archive');
} catch (error) {
  cleanupFixture();
  throw error;
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
  })), createProduct({
    id: 'fixture-wholesale', slug: 'fixture-wholesale', sku: 'FIXTURE-WHOLESALE', categoryId: 'grocery', categorySlug: 'grocery',
    titleRu: 'Оптовый fixture', titleUz: 'Ulgurji fixture', titleEn: 'Wholesale fixture', titleZh: '批发测试商品',
    price: 100, wholesaleTiers: [{ minQuantity: 10, price: 80 }]
  }), createProduct({
    id: 'fixture-packaged', slug: 'fixture-packaged', sku: 'SP-FP-005', categoryId: 'grocery', categorySlug: 'grocery',
    titleRu: 'Коробочный fixture', titleUz: 'Qutili fixture', titleEn: 'Packaged fixture', titleZh: '箱装测试商品',
    price: 1100, salesUnit: 'шт', unitCode: 'piece', orderPackaging: {
      enabled: true, nameRu: 'коробка', nameUz: 'quti', nameEn: 'box', nameZh: '箱', unitsPerPackage: 1000, minimumPackages: 1, packageStep: 1
    }, wholesaleTiers: [{ minQuantity: 10000, price: 980 }], variants: [{
      id: 'fixture-packaged-800', sku: 'SP-FP-005-800', titleRu: '800 мл', titleUz: '800 ml', titleEn: '800 ml', titleZh: '800 毫升',
      price: 1100, stockStatus: 'in_stock', attributes: {}
    }]
  }), createProduct({
    id: 'fixture-request-price', slug: 'fixture-request-price', sku: 'FIXTURE-REQUEST', categoryId: 'grocery', categorySlug: 'grocery',
    titleRu: 'Цена по запросу fixture', titleUz: 'So‘rov narxi fixture', titleEn: 'Request price fixture', titleZh: '询价测试商品',
    showPrice: false, price: undefined, priceMode: 'request'
  })]`));
// These replacements exist ONLY in the temporary fixture directory, never in the working tree.
writeFileSync(path.join(fixture, 'lib/auth/server.ts'), `
import { cookies } from 'next/headers';
export const SESSION_COOKIE_NAME = '__session';
export const SESSION_MAX_AGE_MS = 1;
export async function getAdminSession() {
  const requestedRole = (await cookies()).get('fixture_admin_role')?.value;
  const role = ['super_admin', 'content_manager', 'sales_manager', 'viewer'].includes(requestedRole || '')
    ? requestedRole : 'super_admin';
  return { uid: 'fixture', email: 'fixture@example.test', name: 'Fixture', role };
}
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
const runtimeOptions = {
  cwd: fixture, stdio: 'inherit',
  env: {
    PATH: process.env.PATH, TMPDIR: tmpdir(), NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
    SANPACK_USE_SEED_DATA: 'true', NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
    NEXT_PUBLIC_FIREBASE_API_KEY: 'fixture-not-a-real-key', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-taxonomy',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-taxonomy.invalid', NEXT_PUBLIC_FIREBASE_APP_ID: 'fixture',
  },
};
const buildOptions = {
  ...runtimeOptions,
  env: { ...runtimeOptions.env, SANPACK_USE_SEED_DATA: 'false' },
};
const next = path.join(source, 'node_modules/next/dist/bin/next');
// Webpack supports the read-only node_modules symlink outside this temporary root.
child = spawn(process.execPath, [next, 'build', '--webpack'], buildOptions);
const buildCode = await new Promise((resolve) => child.on('exit', resolve));
if (buildCode !== 0) {
  cleanupFixture();
  process.exit(buildCode || 1);
}
child = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', port], runtimeOptions);
child.on('exit', (code) => {
  cleanupFixture();
  process.exit(code || 0);
});
