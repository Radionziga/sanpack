'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { pageCopy } from '@/lib/i18n/pageCopy';
import { AnalyticsPrivacyControl } from '@/components/analytics/AnalyticsPrivacyControl';

export default function PrivacyPage() {
  const { language } = useLanguage();
  const copy = pageCopy[language].privacy;
  const analyticsCopy = {
    ru: ['First-party аналитика использования', 'SANPACK использует случайный псевдонимный идентификатор, чтобы агрегированно измерять посещения, интерес к товарам, источники трафика и путь до заявки. Мы не связываем эти данные с Telegram-профилем, именем, телефоном или адресом и не используем fingerprinting.'],
    uz: ['First-party foydalanish tahlili', 'SANPACK tashriflar, mahsulotlarga qiziqish, trafik manbalari va arizagacha bo‘lgan yo‘lni umumiy ko‘rinishda o‘lchash uchun tasodifiy taxallusli identifikatordan foydalanadi. Bu ma’lumotlar Telegram profili, ism, telefon yoki manzil bilan bog‘lanmaydi va fingerprinting ishlatilmaydi.'],
    en: ['First-party usage analytics', 'SANPACK uses a random pseudonymous identifier to measure visits, product interest, traffic sources, and the path to a request in aggregate. We do not link this data to a Telegram profile, name, phone number, or address, and we do not use fingerprinting.'],
    zh: ['第一方使用分析', 'SANPACK 使用随机的假名标识符，汇总衡量访问、商品兴趣、流量来源以及提交申请的路径。我们不会将这些数据与 Telegram 资料、姓名、电话号码或地址关联，也不使用设备指纹。'],
  }[language];
  return (
    <div className="min-h-screen flex flex-col bg-[var(--sp-canvas)]">
      <Header />
      <main className="flex-1 py-12 max-w-4xl mx-auto px-4 w-full">
        <div className="sp-card space-y-4 p-6 text-xs leading-relaxed text-[var(--sp-ink-secondary)] sm:p-8">
          <h1 className="text-2xl font-bold mb-4">{copy.title}</h1>
          <p>{copy.intro}</p>
          {copy.sections.map(([title, text]) => (
            <React.Fragment key={title}>
              <h3 className="text-sm font-bold text-[var(--sp-brand)]">{title}</h3>
              <p>{text}</p>
            </React.Fragment>
          ))}
          <h3 className="text-sm font-bold text-[var(--sp-brand)]">{analyticsCopy[0]}</h3>
          <p>{analyticsCopy[1]}</p>
          <AnalyticsPrivacyControl />
        </div>
      </main>
      <Footer />
    </div>
  );
}
