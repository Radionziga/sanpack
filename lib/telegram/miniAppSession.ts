let pendingSession: Promise<boolean> | null = null;

export function ensureTelegramMiniAppSession() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return Promise.resolve(false);
  if (pendingSession) return pendingSession;

  pendingSession = fetch('/api/auth/telegram/mini-app', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ initData }),
  })
    .then((response) => response.ok)
    .catch(() => false);

  return pendingSession;
}
