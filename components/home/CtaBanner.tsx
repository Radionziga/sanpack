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
    <section className="py-16 bg-[var(--sp-brand-deep)] text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-gradient-to-r from-[var(--sp-brand-deep)] to-[var(--sp-brand)] rounded-[var(--sp-radius)] p-8 md:p-10 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8 border border-white/10">
          <div className="space-y-3 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--sp-radius-control)] bg-white/10 text-[var(--sp-accent)] text-xs font-semibold">
              <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-[var(--sp-accent)]" />
              <span>{copy[0]}</span>
            </div>

            <h2 className="font-extended text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {t('ctaTitle')}
            </h2>

            <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-normal">
              {t('ctaDesc')}
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/request"
              className="px-6 py-3.5 bg-[var(--sp-accent)] text-[var(--sp-brand-deep)] hover:bg-white font-bold text-xs rounded-[var(--sp-radius-control)] shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <span>{t('ctaBtn')}</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>

            {contacts.telegram ? <a
              href={contacts.telegram}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-[var(--sp-radius-control)] border border-white/20 transition-all backdrop-blur-sm"
            >
              {copy[1]}
            </a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
