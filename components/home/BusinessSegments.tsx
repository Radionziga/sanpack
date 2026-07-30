'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import {
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  CakeIcon,
  TruckIcon,
  SparklesIcon,
  ArrowRightIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

export function BusinessSegments() {
  const { t, fixText } = useLanguage();

  const segments = [
    {
      title: t('segRestaurants'),
      icon: BuildingStorefrontIcon,
      desc: 'Пакеты, фольга, стрейч-пленка, перчатки, бакалея, рис и свежая зелень.',
      badge: 'HoReCa Special',
      link: '/catalog',
    },
    {
      title: t('segHotels'),
      icon: BuildingOffice2Icon,
      desc: 'Мусорные мешки 20L-41L, расходные материалы, гигиеническая упаковка.',
      badge: 'Отели & Гостиницы',
      link: '/catalog/meshki-dlya-musora',
    },
    {
      title: t('segBakeries'),
      icon: CakeIcon,
      desc: 'Пергаментная бумага, пищевая фольга, фасовочные рулонные пакеты.',
      badge: 'Пекарни',
      link: '/catalog/folga-i-plenka',
    },
    {
      title: t('segDelivery'),
      icon: TruckIcon,
      desc: 'Брендированные пакеты майка, контейнеры, стикеры и наклейки.',
      badge: 'Delivery Line',
      link: '/catalog/pakety-mayka',
    },
    {
      title: t('segProduction'),
      icon: BriefcaseIcon,
      desc: 'Большие мусорные мешки 160L-240L, нитриловые перчатки, вакуумная плёнка.',
      badge: 'Промышленность',
      link: '/catalog/perchatki',
    },
    {
      title: t('segCleaning'),
      icon: SparklesIcon,
      desc: 'Сверхпрочные мусорные мешки, резинки, салфетки, хозяйственные перчатки.',
      badge: 'Клининг',
      link: '/catalog/meshki-dlya-musora',
    },
  ];

  return (
    <section className="py-14 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#222B35] tracking-tight">
            {t('forBusinessTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-[#5C6A75] mt-1.5">
            {fixText('Готовые комплексные подборки продукции под специфику вашего предприятия')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {segments.map((seg, idx) => {
            const Icon = seg.icon;
            return (
              <Link
                key={idx}
                href={seg.link}
                className="bg-white rounded-lg p-5 border border-slate-200 hover:shadow-lg hover:border-[#0F6E43] transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-10 h-10 rounded-md bg-[#EAF5EF] text-[#0F6E43] flex items-center justify-center group-hover:bg-[#0F6E43] group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-[#0F6E43] bg-[#EAF5EF] px-2 py-0.5 rounded uppercase">
                      {seg.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#222B35] group-hover:text-[#0F6E43] transition-colors mb-1.5 tracking-tight">
                    {fixText(seg.title)}
                  </h3>

                  <p className="text-xs text-[#5C6A75] leading-relaxed mb-3">
                    {fixText(seg.desc)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F6E43] group-hover:translate-x-1 transition-transform">
                  <span>{fixText('Перейти к продукции')}</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
