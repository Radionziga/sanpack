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
    <div className="min-h-screen flex flex-col bg-[var(--sp-canvas)]">
      <Header />
      <main className="flex-1 py-12 max-w-4xl mx-auto px-4 w-full">
        <div className="sp-card space-y-4 p-6 text-xs leading-relaxed text-[var(--sp-ink-secondary)] sm:p-8">
          <h1 className="text-2xl font-bold mb-4">{copy.title}</h1>
          <p>{copy.intro}</p>
          {copy.sections.map(([title, text]) => (
            <React.Fragment key={title}>
              <h3 className="text-sm font-bold text-[var(--sp-brand)]">{title}</h3>
              <p>{text}</p>
            </React.Fragment>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
