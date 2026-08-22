import { describe, expect, it } from 'vitest';
import { getOrderInputErrorMessage } from '@/lib/orders/orderErrors';

describe('order error disclosure', () => {
  it.each([
    'Укажите номер телефона в формате +998.',
    'Выберите вариант товара «Пакет».',
    'Количество для «Пакет» должно изменяться с шагом 5.',
    'Максимальное количество для «Пакет»: 100.',
  ])('keeps a customer-actionable message: %s', (message) => {
    expect(getOrderInputErrorMessage(new Error(message))).toBe(message);
  });

  it.each([
    new Error('Could not load the default credentials.'),
    new Error('Firestore transaction failed.'),
    'not an error',
  ])('hides infrastructure detail', (error) => {
    expect(getOrderInputErrorMessage(error)).toBeUndefined();
  });
});
