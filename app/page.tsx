import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  Check,
  Clock3,
  Download,
  Factory,
  Mail,
  MapPin,
  Palette,
  Phone,
  Truck,
} from 'lucide-react';
import { SanpackLogo } from '@/components/ui/SanpackLogo';

const catalogPdfUrl = process.env.NEXT_PUBLIC_CATALOG_PDF_URL;

export const metadata: Metadata = {
  title: 'SANPACK — сайт обновляется',
  description:
    'Мы готовим новую версию сайта SANPACK. Рабочий каталог упаковки, расходных материалов и продуктов для HoReCa уже доступен.',
  robots: {
    index: false,
    follow: false,
  },
};

const advantages = [
  {
    icon: Factory,
    title: 'Прямые поставки',
    description: 'Оптовые условия для бизнеса',
  },
  {
    icon: Truck,
    title: 'Доставка по Ташкенту',
    description: 'Согласуем удобное время',
  },
  {
    icon: Palette,
    title: 'Брендирование',
    description: 'Упаковка с вашим логотипом',
  },
];

export default function ComingSoonPage() {
  return (
    <main className="min-h-svh bg-[#F4F7F5] text-[#18231E]">
      <div className="bg-[#18231E] text-white">
        <div className="mx-auto flex min-h-9 max-w-7xl items-center justify-between gap-4 px-4 py-2 text-[11px] sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/70">
            <MapPin className="h-3.5 w-3.5 text-[#DCE9AF]" aria-hidden="true" />
            <span className="hidden sm:inline">Ташкент, ул. Янги Сергели, 14А</span>
            <span className="sm:hidden">Ташкент</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 text-white/70 md:flex">
              <Clock3 className="h-3.5 w-3.5 text-[#DCE9AF]" aria-hidden="true" />
              Пн — сб: 09:00–18:00
            </span>
            <a
              href="tel:+998998510506"
              className="font-semibold text-white transition-colors hover:text-[#DCE9AF] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#DCE9AF]"
            >
              +998 99 851 05 06
            </a>
          </div>
        </div>
      </div>

      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/ru"
            aria-label="Перейти на главную SANPACK"
            className="rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F6E43]"
          >
            <SanpackLogo variant="green" className="h-6 sm:h-7" />
          </Link>

          <div className="flex items-center gap-3">
            <nav
              aria-label="Выбор языка"
              className="flex h-10 items-center rounded-lg bg-[#F2F7F4] p-1 text-xs font-bold"
            >
              <Link
                href="/ru"
                className="flex h-full min-w-9 items-center justify-center rounded-md bg-white px-2 text-[#0F6E43] shadow-sm focus-visible:outline-2 focus-visible:outline-[#0F6E43]"
              >
                RU
              </Link>
              <Link
                href="/uz"
                className="flex h-full min-w-9 items-center justify-center rounded-md px-2 text-slate-500 transition-colors hover:text-[#0F6E43] focus-visible:outline-2 focus-visible:outline-[#0F6E43]"
              >
                UZ
              </Link>
              <Link
                href="/en"
                className="flex h-full min-w-9 items-center justify-center rounded-md px-2 text-slate-500 transition-colors hover:text-[#0F6E43] focus-visible:outline-2 focus-visible:outline-[#0F6E43]"
              >
                EN
              </Link>
            </nav>

            <Link
              href="/ru"
              className="hidden h-10 items-center gap-2 rounded-lg bg-[#0F6E43] px-4 text-xs font-bold text-white transition-colors hover:bg-[#0B5735] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6E43] sm:flex"
            >
              Открыть сайт
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-[#0F6E43] text-white shadow-[0_22px_55px_-32px_rgba(15,110,67,0.75)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            aria-hidden="true"
            style={{
              backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          <div className="relative grid min-h-[500px] lg:grid-cols-12">
            <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:col-span-7 lg:px-14 lg:py-16">
              <div className="mb-7 flex items-center gap-3 text-sm font-medium text-white/80">
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DCE9AF] opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#DCE9AF]" />
                </span>
                Финальная версия готовится
              </div>

              <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.06] tracking-[-0.035em] sm:text-5xl lg:text-[3.75rem]">
                Новый сайт SANPACK уже можно посмотреть
              </h1>

              <p className="mt-6 max-w-[62ch] text-pretty text-base leading-7 text-white/78 sm:text-lg">
                Мы ещё наполняем каталог и настраиваем детали. Основные разделы уже
                работают — переходите на сайт или сразу смотрите ассортимент.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/ru"
                  className="group flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#DCE9AF] px-6 text-sm font-bold text-[#0B5735] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Перейти на сайт
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href="/ru/catalog"
                  className="flex min-h-12 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Смотреть каталог
                </Link>
              </div>

              {catalogPdfUrl ? (
                <a
                  href={catalogPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#DCE9AF] underline decoration-[#DCE9AF]/40 underline-offset-4 transition-colors hover:text-white hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Получить каталог PDF
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  title="Ссылка появится после загрузки PDF-каталога в Firebase Storage"
                  className="mt-4 inline-flex w-fit cursor-not-allowed items-center gap-2 text-sm font-semibold text-white/45"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Получить каталог PDF
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/60">
                    скоро
                  </span>
                </span>
              )}

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-white/75">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#DCE9AF]" aria-hidden="true" />
                  Упаковка для HoReCa
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#DCE9AF]" aria-hidden="true" />
                  Оптовые поставки
                </span>
              </div>
            </div>

            <div className="relative hidden min-h-[500px] items-center justify-center overflow-hidden bg-[#0B5735] p-10 lg:col-span-5 lg:flex">
              <div
                className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#DCE9AF]/15"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-16 -left-16 h-52 w-52 rounded-full border-[42px] border-white/5"
                aria-hidden="true"
              />

              <div className="relative w-[72%] max-w-[320px] rotate-[3deg] transition-transform duration-500 hover:rotate-0">
                <div className="absolute -inset-3 translate-y-5 rounded-2xl bg-[#072F1D]/35 blur-xl" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-xl bg-white p-2 shadow-[0_24px_45px_-18px_rgba(0,0,0,0.55)]">
                  <Image
                    src="/catalog/page_1.png"
                    alt="Обложка каталога продукции SANPACK"
                    width={1333}
                    height={1884}
                    priority
                    sizes="(min-width: 1024px) 320px, 0px"
                    className="h-auto w-full rounded-lg"
                  />
                </div>
                <div className="absolute -left-16 bottom-12 flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-[#18231E] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.55)]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF5EF] text-[#0F6E43]">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[10px] font-medium text-slate-500">
                      Каталог
                    </span>
                    <span className="block text-xs font-bold">уже доступен</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Преимущества SANPACK" className="px-4 pb-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl divide-y divide-slate-200 rounded-2xl bg-white px-6 shadow-[0_12px_35px_-30px_rgba(24,35,30,0.45)] sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-0">
          {advantages.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-center gap-4 py-5 sm:px-6 lg:px-8">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF5EF] text-[#0F6E43]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#18231E]">{title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} SANPACK</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <a
              href="tel:+998992323999"
              className="flex items-center gap-2 transition-colors hover:text-[#0F6E43] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F6E43]"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              +998 99 232 39 99
            </a>
            <a
              href="mailto:info@sanpack.uz"
              className="flex items-center gap-2 transition-colors hover:text-[#0F6E43] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F6E43]"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              info@sanpack.uz
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
