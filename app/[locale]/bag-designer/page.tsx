import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BagDesigner } from '@/components/bag-designer/BagDesigner';
import { getBagDesignerSettings } from '@/lib/bag-designer/settings';
import { routing } from '@/i18n/routing';
import type { Language } from '@/types';

export const dynamic = 'force-dynamic';

const metadataCopy: Record<Language, { title: string; description: string }> = {
  ru: { title: 'Конструктор пакета с логотипом', description: 'Соберите макет пакета, разместите логотип и получите визуализацию перед расчётом производства.' },
  uz: { title: 'Logotipli paket konstruktori', description: 'Paket o‘lchamini tanlang, logotipni joylashtiring va ishlab chiqarish hisobidan oldin vizualizatsiya oling.' },
  en: { title: 'Custom branded bag designer', description: 'Choose a bag size, place your logo and generate a visualization before requesting a production estimate.' },
  zh: { title: '品牌包装袋设计器', description: '选择包装袋尺寸，放置品牌标识，并在申请生产报价前生成效果图。' },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Language = routing.locales.includes(rawLocale as Language) ? rawLocale as Language : 'ru';
  const path = '/bag-designer';
  return {
    ...metadataCopy[locale],
    alternates: {
      canonical: `/${locale}${path}`,
      languages: Object.fromEntries([
        ...routing.locales.map((language) => [language, `/${language}${path}`]),
        ['x-default', `/ru${path}`],
      ]),
    },
  };
}

export default async function BagDesignerPage({ params }: { params: Promise<{ locale: Language }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getBagDesignerSettings({ fallbackOnError: true });
  if (!settings.enabled) notFound();
  return <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]"><Header /><main className="flex-1"><BagDesigner settings={settings} /></main><Footer /></div>;
}
