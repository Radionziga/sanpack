import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase/admin';
import { omitUndefinedFields } from '@/lib/firebase/firestoreData';
import { getCustomerSession } from '@/lib/auth/customerSession';
import { checkDistributedRateLimit } from '@/lib/security/distributedRateLimit';
import { readJsonBody } from '@/lib/security/readJsonBody';
import { checkoutRequestSchema } from '@/lib/validation/order';
import { getOrderInputErrorMessage } from '@/lib/orders/orderErrors';
import { normalizeUzbekPhone } from '@/lib/orders/phone';
import { IdempotencyConflictError, submitRequest } from '@/lib/orders/requestSubmission';
import type { RequestOrder } from '@/types';
import { getTelegramPrivateSettings } from '@/lib/telegram/settings';
import { decryptSecret } from '@/lib/telegram/secrets';
import { verifyTelegramInitData } from '@/lib/telegram/miniApp';
import { logError } from '@/lib/observability/logger';
import { projectCustomerOrder } from '@/lib/orders/customerOrderProjection';

export const runtime = 'nodejs';

class RequestRateLimitError extends Error {
  constructor(readonly retryAfter: number) {
    super('Request rate limit exceeded.');
  }
}

export async function GET() {
  let customer;
  try {
    customer = await getCustomerSession();
  } catch (error) {
    logError('order.customer_session_failed', error);
    return NextResponse.json({ error: 'Сервис авторизации временно недоступен.' }, { status: 503 });
  }
  if (!customer) {
    return NextResponse.json({ error: 'Чтобы увидеть свои заявки, войдите через Telegram.' }, { status: 401 });
  }

  try {
    const identityUids = customer.identityUids?.length ? customer.identityUids : [customer.sub];
    const snapshots = await Promise.all(identityUids.map((uid) => getAdminDb()
      .collection('requests')
      .where('customerUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()));
    const seen = new Set<string>();
    const orders = snapshots.flatMap((snapshot) => snapshot.docs)
      .filter((document) => {
        if (seen.has(document.id)) return false;
        seen.add(document.id);
        return true;
      })
      .map((document) => ({ id: document.id, ...document.data() }) as RequestOrder)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 100)
      .map(projectCustomerOrder);
    return NextResponse.json(orders, { headers: { 'Cache-Control': 'no-store' } });
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
      { status: 400 },
    );
  }

  try {
    const customer = await getCustomerSession();
    let telegramUser: RequestOrder['telegramUser'] = customer ? omitUndefinedFields({
      id: customer.telegramId,
      username: customer.username,
      firstName: customer.name,
    }) : undefined;
    let verifiedMiniAppUser: RequestOrder['telegramUser'];

    if (parsed.data.telegramInitData) {
      try {
        const settings = await getTelegramPrivateSettings();
        if (!settings.storefront.enabled || !settings.storefront.tokenEncrypted) {
          throw new Error('Telegram Mini App is not configured.');
        }
        verifiedMiniAppUser = omitUndefinedFields(verifyTelegramInitData(
          parsed.data.telegramInitData,
          decryptSecret(settings.storefront.tokenEncrypted),
        ));
      } catch {
        return NextResponse.json({ error: 'Не удалось подтвердить Telegram-сессию.' }, { status: 401 });
      }
      if (customer && verifiedMiniAppUser.id !== customer.telegramId) {
        return NextResponse.json({ error: 'Telegram-аккаунт не совпадает с активной сессией.' }, { status: 409 });
      }
      telegramUser = verifiedMiniAppUser;
    }

    const phoneNormalized = normalizeUzbekPhone(parsed.data.phone);
    const customerIdentity = customer?.sub
      || (telegramUser ? `telegram:${telegramUser.id}` : `phone:${phoneNormalized}`);
    const { telegramInitData: _transportIdentity, ...businessInput } = parsed.data;
    const result = await submitRequest({
      input: businessInput,
      idempotencyKey,
      customerIdentity,
      source: verifiedMiniAppUser ? 'telegram_mini_app' : 'web',
      telegramUser,
      legacyTransportInput: parsed.data,
      legacyCustomerIdentity: customer?.sub || verifiedMiniAppUser?.id || phoneNormalized,
      beforeCreate: async () => {
        const rateLimit = await checkDistributedRateLimit(request, 'order-request', 5, 10 * 60 * 1000);
        if (!rateLimit.allowed) throw new RequestRateLimitError(rateLimit.retryAfter);
      },
    });
    return NextResponse.json(result.receipt, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof RequestRateLimitError) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(error.retryAfter) } },
      );
    }
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
    if (inputError) return NextResponse.json({ error: inputError }, { status: 400 });
    logError('order.creation_failed', error);
    return NextResponse.json(
      { error: 'Заявка не была сохранена. Повторите отправку позже.' },
      { status: 503 },
    );
  }
}
