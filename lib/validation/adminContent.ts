import { z } from 'zod';

const optionalText = z.string().trim().max(500).optional();
const optionalButtonText = z.string().trim().max(80).optional();
const optionalUrl = z.union([
  z.string().trim().url(),
  z.string().trim().regex(/^\/(?!\/)/, 'Используйте внутренний путь или полный URL.'),
  z.literal(''),
]).optional();
const assetUrl = z.union([
  z.string().trim().url(),
  z.string().trim().regex(/^\/(?!\/)/, 'Используйте внутренний путь или полный URL.'),
]);

export const categoryMutationSchema = z.object({
  parentId: z.string().trim().max(160).nullable().optional(),
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  titleRu: z.string().trim().min(1).max(160).optional(),
  titleUz: z.string().trim().min(1).max(160).optional(),
  titleEn: optionalText,
  descriptionRu: optionalText,
  descriptionUz: optionalText,
  descriptionEn: optionalText,
  image: optionalUrl,
  imagePath: z.string().trim().max(500).optional(),
  icon: optionalText,
  banner: optionalUrl,
  attributeIds: z.array(z.string().trim().max(160)).max(100).optional(),
  status: z.enum(['active', 'hidden']).optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
  seo: z.object({
    titleRu: optionalText,
    titleUz: optionalText,
    titleEn: optionalText,
    descriptionRu: optionalText,
    descriptionUz: optionalText,
    descriptionEn: optionalText,
  }).strict().optional(),
}).strict();

export const bannerMutationSchema = z.object({
  titleRu: z.string().trim().min(1).max(180),
  titleUz: z.string().trim().min(1).max(180),
  titleEn: optionalText,
  subtitleRu: optionalText,
  subtitleUz: optionalText,
  subtitleEn: optionalText,
  imageDesktop: assetUrl,
  imageDesktopPath: z.string().trim().max(500).optional(),
  imageMobile: assetUrl.optional(),
  imageMobilePath: z.string().trim().max(500).optional(),
  buttonTextRu: optionalButtonText,
  buttonTextUz: optionalButtonText,
  buttonTextEn: optionalButtonText,
  link: optionalUrl.default(''),
  sortOrder: z.number().int().min(0).max(100_000),
  active: z.boolean(),
}).strict().superRefine((values, context) => {
  const hasButtonText = Boolean(values.buttonTextRu || values.buttonTextUz || values.buttonTextEn);
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
  website: optionalUrl,
  caseStudy: optionalText,
  sortOrder: z.number().int().min(0).max(100_000),
}).strict();

const attributeOptionSchema = z.object({
  value: z.string().trim().min(1).max(160),
  labelRu: z.string().trim().min(1).max(160),
  labelUz: z.string().trim().min(1).max(160),
  labelEn: z.string().trim().max(160).optional(),
}).strict();

export const attributeMutationSchema = z.object({
  key: z.string().trim().min(1).max(80).regex(
    /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    'Используйте строчные латинские буквы, цифры и подчёркивания.',
  ),
  titleRu: z.string().trim().min(1).max(160),
  titleUz: z.string().trim().min(1).max(160),
  titleEn: z.string().trim().max(160).optional(),
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
  workingHoursRu: z.string().trim().min(2, 'Укажите график работы.').max(160),
  workingHoursUz: z.string().trim().max(160),
  workingHoursEn: z.string().trim().max(160).optional(),
  telegram: z.union([z.string().trim().url('Укажите полную ссылку Telegram.'), z.literal('')]),
  whatsapp: z.union([z.string().trim().url('Укажите полную ссылку WhatsApp.'), z.literal('')]),
  cityRu: z.string().trim().min(2, 'Укажите город.').max(160),
  cityUz: z.string().trim().max(160),
  cityEn: z.string().trim().max(160).optional(),
  mapIframe: z.union([z.string().trim().url('Вставьте полную ссылку на встроенную карту.'), z.literal('')]).optional(),
}).strict();

export const companySettingsSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  logo: optionalUrl,
  logoDark: optionalUrl,
  favicon: optionalUrl,
  descriptionRu: optionalText,
  descriptionUz: optionalText,
  descriptionEn: optionalText,
}).passthrough();

export const settingsMutationSchema = z.object({
  design: designSettingsSchema.optional(),
  contacts: contactSettingsSchema.optional(),
  company: companySettingsSchema.optional(),
}).passthrough();

const productOrderPackagingSchema = z.object({
  enabled: z.boolean(),
  nameRu: z.string().trim().max(80),
  nameUz: z.string().trim().max(80).optional(),
  nameEn: z.string().trim().max(80).optional(),
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
}).strict();

export const productVariantSchema = z.object({
  id: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(160),
  titleRu: z.string().trim().min(1).max(160),
  titleUz: z.string().trim().min(1).max(160),
  titleEn: z.string().trim().max(160).optional(),
  price: z.number().nonnegative().max(1_000_000_000_000).optional(),
  oldPrice: z.number().nonnegative().max(1_000_000_000_000).optional(),
  wholesaleTiers: z.array(wholesaleTierSchema).max(100).optional(),
  stockStatus: z.enum(['in_stock', 'out_of_stock', 'on_order', 'temporarily_unavailable', 'discontinued']),
  stockQuantity: z.number().nonnegative().max(1_000_000_000).optional(),
  attributes: z.record(z.string().trim().min(1).max(160), z.string().trim().max(500)),
  image: optionalUrl,
  minOrder: z.number().positive().max(1_000_000_000).optional(),
  priceMode: z.enum(['fixed', 'from', 'request', 'informational']).optional(),
  availability: z.enum(['in_stock', 'on_order', 'unavailable', 'informational']).optional(),
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
  salesUnit: z.string().trim().min(1).max(80).optional(),
  minimumOrder: z.number().positive().max(1_000_000_000).optional(),
  quantityStep: z.number().positive().max(1_000_000_000).optional(),
  maximumOrder: z.number().positive().max(1_000_000_000).optional(),
  priceMode: z.enum(['fixed', 'from', 'request', 'informational']).optional(),
  orderPackaging: productOrderPackagingSchema.optional(),
  variants: z.array(productVariantSchema).max(100).optional(),
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
