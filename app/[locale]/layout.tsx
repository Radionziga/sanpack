import { hasLocale } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PublicProviders } from '@/components/PublicProviders';
import { routing } from '@/i18n/routing';
import { getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import { SanpackTheme } from '@/components/theme/SanpackTheme';
import Script from 'next/script';
import { TelegramMiniAppBridge } from '@/components/telegram/TelegramMiniAppBridge';

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

  const settings = await getPublicSettings();
  const fallbackTitle = locale === 'uz'
    ? 'Onlayn katalog'
    : locale === 'en'
      ? 'Online catalog'
      : 'Интернет-магазин';
  const fallbackDescription = locale === 'uz'
    ? 'Mahsulotlar va xizmatlar onlayn katalogi.'
    : locale === 'en'
      ? 'Online catalog of products and services.'
      : 'Онлайн-каталог товаров и услуг.';
  const title = locale === 'uz'
    ? settings.seo?.defaultTitleUz || fallbackTitle
    : locale === 'en'
      ? settings.seo?.defaultTitleEn || settings.seo?.defaultTitleRu || fallbackTitle
      : settings.seo?.defaultTitleRu || fallbackTitle;
  const description = locale === 'uz'
    ? settings.seo?.defaultDescriptionUz || fallbackDescription
    : locale === 'en'
      ? settings.seo?.defaultDescriptionEn || settings.seo?.defaultDescriptionRu || fallbackDescription
      : settings.seo?.defaultDescriptionRu || fallbackDescription;
  return {
    title,
    description,
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
      title,
      description,
      siteName: settings.company?.name || 'Storefront',
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
  const [messages, settings] = await Promise.all([
    getMessages(),
    getPublicSettings(),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      <SanpackTheme design={settings.design}>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <TelegramMiniAppBridge />
        <PublicProviders locale={locale}>{children}</PublicProviders>
      </SanpackTheme>
    </NextIntlClientProvider>
  );
}
