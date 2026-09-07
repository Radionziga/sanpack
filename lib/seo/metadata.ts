import type { Metadata } from 'next';
import type { Language, SiteSettings } from '@/types';
import { routing } from '@/i18n/routing';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';

export const siteBaseUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export function localizedSiteDescription(settings: SiteSettings, locale: Language) {
  return resolveLocalizedText(locale, {
    ru: settings.seo.defaultDescriptionRu || settings.company.descriptionRu,
    uz: settings.seo.defaultDescriptionUz || settings.company.descriptionUz,
    en: settings.seo.defaultDescriptionEn || settings.company.descriptionEn,
    zh: settings.seo.defaultDescriptionZh || settings.company.descriptionZh,
  }).text;
}

export function withCompanyName(title: string, companyName: string) {
  const cleanTitle = title.trim();
  const cleanCompany = companyName.trim();
  if (!cleanTitle || !cleanCompany || cleanTitle.toLocaleLowerCase().includes(cleanCompany.toLocaleLowerCase())) return cleanTitle;
  return `${cleanTitle} — ${cleanCompany}`;
}

export function localeAlternates(path: string) {
  return Object.fromEntries([
    ...routing.locales.map((locale) => [locale, `/${locale}${path}`]),
    ['x-default', `/ru${path}`],
  ]);
}

export function buildSeoMetadata({ locale, path, title, description, settings, image, titleIsExplicit = false, index = true }: {
  locale: Language;
  path: string;
  title: string;
  description?: string;
  settings: SiteSettings;
  image?: string;
  titleIsExplicit?: boolean;
  index?: boolean;
}): Metadata {
  const finalTitle = titleIsExplicit ? title.trim() : withCompanyName(title, settings.company.name);
  const finalDescription = description?.trim() || localizedSiteDescription(settings, locale);
  const canonical = `/${locale}${path}`;
  const absoluteCanonical = new URL(canonical, siteBaseUrl()).toString();
  const socialImage = image || settings.company.logo || undefined;
  return {
    title: finalTitle,
    description: finalDescription,
    robots: index ? undefined : { index: false, follow: false },
    alternates: { canonical, languages: localeAlternates(path) },
    openGraph: {
      type: 'website', locale, title: finalTitle, description: finalDescription,
      url: absoluteCanonical, siteName: settings.company.name,
      images: socialImage ? [{ url: socialImage, alt: finalTitle }] : [],
    },
    twitter: {
      card: socialImage ? 'summary_large_image' : 'summary',
      title: finalTitle, description: finalDescription,
      images: socialImage ? [socialImage] : [],
    },
  };
}

export function buildBreadcrumbStructuredData(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name,
      item: new URL(item.path, siteBaseUrl()).toString(),
    })),
  };
}

export function buildSiteStructuredData(settings: SiteSettings) {
  const baseUrl = siteBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${baseUrl}/#organization`, name: settings.company.name, url: baseUrl, logo: settings.company.logo || undefined, email: settings.contacts.email || undefined, telephone: settings.contacts.phone1 || undefined },
      { '@type': 'WebSite', '@id': `${baseUrl}/#website`, name: settings.company.name, url: baseUrl, publisher: { '@id': `${baseUrl}/#organization` }, inLanguage: routing.locales },
    ],
  };
}

export type StaticRouteKey = 'catalog' | 'about' | 'clients' | 'delivery' | 'branding' | 'contacts' | 'privacy' | 'terms';

const staticCopy: Record<StaticRouteKey, Record<Language, { title: string; description: string }>> = {
  catalog: {
    ru: { title: 'Каталог товаров', description: 'Каталог товаров SANPACK для бизнеса с актуальными ценами, наличием и условиями заказа.' },
    uz: { title: 'Mahsulotlar katalogi', description: 'Biznes uchun SANPACK mahsulotlari katalogi: narxlar, mavjudlik va buyurtma shartlari.' },
    en: { title: 'Product catalog', description: 'SANPACK business product catalog with current prices, availability and ordering terms.' },
    zh: { title: '商品目录', description: 'SANPACK 企业商品目录，包含当前价格、库存与订购条件。' },
  },
  about: {
    ru: { title: 'О компании', description: 'О компании SANPACK, производстве, ассортименте и работе с бизнес-клиентами.' },
    uz: { title: 'Kompaniya haqida', description: 'SANPACK kompaniyasi, ishlab chiqarish, assortiment va biznes mijozlar bilan ishlash haqida.' },
    en: { title: 'About us', description: 'About SANPACK, its production, product range and work with business customers.' },
    zh: { title: '关于我们', description: '了解 SANPACK 的生产、产品范围与企业客户服务。' },
  },
  clients: {
    ru: { title: 'Наши клиенты', description: 'Компании и предприятия, которые работают с SANPACK.' },
    uz: { title: 'Mijozlarimiz', description: 'SANPACK bilan ishlaydigan kompaniya va korxonalar.' },
    en: { title: 'Our clients', description: 'Companies and businesses that work with SANPACK.' },
    zh: { title: '我们的客户', description: '与 SANPACK 合作的公司和企业。' },
  },
  delivery: {
    ru: { title: 'Доставка и оплата', description: 'Условия доставки и оплаты заказов SANPACK по Ташкенту и регионам Узбекистана.' },
    uz: { title: 'Yetkazib berish va to‘lov', description: 'Toshkent va O‘zbekiston hududlari bo‘yicha SANPACK buyurtmalarini yetkazib berish va to‘lash shartlari.' },
    en: { title: 'Delivery and payment', description: 'SANPACK delivery and payment terms for Tashkent and regions of Uzbekistan.' },
    zh: { title: '配送与付款', description: 'SANPACK 在塔什干及乌兹别克斯坦各地区的配送与付款条件。' },
  },
  branding: {
    ru: { title: 'Полиграфия и брендирование', description: 'Брендирование упаковки и полиграфические услуги SANPACK для бизнеса.' },
    uz: { title: 'Poligrafiya va brendlash', description: 'Biznes uchun SANPACK qadoqlash brendingi va poligrafiya xizmatlari.' },
    en: { title: 'Printing and branding', description: 'SANPACK packaging branding and printing services for businesses.' },
    zh: { title: '印刷与品牌定制', description: 'SANPACK 面向企业的包装品牌定制与印刷服务。' },
  },
  contacts: {
    ru: { title: 'Контакты', description: 'Контакты SANPACK: телефон, адрес, график работы и способы связи.' },
    uz: { title: 'Aloqa', description: 'SANPACK aloqa ma’lumotlari: telefon, manzil, ish vaqti va bog‘lanish usullari.' },
    en: { title: 'Contacts', description: 'SANPACK contact details: phone, address, working hours and contact channels.' },
    zh: { title: '联系方式', description: 'SANPACK 的电话、地址、营业时间与联系渠道。' },
  },
  privacy: {
    ru: { title: 'Политика конфиденциальности', description: 'Политика обработки и защиты персональных данных SANPACK.' },
    uz: { title: 'Maxfiylik siyosati', description: 'SANPACK shaxsiy ma’lumotlarni qayta ishlash va himoya qilish siyosati.' },
    en: { title: 'Privacy policy', description: 'SANPACK personal data processing and protection policy.' },
    zh: { title: '隐私政策', description: 'SANPACK 个人数据处理与保护政策。' },
  },
  terms: {
    ru: { title: 'Условия использования', description: 'Условия использования сайта и сервисов SANPACK.' },
    uz: { title: 'Foydalanish shartlari', description: 'SANPACK sayti va xizmatlaridan foydalanish shartlari.' },
    en: { title: 'Terms of use', description: 'Terms for using the SANPACK website and services.' },
    zh: { title: '使用条款', description: 'SANPACK 网站与服务使用条款。' },
  },
};

export function buildStaticRouteMetadata(key: StaticRouteKey, locale: Language, settings: SiteSettings) {
  const path = key === 'catalog' ? '/catalog' : `/${key}`;
  const copy = staticCopy[key][locale];
  return buildSeoMetadata({
    locale,
    path,
    title: copy.title,
    description: copy.description.replaceAll('SANPACK', settings.company.name),
    settings,
  });
}
