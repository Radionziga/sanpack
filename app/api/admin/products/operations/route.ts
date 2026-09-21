import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth/server';
import { hasAdminCapability } from '@/lib/auth/adminCapabilities';
import { getAdminDb } from '@/lib/firebase/admin';
import { firebaseAdminUnavailableMessage } from '@/lib/firebase/adminErrors';
import { logError } from '@/lib/observability/logger';
import { createProductDuplicateDraft, getProductReadiness } from '@/lib/admin/productOperations';
import { getCategoryLineage, isProductCategory } from '@/lib/catalog/categoryHierarchy';
import type { Attribute, Category, Product } from '@/types';

export const runtime = 'nodejs';

const targetSchema = z.object({
  id: z.string().trim().min(1).max(160),
  expectedUpdatedAt: z.string().trim().min(1).max(100),
}).strict();

const requestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('quick_edit'),
    target: targetSchema,
    patch: z.object({
      categoryId: z.string().trim().min(1).max(160).optional(),
      brandName: z.string().trim().max(200).optional(),
      status: z.enum(['draft', 'published', 'hidden', 'archived']).optional(),
      stockStatus: z.enum(['in_stock', 'out_of_stock', 'on_order', 'temporarily_unavailable', 'discontinued']).optional(),
      stockQuantity: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
      featured: z.boolean().optional(),
      newProduct: z.boolean().optional(),
    }).strict(),
  }).strict(),
  z.object({ action: z.literal('duplicate'), target: targetSchema }).strict(),
  z.object({
    action: z.literal('bulk_category'),
    targets: z.array(targetSchema).min(1).max(100),
    categoryId: z.string().trim().min(1).max(160),
  }).strict(),
  z.object({
    action: z.literal('bulk_status'),
    targets: z.array(targetSchema).min(1).max(100),
    status: z.enum(['published', 'hidden']),
  }).strict(),
]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'cache-control': 'private, no-store' } });
}

function duplicateSlug(source: Product, id: string) {
  const suffix = id.replace(/[^a-z0-9]/gi, '').slice(-8).toLowerCase();
  const base = (source.slug || 'product').slice(0, Math.max(1, 180 - suffix.length - 6)).replace(/-+$/g, '');
  return `${base}-copy-${suffix}`;
}

function productFromSnapshot(snapshot: FirebaseFirestore.DocumentSnapshot) {
  return snapshot.exists ? ({ id: snapshot.id, ...snapshot.data() } as Product) : null;
}

function assertFresh(product: Product | null, expectedUpdatedAt: string) {
  if (!product) return 'Товар не найден.';
  if (product.updatedAt !== expectedUpdatedAt) return 'Товар уже изменён другим пользователем. Обновите список и повторите операцию.';
  return null;
}

async function loadTaxonomy(transaction: FirebaseFirestore.Transaction) {
  const database = getAdminDb();
  const [categorySnapshot, attributeSnapshot] = await Promise.all([
    transaction.get(database.collection('categories')),
    transaction.get(database.collection('attributes')),
  ]);
  return {
    categories: categorySnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as Category)),
    attributes: attributeSnapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as Attribute)),
  };
}

function validateTargetCategory(categoryId: string, categories: Category[]) {
  const category = categories.find((candidate) => candidate.id === categoryId);
  if (!category || category.status !== 'active' || !isProductCategory(category.id, categories)) {
    return { error: 'Выбранная категория больше недоступна.', category: null } as const;
  }
  const lineage = getCategoryLineage(category.id, categories);
  if (!lineage.length || lineage.some((node) => node.status !== 'active')) {
    return { error: 'Категория находится в скрытой или повреждённой ветке.', category: null } as const;
  }
  return { error: null, category } as const;
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return json({ error: 'Требуется авторизация.' }, 401);
  if (!hasAdminCapability(admin.role, 'catalog.write')) return json({ error: 'У вашей роли нет прав на изменение товаров.' }, 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Некорректное тело запроса.' }, 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'Проверьте параметры операции.', issues: parsed.error.issues }, 400);

  const operation = parsed.data;
  const database = getAdminDb();
  const now = new Date().toISOString();

  try {
    if (operation.action === 'duplicate') {
      const sourceRef = database.collection('products').doc(operation.target.id);
      const newId = `prod-${randomUUID()}`;
      const newRef = database.collection('products').doc(newId);
      const duplicate = await database.runTransaction(async (transaction) => {
        const source = productFromSnapshot(await transaction.get(sourceRef));
        const freshnessError = assertFresh(source, operation.target.expectedUpdatedAt);
        if (freshnessError || !source) throw new Error(`CONFLICT:${freshnessError}`);
        const draft = createProductDuplicateDraft(source, {
          id: newId, slug: duplicateSlug(source, newId), now, actor: admin.uid,
          createVariantId: () => `variant-${randomUUID()}`,
        });
        transaction.create(newRef, draft);
        return draft;
      });
      revalidateTag('products', { expire: 0 });
      return json({ product: duplicate, message: 'Черновик создан. Укажите новые SKU перед публикацией.' }, 201);
    }

    if (operation.action === 'quick_edit') {
      const reference = database.collection('products').doc(operation.target.id);
      const saved = await database.runTransaction(async (transaction) => {
        const current = productFromSnapshot(await transaction.get(reference));
        const freshnessError = assertFresh(current, operation.target.expectedUpdatedAt);
        if (freshnessError || !current) throw new Error(`CONFLICT:${freshnessError}`);
        const { categories, attributes } = await loadTaxonomy(transaction);
        const categoryId = operation.patch.categoryId || current.categoryId;
        const target = validateTargetCategory(categoryId, categories);
        if (target.error || !target.category) throw new Error(`VALIDATION:${target.error}`);
        const nextPatch = { ...operation.patch } as Record<string, unknown>;
        const writePatch = { ...nextPatch };
        if (nextPatch.stockQuantity === null) {
          delete nextPatch.stockQuantity;
          writePatch.stockQuantity = FieldValue.delete();
        }
        const next = { ...current, ...nextPatch, categoryId, categorySlug: target.category.slug } as Product;
        if (operation.patch.stockQuantity === null) delete next.stockQuantity;
        if (next.status === 'published') {
          const readiness = getProductReadiness(next, categories, attributes);
          if (!readiness.readyToPublish) throw new Error(`VALIDATION:${readiness.blockers.map((issue) => issue.label).join(' · ')}`);
        }
        const update = { ...writePatch, categoryId, categorySlug: target.category.slug, updatedAt: now, updatedBy: admin.uid };
        transaction.update(reference, update);
        return { ...next, updatedAt: now, updatedBy: admin.uid } as Product;
      });
      revalidateTag('products', { expire: 0 });
      return json({ product: saved, message: 'Изменения сохранены.' });
    }

    const targetIds = new Set(operation.targets.map((target) => target.id));
    if (targetIds.size !== operation.targets.length) return json({ error: 'Один товар выбран несколько раз.' }, 400);
    const updated = await database.runTransaction(async (transaction) => {
      const references = operation.targets.map((target) => database.collection('products').doc(target.id));
      const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
      const products = snapshots.map(productFromSnapshot);
      for (const [index, product] of products.entries()) {
        const freshnessError = assertFresh(product, operation.targets[index].expectedUpdatedAt);
        if (freshnessError) throw new Error(`CONFLICT:${freshnessError}`);
      }
      const { categories, attributes } = await loadTaxonomy(transaction);
      if (operation.action === 'bulk_category') {
        const target = validateTargetCategory(operation.categoryId, categories);
        if (target.error || !target.category) throw new Error(`VALIDATION:${target.error}`);
        const blocked = products.flatMap((product) => {
          if (!product || product.status !== 'published') return [];
          const readiness = getProductReadiness({
            ...product,
            categoryId: target.category!.id,
            categorySlug: target.category!.slug,
          }, categories, attributes);
          return readiness.readyToPublish
            ? []
            : [`${product.titleRu}: ${readiness.blockers.map((issue) => issue.label).join(', ')}`];
        });
        if (blocked.length) throw new Error(`VALIDATION:${blocked.join(' · ')}`);
        references.forEach((reference) => transaction.update(reference, {
          categoryId: target.category!.id,
          categorySlug: target.category!.slug,
          updatedAt: now,
          updatedBy: admin.uid,
        }));
      } else {
        if (operation.status === 'published') {
          const blocked = products.flatMap((product) => {
            if (!product) return [];
            const readiness = getProductReadiness(product, categories, attributes);
            return readiness.readyToPublish ? [] : [`${product.titleRu}: ${readiness.blockers.map((issue) => issue.label).join(', ')}`];
          });
          if (blocked.length) throw new Error(`VALIDATION:${blocked.join(' · ')}`);
        }
        references.forEach((reference) => transaction.update(reference, { status: operation.status, updatedAt: now, updatedBy: admin.uid }));
      }
      return products.length;
    });
    revalidateTag('products', { expire: 0 });
    return json({ updated, message: operation.action === 'bulk_category' ? `Категория изменена у ${updated} товаров.` : `${updated} товаров обновлено.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('CONFLICT:')) return json({ error: message.slice('CONFLICT:'.length) }, 409);
    if (message.startsWith('VALIDATION:')) return json({ error: message.slice('VALIDATION:'.length) }, 400);
    logError('Product operation failed.', error);
    return json({ error: firebaseAdminUnavailableMessage('данных', error) }, 503);
  }
}
