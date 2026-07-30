'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { Truck, CreditCard, Clock, MapPin, CheckCircle2 } from 'lucide-react';

export default function DeliveryPage() {
  const { t, language } = useLanguage();
  const copy = pageCopy[language].delivery;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <div>
            <h1 className="text-3xl font-bold text-[#18231E]">{t('delivery')}</h1>
            <p className="text-xs text-[#68736D] mt-1">
              {copy.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#18231E]">{copy.cards[0][0]}</h3>
              <p className="text-xs text-[#68736D] leading-relaxed">
                {copy.cards[0][1]}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#18231E]">{copy.cards[1][0]}</h3>
              <p className="text-xs text-[#68736D] leading-relaxed">
                {copy.cards[1][1]}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#EAF5EF] text-[#006F3C] flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#18231E]">{copy.cards[2][0]}</h3>
              <p className="text-xs text-[#68736D] leading-relaxed">
                {copy.cards[2][1]}
              </p>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 space-y-4">
            <h2 className="text-xl font-bold text-[#18231E]">{copy.paymentTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#18231E] mb-1">{copy.payments[0][0]}</h4>
                  <p>{copy.payments[0][1]}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#18231E] mb-1">{copy.payments[1][0]}</h4>
                  <p>{copy.payments[1][1]}</p>
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
