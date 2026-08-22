import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BagDesigner } from '@/components/bag-designer/BagDesigner';
import { getBagDesignerSettings } from '@/lib/bag-designer/settings';
import type { Language } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Конструктор пакета с логотипом',
  description: 'Соберите макет пакета, разместите логотип и получите визуализацию перед расчётом производства.',
};

export default async function BagDesignerPage({ params }: { params: Promise<{ locale: Language }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getBagDesignerSettings();
  if (!settings.enabled) notFound();
  return <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]"><Header /><main className="flex-1"><BagDesigner settings={settings} /></main><Footer /></div>;
}
