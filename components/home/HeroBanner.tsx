'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import {
  ShieldCheckIcon,
  TruckIcon,
  BuildingOffice2Icon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export function HeroBanner() {
  const { t, fixText } = useLanguage();

  return (
    <section className="relative bg-gradient-to-br from-[#0A4B2E] via-[#0F6E43] to-[#1C2C24] text-white overflow-hidden py-12 md:py-16">
      {/* Background Subtle Accent Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 backdrop-blur-md text-[#DCE9AF] text-xs font-semibold border border-white/10">
              <BuildingOffice2Icon className="w-4 h-4 text-[#DCE9AF]" />
              <span>{fixText('Собственное производство и прямые поставки в Узбекистане')}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.15] text-white tracking-tight">
              {t('heroTitle')}
            </h1>

            <p className="text-sm sm:text-base text-slate-100 leading-relaxed max-w-xl font-normal">
              {t('heroSub')}
            </p>

            {/* Micro Advantages Bullet Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <CheckCircleIcon className="w-4 h-4 text-[#DCE9AF] shrink-0" />
                <span>{fixText('Оптовые цены от завода')}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <CheckCircleIcon className="w-4 h-4 text-[#DCE9AF] shrink-0" />
                <span>{fixText('Доставка по Ташкенту')}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <CheckCircleIcon className="w-4 h-4 text-[#DCE9AF] shrink-0" />
                <span>{fixText('Брендирование под ключ')}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/catalog"
                className="px-5 py-3 bg-[#DCE9AF] hover:bg-white text-[#0F6E43] font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2 group active:scale-95"
              >
                <span>{t('heroBtnCatalog')}</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/request"
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs rounded-lg transition-all backdrop-blur-md"
              >
                {t('heroBtnQuote')}
              </Link>
            </div>
          </div>

          {/* Right Showcase Composite Box */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-md p-5 shadow-xl space-y-3">
              <div className="aspect-4/3 rounded-lg bg-white p-3 shadow-inner relative overflow-hidden group">
                <Image
                  src="/catalog/page_1.png"
                  alt="SANPACK Packaging & HoReCa"
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover rounded-md group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
                  <span className="text-[11px] font-semibold text-[#DCE9AF]">SANPACK HoReCa Line</span>
                  <span className="text-sm sm:text-base font-bold tracking-tight">
                    {fixText('Упаковка, перчатки, плёнки и продукты')}
                  </span>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="flex items-center justify-between bg-white/10 p-3 rounded-lg border border-white/10 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheckIcon className="w-5 h-5 text-[#DCE9AF]" />
                  <div>
                    <p className="font-bold text-white">{fixText('Сертифицированное качество')}</p>
                    <p className="text-[11px] text-slate-300">{fixText('Соответствие ГОСТ и стандартам HoReCa')}</p>
                  </div>
                </div>
                <TruckIcon className="w-5 h-5 text-[#DCE9AF] shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
