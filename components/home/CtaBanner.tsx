'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { ChatBubbleLeftEllipsisIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export function CtaBanner() {
  const { t, language } = useLanguage();
  const { company, contacts } = useSiteSettings();
  const copy = {
    ru: [`B2B-консультация ${company.name}`, 'Написать в Telegram'],
    uz: [`${company.name} B2B maslahati`, 'Telegram orqali yozish'],
    en: [`${company.name} B2B consultation`, 'Message us on Telegram'],
  }[language];

  return (
    <section className="bg-[var(--sp-brand-deep)] py-16 text-[var(--sp-on-brand-deep)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-8 rounded-[var(--sp-radius)] border border-[color-mix(in_srgb,var(--sp-on-brand-deep)_10%,transparent)] bg-gradient-to-r from-[var(--sp-brand-deep)] to-[var(--sp-brand)] p-8 shadow-xl md:p-10 lg:flex-row">
          <div className="space-y-3 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-[var(--sp-radius-control)] bg-[color-mix(in_srgb,var(--sp-on-brand-deep)_10%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--sp-accent)]">
              <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-[var(--sp-accent)]" />
              <span>{copy[0]}</span>
            </div>

            <h2 className="font-extended text-2xl font-bold tracking-tight text-[var(--sp-on-brand-deep)] sm:text-3xl">
              {t('ctaTitle')}
            </h2>

            <p className="text-xs font-normal leading-relaxed text-[var(--sp-on-brand-deep)] opacity-85 sm:text-sm">
              {t('ctaDesc')}
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/request"
              className="flex items-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-accent)] px-6 py-3.5 text-xs font-bold text-[var(--sp-on-accent)] shadow-md transition-all hover:opacity-90 active:scale-95"
            >
              <span>{t('ctaBtn')}</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>

            {contacts.telegram ? <a
              href={contacts.telegram}
              target="_blank"
              rel="noreferrer"
              className="rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-on-brand-deep)_20%,transparent)] bg-[color-mix(in_srgb,var(--sp-on-brand-deep)_10%,transparent)] px-5 py-3.5 text-xs font-semibold text-[var(--sp-on-brand-deep)] backdrop-blur-sm transition-all hover:bg-[color-mix(in_srgb,var(--sp-on-brand-deep)_18%,transparent)]"
            >
              {copy[1]}
            </a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
