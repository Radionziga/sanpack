type ApiErrorBody = {
  error?: unknown;
  code?: unknown;
};

export class ApiResponseError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

function readErrorMessage(body: unknown) {
  if (!body || typeof body !== 'object') return '';
  const error = (body as ApiErrorBody).error;
  return typeof error === 'string' ? error.trim() : '';
}

export async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage = 'Не удалось выполнить операцию. Попробуйте ещё раз.'
): Promise<T> {
  const text = await response.text();
  let body: unknown = null;

  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(
        response.ok
          ? 'Сервер вернул неполный ответ. Обновите страницу и попробуйте ещё раз.'
          : fallbackMessage
      );
    }
  }

  if (!response.ok) {
    const code = body && typeof body === 'object' && typeof (body as ApiErrorBody).code === 'string'
      ? (body as ApiErrorBody).code as string
      : undefined;
    throw new ApiResponseError(readErrorMessage(body) || fallbackMessage, response.status, code);
  }

  if (body === null) {
    throw new Error('Сервер не вернул данные. Обновите страницу и попробуйте ещё раз.');
  }

  return body as T;
}
