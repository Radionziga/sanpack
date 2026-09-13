'use client';

import { useId, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw, ShoppingBasket } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { formatMoney } from '@/lib/catalog/productPresentation';
import { reconcileCartItems, type CartReconciliationIssue } from '@/lib/orders/cartReconciliation';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import type { RequestItem } from '@/types';
import { trackAnalytics } from '@/lib/analytics/client';

const copyByLanguage = {
  ru: {
    action: 'Повторить состав', loading: 'Сверяем с текущим каталогом…', title: 'Актуальный состав',
    explanation: 'Мы сверили прошлую заявку с текущими товарами, ценами и условиями. Новая заявка не отправляется автоматически.',
    unchanged: 'Все доступные позиции актуальны.', add: 'Добавить актуальный состав в корзину', added: 'Состав добавлен в корзину.', openCart: 'Открыть корзину',
    empty: 'В этой заявке нет позиций, которые можно безопасно добавить.', error: 'Не удалось сверить состав. Проверьте соединение и повторите.', retry: 'Повторить',
    unavailable: 'Товар больше недоступен.', variantRequired: 'Теперь нужно выбрать вариант товара.', variantRemoved: 'Этот вариант больше недоступен. Выберите новый вариант.', informational: 'Товар теперь доступен только как информация и не добавлен.',
    quantityChanged: (from: number, to: number) => `Количество скорректировано: ${from} → ${to}.`,
    priceChanged: (from: string, to: string) => `Цена изменилась: ${from} → ${to}.`,
    packagingChanged: 'Условия упаковки изменились.', requestPrice: 'Текущая цена — по запросу.', available: 'Можно добавить по текущим условиям.',
  },
  uz: {
    action: 'Tarkibni takrorlash', loading: 'Joriy katalog bilan solishtirilmoqda…', title: 'Joriy tarkib',
    explanation: 'Oldingi ariza joriy mahsulotlar, narxlar va shartlar bilan solishtirildi. Yangi ariza avtomatik yuborilmaydi.',
    unchanged: 'Mavjud pozitsiyalar dolzarb.', add: 'Joriy tarkibni savatga qo‘shish', added: 'Tarkib savatga qo‘shildi.', openCart: 'Savatni ochish',
    empty: 'Bu arizada xavfsiz qo‘shish mumkin bo‘lgan pozitsiyalar yo‘q.', error: 'Tarkibni tekshirib bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.', retry: 'Qayta urinish',
    unavailable: 'Mahsulot endi mavjud emas.', variantRequired: 'Endi mahsulot variantini tanlash kerak.', variantRemoved: 'Bu variant endi mavjud emas. Yangi variantni tanlang.', informational: 'Mahsulot endi faqat ma’lumot uchun va qo‘shilmadi.',
    quantityChanged: (from: number, to: number) => `Miqdor moslashtirildi: ${from} → ${to}.`,
    priceChanged: (from: string, to: string) => `Narx o‘zgardi: ${from} → ${to}.`,
    packagingChanged: 'Qadoqlash shartlari o‘zgardi.', requestPrice: 'Joriy narx — so‘rov bo‘yicha.', available: 'Joriy shartlar bo‘yicha qo‘shish mumkin.',
  },
  en: {
    action: 'Repeat composition', loading: 'Checking the current catalog…', title: 'Current composition',
    explanation: 'We checked the previous request against current products, prices, and ordering rules. No new request is sent automatically.',
    unchanged: 'All available lines are current.', add: 'Add current composition to cart', added: 'Composition added to cart.', openCart: 'Open cart',
    empty: 'This request has no lines that can be added safely.', error: 'The composition could not be checked. Check your connection and try again.', retry: 'Try again',
    unavailable: 'This product is no longer available.', variantRequired: 'This product now requires a variant selection.', variantRemoved: 'This variant is no longer available. Choose a new variant.', informational: 'This product is now informational and was not added.',
    quantityChanged: (from: number, to: number) => `Quantity adjusted: ${from} → ${to}.`,
    priceChanged: (from: string, to: string) => `Price changed: ${from} → ${to}.`,
    packagingChanged: 'Packaging rules changed.', requestPrice: 'Current price is on request.', available: 'Can be added under current terms.',
  },
  zh: {
    action: '恢复上次申请商品', loading: '正在与当前目录核对…', title: '当前可用商品',
    explanation: '系统已按当前商品、价格和订购规则核对历史申请。不会自动提交新申请。',
    unchanged: '所有可用商品均为最新状态。', add: '将当前商品加入购物车', added: '商品已加入购物车。', openCart: '打开购物车',
    empty: '此申请中没有可安全加入的商品。', error: '无法核对商品，请检查网络后重试。', retry: '重试',
    unavailable: '此商品已不可用。', variantRequired: '此商品现在需要重新选择规格。', variantRemoved: '此规格已不可用，请选择新规格。', informational: '此商品现仅供展示，未加入购物车。',
    quantityChanged: (from: number, to: number) => `数量已调整：${from} → ${to}。`,
    priceChanged: (from: string, to: string) => `价格已变更：${from} → ${to}。`,
    packagingChanged: '包装规则已变更。', requestPrice: '当前价格需询价。', available: '可按当前条件加入。',
  },
} as const;

type Reconciliation = ReturnType<typeof reconcileCartItems>;

function issuesForItem(item: RequestItem, issues: CartReconciliationIssue[]) {
  return issues.filter((issue) => issue.lineId
    ? issue.lineId === item.lineId
    : issue.productId === item.productId && issue.variantId === item.variantId);
}

export function RepeatRequestPanel({ items }: { items: RequestItem[] }) {
  const { language, getLocalizedText } = useLanguage();
  const { addItem } = useRequestCart();
  const copy = copyByLanguage[language];
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error' | 'added'>('idle');
  const [reconciliation, setReconciliation] = useState<Reconciliation | null>(null);
  const titleId = useId();

  async function prepare() {
    setState('loading');
    try {
      const result = reconcileCartItems(items, await PublicRepository.getProducts());
      setReconciliation(result);
      trackAnalytics(language, { name: 'repeat_composition', lineCount: items.length, acceptedLineCount: result.items.length, changedLineCount: result.issues.length });
      setState('ready');
    } catch {
      setState('error');
    }
  }

  function addCurrentComposition() {
    if (!reconciliation) return;
    reconciliation.items.forEach((item) => {
      if (item.product) addItem(item.product, item.variant, item.quantity, item.comment);
    });
    setState('added');
  }

  if (state === 'idle') {
    return <button type="button" onClick={() => void prepare()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-brand)] transition-[background-color,transform] hover:bg-[var(--sp-brand-soft)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] motion-reduce:active:scale-100"><RefreshCw className="size-4" aria-hidden="true" />{copy.action}</button>;
  }

  if (state === 'loading') {
    return <p className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] px-4 text-sm font-semibold text-[var(--sp-ink-secondary)]" role="status" aria-live="polite"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />{copy.loading}</p>;
  }

  if (state === 'error') {
    return <div className="mt-4 rounded-[var(--sp-radius-control)] bg-[color-mix(in_srgb,var(--sp-danger)_7%,var(--sp-surface))] p-4 text-sm text-[var(--sp-danger)]" role="alert"><p className="flex items-start gap-2"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{copy.error}</p><button type="button" onClick={() => void prepare()} className="mt-3 min-h-10 rounded-[var(--sp-radius-control-inner)] border border-current px-4 font-semibold">{copy.retry}</button></div>;
  }

  if (state === 'added') {
    return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand-soft)] p-4 text-sm text-[var(--sp-brand-deep)]" role="status" aria-live="polite"><span className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4" aria-hidden="true" />{copy.added}</span><Link href="/request" className="inline-flex min-h-10 items-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand)] px-4 font-semibold text-[var(--sp-on-brand)]">{copy.openCart}</Link></div>;
  }

  const result = reconciliation!;
  return (
    <section className="mt-4 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] p-4" aria-labelledby={titleId}>
      <h3 id={titleId} className="font-extended text-base font-bold text-[var(--sp-ink)]">{copy.title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-[var(--sp-ink-secondary)]">{copy.explanation}</p>
      {result.issues.length === 0 ? <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--sp-success)]"><CheckCircle2 className="size-4" aria-hidden="true" />{copy.unchanged}</p> : null}
      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const itemIssues = issuesForItem(item, result.issues);
          const current = result.items.find((candidate) => item.lineId
            ? candidate.lineId === item.lineId
            : candidate.productId === item.productId && candidate.variantId === item.variantId);
          const title = getLocalizedText(item.productTitleRu, item.productTitleUz, item.productTitleEn, item.productTitleZh);
          const variant = getLocalizedText(item.variantTitleRu, item.variantTitleUz, item.variantTitleEn, item.variantTitleZh);
          const messages = itemIssues.map((issue) => {
            if (issue.kind === 'unavailable') return copy.unavailable;
            if (issue.kind === 'variant_required') return copy.variantRequired;
            if (issue.kind === 'variant_removed') return copy.variantRemoved;
            if (issue.kind === 'informational') return copy.informational;
            if (issue.kind === 'quantity_changed') return copy.quantityChanged(issue.previousQuantity!, issue.currentQuantity!);
            if (issue.kind === 'packaging_changed') return copy.packagingChanged;
            if (issue.kind === 'price_changed') return current?.price === undefined
              ? copy.requestPrice
              : copy.priceChanged(issue.previousPrice === undefined ? copy.requestPrice : formatMoney(issue.previousPrice, language, 'UZS'), formatMoney(current.price, language, 'UZS'));
            return '';
          }).filter(Boolean);
          return <li key={item.lineId || `${item.productId}:${item.variantId || ''}`} className="rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-surface)] p-3 text-xs"><p className="font-semibold text-[var(--sp-ink)]">{title}{variant ? ` · ${variant}` : ''}</p><div className="mt-1.5 space-y-1 text-[var(--sp-ink-secondary)]">{messages.length ? messages.map((message, index) => <p key={`${index}:${message}`}>{message}</p>) : <p>{current?.price === undefined ? copy.requestPrice : copy.available}</p>}</div></li>;
        })}
      </ul>
      {result.items.length > 0 ? <button type="button" onClick={addCurrentComposition} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-on-brand)] transition-[background-color,transform] hover:bg-[var(--sp-brand-deep)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] motion-reduce:active:scale-100"><ShoppingBasket className="size-4" aria-hidden="true" />{copy.add}</button> : <p className="mt-4 text-sm font-semibold text-[var(--sp-danger)]">{copy.empty}</p>}
    </section>
  );
}
