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
import { useSiteSettings } from '@/context/SiteSettingsContext';

export function HeroBanner() {
  const { t, fixText, language } = useLanguage();
  const { company } = useSiteSettings();
  const copy = {
    ru: {
      eyebrow: 'Собственное производство и прямые поставки в Узбекистане',
      bullets: ['Оптовые цены от завода', 'Доставка по Ташкенту', 'Брендирование под ключ'],
      catalogCaption: 'Упаковка, перчатки, плёнки и продукты',
      quality: 'Сертифицированное качество',
      standard: 'Соответствие стандартам HoReCa',
    },
    uz: {
      eyebrow: 'O‘z ishlab chiqarishimiz va O‘zbekiston bo‘ylab to‘g‘ridan-to‘g‘ri yetkazib berish',
      bullets: ['Zavoddan ulgurji narxlar', 'Toshkent bo‘ylab yetkazib berish', 'Tayyor brendlash xizmati'],
      catalogCaption: 'Qadoqlash, qo‘lqoplar, plyonkalar va mahsulotlar',
      quality: 'Sertifikatlangan sifat',
      standard: 'HoReCa standartlariga muvofiq',
    },
    en: {
      eyebrow: 'In-house production and direct supply across Uzbekistan',
      bullets: ['Factory-direct wholesale prices', 'Delivery throughout Tashkent', 'Turnkey branding'],
      catalogCaption: 'Packaging, gloves, films and food products',
      quality: 'Certified quality',
      standard: 'Compliant with HoReCa standards',
    },
    zh: {
      eyebrow: '乌兹别克斯坦本地生产与直接供应',
      bullets: ['工厂批发价', '塔什干市内配送', '一站式品牌定制'],
      catalogCaption: '包装、手套、薄膜和食品',
      quality: '认证品质',
      standard: '符合 HoReCa 标准',
    },
  }[language];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--sp-brand-deep)] via-[var(--sp-brand)] to-[var(--sp-brand-deep)] py-12 text-[var(--sp-on-brand-deep)] md:py-16">
      {/* Background Subtle Accent Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-on-brand-deep)_10%,transparent)] bg-[color-mix(in_srgb,var(--sp-on-brand-deep)_10%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--sp-accent)] backdrop-blur-md">
              <BuildingOffice2Icon className="w-4 h-4 text-[var(--sp-accent)]" />
              <span>{fixText(copy.eyebrow)}</span>
            </div>

            <h1 className="font-extended text-3xl font-bold leading-[1.15] tracking-tight text-[var(--sp-on-brand-deep)] sm:text-4xl md:text-5xl">
              {t('heroTitle')}
            </h1>

            <p className="max-w-xl text-sm font-normal leading-relaxed text-[var(--sp-on-brand-deep)] opacity-85 sm:text-base">
              {t('heroSub')}
            </p>

            {/* Micro Advantages Bullet Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2 font-medium text-[var(--sp-on-brand-deep)] opacity-80">
                <CheckCircleIcon className="w-4 h-4 text-[var(--sp-accent)] shrink-0" />
                <span>{fixText(copy.bullets[0])}</span>
              </div>
              <div className="flex items-center gap-2 font-medium text-[var(--sp-on-brand-deep)] opacity-80">
                <CheckCircleIcon className="w-4 h-4 text-[var(--sp-accent)] shrink-0" />
                <span>{fixText(copy.bullets[1])}</span>
              </div>
              <div className="flex items-center gap-2 font-medium text-[var(--sp-on-brand-deep)] opacity-80">
                <CheckCircleIcon className="w-4 h-4 text-[var(--sp-accent)] shrink-0" />
                <span>{fixText(copy.bullets[2])}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                href="/catalog"
                className="group flex items-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-accent)] px-5 py-3 text-xs font-bold text-[var(--sp-on-accent)] shadow-sm transition-all hover:opacity-90 active:scale-95"
              >
                <span>{t('heroBtnCatalog')}</span>
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/request"
                className="rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-on-brand-deep)_20%,transparent)] bg-[color-mix(in_srgb,var(--sp-on-brand-deep)_10%,transparent)] px-5 py-3 text-xs font-semibold text-[var(--sp-on-brand-deep)] backdrop-blur-md transition-all hover:bg-[color-mix(in_srgb,var(--sp-on-brand-deep)_18%,transparent)]"
              >
                {t('heroBtnQuote')}
              </Link>
            </div>
          </div>

          {/* Right Showcase Composite Box */}
          <div className="lg:col-span-5 relative">
            <div className="relative space-y-3 overflow-hidden rounded-[var(--sp-radius)] border border-[color-mix(in_srgb,var(--sp-on-brand-deep)_15%,transparent)] bg-[color-mix(in_srgb,var(--sp-on-brand-deep)_5%,transparent)] p-5 shadow-xl backdrop-blur-md">
              <div className="group relative aspect-4/3 overflow-hidden rounded-[var(--sp-radius-control)] bg-[var(--sp-surface)] p-3 shadow-inner">
                <Image
                  src="/catalog/page_1.webp"
                  alt={`${company.name} Packaging & HoReCa`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover rounded-[calc(var(--sp-radius-control)-2px)] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
                  <span className="text-[11px] font-semibold text-[var(--sp-accent)]">{company.name} HoReCa Line</span>
                  <span className="text-sm sm:text-base font-bold tracking-tight">
                    {fixText(copy.catalogCaption)}
                  </span>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="flex items-center justify-between rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-on-brand-deep)_10%,transparent)] bg-[color-mix(in_srgb,var(--sp-on-brand-deep)_10%,transparent)] p-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheckIcon className="w-5 h-5 text-[var(--sp-accent)]" />
                  <div>
                    <p className="font-bold text-[var(--sp-on-brand-deep)]">{fixText(copy.quality)}</p>
                    <p className="text-[11px] text-[var(--sp-on-brand-deep)] opacity-70">{fixText(copy.standard)}</p>
                  </div>
                </div>
                <TruckIcon className="w-5 h-5 text-[var(--sp-accent)] shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
