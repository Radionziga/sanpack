import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { omitUndefinedFields } from '@/lib/firebase/firestoreData';
import { adminOrderUpdateSchema, orderStatusSchema } from '@/lib/validation/order';
import { calculateOrderTotals, createOrderSnapshots } from '@/lib/orders/orderService';
import { formatUzbekPhone, normalizeUzbekPhone } from '@/lib/orders/phone';
import type { RequestItem, RequestOrder } from '@/types';

export const runtime = 'nodejs';

const mutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('status'), status: orderStatusSchema }).strict(),
  z.object({ action: z.literal('edit'), order: adminOrderUpdateSchema }).strict(),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 });

  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Проверьте данные заказа.', issues: parsed.error.issues }, { status: 400 });
  }

  const { orderId } = await params;
  const reference = getAdminDb().collection('requests').doc(orderId);
  const initialSnapshot = await reference.get();
  if (!initialSnapshot.exists) return NextResponse.json({ error: 'Заказ не найден.' }, { status: 404 });
  const initial = { id: initialSnapshot.id, ...initialSnapshot.data() } as RequestOrder;
  const now = new Date().toISOString();

  try {
    if (parsed.data.action === 'status') {
      if (initial.status === parsed.data.status) return NextResponse.json(initial);
      const revision = (initial.revision || 1) + 1;
      const auditEntry = {
        id: crypto.randomUUID(),
        action: 'status_changed' as const,
        actorUid: admin.uid,
        actorLabel: admin.email,
        createdAt: now,
        summary: `Статус изменён: ${initial.status} → ${parsed.data.status}.`,
        revision,
      };
      await reference.update({
        status: parsed.data.status,
        revision,
        updatedAt: now,
        auditTrail: [...(initial.auditTrail || []), auditEntry],
      });
    } else {
      const input = parsed.data.order;
      const existingLines = new Map(
        initial.items.map((item) => [item.lineId || `${item.productId}-${item.variantId || 'base'}`, item])
      );
      const newInputs = input.items.filter((line) => !line.lineId || !existingLines.has(line.lineId));
      const newSnapshots = newInputs.length
        ? await createOrderSnapshots(newInputs.map(({ productId, variantId, quantity, comment }) => ({ productId, variantId, quantity, comment })))
        : [];
      let newIndex = 0;
      const items = input.items.map((line): RequestItem => {
        const existing = line.lineId ? existingLines.get(line.lineId) : undefined;
        const base = existing || newSnapshots[newIndex++];
        if (!base) throw new Error('Не удалось собрать позицию заказа.');
        const price = line.unitPrice ?? base.price;
        return omitUndefinedFields({
          ...base,
          lineId: base.lineId || crypto.randomUUID(),
          quantity: line.quantity,
          comment: line.comment,
          price,
          priceMode: price === undefined ? 'request' : 'fixed',
          lineTotal: price === undefined ? undefined : price * line.quantity,
        });
      });
      const totals = calculateOrderTotals(items, input.adjustment);
      const revision = (initial.revision || 1) + 1;
      const phoneNormalized = normalizeUzbekPhone(input.phone);
      const auditEntry = {
        id: crypto.randomUUID(),
        action: 'order_edited' as const,
        actorUid: admin.uid,
        actorLabel: admin.email,
        createdAt: now,
        summary: 'Администратор обновил состав или данные заказа.',
        revision,
      };
      await reference.update({
        contactName: input.contactName,
        phone: formatUzbekPhone(phoneNormalized),
        phoneNormalized,
        status: input.status,
        notes: input.notes,
        items,
        ...totals,
        revision,
        updatedAt: now,
        auditTrail: [...(initial.auditTrail || []), auditEntry],
      });
    }

    const updated = await reference.get();
    return NextResponse.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error('Admin order update failed.', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Заказ не был обновлён.' },
      { status: 400 }
    );
  }
}
