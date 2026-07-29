'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ClientsSection } from '@/components/home/ClientsSection';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { ClientPartner } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { Star, Quote } from 'lucide-react';

export default function ClientsPage() {
  const { t } = useLanguage();
  const [clients, setClients] = useState<ClientPartner[]>([]);

  useEffect(() => {
    SanpackRepository.getClients().then(setClients);
  }, []);

  const reviews = [
    {
      name: 'Сеть ресторанов «Caravan Group»',
      author: 'Алишер Каримов (Директор по закупкам)',
      text: 'С SANPACK работаем больше 2 лет. Качество мусорных мешков 240L и пищевой фольги идеальное. Ни разу не было разрывов на кухне. Всегда вовремя привозят по Ташкенту.',
    },
    {
      name: 'Пекарня «Bon!»',
      author: 'Мадина Саидова (Зав. производством)',
      text: 'Заказываем брендированные пакеты-майка и пергамент. Полиграфия четкая, цвета яркие, завязки надежные. Спасибо за оперативность!',
    },
    {
      name: 'Отель «Lotte City Hotel»',
      author: 'Фарход Турсунов (Менеджер HoReCa)',
      text: 'Прекрасный B2B-сервис. Менеджер выезжает прямо с образцами, выписка счетов-фактур происходит за 10 минут. Рекомендуем SANPACK всем коллегам.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 space-y-12">
          <div>
            <h1 className="text-3xl font-bold text-[#18231E]">
              {t('clients')} SANPACK
            </h1>
            <p className="text-xs text-[#68736D] mt-1">
              Нам доверяют ведущие ресторанные холдинги, отели и производственные сети Узбекистана
            </p>
          </div>

          <ClientsSection clients={clients} />

          {/* Testimonials */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#18231E]">Отзывы наших B2B-партнёров</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 relative">
                  <Quote className="w-8 h-8 text-[#006F3C]/20 absolute top-4 right-4" />
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-[#18231E] leading-relaxed italic">
                    &ldquo;{r.text}&rdquo;
                  </p>
                  <div className="border-t pt-3">
                    <p className="text-xs font-bold text-[#006F3C]">{r.name}</p>
                    <p className="text-[10px] text-slate-400">{r.author}</p>
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
