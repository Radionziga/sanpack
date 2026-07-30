'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { ChatBubbleLeftEllipsisIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export function CtaBanner() {
  const { t } = useLanguage();

  return (
    <section className="py-16 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-gradient-to-r from-[#095030] to-[#0F6E43] rounded-xl p-8 md:p-10 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8 border border-white/10">
          <div className="space-y-3 max-w-2xl text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 text-[#DCE9AF] text-xs font-semibold">
              <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-[#DCE9AF]" />
              <span>B2B Консультация SANPACK</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {t('ctaTitle')}
            </h2>

            <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-normal">
              {t('ctaDesc')}
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/request"
              className="px-6 py-3.5 bg-[#DCE9AF] text-[#0F6E43] hover:bg-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-2 active:scale-95"
            >
              <span>{t('ctaBtn')}</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>

            <a
              href="https://t.me/sanpack_uz"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-lg border border-white/20 transition-all backdrop-blur-sm"
            >
              Написать в Telegram
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
