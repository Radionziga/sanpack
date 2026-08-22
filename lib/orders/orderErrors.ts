const customerInputFragments = [
  'укажите номер',
  'товар',
  'количество',
  'выберите вариант',
  'минимальное',
  'максимальное',
];

export function getOrderInputErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  const normalizedMessage = error.message.toLocaleLowerCase('ru-RU');
  return customerInputFragments.some((fragment) => normalizedMessage.includes(fragment))
    ? error.message
    : undefined;
}
