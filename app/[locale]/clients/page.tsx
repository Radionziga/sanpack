'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ClientsSection } from '@/components/home/ClientsSection';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import { ClientPartner } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { Star, Quote } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export default function ClientsPage() {
  const { t, language } = useLanguage();
  const { company } = useSiteSettings();
  const copy = pageCopy[language].clients;
  const [clients, setClients] = useState<ClientPartner[]>([]);

  useEffect(() => {
    PublicRepository.getClients().then(setClients);
  }, []);

  const reviews = copy.reviews;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sp-canvas)]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <div>
            <h1 className="text-3xl font-bold text-[var(--sp-ink)]">
              {t('clients')} {company.name}
            </h1>
            <p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">
              {copy.intro}
            </p>
          </div>

          <ClientsSection clients={clients} />

          {/* Testimonials */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[var(--sp-ink)]">{copy.reviewsTitle}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map(([name, author, text]) => (
                <div key={name} className="sp-card relative space-y-4 p-6">
                  <Quote className="absolute right-4 top-4 size-8 text-[color-mix(in_srgb,var(--sp-brand)_20%,transparent)]" />
                  <div className="flex items-center gap-1 text-[var(--sp-warning)]">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--sp-ink)] italic">
                    &ldquo;{text}&rdquo;
                  </p>
                  <div className="border-t border-[var(--sp-line)] pt-3">
                    <p className="text-xs font-bold text-[var(--sp-brand)]">{name}</p>
                    <p className="text-[10px] text-[var(--sp-ink-muted)]">{author}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
