'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { CallbackModal } from '@/components/modals/CallbackModal';
import { Phone, Mail, MapPin, Clock, Send, Building, MessageCircle } from 'lucide-react';

export default function ContactsPage() {
  const { t } = useLanguage();
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-10">
          <div>
            <h1 className="text-3xl font-bold text-[#18231E]">{t('contacts')}</h1>
            <p className="text-xs text-[#68736D] mt-1">
              Офис продаж и склад готовой продукции SANPACK в Ташкенте
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Contacts Info Box */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-6">
              <h2 className="text-xl font-bold text-[#18231E] border-b pb-3">
                Контакты отдела продаж
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block font-medium">Отдел B2B продаж:</span>
                    <a href="tel:+998998510506" className="text-base font-extrabold text-[#006F3C] block hover:underline">
                      +998 99 851 05 06
                    </a>
                    <a href="tel:+998992323999" className="text-sm font-extrabold text-[#18231E] block hover:underline">
                      +998 99 232 39 99
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block font-medium">Электронная почта:</span>
                    <a href="mailto:info@sanpack.uz" className="text-sm font-bold text-[#18231E] hover:underline">
                      info@sanpack.uz
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block font-medium">Адрес склада и офиса:</span>
                    <p className="font-bold text-[#18231E]">
                      Республика Узбекистан, г. Ташкент, Сергелийский район, ул. Янги Сергели, 14А
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-400 block font-medium">Режим работы:</span>
                    <p className="font-bold text-[#18231E]">
                      Понедельник — Суббота: 09:00 - 18:00 (Воскресенье — выходной)
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <button
                  onClick={() => setIsCallbackOpen(true)}
                  className="w-full py-3.5 bg-[#008348] text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Заказать обратный звонок
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="https://t.me/sanpack_uz"
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 bg-sky-50 text-sky-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" /> Telegram
                  </a>
                  <a
                    href="https://wa.me/998998510506"
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Map Frame Placeholder */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between p-6">
              <div className="space-y-2 mb-4">
                <h3 className="font-bold text-base text-[#18231E]">
                  Карта проезда к складу SANPACK
                </h3>
                <p className="text-xs text-slate-500">
                  Ориентир: Сергелийский авторынок, ул. Янги Сергели.
                </p>
              </div>

              <div className="w-full h-80 bg-slate-100 rounded-2xl flex items-center justify-center relative overflow-hidden border border-slate-200">
                <iframe
                  title="SANPACK Location Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2999.0123456789!2d69.212345!3d41.223456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDHCsDEzJzI0LjQiTiA2OcKwMTInNDQuNCJF!5e0!3m2!1sru!2s!4v1600000000000!5m2!1sru!2s"
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
