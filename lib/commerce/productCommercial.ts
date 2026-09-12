import type { Language, Product, ProductVariant } from '@/types';
import { formatMoney, formatProductQuantity, formatQuantity } from '@/lib/catalog/productPresentation';
import { getProductOrderRule } from '@/lib/commerce/orderQuantities';
import { getProductOrderUnitPrice, getProductWholesaleTiers } from '@/lib/commerce/productOffer';

export interface ProductCommercialDetails {
  packaging?: string;
  minimum: string;
  minimumAmount?: number;
  wholesale: string[];
}

function joinMinimum(quantity: string, amount: string | undefined, language: Language) {
  const prefix = language === 'zh' ? '最低' : language === 'uz' ? 'Eng kamida' : language === 'en' ? 'Minimum' : 'Минимум';
  return `${prefix} ${quantity}${amount ? ` · ${amount}` : ''}`;
}

export function getProductCommercialDetails(
  product: Product,
  language: Language,
  variant?: ProductVariant,
): ProductCommercialDetails {
  const rule = getProductOrderRule(product, language, variant);
  const minimumUnitPrice = getProductOrderUnitPrice(product, variant, rule.minimumQuantity);
  const minimumAmount = typeof minimumUnitPrice === 'number' && minimumUnitPrice > 0
    ? minimumUnitPrice * rule.minimumQuantity
    : undefined;
  const packageQuantity = rule.packageEnabled
    ? formatQuantity(rule.minimumPackages, rule.packageName, language)
    : formatProductQuantity(product, rule.minimumQuantity, language);
  const packaging = rule.packageEnabled
    ? `${formatQuantity(1, rule.packageName, language)} = ${formatProductQuantity(product, rule.unitsPerPackage, language)}`
    : undefined;
  const from = language === 'zh' ? '起' : language === 'uz' ? 'dan boshlab' : language === 'en' ? 'From' : 'От';
  const wholesale = getProductWholesaleTiers(product, variant).map((tier) => {
    const threshold = rule.packageEnabled && tier.minQuantity % rule.unitsPerPackage === 0
      ? formatQuantity(tier.minQuantity / rule.unitsPerPackage, rule.packageName, language)
      : formatProductQuantity(product, tier.minQuantity, language);
    const price = formatMoney(tier.price, language, product.currency);
    const perUnit = language === 'zh' ? `每 ${rule.salesUnit}` : `/ ${rule.salesUnit}`;
    return language === 'uz'
      ? `${threshold}${from} — ${price} ${perUnit}`
      : `${from} ${threshold} — ${price} ${perUnit}`;
  });

  return {
    packaging,
    minimum: joinMinimum(
      packageQuantity,
      minimumAmount ? formatMoney(minimumAmount, language, product.currency) : undefined,
      language,
    ),
    minimumAmount,
    wholesale,
  };
}
