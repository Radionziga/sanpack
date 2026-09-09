import 'server-only';

import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { calculateOrderTotals, createOrderSnapshots } from '@/lib/orders/orderService';
import { projectCustomerOrder, type CustomerRequestOrder } from '@/lib/orders/customerOrderProjection';
import { formatUzbekPhone, normalizeUzbekPhone } from '@/lib/orders/phone';
import { logError } from '@/lib/observability/logger';
import { notifyAboutNewOrder, suppressTestOrderNotification } from '@/lib/telegram/notifications';
import type { CheckoutRequestInput } from '@/lib/validation/order';
import type { RequestOrder } from '@/types';

export class IdempotencyConflictError extends Error {}

type StoredIntent = {
  intentHash?: string;
  payloadHash?: string;
  customerIdentity?: string;
  requestId?: string;
};

type BusinessInput = Omit<CheckoutRequestInput, 'telegramInitData'>;

export interface RequestSubmissionInput {
  input: BusinessInput;
  idempotencyKey: string;
  customerIdentity: string;
  /** Server-derived identities that belong to the same verified customer. */
  customerIdentityAliases?: string[];
  source: NonNullable<RequestOrder['source']>;
  telegramUser?: RequestOrder['telegramUser'];
  legacyTransportInput?: CheckoutRequestInput;
  legacyCustomerIdentity?: string;
  mode?: 'live' | 'test';
  testOperatorUid?: string;
  beforeCreate?: () => Promise<void>;
}

export interface RequestSubmissionResult {
  receipt: CustomerRequestOrder;
  created: boolean;
  order: RequestOrder;
}

function digest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function submitRequest(input: RequestSubmissionInput): Promise<RequestSubmissionResult> {
  const mode = input.mode || 'live';
  const isTest = mode === 'test';
  if (isTest && !input.testOperatorUid) throw new Error('Test request requires an operator identity.');

  const db = getAdminDb();
  const requestCollection = isTest ? 'testRequests' : 'requests';
  const idempotencyCollection = isTest ? 'testRequestIdempotency' : 'requestIdempotency';
  const intentHash = digest(input.input);
  const legacyPayloadHash = input.legacyTransportInput ? digest({
    customer: input.legacyCustomerIdentity || input.customerIdentity,
    input: input.legacyTransportInput,
  }) : undefined;
  const keyHash = createHash('sha256').update(input.idempotencyKey).digest('hex');
  const idempotencyReference = db.collection(idempotencyCollection).doc(keyHash);
  const acceptedCustomerIdentities = new Set([
    input.customerIdentity,
    ...(input.customerIdentityAliases || []),
  ]);

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
    if (!storedIdentity || !acceptedCustomerIdentities.has(storedIdentity)
      || !storedHash
      || (storedHash !== intentHash && storedHash !== legacyPayloadHash)) {
      throw new IdempotencyConflictError();
    }
    return order;
  };

  const priorIntent = await idempotencyReference.get();
  if (priorIntent.exists) {
    const order = await resolveStoredIntent(
      priorIntent.data() as StoredIntent,
      (requestId) => db.collection(requestCollection).doc(requestId).get(),
    );
    return { order, receipt: projectCustomerOrder(order), created: false };
  }

  await input.beforeCreate?.();

  let items;
  try {
    items = await createOrderSnapshots(input.input.items);
  } catch (catalogError) {
    const concurrentIntent = await idempotencyReference.get();
    if (concurrentIntent.exists) {
      const order = await resolveStoredIntent(
        concurrentIntent.data() as StoredIntent,
        (requestId) => db.collection(requestCollection).doc(requestId).get(),
      );
      return { order, receipt: projectCustomerOrder(order), created: false };
    }
    throw catalogError;
  }

  const totals = calculateOrderTotals(items);
  const document = db.collection(requestCollection).doc();
  const now = new Date().toISOString();
  const requestNumber = `${isTest ? 'TEST' : 'ORD'}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const order: RequestOrder = {
    id: document.id,
    requestNumber,
    contactName: input.input.contactName,
    phone: formatUzbekPhone(normalizeUzbekPhone(input.input.phone)),
    phoneNormalized: normalizeUzbekPhone(input.input.phone),
    deliveryType: 'delivery',
    deliveryAddress: input.input.deliveryAddress,
    deliveryDate: input.input.deliveryDate,
    deliveryWindow: input.input.deliveryWindow,
    notes: input.input.notes,
    customerUid: input.customerIdentity,
    source: input.source,
    ...(input.telegramUser ? { telegramUser: input.telegramUser } : {}),
    items,
    originalItems: items,
    status: 'new',
    currency: 'UZS',
    ...totals,
    revision: 1,
    notification: {
      status: 'pending',
      delivered: false,
      channel: isTest ? 'test_sink' : 'telegram',
    },
    ...(isTest ? {
      test: {
        isolated: true as const,
        runId: keyHash.slice(0, 16),
        createdBy: input.testOperatorUid!,
        idempotencyReferenceId: keyHash,
      },
    } : {}),
    auditTrail: [{
      id: crypto.randomUUID(),
      action: 'created',
      actorLabel: isTest ? 'Изолированный тестовый контур' : 'Покупатель',
      createdAt: now,
      summary: isTest ? 'Создана изолированная тестовая заявка.' : 'Заявка оформлена покупателем.',
      revision: 1,
    }],
    createdAt: now,
    updatedAt: now,
  };

  const persisted = await db.runTransaction(async (transaction) => {
    const prior = await transaction.get(idempotencyReference);
    if (prior.exists) {
      const priorOrder = await resolveStoredIntent(
        prior.data() as StoredIntent,
        (requestId) => transaction.get(db.collection(requestCollection).doc(requestId)),
      );
      return { order: priorOrder, created: false };
    }
    transaction.create(document, { ...order, serverCreatedAt: FieldValue.serverTimestamp() });
    transaction.create(idempotencyReference, {
      intentHash,
      customerIdentity: input.customerIdentity,
      requestId: document.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { order, created: true };
  });
  if (!persisted.created) {
    return { order: persisted.order, receipt: projectCustomerOrder(persisted.order), created: false };
  }

  let notification: NonNullable<RequestOrder['notification']>;
  try {
    const result = isTest
      ? await suppressTestOrderNotification(order)
      : await notifyAboutNewOrder(order);
    notification = {
      status: result.delivered ? 'delivered' : result.reason === 'suppressed_test' ? 'suppressed' : 'skipped',
      delivered: result.delivered,
      ...(!result.delivered && result.reason ? { reason: result.reason } : {}),
      channel: isTest ? 'test_sink' : 'telegram',
      attemptedAt: new Date().toISOString(),
    };
  } catch (notificationError) {
    notification = {
      status: 'failed',
      delivered: false,
      reason: 'delivery_failed',
      channel: isTest ? 'test_sink' : 'telegram',
      attemptedAt: new Date().toISOString(),
    };
    order.notification = notification;
    logError('order.notification_failed', notificationError, { requestId: document.id });
    await document.update({ notification }).catch((statusError) => {
      logError('order.notification_status_failed', statusError, { requestId: document.id });
    });
    if (isTest) throw notificationError;
    return { order, receipt: projectCustomerOrder(order), created: true };
  }

  order.notification = notification;
  await document.update({ notification }).catch((statusError) => {
    logError('order.notification_status_failed', statusError, { requestId: document.id });
  });

  return { order, receipt: projectCustomerOrder(order), created: true };
}
