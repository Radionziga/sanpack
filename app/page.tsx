import Image from 'next/image';
import type { Metadata } from 'next';
import { ArrowUpRight, Clock3, Mail, Phone } from 'lucide-react';

export const metadata: Metadata = {
  title: 'SANPACK — сайт готовится к запуску',
  description:
    'Новый сайт SANPACK скоро откроется. Поставки упаковки, расходных материалов и продуктов для HoReCa.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ComingSoonPage() {
  return (
    <main className="relative min-h-svh overflow-hidden bg-[#082d20] text-white">
      <div
        className="absolute inset-0 opacity-[0.14]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, black, transparent 82%)',
        }}
      />
      <div
        className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#dce9af]/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-svh max-w-7xl flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/15 pb-6">
          <Image
            src="/logo-sanpack.svg"
            width={256}
            height={25}
            priority
            alt="SANPACK"
            className="h-6 w-auto brightness-0 invert sm:h-7"
          />
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-2 text-[11px] font-semibold tracking-wide text-white/75 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#dce9af]" />
            В разработке
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1fr_0.72fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#dce9af]">
              <Clock3 className="h-4 w-4" />
              Скоро открытие
            </div>
            <h1 className="max-w-3xl text-5xl font-bold leading-[0.98] tracking-[-0.045em] sm:text-7xl lg:text-[5.5rem]">
              Мы готовим новый сайт SANPACK
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
              Упаковка, расходные материалы, продукты и брендирование для
              ресторанов, кафе, гостиниц и бизнеса по всему Узбекистану.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-white/15 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#dce9af]">
              Мы продолжаем работать
            </p>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">
              Свяжитесь с отделом продаж
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/60">
              Пока каталог обновляется, менеджеры помогут подобрать товар и
              подготовят коммерческое предложение.
            </p>

            <div className="mt-8 space-y-3">
              <a
                href="tel:+998555006202"
                className="group flex items-center justify-between rounded-2xl bg-[#dce9af] px-5 py-4 font-bold text-[#082d20] transition-transform hover:-translate-y-0.5"
              >
                <span className="flex items-center gap-3">
                  <Phone className="h-4 w-4" />
                  +998 55 500 62 02
                </span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="mailto:info@sanpack.uz"
                className="flex items-center gap-3 rounded-2xl border border-white/15 px-5 py-4 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10"
              >
                <Mail className="h-4 w-4 text-[#dce9af]" />
                info@sanpack.uz
              </a>
            </div>
          </aside>
        </section>

        <footer className="flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} SANPACK</span>
          <span>Ташкент · Toshkent · Tashkent</span>
        </footer>
      </div>
    </main>
  );
}
