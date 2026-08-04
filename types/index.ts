export type Language = 'ru' | 'uz' | 'en';

export type SalesMode = 'request_only' | 'ecommerce';

export type UserRole = 'super_admin' | 'content_manager' | 'sales_manager' | 'viewer';

export type ProductStatus = 'draft' | 'published' | 'hidden' | 'archived';

export type StockStatus = 'in_stock' | 'out_of_stock' | 'on_order';

export interface WholesaleTier {
  minQuantity: number;
  price: number;
  nameRu?: string;
  nameUz?: string;
  nameEn?: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
  price?: number;
  oldPrice?: number;
  wholesaleTiers?: WholesaleTier[];
  stockStatus: StockStatus;
  stockQuantity?: number;
  attributes: Record<string, string>;
  image?: string;
  minOrder?: number;
}

export interface ProductDocument {
  id: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
  url: string;
  type: string; // e.g. 'pdf', 'cert', 'spec'
  size?: string;
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
  shortDescriptionRu: string;
  shortDescriptionUz: string;
  shortDescriptionEn?: string;
  descriptionRu: string;
  descriptionUz: string;
  descriptionEn?: string;
  images: string[];
  mainImage: string;
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
    descriptionRu?: string;
    descriptionUz?: string;
    descriptionEn?: string;
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
  descriptionRu?: string;
  descriptionUz?: string;
  descriptionEn?: string;
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
    descriptionRu?: string;
    descriptionUz?: string;
    descriptionEn?: string;
  };
}

export type AttributeType = 'text' | 'number' | 'select' | 'multiselect' | 'range' | 'boolean' | 'color';

export interface AttributeOption {
  value: string;
  labelRu: string;
  labelUz: string;
  labelEn?: string;
}

export interface Attribute {
  id: string;
  key: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
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
  productId: string;
  productTitleRu: string;
  productTitleUz: string;
  productTitleEn?: string;
  productSlug: string;
  variantId?: string;
  variantTitleRu?: string;
  variantTitleUz?: string;
  variantTitleEn?: string;
  sku: string;
  quantity: number;
  unit: string;
  price?: number;
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
  deliveryType?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  notes?: string;
  items: RequestItem[];
  status: 'new' | 'processing' | 'fulfilled' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
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
  website?: string;
  caseStudy?: string;
  sortOrder: number;
}

export interface Banner {
  id: string;
  titleRu: string;
  titleUz: string;
  titleEn?: string;
  subtitleRu?: string;
  subtitleUz?: string;
  subtitleEn?: string;
  imageDesktop: string;
  imageDesktopPath?: string;
  imageMobile?: string;
  imageMobilePath?: string;
  buttonTextRu?: string;
  buttonTextUz?: string;
  buttonTextEn?: string;
  link: string;
  sortOrder: number;
  active: boolean;
}

export interface SiteSettings {
  company: {
    name: string;
    logo: string;
    favicon: string;
    descriptionRu: string;
    descriptionUz: string;
    descriptionEn?: string;
  };
  contacts: {
    phone1: string;
    phone2: string;
    email: string;
    addressRu: string;
    addressUz: string;
    addressEn?: string;
    workingHoursRu: string;
    workingHoursUz: string;
    workingHoursEn?: string;
    telegram: string;
    whatsapp: string;
    cityRu: string;
    cityUz: string;
    cityEn?: string;
    mapIframe?: string;
  };
  salesMode: SalesMode;
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
    defaultDescriptionRu: string;
    defaultDescriptionUz: string;
    defaultDescriptionEn?: string;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}
