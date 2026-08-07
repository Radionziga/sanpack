import { z } from 'zod';

const optionalText = z.string().trim().max(500).optional();
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
  buttonTextRu: optionalText,
  buttonTextUz: optionalText,
  buttonTextEn: optionalText,
  link: optionalUrl.default(''),
  sortOrder: z.number().int().min(0).max(100_000),
  active: z.boolean(),
}).strict();

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
  mapIframe: z.union([z.string().trim().url('Вставьте ссылку из атрибута src карты.'), z.literal('')]).optional(),
}).strict();

export const settingsMutationSchema = z.object({
  design: designSettingsSchema.optional(),
  contacts: contactSettingsSchema.optional(),
}).strict();

export function validateAdminResourceData(resource: string, data: unknown) {
  if (resource === 'categories') return categoryMutationSchema.safeParse(data);
  if (resource === 'banners') return bannerMutationSchema.safeParse(data);
  if (resource === 'settings') return settingsMutationSchema.safeParse(data);
  return { success: true, data } as const;
}
