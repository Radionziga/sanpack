import 'server-only';

import type { Product, ProductPriceMode, RequestItem } from '@/types';
import type { CheckoutLineInput } from '@/lib/validation/order';
import { getAdminDb } from '@/lib/firebase/admin';
import { getProductOrderRule, isValidOrderQuantity } from '@/lib/commerce/orderQuantities';

function resolvePriceMode(product: Product, variantId?: string): ProductPriceMode {
  const variant = variantId
    ? product.variants?.find((candidate) => candidate.id === variantId)
    : undefined;
  return variant?.priceMode ?? product.priceMode ?? (product.showPrice ? 'fixed' : 'request');
}

function assertQuantity(product: Product, quantity: number) {
  const rule = getProductOrderRule(product);
  const minimum = rule.minimumQuantity;
  const maximum = product.maximumOrder;
  const step = rule.quantityStep;

  if (quantity < minimum) {
    throw new Error(`Минимальное количество для «${product.titleRu}»: ${minimum}.`);
  }
  if (maximum && quantity > maximum) {
    throw new Error(`Максимальное количество для «${product.titleRu}»: ${maximum}.`);
  }
  if (!isValidOrderQuantity(product, quantity)) {
    throw new Error(`Количество для «${product.titleRu}» должно изменяться с шагом ${step}.`);
  }
}

async function readProducts(ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  const snapshots = await Promise.all(
    uniqueIds.map((id) => getAdminDb().collection('products').doc(id).get())
  );
  const products = new Map<string, Product>();
  for (const snapshot of snapshots) {
    if (snapshot.exists) {
      products.set(snapshot.id, { id: snapshot.id, ...snapshot.data() } as Product);
    }
  }
  return products;
}

export async function createOrderSnapshots(lines: CheckoutLineInput[]) {
  const products = await readProducts(lines.map((line) => line.productId));

  return lines.map((line): RequestItem => {
    const product = products.get(line.productId);
    if (!product || product.status !== 'published') {
      throw new Error('Один из товаров больше недоступен. Обновите корзину.');
    }
    const variant = line.variantId
      ? product.variants?.find((candidate) => candidate.id === line.variantId)
      : undefined;
    if (line.variantId && !variant) {
      throw new Error(`Выбранный вариант «${product.titleRu}» больше недоступен.`);
    }

    const priceMode = resolvePriceMode(product, line.variantId);
    if (priceMode === 'informational') {
      throw new Error(`Товар «${product.titleRu}» нельзя добавить в заявку.`);
    }
    assertQuantity(product, line.quantity);

    const price = variant?.price ?? product.price;
    const lineTotal = price === undefined ? undefined : price * line.quantity;

    return {
      lineId: crypto.randomUUID(),
      productId: product.id,
      productTitleRu: product.titleRu,
      productTitleUz: product.titleUz || product.titleRu,
      productTitleEn: product.titleEn,
      productSlug: product.slug,
      variantId: variant?.id,
      variantTitleRu: variant?.titleRu,
      variantTitleUz: variant?.titleUz,
      variantTitleEn: variant?.titleEn,
      sku: variant?.sku || product.sku,
      quantity: line.quantity,
      unit: product.salesUnit || 'шт',
      price,
      priceMode,
      lineTotal,
      comment: line.comment,
      image: variant?.image || product.mainImage,
    };
  });
}

export function calculateOrderTotals(items: RequestItem[], adjustment = 0) {
  const subtotal = items.reduce(
    (sum, item) => sum + (item.price === undefined ? 0 : item.price * item.quantity),
    0
  );
  return {
    subtotal,
    adjustment,
    total: Math.max(0, subtotal + adjustment),
  };
}
