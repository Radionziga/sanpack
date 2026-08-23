'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, LogOut, MapPin, PackageCheck, Send } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import { formatMoney } from '@/lib/catalog/productPresentation';
import { ensureTelegramMiniAppSession } from '@/lib/telegram/miniAppSession';
import type { Language, RequestOrder } from '@/types';

const localeCodes: Record<Language, string> = { ru: 'ru-RU', uz: 'uz-UZ', en: 'en-US' };

function formatDate(value: string, language: Language) {
  return new Intl.DateTimeFormat(localeCodes[language], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function localizeUnit(unit: string, language: Language) {
  const normalized = unit.toLowerCase().replace(/[.\s]/g, '');
  const labels: Record<string, Record<Language, string>> = {
    'шт': { ru: 'шт.', uz: 'dona', en: 'pcs' },
    'штука': { ru: 'шт.', uz: 'dona', en: 'pcs' },
    'уп': { ru: 'уп.', uz: 'qadoq', en: 'packs' },
    'упаковка': { ru: 'уп.', uz: 'qadoq', en: 'packs' },
    'кг': { ru: 'кг', uz: 'kg', en: 'kg' },
    'короб': { ru: 'кор.', uz: 'quti', en: 'boxes' },
    'рулон': { ru: 'рул.', uz: 'rulon', en: 'rolls' },
  };
  return labels[normalized]?.[language] || unit;
}

export default function OrdersPage() {
  const { language, getLocalizedText } = useLanguage();
  const copy = {
    ru: {
      catalog: 'Каталог', title: 'Мои заявки', intro: 'Здесь сохраняются заявки, оформленные через ваш Telegram-аккаунт.',
      logout: 'Выйти', loading: 'Загружаем историю…', loginError: 'Не удалось войти через Telegram. Попробуйте ещё раз.',
      loadError: 'Не удалось загрузить заявки.', loginTitle: 'Войдите через Telegram', loginText: 'После входа вы увидите заявки, связанные с этим Telegram-аккаунтом.',
      login: 'Войти через Telegram', empty: 'Заявок пока нет', openCatalog: 'Открыть каталог', request: 'Заявка', accepted: 'Заявка принята. Менеджер свяжется с вами.', total: 'Предварительная сумма',
      delivery: 'Доставка', address: 'Адрес',
    },
    uz: {
      catalog: 'Katalog', title: 'Mening arizalarim', intro: 'Telegram akkauntingiz orqali yuborilgan arizalar shu yerda saqlanadi.',
      logout: 'Chiqish', loading: 'Tarix yuklanmoqda…', loginError: 'Telegram orqali kirib bo‘lmadi. Qayta urinib ko‘ring.',
      loadError: 'Arizalarni yuklab bo‘lmadi.', loginTitle: 'Telegram orqali kiring', loginText: 'Kirgandan so‘ng Telegram akkauntingizga bog‘langan arizalarni ko‘rasiz.',
      login: 'Telegram orqali kirish', empty: 'Hozircha arizalar yo‘q', openCatalog: 'Katalogni ochish', request: 'Ariza', accepted: 'Ariza qabul qilindi. Menejer siz bilan bog‘lanadi.', total: 'Dastlabki summa',
      delivery: 'Yetkazib berish', address: 'Manzil',
    },
    en: {
      catalog: 'Catalog', title: 'My requests', intro: 'Requests placed with your Telegram account are saved here.',
      logout: 'Sign out', loading: 'Loading history…', loginError: 'Telegram sign-in failed. Please try again.',
      loadError: 'We could not load your requests.', loginTitle: 'Sign in with Telegram', loginText: 'After signing in, you will see requests linked to this Telegram account.',
      login: 'Sign in with Telegram', empty: 'No requests yet', openCatalog: 'Open catalog', request: 'Request', accepted: 'Your request has been received. A manager will contact you.', total: 'Preliminary total',
      delivery: 'Delivery', address: 'Address',
    },
  }[language];
  const [orders, setOrders] = useState<RequestOrder[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadOrders() {
      const currentUrl = new URL(window.location.href);
      const telegramAuthFailed = currentUrl.searchParams.get('telegramAuth') === 'error';
      if (currentUrl.searchParams.has('telegramAuth') || currentUrl.searchParams.has('reason')) {
        currentUrl.searchParams.delete('telegramAuth');
        currentUrl.searchParams.delete('reason');
        window.history.replaceState(null, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
      }
      try {
        await ensureTelegramMiniAppSession();
        const response = await fetch('/api/auth/customer', { cache: 'no-store' });
        const status = await response.json() as { authenticated: boolean; customer: { name?: string } | null };
        if (cancelled) return;
        if (telegramAuthFailed) setError(copy.loginError);
        setAuthenticated(status.authenticated);
        setCustomerName(status.customer?.name || '');
        if (status.authenticated) setOrders(await PublicRepository.getMyRequests());
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : copy.loadError);
      }
    }
    void loadOrders();
    return () => { cancelled = true; };
  }, [copy.loadError, copy.loginError]);

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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
        <Link href="/catalog" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-[var(--sp-ink-secondary)] transition-colors hover:text-[var(--sp-brand)]"><ArrowLeft className="size-4" />{copy.catalog}</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-extended text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sp-ink-secondary)]">{copy.intro}</p></div>{authenticated ? <button type="button" onClick={() => void logout()} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-4 text-xs font-semibold"><LogOut className="size-4" />{copy.logout}{customerName ? ` · ${customerName}` : ''}</button> : null}</div>

        {authenticated === null && !error ? <p className="mt-10 text-sm text-[var(--sp-ink-tertiary)]">{copy.loading}</p> : null}
        {error ? <p className="sp-alert sp-alert-danger mt-8 text-sm" role="alert">{error}</p> : null}
        {authenticated === false ? <section className="mt-8 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-8 text-center"><Send className="mx-auto size-9 text-[var(--sp-brand)]" /><h2 className="mt-4 font-extended text-lg font-bold">{copy.loginTitle}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--sp-ink-secondary)]">{copy.loginText}</p><button type="button" onClick={login} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-xs font-semibold text-[var(--sp-on-brand)]"><Send className="size-4" />{copy.login}</button></section> : null}
        {authenticated && orders.length === 0 ? <section className="mt-8 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-8 text-center"><Clock3 className="mx-auto size-9 text-[var(--sp-ink-muted)]" /><h2 className="mt-4 font-extended text-lg font-bold">{copy.empty}</h2><Link href="/catalog" className="mt-5 inline-flex min-h-11 items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-xs font-semibold text-[var(--sp-on-brand)]">{copy.openCatalog}</Link></section> : null}

        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--sp-line)] pb-4"><div><span className="text-[10px] uppercase tracking-[0.08em] text-[var(--sp-ink-tertiary)]">{copy.request}</span><h2 className="mt-1 font-mono text-base font-bold text-[var(--sp-brand)]">{order.requestNumber}</h2></div><time className="text-xs text-[var(--sp-ink-tertiary)]">{formatDate(order.createdAt, language)}</time></div>
              <div className="mt-4 space-y-3">{(order.originalItems ?? order.items).map((item) => <div key={item.lineId || `${item.productId}-${item.variantId || 'base'}`} className="flex items-start justify-between gap-4 text-sm"><div className="min-w-0"><p className="font-semibold">{getLocalizedText(item.productTitleRu, item.productTitleUz, item.productTitleEn)}</p>{item.variantTitleRu ? <p className="mt-0.5 text-xs text-[var(--sp-ink-secondary)]">{getLocalizedText(item.variantTitleRu, item.variantTitleUz, item.variantTitleEn)}</p> : null}</div><span className="shrink-0 text-xs font-semibold">{item.quantity} {localizeUnit(item.unit, language)}</span></div>)}</div>
              {order.deliveryAddress || order.deliveryDate || order.deliveryWindow ? <div className="mt-5 grid gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] p-3 text-xs text-[var(--sp-ink-secondary)] sm:grid-cols-2"><p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-[var(--sp-brand)]" /><span><strong className="block text-[var(--sp-ink)]">{copy.address}</strong>{order.deliveryAddress || '—'}</span></p><p className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--sp-brand)]" /><span><strong className="block text-[var(--sp-ink)]">{copy.delivery}</strong>{order.deliveryDate ? new Intl.DateTimeFormat(localeCodes[language], { dateStyle: 'medium' }).format(new Date(`${order.deliveryDate}T12:00:00`)) : '—'}{order.deliveryWindow ? ` · ${order.deliveryWindow.replace('-', '–')}` : ''}</span></p></div> : null}
              {typeof order.total === 'number' && order.total > 0 ? <div className="mt-5 flex items-center justify-between border-t border-[var(--sp-line)] pt-4 text-sm"><span className="text-[var(--sp-ink-secondary)]">{copy.total}</span><strong className="text-base tabular-nums text-[var(--sp-brand)]">{formatMoney(order.total, language, order.currency || 'UZS')}</strong></div> : null}
              <p className="mt-4 flex items-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] px-3 py-2.5 text-xs text-[var(--sp-ink-secondary)]"><PackageCheck className="size-4 text-[var(--sp-brand)]" />{copy.accepted}</p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
