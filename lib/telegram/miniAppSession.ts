export type TelegramMiniAppSessionResult = 'browser' | 'authenticated' | 'rejected';
export type TelegramMiniAppSessionFailureReason =
  | 'invalid_shape'
  | 'expired'
  | 'future'
  | 'signature_mismatch'
  | 'invalid_user'
  | 'service_unavailable'
  | null;

let pendingSession: Promise<TelegramMiniAppSessionResult> | null = null;
let pendingInitData = '';
let pendingAbortController: AbortController | null = null;
let authenticatedInitData = '';
let authenticatedAt = 0;
let sessionGeneration = 0;
let lastFailureReason: TelegramMiniAppSessionFailureReason = null;
const SESSION_CACHE_MS = 5 * 60 * 1000;

const failureReasons = new Set<Exclude<TelegramMiniAppSessionFailureReason, null>>([
  'invalid_shape', 'expired', 'future', 'signature_mismatch', 'invalid_user', 'service_unavailable',
]);

export function getLastTelegramMiniAppSessionFailureReason() {
  return lastFailureReason;
}

export function resetTelegramMiniAppSessionCache() {
  pendingAbortController?.abort();
  pendingSession = null;
  pendingInitData = '';
  pendingAbortController = null;
  authenticatedInitData = '';
  authenticatedAt = 0;
  lastFailureReason = null;
  sessionGeneration += 1;
}

export function ensureTelegramMiniAppSession() {
  if (typeof window === 'undefined') return Promise.resolve<TelegramMiniAppSessionResult>('browser');
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return Promise.resolve<TelegramMiniAppSessionResult>('browser');
  if (authenticatedInitData === initData && Date.now() - authenticatedAt < SESSION_CACHE_MS) {
    return Promise.resolve<TelegramMiniAppSessionResult>('authenticated');
  }
  if (pendingSession && pendingInitData === initData) return pendingSession;
  if (pendingSession && pendingInitData !== initData) {
    pendingAbortController?.abort();
    pendingSession = null;
    pendingInitData = '';
  }

  pendingInitData = initData;
  const generation = ++sessionGeneration;
  const abortController = new AbortController();
  pendingAbortController = abortController;

  pendingSession = fetch('/api/auth/telegram/mini-app', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData }),
    signal: abortController.signal,
  })
    .then(async (response) => {
      const isCurrentIdentity = generation === sessionGeneration;
      if (response.ok && isCurrentIdentity) {
        authenticatedInitData = initData;
        authenticatedAt = Date.now();
        lastFailureReason = null;
      } else if (isCurrentIdentity) {
        const body = await response.json().catch(() => null) as { reason?: unknown } | null;
        lastFailureReason = typeof body?.reason === 'string' && failureReasons.has(body.reason as Exclude<TelegramMiniAppSessionFailureReason, null>)
          ? body.reason as Exclude<TelegramMiniAppSessionFailureReason, null>
          : null;
      }
      return response.ok && isCurrentIdentity ? 'authenticated' : 'rejected';
    })
    .catch(() => {
      if (generation === sessionGeneration) lastFailureReason = 'service_unavailable';
      return 'rejected' as const;
    })
    .finally(() => {
      if (generation === sessionGeneration && pendingInitData === initData) {
        pendingSession = null;
        pendingInitData = '';
        pendingAbortController = null;
      }
    });

  return pendingSession;
}
