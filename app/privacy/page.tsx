'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />
      <main className="flex-1 py-12 max-w-4xl mx-auto px-4 w-full">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 space-y-4 text-xs text-[#18231E] leading-relaxed">
          <h1 className="text-2xl font-bold mb-4">Политика конфиденциальности SANPACK</h1>
          <p>Настоящая Политика конфиденциальности персональных данных действует в отношении всей информации, которую компания SANPACK может получить о пользователе во время использования сайта.</p>
          <h3 className="font-bold text-sm text-[#006F3C]">1. Обработка персональных данных</h3>
          <p>Мы собираем только те данные (наименование компании, ИНН, ФИО контактного лица, номер телефона), которые необходимы для формирования коммерческого предложения, выписки счета-фактуры и осуществления курьерской доставки.</p>
          <h3 className="font-bold text-sm text-[#006F3C]">2. Защита информации</h3>
          <p>SANPACK не передает персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством Республики Узбекистан.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
