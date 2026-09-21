import type { Product } from '@/types';
import { getMinimumSalePrice } from '@/lib/commerce/productOffer';

export function buildProductStructuredData(product: Product, {
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  const availability = product.stockStatus === 'in_stock'
    ? 'https://schema.org/InStock'
    : product.stockStatus === 'out_of_stock'
      ? 'https://schema.org/OutOfStock'
      : 'https://schema.org/PreOrder';
  const minimumSalePrice = getMinimumSalePrice(product);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: [...new Set([product.mainImage, ...(product.images || [])].filter(Boolean))],
    sku: product.sku,
    url,
    brand: product.brandName
      ? {
          '@type': 'Brand',
          name: product.brandName,
        }
      : undefined,
    offers: minimumSalePrice
      ? {
          '@type': 'Offer',
          priceCurrency: product.currency === 'сум' ? 'UZS' : product.currency,
          price: minimumSalePrice.amount,
          availability,
          url,
        }
      : undefined,
  };
}
