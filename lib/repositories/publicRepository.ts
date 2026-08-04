import type {
  Attribute,
  Banner,
  Category,
  ClientPartner,
  Product,
  RequestOrder,
  SiteSettings,
} from '@/types';
import { getCustomerIdToken } from '@/lib/auth/customer';

async function read<T>(resource: string): Promise<T> {
  const response = await fetch(`/api/catalog?resource=${resource}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Не удалось загрузить данные каталога.');
  }
  return body as T;
}

export const PublicSanpackRepository = {
  getProducts: () => read<Product[]>('products'),
  getCategories: () => read<Category[]>('categories'),
  getAttributes: () => read<Attribute[]>('attributes'),
  getClients: () => read<ClientPartner[]>('clients'),
  getBanners: () => read<Banner[]>('banners'),
  getSettings: () => read<SiteSettings>('settings'),
  async getProductBySlug(slug: string) {
    const products = await this.getProducts();
    return products.find((product) => product.slug === slug) || null;
  },
  async getProductById(id: string) {
    const products = await this.getProducts();
    return products.find((product) => product.id === id) || null;
  },
  async createRequest(data: {
    contactName: string;
    phone: string;
    items: Array<Pick<RequestOrder['items'][number], 'productId' | 'variantId' | 'quantity' | 'comment'>>;
    telegramInitData?: string;
  }): Promise<RequestOrder> {
    const idToken = await getCustomerIdToken();
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || 'Заявка не была сохранена.');
    }
    return body as RequestOrder;
  },
  async getMyRequests(): Promise<RequestOrder[]> {
    const idToken = await getCustomerIdToken();
    const response = await fetch('/api/requests', {
      headers: { authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || 'Не удалось загрузить историю заявок.');
    }
    return body as RequestOrder[];
  },
};
