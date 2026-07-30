'use client';

import React from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { Factory, Check } from 'lucide-react';

export default function AboutPage() {
  const { t, language } = useLanguage();
  const copy = pageCopy[language].about;

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
                <span>{copy.eyebrow}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">{t('about')} SANPACK</h1>
              <p className="text-sm text-slate-100 leading-relaxed">
                {copy.intro}
              </p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[#0F6E43]">500+</span>
              <p className="text-xs text-slate-600 font-semibold">{copy.metrics[0]}</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[#0F6E43]">
                {language === 'ru' ? '2 500 м²' : '2 500 m²'}
              </span>
              <p className="text-xs text-slate-600 font-semibold">{copy.metrics[1]}</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[#0F6E43]">100%</span>
              <p className="text-xs text-slate-600 font-semibold">{copy.metrics[2]}</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-xs text-center space-y-2">
              <span className="text-3xl sm:text-4xl font-bold text-[#0F6E43]">24/7</span>
              <p className="text-xs text-slate-600 font-semibold">{copy.metrics[3]}</p>
            </div>
          </div>

          {/* Detailed Content Block */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-xl p-8 border border-slate-200 shadow-xs">
            <div className="space-y-4 text-xs sm:text-sm text-[#1E293B] leading-relaxed">
              <h2 className="text-2xl font-bold text-[#1E293B]">
                {copy.missionTitle}
              </h2>
              <p>
                {copy.mission}
              </p>
              <ul className="space-y-2 pt-2">
                {copy.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 font-semibold text-[#0F6E43]">
                    <Check className="w-4 h-4 shrink-0" /> {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative h-80 rounded-lg overflow-hidden border border-slate-200">
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
