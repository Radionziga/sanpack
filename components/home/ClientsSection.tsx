'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { ClientPartner } from '@/types';

interface ClientsSectionProps {
  clients: ClientPartner[];
}

export function ClientsSection({ clients }: ClientsSectionProps) {
  const { t, getLocalizedText, language } = useLanguage();
  const [filter, setFilter] = useState<string>('all');

  const copy = {
    ru: {
      categories: ['Все клиенты', 'Рестораны и кафе', 'Отели', 'Пекарни', 'Производства'],
      subtitle: 'Рестораны, отели, кондитерские и сетевые бизнесы Узбекистана выбирают SANPACK',
    },
    uz: {
      categories: ['Barcha mijozlar', 'Restoran va kafelar', 'Mehmonxonalar', 'Novvoyxonalar', 'Ishlab chiqarish'],
      subtitle: 'O‘zbekiston restoranlari, mehmonxonalari, qandolatchilari va tarmoqlari SANPACKni tanlaydi',
    },
    en: {
      categories: ['All clients', 'Restaurants and cafés', 'Hotels', 'Bakeries', 'Production'],
      subtitle: 'Restaurants, hotels, bakeries and multi-site businesses across Uzbekistan choose SANPACK',
    },
  }[language];
  const categories = [
    { id: 'all', label: copy.categories[0] },
    { id: 'restaurant', label: copy.categories[1] },
    { id: 'hotel', label: copy.categories[2] },
    { id: 'bakery', label: copy.categories[3] },
    { id: 'production', label: copy.categories[4] },
  ];

  const filteredClients =
    filter === 'all'
      ? clients
      : clients.filter((c) => c.category === filter);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">
            {t('clientsTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            {copy.subtitle}
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                filter === cat.id
                  ? 'bg-[#0F6E43] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Logo Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-[#F8FAFC] rounded-lg p-4 border border-slate-200/80 hover:bg-white hover:shadow-md hover:border-[#0F6E43] transition-all flex flex-col items-center justify-center text-center group h-32"
            >
              <Image
                src={client.logo}
                alt={client.name}
                width={200}
                height={48}
                sizes="160px"
                className="w-full h-12 object-contain grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100"
              />
              <span className="text-[11px] font-semibold text-[#1E293B] mt-2 line-clamp-1">
                {client.name}
              </span>
              {client.descriptionRu && (
                <span className="text-[10px] text-slate-500 line-clamp-1">
                  {getLocalizedText(client.descriptionRu, client.descriptionUz, client.descriptionEn)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
