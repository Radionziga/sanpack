import { readJsonBody } from '@/lib/security/readJsonBody';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { omitUndefinedFields } from '@/lib/firebase/firestoreData';
import { getCustomerSession } from '@/lib/auth/customerSession';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';
import { checkoutRequestSchema } from '@/lib/validation/order';
import { calculateOrderTotals, createOrderSnapshots } from '@/lib/orders/orderService';
import { getOrderInputErrorMessage } from '@/lib/orders/orderErrors';
import { formatUzbekPhone, normalizeUzbekPhone } from '@/lib/orders/phone';
import type { RequestOrder } from '@/types';
import { getTelegramPrivateSettings } from '@/lib/telegram/settings';
import { decryptSecret } from '@/lib/telegram/secrets';
import { verifyTelegramInitData } from '@/lib/telegram/miniApp';
import { notifyAboutNewOrder } from '@/lib/telegram/notifications';
import { logError } from '@/lib/observability/logger';
import { projectCustomerOrder } from '@/lib/orders/customerOrderProjection';
import { createHash } from 'node:crypto';

export const runtime = 'nodejs';

class IdempotencyConflictError extends Error {}

type StoredIntent = {
  intentHash?: string;
  payloadHash?: string;
  customerIdentity?: string;
  requestId?: string;
};

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function GET() {
  const customer = await getCustomerSession();
  if (!customer) {
    return NextResponse.json({ error: 'Чтобы увидеть свои заявки, войдите через Telegram.' }, { status: 401 });
  }

  try {
    const snapshot = await getAdminDb()
      .collection('requests')
      .where('customerUid', '==', customer.sub)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    const orders = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }) as RequestOrder)
      .map(projectCustomerOrder);
    return NextResponse.json(orders);
  } catch (error) {
    logError('order.history_failed', error);
    return NextResponse.json({ error: 'Не удалось загрузить историю заявок.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get('idempotency-key')?.trim() || '';
  if (!/^[A-Za-z0-9_-]{16,160}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: 'Некорректный ключ повторной отправки.' }, { status: 400 });
  }
  const parsed = checkoutRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Проверьте контактные данные, доставку и состав заявки.', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  try {
    const customer = await getCustomerSession();
    let telegramUser: RequestOrder['telegramUser'] = customer ? omitUndefinedFields({
      id: customer.telegramId,
      username: customer.username,
      firstName: customer.name,
    }) : undefined;

    if (parsed.data.telegramInitData) {
      try {
        const telegramSettings = await getTelegramPrivateSettings();
        if (!telegramSettings.storefront.enabled || !telegramSettings.storefront.tokenEncrypted) {
          throw new Error('Telegram Mini App is not configured.');
        }
        telegramUser = omitUndefinedFields(
          verifyTelegramInitData(
            parsed.data.telegramInitData,
            decryptSecret(telegramSettings.storefront.tokenEncrypted)
          )
        );
      } catch {
        console.warn('Telegram Mini App identity could not be verified; guest checkout was used.');
      }
    }

    const phoneNormalized = normalizeUzbekPhone(parsed.data.phone);
    const customerIdentity = customer?.sub
      || (telegramUser ? `telegram:${telegramUser.id}` : `phone:${phoneNormalized}`);
    const { telegramInitData: _transportIdentity, ...businessInput } = parsed.data;
    const intentHash = digest(businessInput);
    // Compatibility with intents written before the stable business-intent hash.
    const legacyPayloadHash = digest({
      customer: customer?.sub || telegramUser?.id || phoneNormalized,
      input: parsed.data,
    });
    const keyHash = createHash('sha256').update(idempotencyKey).digest('hex');
    const idempotencyReference = getAdminDb().collection('requestIdempotency').doc(keyHash);
    const resolveStoredIntent = async (
      priorData: StoredIntent,
      readOrder: (requestId: string) => Promise<{ id: string; exists: boolean; data: () => unknown }>,
    ) => {
      if (!priorData.requestId) throw new IdempotencyConflictError();
      const priorOrder = await readOrder(priorData.requestId);
      if (!priorOrder.exists) throw new IdempotencyConflictError();
      const order = { id: priorOrder.id, ...(priorOrder.data() as Record<string, unknown>) } as RequestOrder;
      const storedIdentity = priorData.customerIdentity || order.customerUid;
      const storedHash = priorData.intentHash || priorData.payloadHash;
      if (storedIdentity !== customerIdentity
        || !storedHash
        || (storedHash !== intentHash && storedHash !== legacyPayloadHash)) {
        throw new IdempotencyConflictError();
      }
      return order;
    };

    // Replay is resolved before consulting mutable Product state. A previously
    // accepted intent remains replayable even if its Product is later hidden.
    const priorIntent = await idempotencyReference.get();
    if (priorIntent.exists) {
      const priorOrder = await resolveStoredIntent(
        priorIntent.data() as StoredIntent,
        (requestId) => getAdminDb().collection('requests').doc(requestId).get(),
      );
      return NextResponse.json(projectCustomerOrder(priorOrder));
    }

    const rateLimit = await checkDistributedRateLimit(request, 'order-request', 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    let items;
    try {
      items = await createOrderSnapshots(parsed.data.items);
    } catch (catalogError) {
      // A concurrent identical request may have committed after our first
      // idempotency read. Prefer its receipt over a mutable-catalog error.
      const concurrentIntent = await idempotencyReference.get();
      if (concurrentIntent.exists) {
        const concurrentOrder = await resolveStoredIntent(
          concurrentIntent.data() as StoredIntent,
          (requestId) => getAdminDb().collection('requests').doc(requestId).get(),
        );
        return NextResponse.json(projectCustomerOrder(concurrentOrder));
      }
      throw catalogError;
    }
    const totals = calculateOrderTotals(items);
    const document = getAdminDb().collection('requests').doc();
    const now = new Date().toISOString();
    const requestNumber = `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const order: RequestOrder = {
      id: document.id,
      requestNumber,
      contactName: parsed.data.contactName,
      phone: formatUzbekPhone(phoneNormalized),
      phoneNormalized,
      deliveryType: 'delivery',
      deliveryAddress: parsed.data.deliveryAddress,
      deliveryDate: parsed.data.deliveryDate,
      deliveryWindow: parsed.data.deliveryWindow,
      notes: parsed.data.notes,
      customerUid: customerIdentity,
      source: telegramUser ? 'telegram_mini_app' : 'web',
      ...(telegramUser ? { telegramUser } : {}),
      items,
      originalItems: items,
      status: 'new',
      currency: 'UZS',
      ...totals,
      revision: 1,
      auditTrail: [{
        id: crypto.randomUUID(),
        action: 'created',
        actorLabel: 'Покупатель',
        createdAt: now,
        summary: 'Заявка оформлена покупателем.',
        revision: 1,
      }],
      createdAt: now,
      updatedAt: now,
    };

    const persisted = await getAdminDb().runTransaction(async (transaction) => {
      const prior = await transaction.get(idempotencyReference);
      if (prior.exists) {
        const priorData = prior.data() as StoredIntent;
        const priorOrder = await resolveStoredIntent(
          priorData,
          (requestId) => transaction.get(getAdminDb().collection('requests').doc(requestId)),
        );
        return { order: priorOrder, created: false };
      }
      transaction.create(document, { ...order, serverCreatedAt: FieldValue.serverTimestamp() });
      transaction.create(idempotencyReference, {
        intentHash,
        customerIdentity,
        requestId: document.id,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { order, created: true };
    });
    if (!persisted.created) return NextResponse.json(projectCustomerOrder(persisted.order));
    try {
      const notification = await notifyAboutNewOrder(order);
      await document.update({
        notification: { ...notification, attemptedAt: new Date().toISOString() },
      });
    } catch (notificationError) {
      logError('order.notification_failed', notificationError, { requestId: document.id });
      await document.update({
        notification: {
          delivered: false,
          reason: 'delivery_failed',
          attemptedAt: new Date().toISOString(),
        },
      }).catch(() => undefined);
    }
    return NextResponse.json(projectCustomerOrder(order), { status: 201 });
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({
        error: 'Эта попытка отправки уже связана с другой заявкой или покупателем.',
        code: 'IDEMPOTENCY_CONFLICT',
      }, { status: 409 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Проверьте заполненные поля.' }, { status: 400 });
    }
    const inputError = getOrderInputErrorMessage(error);
    if (inputError) {
      return NextResponse.json({ error: inputError }, { status: 400 });
    }
    logError('order.creation_failed', error);
    return NextResponse.json(
      { error: 'Заявка не была сохранена. Повторите отправку позже.' },
      { status: 503 }
    );
  }
}
