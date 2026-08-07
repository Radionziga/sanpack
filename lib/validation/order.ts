import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'new',
  'processing',
  'fulfilled',
  'cancelled',
]);

export const checkoutLineSchema = z.object({
  productId: z.string().trim().min(1).max(160),
  variantId: z.string().trim().min(1).max(160).optional(),
  quantity: z.number().positive().max(1_000_000),
  comment: z.string().trim().max(500).optional(),
}).strict();

export const checkoutRequestSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  items: z.array(checkoutLineSchema).min(1).max(100),
  telegramInitData: z.string().max(16_000).optional(),
}).strict();

export const adminOrderLineSchema = checkoutLineSchema.extend({
  lineId: z.string().trim().min(1).max(160).optional(),
  unitPrice: z.number().nonnegative().max(1_000_000_000_000).optional(),
}).strict();

export const adminOrderUpdateSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  status: orderStatusSchema,
  notes: z.string().trim().max(2_000).optional().default(''),
  adjustment: z.number().min(-1_000_000_000_000).max(1_000_000_000_000).default(0),
  items: z.array(adminOrderLineSchema).min(1).max(200),
}).strict();

export const telegramSettingsMutationSchema = z.object({
  login: z.object({
    enabled: z.boolean(),
    clientId: z.string().trim().regex(/^\d{5,24}$/, 'Client ID должен состоять из цифр.').optional().or(z.literal('')),
    clientSecret: z.string().trim().min(16).max(500).optional().or(z.literal('')),
    redirectUri: z.string().trim().url().refine(
      (value) => value.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(value),
      'Для рабочего сайта нужен HTTPS-адрес.'
    ).optional().or(z.literal('')),
    requestPhone: z.boolean(),
    allowBotMessages: z.boolean(),
  }).strict(),
  storefront: z.object({
    enabled: z.boolean(),
    botUsername: z.string().trim().regex(/^[A-Za-z0-9_]{5,32}$/).optional().or(z.literal('')),
    botToken: z.string().trim().min(30).max(200).optional().or(z.literal('')),
    webAppUrl: z.string().trim().url().optional().or(z.literal('')),
  }).strict(),
  notifications: z.object({
    enabled: z.boolean(),
    botToken: z.string().trim().min(30).max(200).optional().or(z.literal('')),
    chatId: z.string().trim().regex(/^-?\d+$/).optional().or(z.literal('')),
  }).strict(),
}).strict();

export const internalDocumentSettingsSchema = z.object({
  documentTitle: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(240).optional().default(''),
  taxId: z.string().trim().max(40).optional().default(''),
  address: z.string().trim().max(500).optional().default(''),
  phone: z.string().trim().max(50).optional().default(''),
  email: z.string().trim().email().optional().or(z.literal('')).default(''),
  bankDetails: z.string().trim().max(1000).optional().default(''),
  logoUrl: z.string().trim().max(500).optional().default(''),
  footerText: z.string().trim().max(500).optional().default(''),
  numberPrefix: z.string().trim().min(1).max(16),
  showSignatureFields: z.boolean(),
  showStampPlaceholder: z.boolean(),
}).strict();

export type CheckoutRequestInput = z.infer<typeof checkoutRequestSchema>;
export type CheckoutLineInput = z.infer<typeof checkoutLineSchema>;
export type AdminOrderUpdateInput = z.infer<typeof adminOrderUpdateSchema>;
export type TelegramSettingsMutation = z.infer<typeof telegramSettingsMutationSchema>;
