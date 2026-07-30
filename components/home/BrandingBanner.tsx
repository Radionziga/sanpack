'use client';

import React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { PrinterIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export function BrandingBanner() {
  const { t, fixText, language } = useLanguage();
  const copy = {
    ru: {
      eyebrow: 'Фирменная полиграфия и брендирование SANPACK',
      items: ['Пакеты с цветным логотипом', 'Крафт-пакеты и пищевая упаковка', 'Этикетки, стикеры и меню для ресторанов', 'Брендирование транспорта и экстерьера'],
      action: 'Узнать больше о брендировании',
    },
    uz: {
      eyebrow: 'SANPACK brend poligrafiyasi va qadoqlash',
      items: ['Rangli logotipli paketlar', 'Kraft paketlar va oziq-ovqat qadoqlari', 'Restoranlar uchun yorliq, stiker va menyular', 'Transport va tashqi ko‘rinishni brendlash'],
      action: 'Brendlash haqida batafsil',
    },
    en: {
      eyebrow: 'SANPACK branded print and packaging',
      items: ['Bags with a full-color logo', 'Kraft bags and food packaging', 'Restaurant labels, stickers and menus', 'Vehicle and exterior branding'],
      action: 'Learn more about branding',
    },
  }[language];

  return (
    <section className="py-14 bg-[#F2F7F4] border-y border-[#0F6E43]/15">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0F6E43] text-white text-xs font-semibold">
              <PrinterIcon className="w-4 h-4" />
              <span>{fixText(copy.eyebrow)}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#222B35] tracking-tight">
              {t('brandingSectionTitle')}
            </h2>

            <p className="text-xs sm:text-sm text-[#5C6A75] leading-relaxed">
              {t('brandingSectionDesc')}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-[#222B35] pt-1">
              {copy.items.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckIcon className="w-4 h-4 text-[#0F6E43] shrink-0" />
                  <span>{fixText(item)}</span>
                </li>
              ))}
            </ul>

            <div className="pt-3">
              <Link
                href="/branding"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#0F6E43] hover:bg-[#0B5735] text-white font-bold text-xs rounded-lg shadow-2xs transition-all active:scale-95"
              >
                <span>{fixText(copy.action)}</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-lg bg-white p-2">
              <Image
                src="/catalog/extracted_p14_img1.jpeg"
                alt="SANPACK Branding & Polygraphy"
                width={800}
                height={480}
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="w-full h-60 object-contain rounded-lg bg-white"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
