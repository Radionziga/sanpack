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
  const { t, fixText, language } = useLanguage();
  const copy = {
    ru: {
      subtitle: 'Готовые комплексные подборки под специфику вашего предприятия',
      action: 'Перейти к продукции',
      descriptions: [
        'Пакеты, фольга, плёнка, перчатки, бакалея, рис и свежая зелень.',
        'Мусорные мешки, расходные материалы и гигиеническая упаковка.',
        'Пергамент, пищевая фольга и фасовочные рулонные пакеты.',
        'Брендированные пакеты, контейнеры, стикеры и наклейки.',
        'Большие мусорные мешки, нитриловые перчатки и вакуумная плёнка.',
        'Прочные мешки, резинки, салфетки и хозяйственные перчатки.',
      ],
      badges: ['HoReCa', 'Отели', 'Пекарни', 'Доставка', 'Производство', 'Клининг'],
    },
    uz: {
      subtitle: 'Korxonangiz xususiyatiga mos tayyor kompleks mahsulot to‘plamlari',
      action: 'Mahsulotlarga o‘tish',
      descriptions: [
        'Paketlar, folga, plyonka, qo‘lqoplar, oziq-ovqat va yangi ko‘katlar.',
        'Chiqindi paketlari, sarf materiallari va gigiyenik qadoqlash.',
        'Pergament, oziq-ovqat folgasi va rulon paketlar.',
        'Brendlangan paketlar, konteynerlar, stikerlar va yorliqlar.',
        'Katta chiqindi paketlari, nitril qo‘lqoplar va vakuum plyonkasi.',
        'Mustahkam paketlar, rezinalar, salfetkalar va xo‘jalik qo‘lqoplari.',
      ],
      badges: ['HoReCa', 'Mehmonxonalar', 'Novvoyxonalar', 'Yetkazib berish', 'Ishlab chiqarish', 'Klining'],
    },
    en: {
      subtitle: 'Ready-made product selections tailored to your operation',
      action: 'View products',
      descriptions: [
        'Bags, foil, film, gloves, groceries, rice and fresh herbs.',
        'Waste bags, consumables and hygienic packaging.',
        'Parchment, food foil and produce bags on rolls.',
        'Branded bags, containers, stickers and labels.',
        'Large waste bags, nitrile gloves and vacuum film.',
        'Heavy-duty bags, bands, wipes and household gloves.',
      ],
      badges: ['HoReCa', 'Hotels', 'Bakeries', 'Delivery', 'Production', 'Cleaning'],
    },
    zh: {
      subtitle: '根据您的业务特点准备的一站式商品组合',
      action: '查看商品',
      descriptions: [
        '包装袋、铝箔、薄膜、手套、杂货、大米和新鲜蔬菜。',
        '垃圾袋、耗材和卫生包装。',
        '烘焙纸、食品铝箔和连卷袋。',
        '品牌包装袋、餐盒、贴纸和标签。',
        '大号垃圾袋、丁腈手套和真空膜。',
        '耐用垃圾袋、橡皮筋、湿巾和家用手套。',
      ],
      badges: ['HoReCa', '酒店', '烘焙店', '配送', '生产', '保洁'],
    },
  }[language];

  const segments = [
    {
      title: t('segRestaurants'),
      icon: BuildingStorefrontIcon,
      desc: copy.descriptions[0],
      badge: copy.badges[0],
      link: '/catalog',
    },
    {
      title: t('segHotels'),
      icon: BuildingOffice2Icon,
      desc: copy.descriptions[1],
      badge: copy.badges[1],
      link: '/catalog/meshki-dlya-musora',
    },
    {
      title: t('segBakeries'),
      icon: CakeIcon,
      desc: copy.descriptions[2],
      badge: copy.badges[2],
      link: '/catalog/folga-i-plenka',
    },
    {
      title: t('segDelivery'),
      icon: TruckIcon,
      desc: copy.descriptions[3],
      badge: copy.badges[3],
      link: '/catalog/pakety-mayka',
    },
    {
      title: t('segProduction'),
      icon: BriefcaseIcon,
      desc: copy.descriptions[4],
      badge: copy.badges[4],
      link: '/catalog/perchatki',
    },
    {
      title: t('segCleaning'),
      icon: SparklesIcon,
      desc: copy.descriptions[5],
      badge: copy.badges[5],
      link: '/catalog/meshki-dlya-musora',
    },
  ];

  return (
    <section className="py-14 bg-[var(--sp-surface-inset)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-extended text-2xl sm:text-3xl font-bold text-[var(--sp-ink)] tracking-tight">
            {t('forBusinessTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--sp-ink-secondary)] mt-1.5">
            {fixText(copy.subtitle)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {segments.map((seg, idx) => {
            const Icon = seg.icon;
            return (
              <Link
                key={idx}
                href={seg.link}
                className="bg-[var(--sp-surface)] rounded-[var(--sp-radius)] p-5 border border-[var(--sp-line)] hover:shadow-lg hover:border-[var(--sp-brand)] transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-10 h-10 rounded-[var(--sp-radius-control)] bg-[color-mix(in_srgb,var(--sp-brand)_10%,var(--sp-surface))] text-[var(--sp-brand)] flex items-center justify-center group-hover:bg-[var(--sp-brand)] group-hover:text-[var(--sp-on-brand)] transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--sp-brand)] bg-[color-mix(in_srgb,var(--sp-brand)_10%,var(--sp-surface))] px-2 py-0.5 rounded-[var(--sp-radius-control)] uppercase">
                      {seg.badge}
                    </span>
                  </div>

                  <h3 className="font-extended text-sm font-bold text-[var(--sp-ink)] group-hover:text-[var(--sp-brand)] transition-colors mb-1.5 tracking-tight">
                    {fixText(seg.title)}
                  </h3>

                  <p className="text-xs text-[var(--sp-ink-secondary)] leading-relaxed mb-3">
                    {fixText(seg.desc)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--sp-brand)] group-hover:translate-x-1 transition-transform">
                  <span>{fixText(copy.action)}</span>
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
