'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { contactPhoneHref, localizedContact } from '@/lib/settings/contacts';

export function Footer() {
  const { t, language } = useLanguage();
  const { company, contacts } = useSiteSettings();
  const copy = {
    ru: {
      categories: ['Мешки для мусора', 'Пакеты «Майка»', 'Одноразовые перчатки', 'Фольга и стрейч-плёнка', 'Бакалея и рис', 'Полиграфия и брендирование'],
    },
    uz: {
      categories: ['Chiqindi paketlari', '“Mayka” paketlar', 'Bir martalik qo‘lqoplar', 'Folga va streych plyonka', 'Oziq-ovqat va guruch', 'Poligrafiya va brendlash'],
    },
    en: {
      categories: ['Waste bags', 'Carrier bags', 'Disposable gloves', 'Foil and stretch film', 'Groceries and rice', 'Printing and branding'],
    },
  }[language];
  const currentYear = new Date().getFullYear();
  const address = localizedContact(contacts, 'address', language);
  const hours = localizedContact(contacts, 'workingHours', language);
  const phones = [contacts.phone1, contacts.phone2].filter(Boolean);

  return (
    <footer className="border-t border-[var(--sp-brand-deep)] bg-[var(--sp-brand)] pb-[calc(var(--sp-mobile-nav-height)+env(safe-area-inset-bottom)+2rem)] pt-12 text-xs text-[var(--sp-on-brand)] md:pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Company information */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block max-w-full" aria-label={`${company.name} — на главную`}>
              <BrandLogo
                src={company?.logo}
                srcDark={company?.logoDark || '/logo-white.svg'}
                label={company.name}
                variant="white"
                className="h-6 sm:h-8"
              />
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-[color-mix(in_srgb,var(--sp-on-brand)_78%,transparent)]">
              {t('footerDesc')}
            </p>
            {contacts.telegram ? <div className="flex items-center gap-3 pt-2">
              <a
                href={contacts.telegram}
                target="_blank"
                rel="noreferrer"
                className="flex size-8 items-center justify-center rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-on-brand)_18%,transparent)] bg-[color-mix(in_srgb,var(--sp-on-brand)_8%,transparent)] text-[var(--sp-on-brand)] transition-colors hover:bg-[var(--sp-on-brand)] hover:text-[var(--sp-brand-deep)]"
                title="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
            </div> : null}
          </div>

          {/* Col 2: Catalog Categories */}
          <div>
            <h4 className="mb-4 border-b border-[color-mix(in_srgb,var(--sp-on-brand)_18%,transparent)] pb-2 font-compact text-sm font-semibold uppercase tracking-wider text-[var(--sp-on-brand)]">
              {t('catalog')}
            </h4>
            <ul className="space-y-2 text-[color-mix(in_srgb,var(--sp-on-brand)_78%,transparent)]">
              <li>
                <Link href="/catalog/meshki-dlya-musora" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {copy.categories[0]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/pakety-mayka" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {copy.categories[1]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/perchatki" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {copy.categories[2]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/folga-i-plenka" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {copy.categories[3]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/bakaleya" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {copy.categories[4]}
                </Link>
              </li>
              <li>
                <Link href="/catalog/branding-polygraphy" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {copy.categories[5]}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Customer Info */}
          <div>
            <h4 className="mb-4 border-b border-[color-mix(in_srgb,var(--sp-on-brand)_18%,transparent)] pb-2 font-compact text-sm font-semibold uppercase tracking-wider text-[var(--sp-on-brand)]">
              {t('customerInfo')}
            </h4>
            <ul className="space-y-2 text-[color-mix(in_srgb,var(--sp-on-brand)_78%,transparent)]">
              <li>
                <Link href="/about" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {t('about')}
                </Link>
              </li>
              <li>
                <Link href="/clients" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {t('clients')}
                </Link>
              </li>
              <li>
                <Link href="/delivery" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {t('delivery')}
                </Link>
              </li>
              <li>
                <Link href="/branding" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {t('branding')}
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="transition-colors hover:text-[var(--sp-on-brand)]">
                  {t('contacts')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company contacts */}
          <div className="space-y-3">
            <h4 className="mb-4 border-b border-[color-mix(in_srgb,var(--sp-on-brand)_18%,transparent)] pb-2 font-compact text-sm font-semibold uppercase tracking-wider text-[var(--sp-on-brand)]">
              {t('contacts')}
            </h4>
            <div className="space-y-2 text-[color-mix(in_srgb,var(--sp-on-brand)_78%,transparent)]">
              {phones.map((phone) => (
                <a
                  key={phone}
                  href={contactPhoneHref(phone)}
                  className="flex items-center gap-2 font-medium transition-colors hover:text-[var(--sp-on-brand)]"
                >
                  <Phone className="size-3.5 shrink-0 text-[color-mix(in_srgb,var(--sp-on-brand)_72%,transparent)]" aria-hidden="true" />
                  <span>{phone}</span>
                </a>
              ))}
              <a
                href={`mailto:${contacts.email}`}
                className="flex items-center gap-2 pt-1 transition-colors hover:text-[var(--sp-on-brand)]"
              >
                <Mail className="size-3.5 shrink-0 text-[color-mix(in_srgb,var(--sp-on-brand)_72%,transparent)]" />
                <span>{contacts.email}</span>
              </a>
              <div className="flex items-start gap-2 pt-1">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-[color-mix(in_srgb,var(--sp-on-brand)_72%,transparent)]" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Clock className="size-3.5 shrink-0 text-[color-mix(in_srgb,var(--sp-on-brand)_72%,transparent)]" />
                <span>{hours}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[color-mix(in_srgb,var(--sp-on-brand)_18%,transparent)] pt-8 text-[11px] text-[color-mix(in_srgb,var(--sp-on-brand)_68%,transparent)] sm:flex-row">
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
