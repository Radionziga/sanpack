import {
  Product,
  Category,
  Attribute,
  RequestOrder,
  ClientPartner,
  Banner,
  SiteSettings,
} from '@/types';
import {
  initialProducts,
  initialCategories,
  initialAttributes,
  initialClients,
  initialBanners,
  initialSiteSettings,
} from '@/lib/seedData';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY_PRODUCTS = 'sanpack_products_v6';
const LOCAL_STORAGE_KEY_CATEGORIES = 'sanpack_categories_v6';
const LOCAL_STORAGE_KEY_ATTRIBUTES = 'sanpack_attributes_v6';
const LOCAL_STORAGE_KEY_REQUESTS = 'sanpack_requests_v6';
const LOCAL_STORAGE_KEY_CLIENTS = 'sanpack_clients_v6';
const LOCAL_STORAGE_KEY_BANNERS = 'sanpack_banners_v6';
const LOCAL_STORAGE_KEY_SETTINGS = 'sanpack_settings_v6';

// Helpers for localStorage fallback
function getStoredItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function setStoredItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage save error:', e);
  }
}

let isFirestoreSeeded = false;

export const SanpackRepository = {
  // SEED FIRESTORE
  async seedFirestoreForced(): Promise<{ success: boolean; message: string }> {
    try {
      const batch = writeBatch(db);

      // Seed Products
      for (const p of initialProducts) {
        batch.set(doc(db, 'products', p.id), p);
      }

      // Seed Categories
      for (const c of initialCategories) {
        batch.set(doc(db, 'categories', c.id), c);
      }

      // Seed Attributes
      for (const a of initialAttributes) {
        batch.set(doc(db, 'attributes', a.id), a);
      }

      // Seed Clients
      for (const cl of initialClients) {
        batch.set(doc(db, 'clients', cl.id), cl);
      }

      // Seed Banners
      for (const b of initialBanners) {
        batch.set(doc(db, 'banners', b.id), b);
      }

      // Seed Settings
      batch.set(doc(db, 'settings', 'global'), initialSiteSettings);

      await batch.commit();
      isFirestoreSeeded = true;
      return { success: true, message: 'Firestore успешно заполнен демо-данными!' };
    } catch (error: any) {
      console.error('Error seeding Firestore:', error);
      return { success: false, message: error?.message || 'Ошибка выгрузки в Firestore' };
    }
  },

  // PRODUCTS
  async getProducts(): Promise<Product[]> {
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        const products = snap.docs.map((d) => d.data() as Product);
        setStoredItem(LOCAL_STORAGE_KEY_PRODUCTS, products);
        return products;
      }

      // Auto-seed if empty
      if (!isFirestoreSeeded) {
        console.log('Firestore products empty. Auto-seeding initial data...');
        await this.seedFirestoreForced();
        const retrySnap = await getDocs(collection(db, 'products'));
        if (!retrySnap.empty) {
          return retrySnap.docs.map((d) => d.data() as Product);
        }
      }
    } catch (e) {
      console.warn('Firestore getProducts failed, falling back to LocalStorage:', e);
    }
    return getStoredItem<Product[]>(LOCAL_STORAGE_KEY_PRODUCTS, initialProducts);
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    const products = await this.getProducts();
    return products.find((p) => p.slug === slug) || null;
  },

  async getProductById(id: string): Promise<Product | null> {
    try {
      const docRef = doc(db, 'products', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Product;
      }
    } catch (e) {
      console.warn('Firestore getProductById failed:', e);
    }
    const products = await this.getProducts();
    return products.find((p) => p.id === id) || null;
  },

  async saveProduct(product: Partial<Product>): Promise<Product> {
    const newId = product.id || 'prod-' + Date.now();
    const updatedProduct: Product = {
      ...product,
      id: newId,
      createdAt: product.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Product;

    // Save to Firestore
    try {
      await setDoc(doc(db, 'products', newId), updatedProduct, { merge: true });
    } catch (e) {
      console.warn('Firestore saveProduct error:', e);
    }

    // Save to LocalStorage
    const products = getStoredItem<Product[]>(LOCAL_STORAGE_KEY_PRODUCTS, initialProducts);
    const idx = products.findIndex((p) => p.id === newId);
    if (idx !== -1) {
      products[idx] = updatedProduct;
    } else {
      products.push(updatedProduct);
    }
    setStoredItem(LOCAL_STORAGE_KEY_PRODUCTS, products);

    return updatedProduct;
  },

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return this.saveProduct(product);
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    return this.saveProduct({ ...product, id });
  },

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      console.warn('Firestore deleteProduct error:', e);
    }
    const products = getStoredItem<Product[]>(LOCAL_STORAGE_KEY_PRODUCTS, initialProducts);
    const filtered = products.filter((p) => p.id !== id);
    setStoredItem(LOCAL_STORAGE_KEY_PRODUCTS, filtered);
    return true;
  },

  // CATEGORIES
  async getCategories(): Promise<Category[]> {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      if (!snap.empty) {
        const categories = snap.docs.map((d) => d.data() as Category);
        setStoredItem(LOCAL_STORAGE_KEY_CATEGORIES, categories);
        return categories;
      }
    } catch (e) {
      console.warn('Firestore getCategories failed, falling back to LocalStorage:', e);
    }
    return getStoredItem<Category[]>(LOCAL_STORAGE_KEY_CATEGORIES, initialCategories);
  },

  async saveCategory(category: Partial<Category>): Promise<Category> {
    const id = category.id || 'cat-' + Date.now();
    const updated: Category = {
      ...category,
      id,
    } as Category;

    try {
      await setDoc(doc(db, 'categories', id), updated, { merge: true });
    } catch (e) {
      console.warn('Firestore saveCategory error:', e);
    }

    const categories = getStoredItem<Category[]>(LOCAL_STORAGE_KEY_CATEGORIES, initialCategories);
    const idx = categories.findIndex((c) => c.id === id);
    if (idx !== -1) {
      categories[idx] = updated;
    } else {
      categories.push(updated);
    }
    setStoredItem(LOCAL_STORAGE_KEY_CATEGORIES, categories);
    return updated;
  },

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    return this.saveCategory(category);
  },

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {
    return this.saveCategory({ ...category, id });
  },

  async deleteCategory(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (e) {
      console.warn('Firestore deleteCategory error:', e);
    }
    const categories = getStoredItem<Category[]>(LOCAL_STORAGE_KEY_CATEGORIES, initialCategories);
    const filtered = categories.filter((c) => c.id !== id);
    setStoredItem(LOCAL_STORAGE_KEY_CATEGORIES, filtered);
    return true;
  },

  // ATTRIBUTES
  async getAttributes(): Promise<Attribute[]> {
    try {
      const snap = await getDocs(collection(db, 'attributes'));
      if (!snap.empty) {
        const attributes = snap.docs.map((d) => d.data() as Attribute);
        setStoredItem(LOCAL_STORAGE_KEY_ATTRIBUTES, attributes);
        return attributes;
      }
    } catch (e) {
      console.warn('Firestore getAttributes failed, falling back to LocalStorage:', e);
    }
    return getStoredItem<Attribute[]>(LOCAL_STORAGE_KEY_ATTRIBUTES, initialAttributes);
  },

  async saveAttribute(attr: Partial<Attribute>): Promise<Attribute> {
    const id = attr.id || 'attr-' + Date.now();
    const updated = { ...attr, id } as Attribute;

    try {
      await setDoc(doc(db, 'attributes', id), updated, { merge: true });
    } catch (e) {
      console.warn('Firestore saveAttribute error:', e);
    }

    const attributes = getStoredItem<Attribute[]>(LOCAL_STORAGE_KEY_ATTRIBUTES, initialAttributes);
    const idx = attributes.findIndex((a) => a.id === id);
    if (idx !== -1) {
      attributes[idx] = updated;
    } else {
      attributes.push(updated);
    }
    setStoredItem(LOCAL_STORAGE_KEY_ATTRIBUTES, attributes);
    return updated;
  },

  async deleteAttribute(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'attributes', id));
    } catch (e) {
      console.warn('Firestore deleteAttribute error:', e);
    }
    const attributes = getStoredItem<Attribute[]>(LOCAL_STORAGE_KEY_ATTRIBUTES, initialAttributes);
    const filtered = attributes.filter((a) => a.id !== id);
    setStoredItem(LOCAL_STORAGE_KEY_ATTRIBUTES, filtered);
    return true;
  },

  // REQUESTS (B2B Quote Requests)
  async getRequests(): Promise<RequestOrder[]> {
    try {
      const snap = await getDocs(collection(db, 'requests'));
      if (!snap.empty) {
        const requests = snap.docs.map((d) => d.data() as RequestOrder);
        // Sort by createdAt descending
        requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setStoredItem(LOCAL_STORAGE_KEY_REQUESTS, requests);
        return requests;
      }
    } catch (e) {
      console.warn('Firestore getRequests failed, falling back to LocalStorage:', e);
    }
    return getStoredItem<RequestOrder[]>(LOCAL_STORAGE_KEY_REQUESTS, []);
  },

  async createRequest(reqData: Partial<RequestOrder>): Promise<RequestOrder> {
    const requestNumber = 'REQ-' + Math.floor(100000 + Math.random() * 900000);
    const id = 'req-' + Date.now();
    const newReq: RequestOrder = {
      id,
      requestNumber,
      companyName: reqData.companyName || '',
      inn: reqData.inn || '',
      contactName: reqData.contactName || '',
      phone: reqData.phone || '',
      deliveryType: reqData.deliveryType || 'courier',
      deliveryAddress: reqData.deliveryAddress || '',
      paymentMethod: reqData.paymentMethod || 'transfer',
      notes: reqData.notes || '',
      items: reqData.items || [],
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, 'requests', id), newReq);
    } catch (e) {
      console.warn('Firestore createRequest error:', e);
    }

    // Save to LocalStorage
    const requests = getStoredItem<RequestOrder[]>(LOCAL_STORAGE_KEY_REQUESTS, []);
    requests.unshift(newReq);
    setStoredItem(LOCAL_STORAGE_KEY_REQUESTS, requests);

    return newReq;
  },

  async updateRequestStatus(id: string, status: RequestOrder['status'], notes?: string): Promise<RequestOrder | null> {
    const requests = await this.getRequests();
    const idx = requests.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const updated = {
      ...requests[idx],
      status,
      notes: notes !== undefined ? notes : requests[idx].notes,
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'requests', id), updated, { merge: true });
    } catch (e) {
      console.warn('Firestore updateRequestStatus error:', e);
    }

    requests[idx] = updated;
    setStoredItem(LOCAL_STORAGE_KEY_REQUESTS, requests);
    return updated;
  },

  async deleteRequest(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'requests', id));
    } catch (e) {
      console.warn('Firestore deleteRequest error:', e);
    }
    const requests = getStoredItem<RequestOrder[]>(LOCAL_STORAGE_KEY_REQUESTS, []);
    const filtered = requests.filter((r) => r.id !== id);
    setStoredItem(LOCAL_STORAGE_KEY_REQUESTS, filtered);
    return true;
  },

  // CLIENTS
  async getClients(): Promise<ClientPartner[]> {
    try {
      const snap = await getDocs(collection(db, 'clients'));
      if (!snap.empty) {
        const clients = snap.docs.map((d) => d.data() as ClientPartner);
        setStoredItem(LOCAL_STORAGE_KEY_CLIENTS, clients);
        return clients;
      }
    } catch (e) {
      console.warn('Firestore getClients failed, falling back to LocalStorage:', e);
    }
    return getStoredItem<ClientPartner[]>(LOCAL_STORAGE_KEY_CLIENTS, initialClients);
  },

  async saveClient(client: Partial<ClientPartner>): Promise<ClientPartner> {
    const id = client.id || 'client-' + Date.now();
    const updated = { ...client, id } as ClientPartner;

    try {
      await setDoc(doc(db, 'clients', id), updated, { merge: true });
    } catch (e) {
      console.warn('Firestore saveClient error:', e);
    }

    const clients = getStoredItem<ClientPartner[]>(LOCAL_STORAGE_KEY_CLIENTS, initialClients);
    const idx = clients.findIndex((c) => c.id === id);
    if (idx !== -1) {
      clients[idx] = updated;
    } else {
      clients.push(updated);
    }
    setStoredItem(LOCAL_STORAGE_KEY_CLIENTS, clients);
    return updated;
  },

  async createClient(client: Omit<ClientPartner, 'id'>): Promise<ClientPartner> {
    return this.saveClient(client);
  },

  async updateClient(id: string, client: Partial<ClientPartner>): Promise<ClientPartner> {
    return this.saveClient({ ...client, id });
  },

  async deleteClient(id: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (e) {
      console.warn('Firestore deleteClient error:', e);
    }
    const clients = getStoredItem<ClientPartner[]>(LOCAL_STORAGE_KEY_CLIENTS, initialClients);
    const filtered = clients.filter((c) => c.id !== id);
    setStoredItem(LOCAL_STORAGE_KEY_CLIENTS, filtered);
    return true;
  },

  // BANNERS
  async getBanners(): Promise<Banner[]> {
    try {
      const snap = await getDocs(collection(db, 'banners'));
      if (!snap.empty) {
        const banners = snap.docs.map((d) => d.data() as Banner);
        setStoredItem(LOCAL_STORAGE_KEY_BANNERS, banners);
        return banners;
      }
    } catch (e) {
      console.warn('Firestore getBanners failed, falling back to LocalStorage:', e);
    }
    return getStoredItem<Banner[]>(LOCAL_STORAGE_KEY_BANNERS, initialBanners);
  },

  // SETTINGS
  async getSettings(): Promise<SiteSettings> {
    try {
      const docRef = doc(db, 'settings', 'global');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const settings = snap.data() as SiteSettings;
        setStoredItem(LOCAL_STORAGE_KEY_SETTINGS, settings);
        return settings;
      }
    } catch (e) {
      console.warn('Firestore getSettings failed, falling back to LocalStorage:', e);
    }
    return getStoredItem<SiteSettings>(LOCAL_STORAGE_KEY_SETTINGS, initialSiteSettings);
  },

  async saveSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };

    try {
      await setDoc(doc(db, 'settings', 'global'), updated, { merge: true });
    } catch (e) {
      console.warn('Firestore saveSettings error:', e);
    }

    setStoredItem(LOCAL_STORAGE_KEY_SETTINGS, updated);
    return updated;
  },
};
