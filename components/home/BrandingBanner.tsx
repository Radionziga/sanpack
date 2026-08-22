'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { PrinterIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export function BrandingBanner() {
  const { t, fixText, language } = useLanguage();
  const { company } = useSiteSettings();
  const copy = {
    ru: {
      eyebrow: `Фирменная полиграфия и брендирование ${company.name}`,
      items: ['Пакеты с цветным логотипом', 'Крафт-пакеты и пищевая упаковка', 'Этикетки, стикеры и меню для ресторанов', 'Брендирование транспорта и экстерьера'],
      action: 'Узнать больше о брендировании',
    },
    uz: {
      eyebrow: `${company.name} brend poligrafiyasi va qadoqlash`,
      items: ['Rangli logotipli paketlar', 'Kraft paketlar va oziq-ovqat qadoqlari', 'Restoranlar uchun yorliq, stiker va menyular', 'Transport va tashqi ko‘rinishni brendlash'],
      action: 'Brendlash haqida batafsil',
    },
    en: {
      eyebrow: `${company.name} branded print and packaging`,
      items: ['Bags with a full-color logo', 'Kraft bags and food packaging', 'Restaurant labels, stickers and menus', 'Vehicle and exterior branding'],
      action: 'Learn more about branding',
    },
  }[language];

  return (
    <section className="py-14 bg-[color-mix(in_srgb,var(--sp-brand)_6%,var(--sp-surface))] border-y border-[color-mix(in_srgb,var(--sp-brand)_15%,transparent)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)] text-xs font-semibold">
              <PrinterIcon className="w-4 h-4" />
              <span>{fixText(copy.eyebrow)}</span>
            </div>

            <h2 className="font-extended text-2xl sm:text-3xl font-bold text-[var(--sp-ink)] tracking-tight">
              {t('brandingSectionTitle')}
            </h2>

            <p className="text-xs sm:text-sm text-[var(--sp-ink-secondary)] leading-relaxed">
              {t('brandingSectionDesc')}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[var(--sp-ink)] pt-1">
              {copy.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-[var(--sp-brand)] shrink-0" />
                  <span>{fixText(item)}</span>
                </li>
              ))}
            </ul>

            <div className="pt-3">
              <Link
                href="/branding"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--sp-brand)] hover:opacity-90 text-[var(--sp-on-brand)] font-bold text-xs rounded-[var(--sp-radius-control)] shadow-sm transition-all active:scale-95"
              >
                <span>{fixText(copy.action)}</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-[var(--sp-radius)] overflow-hidden border border-[var(--sp-line)] shadow-lg bg-[var(--sp-surface)] p-2">
              <Image
                src="/catalog/extracted_p14_img1.jpeg"
                alt={`${company.name} Branding & Polygraphy`}
                width={800}
                height={480}
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="w-full h-60 object-contain rounded-[calc(var(--sp-radius)-4px)] bg-[var(--sp-surface)]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
