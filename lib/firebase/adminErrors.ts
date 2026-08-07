export function firebaseAdminUnavailableMessage(
  service: 'данных' | 'изображений',
  error: unknown
) {
  const credentialProblem = isFirebaseAdminCredentialError(error);

  if (process.env.NODE_ENV !== 'production' && credentialProblem) {
    return `Срок локального подключения к базе истёк. Завершите повторный вход в открывшемся окне, затем обновите страницу и повторите загрузку ${service}.`;
  }

  return service === 'изображений'
    ? 'Хранилище изображений сейчас недоступно. Файл не сохранён — попробуйте ещё раз позже.'
    : 'Данные сейчас недоступны. Изменения не применены — попробуйте ещё раз позже.';
}

export function isFirebaseAdminCredentialError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /credential|application default|unauthenticated|could not load the default credentials|metadata server|metadata from plugin|invalid_grant|invalid_rapt|reauth related error/i.test(message);
}
