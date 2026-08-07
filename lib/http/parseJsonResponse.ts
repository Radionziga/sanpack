type ApiErrorBody = {
  error?: unknown;
};

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
    throw new Error(readErrorMessage(body) || fallbackMessage);
  }

  if (body === null) {
    throw new Error('Сервер не вернул данные. Обновите страницу и попробуйте ещё раз.');
  }

  return body as T;
}
