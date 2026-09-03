import 'server-only';

type LogLevel = 'info' | 'warn' | 'error';

function serializeError(error: unknown) {
  if (!(error instanceof Error)) return { type: 'UnknownError' };
  // Upstream messages/causes may contain URLs with tokens, credentials or PII.
  return { type: error.name === 'TypeError' ? 'TypeError' : 'Error' };
}

export function logEvent(
  level: LogLevel,
  event: string,
  details: Record<string, unknown> = {},
) {
  const payload = JSON.stringify({
    severity: level.toUpperCase(),
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
  console[level](payload);
}

export function logError(event: string, error: unknown, details: Record<string, unknown> = {}) {
  logEvent('error', event, { ...details, error: serializeError(error) });
}
