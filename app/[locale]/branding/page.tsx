'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { Printer, ArrowRight } from 'lucide-react';

export default function BrandingPage() {
  const { t, language } = useLanguage();
  const copy = pageCopy[language].branding;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sp-surface-inset)]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          {/* Hero */}
          <div className="bg-gradient-to-r from-[var(--sp-brand-deep)] to-[var(--sp-brand)] text-white rounded-[var(--sp-radius)] p-8 md:p-12 shadow-xl">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--sp-radius-control)] bg-white/10 text-[var(--sp-accent)] text-xs font-bold">
                <Printer className="w-4 h-4" />
                <span>{copy.eyebrow}</span>
              </div>
              <h1 className="font-extended text-3xl sm:text-4xl font-bold">
                {t('branding')} SANPACK
              </h1>
              <p className="text-sm text-white/85 leading-relaxed">
                {copy.intro}
              </p>
            </div>
          </div>

          {/* Services list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {copy.services.map(([title, description], index) => (
              <div key={title} className="bg-[var(--sp-surface)] rounded-[var(--sp-radius)] p-6 border border-[var(--sp-line)] shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-[var(--sp-radius-control)] bg-[color-mix(in_srgb,var(--sp-brand)_10%,var(--sp-surface))] text-[var(--sp-brand)] font-bold flex items-center justify-center">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="font-extended text-base font-bold text-[var(--sp-ink)]">{title}</h3>
                <p className="text-xs text-[var(--sp-ink-secondary)]">{description}</p>
              </div>
            ))}
          </div>

          {/* CTA Box */}
          <div className="bg-[var(--sp-surface)] rounded-[var(--sp-radius)] p-8 border border-[var(--sp-line)] text-center space-y-4">
            <h2 className="font-extended text-xl font-bold text-[var(--sp-ink)]">{copy.ctaTitle}</h2>
            <p className="text-xs text-[var(--sp-ink-secondary)] max-w-md mx-auto">
              {copy.ctaText}
            </p>
            <Link
              href="/request"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[var(--sp-brand)] hover:bg-[var(--sp-brand-deep)] text-[var(--sp-on-brand)] font-bold rounded-[var(--sp-radius-control)] text-xs shadow-md transition-all active:scale-95"
            >
              <span>{copy.ctaButton}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
