'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { CallbackModal } from '@/components/modals/CallbackModal';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { Phone, Mail, MapPin, Clock, Send, MessageCircle } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { contactPhoneHref, localizedContact } from '@/lib/settings/contacts';

export default function ContactsPage() {
  const { t, language } = useLanguage();
  const copy = pageCopy[language].contacts;
  const { company, contacts } = useSiteSettings();
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);
  const phones = [contacts.phone1, contacts.phone2].filter(Boolean);
  const address = localizedContact(contacts, 'address', language);
  const hours = localizedContact(contacts, 'workingHours', language);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--sp-surface-inset)]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-10">
          <div>
            <h1 className="font-extended text-3xl font-bold text-[var(--sp-ink)]">{t('contacts')}</h1>
            <p className="text-xs text-[var(--sp-ink-secondary)] mt-1">
              {copy.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Contacts Info Box */}
            <div className="space-y-6 rounded-[var(--sp-radius)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-[var(--sp-shadow-raised)] md:p-8 lg:col-span-5">
              <h2 className="font-extended text-xl font-bold text-[var(--sp-ink)] border-b border-[var(--sp-line)] pb-3">
                {copy.salesTitle}
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[var(--sp-brand)] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[var(--sp-ink-tertiary)] block font-medium">{copy.sales}:</span>
                    {phones.map((phone) => (
                      <a key={phone} href={contactPhoneHref(phone)} className="block text-sm font-bold text-[var(--sp-ink)] hover:text-[var(--sp-brand)] hover:underline">
                        {phone}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[var(--sp-brand)] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[var(--sp-ink-tertiary)] block font-medium">{copy.email}:</span>
                    <a href={`mailto:${contacts.email}`} className="text-sm font-bold text-[var(--sp-ink)] hover:text-[var(--sp-brand)] hover:underline">
                      {contacts.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[var(--sp-brand)] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[var(--sp-ink-tertiary)] block font-medium">{copy.addressLabel}:</span>
                    <p className="font-bold text-[var(--sp-ink)]">
                      {address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[var(--sp-brand)] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[var(--sp-ink-tertiary)] block font-medium">{copy.hoursLabel}:</span>
                    <p className="font-bold text-[var(--sp-ink)]">
                      {hours}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--sp-line)] space-y-3">
                <button
                  onClick={() => setIsCallbackOpen(true)}
                  className="w-full py-3.5 bg-[var(--sp-brand)] hover:bg-[var(--sp-brand-deep)] text-[var(--sp-on-brand)] font-bold rounded-[var(--sp-radius-control)] text-xs shadow-md transition-all active:scale-95"
                >
                  {copy.callback}
                </button>

                <div className={`grid gap-2 ${contacts.telegram && contacts.whatsapp ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {contacts.telegram ? <a
                    href={contacts.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-[var(--sp-radius-control)] text-xs font-bold flex items-center justify-center gap-1.5 border border-sky-200/50"
                  >
                    <Send className="w-4 h-4" /> Telegram
                  </a> : null}
                  {contacts.whatsapp ? <a
                    href={contacts.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-[var(--sp-radius-control)] text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200/50"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a> : null}
                </div>
              </div>
            </div>

            {/* Map Frame Placeholder */}
            <div className="flex flex-col justify-between overflow-hidden rounded-[var(--sp-radius)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-[var(--sp-shadow-raised)] lg:col-span-7">
              <div className="space-y-2 mb-4">
                <h3 className="font-extended font-bold text-base text-[var(--sp-ink)]">
                  {copy.mapTitle}
                </h3>
                <p className="text-xs text-[var(--sp-ink-tertiary)]">
                  {copy.landmark}
                </p>
              </div>

              <div className="relative flex h-80 w-full items-center justify-center overflow-hidden rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)]">
                <iframe
                  title={`${company.name}: карта`}
                  src={contacts.mapIframe || 'https://yandex.uz/map-widget/v1/?ll=69.240073%2C41.299496&z=12'}
                  className="w-full h-full border-0"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <CallbackModal isOpen={isCallbackOpen} onClose={() => setIsCallbackOpen(false)} />
    </div>
  );
}
