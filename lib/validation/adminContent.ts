import { z } from 'zod';

const optionalText = z.string().trim().max(500).optional();
const optionalButtonText = z.string().trim().max(80).optional();
const httpUrl = z.string().trim().url().refine(
  (value) => /^https?:\/\//i.test(value),
  'Используйте полный HTTP(S) URL.',
);
const optionalUrl = z.union([
  httpUrl,
  z.string().trim().regex(/^\/(?!\/)/, 'Используйте внутренний путь или полный URL.'),
  z.literal(''),
]).optional();
const assetUrl = z.union([
  httpUrl,
  z.string().trim().regex(/^\/(?!\/)/, 'Используйте внутренний путь или полный URL.'),
]);

export const categoryMutationSchema = z.object({
  parentId: z.string().trim().max(160).nullable().optional(),
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  titleRu: z.string().trim().min(1).max(160).optional(),
  titleUz: z.string().trim().min(1).max(160).optional(),
  titleEn: optionalText,
  titleZh: optionalText,
  descriptionRu: optionalText,
  descriptionUz: optionalText,
  descriptionEn: optionalText,
  descriptionZh: optionalText,
  image: optionalUrl,
  imagePath: z.string().trim().max(500).optional(),
  navigationImage: optionalUrl,
  navigationImagePath: z.string().trim().max(500).optional(),
  cardImage: optionalUrl,
  cardImagePath: z.string().trim().max(500).optional(),
  icon: optionalText,
  banner: optionalUrl,
  featured: z.boolean().optional(),
  featuredSortOrder: z.number().int().min(0).max(100_000).optional(),
  attributeIds: z.array(z.string().trim().max(160)).max(100).optional(),
  status: z.enum(['active', 'hidden']).optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
  seo: z.object({
    titleRu: optionalText,
    titleUz: optionalText,
    titleEn: optionalText,
    titleZh: optionalText,
    descriptionRu: optionalText,
    descriptionUz: optionalText,
    descriptionEn: optionalText,
    descriptionZh: optionalText,
  }).strict().optional(),
}).strict();

export const bannerMutationSchema = z.object({
  titleRu: z.string().trim().min(1).max(180),
  titleUz: z.string().trim().min(1).max(180),
  titleEn: optionalText,
  titleZh: optionalText,
  subtitleRu: optionalText,
  subtitleUz: optionalText,
  subtitleEn: optionalText,
  subtitleZh: optionalText,
  imageDesktop: assetUrl,
  imageDesktopPath: z.string().trim().max(500).optional(),
  imageMobile: assetUrl.optional(),
  imageMobilePath: z.string().trim().max(500).optional(),
  buttonTextRu: optionalButtonText,
  buttonTextUz: optionalButtonText,
  buttonTextEn: optionalButtonText,
  buttonTextZh: optionalButtonText,
  link: optionalUrl.default(''),
  sortOrder: z.number().int().min(0).max(100_000),
  active: z.boolean(),
}).strict().superRefine((values, context) => {
  const hasButtonText = Boolean(values.buttonTextRu || values.buttonTextUz || values.buttonTextEn || values.buttonTextZh);
  if (hasButtonText && !values.link) {
    context.addIssue({
      code: 'custom',
      path: ['link'],
      message: 'Добавьте ссылку для кнопки.',
    });
  }
});

export const clientMutationSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название партнёра.').max(160),
  logo: assetUrl,
  category: z.enum([
    'restaurant',
    'cafe',
    'hotel',
    'bakery',
    'distributor',
    'production',
    'shop',
    'partner',
  ]),
  descriptionRu: optionalText,
  descriptionUz: optionalText,
  descriptionEn: optionalText,
  descriptionZh: optionalText,
  website: optionalUrl,
  caseStudy: optionalText,
  sortOrder: z.number().int().min(0).max(100_000),
}).strict();

const attributeOptionSchema = z.object({
  value: z.string().trim().min(1).max(160),
  labelRu: z.string().trim().min(1).max(160),
  labelUz: z.string().trim().min(1).max(160),
  labelEn: z.string().trim().max(160).optional(),
  labelZh: z.string().trim().max(160).optional(),
}).strict();

export const attributeMutationSchema = z.object({
  key: z.string().trim().min(1).max(80).regex(
    /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    'Используйте строчные латинские буквы, цифры и подчёркивания.',
  ),
  titleRu: z.string().trim().min(1).max(160),
  titleUz: z.string().trim().min(1).max(160),
  titleEn: z.string().trim().max(160).optional(),
  titleZh: z.string().trim().max(160).optional(),
  type: z.enum(['text', 'number', 'select', 'multiselect', 'range', 'boolean', 'color']),
  unit: z.string().trim().max(50).optional(),
  options: z.array(attributeOptionSchema).max(100).optional(),
  filterable: z.boolean(),
  required: z.boolean().optional().default(false),
  cardVisible: z.boolean(),
  productVisible: z.boolean(),
  categoryIds: z.array(z.string().trim().min(1).max(160)).max(100).optional(),
  sortOrder: z.number().int().min(0).max(100_000),
}).strict().superRefine((values, context) => {
  const optionValues = new Set<string>();
  for (const [index, option] of (values.options || []).entries()) {
    const normalizedValue = option.value.toLocaleLowerCase();
    if (optionValues.has(normalizedValue)) {
      context.addIssue({
        code: 'custom',
        path: ['options', index, 'value'],
        message: 'Значения вариантов не должны повторяться.',
      });
    }
    optionValues.add(normalizedValue);
  }
});

export const designSettingsSchema = z.object({
  designVersion: z.literal(2).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Укажите цвет в формате #RRGGBB.'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Укажите цвет в формате #RRGGBB.'),
  borderRadius: z.number().int().min(0).max(32),
  themeMode: z.enum(['light', 'dark']),
  fontPair: z.enum(['brand', 'modern', 'editorial', 'neutral']).optional(),
}).strict();

export const contactSettingsSchema = z.object({
  phone1: z.string().trim().min(5, 'Укажите основной номер.').max(50),
  phone2: z.string().trim().max(50),
  email: z.union([z.string().trim().email('Проверьте email.'), z.literal('')]),
  addressRu: z.string().trim().min(2, 'Укажите адрес.').max(500),
  addressUz: z.string().trim().max(500),
  addressEn: z.string().trim().max(500).optional(),
  addressZh: z.string().trim().max(500).optional(),
  workingHoursRu: z.string().trim().min(2, 'Укажите график работы.').max(160),
  workingHoursUz: z.string().trim().max(160),
  workingHoursEn: z.string().trim().max(160).optional(),
  workingHoursZh: z.string().trim().max(160).optional(),
  telegram: z.union([z.string().trim().url('Укажите полную ссылку Telegram.'), z.literal('')]),
  whatsapp: z.union([z.string().trim().url('Укажите полную ссылку WhatsApp.'), z.literal('')]),
  cityRu: z.string().trim().min(2, 'Укажите город.').max(160),
  cityUz: z.string().trim().max(160),
  cityEn: z.string().trim().max(160).optional(),
  cityZh: z.string().trim().max(160).optional(),
  mapIframe: z.union([httpUrl, z.literal('')]).optional(),
}).strict();

export const companySettingsSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  logo: optionalUrl,
  logoDark: optionalUrl,
  favicon: optionalUrl,
  descriptionRu: optionalText,
  descriptionUz: optionalText,
  descriptionEn: optionalText,
  descriptionZh: optionalText,
}).passthrough();

const storefrontServiceSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  navigationImage: optionalUrl,
  navigationImagePath: z.string().trim().max(500).optional(),
}).strict();

export const settingsMutationSchema = z.object({
  design: designSettingsSchema.optional(),
  contacts: contactSettingsSchema.optional(),
  company: companySettingsSchema.optional(),
  modules: z.object({
    branding: storefrontServiceSettingsSchema.optional(),
    bagDesigner: storefrontServiceSettingsSchema.optional(),
  }).strict().optional(),
}).passthrough();

const productOrderPackagingSchema = z.object({
  enabled: z.boolean(),
  nameRu: z.string().trim().max(80),
  nameUz: z.string().trim().max(80).optional(),
  nameEn: z.string().trim().max(80).optional(),
  nameZh: z.string().trim().max(80).optional(),
  unitsPerPackage: z.number().int().min(1).max(1_000_000),
  minimumPackages: z.number().int().min(1).max(1_000_000),
  packageStep: z.number().int().min(1).max(1_000_000),
}).strict().superRefine((values, context) => {
  if (values.enabled && !values.nameRu) {
    context.addIssue({
      code: 'custom',
      path: ['nameRu'],
      message: 'Укажите название внешней упаковки.',
    });
  }
});

const wholesaleTierSchema = z.object({
  minQuantity: z.number().positive().max(1_000_000_000),
  price: z.number().nonnegative().max(1_000_000_000_000),
  nameRu: z.string().trim().max(160).optional(),
  nameUz: z.string().trim().max(160).optional(),
  nameEn: z.string().trim().max(160).optional(),
  nameZh: z.string().trim().max(160).optional(),
}).strict();

const productAttributeValueSchema = z.union([
  z.string().trim().max(500),
  z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000),
  z.boolean(),
  z.array(z.string().trim().min(1).max(500)).max(100),
]);

const productSeoSchema = z.object({
  titleRu: z.string().trim().max(200).optional(),
  titleUz: z.string().trim().max(200).optional(),
  titleEn: z.string().trim().max(200).optional(),
  titleZh: z.string().trim().max(200).optional(),
  descriptionRu: z.string().trim().max(1_000).optional(),
  descriptionUz: z.string().trim().max(1_000).optional(),
  descriptionEn: z.string().trim().max(1_000).optional(),
  descriptionZh: z.string().trim().max(1_000).optional(),
}).strict();

const productDocumentSchema = z.object({
  id: z.string().trim().min(1).max(160),
  titleRu: z.string().trim().min(1).max(200),
  titleUz: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().max(200).optional(),
  titleZh: z.string().trim().max(200).optional(),
  url: assetUrl,
  type: z.string().trim().min(1).max(80),
  size: z.string().trim().max(80).optional(),
}).strict();

const stockStatusSchema = z.enum([
  'in_stock',
  'out_of_stock',
  'on_order',
  'temporarily_unavailable',
  'discontinued',
]);

const productAvailabilitySchema = z.enum([
  'in_stock',
  'on_order',
  'temporarily_unavailable',
  'discontinued',
  'unavailable',
  'informational',
]);

const quantityUnitSchema = z.enum([
  'piece',
  'gram',
  'kilogram',
  'milliliter',
  'liter',
  'meter',
  'square_meter',
  'pack',
  'roll',
  'box',
  'set',
  'service',
  'custom',
]);

export const productVariantSchema = z.object({
  id: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(160),
  titleRu: z.string().trim().min(1).max(160),
  titleUz: z.string().trim().min(1).max(160),
  titleEn: z.string().trim().max(160).optional(),
  titleZh: z.string().trim().max(160).optional(),
  price: z.number().nonnegative().max(1_000_000_000_000).optional(),
  oldPrice: z.number().nonnegative().max(1_000_000_000_000).optional(),
  wholesaleTiers: z.array(wholesaleTierSchema).max(100).optional(),
  stockStatus: stockStatusSchema,
  stockQuantity: z.number().nonnegative().max(1_000_000_000).optional(),
  attributes: z.record(z.string().trim().min(1).max(160), z.string().trim().max(500)),
  image: optionalUrl,
  minOrder: z.number().positive().max(1_000_000_000).optional(),
  priceMode: z.enum(['fixed', 'from', 'request', 'informational']).optional(),
  availability: productAvailabilitySchema.optional(),
  quantityStep: z.number().positive().max(1_000_000_000).optional(),
  minQuantity: z.number().positive().max(1_000_000_000).optional(),
  maxQuantity: z.number().positive().max(1_000_000_000).optional(),
}).strict().superRefine((values, context) => {
  if (Object.keys(values.attributes).length > 30) {
    context.addIssue({
      code: 'custom',
      path: ['attributes'],
      message: 'У одного варианта может быть не более 30 характеристик.',
    });
  }
  const minimum = values.minQuantity ?? values.minOrder;
  if (minimum !== undefined && values.maxQuantity !== undefined && values.maxQuantity < minimum) {
    context.addIssue({
      code: 'custom',
      path: ['maxQuantity'],
      message: 'Максимум не может быть меньше минимального количества.',
    });
  }
});

export const productMutationSchema = z.object({
  id: z.string().trim().min(1).max(160).optional(),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  sku: z.string().trim().min(1).max(160).optional(),
  status: z.enum(['draft', 'published', 'hidden', 'archived']).optional(),
  brandId: z.string().trim().max(160).optional(),
  brandName: z.string().trim().max(200).optional(),
  categoryId: z.string().trim().min(1).max(160).optional(),
  categorySlug: z.string().trim().max(180).optional(),
  titleRu: z.string().trim().min(1).max(200).optional(),
  titleUz: z.string().trim().min(1).max(200).optional(),
  titleEn: z.string().trim().max(200).optional(),
  titleZh: z.string().trim().max(200).optional(),
  shortDescriptionRu: z.string().trim().max(2_000).optional(),
  shortDescriptionUz: z.string().trim().max(2_000).optional(),
  shortDescriptionEn: z.string().trim().max(2_000).optional(),
  shortDescriptionZh: z.string().trim().max(2_000).optional(),
  descriptionRu: z.string().trim().max(20_000).optional(),
  descriptionUz: z.string().trim().max(20_000).optional(),
  descriptionEn: z.string().trim().max(20_000).optional(),
  descriptionZh: z.string().trim().max(20_000).optional(),
  images: z.array(assetUrl).max(100).optional(),
  imagePaths: z.array(z.string().trim().max(500)).max(100).optional(),
  mainImage: optionalUrl,
  mainImagePath: z.string().trim().max(500).optional(),
  attributes: z.record(
    z.string().trim().min(1).max(160),
    productAttributeValueSchema,
  ).optional(),
  price: z.number().nonnegative().max(1_000_000_000_000).optional(),
  oldPrice: z.number().nonnegative().max(1_000_000_000_000).optional(),
  wholesaleTiers: z.array(wholesaleTierSchema).max(100).optional(),
  currency: z.string().trim().min(1).max(20).optional(),
  showPrice: z.boolean().optional(),
  stockStatus: stockStatusSchema.optional(),
  stockQuantity: z.number().nonnegative().max(1_000_000_000).optional(),
  salesUnit: z.string().trim().min(1).max(80).optional(),
  unitCode: quantityUnitSchema.optional(),
  minimumOrder: z.number().positive().max(1_000_000_000).optional(),
  quantityStep: z.number().positive().max(1_000_000_000).optional(),
  maximumOrder: z.number().positive().max(1_000_000_000).optional(),
  catchWeight: z.boolean().optional(),
  priceMode: z.enum(['fixed', 'from', 'request', 'informational']).optional(),
  availability: productAvailabilitySchema.optional(),
  orderPackaging: productOrderPackagingSchema.optional(),
  variants: z.array(productVariantSchema).max(100).optional(),
  featured: z.boolean().optional(),
  newProduct: z.boolean().optional(),
  ownProduction: z.boolean().optional(),
  relatedProductIds: z.array(z.string().trim().min(1).max(160)).max(100).optional(),
  accessoryProductIds: z.array(z.string().trim().min(1).max(160)).max(100).optional(),
  documents: z.array(productDocumentSchema).max(100).optional(),
  seo: productSeoSchema.optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
  createdAt: z.string().trim().max(100).optional(),
  updatedAt: z.string().trim().max(100).optional(),
  createdBy: z.string().trim().max(160).optional(),
  updatedBy: z.string().trim().max(160).optional(),
}).passthrough().superRefine((values, context) => {
  if (
    values.maximumOrder !== undefined &&
    values.minimumOrder !== undefined &&
    values.maximumOrder < values.minimumOrder
  ) {
    context.addIssue({
      code: 'custom',
      path: ['maximumOrder'],
      message: 'Максимум не может быть меньше минимального заказа.',
    });
  }

  const variantIds = new Set<string>();
  const variantSkus = new Set<string>();
  for (const [index, variant] of (values.variants || []).entries()) {
    if (variantIds.has(variant.id)) {
      context.addIssue({
        code: 'custom',
        path: ['variants', index, 'id'],
        message: 'У каждого варианта должен быть уникальный идентификатор.',
      });
    }
    if (variantSkus.has(variant.sku.toLocaleLowerCase())) {
      context.addIssue({
        code: 'custom',
        path: ['variants', index, 'sku'],
        message: 'Артикулы вариантов не должны повторяться.',
      });
    }
    variantIds.add(variant.id);
    variantSkus.add(variant.sku.toLocaleLowerCase());
  }
});

export function validateAdminResourceData(resource: string, data: unknown) {
  if (resource === 'products') return productMutationSchema.safeParse(data);
  if (resource === 'categories') return categoryMutationSchema.safeParse(data);
  if (resource === 'attributes') return attributeMutationSchema.safeParse(data);
  if (resource === 'clients') return clientMutationSchema.safeParse(data);
  if (resource === 'banners') return bannerMutationSchema.safeParse(data);
  if (resource === 'settings') return settingsMutationSchema.safeParse(data);
  return { success: true, data } as const;
}
