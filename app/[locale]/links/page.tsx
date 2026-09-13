import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { LinkHubPageClient } from '@/components/links/LinkHubPageClient';
import { routing } from '@/i18n/routing';
import { getLinkHubText } from '@/lib/settings/linkHub';
import { getPublicSettings } from '@/lib/repositories/serverCatalogRepository';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import type { Language } from '@/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: value } = await params;
  if (!hasLocale(routing.locales, value)) return {};
  const locale = value as Language;
  const settings = await getPublicSettings();
  const linkHub = settings.linkHub;
  if (!linkHub?.enabled) return { robots: { index: false, follow: false } };
  return buildSeoMetadata({
    locale,
    path: '/links',
    title: getLinkHubText(locale, linkHub, 'title') || settings.company.name,
    description: getLinkHubText(locale, linkHub, 'description'),
    settings,
    image: settings.company.logo,
  });
}

export default async function LinkHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const settings = await getPublicSettings();
  if (!settings.linkHub?.enabled) notFound();
  return <LinkHubPageClient settings={settings} linkHub={settings.linkHub} />;
}
