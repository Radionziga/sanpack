import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getInternalDocumentSettings } from '@/lib/documents/settings';
import { createInternalDocument } from '@/lib/documents/createInternalDocument';
import type { RequestOrder } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });
  if (!['super_admin', 'sales_manager'].includes(admin.role)) {
    return NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 });
  }
  const { orderId } = await params;
  const reference = getAdminDb().collection('requests').doc(orderId);
  const [snapshot, settings] = await Promise.all([reference.get(), getInternalDocumentSettings()]);
  if (!snapshot.exists) return NextResponse.json({ error: 'Заказ не найден.' }, { status: 404 });
  const order = { id: snapshot.id, ...snapshot.data() } as RequestOrder;
  const generatedRevision = order.revision || 1;
  const buffer = await createInternalDocument(order, settings);
  const now = new Date().toISOString();
  const auditEntry = {
      id: crypto.randomUUID(),
      action: 'document_generated',
      actorUid: admin.uid,
      actorLabel: admin.email,
      createdAt: now,
      summary: 'Сформирована внутренняя накладная PDF.',
      revision: generatedRevision,
  } as const;
  // PDF rendering may be slow. Append the audit entry in a short transaction
  // afterwards so a manager update made during rendering is never overwritten.
  await getAdminDb().runTransaction(async (transaction) => {
    const currentSnapshot = await transaction.get(reference);
    if (!currentSnapshot.exists) return;
    const current = currentSnapshot.data() as Partial<RequestOrder>;
    transaction.update(reference, {
      auditTrail: [...(current.auditTrail || []), auditEntry],
      documentGeneratedAt: now,
      documentGeneratedRevision: generatedRevision,
    });
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="internal-${order.requestNumber}-r${generatedRevision}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
