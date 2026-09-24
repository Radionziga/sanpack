import { describe, expect, it } from 'vitest';
import { customerOrderStatusMessage } from '@/lib/orders/orderStatusPresentation';

describe('customer order status presentation', () => {
  it('shows the current business status rather than the original acceptance text', () => {
    expect(customerOrderStatusMessage('new', 'ru')).toContain('принята');
    expect(customerOrderStatusMessage('processing', 'ru')).toBe('Заявка в работе.');
    expect(customerOrderStatusMessage('fulfilled', 'ru')).toBe('Заявка завершена.');
    expect(customerOrderStatusMessage('cancelled', 'ru')).toBe('Заявка отменена.');
  });

  it('has human-readable messages for every supported locale', () => {
    for (const language of ['ru', 'uz', 'en', 'zh'] as const) {
      for (const status of ['new', 'processing', 'fulfilled', 'cancelled'] as const) {
        const message = customerOrderStatusMessage(status, language);
        expect(message).toBeTruthy();
        expect(message).not.toBe(status);
      }
    }
  });
});
