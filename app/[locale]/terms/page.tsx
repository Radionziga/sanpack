'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7F6]">
      <Header />
      <main className="flex-1 py-12 max-w-4xl mx-auto px-4 w-full">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 space-y-4 text-xs text-[#18231E] leading-relaxed">
          <h1 className="text-2xl font-bold mb-4">Пользовательское соглашение SANPACK</h1>
          <p>Пользователь, оформляя заявку на сайте SANPACK, соглашается с правилами B2B-обслуживания и условиями коммерческой поставки продукции.</p>
          <h3 className="font-bold text-sm text-[#006F3C]">1. Цены и скидки</h3>
          <p>Все цены, указанные на сайте, носят ознакомительный характер. Окончательная стоимость и размер объемной скидки рассчитываются менеджером индивидуально при выписке счёта.</p>
          <h3 className="font-bold text-sm text-[#006F3C]">2. Отгрузка товаров</h3>
          <p>Отгрузка продукции производится после согласования условий оплаты и адреса доставки.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
