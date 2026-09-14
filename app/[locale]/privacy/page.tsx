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
    ru: ['Аналитика использования', 'SANPACK использует собственную first-party аналитику, а также может использовать Google Analytics и Яндекс Метрику для статистики, улучшения каталога и оценки рекламных кампаний. В собственные события для этих сервисов не передаются имя, телефон, адрес, комментарий, Telegram ID или customer UID. Аналитика не связывается с профилем покупателя, fingerprinting и запись сессий не используются.'],
    uz: ['Foydalanish tahlili', 'SANPACK o‘z first-party tahlilidan, shuningdek statistika, katalogni yaxshilash va reklama kampaniyalarini baholash uchun Google Analytics hamda Yandex Metrica xizmatlaridan foydalanishi mumkin. Ushbu xizmatlarga yuboriladigan maxsus hodisalarda ism, telefon, manzil, izoh, Telegram ID yoki customer UID uzatilmaydi. Tahlil xaridor profiliga bog‘lanmaydi, fingerprinting va sessiya yozuvi ishlatilmaydi.'],
    en: ['Usage analytics', 'SANPACK uses first-party analytics and may also use Google Analytics and Yandex Metrica for statistics, catalogue improvement, and campaign measurement. Our custom events do not send names, phone numbers, addresses, comments, Telegram IDs, or customer UIDs to these services. Analytics is not linked to the customer profile, and we do not use fingerprinting or session recording.'],
    zh: ['使用分析', 'SANPACK 使用第一方分析，也可能使用 Google Analytics 和 Yandex Metrica 进行统计、改进目录并评估广告活动。我们发送给这些服务的自定义事件不包含姓名、电话号码、地址、备注、Telegram ID 或客户 UID。分析数据不会与客户资料关联，也不使用设备指纹或会话录制。'],
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
