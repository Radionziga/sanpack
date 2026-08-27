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

export const runtime = 'nodejs';

export async function GET() {
  const customer = await getCustomerSession();
  if (!customer) {
    return NextResponse.json({ error: 'Чтобы увидеть свои заявки, войдите через Telegram.' }, { status: 401 });
  }

  try {
    const snapshot = await getAdminDb()
      .collection('requests')
      .where('customerUid', '==', customer.sub)
      .limit(100)
      .get();
    const orders = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }) as RequestOrder)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return NextResponse.json(orders);
  } catch (error) {
    logError('order.history_failed', error);
    return NextResponse.json({ error: 'Не удалось загрузить историю заявок.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const parsed = checkoutRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Проверьте контактные данные, доставку и состав заявки.', fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const rateLimit = await checkDistributedRateLimit(request, 'order-request', 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
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
    const items = await createOrderSnapshots(parsed.data.items);
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
      customerUid: customer?.sub || (telegramUser ? `telegram:${telegramUser.id}` : `phone:${phoneNormalized}`),
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

    await document.create({
      ...order,
      serverCreatedAt: FieldValue.serverTimestamp(),
    });
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
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
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
