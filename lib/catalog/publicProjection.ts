import type { Attribute, Banner, Category, ClientPartner, Product, SiteSettings } from '@/types';
import { getVisibleCategories } from './categoryHierarchy';
import { filterPublicProducts } from './publicProducts';

// Explicit output allowlists, NOT mutation schemas: unknown Firestore fields
// (including nested private settings/audit fields) must never reach a client.
type Shape = { readonly [key: string]: true | 'values' | Shape | readonly [Shape] };
const fields = (keys: string): Shape => Object.fromEntries(keys.split(' ').map((key) => [key, true]));
const localized = (prefix: string) => fields(['Ru', 'Uz', 'En', 'Zh'].map((locale) => prefix + locale).join(' '));
const seo = { ...localized('title'), ...localized('description') };
const tiers = { ...fields('minQuantity price'), ...localized('name') };
const unitPricing = fields('quantity unit displayUnit');
const variant = {
  ...fields('id sku price oldPrice stockStatus stockQuantity image minOrder priceMode availability quantityStep minQuantity maxQuantity'),
  ...localized('title'), attributes: 'values', unitPricing, wholesaleTiers: [tiers],
} satisfies Shape;
const product = {
  ...fields('id slug sku status brandId brandName categoryId categorySlug images mainImage price oldPrice currency showPrice stockStatus stockQuantity minimumOrder salesUnit unitCode quantityStep maximumOrder catchWeight priceMode catalogPriceBasis availability featured newProduct ownProduction relatedProductIds accessoryProductIds sortOrder createdAt updatedAt'),
  ...localized('title'), ...localized('description'), ...localized('shortDescription'),
  attributes: 'values', variants: [variant], wholesaleTiers: [tiers], unitPricing, seo,
  orderPackaging: { ...fields('enabled unitsPerPackage minimumPackages packageStep'), ...localized('name') },
  documents: [{ ...fields('id url type size'), ...localized('title') }],
} satisfies Shape;
const category = {
  ...fields('id parentId slug image navigationImage cardImage icon banner featured featuredSortOrder attributeIds status sortOrder'),
  ...localized('title'), ...localized('description'), seo,
} satisfies Shape;
const attribute = {
  ...fields('id key type unit filterable required cardVisible productVisible categoryIds sortOrder'),
  ...localized('title'), options: [{ ...fields('value'), ...localized('label') }],
} satisfies Shape;
const service = fields('enabled navigationImage');
const settings = {
  company: { ...fields('name logo logoDark favicon'), ...localized('description') },
  contacts: { ...fields('phone1 phone2 email telegram whatsapp mapIframe'), ...localized('address'), ...localized('workingHours'), ...localized('city') },
  salesMode: true, commerce: { currency: true, checkoutFields: fields('name phone') },
  locale: fields('defaultLanguage supportedLanguages'),
  design: fields('designVersion primaryColor secondaryColor borderRadius themeMode fontPair'),
  seo: { ...localized('defaultTitle'), ...localized('defaultDescription') },
  modules: { branding: service, bagDesigner: service },
} satisfies Shape;

function primitive(value: unknown): boolean {
  return value === null || typeof value === 'string' || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value));
}

function project(value: unknown, shape: Shape): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, rule] of Object.entries(shape)) {
    if (!Object.hasOwn(source, key) || source[key] === undefined) continue;
    const entry = source[key];
    if (rule === true) {
      if (primitive(entry) || (Array.isArray(entry) && entry.every(primitive))) result[key] = entry;
    } else if (rule === 'values') {
      result[key] = Object.fromEntries(Object.entries(entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {})
        .filter(([name, item]) => !['__proto__', 'constructor', 'prototype'].includes(name)
          && (primitive(item) || (Array.isArray(item) && item.every((part) => typeof part === 'string')))));
    } else if (Array.isArray(rule)) {
      result[key] = Array.isArray(entry) ? entry.map((item) => project(item, rule[0])) : [];
    } else {
      result[key] = project(entry, rule as Shape);
    }
  }
  return result;
}

export const projectPublicProducts = (values: Product[]): Product[] => filterPublicProducts(values).map((value) => project(value, product) as unknown as Product);
export const projectPublicCategories = (values: Category[]): Category[] => getVisibleCategories(values).map((value) => project(value, category) as unknown as Category);
export const projectPublicAttributes = (values: Attribute[]): Attribute[] => values.map((value) => project(value, attribute) as unknown as Attribute);
export const projectPublicClients = (values: ClientPartner[]): ClientPartner[] => values.map((value) => project(value, {
  ...fields('id name logo category website caseStudy sortOrder'), ...localized('description'),
}) as unknown as ClientPartner);
export const projectPublicBanners = (values: Banner[]): Banner[] => values.filter((value) => value.active === true).map((value) => project(value, {
  ...fields('id imageDesktop imageMobile link sortOrder active'), ...localized('title'), ...localized('subtitle'), ...localized('buttonText'),
}) as unknown as Banner);
export const projectPublicSettings = (value: SiteSettings): SiteSettings => project(value, settings) as unknown as SiteSettings;
