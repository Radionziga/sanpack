import type { Language, RequestItem } from '@/types';
import { formatMoney } from '@/lib/catalog/productPresentation';

export interface CommercialSummary {
  totalLineCount: number;
  pricedLineCount: number;
  requestPriceLineCount: number;
  pricedSubtotal: number;
  mode: 'priced' | 'mixed' | 'request';
}

export interface CommercialSummaryPresentation {
  label: string;
  value: string;
  secondary?: string;
  note: string;
}

type CommercialLine = Pick<RequestItem, 'price' | 'quantity' | 'lineTotal' | 'priceMode'>;

function isPricedLine(line: CommercialLine) {
  return line.priceMode !== 'request' && typeof line.price === 'number' && line.price > 0;
}

export function summarizeCommercialLines(lines: CommercialLine[]): CommercialSummary {
  const pricedLines = lines.filter(isPricedLine);
  const requestPriceLineCount = lines.length - pricedLines.length;
  const pricedSubtotal = pricedLines.reduce((total, line) => (
    total + (typeof line.lineTotal === 'number' ? line.lineTotal : (line.price ?? 0) * line.quantity)
  ), 0);

  return {
    totalLineCount: lines.length,
    pricedLineCount: pricedLines.length,
    requestPriceLineCount,
    pricedSubtotal,
    mode: requestPriceLineCount === 0 ? 'priced' : pricedLines.length === 0 ? 'request' : 'mixed',
  };
}

function requestLineCountText(count: number, language: Language) {
  if (language === 'zh') return `${count} 个商品项`;
  if (language === 'uz') return `${count} ta pozitsiya`;
  if (language === 'en') return `${count} ${count === 1 ? 'line' : 'lines'}`;
  const plural = new Intl.PluralRules('ru-RU').select(count);
  const noun = plural === 'one' ? 'позиция' : plural === 'few' ? 'позиции' : 'позиций';
  return `${count} ${noun}`;
}

function requestLineLabel(count: number, language: Language) {
  const countText = requestLineCountText(count, language);
  if (language === 'zh') return `${countText} — 价格需询价`;
  if (language === 'uz') return `${countText} — narxi so‘rov bo‘yicha`;
  if (language === 'en') return `${countText} — price on request`;
  return `${countText} — цена по запросу`;
}

const copy = {
  ru: {
    preliminary: 'Предварительная сумма',
    priced: 'Сумма позиций с ценой',
    request: 'Стоимость по запросу',
    note: 'Менеджер подтвердит итоговую стоимость, наличие и доставку. Отправка заявки не требует оплаты.',
  },
  uz: {
    preliminary: 'Dastlabki summa',
    priced: 'Narxi ko‘rsatilgan pozitsiyalar summasi',
    request: 'Narx so‘rov bo‘yicha',
    note: 'Menejer yakuniy narx, mavjudlik va yetkazib berishni tasdiqlaydi. Ariza yuborish uchun to‘lov talab qilinmaydi.',
  },
  en: {
    preliminary: 'Estimated total',
    priced: 'Total for priced lines',
    request: 'Price on request',
    note: 'The manager will confirm the final price, availability, and delivery. Submitting a request does not require payment.',
  },
  zh: {
    preliminary: '预估金额',
    priced: '已标价商品金额',
    request: '价格需询价',
    note: '经理将确认最终价格、库存和配送。提交采购申请无需付款。',
  },
} as const;

export function presentCommercialSummary(
  summary: CommercialSummary,
  language: Language,
  currency = 'UZS',
): CommercialSummaryPresentation {
  const labels = copy[language];
  if (summary.mode === 'request') {
    return {
      label: labels.request,
      value: `${labels.request} · ${requestLineCountText(summary.requestPriceLineCount, language)}`,
      note: labels.note,
    };
  }
  return {
    label: summary.mode === 'mixed' ? labels.priced : labels.preliminary,
    value: formatMoney(summary.pricedSubtotal, language, currency),
    secondary: summary.mode === 'mixed'
      ? `+ ${requestLineLabel(summary.requestPriceLineCount, language)}`
      : undefined,
    note: labels.note,
  };
}
