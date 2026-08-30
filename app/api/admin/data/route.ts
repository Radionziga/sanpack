import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { getAdminDb } from '@/lib/firebase/admin';
import {
  initialAttributes,
  initialBanners,
  initialCategories,
  initialClients,
  initialProducts,
  initialSiteSettings,
} from '@/lib/seedData';
import type { Attribute, Category, Product, UserRole } from '@/types';
import { validateAdminResourceData } from '@/lib/validation/adminContent';
import { mergeSiteSettings } from '@/lib/settings/mergeSiteSettings';
import { firebaseAdminUnavailableMessage } from '@/lib/firebase/adminErrors';
import { getApplicableAttributes } from '@/lib/catalog/attributeApplicability';
import { createCatalogSlug } from '@/lib/catalog/catalogSlugs';
import { getPublishedProductStructuralIssues } from '@/lib/catalog/publicProducts';

export const runtime = 'nodejs';

const resourceSchema = z.enum([
  'products',
  'categories',
  'attributes',
  'requests',
  'clients',
  'banners',
  'settings',
]);
type Resource = z.infer<typeof resourceSchema>;

const mutationSchema = z.object({
  action: z.enum(['save', 'delete', 'seed', 'updateRequestStatus']),
  resource: resourceSchema.optional(),
  id: z.string().max(160).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}).strict();

function canMutate(role: UserRole, resource?: Resource, _action?: string) {
  // Orders are append-only business records. All allowed changes go through the
  // dedicated order endpoint, which validates the payload and writes an audit trail.
  if (resource === 'requests') return false;
  if (role === 'super_admin') return true;
  return false;
}

function hasAttributeValue(product: Partial<Product>, key: string) {
  const value = product.attributes?.[key];
  return value !== undefined && value !== null && value !== ''
    && (!Array.isArray(value) || value.length > 0);
}

async function validateCategoryMutation(
  database: ReturnType<typeof getAdminDb>,
  id: string,
  category: Partial<Category>,
) {
  if (category.parentId) {
    if (category.parentId === id) return 'Категория не может быть родителем самой себя.';
    const parent = await database.collection('categories').doc(category.parentId).get();
    if (!parent.exists) return 'Выбранная группа не существует.';
    if ((parent.data() as Partial<Category>).parentId) return 'Поддерживается только структура «группа → категория».';
    const children = await database.collection('categories').where('parentId', '==', id).limit(1).get();
    if (!children.empty) return 'Группу с дочерними категориями нельзя превратить в категорию.';
  }
  if (category.slug) {
    const duplicate = await database.collection('categories').where('slug', '==', category.slug).limit(2).get();
    if (duplicate.docs.some((document) => document.id !== id)) return 'Категория с таким URL уже существует.';
  }
  return null;
}

async function validateAttributeMutation(
  database: ReturnType<typeof getAdminDb>,
  id: string,
  attribute: Partial<Attribute>,
) {
  if (attribute.key) {
    const duplicate = await database.collection('attributes').where('key', '==', attribute.key).limit(2).get();
    if (duplicate.docs.some((document) => document.id !== id)) return 'Характеристика с таким внутренним именем уже существует.';
  }
  if (attribute.categoryIds?.length) {
    const categoryDocuments = await Promise.all(attribute.categoryIds.map((categoryId) => database.collection('categories').doc(categoryId).get()));
    if (categoryDocuments.some((document) => !document.exists)) return 'Одна из выбранных категорий больше не существует.';
  }
  return null;
}

async function normalizeAndValidateProduct(
  database: ReturnType<typeof getAdminDb>,
  id: string,
  product: Partial<Product>,
) {
  const categoryDocument = product.categoryId
    ? await database.collection('categories').doc(product.categoryId).get()
    : null;
  if (!categoryDocument?.exists) return { error: 'Выбранная категория не существует.' } as const;
  const category = { id: categoryDocument.id, ...categoryDocument.data() } as Category;
  if (!category.parentId) return { error: 'Товар нельзя привязать напрямую к группе. Выберите категорию внутри группы.' } as const;

  const slug = product.slug || createCatalogSlug(product.titleRu || '', product.sku || '');
  const [duplicateSlug, duplicateSku, categorySnapshot, attributeSnapshot] = await Promise.all([
    database.collection('products').where('slug', '==', slug).limit(2).get(),
    product.sku ? database.collection('products').where('sku', '==', product.sku).limit(2).get() : null,
    database.collection('categories').get(),
    database.collection('attributes').get(),
  ]);
  if (duplicateSlug.docs.some((document) => document.id !== id)) return { error: 'Товар с таким URL уже существует.' } as const;
  if (duplicateSku?.docs.some((document) => document.id !== id)) return { error: 'Товар с таким SKU уже существует.' } as const;

  const categories = categorySnapshot.docs.map((document) => ({ id: document.id, ...document.data() } as Category));
  const attributes = attributeSnapshot.docs.map((document) => ({ id: document.id, ...document.data() } as Attribute));
  const missing = product.status === 'published'
    ? getApplicableAttributes(attributes, category.id, categories)
        .filter((attribute) => attribute.required && !hasAttributeValue(product, attribute.key))
    : [];
  if (missing.length > 0) {
    return { error: `Заполните обязательные характеристики: ${missing.map((attribute) => attribute.titleRu).join(', ')}.` } as const;
  }
  const normalized = { ...product, slug, categorySlug: category.slug };
  const structuralIssues = getPublishedProductStructuralIssues(normalized);
  if (structuralIssues.length > 0) {
    return {
      error: `Для публикации заполните обязательные поля: ${structuralIssues.join(', ')}.`,
    } as const;
  }
  return { data: normalized } as const;
}

async function denyUnlessAdmin() {
  const admin = await getAdminSession();
  if (!admin) {
    return {
      response: NextResponse.json({ error: 'Требуется авторизация.' }, { status: 401 }),
      admin: null,
    };
  }
  return { response: null, admin };
}

export async function GET(request: Request) {
  const authorization = await denyUnlessAdmin();
  if (authorization.response) return authorization.response;

  const parsed = resourceSchema.safeParse(
    new URL(request.url).searchParams.get('resource')
  );
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неизвестный ресурс.' }, { status: 400 });
  }

  try {
    if (parsed.data === 'settings') {
      const document = await getAdminDb().collection('settings').doc('global').get();
      return NextResponse.json(
        document.exists
          ? mergeSiteSettings(initialSiteSettings, document.data() as Partial<typeof initialSiteSettings>)
          : initialSiteSettings
      );
    }
    const snapshot = await getAdminDb().collection(parsed.data).get();
    const data = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Admin read failed for ${parsed.data}.`, error);
    return NextResponse.json(
      { error: firebaseAdminUnavailableMessage('данных', error) },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const authorization = await denyUnlessAdmin();
  if (authorization.response || !authorization.admin) return authorization.response;

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Некорректное тело запроса.' }, { status: 400 });
    }

    const parsedMutation = mutationSchema.safeParse(rawBody);
    if (!parsedMutation.success) {
      return NextResponse.json(
        { error: 'Некорректная операция.', issues: parsedMutation.error.issues },
        { status: 400 }
      );
    }
    const mutation = parsedMutation.data;
    if (!canMutate(authorization.admin.role, mutation.resource, mutation.action)) {
      return NextResponse.json(
        { error: 'У вашей роли нет прав на эту операцию.' },
        { status: 403 }
      );
    }

    const database = getAdminDb();

    if (mutation.action === 'seed') {
      const batch = database.batch();
      const collections = [
        ['products', initialProducts],
        ['categories', initialCategories],
        ['attributes', initialAttributes],
        ['clients', initialClients],
        ['banners', initialBanners],
      ] as const;
      for (const [name, records] of collections) {
        for (const record of records) {
          batch.set(database.collection(name).doc(record.id), record);
        }
      }
      batch.set(database.collection('settings').doc('global'), initialSiteSettings);
      await batch.commit();
      for (const name of ['products', 'categories', 'attributes', 'clients', 'banners', 'settings']) {
        revalidateTag(name, { expire: 0 });
      }
      return NextResponse.json({
        success: true,
        message: 'Firestore заполнен начальными данными.',
      });
    }

    if (!mutation.resource || !mutation.id) {
      return NextResponse.json(
        { error: 'Для операции не указан ресурс или ID.' },
        { status: 400 }
      );
    }

    const document = database.collection(mutation.resource).doc(mutation.id);
    if (mutation.action === 'delete') {
      if (mutation.resource === 'categories') {
        const [children, products, attributes] = await Promise.all([
          database.collection('categories').where('parentId', '==', mutation.id).limit(1).get(),
          database.collection('products').where('categoryId', '==', mutation.id).limit(1).get(),
          database.collection('attributes').where('categoryIds', 'array-contains', mutation.id).limit(1).get(),
        ]);
        if (!children.empty || !products.empty || !attributes.empty) {
          return NextResponse.json({
            error: 'Категория используется. Сначала перенесите дочерние категории, товары и характеристики либо скройте запись.',
          }, { status: 409 });
        }
      }
      if (mutation.resource === 'attributes') {
        const attributeDocument = await document.get();
        const key = (attributeDocument.data() as Partial<Attribute> | undefined)?.key;
        if (key) {
          const products = await database.collection('products').get();
          const used = products.docs.some((productDocument) => {
            const attributes = (productDocument.data() as Partial<Product>).attributes;
            return attributes && Object.prototype.hasOwnProperty.call(attributes, key);
          });
          if (used) {
            return NextResponse.json({
              error: 'Характеристика используется товарами. Сначала удалите или перенесите значения у товаров.',
            }, { status: 409 });
          }
        }
      }
      await document.delete();
      revalidateTag(mutation.resource, { expire: 0 });
      return NextResponse.json({ success: true });
    }

    if (mutation.action === 'updateRequestStatus') {
      await document.update({
        ...mutation.data,
        updatedAt: new Date().toISOString(),
      });
      const updated = await document.get();
      return NextResponse.json({ id: updated.id, ...updated.data() });
    }

    const validatedData = validateAdminResourceData(
      mutation.resource,
      mutation.data ?? {}
    );
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Проверьте заполненные поля.', issues: validatedData.error.issues },
        { status: 400 }
      );
    }

    let normalizedData = validatedData.data as Record<string, unknown>;
    if (mutation.resource === 'categories') {
      const categoryError = await validateCategoryMutation(database, mutation.id, normalizedData as Partial<Category>);
      if (categoryError) return NextResponse.json({ error: categoryError }, { status: 409 });
    }
    if (mutation.resource === 'attributes') {
      const attributeError = await validateAttributeMutation(database, mutation.id, normalizedData as Partial<Attribute>);
      if (attributeError) return NextResponse.json({ error: attributeError }, { status: 409 });
    }
    if (mutation.resource === 'products') {
      const normalized = await normalizeAndValidateProduct(database, mutation.id, normalizedData as Partial<Product>);
      if ('error' in normalized) return NextResponse.json({ error: normalized.error }, { status: 409 });
      normalizedData = normalized.data as Record<string, unknown>;
    }

    const timestamp = new Date().toISOString();
    const data = {
      ...normalizedData,
      id: mutation.id,
      updatedAt: timestamp,
      updatedBy: authorization.admin.uid,
    };
    if (mutation.resource === 'settings') await document.set(data, { merge: true });
    else await document.set(data);
    revalidateTag(mutation.resource, { expire: 0 });
    const saved = await document.get();
    return NextResponse.json({ id: saved.id, ...saved.data() });
  } catch (error) {
    console.error('Admin mutation failed.', error);
    return NextResponse.json(
      { error: firebaseAdminUnavailableMessage('данных', error) },
      { status: 503 }
    );
  }
}
