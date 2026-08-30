import type { Firestore } from 'firebase-admin/firestore';
import type { MediaUsageLocation, MediaUsageSummary } from './types';

export function normalizeStorageReference(input?: string | null): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Check if it's a Firebase Storage download URL
  const fbStorageMatch = trimmed.match(/\/o\/([^?#]+)/);
  if (fbStorageMatch && fbStorageMatch[1]) {
    try {
      return decodeURIComponent(fbStorageMatch[1]).replace(/^\/+/, '');
    } catch {
      return fbStorageMatch[1].replace(/^\/+/, '');
    }
  }

  // If it's a URL with query params
  const cleanPath = trimmed.split('?')[0].split('#')[0];
  return cleanPath.replace(/^\/+/, '');
}

export function extractFileName(pathOrUrl: string): string {
  const normalized = normalizeStorageReference(pathOrUrl);
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

export interface UsageIndex {
  byPath: Map<string, MediaUsageLocation[]>;
  byUrl: Map<string, MediaUsageLocation[]>;
  byFileName: Map<string, MediaUsageLocation[]>;
}

function registerUsage(
  index: UsageIndex,
  rawReference: string | null | undefined,
  location: MediaUsageLocation
) {
  if (!rawReference || typeof rawReference !== 'string') return;
  const raw = rawReference.trim();
  if (!raw) return;

  // 1. By raw string / URL
  const existingByUrl = index.byUrl.get(raw) || [];
  if (!existingByUrl.some((l) => l.id === location.id && l.field === location.field)) {
    existingByUrl.push(location);
    index.byUrl.set(raw, existingByUrl);
  }

  // 2. By normalized storage path
  const normalizedPath = normalizeStorageReference(raw);
  if (normalizedPath) {
    const existingByPath = index.byPath.get(normalizedPath) || [];
    if (!existingByPath.some((l) => l.id === location.id && l.field === location.field)) {
      existingByPath.push(location);
      index.byPath.set(normalizedPath, existingByPath);
    }

    // 3. By filename
    const filename = extractFileName(normalizedPath);
    if (filename && filename.length > 3) {
      const existingByFile = index.byFileName.get(filename) || [];
      if (!existingByFile.some((l) => l.id === location.id && l.field === location.field)) {
        existingByFile.push(location);
        index.byFileName.set(filename, existingByFile);
      }
    }
  }
}

export async function buildSiteMediaUsageIndex(db: Firestore): Promise<UsageIndex> {
  const index: UsageIndex = {
    byPath: new Map(),
    byUrl: new Map(),
    byFileName: new Map(),
  };

  try {
    // 1. Scan products
    const productsSnapshot = await db.collection('products').get();
    for (const doc of productsSnapshot.docs) {
      const p = doc.data();
      const productTitle = p.titleRu || p.titleUz || p.titleEn || `Товар (${doc.id})`;
      const editUrl = `/admin/products`;

      if (p.image) {
        registerUsage(index, p.image, {
          type: 'product',
          id: doc.id,
          title: productTitle,
          field: 'Главное изображение',
          sku: p.sku,
          editUrl,
        });
      }
      if (p.imagePath) {
        registerUsage(index, p.imagePath, {
          type: 'product',
          id: doc.id,
          title: productTitle,
          field: 'Путь главного фото',
          sku: p.sku,
          editUrl,
        });
      }
      if (Array.isArray(p.images)) {
        p.images.forEach((img: string, idx: number) => {
          registerUsage(index, img, {
            type: 'product',
            id: doc.id,
            title: productTitle,
            field: `Галерея (фото ${idx + 1})`,
            sku: p.sku,
            editUrl,
          });
        });
      }
      if (Array.isArray(p.variants)) {
        p.variants.forEach((v: { id?: string; sku?: string; titleRu?: string; image?: string; imagePath?: string }) => {
          const variantLabel = v.titleRu || v.sku || v.id || 'Вариант';
          if (v.image) {
            registerUsage(index, v.image, {
              type: 'product',
              id: doc.id,
              title: `${productTitle} [${variantLabel}]`,
              field: `Фото варианта ${variantLabel}`,
              sku: v.sku || p.sku,
              editUrl,
            });
          }
          if (v.imagePath) {
            registerUsage(index, v.imagePath, {
              type: 'product',
              id: doc.id,
              title: `${productTitle} [${variantLabel}]`,
              field: `Путь фото варианта ${variantLabel}`,
              sku: v.sku || p.sku,
              editUrl,
            });
          }
        });
      }
    }

    // 2. Scan categories
    const categoriesSnapshot = await db.collection('categories').get();
    for (const doc of categoriesSnapshot.docs) {
      const c = doc.data();
      const catTitle = c.titleRu || c.titleUz || `Категория (${doc.id})`;
      const editUrl = `/admin/categories`;

      if (c.image) {
        registerUsage(index, c.image, {
          type: 'category',
          id: doc.id,
          title: catTitle,
          field: 'Обложка категории',
          editUrl,
        });
      }
      if (c.imagePath) {
        registerUsage(index, c.imagePath, {
          type: 'category',
          id: doc.id,
          title: catTitle,
          field: 'Путь обложки',
          editUrl,
        });
      }
      if (c.navigationImage) {
        registerUsage(index, c.navigationImage, {
          type: 'category',
          id: doc.id,
          title: catTitle,
          field: 'Иконка навигации',
          editUrl,
        });
      }
      if (c.navigationImagePath) {
        registerUsage(index, c.navigationImagePath, {
          type: 'category',
          id: doc.id,
          title: catTitle,
          field: 'Путь иконки навигации',
          editUrl,
        });
      }
      if (c.cardImage) {
        registerUsage(index, c.cardImage, {
          type: 'category',
          id: doc.id,
          title: catTitle,
          field: 'Обложка bento-карточки',
          editUrl,
        });
      }
      if (c.cardImagePath) {
        registerUsage(index, c.cardImagePath, {
          type: 'category',
          id: doc.id,
          title: catTitle,
          field: 'Путь bento-обложки',
          editUrl,
        });
      }
      if (c.banner) {
        registerUsage(index, c.banner, {
          type: 'category',
          id: doc.id,
          title: catTitle,
          field: 'Баннер категории',
          editUrl,
        });
      }
      if (c.icon && c.icon.startsWith('http')) {
        registerUsage(index, c.icon, {
          type: 'category',
          id: doc.id,
          title: catTitle,
          field: 'Иконка категории',
          editUrl,
        });
      }
    }

    // 3. Scan banners
    const bannersSnapshot = await db.collection('banners').get();
    for (const doc of bannersSnapshot.docs) {
      const b = doc.data();
      const bannerTitle = b.titleRu || b.titleUz || `Баннер (${doc.id})`;
      const editUrl = `/admin/promotions`;

      if (b.imageDesktop) {
        registerUsage(index, b.imageDesktop, {
          type: 'banner',
          id: doc.id,
          title: bannerTitle,
          field: 'Десктоп баннер',
          editUrl,
        });
      }
      if (b.imageDesktopPath) {
        registerUsage(index, b.imageDesktopPath, {
          type: 'banner',
          id: doc.id,
          title: bannerTitle,
          field: 'Путь десктоп баннера',
          editUrl,
        });
      }
      if (b.imageMobile) {
        registerUsage(index, b.imageMobile, {
          type: 'banner',
          id: doc.id,
          title: bannerTitle,
          field: 'Мобильный баннер',
          editUrl,
        });
      }
      if (b.imageMobilePath) {
        registerUsage(index, b.imageMobilePath, {
          type: 'banner',
          id: doc.id,
          title: bannerTitle,
          field: 'Путь моб. баннера',
          editUrl,
        });
      }
    }

    // 4. Scan clients
    const clientsSnapshot = await db.collection('clients').get();
    for (const doc of clientsSnapshot.docs) {
      const cl = doc.data();
      const clientTitle = cl.name || `Клиент (${doc.id})`;
      const editUrl = `/admin/clients`;

      if (cl.logo) {
        registerUsage(index, cl.logo, {
          type: 'client',
          id: doc.id,
          title: clientTitle,
          field: 'Логотип клиента',
          editUrl,
        });
      }
    }

    // 5. Scan settings
    try {
      const globalSettingsDoc = await db.collection('settings').doc('global').get();
      if (globalSettingsDoc.exists) {
        const s = globalSettingsDoc.data();
        if (s?.company?.logo) {
          registerUsage(index, s.company.logo, {
            type: 'settings',
            id: 'global-settings',
            title: 'Логотип магазина',
            field: 'Настройки внешнего вида',
            editUrl: '/admin/settings',
          });
        }
        if (s?.company?.favicon) {
          registerUsage(index, s.company.favicon, {
            type: 'settings',
            id: 'global-settings',
            title: 'Favicon магазина',
            field: 'Настройки внешнего вида',
            editUrl: '/admin/settings',
          });
        }
        const serviceModules = [
          ['branding', 'Полиграфия и брендирование'],
          ['bagDesigner', 'Конструктор пакета'],
        ] as const;
        for (const [moduleKey, title] of serviceModules) {
          const service = s?.modules?.[moduleKey];
          if (service?.navigationImage) {
            registerUsage(index, service.navigationImage, {
              type: 'settings',
              id: `service-${moduleKey}`,
              title,
              field: 'Иллюстрация в навигации',
              editUrl: '/admin/services',
            });
          }
          if (service?.navigationImagePath) {
            registerUsage(index, service.navigationImagePath, {
              type: 'settings',
              id: `service-${moduleKey}`,
              title,
              field: 'Путь иллюстрации в навигации',
              editUrl: '/admin/services',
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // 6. Scan document settings
    try {
      const docSettingsDoc = await db.collection('settings').doc('documents').get();
      if (docSettingsDoc.exists) {
        const ds = docSettingsDoc.data();
        if (ds?.logoUrl) {
          registerUsage(index, ds.logoUrl, {
            type: 'document',
            id: 'document-settings',
            title: 'Логотип в документах',
            field: 'Шапка накладной',
            editUrl: '/admin/document-settings',
          });
        }
      }
    } catch {
      // ignore
    }

    // 7. Scan bag design requests (sample latest 200)
    try {
      const bagRequestsSnapshot = await db.collection('bagDesignRequests').limit(200).get();
      for (const doc of bagRequestsSnapshot.docs) {
        const br = doc.data();
        const requestTitle = `Заказ пакета ${br.number || doc.id}`;
        const editUrl = `/admin/bag-designer`;

        if (br.logoUrl) {
          registerUsage(index, br.logoUrl, {
            type: 'bag_request',
            id: doc.id,
            title: requestTitle,
            field: 'Загруженный логотип',
            editUrl,
          });
        }
        if (br.technicalPreviewUrl) {
          registerUsage(index, br.technicalPreviewUrl, {
            type: 'bag_request',
            id: doc.id,
            title: requestTitle,
            field: 'Технический чертёж',
            editUrl,
          });
        }
        if (br.aiMockupUrl) {
          registerUsage(index, br.aiMockupUrl, {
            type: 'bag_request',
            id: doc.id,
            title: requestTitle,
            field: 'Сгенерированный AI-мокап',
            editUrl,
          });
        }
      }
    } catch {
      // ignore
    }
  } catch (error) {
    console.error('Error building site media usage index:', error);
  }

  return index;
}

export function lookupMediaUsage(
  index: UsageIndex,
  filePath: string,
  fileUrl?: string
): MediaUsageSummary {
  const matchedLocations: MediaUsageLocation[] = [];
  const seenKey = new Set<string>();

  function addLocation(loc: MediaUsageLocation) {
    const key = `${loc.type}:${loc.id}:${loc.field}`;
    if (!seenKey.has(key)) {
      seenKey.add(key);
      matchedLocations.push(loc);
    }
  }

  // 1. Check exact normalized path
  const normalizedPath = normalizeStorageReference(filePath);
  if (normalizedPath && index.byPath.has(normalizedPath)) {
    index.byPath.get(normalizedPath)!.forEach(addLocation);
  }

  // 2. Check by URL
  if (fileUrl && index.byUrl.has(fileUrl)) {
    index.byUrl.get(fileUrl)!.forEach(addLocation);
  }

  // 3. Check by filename
  const filename = extractFileName(filePath);
  if (filename && index.byFileName.has(filename)) {
    // Only match by filename if path ends with same folder or direct filename
    index.byFileName.get(filename)!.forEach(addLocation);
  }

  return {
    isUsed: matchedLocations.length > 0,
    totalCount: matchedLocations.length,
    locations: matchedLocations,
  };
}
