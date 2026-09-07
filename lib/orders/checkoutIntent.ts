import type { CheckoutBusinessInput } from '@/lib/repositories/publicRepository';

export interface PendingCheckoutIntent {
  key: string;
  input: CheckoutBusinessInput;
}

export function readPendingCheckoutIntent(storage: Pick<Storage, 'getItem' | 'removeItem'>, storageKey: string) {
  const raw = storage.getItem(storageKey);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingCheckoutIntent>;
    if (typeof value.key !== 'string' || value.key.length < 16 || !value.input || typeof value.input !== 'object') {
      throw new Error('Invalid pending checkout intent.');
    }
    const { telegramInitData: _transportAuth, ...input } = value.input as CheckoutBusinessInput & {
      telegramInitData?: unknown;
    };
    return { key: value.key, input } as PendingCheckoutIntent;
  } catch {
    storage.removeItem(storageKey);
    return null;
  }
}

export function checkoutIntentsMatch(left: CheckoutBusinessInput, right: CheckoutBusinessInput) {
  return JSON.stringify(left) === JSON.stringify(right);
}
