import type { Metadata } from 'next';
import type { Category, Language, Product, ProductVariant, SiteSettings } from '@/types';
import { resolveLocalizedText } from '@/lib/i18n/localizedText';
import {
  getCategoryPath,
  getVisibleCategories,
  isProductCategory,
  resolveProductCategory,
} from '@/lib/catalog/categoryHierarchy';
import { hasProductImage } from '@/lib/catalog/productImages';
import {
  buildSeoMetadata,
  localeAlternates,
  siteBaseUrl,
  withCompanyName,
} from '@/lib/seo/metadata';

export type SeoValueSource = 'override' | 'entity' | 'generated' | 'site';

export interface EffectiveSeo {
  title: string;
  description: string;
  canonical: string;
  absoluteCanonical: string;
  alternates: Record<string, string>;
  image?: string;
  indexable: boolean;
  titleSource: SeoValueSource;
  descriptionSource: SeoValueSource;
  imageSource: 'entity' | 'site' | 'missing';
  issues: string[];
}

type LocalizedSeoFields = NonNullable<Product['seo'] | Category['seo']>;

const PRODUCT_FALLBACKS: Record<Language, {
  standard: (name: string) => string;
  request: (name: string) => string;
}> = {
  ru: {
    standard: (name) => `${name} для HoReCa. Характеристики, актуальные условия заказа и стоимость в SANPACK.`,
    request: (name) => `${name} для HoReCa. Условия заказа и стоимость уточняются менеджером SANPACK.`,
  },
  uz: {
    standard: (name) => `${name} — HoReCa uchun. SANPACK’da xususiyatlar, amaldagi buyurtma shartlari va narx.`,
    request: (name) => `${name} — HoReCa uchun. Buyurtma shartlari va narxini SANPACK menejeridan aniqlang.`,
  },
  en: {
    standard: (name) => `${name} for HoReCa. Specifications, current ordering terms and price from SANPACK.`,
    request: (name) => `${name} for HoReCa. Confirm ordering terms and price with a SANPACK manager.`,
  },
  zh: {
    standard: (name) => `${name}，适用于 HoReCa。查看 SANPACK 提供的规格、当前订购条件与价格。`,
    request: (name) => `${name}，适用于 HoReCa。订购条件与价格请咨询 SANPACK 经理。`,
  },
};

const CATEGORY_FALLBACKS: Record<Language, (name: string) => string> = {
  ru: (name) => `${name} для HoReCa в каталоге SANPACK. Посмотрите ассортимент, характеристики и условия заказа.`,
  uz: (name) => `SANPACK katalogida HoReCa uchun ${name}. Assortiment, xususiyatlar va buyurtma shartlarini ko‘ring.`,
  en: (name) => `${name} for HoReCa in the SANPACK catalog. Browse the range, specifications and ordering terms.`,
  zh: (name) => `SANPACK 目录中的 HoReCa ${name}。查看产品范围、规格与订购条件。`,
};

const GALLERY_VIEW_LABELS: Record<Language, (index: number) => string> = {
  ru: (index) => `вид ${index}`,
  uz: (index) => `${index}-ko‘rinish`,
  en: (index) => `view ${index}`,
  zh: (index) => `视图 ${index}`,
};

function cleanText(value?: string) {
  return value
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '';
}

function localizedField(locale: Language, fields: {
  ru?: string;
  uz?: string;
  en?: string;
  zh?: string;
}) {
  return cleanText(resolveLocalizedText(locale, fields).text);
}

function exactSeoField(seo: LocalizedSeoFields | undefined, prefix: 'title' | 'description', locale: Language) {
  const suffix = locale === 'ru' ? 'Ru' : locale === 'uz' ? 'Uz' : locale === 'en' ? 'En' : 'Zh';
  return cleanText(seo?.[`${prefix}${suffix}` as keyof LocalizedSeoFields]);
}

function truncateAtWord(value: string, maxLength: number) {
  const clean = cleanText(value);
  if (clean.length <= maxLength) return clean;
  const candidate = clean.slice(0, maxLength + 1);
  const boundary = candidate.lastIndexOf(' ');
  const shortened = (boundary >= Math.floor(maxLength * 0.65) ? candidate.slice(0, boundary) : clean.slice(0, maxLength)).trim();
  return `${shortened.replace(/[.,;:!?—-]+$/u, '')}…`;
}

function localizedProductTitle(product: Partial<Product>, locale: Language) {
  return localizedField(locale, {
    ru: product.titleRu,
    uz: product.titleUz,
    en: product.titleEn,
    zh: product.titleZh,
  });
}

function localizedProductDescription(product: Partial<Product>, locale: Language) {
  const short = localizedField(locale, {
    ru: product.shortDescriptionRu,
    uz: product.shortDescriptionUz,
    en: product.shortDescriptionEn,
    zh: product.shortDescriptionZh,
  });
  if (short) return short;
  return localizedField(locale, {
    ru: product.descriptionRu,
    uz: product.descriptionUz,
    en: product.descriptionEn,
    zh: product.descriptionZh,
  });
}

function localizedCategoryTitle(category: Partial<Category>, locale: Language) {
  return localizedField(locale, {
    ru: category.titleRu,
    uz: category.titleUz,
    en: category.titleEn,
    zh: category.titleZh,
  });
}

function localizedCategoryDescription(category: Partial<Category>, locale: Language) {
  return localizedField(locale, {
    ru: category.descriptionRu,
    uz: category.descriptionUz,
    en: category.descriptionEn,
    zh: category.descriptionZh,
  });
}

export function isCategorySeoIndexable(category: Pick<Category, 'id' | 'status'>, categories: Category[]) {
  return category.status === 'active'
    && getVisibleCategories(categories).some((candidate) => candidate.id === category.id);
}

export function isProductSeoIndexable(product: Pick<Product, 'status' | 'slug' | 'categoryId' | 'categorySlug'>, categories: Category[]) {
  if (product.status !== 'published' || !product.slug.trim()) return false;
  const category = resolveProductCategory(product, categories);
  return Boolean(category
    && isProductCategory(category.id, categories)
    && isCategorySeoIndexable(category, categories));
}

function finalizeEffectiveSeo(input: Omit<EffectiveSeo, 'absoluteCanonical' | 'alternates' | 'issues'>): EffectiveSeo {
  const absoluteCanonical = new URL(input.canonical, siteBaseUrl()).toString();
  const effective: EffectiveSeo = {
    ...input,
    absoluteCanonical,
    alternates: localeAlternates(input.canonical.replace(/^\/(?:ru|uz|en|zh)(?=\/|$)/, '') || ''),
    issues: [],
  };
  effective.issues = validateEffectiveSeo(effective);
  return effective;
}

export function getEffectiveProductSeo(
  product: Partial<Product>,
  locale: Language,
  settings: SiteSettings,
  categories: Category[],
): EffectiveSeo {
  const name = localizedProductTitle(product, locale);
  const explicitTitle = exactSeoField(product.seo, 'title', locale);
  const explicitDescription = exactSeoField(product.seo, 'description', locale);
  const entityDescription = localizedProductDescription(product, locale);
  const requestPrice = product.priceMode === 'request' || product.priceMode === 'informational' || product.showPrice === false;
  const generatedDescription = PRODUCT_FALLBACKS[locale][requestPrice ? 'request' : 'standard'](name);
  const path = `/product/${product.slug?.trim() || 'draft'}`;
  const image = hasProductImage(product.mainImage) ? product.mainImage : settings.company.logo || undefined;
  const productForIndexability = product as Pick<Product, 'status' | 'slug' | 'categoryId' | 'categorySlug'>;
  const effective = finalizeEffectiveSeo({
    title: explicitTitle || (name ? truncateAtWord(withCompanyName(name, settings.company.name), 70) : ''),
    description: explicitDescription || (entityDescription ? truncateAtWord(entityDescription, 180) : name ? generatedDescription : ''),
    canonical: `/${locale}${path}`,
    image,
    indexable: Boolean(product.status && product.slug && product.categoryId)
      && isProductSeoIndexable(productForIndexability, categories),
    titleSource: explicitTitle ? 'override' : 'generated',
    descriptionSource: explicitDescription ? 'override' : entityDescription ? 'entity' : 'generated',
    imageSource: hasProductImage(product.mainImage) ? 'entity' : settings.company.logo ? 'site' : 'missing',
  });
  if (!name) effective.issues.unshift('Нет названия товара для SEO');
  return effective;
}

export function buildProductMetadata(
  product: Partial<Product>,
  locale: Language,
  settings: SiteSettings,
  categories: Category[],
): Metadata {
  const effective = getEffectiveProductSeo(product, locale, settings, categories);
  return buildSeoMetadata({
    locale,
    path: effective.canonical.replace(`/${locale}`, ''),
    title: effective.title,
    description: effective.description,
    settings,
    image: effective.image,
    titleIsExplicit: true,
    index: effective.indexable,
  });
}

export function getEffectiveCategorySeo(
  category: Partial<Category>,
  locale: Language,
  settings: SiteSettings,
  categories: Category[],
): EffectiveSeo {
  const name = localizedCategoryTitle(category, locale);
  const explicitTitle = exactSeoField(category.seo, 'title', locale);
  const explicitDescription = exactSeoField(category.seo, 'description', locale);
  const entityDescription = localizedCategoryDescription(category, locale);
  const persisted = category.id ? categories.find((candidate) => candidate.id === category.id) : undefined;
  const path = persisted ? getCategoryPath(persisted, categories) : `/catalog/${category.slug?.trim() || 'draft'}`;
  const entityImage = category.cardImage || category.navigationImage || category.image;
  const image = entityImage || settings.company.logo || undefined;
  const effective = finalizeEffectiveSeo({
    title: explicitTitle || (name ? truncateAtWord(withCompanyName(name, settings.company.name), 70) : ''),
    description: explicitDescription || (entityDescription ? truncateAtWord(entityDescription, 180) : name ? CATEGORY_FALLBACKS[locale](name) : ''),
    canonical: `/${locale}${path}`,
    image,
    indexable: Boolean(persisted && isCategorySeoIndexable(persisted, categories)),
    titleSource: explicitTitle ? 'override' : 'generated',
    descriptionSource: explicitDescription ? 'override' : entityDescription ? 'entity' : 'generated',
    imageSource: entityImage ? 'entity' : settings.company.logo ? 'site' : 'missing',
  });
  if (!name) effective.issues.unshift('Нет названия категории для SEO');
  return effective;
}

export function buildCategoryMetadata(
  category: Category,
  locale: Language,
  settings: SiteSettings,
  categories: Category[],
): Metadata {
  const effective = getEffectiveCategorySeo(category, locale, settings, categories);
  return buildSeoMetadata({
    locale,
    path: effective.canonical.replace(`/${locale}`, ''),
    title: effective.title,
    description: effective.description,
    settings,
    image: effective.image,
    titleIsExplicit: true,
    index: effective.indexable,
  });
}

/** Lightweight default for future localized public content routes. */
export function buildContentMetadata(input: {
  locale: Language;
  path: string;
  title: string;
  description?: string;
  image?: string;
  settings: SiteSettings;
  indexable?: boolean;
  titleIsExplicit?: boolean;
}) {
  return buildSeoMetadata({
    locale: input.locale,
    path: input.path,
    title: input.title,
    description: input.description,
    image: input.image,
    settings: input.settings,
    index: input.indexable ?? true,
    titleIsExplicit: input.titleIsExplicit,
  });
}

export function validateEffectiveSeo(effective: Omit<EffectiveSeo, 'issues'>) {
  const issues: string[] = [];
  if (!effective.title.trim()) issues.push('Нет индексируемого title');
  if (!effective.description.trim()) issues.push('Нет usable description');
  try {
    const canonical = new URL(effective.absoluteCanonical);
    if (canonical.host !== new URL(siteBaseUrl()).host) issues.push('Canonical указывает на другой домен');
  } catch {
    issues.push('Canonical некорректен');
  }
  if (!effective.alternates.ru || !effective.alternates.uz || !effective.alternates.en || !effective.alternates.zh || !effective.alternates['x-default']) {
    issues.push('Не хватает языковых alternate URL');
  }
  if (!effective.image) issues.push('Нет изображения для social preview');
  return issues;
}

export function buildProductImageAlt(input: {
  product: Partial<Product>;
  locale: Language;
  variant?: Partial<ProductVariant>;
  galleryIndex?: number;
  explicitAlt?: string;
}) {
  const explicit = cleanText(input.explicitAlt);
  if (explicit) return explicit;
  const productName = localizedProductTitle(input.product, input.locale);
  const variantName = input.variant ? localizedField(input.locale, {
    ru: input.variant.titleRu,
    uz: input.variant.titleUz,
    en: input.variant.titleEn,
    zh: input.variant.titleZh,
  }) : '';
  const base = [productName, variantName].filter(Boolean).join(', ');
  if (!base) return '';
  return input.galleryIndex && input.galleryIndex > 1
    ? `${base} — ${GALLERY_VIEW_LABELS[input.locale](input.galleryIndex)}`
    : base;
}

export function safeSitemapLastModified(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
