'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { Factory, ShieldCheck, Award, Users, Package, Check } from 'lucide-react';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          {/* Hero Header */}
          <div className="bg-[#095030] text-white rounded-xl p-8 md:p-12 shadow-lg relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 text-[#DCE9AF] text-xs font-semibold">
                <Factory className="w-4 h-4" />
                <span>Производитель и импортер в Узбекистане</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">{t('about')} SANPACK</h1>
              <p className="text-sm text-slate-100 leading-relaxed">
                Надежный B2B-партнёр в сфере комплексного снабжения упаковочными материалами, одноразовыми расходниками, пищевой фольгой и специализированными товарами для сегментов HoReCa, ритейла и пищевой промышленности.
              </p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[#0F6E43]">500+</span>
              <p className="text-xs text-slate-600 font-semibold">Постоянных B2B-клиентов</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[#0F6E43]">2 500 м²</span>
              <p className="text-xs text-slate-600 font-semibold">Складских площадей в Ташкенте</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[#0F6E43]">100%</span>
              <p className="text-xs text-slate-600 font-semibold">Гарантия прочности швов и плотности</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[#0F6E43]">24/7</span>
              <p className="text-xs text-slate-600 font-semibold">Оперативная отгрузка и поддержка</p>
            </div>
          </div>

          {/* Detailed Content Block */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-xl p-8 border border-slate-200 shadow-xs">
            <div className="space-y-4 text-xs sm:text-sm text-[#1E293B] leading-relaxed">
              <h2 className="text-2xl font-bold text-[#1E293B]">
                Миссия SANPACK — бесперебойность вашего бизнеса
              </h2>
              <p>
                Мы осознаем, что даже небольшой сбой в поставках мусорных мешков, фольги или пищевых перчаток может заблокировать работу кухонь ресторанов или отельных сервисов. Поэтому компания SANPACK держит постоянный буферный запас готовой продукции на складах в Ташкенте.
              </p>
              <ul className="space-y-2 pt-2">
                <li className="flex items-center gap-2 font-semibold text-[#0F6E43]">
                  <Check className="w-4 h-4" /> Собственный парфюмированный и прочный полиэтиленовый цех
                </li>
                <li className="flex items-center gap-2 font-semibold text-[#0F6E43]">
                  <Check className="w-4 h-4" /> Использование экологичных и безотходных циклов
                </li>
                <li className="flex items-center gap-2 font-semibold text-[#0F6E43]">
                  <Check className="w-4 h-4" /> Полный пакет закрывающих документов и сертификатов
                </li>
              </ul>
            </div>

            <div className="rounded-lg overflow-hidden border border-slate-200">
              <img
                src="/catalog/page_1.png"
                alt="SANPACK Production Factory"
                className="w-full h-80 object-cover"
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
