'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  CheckBadgeIcon,
  BuildingOffice2Icon,
  PercentBadgeIcon,
  TruckIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

export function Advantages() {
  const { t, fixText, language } = useLanguage();
  const copy = {
    ru: {
      subtitle: 'Прямое сотрудничество с производителем гарантирует лучшую цену и надёжность поставок',
      quality: ['Контроль качества', 'Технический контроль толщины и прочности шва каждого рулона'],
      manager: ['Персональный менеджер', 'Сопровождение B2B-заказа от предложения до разгрузки на вашем складе'],
    },
    uz: {
      subtitle: 'Ishlab chiqaruvchi bilan to‘g‘ridan-to‘g‘ri hamkorlik eng yaxshi narx va ishonchli yetkazib berishni ta’minlaydi',
      quality: ['Sifat nazorati', 'Har bir rulon qalinligi va chok mustahkamligining texnik nazorati'],
      manager: ['Shaxsiy menejer', 'Taklifdan omboringizga tushirishgacha B2B buyurtmasini kuzatish'],
    },
    en: {
      subtitle: 'Working directly with the manufacturer ensures competitive pricing and reliable supply',
      quality: ['Quality control', 'Technical checks of thickness and seam strength for every roll'],
      manager: ['Dedicated manager', 'B2B order support from quotation through warehouse delivery'],
    },
  }[language];

  const advs = [
    {
      icon: CheckBadgeIcon,
      title: t('adv1Title'),
      desc: t('adv1Desc'),
    },
    {
      icon: BuildingOffice2Icon,
      title: t('adv2Title'),
      desc: t('adv2Desc'),
    },
    {
      icon: PercentBadgeIcon,
      title: t('adv3Title'),
      desc: t('adv3Desc'),
    },
    {
      icon: TruckIcon,
      title: t('adv4Title'),
      desc: t('adv4Desc'),
    },
    {
      icon: ShieldCheckIcon,
      title: copy.quality[0],
      desc: copy.quality[1],
    },
    {
      icon: UserIcon,
      title: copy.manager[0],
      desc: copy.manager[1],
    },
  ];

  return (
    <section className="py-14 bg-[var(--sp-surface)] border-y border-[var(--sp-line)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-extended text-2xl sm:text-3xl font-bold text-[var(--sp-ink)] tracking-tight">
            {t('advantagesTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--sp-ink-secondary)] mt-1.5">
            {fixText(copy.subtitle)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {advs.map((adv, idx) => {
            const Icon = adv.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-[var(--sp-radius)] bg-[var(--sp-surface-inset)] border border-[var(--sp-line)] hover:bg-[var(--sp-surface)] hover:border-[var(--sp-brand)]/40 hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface)] text-[var(--sp-brand)] flex items-center justify-center shadow-2xs mb-3 group-hover:bg-[var(--sp-brand)] group-hover:text-[var(--sp-on-brand)] transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[var(--sp-ink)] mb-1.5 tracking-tight font-extended">
                  {fixText(adv.title)}
                </h3>
                <p className="text-xs text-[var(--sp-ink-secondary)] leading-relaxed">
                  {fixText(adv.desc)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
