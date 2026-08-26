'use client';

import { useParams } from 'next/navigation';
import { Home, Search, ShoppingBag } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Link } from '@/i18n/navigation';
import type { Language } from '@/types';

const copy = {
  ru: {
    eyebrow: 'Ошибка 404',
    title: 'Такой страницы нет',
    description: 'Возможно, адрес изменился или в ссылке есть ошибка. Вернитесь на главную либо продолжите поиск в каталоге.',
    home: 'На главную',
    catalog: 'Перейти в каталог',
    hint: 'Нужен конкретный товар?',
    search: 'Открыть поиск',
  },
  uz: {
    eyebrow: '404 xatosi',
    title: 'Bu sahifa topilmadi',
    description: 'Manzil o‘zgargan yoki havolada xato bo‘lishi mumkin. Bosh sahifaga qayting yoki katalogdan qidirishni davom ettiring.',
    home: 'Bosh sahifaga',
    catalog: 'Katalogga o‘tish',
    hint: 'Muayyan mahsulot kerakmi?',
    search: 'Qidiruvni ochish',
  },
  en: {
    eyebrow: 'Error 404',
    title: 'This page could not be found',
    description: 'The address may have changed or the link may be incorrect. Return home or continue browsing the catalog.',
    home: 'Go home',
    catalog: 'Browse catalog',
    hint: 'Looking for a specific product?',
    search: 'Open search',
  },
  zh: {
    eyebrow: '404 错误',
    title: '未找到此页面',
    description: '页面地址可能已更改，或链接存在错误。您可以返回首页，也可以继续浏览商品目录。',
    home: '返回首页',
    catalog: '浏览商品目录',
    hint: '正在寻找某件商品？',
    search: '打开搜索',
  },
} as const;

function normalizeLocale(value: string | undefined): Language {
  return value === 'uz' || value === 'en' || value === 'zh' ? value : 'ru';
}

export default function StorefrontNotFound() {
  const params = useParams<{ locale?: string }>();
  const labels = copy[normalizeLocale(params.locale)];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-12 sm:py-20">
        <section className="relative w-full overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-6 py-12 sm:px-10 sm:py-16 lg:px-16">
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[var(--sp-brand-soft)] opacity-80" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full bg-[var(--sp-accent-soft)] opacity-70" aria-hidden="true" />

          <div className="relative max-w-2xl">
            <div className="inline-flex min-h-9 items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand-soft)] px-3 font-compact text-xs font-bold uppercase tracking-[0.1em] text-[var(--sp-brand)]">
              {labels.eyebrow}
            </div>
            <h1 className="mt-5 font-extended text-3xl font-bold tracking-[-0.035em] text-[var(--sp-ink)] sm:text-5xl">
              {labels.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--sp-ink-secondary)] sm:text-base sm:leading-7">
              {labels.description}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90">
                <Home className="size-4" aria-hidden="true" />
                {labels.home}
              </Link>
              <Link href="/catalog" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line-strong)] bg-[var(--sp-surface)] px-5 text-sm font-bold text-[var(--sp-ink)] transition-colors hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)]">
                <ShoppingBag className="size-4" aria-hidden="true" />
                {labels.catalog}
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[var(--sp-line)] pt-5 text-sm text-[var(--sp-ink-secondary)]">
              <span>{labels.hint}</span>
              <Link href="/search" className="inline-flex items-center gap-1.5 font-bold text-[var(--sp-brand)] hover:underline">
                <Search className="size-4" aria-hidden="true" />
                {labels.search}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
