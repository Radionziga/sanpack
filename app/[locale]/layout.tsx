import { hasLocale } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PublicProviders } from '@/components/PublicProviders';
import { routing } from '@/i18n/routing';
import type { Language } from '@/types';

const seo = {
  ru: {
    title: 'Упаковка и продукты для HoReCa',
    description:
      'Комплексные поставки упаковки, расходных материалов, продуктов и полиграфии для бизнеса в Узбекистане.',
  },
  uz: {
    title: 'HoReCa uchun qadoqlash va mahsulotlar',
    description:
      'O‘zbekistondagi biznes uchun qadoqlash, sarf materiallari, oziq-ovqat va poligrafiya yetkazib berish.',
  },
  en: {
    title: 'Packaging and supplies for HoReCa',
    description:
      'Packaging, consumables, food products and print services for businesses in Uzbekistan.',
  },
} satisfies Record<Language, { title: string; description: string }>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const content = seo[locale];
  return {
    title: content.title,
    description: content.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ru: '/ru',
        uz: '/uz',
        en: '/en',
        'x-default': '/ru',
      },
    },
    openGraph: {
      type: 'website',
      locale,
      title: content.title,
      description: content.description,
      siteName: 'SANPACK',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <PublicProviders locale={locale}>{children}</PublicProviders>
    </NextIntlClientProvider>
  );
}
