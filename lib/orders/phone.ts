const UZ_PHONE_PATTERN = /^\+998\d{9}$/;

export function normalizeUzbekPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('998')
    ? `+${digits}`
    : digits.length === 9
      ? `+998${digits}`
      : `+${digits}`;

  if (!UZ_PHONE_PATTERN.test(normalized)) {
    throw new Error('Укажите номер Узбекистана в формате +998 XX XXX XX XX.');
  }

  return normalized;
}

export function formatUzbekPhone(value: string) {
  const normalized = normalizeUzbekPhone(value);
  return normalized.replace(
    /^(\+998)(\d{2})(\d{3})(\d{2})(\d{2})$/,
    '$1 $2 $3 $4 $5'
  );
}

