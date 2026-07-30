import type {
  Attribute,
  Banner,
  Category,
  ClientPartner,
  Product,
  RequestOrder,
  SiteSettings,
} from '@/types';

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
  async createRequest(data: Partial<RequestOrder>): Promise<RequestOrder> {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || 'Заявка не была сохранена.');
    }
    return body as RequestOrder;
  },
};
