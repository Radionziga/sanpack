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
  const { t, fixText } = useLanguage();

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
      title: 'Контроль качества',
      desc: 'Строгий технический контроль толщины и прочности шва каждого рулона',
    },
    {
      icon: UserIcon,
      title: 'Персональный менеджер',
      desc: 'Сопровождение B2B-заказа от согласования КП до разгрузки на вашем складе',
    },
  ];

  return (
    <section className="py-14 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#222B35] tracking-tight">
            {t('advantagesTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-[#5C6A75] mt-1.5">
            {fixText('Прямое сотрудничество с производителем гарантирует лучшую цену и надежность поставок')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {advs.map((adv, idx) => {
            const Icon = adv.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-lg bg-[#F8FAFC] border border-slate-200 hover:bg-[#F2F7F4] hover:border-[#0F6E43]/30 transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-md bg-white text-[#0F6E43] flex items-center justify-center shadow-2xs mb-3 group-hover:bg-[#0F6E43] group-hover:text-white transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#222B35] mb-1.5 tracking-tight">
                  {fixText(adv.title)}
                </h3>
                <p className="text-xs text-[#5C6A75] leading-relaxed">
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
