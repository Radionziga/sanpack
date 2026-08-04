import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { checkoutRequestSchema } from '@/lib/validation/order';
import { calculateOrderTotals, createOrderSnapshots } from '@/lib/orders/orderService';
import { formatUzbekPhone, normalizeUzbekPhone } from '@/lib/orders/phone';
import type { RequestOrder } from '@/types';
import { getTelegramPrivateSettings } from '@/lib/telegram/settings';
import { decryptSecret } from '@/lib/telegram/secrets';
import { verifyTelegramInitData } from '@/lib/telegram/miniApp';
import { notifyAboutNewOrder } from '@/lib/telegram/notifications';

export const runtime = 'nodejs';

async function requireCustomer(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  try {
    return await getAdminAuth().verifyIdToken(authorization.slice(7), true);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const customer = await requireCustomer(request);
  if (!customer) {
    return NextResponse.json({ error: 'Сессия браузера недоступна.' }, { status: 401 });
  }

  try {
    const snapshot = await getAdminDb()
      .collection('requests')
      .where('customerUid', '==', customer.uid)
      .limit(100)
      .get();
    const orders = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }) as RequestOrder)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Customer order history failed.', error);
    return NextResponse.json({ error: 'Не удалось загрузить историю заявок.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, 'order-request', 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  const customer = await requireCustomer(request);
  if (!customer) {
    return NextResponse.json(
      { error: 'Не удалось создать безопасную сессию браузера. Обновите страницу.' },
      { status: 401 }
    );
  }

  try {
    const parsed = checkoutRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Проверьте имя, телефон и состав заявки.', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const phoneNormalized = normalizeUzbekPhone(parsed.data.phone);
    const items = await createOrderSnapshots(parsed.data.items);
    const totals = calculateOrderTotals(items);
    let telegramUser: RequestOrder['telegramUser'];
    if (parsed.data.telegramInitData) {
      const telegramSettings = await getTelegramPrivateSettings();
      if (!telegramSettings.storefront.enabled || !telegramSettings.storefront.tokenEncrypted) {
        return NextResponse.json({ error: 'Telegram Mini App не настроен.' }, { status: 503 });
      }
      try {
        telegramUser = verifyTelegramInitData(
          parsed.data.telegramInitData,
          decryptSecret(telegramSettings.storefront.tokenEncrypted)
        );
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Не удалось проверить сессию Telegram.' },
          { status: 401 }
        );
      }
    }
    const document = getAdminDb().collection('requests').doc();
    const now = new Date().toISOString();
    const requestNumber = `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const order: RequestOrder & { serverCreatedAt: FieldValue } = {
      id: document.id,
      requestNumber,
      contactName: parsed.data.contactName,
      phone: formatUzbekPhone(phoneNormalized),
      phoneNormalized,
      customerUid: customer.uid,
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
      serverCreatedAt: FieldValue.serverTimestamp(),
    };

    await document.create(order);
    try {
      const notification = await notifyAboutNewOrder(order);
      await document.update({
        notification: {
          ...notification,
          attemptedAt: new Date().toISOString(),
        },
      });
    } catch (notificationError) {
      console.error('Order saved, but Telegram notification failed.', notificationError);
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
    if (error instanceof Error && (
      error.message.startsWith('Укажите номер')
      || error.message.includes('товар')
      || error.message.includes('количество')
      || error.message.includes('Количество')
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Order creation failed.', error);
    return NextResponse.json(
      { error: 'Заявка не была сохранена. Повторите отправку позже.' },
      { status: 503 }
    );
  }
}
