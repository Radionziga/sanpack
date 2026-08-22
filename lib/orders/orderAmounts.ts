export function getOrderAmountOrZero(value?: number) {
  return value ?? 0;
}

export function formatOrderAmount(value?: number) {
  return value === undefined
    ? 'По запросу'
    : `${new Intl.NumberFormat('ru-RU').format(value)} сум`;
}
