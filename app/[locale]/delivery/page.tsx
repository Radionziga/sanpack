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
    <div className="min-h-screen flex flex-col bg-[var(--sp-canvas)]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <div>
            <h1 className="text-3xl font-bold text-[var(--sp-ink)]">{t('delivery')}</h1>
            <p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">
              {copy.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="sp-card space-y-3 p-6">
              <div className="flex size-12 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--sp-ink)]">{copy.cards[0][0]}</h3>
              <p className="text-xs leading-relaxed text-[var(--sp-ink-tertiary)]">
                {copy.cards[0][1]}
              </p>
            </div>

            <div className="sp-card space-y-3 p-6">
              <div className="flex size-12 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--sp-ink)]">{copy.cards[1][0]}</h3>
              <p className="text-xs leading-relaxed text-[var(--sp-ink-tertiary)]">
                {copy.cards[1][1]}
              </p>
            </div>

            <div className="sp-card space-y-3 p-6">
              <div className="flex size-12 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand-soft)] text-[var(--sp-brand)]">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--sp-ink)]">{copy.cards[2][0]}</h3>
              <p className="text-xs leading-relaxed text-[var(--sp-ink-tertiary)]">
                {copy.cards[2][1]}
              </p>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="sp-card space-y-4 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[var(--sp-ink)]">{copy.paymentTitle}</h2>
            <div className="grid grid-cols-1 gap-4 text-xs text-[var(--sp-ink-secondary)] md:grid-cols-2">
              <div className="flex items-start gap-3 rounded-[var(--sp-radius-control-inner)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
                <CreditCard className="mt-0.5 size-5 shrink-0 text-[var(--sp-brand)]" />
                <div>
                  <h4 className="mb-1 font-bold text-[var(--sp-ink)]">{copy.payments[0][0]}</h4>
                  <p>{copy.payments[0][1]}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-[var(--sp-radius-control-inner)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--sp-brand)]" />
                <div>
                  <h4 className="mb-1 font-bold text-[var(--sp-ink)]">{copy.payments[1][0]}</h4>
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
