import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { hasAdminCapability } from '@/lib/auth/adminCapabilities';
import { getAdminDb } from '@/lib/firebase/admin';
import { readJsonBody } from '@/lib/security/readJsonBody';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';
import { checkoutLineSchema } from '@/lib/validation/order';
import { getOrderInputErrorMessage } from '@/lib/orders/orderErrors';
import { IdempotencyConflictError, submitRequest } from '@/lib/orders/requestSubmission';
import { projectCustomerOrder } from '@/lib/orders/customerOrderProjection';
import { logError } from '@/lib/observability/logger';
import type { RequestOrder } from '@/types';

export const runtime = 'nodejs';

const createSchema = z.object({
  confirmation: z.literal('CREATE_ISOLATED_TEST_REQUEST'),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,160}$/),
  items: z.array(checkoutLineSchema).min(1).max(10),
}).strict();

const deleteSchema = z.object({
  confirmation: z.literal('DELETE_ISOLATED_TEST_REQUEST'),
  requestId: z.string().min(1).max(160).regex(/^[^/]+$/),
  requestNumber: z.string().startsWith('TEST-').max(40),
}).strict();

async function requireOrderOperator() {
  const admin = await getAdminSession();
  if (!admin) return { ok: false as const, response: NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 }) };
  if (!hasAdminCapability(admin.role, 'orders.write')) {
    return { ok: false as const, response: NextResponse.json({ error: 'Недостаточно прав.' }, { status: 403 }) };
  }
  return { ok: true as const, admin };
}

function tomorrowDate() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return tomorrow.toISOString().slice(0, 10);
}

export async function GET() {
  const authorization = await requireOrderOperator();
  if (!authorization.ok) return authorization.response;
  try {
    const snapshot = await getAdminDb().collection('testRequests')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    const tests = snapshot.docs.map((document) => {
      const order = { id: document.id, ...document.data() } as RequestOrder;
      return {
        ...projectCustomerOrder(order),
        notification: order.notification,
        test: order.test,
      };
    });
    return NextResponse.json(tests, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logError('order.test_history_failed', error);
    return NextResponse.json({ error: 'Не удалось загрузить тестовые заявки.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireOrderOperator();
  if (!authorization.ok) return authorization.response;
  const parsed = createSchema.safeParse(await readJsonBody(request, 32_000));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Проверьте состав и подтверждение тестовой заявки.' }, { status: 400 });
  }
  const rateLimit = await checkDistributedRateLimit(
    request,
    'order-test',
    12,
    60 * 60 * 1000,
    authorization.admin.uid,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Лимит тестовых заявок исчерпан. Повторите позже.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    );
  }

  try {
    const result = await submitRequest({
      input: {
        contactName: 'SANPACK — изолированный тест',
        phone: '+998 00 000 00 00',
        deliveryAddress: 'Тестовый контур — не доставлять',
        deliveryDate: tomorrowDate(),
        deliveryWindow: '09:00-13:00',
        notes: 'Автоматический operational smoke. Не является заявкой покупателя.',
        items: parsed.data.items,
      },
      idempotencyKey: parsed.data.idempotencyKey,
      customerIdentity: `test-operator:${authorization.admin.uid}`,
      source: 'admin',
      mode: 'test',
      testOperatorUid: authorization.admin.uid,
    });
    return NextResponse.json({
      ...result.receipt,
      notification: result.order.notification,
      test: result.order.test,
    }, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({
        error: 'Этот test key уже связан с другим содержимым.',
        code: 'IDEMPOTENCY_CONFLICT',
      }, { status: 409 });
    }
    const inputError = getOrderInputErrorMessage(error);
    if (inputError) return NextResponse.json({ error: inputError }, { status: 400 });
    logError('order.test_creation_failed', error);
    return NextResponse.json({ error: 'Изолированная тестовая заявка не создана.' }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const authorization = await requireOrderOperator();
  if (!authorization.ok) return authorization.response;
  const parsed = deleteSchema.safeParse(await readJsonBody(request, 8_000));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Нужно точное подтверждение удаления одной тестовой заявки.' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const reference = db.collection('testRequests').doc(parsed.data.requestId);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      const order = snapshot.exists ? snapshot.data() as Partial<RequestOrder> : null;
      if (!order?.test?.isolated || order.requestNumber !== parsed.data.requestNumber) {
        throw new Error('Isolated test request confirmation does not match.');
      }
      transaction.delete(reference);
      transaction.delete(db.collection('testRequestIdempotency').doc(order.test.idempotencyReferenceId));
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logError('order.test_cleanup_failed', error);
    return NextResponse.json({ error: 'Тестовая заявка не удалена: проверьте номер и повторите.' }, { status: 409 });
  }
}
