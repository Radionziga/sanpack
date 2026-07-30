'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';

export default function TermsPage() {
  const { language } = useLanguage();
  const copy = pageCopy[language].terms;
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />
      <main className="flex-1 py-12 max-w-4xl mx-auto px-4 w-full">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 space-y-4 text-xs text-[#18231E] leading-relaxed">
          <h1 className="text-2xl font-bold mb-4">{copy.title}</h1>
          <p>{copy.intro}</p>
          {copy.sections.map(([title, text]) => (
            <React.Fragment key={title}>
              <h3 className="font-bold text-sm text-[#006F3C]">{title}</h3>
              <p>{text}</p>
            </React.Fragment>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
