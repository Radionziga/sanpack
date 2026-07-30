import type {
  Attribute,
  Banner,
  Category,
  ClientPartner,
  Product,
  RequestOrder,
  SiteSettings,
} from '@/types';

type Resource =
  | 'products'
  | 'categories'
  | 'attributes'
  | 'requests'
  | 'clients'
  | 'banners'
  | 'settings';

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || 'Операция не выполнена.');
  }
  return body as T;
}

async function read<T>(resource: Resource): Promise<T> {
  return parseResponse<T>(
    await fetch(`/api/admin/data?resource=${resource}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
  );
}

async function mutate<T>(body: Record<string, unknown>): Promise<T> {
  return parseResponse<T>(
    await fetch('/api/admin/data', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  );
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const SanpackRepository = {
  seedFirestoreForced() {
    return mutate<{ success: boolean; message: string }>({ action: 'seed' });
  },

  getProducts: () => read<Product[]>('products'),
  async getProductBySlug(slug: string) {
    return (await this.getProducts()).find((product) => product.slug === slug) || null;
  },
  async getProductById(id: string) {
    return (await this.getProducts()).find((product) => product.id === id) || null;
  },
  saveProduct(product: Partial<Product>) {
    const id = product.id || createId('prod');
    const timestamp = new Date().toISOString();
    return mutate<Product>({
      action: 'save',
      resource: 'products',
      id,
      data: {
        ...product,
        createdAt: product.createdAt || timestamp,
        updatedAt: timestamp,
      },
    });
  },
  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.saveProduct(product);
  },
  updateProduct(id: string, product: Partial<Product>) {
    return this.saveProduct({ ...product, id });
  },
  async deleteProduct(id: string) {
    await mutate({ action: 'delete', resource: 'products', id });
    return true;
  },

  getCategories: () => read<Category[]>('categories'),
  saveCategory(category: Partial<Category>) {
    const id = category.id || createId('cat');
    return mutate<Category>({
      action: 'save',
      resource: 'categories',
      id,
      data: category,
    });
  },
  createCategory(category: Omit<Category, 'id'>) {
    return this.saveCategory(category);
  },
  updateCategory(id: string, category: Partial<Category>) {
    return this.saveCategory({ ...category, id });
  },
  async deleteCategory(id: string) {
    await mutate({ action: 'delete', resource: 'categories', id });
    return true;
  },

  getAttributes: () => read<Attribute[]>('attributes'),
  saveAttribute(attribute: Partial<Attribute>) {
    const id = attribute.id || createId('attr');
    return mutate<Attribute>({
      action: 'save',
      resource: 'attributes',
      id,
      data: attribute,
    });
  },
  async deleteAttribute(id: string) {
    await mutate({ action: 'delete', resource: 'attributes', id });
    return true;
  },

  async getRequests() {
    const requests = await read<RequestOrder[]>('requests');
    return requests.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
  async createRequest(request: Partial<RequestOrder>) {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    });
    return parseResponse<RequestOrder>(response);
  },
  updateRequestStatus(
    id: string,
    status: RequestOrder['status'],
    notes?: string
  ) {
    return mutate<RequestOrder>({
      action: 'updateRequestStatus',
      resource: 'requests',
      id,
      data: { status, ...(notes === undefined ? {} : { notes }) },
    });
  },
  async deleteRequest(id: string) {
    await mutate({ action: 'delete', resource: 'requests', id });
    return true;
  },

  getClients: () => read<ClientPartner[]>('clients'),
  saveClient(client: Partial<ClientPartner>) {
    const id = client.id || createId('client');
    return mutate<ClientPartner>({
      action: 'save',
      resource: 'clients',
      id,
      data: client,
    });
  },
  createClient(client: Omit<ClientPartner, 'id'>) {
    return this.saveClient(client);
  },
  updateClient(id: string, client: Partial<ClientPartner>) {
    return this.saveClient({ ...client, id });
  },
  async deleteClient(id: string) {
    await mutate({ action: 'delete', resource: 'clients', id });
    return true;
  },

  getBanners: () => read<Banner[]>('banners'),
  getSettings: () => read<SiteSettings>('settings'),
  async saveSettings(settings: Partial<SiteSettings>) {
    return mutate<SiteSettings>({
      action: 'save',
      resource: 'settings',
      id: 'global',
      data: settings,
    });
  },
};
