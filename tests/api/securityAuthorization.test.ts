import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { session, db } = vi.hoisted(() => ({ session: vi.fn(), db: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ getAdminSession: session }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminDb: db, getAdminStorage: db }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/documents/createInternalDocument', () => ({ createInternalDocument: vi.fn() }));
import * as data from '@/app/api/admin/data/route';
import * as documents from '@/app/api/admin/document-settings/route';
import * as telegram from '@/app/api/admin/telegram/route';
import * as gemini from '@/app/api/admin/gemini/route';
import * as image from '@/app/api/admin/gemini/product-image/route';
import * as translate from '@/app/api/admin/gemini/translate/route';
import * as media from '@/app/api/admin/media/route';
import * as bag from '@/app/api/admin/bag-designer/route';
import * as bagAsset from '@/app/api/bag-designer/asset/route';
import * as order from '@/app/api/admin/orders/[orderId]/route';
import * as pdf from '@/app/api/admin/orders/[orderId]/document/route';
import * as prices from '@/app/api/admin/prices/route';
import * as priceExport from '@/app/api/admin/prices/export/route';
import * as priceImport from '@/app/api/admin/prices/import/route';
import * as priceBatch from '@/app/api/admin/prices/[batchId]/route';
import * as productOperations from '@/app/api/admin/products/operations/route';

function request(body: unknown = {}, method = 'POST') {
  return new Request('https://shop.example/api/admin/data?resource=requests', { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
}
const context = { params: Promise.resolve({ orderId: 'order-1' }) };
const priceContext = { params: Promise.resolve({ batchId: '12345678-1234-1234-1234-123456789012' }) };
const routes = [
  ['data GET', () => data.GET(new Request('https://shop.example/api/admin/data?resource=requests'))],
  ['data POST', () => data.POST(request())],
  ['documents GET', () => documents.GET()], ['documents POST', () => documents.POST(request())],
  ['telegram GET', () => telegram.GET()], ['telegram POST', () => telegram.POST(request())],
  ['gemini GET', () => gemini.GET()], ['gemini POST', () => gemini.POST(request())],
  ['image POST', () => image.POST(request())], ['translate POST', () => translate.POST(request())],
  ['media GET', () => media.GET()], ['media POST', () => media.POST(request())], ['media DELETE', () => media.DELETE(request({}, 'DELETE'))],
  ['bag GET', () => bag.GET()], ['bag POST', () => bag.POST(request({ action: 'status', id: 'request-123', status: 'completed' }))],
  ['order PATCH', () => order.PATCH(request({}, 'PATCH'), context)], ['order PDF', () => pdf.GET(request(), context)],
  ['prices GET', () => prices.GET()], ['price export GET', () => priceExport.GET()],
  ['price import POST', () => priceImport.POST(request())],
  ['price batch GET', () => priceBatch.GET(new Request('https://shop.example/api/admin/prices/batch'), priceContext)],
  ['price batch POST', () => priceBatch.POST(request({ action: 'apply', warningsConfirmed: false }), priceContext)],
  ['product operations POST', () => productOperations.POST(request({ action: 'duplicate', target: { id: 'p', expectedUpdatedAt: '2026-01-01' } }))],
] as const;
beforeEach(() => {
  vi.clearAllMocks();
  session.mockResolvedValue(null);
  db.mockImplementation(() => { throw new Error('Privileged storage must not be reached.'); });
});
afterEach(() => vi.unstubAllEnvs());

describe('privileged API authentication', () => {
  it.each(routes)('%s denies anonymous direct HTTP access', async (_name, invoke) => {
    expect((await invoke())?.status).toBe(401);
    expect(db).not.toHaveBeenCalled();
  });
  it('private asset capability denies an unsigned anonymous request', async () => {
    expect((await bagAsset.GET(new Request('https://shop.example/api/bag-designer/asset?path=bag-design-requests%2Frequest-123%2Flogo.png'))).status).toBe(403);
    expect(db).not.toHaveBeenCalled();
  });
});
describe('existing role boundaries', () => {
  it.each(routes.filter(([name]) => name !== 'data POST'))('%s does not grant a viewer write/private access', async (_name, invoke) => {
    session.mockResolvedValue({ uid: 'viewer', role: 'viewer' });
    expect((await invoke())?.status).toBe(403);
    expect(db).not.toHaveBeenCalled();
  });
  it('denies content manager order editing and forced media deletion', async () => {
    session.mockResolvedValue({ uid: 'content', role: 'content_manager' });
    expect((await order.PATCH(request({ action: 'status', status: 'fulfilled' }, 'PATCH'), context)).status).toBe(403);
    expect((await media.DELETE(request({ path: 'media/a.webp', force: true }, 'DELETE')))?.status).toBe(403);
    expect(db).not.toHaveBeenCalled();
  });
  it.each([
    { action: 'updateRequestStatus', resource: 'products', id: 'p', data: { price: 1 } },
    { action: 'save', resource: 'products', id: 'p/private/secret', data: {} },
    { action: 'save', resource: 'settings', id: 'arbitrary', data: {} },
  ])('rejects raw action/path bypass: %j', async (body) => {
    session.mockResolvedValue({ uid: 'owner', role: 'super_admin' });
    // A valid database object may be obtained, but no document call is allowed.
    db.mockReturnValue({});
    expect((await data.POST(request(body)))?.status).toBe(400);
  });
  it('blocks destructive seed in production even for super_admin', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    session.mockResolvedValue({ uid: 'owner', role: 'super_admin' });
    db.mockReturnValue({});
    expect((await data.POST(request({ action: 'seed' })))?.status).toBe(403);
  });
});
