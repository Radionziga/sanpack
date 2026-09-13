'use client';

import { useState } from 'react';
import { optOutAnalytics } from '@/lib/analytics/client';
import { useLanguage } from '@/context/LanguageContext';

const copy = {
  ru: { text: 'Можно отключить first-party аналитику на этом устройстве. Это не влияет на корзину, вход или отправку заявки.', action: 'Отключить аналитику', done: 'Аналитика отключена' },
  uz: { text: 'Ushbu qurilmada first-party tahlilini o‘chirishingiz mumkin. Bu savat, kirish yoki ariza yuborishga ta’sir qilmaydi.', action: 'Tahlilni o‘chirish', done: 'Tahlil o‘chirildi' },
  en: { text: 'You can disable first-party analytics on this device. This does not affect the cart, sign-in, or request submission.', action: 'Disable analytics', done: 'Analytics disabled' },
  zh: { text: '您可以在此设备上关闭第一方分析。这不会影响购物车、登录或提交申请。', action: '关闭分析', done: '分析已关闭' },
} as const;

export function AnalyticsPrivacyControl() {
  const { language } = useLanguage();
  const text = copy[language];
  const [done, setDone] = useState(false);
  return (
    <div className="mt-6 rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
      <p className="text-sm leading-6 text-[var(--sp-ink-secondary)]">{text.text}</p>
      <button type="button" disabled={done} onClick={() => void optOutAnalytics().then(() => setDone(true))} className="mt-3 min-h-11 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 text-sm font-bold text-[var(--sp-ink)] disabled:opacity-60">
        {done ? text.done : text.action}
      </button>
    </div>
  );
}
