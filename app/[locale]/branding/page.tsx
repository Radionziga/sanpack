'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { Printer, Check, ArrowRight, ShieldCheck } from 'lucide-react';

export default function BrandingPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          {/* Hero */}
          <div className="bg-gradient-to-r from-[#004F2B] to-[#006F3C] text-white rounded-3xl p-8 md:p-12 shadow-xl">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-bold">
                <Printer className="w-4 h-4" />
                <span>Брендирование упаковки и печать логотипа</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {t('branding')} SANPACK
              </h1>
              <p className="text-sm text-slate-200 leading-relaxed">
                Разработаем и произведём фирменную упаковку с логотипом вашего бренда: от пакетов «Майка» до крафт-пакетов, коробок и ресторанной полиграфии.
              </p>
            </div>
          </div>

          {/* Services list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAF5EF] text-[#006F3C] font-bold flex items-center justify-center">
                01
              </div>
              <h3 className="text-base font-bold text-[#18231E]">Пакеты «Майка» с логотипом</h3>
              <p className="text-xs text-[#68736D]">
                Флексопечать до 4 цветов. Различная плотность (от 15 до 45 мкм) и размеры.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAF5EF] text-[#006F3C] font-bold flex items-center justify-center">
                02
              </div>
              <h3 className="text-base font-bold text-[#18231E]">Крафт-пакеты с закрученными ручками</h3>
              <p className="text-xs text-[#68736D]">
                Экологичная упаковка для ресторанов, бургерных и бутиков с шелкографией.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EAF5EF] text-[#006F3C] font-bold flex items-center justify-center">
                03
              </div>
              <h3 className="text-base font-bold text-[#18231E]">Этикетки и стикеры контроля вскрытия</h3>
              <p className="text-xs text-[#68736D]">
                Наклейки для защиты курьерской доставки от несанкционированного вскрытия.
              </p>
            </div>
          </div>

          {/* CTA Box */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4">
            <h2 className="text-xl font-bold text-[#18231E]">Хотите заказать расчет макета и тиража?</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Оставьте заявку, и дизайнер SANPACK бесплатно подготовит визуализацию вашего логотипа на упаковке.
            </p>
            <Link
              href="/request"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#008348] text-white font-bold rounded-xl text-xs shadow-md"
            >
              <span>Запросить расчёт брендирования</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
