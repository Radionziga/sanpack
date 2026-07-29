'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { SanpackLogo } from '@/components/ui/SanpackLogo';

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0F6E43] text-slate-100 text-xs border-t border-[#0B5735] pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Col 1: SANPACK Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <SanpackLogo variant="white" className="h-8" />
            </Link>
            <p className="text-slate-200 text-xs leading-relaxed max-w-sm">
              {t('footerDesc')}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://t.me/sanpack_uz"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-lg bg-[#0B5735] hover:bg-[#DCE9AF] hover:text-[#0F6E43] text-white flex items-center justify-center transition-colors"
                title="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Catalog Categories */}
          <div>
            <h4 className="text-sm font-bold text-[#DCE9AF] mb-4 uppercase tracking-wider border-b border-[#0B5735] pb-2 font-extended">
              {t('catalog')}
            </h4>
            <ul className="space-y-2 text-slate-200">
              <li>
                <Link href="/catalog/meshki-dlya-musora" className="hover:text-[#DCE9AF] transition-colors">
                  Мешки для мусора
                </Link>
              </li>
              <li>
                <Link href="/catalog/pakety-mayka" className="hover:text-[#DCE9AF] transition-colors">
                  Пакеты «Майка»
                </Link>
              </li>
              <li>
                <Link href="/catalog/perchatki" className="hover:text-[#DCE9AF] transition-colors">
                  Перчатки одноразовые
                </Link>
              </li>
              <li>
                <Link href="/catalog/folga-i-plenka" className="hover:text-[#DCE9AF] transition-colors">
                  Фольга и стрейч-пленка
                </Link>
              </li>
              <li>
                <Link href="/catalog/bakaleya" className="hover:text-[#DCE9AF] transition-colors">
                  Бакалея и рис
                </Link>
              </li>
              <li>
                <Link href="/catalog/branding-polygraphy" className="hover:text-[#DCE9AF] transition-colors">
                  Полиграфия и брендирование
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Info */}
          <div>
            <h4 className="text-sm font-bold text-[#DCE9AF] mb-4 uppercase tracking-wider border-b border-[#0B5735] pb-2 font-extended">
              {t('customerInfo')}
            </h4>
            <ul className="space-y-2 text-slate-200">
              <li>
                <Link href="/about" className="hover:text-[#DCE9AF] transition-colors">
                  {t('about')}
                </Link>
              </li>
              <li>
                <Link href="/clients" className="hover:text-[#DCE9AF] transition-colors">
                  {t('clients')}
                </Link>
              </li>
              <li>
                <Link href="/delivery" className="hover:text-[#DCE9AF] transition-colors">
                  {t('delivery')}
                </Link>
              </li>
              <li>
                <Link href="/branding" className="hover:text-[#DCE9AF] transition-colors">
                  {t('branding')}
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="hover:text-[#DCE9AF] transition-colors">
                  {t('contacts')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: SANPACK Contacts */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-[#DCE9AF] mb-4 uppercase tracking-wider border-b border-[#0B5735] pb-2 font-extended">
              {t('contacts')}
            </h4>
            <div className="space-y-2 text-slate-200">
              <a
                href="tel:+998998510506"
                className="flex items-center gap-2 hover:text-[#DCE9AF] transition-colors font-semibold"
              >
                <Phone className="w-3.5 h-3.5 text-[#DCE9AF] shrink-0" />
                <span>+998 99 851 05 06</span>
              </a>
              <a
                href="tel:+998992323999"
                className="flex items-center gap-2 hover:text-[#DCE9AF] transition-colors font-semibold pl-5"
              >
                <span>+998 99 232 39 99</span>
              </a>
              <a
                href="mailto:info@sanpack.uz"
                className="flex items-center gap-2 hover:text-[#DCE9AF] transition-colors pt-1"
              >
                <Mail className="w-3.5 h-3.5 text-[#DCE9AF] shrink-0" />
                <span>info@sanpack.uz</span>
              </a>
              <div className="flex items-start gap-2 pt-1">
                <MapPin className="w-3.5 h-3.5 text-[#DCE9AF] shrink-0 mt-0.5" />
                <span>г. Ташкент, Сергелийский р-н, ул. Янги Сергели, 14А</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Clock className="w-3.5 h-3.5 text-[#DCE9AF] shrink-0" />
                <span>Пн — Сб: 09:00 - 18:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#0B5735] flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-300 text-[11px]">
          <p>© {currentYear} SANPACK. {t('allRightsReserved')}</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              {t('privacyPolicy')}
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              {t('termsOfUse')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
