import { describe, expect, it } from 'vitest';
import { presentCommercialSummary, summarizeCommercialLines } from '@/lib/commerce/commercialSummary';

describe('commercial summary contract', () => {
  it('shows a preliminary total when every line has a price', () => {
    const summary = summarizeCommercialLines([
      { price: 10_000, quantity: 2 },
      { price: 5_000, quantity: 1 },
    ]);
    expect(summary).toMatchObject({ mode: 'priced', pricedSubtotal: 25_000, requestPriceLineCount: 0 });
    expect(presentCommercialSummary(summary, 'ru')).toMatchObject({
      label: 'Предварительная сумма',
      value: '25 000 сум',
      secondary: undefined,
    });
  });

  it('separates priced and request-price lines in a mixed cart', () => {
    const summary = summarizeCommercialLines([
      { price: 25_000, quantity: 1 },
      { priceMode: 'request', quantity: 50 },
    ]);
    const presentation = presentCommercialSummary(summary, 'ru');
    expect(summary).toMatchObject({ mode: 'mixed', pricedSubtotal: 25_000, requestPriceLineCount: 1 });
    expect(presentation.label).toBe('Сумма позиций с ценой');
    expect(presentation.secondary).toBe('+ 1 позиция — цена по запросу');
  });

  it('never renders an artificial zero for an all-request cart', () => {
    const summary = summarizeCommercialLines([
      { priceMode: 'request', quantity: 1 },
      { quantity: 4 },
      { price: undefined, quantity: 10 },
      { priceMode: 'request', quantity: 2 },
    ]);
    const presentation = presentCommercialSummary(summary, 'ru');
    expect(summary.mode).toBe('request');
    expect(presentation.value).toBe('Стоимость по запросу · 4 позиции');
    expect(presentation.value).not.toContain('0');
  });

  it('uses a canonical stored line total when provided', () => {
    const summary = summarizeCommercialLines([{ price: 980, quantity: 10_000, lineTotal: 9_800_000 }]);
    expect(summary.pricedSubtotal).toBe(9_800_000);
  });

  it('keeps the request-price contract meaningful in every storefront locale', () => {
    const summary = summarizeCommercialLines([{ priceMode: 'request', quantity: 10 }]);
    for (const language of ['ru', 'uz', 'en', 'zh'] as const) {
      const presentation = presentCommercialSummary(summary, language);
      expect(presentation.label).toBeTruthy();
      expect(presentation.value).toContain('1');
      expect(presentation.value).not.toMatch(/(?:^|\D)0\s*(?:сум|UZS|元)/);
      expect(presentation.note).toBeTruthy();
    }
  });
});
