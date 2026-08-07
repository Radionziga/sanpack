'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Clock3, LogOut, PackageCheck, Send } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PublicSanpackRepository } from '@/lib/repositories/publicRepository';
import type { RequestOrder } from '@/types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<RequestOrder[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/customer', { cache: 'no-store' })
      .then((response) => response.json())
      .then(async (status: { authenticated: boolean; customer: { name?: string } | null }) => {
        setAuthenticated(status.authenticated);
        setCustomerName(status.customer?.name || '');
        if (status.authenticated) setOrders(await PublicSanpackRepository.getMyRequests());
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить заявки.'));
  }, []);

  function login() {
    window.location.replace(new URL(`/api/auth/telegram/start?returnTo=${encodeURIComponent(window.location.pathname)}`, window.location.origin).toString());
  }

  async function logout() {
    await fetch('/api/auth/customer', { method: 'DELETE' });
    setAuthenticated(false);
    setOrders([]);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)] text-[var(--sp-ink)]">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        <Link href="/catalog" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--sp-brand)]"><ArrowLeft className="size-4" /> Каталог</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-extended text-2xl font-bold tracking-[-0.025em] sm:text-3xl">Мои заявки</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sp-ink-secondary)]">Здесь сохраняются заявки, оформленные через ваш Telegram-аккаунт.</p></div>{authenticated ? <button type="button" onClick={() => void logout()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--sp-line)] px-4 text-xs font-bold"><LogOut className="size-4" />Выйти{customerName ? ` · ${customerName}` : ''}</button> : null}</div>

        {authenticated === null && !error ? <p className="mt-10 text-sm text-[var(--sp-ink-tertiary)]">Загружаем историю…</p> : null}
        {error ? <p className="mt-8 rounded-lg border border-red-300/50 bg-red-500/8 px-4 py-3 text-sm text-[var(--sp-danger)]" role="alert">{error}</p> : null}
        {authenticated === false ? <section className="mt-8 rounded-[var(--sp-radius-lg)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-10 text-center"><Send className="mx-auto size-9 text-[var(--sp-brand)]" /><h2 className="mt-4 font-extended text-lg font-bold">Войдите через Telegram</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--sp-ink-secondary)]">После входа вы увидите заявки, связанные с этим Telegram-аккаунтом.</p><button type="button" onClick={login} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--sp-brand)] px-5 text-xs font-bold text-[var(--sp-on-brand)]"><Send className="size-4" />Войти через Telegram</button></section> : null}
        {authenticated && orders.length === 0 ? <section className="mt-8 rounded-[var(--sp-radius-lg)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-10 text-center"><Clock3 className="mx-auto size-9 text-[var(--sp-ink-muted)]" /><h2 className="mt-4 font-extended text-lg font-bold">Заявок пока нет</h2><Link href="/catalog" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[var(--sp-brand)] px-5 text-xs font-bold text-[var(--sp-on-brand)]">Открыть каталог</Link></section> : null}

        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[var(--sp-radius-lg)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--sp-line)] pb-4"><div><span className="text-[10px] uppercase tracking-[0.08em] text-[var(--sp-ink-tertiary)]">Заявка</span><h2 className="mt-1 font-mono text-base font-bold text-[var(--sp-brand)]">{order.requestNumber}</h2></div><time className="text-xs text-[var(--sp-ink-tertiary)]">{formatDate(order.createdAt)}</time></div>
              <div className="mt-4 space-y-3">{(order.originalItems ?? order.items).map((item) => <div key={item.lineId || `${item.productId}-${item.variantId || 'base'}`} className="flex items-start justify-between gap-4 text-sm"><div className="min-w-0"><p className="font-bold">{item.productTitleRu}</p>{item.variantTitleRu ? <p className="mt-0.5 text-xs text-[var(--sp-ink-secondary)]">{item.variantTitleRu}</p> : null}</div><span className="shrink-0 text-xs font-bold">{item.quantity} {item.unit}</span></div>)}</div>
              <p className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--sp-surface-inset)] px-3 py-2.5 text-xs text-[var(--sp-ink-secondary)]"><PackageCheck className="size-4 text-[var(--sp-brand)]" />Заявка принята. Менеджер свяжется с вами.</p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
