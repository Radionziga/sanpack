import type { Attribute, Category, Product, ProductVariant } from '@/types';
import { getApplicableAttributes } from '@/lib/catalog/attributeApplicability';
import { getCategoryLineage, isProductCategory, resolveProductCategory } from '@/lib/catalog/categoryHierarchy';
import { hasRequiredProductOrVariantAttribute } from '@/lib/catalog/productAttributeRequirements';
import { getEffectiveCatalogPrice } from '@/lib/commerce/productOffer';

export type ProductReadinessSeverity = 'blocker' | 'recommendation';

export interface ProductReadinessIssue {
  code: string;
  label: string;
  severity: ProductReadinessSeverity;
}

export function getProductReadiness(product: Partial<Product>, categories: Category[], attributes: Attribute[]) {
  const issues: ProductReadinessIssue[] = [];
  const category = product.categoryId ? resolveProductCategory(product as Product, categories) : undefined;
  if (!product.sku?.trim()) issues.push({ code: 'missing_sku', label: 'Не указан SKU', severity: 'blocker' });
  if (!category || !isProductCategory(category.id, categories)) {
    issues.push({ code: 'invalid_category', label: 'Не выбрана рабочая категория', severity: 'blocker' });
  }
  const mode = product.priceMode || 'fixed';
  if ((mode === 'fixed' || mode === 'from') && !getEffectiveCatalogPrice(product as Product)) {
    issues.push({ code: 'missing_price', label: 'Нет доступной цены', severity: 'blocker' });
  }
  const seenSkus = new Set<string>();
  if (product.sku?.trim()) seenSkus.add(product.sku.trim().toLocaleLowerCase('ru'));
  for (const [index, variant] of (product.variants || []).entries()) {
    const sku = variant.sku?.trim().toLocaleLowerCase('ru');
    if (!sku) issues.push({ code: `variant_sku_${index}`, label: `У варианта ${index + 1} нет SKU`, severity: 'blocker' });
    else if (seenSkus.has(sku)) issues.push({ code: `duplicate_variant_sku_${index}`, label: `SKU варианта «${variant.sku}» повторяется`, severity: 'blocker' });
    else seenSkus.add(sku);
  }
  if (category) {
    for (const attribute of getApplicableAttributes(attributes, category.id, categories)) {
      if (attribute.required && !hasRequiredProductOrVariantAttribute(product, attribute.key)) {
        issues.push({ code: `attribute_${attribute.key}`, label: `Нет обязательной характеристики «${attribute.titleRu}»`, severity: 'blocker' });
      }
    }
  }
  if (!product.mainImage?.trim()) issues.push({ code: 'missing_image', label: 'Нет основного изображения', severity: 'recommendation' });
  if (!product.shortDescriptionRu?.trim()) issues.push({ code: 'missing_short_description', label: 'Нет краткого описания', severity: 'recommendation' });
  if (!product.titleEn?.trim()) issues.push({ code: 'missing_en_title', label: 'Нет названия на английском', severity: 'recommendation' });
  return {
    issues,
    blockers: issues.filter((issue) => issue.severity === 'blocker'),
    recommendations: issues.filter((issue) => issue.severity === 'recommendation'),
    readyToPublish: issues.every((issue) => issue.severity !== 'blocker'),
  };
}

export function getCompactCategoryName(product: Product, categories: Category[]) {
  return resolveProductCategory(product, categories)?.titleRu || 'Категория не найдена';
}

export function getCategoryBreadcrumb(product: Product, categories: Category[]) {
  const category = resolveProductCategory(product, categories);
  return category ? getCategoryLineage(category.id, categories).map((node) => node.titleRu).join(' → ') : 'Категория не найдена';
}

export const productStatusLabels: Record<Product['status'], string> = {
  published: 'Опубликован', draft: 'Черновик', hidden: 'Скрыт', archived: 'В архиве',
};

export const stockStatusLabels: Record<Product['stockStatus'], string> = {
  in_stock: 'В наличии', out_of_stock: 'Нет в наличии', on_order: 'Под заказ',
  temporarily_unavailable: 'Временно недоступен', discontinued: 'Снят с ассортимента',
};

export function duplicateVariantDraft(variant: ProductVariant): ProductVariant {
  return {
    ...structuredClone(variant),
    id: `variant-${crypto.randomUUID()}`,
    sku: '',
    titleRu: `${variant.titleRu} — копия`,
  };
}

export function createProductDuplicateDraft(
  source: Product,
  input: { id: string; slug: string; now: string; actor: string; createVariantId: () => string },
): Product {
  return {
    ...structuredClone(source),
    id: input.id,
    slug: input.slug,
    sku: '',
    status: 'draft',
    titleRu: `${source.titleRu} — копия`,
    featured: false,
    newProduct: false,
    // Manual SEO copy often contains source-specific wording. A duplicate starts
    // from the automatic policy derived from its own new title and canonical.
    seo: undefined,
    variants: (source.variants || []).map((variant) => ({ ...variant, id: input.createVariantId(), sku: '' })),
    createdAt: input.now,
    updatedAt: input.now,
    createdBy: input.actor,
    updatedBy: input.actor,
  };
}
