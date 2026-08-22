'use client';

import React from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { Factory, Check } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export default function AboutPage() {
  const { t, language } = useLanguage();
  const { company } = useSiteSettings();
  const copy = pageCopy[language].about;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sp-surface-inset)]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          {/* Hero Header */}
          <div className="bg-[var(--sp-brand-deep)] text-white rounded-[var(--sp-radius)] p-8 md:p-12 shadow-lg relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--sp-radius-control)] bg-white/10 text-[var(--sp-accent)] text-xs font-semibold">
                <Factory className="w-4 h-4" />
                <span>{copy.eyebrow}</span>
              </div>
              <h1 className="font-extended text-3xl sm:text-4xl font-bold">{t('about')} {company.name}</h1>
              <p className="text-sm text-white/85 leading-relaxed">
                {copy.intro}
              </p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[var(--sp-surface)] rounded-[var(--sp-radius)] p-6 border border-[var(--sp-line)] shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[var(--sp-brand)]">500+</span>
              <p className="text-xs text-[var(--sp-ink-secondary)] font-semibold">{copy.metrics[0]}</p>
            </div>
            <div className="bg-[var(--sp-surface)] rounded-[var(--sp-radius)] p-6 border border-[var(--sp-line)] shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[var(--sp-brand)]">
                {language === 'ru' ? '2 500 м²' : '2 500 m²'}
              </span>
              <p className="text-xs text-[var(--sp-ink-secondary)] font-semibold">{copy.metrics[1]}</p>
            </div>
            <div className="bg-[var(--sp-surface)] rounded-[var(--sp-radius)] p-6 border border-[var(--sp-line)] shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[var(--sp-brand)]">100%</span>
              <p className="text-xs text-[var(--sp-ink-secondary)] font-semibold">{copy.metrics[2]}</p>
            </div>
            <div className="bg-[var(--sp-surface)] rounded-[var(--sp-radius)] p-6 border border-[var(--sp-line)] shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[var(--sp-brand)]">24/7</span>
              <p className="text-xs text-[var(--sp-ink-secondary)] font-semibold">{copy.metrics[3]}</p>
            </div>
          </div>

          {/* Detailed Content Block */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-[var(--sp-surface)] rounded-[var(--sp-radius)] p-8 border border-[var(--sp-line)] shadow-xs">
            <div className="space-y-4 text-xs sm:text-sm text-[var(--sp-ink)] leading-relaxed">
              <h2 className="font-extended text-2xl font-bold text-[var(--sp-ink)]">
                {copy.missionTitle}
              </h2>
              <p className="text-[var(--sp-ink-secondary)]">
                {copy.mission}
              </p>
              <ul className="space-y-2 pt-2">
                {copy.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 font-semibold text-[var(--sp-brand)]">
                    <Check className="w-4 h-4 shrink-0" /> {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative h-80 rounded-[var(--sp-radius)] overflow-hidden border border-[var(--sp-line)]">
              <Image
                src="/catalog/page_1.png"
                alt={copy.imageAlt}
                fill
                sizes="(min-width: 1024px) 50vw, 90vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
