'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { Truck, CreditCard, Clock, MapPin, CheckCircle2 } from 'lucide-react';

export default function DeliveryPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <div>
            <h1 className="text-3xl font-bold text-[#18231E]">{t('delivery')}</h1>
            <p className="text-xs text-[#68736D] mt-1">
              Прозрачные и оперативные условия отгрузки по всему Узбекистану
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#18231E]">Курьер по Ташкенту</h3>
              <p className="text-xs text-[#68736D] leading-relaxed">
                Бесплатная доставка при сумме заказа от 2 000 000 сум. При заказе до 12:00 отгрузка осуществляется в тот же день.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#18231E]">Регионы Узбекистана</h3>
              <p className="text-xs text-[#68736D] leading-relaxed">
                Отправка через проверенные логистические службы (BTS, FARGO) в Самарканд, Наманган, Андижан, Бухару, Карши, Нукус.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#18231E]">Самовывоз со склада</h3>
              <p className="text-xs text-[#68736D] leading-relaxed">
                г. Ташкент, Сергелийский р-н, ул. Янги Сергели, 14А. Время работы склада: Пн — Сб с 09:00 до 18:00.
              </p>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 space-y-4">
            <h2 className="text-xl font-bold text-[#18231E]">Формы оплаты для юридических лиц</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#18231E] mb-1">Безналичный расчёт (Счёт-фактура)</h4>
                  <p>Полный пакет бухгалтерских документов в электронном виде (E-faktura). НДС включен.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#18231E] mb-1">Оплата картами Uzcard / Humo / Корпоративная</h4>
                  <p>Оплата при получении курьеру или через выставленный QR-счёт.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
