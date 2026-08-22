'use client';

import React, { useState, useEffect, use } from 'react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGallery } from '@/components/catalog/ProductGallery';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ProductDetailSkeleton } from '@/components/catalog/ProductDetailSkeleton';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import { Attribute, Product, ProductVariant } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Heart,
  ShoppingCart,
  Check,
  Download,
  Phone,
  Send,
  MessageCircle,
  Truck,
  FileText,
  Calculator,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Minus,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import {
  getOrderRuleSummary,
  getProductOrderRule,
  normalizeOrderQuantity,
} from '@/lib/commerce/orderQuantities';
import {
  getProductUnitPrice,
  isProductOrderable,
} from '@/lib/commerce/productOffer';
import {
  formatMoney,
  formatProductQuantity,
  getPresentedProductAttributes,
  getProductDescriptionText,
  getProductPriceLabel,
} from '@/lib/catalog/productPresentation';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = use(params);
  const { t, getLocalizedText, language } = useLanguage();
  const { contacts } = useSiteSettings();
  const copy = {
    ru: {
      notFound: 'Товар не найден',
      back: 'Вернуться в каталог',
      stock: 'В наличии на складе в Ташкенте',
      order: 'Под заказ',
      tiers: 'Скидки от объёма заказа',
      from: 'от',
      properties: 'Основные свойства',
      total: 'Итого',
      added: 'Добавлено в заявку',
      inRequest: 'В заявке',
      favorite: 'В избранном',
      manager: 'Быстрая связь с менеджером',
      message: 'Здравствуйте! Интересует товар',
      cityDelivery: 'Доставка по Ташкенту',
      cityDeliveryText: 'Бесплатная доставка B2B-заявок от 2 000 000 сум. Для остальных заказов доступна экспресс-доставка.',
      regions: 'Регионы Узбекистана',
      regionsText: 'Отправка через партнёрские службы во все области Узбекистана.',
      docs: 'Сертификаты и санитарные заключения предоставляются менеджером при оформлении договора.',
      loadError: 'Не удалось загрузить товар',
      loadErrorHint: 'Проверьте соединение и попробуйте ещё раз.',
      retry: 'Повторить',
      noDescription: 'Описание пока не добавлено. Уточните детали у менеджера.',
      decrease: 'Уменьшить количество',
      increase: 'Увеличить количество',
      selectVariant: 'Сначала выберите вариант',
      informational: 'Только информация',
    },
    uz: {
      notFound: 'Mahsulot topilmadi',
      back: 'Katalogga qaytish',
      stock: 'Toshkent omborida mavjud',
      order: 'Buyurtma asosida',
      tiers: 'Buyurtma hajmi bo‘yicha chegirmalar',
      from: 'dan',
      properties: 'Asosiy xususiyatlar',
      total: 'Jami',
      added: 'Arizaga qo‘shildi',
      inRequest: 'Arizada',
      favorite: 'Tanlanganlarda',
      manager: 'Menejer bilan tezkor aloqa',
      message: 'Salom! Meni ushbu mahsulot qiziqtiradi',
      cityDelivery: 'Toshkent bo‘ylab yetkazib berish',
      cityDeliveryText: '2 000 000 so‘mdan B2B arizalar uchun yetkazib berish bepul. Boshqa buyurtmalar uchun tezkor yetkazib berish mavjud.',
      regions: 'O‘zbekiston hududlari',
      regionsText: 'Hamkor logistika xizmatlari orqali O‘zbekistonning barcha hududlariga jo‘natish.',
      docs: 'Sertifikatlar va sanitariya xulosalari shartnoma rasmiylashtirilganda menejer tomonidan taqdim etiladi.',
      loadError: 'Mahsulotni yuklab bo‘lmadi',
      loadErrorHint: 'Internet aloqasini tekshiring va qayta urinib ko‘ring.',
      retry: 'Qayta urinish',
      noDescription: 'Mahsulot tavsifi hali qo‘shilmagan. Tafsilotlarni menejerdan aniqlashtiring.',
      decrease: 'Miqdorni kamaytirish',
      increase: 'Miqdorni oshirish',
      selectVariant: 'Avval variantni tanlang',
      informational: 'Faqat ma’lumot uchun',
    },
    en: {
      notFound: 'Product not found',
      back: 'Back to catalog',
      stock: 'In stock at our Tashkent warehouse',
      order: 'Available to order',
      tiers: 'Volume discounts',
      from: 'from',
      properties: 'Key properties',
      total: 'Total',
      added: 'Added to request',
      inRequest: 'In request',
      favorite: 'In favorites',
      manager: 'Contact a manager',
      message: 'Hello! I am interested in this product',
      cityDelivery: 'Delivery in Tashkent',
      cityDeliveryText: 'Free delivery for B2B requests over UZS 2,000,000. Express delivery is available for other orders.',
      regions: 'Regions of Uzbekistan',
      regionsText: 'Shipping through partner logistics providers to every region of Uzbekistan.',
      docs: 'Certificates and sanitary documents are provided by a manager when the contract is prepared.',
      loadError: 'We could not load this product',
      loadErrorHint: 'Check your connection and try again.',
      retry: 'Try again',
      noDescription: 'A product description has not been added yet. Ask a manager for details.',
      decrease: 'Decrease quantity',
      increase: 'Increase quantity',
      selectVariant: 'Choose a variant first',
      informational: 'Information only',
    },
  }[language];
  const { addItem, isInCart } = useRequestCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [product, setProduct] = useState<Product | null>(null);
  const [attributeDefinitions, setAttributeDefinitions] = useState<Attribute[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'delivery' | 'docs'>('desc');
  const [isQuantityEditing, setIsQuantityEditing] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'not-found' | 'error'>('loading');
  const [loadVersion, setLoadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoadState('loading');
      try {
        const [all, definitions] = await Promise.all([
          PublicRepository.getProducts(),
          PublicRepository.getAttributes(),
        ]);
        if (cancelled) return;

        const loadedProduct = all.find((item) => item.slug === productSlug) || null;
        setProduct(loadedProduct);
        setAttributeDefinitions(definitions);
        if (!loadedProduct) {
          setSelectedVariant(null);
          setRelatedProducts([]);
          setLoadState('not-found');
          return;
        }

        setSelectedVariant(null);
        setQuantity(getProductOrderRule(loadedProduct).minimumQuantity);
        const related = all.filter(
          (item) => item.categoryId === loadedProduct.categoryId && item.id !== loadedProduct.id,
        );
        setRelatedProducts(related.slice(0, 4));
        setLoadState('ready');
      } catch {
        if (cancelled) return;
        setProduct(null);
        setSelectedVariant(null);
        setRelatedProducts([]);
        setLoadState('error');
      }
    }
    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [loadVersion, productSlug]);

  if (loadState === 'loading') {
    return <ProductDetailSkeleton />;
  }

  if (loadState === 'error') {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
        <Header />
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16">
          <div className="flex max-w-lg flex-col items-center rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-6 py-10 text-center shadow-[var(--sp-shadow-raised)] sm:px-10">
            <AlertCircle className="size-10 text-[var(--sp-danger)]" aria-hidden="true" />
            <h1 className="mt-5 text-2xl font-bold text-[var(--sp-ink)]">{copy.loadError}</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--sp-ink-secondary)]">{copy.loadErrorHint}</p>
            <button
              type="button"
              onClick={() => setLoadVersion((version) => version + 1)}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-5 text-sm font-semibold text-[var(--sp-on-brand)] transition-colors hover:bg-[var(--sp-brand-deep)]"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              {copy.retry}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loadState === 'not-found' || !product) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
        <Header />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
          <h1 className="mb-5 text-2xl font-bold text-[var(--sp-ink)]">{copy.notFound}</h1>
          <Link href="/catalog" className="inline-flex min-h-11 items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-6 text-sm font-semibold text-[var(--sp-on-brand)] transition-colors hover:bg-[var(--sp-brand-deep)]">
            {copy.back}
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const title = getLocalizedText(product.titleRu, product.titleUz, product.titleEn);
  const description = getProductDescriptionText(product, language);
  const favorited = isFavorite(product.id);
  const variantRequired = Boolean(product.variants?.length && !selectedVariant);
  const inCart = isInCart(product.id, selectedVariant?.id);
  const orderRule = getProductOrderRule(product, language, selectedVariant || undefined);
  const orderSummary = getOrderRuleSummary(product, language, selectedVariant || undefined);
  const orderable = isProductOrderable(product, selectedVariant || undefined);

  // Dynamic price computation considering wholesale tiers
  const activeTiers = selectedVariant?.wholesaleTiers || product.wholesaleTiers || [];
  const variantStartingPrice = product.variants
    ?.map((variant) => variant.price)
    .filter((price): price is number => typeof price === 'number' && price > 0)
    .sort((left, right) => left - right)[0];
  let unitPrice = selectedVariant
    ? getProductUnitPrice(product, selectedVariant) ?? 0
    : variantStartingPrice ?? getProductUnitPrice(product) ?? 0;

  if (activeTiers.length > 0) {
    // Find matching tier
    const sortedTiers = [...activeTiers].sort((a, b) => b.minQuantity - a.minQuantity);
    const matchedTier = sortedTiers.find((t) => quantity >= t.minQuantity);
    if (matchedTier) {
      unitPrice = matchedTier.price;
    }
  }

  const totalPrice = unitPrice * quantity;

  const visibleAttributes = getPresentedProductAttributes(
    product,
    attributeDefinitions,
    language,
    selectedVariant?.attributes,
  );
  const keyAttributes = visibleAttributes.slice(0, 4);
  const priceLabel = getProductPriceLabel(product, language);
  const managerSku = selectedVariant?.sku || product.sku;
  const galleryImages = [selectedVariant?.image, ...(product.images || [])]
    .filter((image): image is string => Boolean(image))
    .filter((image, index, images) => images.indexOf(image) === index);
  const quantityLabel = t('quantity').replace(/:\s*$/, '');

  const handleAddToCart = () => {
    if (variantRequired || !orderable) return;
    addItem(product, selectedVariant || undefined, quantity);
  };

  const handleSelectVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setQuantity(getProductOrderRule(product, language, variant).minimumQuantity);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--sp-canvas)]">
      <Header />

      <main className="flex-1 pb-[calc(var(--sp-mobile-nav-height)+env(safe-area-inset-bottom)+5.5rem)] pt-5 md:py-8">
        <div className="mx-auto max-w-7xl px-4">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6 hidden flex-wrap items-center gap-2 text-xs font-medium text-[var(--sp-ink-tertiary)] md:flex">
            <Link href="/" className="transition-colors hover:text-[var(--sp-brand)]">
              {t('home')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/catalog" className="transition-colors hover:text-[var(--sp-brand)]">
              {t('catalog')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="max-w-xs truncate font-semibold text-[var(--sp-ink)]" aria-current="page">{title}</span>
          </nav>

          {/* Mobile Back Button */}
          <div className="mb-3 flex items-center justify-between gap-2 lg:hidden">
            <Link
              href="/catalog"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 text-xs font-semibold text-[var(--sp-ink)] shadow-2xs transition-all hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] active:scale-95"
            >
              <ChevronLeft className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
              <span>{copy.back || t('catalog')}</span>
            </Link>
          </div>

          <h1 className="mb-4 break-words text-xl font-bold leading-snug tracking-tight text-[var(--sp-ink)] lg:hidden">
            {title}
          </h1>

          {/* Product Hero Top Grid */}
          <div className="mb-8 grid grid-cols-1 gap-5 lg:mb-12 lg:grid-cols-12 lg:gap-8">
            {/* Col 1: Gallery */}
            <div className="order-1 lg:order-none lg:col-span-5">
              <ProductGallery images={galleryImages} title={title} />
            </div>

            {/* Col 3: Sticky Commercial Action Box */}
            <div className="order-2 lg:order-3 lg:col-span-3">
              <div className="space-y-5 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-[var(--sp-shadow-raised)] sm:p-6 lg:sticky lg:top-24">
                <div>
                  <span className="mb-1 block text-xs font-medium text-[var(--sp-ink-tertiary)]">
                    {priceLabel}
                  </span>
                  <span className="block break-words text-2xl font-bold tracking-tight text-[var(--sp-brand)]">
                    {product.showPrice && unitPrice > 0
                      ? `${variantRequired ? `${copy.from} ` : ''}${formatMoney(unitPrice, language, product.currency)}`
                      : t('priceOnRequest')}
                  </span>
                  <span className="mt-1 block text-[11px] leading-5 text-[var(--sp-ink-secondary)]">
                    {orderSummary}
                  </span>
                </div>

                {/* Variants belong to the purchase flow. */}
                {product.variants && product.variants.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-[var(--sp-ink)]">
                      {t('chooseVariant')}
                    </span>
                    <div className="space-y-2">
                      {product.variants.map((variant) => {
                        const isSelected = selectedVariant?.id === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => handleSelectVariant(variant)}
                            aria-pressed={isSelected}
                            className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--sp-radius-control)] border p-3 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] ${
                              isSelected
                                ? 'border-[var(--sp-brand)] bg-[color-mix(in_srgb,var(--sp-brand)_9%,var(--sp-surface))] font-semibold text-[var(--sp-brand)]'
                                : 'border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)] hover:border-[var(--sp-line-strong)]'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block">{getLocalizedText(variant.titleRu, variant.titleUz, variant.titleEn)}</span>
                              {product.showPrice && variant.price ? (
                                <span className="mt-0.5 block text-[10px] font-medium tabular-nums text-[var(--sp-ink-tertiary)]">
                                  {formatMoney(variant.price, language, product.currency)}
                                </span>
                              ) : null}
                            </span>
                            {isSelected ? <Check className="size-4 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    {variantRequired ? (
                      <p id="variant-selection-hint" className="text-[11px] leading-5 text-[var(--sp-ink-secondary)]" aria-live="polite">
                        {copy.selectVariant}
                      </p>
                    ) : null}
                  </div>
                )}

                {/* Quantity Controls */}
                <div className="space-y-2">
                  <label htmlFor="product-quantity" className="block text-xs font-semibold text-[var(--sp-ink)]">
                    {quantityLabel} ({product.salesUnit})
                  </label>
                  <div className="flex items-center overflow-hidden rounded-[var(--sp-radius-control)] border border-[var(--sp-control-border)] bg-[var(--sp-control)]">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(orderRule.minimumQuantity, q - orderRule.quantityStep))}
                      aria-label={copy.decrease}
                      className="flex size-11 shrink-0 items-center justify-center text-[var(--sp-ink-secondary)] transition-colors hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]"
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </button>
                    <input
                      id="product-quantity"
                      type="number"
                      min={orderRule.minimumQuantity}
                      max={orderRule.maximumQuantity}
                      step={orderRule.quantityStep}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || orderRule.minimumQuantity)}
                      onFocus={() => setIsQuantityEditing(true)}
                      onBlur={() => {
                        setQuantity((current) => normalizeOrderQuantity(product, current, selectedVariant || undefined));
                        setIsQuantityEditing(false);
                      }}
                      aria-label={quantityLabel}
                      className="min-w-0 flex-1 bg-transparent px-1 text-center text-base font-semibold tabular-nums text-[var(--sp-ink)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => normalizeOrderQuantity(
                        product,
                        q + orderRule.quantityStep,
                        selectedVariant || undefined,
                      ))}
                      aria-label={copy.increase}
                      className="flex size-11 shrink-0 items-center justify-center text-[var(--sp-ink-secondary)] transition-colors hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Price Total Calculation */}
                {product.showPrice && unitPrice > 0 && !variantRequired && (
                  <div className="flex items-center justify-between gap-3 rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-brand)_22%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-brand)_8%,var(--sp-surface))] p-3 text-xs">
                    <span className="flex items-center gap-1 font-medium text-[var(--sp-ink-secondary)]">
                      <Calculator className="w-3.5 h-3.5 text-[var(--sp-brand)]" /> {copy.total}:
                    </span>
                    <span className="break-words text-right text-base font-semibold tabular-nums text-[var(--sp-brand)]">
                      {formatMoney(totalPrice, language, product.currency)}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <motion.button
                    type="button"
                    disabled={variantRequired || !orderable}
                    aria-describedby={variantRequired ? 'variant-selection-hint' : undefined}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddToCart}
                    className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-semibold shadow-[var(--sp-shadow-raised)] transition-colors disabled:cursor-not-allowed disabled:bg-[var(--sp-control)] disabled:text-[var(--sp-ink-tertiary)] disabled:shadow-none ${
                      inCart && !variantRequired
                        ? 'bg-[var(--sp-brand-deep)] text-[var(--sp-on-brand-deep)]'
                        : 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] hover:bg-[var(--sp-brand-deep)]'
                    }`}
                  >
                    {variantRequired ? (
                      <>
                        <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                        <span>{copy.selectVariant}</span>
                      </>
                    ) : !orderable ? (
                      <>
                        <AlertCircle className="w-4 h-4" aria-hidden="true" />
                        <span>{copy.informational}</span>
                      </>
                    ) : inCart ? (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" />
                        <span>{copy.added}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                        <span>{t('addToRequest')}</span>
                      </>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(product.id)}
                    className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border px-4 text-sm font-medium transition-colors ${
                      favorited
                        ? 'border-[color-mix(in_srgb,var(--sp-danger)_32%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-danger)_8%,var(--sp-surface))] text-[var(--sp-danger)]'
                        : 'border-[var(--sp-line)] text-[var(--sp-ink-secondary)] hover:border-[var(--sp-line-strong)] hover:bg-[var(--sp-surface-inset)]'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} aria-hidden="true" />
                    <span>{favorited ? copy.favorite : t('favorites')}</span>
                  </button>
                </div>

                {/* Fast Messenger Triggers */}
                {(contacts.telegram || contacts.whatsapp) ? <div className="space-y-2 border-t border-[var(--sp-line)] pt-4">
                  <p className="text-[11px] font-medium text-[var(--sp-ink-secondary)]">{copy.manager}:</p>
                  <div className={`grid gap-2 ${contacts.telegram && contacts.whatsapp ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {contacts.telegram ? <a
                      href={`${contacts.telegram}${contacts.telegram.includes('?') ? '&' : '?'}text=${encodeURIComponent(`${copy.message}: ${title} (SKU: ${managerSku})`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-2 text-[11px] font-semibold text-[var(--sp-ink-secondary)] transition-colors hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)]"
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Telegram</span>
                    </a> : null}
                    {contacts.whatsapp ? <a
                      href={`${contacts.whatsapp}${contacts.whatsapp.includes('?') ? '&' : '?'}text=${encodeURIComponent(`${copy.message}: ${title} (SKU: ${managerSku})`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-2 text-[11px] font-semibold text-[var(--sp-ink-secondary)] transition-colors hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)]"
                    >
                      <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>WhatsApp</span>
                    </a> : null}
                  </div>
                </div> : null}
              </div>
            </div>

            {/* Col 2: Info & Specs */}
            <div className="order-3 space-y-5 lg:order-2 lg:col-span-4">
              <div className="hidden lg:block">
                <h1 className="break-words text-xl font-bold leading-snug tracking-tight text-[var(--sp-ink)] sm:text-2xl">
                  {title}
                </h1>
              </div>

              {/* Stock Status Badge */}
              <div className="flex items-center gap-2 rounded-[var(--sp-radius-control)] border border-[color-mix(in_srgb,var(--sp-brand)_22%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-brand)_9%,var(--sp-surface))] p-3 text-xs font-semibold text-[var(--sp-brand)]">
                <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
                <span>{product.stockStatus === 'in_stock' ? copy.stock : copy.order}</span>
              </div>

              {/* Wholesale Tiers Visual Badge */}
              {activeTiers.length > 0 && (
                <div className="space-y-2 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--sp-ink)]">
                    <TrendingDown className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
                    <span>{copy.tiers}:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {activeTiers.map((tier, idx) => (
                      <div
                        key={idx}
                        className={`rounded-[var(--sp-radius-control)] border p-2 text-center transition-colors ${
                          quantity >= tier.minQuantity
                            ? 'border-transparent bg-[var(--sp-brand)] font-semibold text-[var(--sp-on-brand)]'
                            : 'border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)]'
                        }`}
                      >
                        <div className="text-[10px] opacity-80">{copy.from} {formatProductQuantity(product, tier.minQuantity, language)}</div>
                        <div>{formatMoney(tier.price, language, product.currency)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specs List */}
              {keyAttributes.length > 0 ? (
                <section className="space-y-2 border-y border-[var(--sp-line)] py-4 text-xs" aria-labelledby="key-properties-heading">
                  <h2 id="key-properties-heading" className="mb-2 font-compact text-sm font-semibold text-[var(--sp-ink)]">
                    {copy.properties}
                  </h2>
                  {keyAttributes.map((attribute) => (
                    <div key={attribute.key} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-baseline gap-4 border-b border-dashed border-[var(--sp-line-soft)] py-1.5 last:border-0">
                      <span className="font-medium text-[var(--sp-ink-secondary)]">{attribute.label}</span>
                      <span className="break-words text-right font-semibold text-[var(--sp-ink)]">{attribute.value}</span>
                    </div>
                  ))}
                </section>
              ) : null}
            </div>
          </div>

          {/* Mobile details use progressive disclosure instead of desktop tabs. */}
          <div className="mb-8 space-y-2 md:hidden">
            <details open className="group rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--sp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] [&::-webkit-details-marker]:hidden">
                {t('tabDescription')}
                <ChevronDown className="size-4 shrink-0 text-[var(--sp-ink-tertiary)] transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-[var(--sp-line-soft)] px-4 py-4 text-sm leading-7 text-[var(--sp-ink-secondary)]">
                <p>{description || copy.noDescription}</p>
              </div>
            </details>

            {visibleAttributes.length > 0 ? (
              <details className="group rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)]">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--sp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] [&::-webkit-details-marker]:hidden">
                  {t('tabSpecs')}
                  <ChevronDown className="size-4 shrink-0 text-[var(--sp-ink-tertiary)] transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <dl className="divide-y divide-[var(--sp-line-soft)] border-t border-[var(--sp-line-soft)] px-4 text-xs">
                  {visibleAttributes.map((attribute) => (
                    <div key={attribute.key} className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-4 py-3">
                      <dt className="text-[var(--sp-ink-secondary)]">{attribute.label}</dt>
                      <dd className="break-words text-right font-semibold text-[var(--sp-ink)]">{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ) : null}

            <details className="group rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--sp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] [&::-webkit-details-marker]:hidden">
                {t('tabDelivery')}
                <ChevronDown className="size-4 shrink-0 text-[var(--sp-ink-tertiary)] transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="space-y-4 border-t border-[var(--sp-line-soft)] px-4 py-4 text-xs leading-relaxed text-[var(--sp-ink-secondary)]">
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 size-5 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
                  <div><h3 className="text-sm font-semibold text-[var(--sp-ink)]">{copy.cityDelivery}</h3><p>{copy.cityDeliveryText}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-5 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
                  <div><h3 className="text-sm font-semibold text-[var(--sp-ink)]">{copy.regions}</h3><p>{copy.regionsText}</p></div>
                </div>
              </div>
            </details>

            <details className="group rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[var(--sp-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] [&::-webkit-details-marker]:hidden">
                {t('tabDocs')}
                <ChevronDown className="size-4 shrink-0 text-[var(--sp-ink-tertiary)] transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-[var(--sp-line-soft)] px-4 py-4">
                {product.documents && product.documents.length > 0 ? (
                  <div className="space-y-2">
                    {product.documents.map((doc) => (
                      <a key={doc.id} href={doc.url} className="flex min-h-11 items-center justify-between gap-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] p-3 text-xs font-semibold text-[var(--sp-ink)]">
                        <span className="flex min-w-0 items-center gap-3"><FileText className="size-5 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" /><span>{getLocalizedText(doc.titleRu, doc.titleUz, doc.titleEn)}</span></span>
                        <Download className="size-4 shrink-0 text-[var(--sp-ink-tertiary)]" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                ) : <p className="text-xs leading-5 text-[var(--sp-ink-secondary)]">{copy.docs}</p>}
              </div>
            </details>
          </div>

          {/* Details Tabs Section */}
          <div className="mb-12 hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 shadow-[var(--sp-shadow-raised)] sm:p-6 md:block md:p-8">
            <div className="no-scrollbar mb-6 flex items-center gap-4 overflow-x-auto border-b border-[var(--sp-line)] pb-4">
              <button
                type="button"
                aria-pressed={activeTab === 'desc'}
                onClick={() => setActiveTab('desc')}
                className={`whitespace-nowrap border-b-2 pb-2 text-sm font-semibold transition-colors ${
                  activeTab === 'desc'
                    ? 'border-[var(--sp-brand)] text-[var(--sp-brand)]'
                    : 'border-transparent text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'
                }`}
              >
                {t('tabDescription')}
              </button>
              {visibleAttributes.length > 0 ? (
                <button
                  type="button"
                  aria-pressed={activeTab === 'specs'}
                  onClick={() => setActiveTab('specs')}
                  className={`whitespace-nowrap border-b-2 pb-2 text-sm font-semibold transition-colors ${
                    activeTab === 'specs'
                      ? 'border-[var(--sp-brand)] text-[var(--sp-brand)]'
                      : 'border-transparent text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'
                  }`}
                >
                  {t('tabSpecs')}
                </button>
              ) : null}
              <button
                type="button"
                aria-pressed={activeTab === 'delivery'}
                onClick={() => setActiveTab('delivery')}
                className={`whitespace-nowrap border-b-2 pb-2 text-sm font-semibold transition-colors ${
                  activeTab === 'delivery'
                    ? 'border-[var(--sp-brand)] text-[var(--sp-brand)]'
                    : 'border-transparent text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'
                }`}
              >
                {t('tabDelivery')}
              </button>
              <button
                type="button"
                aria-pressed={activeTab === 'docs'}
                onClick={() => setActiveTab('docs')}
                className={`whitespace-nowrap border-b-2 pb-2 text-sm font-semibold transition-colors ${
                  activeTab === 'docs'
                    ? 'border-[var(--sp-brand)] text-[var(--sp-brand)]'
                    : 'border-transparent text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'
                }`}
              >
                {t('tabDocs')}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'desc' && (
              <div className="max-w-3xl text-sm leading-7 text-[var(--sp-ink-secondary)]">
                <p>{description || copy.noDescription}</p>
              </div>
            )}

            {activeTab === 'specs' && visibleAttributes.length > 0 && (
              <div className="space-y-3">
                <dl className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                  {visibleAttributes.map((attribute) => (
                    <div key={attribute.key} className="flex justify-between gap-4 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] p-3">
                      <dt className="text-[var(--sp-ink-secondary)]">{attribute.label}</dt>
                      <dd className="break-words text-right font-semibold text-[var(--sp-ink)]">{attribute.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {activeTab === 'delivery' && (
              <div className="space-y-4 text-xs leading-relaxed text-[var(--sp-ink-secondary)]">
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sp-brand)]" />
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--sp-ink)]">{copy.cityDelivery}</h4>
                    <p>{copy.cityDeliveryText}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sp-brand)]" />
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--sp-ink)]">{copy.regions}</h4>
                    <p>{copy.regionsText}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="space-y-3">
                {product.documents && product.documents.length > 0 ? (
                  product.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      className="flex items-center justify-between rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4 text-xs font-semibold text-[var(--sp-ink)] transition-colors hover:border-[var(--sp-brand)]"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[var(--sp-brand)]" />
                        <span>{getLocalizedText(doc.titleRu, doc.titleUz, doc.titleEn)}</span>
                      </div>
                      <Download className="w-4 h-4 text-[var(--sp-ink-tertiary)]" />
                    </a>
                  ))
                ) : (
                  <p className="text-xs leading-5 text-[var(--sp-ink-secondary)]">
                    {copy.docs}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-[var(--sp-ink)]">{t('relatedProducts')}</h2>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-6">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {!isQuantityEditing ? (
        <div className="fixed inset-x-0 z-30 border-t border-[var(--sp-line)] bg-[color-mix(in_srgb,var(--sp-surface)_97%,transparent)] px-[max(0.75rem,env(safe-area-inset-left))] py-2 shadow-[0_-12px_28px_rgb(21_27_24/10%)] backdrop-blur-xl md:hidden" style={{ bottom: 'calc(var(--sp-mobile-nav-height) + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1" aria-live="polite">
              <span className="block truncate text-[10px] font-medium text-[var(--sp-ink-tertiary)]">{product.showPrice && unitPrice > 0 ? copy.total : priceLabel}</span>
              <span className="block truncate text-base font-bold tabular-nums text-[var(--sp-brand)]">
                {product.showPrice && unitPrice > 0
                  ? `${variantRequired ? `${copy.from} ` : ''}${formatMoney(variantRequired ? unitPrice : totalPrice, language, product.currency)}`
                  : t('priceOnRequest')}
              </span>
            </div>
            <motion.button
              type="button"
              disabled={variantRequired}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddToCart}
              className={`flex min-h-12 min-w-[9.75rem] cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-semibold shadow-[var(--sp-shadow-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] disabled:cursor-not-allowed disabled:bg-[var(--sp-control)] disabled:text-[var(--sp-ink-tertiary)] disabled:shadow-none ${inCart && !variantRequired ? 'bg-[var(--sp-brand-deep)] text-[var(--sp-on-brand-deep)]' : 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]'}`}
            >
              {inCart && !variantRequired ? <Check className="size-4" aria-hidden="true" /> : <ShoppingCart className="size-4" aria-hidden="true" />}
              <span>{variantRequired ? copy.selectVariant : inCart ? copy.inRequest : t('addToRequest')}</span>
            </motion.button>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
