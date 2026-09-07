import type { Attribute, Banner, Category, ClientPartner, Product, SiteSettings } from '@/types';

const SERVER_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']);

function withoutServerFields<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !SERVER_FIELDS.has(key)),
  ) as Partial<T>;
}

// These named boundaries deliberately keep read DTO metadata out of strict CMS
// mutation schemas. Do not replace them with schema passthrough behavior.
export const toProductMutationInput = (value: Partial<Product>) => withoutServerFields(value);
export const toCategoryMutationInput = (value: Partial<Category>) => withoutServerFields(value);
export const toAttributeMutationInput = (value: Partial<Attribute>) => withoutServerFields(value);
export const toClientMutationInput = (value: Partial<ClientPartner>) => withoutServerFields(value);
export const toBannerMutationInput = (value: Partial<Banner>) => withoutServerFields(value);
export const toSettingsMutationInput = (value: Partial<SiteSettings>) => withoutServerFields(value);
