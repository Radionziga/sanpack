'use client';

import React, { useState, useEffect, use } from 'react';
import { Link } from '@/i18n/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductGallery } from '@/components/catalog/ProductGallery';
import { ProductCard } from '@/components/catalog/ProductCard';
import { PublicSanpackRepository as SanpackRepository } from '@/lib/repositories/publicRepository';
import { Attribute, Product, ProductVariant } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { motion } from 'motion/react';
import {
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
  Factory,
  FileText,
  Calculator,
  TrendingDown,
} from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import {
  getOrderRuleSummary,
  getProductOrderRule,
  normalizeOrderQuantity,
} from '@/lib/commerce/orderQuantities';

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
      favorite: 'В избранном',
      manager: 'Быстрая связь с менеджером',
      message: 'Здравствуйте! Интересует товар',
      production: 'SANPACK поставляет упаковку напрямую с собственного производства. Предоставляем образцы и гибкие условия оплаты для постоянных клиентов.',
      cityDelivery: 'Доставка по Ташкенту',
      cityDeliveryText: 'Бесплатная доставка B2B-заявок от 2 000 000 сум. Для остальных заказов доступна экспресс-доставка.',
      regions: 'Регионы Узбекистана',
      regionsText: 'Отправка через партнёрские службы во все области Узбекистана.',
      docs: 'Сертификаты и санитарные заключения предоставляются менеджером при оформлении договора.',
      currency: 'сум',
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
      favorite: 'Tanlanganlarda',
      manager: 'Menejer bilan tezkor aloqa',
      message: 'Salom! Meni ushbu mahsulot qiziqtiradi',
      production: 'SANPACK qadoqlash mahsulotlarini o‘z ishlab chiqarishidan to‘g‘ridan-to‘g‘ri yetkazadi. Doimiy mijozlarga namunalar va moslashuvchan to‘lov shartlari taqdim etiladi.',
      cityDelivery: 'Toshkent bo‘ylab yetkazib berish',
      cityDeliveryText: '2 000 000 so‘mdan B2B arizalar uchun yetkazib berish bepul. Boshqa buyurtmalar uchun tezkor yetkazib berish mavjud.',
      regions: 'O‘zbekiston hududlari',
      regionsText: 'Hamkor logistika xizmatlari orqali O‘zbekistonning barcha hududlariga jo‘natish.',
      docs: 'Sertifikatlar va sanitariya xulosalari shartnoma rasmiylashtirilganda menejer tomonidan taqdim etiladi.',
      currency: 'so‘m',
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
      favorite: 'In favorites',
      manager: 'Contact a manager',
      message: 'Hello! I am interested in this product',
      production: 'SANPACK supplies packaging directly from its own production. Samples and flexible payment terms are available to regular business clients.',
      cityDelivery: 'Delivery in Tashkent',
      cityDeliveryText: 'Free delivery for B2B requests over UZS 2,000,000. Express delivery is available for other orders.',
      regions: 'Regions of Uzbekistan',
      regionsText: 'Shipping through partner logistics providers to every region of Uzbekistan.',
      docs: 'Certificates and sanitary documents are provided by a manager when the contract is prepared.',
      currency: 'UZS',
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      const [all, definitions] = await Promise.all([
        SanpackRepository.getProducts(),
        SanpackRepository.getAttributes(),
      ]);
      const p = all.find((item) => item.slug === productSlug) || null;
      setAttributeDefinitions(definitions);
      if (p) {
        setProduct(p);
        setSelectedVariant(p.variants[0] || null);
        setQuantity(getProductOrderRule(p).minimumQuantity);

        const related = all.filter((item) => item.categoryId === p.categoryId && item.id !== p.id);
        setRelatedProducts(related.slice(0, 4));
      }
      setLoading(false);
    }
    loadProduct();
  }, [productSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 flex-1 w-full">
          <div className="h-96 bg-slate-200 animate-pulse rounded-3xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center flex-1">
          <h2 className="text-2xl font-bold text-[#222B35] mb-4">{copy.notFound}</h2>
          <Link href="/catalog" className="px-6 py-3 bg-[#006F3C] text-white font-bold rounded-xl text-xs">
            {copy.back}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const title = getLocalizedText(product.titleRu, product.titleUz, product.titleEn);
  const description = getLocalizedText(product.descriptionRu, product.descriptionUz, product.descriptionEn);
  const favorited = isFavorite(product.id);
  const inCart = isInCart(product.id, selectedVariant?.id);
  const orderRule = getProductOrderRule(product, language);
  const orderSummary = getOrderRuleSummary(product, language);

  // Dynamic price computation considering wholesale tiers
  const activeTiers = selectedVariant?.wholesaleTiers || product.wholesaleTiers || [];
  let unitPrice = selectedVariant?.price || product.price || 0;

  if (activeTiers.length > 0) {
    // Find matching tier
    const sortedTiers = [...activeTiers].sort((a, b) => b.minQuantity - a.minQuantity);
    const matchedTier = sortedTiers.find((t) => quantity >= t.minQuantity);
    if (matchedTier) {
      unitPrice = matchedTier.price;
    }
  }

  const totalPrice = unitPrice * quantity;

  const visibleAttributes = Object.entries(product.attributes || {})
    .map(([key, value]) => {
      const definition = attributeDefinitions.find((attribute) => attribute.key === key);
      const label = definition
        ? getLocalizedText(definition.titleRu, definition.titleUz, definition.titleEn)
        : key
            .replace(/[_-]+/g, ' ')
            .replace(/^./, (character) => character.toLocaleUpperCase(language));
      const rawValues = Array.isArray(value) ? value : [value];
      const localizedValues = rawValues.map((item) => {
        const option = definition?.options?.find((candidate) => candidate.value === String(item));
        return option
          ? getLocalizedText(option.labelRu, option.labelUz, option.labelEn)
          : String(item);
      });
      return {
        key,
        label,
        value: localizedValues.join(', '),
        visible: definition?.productVisible !== false,
        sortOrder: definition?.sortOrder ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .filter((attribute) => attribute.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, language));

  const handleAddToCart = () => {
    addItem(product, selectedVariant || undefined, quantity);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6 flex-wrap font-medium">
            <Link href="/" className="hover:text-[#006F3C] transition-colors">
              {t('home')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/catalog" className="hover:text-[#006F3C] transition-colors">
              {t('catalog')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#222B35] font-bold truncate max-w-xs">{title}</span>
          </nav>

          {/* Product Hero Top Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            {/* Col 1: Gallery */}
            <div className="lg:col-span-5">
              <ProductGallery images={product.images} title={title} />
            </div>

            {/* Col 2: Info & Specs */}
            <div className="lg:col-span-4 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md font-semibold">
                    {t('sku')} {selectedVariant?.sku || product.sku}
                  </span>
                  {product.ownProduction && (
                    <span className="bg-[#EAF5EF] text-[#006F3C] text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 border border-[#006F3C]/20">
                      <Factory className="w-3.5 h-3.5" /> SANPACK
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-bold text-[#222B35] leading-snug tracking-tight">
                  {title}
                </h1>
              </div>

              {/* Stock Status Badge */}
              <div className="flex items-center gap-2 text-xs font-semibold text-[#006F3C] bg-[#EAF5EF] p-3 rounded-xl border border-[#006F3C]/20">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {product.stockStatus === 'in_stock' ? copy.stock : copy.order}
                </span>
              </div>

              {/* Wholesale Tiers Visual Badge */}
              {activeTiers.length > 0 && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-200/60 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <TrendingDown className="w-4 h-4 text-[#006F3C]" />
                    <span>{copy.tiers}:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {activeTiers.map((tier, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          quantity >= tier.minQuantity
                            ? 'bg-[#006F3C] text-white font-bold border-transparent shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] opacity-80">{copy.from} {tier.minQuantity} {product.salesUnit}</div>
                        <div>{tier.price.toLocaleString()} {copy.currency}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Specs List */}
              <div className="space-y-2 border-y border-[var(--sp-line)] py-4 text-xs">
                <h2 className="mb-2 font-compact text-sm font-bold text-[var(--sp-ink)]">
                  {copy.properties}
                </h2>
                {visibleAttributes.map((attribute) => (
                  <div key={attribute.key} className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-baseline gap-4 border-b border-dashed border-[var(--sp-line-soft)] py-1.5 last:border-0">
                    <span className="font-medium text-[var(--sp-ink-secondary)]">{attribute.label}</span>
                    <span className="text-right font-semibold text-[var(--sp-ink)]">{attribute.value}</span>
                  </div>
                ))}
              </div>

              {/* Variants Picker */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#222B35] block">
                    {t('chooseVariant')}
                  </label>
                  <div className="space-y-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-[#006F3C] bg-[#EAF5EF] text-[#006F3C] font-bold shadow-2xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span>{getLocalizedText(v.titleRu, v.titleUz, v.titleEn)}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#006F3C]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Col 3: Sticky Commercial Action Box */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xl sticky top-24 space-y-5">
                <div>
                  <span className="text-xs text-slate-400 block mb-1 font-medium">
                    {t('wholesalePrices')} SANPACK:
                  </span>
                  <span className="text-2xl font-bold text-[#006F3C] block tracking-tight">
                    {product.showPrice && unitPrice > 0
                      ? `${unitPrice.toLocaleString()} ${copy.currency}`
                      : t('priceOnRequest')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {orderSummary}
                  </span>
                </div>

                {/* Quantity Controls */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#222B35] block">
                    {t('quantity')} ({product.salesUnit})
                  </label>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(orderRule.minimumQuantity, q - orderRule.quantityStep))}
                      className="px-3.5 py-2.5 text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={orderRule.minimumQuantity}
                      step={orderRule.quantityStep}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || orderRule.minimumQuantity)}
                      onBlur={() => setQuantity((current) => normalizeOrderQuantity(product, current))}
                      className="w-full text-center bg-transparent font-bold text-sm text-[#222B35] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + orderRule.quantityStep)}
                      className="px-3.5 py-2.5 text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price Total Calculation */}
                {product.showPrice && unitPrice > 0 && (
                  <div className="p-3 bg-[#F2F7F4] rounded-xl border border-[#006F3C]/20 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-[#006F3C]" /> {copy.total}:
                    </span>
                    <span className="font-bold text-base text-[#006F3C]">
                      {totalPrice.toLocaleString()} {copy.currency}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddToCart}
                    className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md ${
                      inCart
                        ? 'bg-[#004F2B] text-white'
                        : 'bg-[#008348] hover:bg-[#006F3C] text-white active:bg-[#004F2B]'
                    }`}
                  >
                    {inCart ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{copy.added}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>{t('addToRequest')}</span>
                      </>
                    )}
                  </motion.button>

                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                      favorited
                        ? 'border-rose-200 bg-rose-50 text-rose-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
                    <span>{favorited ? copy.favorite : t('favorites')}</span>
                  </button>
                </div>

                {/* Fast Messenger Triggers */}
                {(contacts.telegram || contacts.whatsapp) ? <div className="space-y-2 border-t border-[var(--sp-line)] pt-4">
                  <p className="text-[11px] text-slate-500 font-semibold">{copy.manager}:</p>
                  <div className={`grid gap-2 ${contacts.telegram && contacts.whatsapp ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {contacts.telegram ? <a
                      href={`${contacts.telegram}${contacts.telegram.includes('?') ? '&' : '?'}text=${encodeURIComponent(`${copy.message}: ${title} (SKU: ${product.sku})`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Telegram</span>
                    </a> : null}
                    {contacts.whatsapp ? <a
                      href={`${contacts.whatsapp}${contacts.whatsapp.includes('?') ? '&' : '?'}text=${encodeURIComponent(`${copy.message}: ${title} (SKU: ${product.sku})`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a> : null}
                  </div>
                </div> : null}
              </div>
            </div>
          </div>

          {/* Details Tabs Section */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 mb-12 shadow-2xs">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4 mb-6 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('desc')}
                className={`text-sm font-bold pb-2 transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'desc'
                    ? 'border-[#006F3C] text-[#006F3C]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {t('tabDescription')}
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`text-sm font-bold pb-2 transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'specs'
                    ? 'border-[#006F3C] text-[#006F3C]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {t('tabSpecs')}
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`text-sm font-bold pb-2 transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'delivery'
                    ? 'border-[#006F3C] text-[#006F3C]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {t('tabDelivery')}
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`text-sm font-bold pb-2 transition-all border-b-2 whitespace-nowrap ${
                  activeTab === 'docs'
                    ? 'border-[#006F3C] text-[#006F3C]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {t('tabDocs')}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'desc' && (
              <div className="prose max-w-none text-xs sm:text-sm text-[#222B35] leading-relaxed space-y-4">
                <p>{description}</p>
                <div className="bg-[#EAF5EF] p-4 rounded-2xl border border-[#006F3C]/20 text-[#006F3C] font-semibold text-xs flex items-start gap-2">
                  <span>💡</span>
                  <span>{copy.production}</span>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {Object.entries(product.attributes || {}).map(([k, v]) => (
                    <div key={k} className="p-3 bg-slate-50 rounded-xl flex justify-between">
                      <span className="text-slate-500 capitalize">{k}:</span>
                      <span className="font-bold text-[#222B35]">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'delivery' && (
              <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-[#222B35] text-sm">{copy.cityDelivery}</h4>
                    <p>{copy.cityDeliveryText}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-[#006F3C] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-[#222B35] text-sm">{copy.regions}</h4>
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
                      className="p-4 rounded-2xl border border-slate-200 hover:border-[#006F3C] bg-slate-50 flex items-center justify-between text-xs font-bold text-[#222B35] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#006F3C]" />
                        <span>{getLocalizedText(doc.titleRu, doc.titleUz, doc.titleEn)}</span>
                      </div>
                      <Download className="w-4 h-4 text-slate-400" />
                    </a>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">
                    {copy.docs}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="space-y-6">
              <h3 className="text-xl font-bold text-[#222B35] tracking-tight">{t('relatedProducts')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
