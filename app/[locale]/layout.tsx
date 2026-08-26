import { hasLocale } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PublicProviders } from '@/components/PublicProviders';
import { routing } from '@/i18n/routing';
import { getPublicProducts, getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import { StorefrontTheme } from '@/components/theme/StorefrontTheme';
import Script from 'next/script';
import { TelegramMiniAppBridge } from '@/components/telegram/TelegramMiniAppBridge';
import '../globals.css';
import { storefrontFontVariables } from '../fonts';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
} as const;

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

  const fallbackTitle = locale === 'uz'
    ? 'Onlayn katalog'
    : locale === 'en'
      ? 'Online catalog'
      : locale === 'zh'
        ? '在线商品目录'
        : 'Интернет-магазин';
  const fallbackDescription = locale === 'uz'
    ? 'Mahsulotlar va xizmatlar onlayn katalogi.'
    : locale === 'en'
      ? 'Online catalog of products and services.'
      : locale === 'zh'
        ? '商品与服务在线目录。'
        : 'Онлайн-каталог товаров и услуг.';
  let settings;
  try {
    settings = await getPublicSettings();
  } catch (error) {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('Public settings could not be loaded for metadata.', error);
    }
    return { title: fallbackTitle, description: fallbackDescription };
  }

  const title = locale === 'uz'
    ? settings.seo?.defaultTitleUz || fallbackTitle
    : locale === 'en'
      ? settings.seo?.defaultTitleEn || settings.seo?.defaultTitleRu || fallbackTitle
      : locale === 'zh'
        ? settings.seo?.defaultTitleZh || settings.seo?.defaultTitleEn || settings.seo?.defaultTitleRu || fallbackTitle
        : settings.seo?.defaultTitleRu || fallbackTitle;
  const description = locale === 'uz'
    ? settings.seo?.defaultDescriptionUz || fallbackDescription
    : locale === 'en'
      ? settings.seo?.defaultDescriptionEn || settings.seo?.defaultDescriptionRu || fallbackDescription
      : locale === 'zh'
        ? settings.seo?.defaultDescriptionZh || settings.seo?.defaultDescriptionEn || settings.seo?.defaultDescriptionRu || fallbackDescription
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
        zh: '/zh',
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
  const messages = await getMessages();
  let settings;
  try {
    settings = await getPublicSettings();
  } catch (error) {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('Public settings could not be loaded for the storefront.', error);
    }
    const copy = locale === 'uz'
      ? {
          title: 'Katalog vaqtincha ishlamayapti',
          description: 'Hozirgi maʼlumotlarni yuklab bo‘lmadi. Birozdan keyin sahifani yangilang.',
        }
      : locale === 'en'
        ? {
            title: 'Catalog temporarily unavailable',
            description: 'Current data could not be loaded. Please refresh the page a little later.',
          }
        : locale === 'zh'
          ? {
              title: '目录暂时不可用',
              description: '无法加载最新数据，请稍后刷新页面。',
            }
        : {
            title: 'Каталог временно недоступен',
            description: 'Не удалось загрузить актуальные данные. Обновите страницу немного позже.',
          };

    return (
      <html lang={locale} className={storefrontFontVariables}>
        <body suppressHydrationWarning>
          <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-slate-950">
            <section className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h1 className="text-2xl font-semibold">{copy.title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">{copy.description}</p>
            </section>
          </main>
        </body>
      </html>
    );
  }

  const initialProducts = await getPublicProducts().catch((error) => {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('Products could not be preloaded for mobile search.', error);
    }
    return [];
  });

  return (
    <html lang={locale} className={storefrontFontVariables}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <StorefrontTheme design={settings.design}>
            <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
            <TelegramMiniAppBridge />
            <PublicProviders
              locale={locale}
              settings={settings}
              initialProducts={initialProducts}
            >
              {children}
            </PublicProviders>
          </StorefrontTheme>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
