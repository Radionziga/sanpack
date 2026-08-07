'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { SanpackLogo } from '@/components/ui/SanpackLogo';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { contactPhoneHref, localizedContact } from '@/lib/settings/contacts';

export function Footer() {
  const { t, language } = useLanguage();
  const { company, contacts } = useSiteSettings();
  const copy = {
    ru: {
      categories: ['Мешки для мусора', 'Пакеты «Майка»', 'Одноразовые перчатки', 'Фольга и стрейч-плёнка', 'Бакалея и рис', 'Полиграфия и брендирование'],
      address: 'Ташкент, Сергелийский район, ул. Янги Сергели, 14А',
      hours: 'Пн — сб: 09:00–18:00',
    },
    uz: {
      categories: ['Chiqindi paketlari', '“Mayka” paketlar', 'Bir martalik qo‘lqoplar', 'Folga va streych plyonka', 'Oziq-ovqat va guruch', 'Poligrafiya va brendlash'],
      address: 'Toshkent, Sergeli tumani, Yangi Sergeli ko‘chasi, 14A',
      hours: 'Du — sh: 09:00–18:00',
    },
    en: {
      categories: ['Waste bags', 'Carrier bags', 'Disposable gloves', 'Foil and stretch film', 'Groceries and rice', 'Printing and branding'],
      address: '14A Yangi Sergeli Street, Sergeli district, Tashkent',
      hours: 'Mon–Sat: 09:00–18:00',
    },
  }[language];
  const currentYear = new Date().getFullYear();
  const address = localizedContact(contacts, 'address', language);
  const hours = localizedContact(contacts, 'workingHours', language);
  const phones = [contacts.phone1, contacts.phone2].filter(Boolean);

  return (
    <footer className="bg-[var(--sp-brand)] text-[var(--sp-on-brand)] text-xs border-t border-[var(--sp-brand-deep)] pt-12 pb-8">
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
            {contacts.telegram ? <div className="flex items-center gap-3 pt-2">
              <a
                href={contacts.telegram}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-lg bg-[var(--sp-brand-deep)] hover:bg-[var(--sp-lime)] hover:text-[#173A28] text-[var(--sp-on-brand-deep)] flex items-center justify-center transition-colors"
                title="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
            </div> : null}
          </div>

          {/* Col 2: Catalog Categories */}
          <div>
            <h4 className="text-sm font-bold text-[#DCE9AF] mb-4 uppercase tracking-wider border-b border-[#0B5735] pb-2 font-extended">
              {t('catalog')}
            </h4>
            <ul className="space-y-2 text-slate-200">
              <li>
                <Link href="/catalog/meshki-dlya-musora" className="hover:text-[#DCE9AF] transition-colors">
                  {copy.categories[0]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/pakety-mayka" className="hover:text-[#DCE9AF] transition-colors">
                  {copy.categories[1]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/perchatki" className="hover:text-[#DCE9AF] transition-colors">
                  {copy.categories[2]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/folga-i-plenka" className="hover:text-[#DCE9AF] transition-colors">
                  {copy.categories[3]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/bakaleya" className="hover:text-[#DCE9AF] transition-colors">
                  {copy.categories[4]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/branding-polygraphy" className="hover:text-[#DCE9AF] transition-colors">
                  {copy.categories[5]}
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
              {phones.map((phone) => (
                <a
                  key={phone}
                  href={contactPhoneHref(phone)}
                  className="flex items-center gap-2 font-semibold transition-colors hover:text-[var(--sp-accent)]"
                >
                  <Phone className="size-3.5 shrink-0 text-[var(--sp-accent)]" aria-hidden="true" />
                  <span>{phone}</span>
                </a>
              ))}
              <a
                href={`mailto:${contacts.email}`}
                className="flex items-center gap-2 hover:text-[#DCE9AF] transition-colors pt-1"
              >
                <Mail className="w-3.5 h-3.5 text-[#DCE9AF] shrink-0" />
                <span>{contacts.email}</span>
              </a>
              <div className="flex items-start gap-2 pt-1">
                <MapPin className="w-3.5 h-3.5 text-[#DCE9AF] shrink-0 mt-0.5" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Clock className="w-3.5 h-3.5 text-[#DCE9AF] shrink-0" />
                <span>{hours}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#0B5735] flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-300 text-[11px]">
          <p>© {currentYear} {company.name}. {t('allRightsReserved')}</p>
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
