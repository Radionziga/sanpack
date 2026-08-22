import type {
  Attribute,
  Banner,
  Category,
  ClientPartner,
  Product,
  RequestOrder,
  SiteSettings,
} from '@/types';
import {
  findPublicProductById,
  findPublicProductBySlug,
} from '@/lib/catalog/publicProducts';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';

async function read<T>(resource: string): Promise<T> {
  const response = await fetch(`/api/catalog?resource=${resource}`);
  return parseJsonResponse<T>(response, 'Не удалось загрузить данные каталога.');
}

export const PublicRepository = {
  getProducts: () => read<Product[]>('products'),
  getCategories: () => read<Category[]>('categories'),
  getAttributes: () => read<Attribute[]>('attributes'),
  getClients: () => read<ClientPartner[]>('clients'),
  getBanners: () => read<Banner[]>('banners'),
  getSettings: () => read<SiteSettings>('settings'),
  async getProductBySlug(slug: string) {
    return findPublicProductBySlug(await this.getProducts(), slug);
  },
  async getProductById(id: string) {
    return findPublicProductById(await this.getProducts(), id);
  },
  async createRequest(data: {
    contactName: string;
    phone: string;
    items: Array<Pick<RequestOrder['items'][number], 'productId' | 'variantId' | 'quantity' | 'comment'>>;
    telegramInitData?: string;
  }): Promise<RequestOrder> {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return parseJsonResponse<RequestOrder>(response, 'Заявка не была сохранена.');
  },
  async getMyRequests(): Promise<RequestOrder[]> {
    const response = await fetch('/api/requests', {
      cache: 'no-store',
    });
    return parseJsonResponse<RequestOrder[]>(response, 'Не удалось загрузить историю заявок.');
  },
};
