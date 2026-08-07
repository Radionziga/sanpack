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
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-10">
          <div>
            <h1 className="text-3xl font-bold text-[#18231E]">{t('contacts')}</h1>
            <p className="text-xs text-[#68736D] mt-1">
              {copy.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Contacts Info Box */}
            <div className="space-y-6 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-[var(--sp-shadow-raised)] md:p-8 lg:col-span-5">
              <h2 className="text-xl font-bold text-[#18231E] border-b pb-3">
                {copy.salesTitle}
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block font-medium">{copy.sales}:</span>
                    {phones.map((phone) => (
                      <a key={phone} href={contactPhoneHref(phone)} className="block text-sm font-bold text-[var(--sp-ink)] hover:text-[var(--sp-brand)] hover:underline">
                        {phone}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block font-medium">{copy.email}:</span>
                    <a href={`mailto:${contacts.email}`} className="text-sm font-bold text-[#18231E] hover:underline">
                      {contacts.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block font-medium">{copy.addressLabel}:</span>
                    <p className="font-bold text-[#18231E]">
                      {address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block font-medium">{copy.hoursLabel}:</span>
                    <p className="font-bold text-[#18231E]">
                      {hours}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <button
                  onClick={() => setIsCallbackOpen(true)}
                  className="w-full py-3.5 bg-[#008348] text-white font-bold rounded-xl text-xs shadow-md"
                >
                  {copy.callback}
                </button>

                <div className={`grid gap-2 ${contacts.telegram && contacts.whatsapp ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {contacts.telegram ? <a
                    href={contacts.telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 bg-sky-50 text-sky-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> Telegram
                  </a> : null}
                  {contacts.whatsapp ? <a
                    href={contacts.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a> : null}
                </div>
              </div>
            </div>

            {/* Map Frame Placeholder */}
            <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-[var(--sp-shadow-raised)] lg:col-span-7">
              <div className="space-y-2 mb-4">
                <h3 className="font-bold text-base text-[#18231E]">
                  {copy.mapTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  {copy.landmark}
                </p>
              </div>

              <div className="relative flex h-80 w-full items-center justify-center overflow-hidden rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-inset)]">
                <iframe
                  title={`${company.name}: карта`}
                  src={contacts.mapIframe || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2999.0123456789!2d69.212345!3d41.223456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDHCsDEzJzI0LjQiTiA2OcKwMTInNDQuNCJF!5e0!3m2!1sru!2s!4v1600000000000!5m2!1sru!2s'}
                  className="w-full h-full border-0"
                  loading="lazy"
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
