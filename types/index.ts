export type Language = 'ru' | 'uz' | 'en' | 'zh';

export type SalesMode = 'request_only' | 'ecommerce';

export type ProductPriceMode =
  | 'fixed'
  | 'from'
  | 'request'
  | 'informational';

export type ProductAvailability =
  | 'in_stock'
  | 'on_order'
  | 'temporarily_unavailable'
  | 'discontinued'
  | 'unavailable'
  | 'informational';

export type QuantityUnit =
  | 'piece'
  | 'gram'
  | 'kilogram'
  | 'milliliter'
  | 'liter'
  | 'meter'
  | 'square_meter'
  | 'pack'
  | 'roll'
  | 'box'
  | 'set'
  | 'service'
  | 'custom';

export type UserRole = 'super_admin' | 'content_manager' | 'sales_manager' | 'viewer';

export type ProductStatus = 'draft' | 'published' | 'hidden' | 'archived';

export type StockStatus =
  | 'in_stock'
  | 'out_of_stock'
  | 'on_order'
  | 'temporarily_unavailable'
  | 'discontinued';

export interface WholesaleTier {
  minQuantity: number;
  price: number;
  nameRu?: string;
  nameUz?: string;
  nameEn?: string;
  nameZh?: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
  titleZh?: string;
  price?: number;
  oldPrice?: number;
  wholesaleTiers?: WholesaleTier[];
  stockStatus: StockStatus;
  stockQuantity?: number;
  attributes: Record<string, string>;
  image?: string;
  minOrder?: number;
  priceMode?: ProductPriceMode;
  availability?: ProductAvailability;
  quantityStep?: number;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface ProductDocument {
  id: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
  titleZh?: string;
  url: string;
  type: string; // e.g. 'pdf', 'cert', 'spec'
  size?: string;
}

export interface ProductOrderPackaging {
  enabled: boolean;
  nameRu: string;
  nameUz?: string;
  nameEn?: string;
  nameZh?: string;
  unitsPerPackage: number;
  minimumPackages: number;
  packageStep: number;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  brandId?: string;
  brandName?: string;
  categoryId: string;
  categorySlug: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
  titleZh?: string;
  shortDescriptionRu: string;
  shortDescriptionUz: string;
  shortDescriptionEn?: string;
  shortDescriptionZh?: string;
  descriptionRu: string;
  descriptionUz: string;
  descriptionEn?: string;
  descriptionZh?: string;
  images: string[];
  /** Firebase Storage paths aligned with managed product images when available. */
  imagePaths?: string[];
  mainImage: string;
  mainImagePath?: string;
  attributes: Record<string, string | number | boolean | string[]>;
  variants: ProductVariant[];
  price?: number;
  oldPrice?: number;
  wholesaleTiers?: WholesaleTier[];
  currency: string;
  showPrice: boolean;
  stockStatus: StockStatus;
  stockQuantity?: number;
  minimumOrder: number;
  salesUnit: string; // 'рулон', 'пачка', 'упаковка', 'коробка', 'кг', 'шт'
  unitCode?: QuantityUnit;
  quantityStep?: number;
  maximumOrder?: number;
  catchWeight?: boolean;
  orderPackaging?: ProductOrderPackaging;
  priceMode?: ProductPriceMode;
  availability?: ProductAvailability;
  featured: boolean;
  newProduct: boolean;
  ownProduction: boolean;
  relatedProductIds?: string[];
  accessoryProductIds?: string[];
  documents?: ProductDocument[];
  seo?: {
    titleRu?: string;
    titleUz?: string;
    titleEn?: string;
    titleZh?: string;
    descriptionRu?: string;
    descriptionUz?: string;
    descriptionEn?: string;
    descriptionZh?: string;
  };
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Category {
  id: string;
  parentId?: string | null;
  slug: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
  titleZh?: string;
  descriptionRu?: string;
  descriptionUz?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  image?: string;
  imagePath?: string;
  icon?: string;
  banner?: string;
  attributeIds?: string[];
  status: 'active' | 'hidden';
  sortOrder: number;
  seo?: {
    titleRu?: string;
    titleUz?: string;
    titleEn?: string;
    titleZh?: string;
    descriptionRu?: string;
    descriptionUz?: string;
    descriptionEn?: string;
    descriptionZh?: string;
  };
}

export type AttributeType = 'text' | 'number' | 'select' | 'multiselect' | 'range' | 'boolean' | 'color';

export interface AttributeOption {
  value: string;
  labelRu: string;
  labelUz: string;
  labelEn?: string;
  labelZh?: string;
}

export interface Attribute {
  id: string;
  key: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
  titleZh?: string;
  type: AttributeType;
  unit?: string;
  options?: AttributeOption[];
  filterable: boolean;
  required: boolean;
  cardVisible: boolean;
  productVisible: boolean;
  categoryIds?: string[];
  sortOrder: number;
}

export interface RequestItem {
  lineId?: string;
  productId: string;
  productTitleRu: string;
  productTitleUz?: string;
  productTitleEn?: string;
  productTitleZh?: string;
  productSlug: string;
  variantId?: string;
  variantTitleRu?: string;
  variantTitleUz?: string;
  variantTitleEn?: string;
  variantTitleZh?: string;
  sku: string;
  quantity: number;
  unit: string;
  price?: number;
  priceMode?: ProductPriceMode;
  lineTotal?: number;
  comment?: string;
  image?: string;
  product?: Product;
  variant?: ProductVariant;
}

export type RequestStatus =
  | 'new'
  | 'viewed'
  | 'in_progress'
  | 'clarification'
  | 'offer_sent'
  | 'completed'
  | 'canceled';

export interface CustomerInfo {
  name: string;
  company?: string;
  phone: string;
  email?: string;
  messenger?: 'telegram' | 'whatsapp' | 'phone';
  city?: string;
  address?: string;
  inn?: string;
}

export interface RequestOrder {
  id: string;
  requestNumber: string;
  companyName?: string;
  inn?: string;
  contactName: string;
  phone: string;
  phoneNormalized?: string;
  customerUid?: string;
  source?: 'web' | 'telegram_mini_app' | 'admin';
  telegramUser?: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  };
  deliveryType?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  deliveryWindow?: string;
  paymentMethod?: string;
  notes?: string;
  items: RequestItem[];
  originalItems?: RequestItem[];
  status: 'new' | 'processing' | 'fulfilled' | 'cancelled';
  currency?: 'UZS';
  subtotal?: number;
  adjustment?: number;
  total?: number;
  revision?: number;
  auditTrail?: OrderAuditEntry[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderAuditEntry {
  id: string;
  action: 'created' | 'status_changed' | 'order_edited' | 'document_generated';
  actorUid?: string;
  actorLabel: string;
  createdAt: string;
  summary: string;
  revision: number;
}

export type B2BRequest = RequestOrder;

export interface ClientPartner {
  id: string;
  name: string;
  logo: string;
  category: 'restaurant' | 'cafe' | 'hotel' | 'bakery' | 'distributor' | 'production' | 'shop' | 'partner';
  descriptionRu?: string;
  descriptionUz?: string;
  descriptionEn?: string;
  descriptionZh?: string;
  website?: string;
  caseStudy?: string;
  sortOrder: number;
}

export interface Banner {
  id: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
  titleZh?: string;
  subtitleRu?: string;
  subtitleUz?: string;
  subtitleEn?: string;
  subtitleZh?: string;
  imageDesktop: string;
  imageDesktopPath?: string;
  imageMobile?: string;
  imageMobilePath?: string;
  buttonTextRu?: string;
  buttonTextUz?: string;
  buttonTextEn?: string;
  buttonTextZh?: string;
  link: string;
  sortOrder: number;
  active: boolean;
}

export interface SiteSettings {
  company: {
    name: string;
    logo: string;
    logoDark?: string;
    favicon: string;
    descriptionRu: string;
    descriptionUz: string;
    descriptionEn?: string;
    descriptionZh?: string;
  };
  contacts: {
    phone1: string;
    phone2: string;
    email: string;
    addressRu: string;
    addressUz: string;
    addressEn?: string;
    addressZh?: string;
    workingHoursRu: string;
    workingHoursUz: string;
    workingHoursEn?: string;
    workingHoursZh?: string;
    telegram: string;
    whatsapp: string;
    cityRu: string;
    cityUz: string;
    cityEn?: string;
    cityZh?: string;
    mapIframe?: string;
  };
  salesMode: SalesMode;
  commerce?: {
    currency: 'UZS';
    checkoutFields: {
      name: true;
      phone: true;
    };
  };
  locale: {
    defaultLanguage: Language;
    supportedLanguages: Language[];
  };
  design: {
    designVersion?: 2;
    primaryColor: string;
    secondaryColor: string;
    borderRadius: number;
    themeMode: 'light' | 'dark';
    fontPair?: 'brand' | 'modern' | 'editorial' | 'neutral';
  };
  seo: {
    defaultTitleRu: string;
    defaultTitleUz: string;
    defaultTitleEn?: string;
    defaultTitleZh?: string;
    defaultDescriptionRu: string;
    defaultDescriptionUz: string;
    defaultDescriptionEn?: string;
    defaultDescriptionZh?: string;
  };
  modules?: {
    bagDesigner?: {
      enabled: boolean;
    };
  };
}

export interface TelegramPrivateSettings {
  login: {
    enabled: boolean;
    clientId?: string;
    clientSecretEncrypted?: string;
    clientSecretLast4?: string;
    redirectUri?: string;
    requestPhone?: boolean;
    allowBotMessages?: boolean;
  };
  storefront: {
    enabled: boolean;
    botUsername?: string;
    tokenEncrypted?: string;
    tokenLast4?: string;
    webAppUrl?: string;
  };
  notifications: {
    enabled: boolean;
    tokenEncrypted?: string;
    tokenLast4?: string;
    chatId?: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface GeminiPrivateSettings {
  enabled: boolean;
  model: string;
  imageModel?: string;
  apiKeyEncrypted?: string;
  apiKeyLast4?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface InternalDocumentSettings {
  documentTitle: string;
  companyName: string;
  legalName?: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
  bankDetails?: string;
  logoUrl?: string;
  footerText?: string;
  numberPrefix: string;
  showSignatureFields: boolean;
  showStampPlaceholder: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}
