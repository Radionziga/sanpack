import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/catalog/ProductDetailClient';
import {
  getPublicAttributes,
  getPublicCategories,
  getPublicProducts,
} from '@/lib/repositories/serverCatalogRepository';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;
  const [products, categories, attributes] = await Promise.all([
    getPublicProducts(),
    getPublicCategories(),
    getPublicAttributes(),
  ]);
  const product = products.find((candidate) => candidate.slug === productSlug);
  if (!product) notFound();

  const configuredIds = [...new Set([
    ...(product.relatedProductIds || []),
    ...(product.accessoryProductIds || []),
  ])];
  const relatedProducts = configuredIds.length
    ? configuredIds.flatMap((id) => products.find((candidate) => candidate.id === id) || [])
    : products.filter((candidate) => candidate.categoryId === product.categoryId && candidate.id !== product.id);

  return (
    <ProductDetailClient
      initialProduct={product}
      initialAttributeDefinitions={attributes}
      initialCategories={categories}
      initialRelatedProducts={relatedProducts.slice(0, 4)}
    />
  );
}
