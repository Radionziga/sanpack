import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  order: {} as Record<string, unknown>,
  finishPdf: null as null | (() => void),
  pdfStarted: null as null | Promise<void>,
  markPdfStarted: null as null | (() => void),
}));
vi.mock('@/lib/auth/server', () => ({ getAdminSession: async () => ({ uid: 'sales', email: 'sales@example.test', role: 'sales_manager' }) }));
vi.mock('@/lib/documents/settings', () => ({ getInternalDocumentSettings: async () => ({ documentTitle: 'Order' }) }));
vi.mock('@/lib/documents/createInternalDocument', () => ({
  createInternalDocument: async () => {
    state.markPdfStarted?.();
    await new Promise<void>((resolve) => { state.finishPdf = resolve; });
    return new Uint8Array([1, 2, 3]);
  },
}));
vi.mock('@/lib/firebase/admin', () => ({
  getAdminDb: () => {
    const reference = {
      id: 'order-1',
      get: async () => ({ id: 'order-1', exists: true, data: () => ({ ...state.order }) }),
    };
    return {
      collection: () => ({ doc: () => reference }),
      runTransaction: async (callback: (transaction: unknown) => Promise<unknown>) => callback({
        get: reference.get,
        update: (_reference: unknown, patch: Record<string, unknown>) => { state.order = { ...state.order, ...patch }; },
      }),
    };
  },
}));

import { PATCH } from '@/app/api/admin/orders/[orderId]/route';
import { GET as GET_DOCUMENT } from '@/app/api/admin/orders/[orderId]/document/route';

function statusRequest(status: string, expectedRevision: number) {
  return new Request('http://localhost/api/admin/orders/order-1', {
    method: 'PATCH', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'status', status, expectedRevision }),
  });
}

describe('admin order optimistic concurrency', () => {
  beforeEach(() => {
    state.order = { requestNumber: 'ORD-1', contactName: 'A', phone: '+998901234567', items: [], status: 'new', revision: 1, auditTrail: [], createdAt: '2026-01-01' };
    state.finishPdf = null;
    state.pdfStarted = new Promise<void>((resolve) => { state.markPdfStarted = resolve; });
  });

  it('returns 409 instead of silently overwriting a newer revision', async () => {
    expect((await PATCH(statusRequest('fulfilled', 1), { params: Promise.resolve({ orderId: 'order-1' }) })).status).toBe(200);
    expect(state.order.revision).toBe(2);
    expect((await PATCH(statusRequest('processing', 1), { params: Promise.resolve({ orderId: 'order-1' }) })).status).toBe(409);
    expect(state.order.status).toBe('fulfilled');
  });

  it('atomically appends PDF audit after a concurrent manager update', async () => {
    const generating = GET_DOCUMENT(new Request('http://localhost/api/admin/orders/order-1/document'), {
      params: Promise.resolve({ orderId: 'order-1' }),
    });
    await state.pdfStarted;
    state.order = {
      ...state.order,
      status: 'processing',
      revision: 2,
      auditTrail: [{
        id: 'manager-change', action: 'status_changed', actorLabel: 'Manager',
        createdAt: '2026-01-02', summary: 'Changed', revision: 2,
      }],
    };
    state.finishPdf?.();
    const response = await generating;
    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('-r1.pdf');
    expect(state.order.revision).toBe(2);
    expect(state.order.documentGeneratedRevision).toBe(1);
    expect(state.order.auditTrail).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'manager-change', revision: 2 }),
      expect.objectContaining({ action: 'document_generated', revision: 1 }),
    ]));
  });
});
