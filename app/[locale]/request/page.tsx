'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ArrowLeft, CheckCircle2, Minus, Phone, Plus, ShoppingBag, Trash2, User } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useRequestCart } from '@/context/RequestCartContext';
import { PublicSanpackRepository } from '@/lib/repositories/publicRepository';

function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value);
}

export default function RequestPage() {
  const { items, updateQuantity, removeItem, clearCart, totalAmount } = useRequestCart();
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequestNumber, setSubmittedRequestNumber] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const created = await PublicSanpackRepository.createRequest({
        contactName,
        phone,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          comment: item.comment,
        })),
        telegramInitData: typeof window !== 'undefined'
          ? window.Telegram?.WebApp?.initData || undefined
          : undefined,
      });
      setSubmittedRequestNumber(created.requestNumber);
      clearCart();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Заявка не была сохранена.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        {submittedRequestNumber ? (
          <section className="mx-auto max-w-xl rounded-[var(--sp-radius-lg)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-7 text-center shadow-[var(--sp-shadow-raised)] sm:p-10" aria-live="polite">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sp-brand)_12%,transparent)] text-[var(--sp-brand)]">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </span>
            <h1 className="mt-5 font-extended text-2xl font-bold">Заявка принята</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-secondary)]">Менеджер свяжется с вами по указанному номеру телефона.</p>
            <div className="mt-6 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-4 py-3">
              <span className="block text-[10px] uppercase tracking-[0.08em] text-[var(--sp-ink-tertiary)]">Номер заявки</span>
              <strong className="mt-1 block font-mono text-lg text-[var(--sp-brand)]">{submittedRequestNumber}</strong>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href="/orders" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--sp-line)] px-4 text-xs font-bold hover:border-[var(--sp-line-strong)]">Мои заявки</Link>
              <Link href="/catalog" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--sp-brand)] px-4 text-xs font-bold text-[var(--sp-on-brand)]">Вернуться в каталог</Link>
            </div>
          </section>
        ) : (
          <>
            <Link href="/catalog" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--sp-brand)]">
              <ArrowLeft className="size-4" aria-hidden="true" /> Каталог
            </Link>
            <div className="mt-4">
              <h1 className="font-extended text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Оформление заявки</h1>
              <p className="mt-2 text-sm text-[var(--sp-ink-secondary)]">Проверьте товары и оставьте контакты. Регистрация не требуется.</p>
            </div>

            {items.length === 0 ? (
              <section className="mt-8 rounded-[var(--sp-radius-lg)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-10 text-center">
                <ShoppingBag className="mx-auto size-10 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                <h2 className="mt-4 font-extended text-lg font-bold">Корзина пуста</h2>
                <Link href="/catalog" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[var(--sp-brand)] px-5 text-xs font-bold text-[var(--sp-on-brand)]">Перейти в каталог</Link>
              </section>
            ) : (
              <form onSubmit={submit} className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                <section className="rounded-[var(--sp-radius-lg)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 sm:p-6">
                  <div className="flex items-center justify-between border-b border-[var(--sp-line)] pb-4">
                    <h2 className="font-extended text-lg font-bold">Товары <span className="text-[var(--sp-ink-tertiary)]">{items.length}</span></h2>
                    <button type="button" onClick={clearCart} className="text-xs font-bold text-[var(--sp-danger)]">Очистить</button>
                  </div>
                  <div className="divide-y divide-[var(--sp-line)]">
                    {items.map((item) => (
                      <article key={`${item.productId}-${item.variantId || 'base'}`} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                        <Image src={item.image || '/favicon.png'} alt="" width={72} height={72} sizes="72px" className="size-16 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] object-contain p-1 sm:size-[72px]" />
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold leading-5">{item.productTitleRu}</h3>
                          {item.variantTitleRu ? <p className="mt-1 text-xs text-[var(--sp-brand)]">{item.variantTitleRu}</p> : null}
                          <p className="mt-1 font-mono text-[10px] text-[var(--sp-ink-tertiary)]">{item.sku}</p>
                          {item.price !== undefined ? <p className="mt-2 text-xs font-bold">{formatMoney(item.price)} сум / {item.unit}</p> : <p className="mt-2 text-xs font-bold text-[var(--sp-brand)]">Цена по запросу</p>}
                        </div>
                        <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-auto">
                          <div className="flex min-h-10 items-center rounded-lg border border-[var(--sp-line)] bg-[var(--sp-control)]">
                            <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variantId)} className="flex size-10 items-center justify-center" aria-label="Уменьшить количество"><Minus className="size-3.5" /></button>
                            <span className="min-w-14 text-center text-xs font-bold">{item.quantity} {item.unit}</span>
                            <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variantId)} className="flex size-10 items-center justify-center" aria-label="Увеличить количество"><Plus className="size-3.5" /></button>
                          </div>
                          <button type="button" onClick={() => removeItem(item.productId, item.variantId)} className="flex size-10 items-center justify-center text-[var(--sp-danger)]" aria-label="Удалить товар"><Trash2 className="size-4" /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <aside className="rounded-[var(--sp-radius-lg)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 shadow-[var(--sp-shadow-raised)] lg:sticky lg:top-6">
                  <h2 className="font-extended text-lg font-bold">Контактные данные</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Нужны только имя и телефон. Менеджер уточнит остальные детали.</p>
                  {submitError ? <p className="mt-4 rounded-lg border border-red-300/50 bg-red-500/8 px-3 py-2.5 text-xs text-[var(--sp-danger)]" role="alert">{submitError}</p> : null}
                  <label className="mt-5 block text-xs font-bold">
                    Имя
                    <span className="mt-2 flex min-h-12 items-center gap-2 rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] px-3 focus-within:border-[var(--sp-brand)]">
                      <User className="size-4 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                      <input required minLength={2} maxLength={120} value={contactName} onChange={(event) => setContactName(event.target.value)} autoComplete="name" className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Как к вам обращаться" />
                    </span>
                  </label>
                  <label className="mt-4 block text-xs font-bold">
                    Телефон
                    <span className="mt-2 flex min-h-12 items-center gap-2 rounded-lg border border-[var(--sp-line-strong)] bg-[var(--sp-control)] px-3 focus-within:border-[var(--sp-brand)]">
                      <Phone className="size-4 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                      <input required inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className="w-full bg-transparent py-3 text-sm outline-none" placeholder="+998 90 123 45 67" />
                    </span>
                  </label>
                  <div className="mt-5 border-t border-[var(--sp-line)] pt-4">
                    <div className="flex items-center justify-between text-xs text-[var(--sp-ink-secondary)]"><span>Предварительная сумма</span><strong className="text-sm text-[var(--sp-ink)]">{totalAmount > 0 ? `${formatMoney(totalAmount)} сум` : 'По запросу'}</strong></div>
                    <p className="mt-2 text-[10px] leading-4 text-[var(--sp-ink-tertiary)]">Итоговые цены и условия менеджер подтвердит после получения заявки.</p>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="mt-5 min-h-12 w-full rounded-lg bg-[var(--sp-brand)] px-5 text-xs font-bold text-[var(--sp-on-brand)] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Отправляем…' : 'Отправить заявку'}</button>
                </aside>
              </form>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
