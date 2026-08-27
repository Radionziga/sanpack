'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  HeartIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowRightIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { CallbackModal } from '@/components/modals/CallbackModal';
import { PublicRepository } from '@/lib/repositories/publicRepository';
import { Category, Product } from '@/types';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { contactPhoneHref, localizedContact } from '@/lib/settings/contacts';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useMobileStorefrontChrome } from '@/components/layout/MobileStorefrontChrome';
import { getProductCatalogPriceText } from '@/lib/catalog/productPresentation';
import { ProductImage } from '@/components/catalog/ProductImage';

export function Header({
  initialProducts = [],
}: {
  initialCategories?: Category[];
  initialProducts?: Product[];
} = {}) {
  const { language, t, getLocalizedText, fixText } = useLanguage();
  const siteSettings = useSiteSettings();
  const { contacts } = siteSettings;
  const copy = {
    ru: {
      city: 'Ташкент',
      found: 'Найдено в каталоге',
      sku: 'Арт.',
      search: 'Поиск по каталогу…',
      catalog: 'Каталог товаров',
      address: 'Ташкент, Сергелийский район',
      adminPanel: 'Панель администратора',
      currency: 'сум',
      home: 'На главную', clearSearch: 'Очистить поиск', find: 'Найти', profile: 'Профиль',
    },
    uz: {
      city: 'Toshkent',
      found: 'Katalogda topildi',
      sku: 'Art.',
      search: 'Katalog bo‘yicha qidirish…',
      catalog: 'Mahsulotlar katalogi',
      address: 'Toshkent, Sergeli tumani',
      adminPanel: 'Administrator paneli',
      currency: 'so‘m',
      home: 'Bosh sahifaga', clearSearch: 'Qidiruvni tozalash', find: 'Qidirish', profile: 'Profil',
    },
    en: {
      city: 'Tashkent',
      found: 'Found in catalog',
      sku: 'SKU',
      search: 'Search the catalog…',
      catalog: 'Product catalog',
      address: 'Sergeli district, Tashkent',
      adminPanel: 'Administration panel',
      currency: 'UZS',
      home: 'Home', clearSearch: 'Clear search', find: 'Search', profile: 'Profile',
    },
    zh: {
      city: '塔什干', found: '目录搜索结果', sku: '货号', search: '搜索目录…',
      catalog: '商品目录', address: '塔什干谢尔盖利区', adminPanel: '管理后台', currency: '苏姆',
      home: '返回首页', clearSearch: '清除搜索', find: '搜索', profile: '个人资料',
    },
  }[language];
  const { itemCount } = useRequestCart();
  const { count: favCount } = useFavorites();
  const { openSearch } = useMobileStorefrontChrome();
  const router = useRouter();
  const city = localizedContact(contacts, 'city', language);
  const workingHours = localizedContact(contacts, 'workingHours', language);
  const phones = [contacts.phone1, contacts.phone2].filter(Boolean);

  const [isCallbackOpen, setIsCallbackOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(initialProducts);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const q = searchQuery.trim().toLowerCase();
    if (q.length >= 1) {
      const loadProducts = catalogProducts.length > 0
        ? Promise.resolve(catalogProducts)
        : PublicRepository.getProducts().then((products) => {
            setCatalogProducts(products);
            return products;
          });
      loadProducts.then((products) => {
        if (!active) return;
        const filtered = products
          .filter(
            (p) =>
              (p.titleRu || '').toLowerCase().includes(q) ||
              (p.titleUz || '').toLowerCase().includes(q) ||
              (p.titleEn || '').toLowerCase().includes(q) ||
              (p.titleZh || '').toLowerCase().includes(q) ||
              (p.sku || '').toLowerCase().includes(q) ||
              (p.shortDescriptionRu || '').toLowerCase().includes(q) ||
              (p.categorySlug || '').toLowerCase().includes(q)
          )
          .sort((a, b) => {
            const aTitle = ((language === 'uz' ? a.titleUz : language === 'en' ? a.titleEn : language === 'zh' ? a.titleZh : a.titleRu) || a.titleRu || '').toLowerCase();
            const bTitle = ((language === 'uz' ? b.titleUz : language === 'en' ? b.titleEn : language === 'zh' ? b.titleZh : b.titleRu) || b.titleRu || '').toLowerCase();
            const aStarts = aTitle.startsWith(q) || aTitle.split(' ').some((w) => w.startsWith(q));
            const bStarts = bTitle.startsWith(q) || bTitle.split(' ').some((w) => w.startsWith(q));
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return aTitle.localeCompare(bTitle);
          });
        setSearchResults(filtered.slice(0, 8));
        setIsSearchOpen(true);
      }).catch(() => {
        if (active) setSearchResults([]);
      });
    } else {
      const timer = setTimeout(() => {
        if (active) {
          setSearchResults([]);
          setIsSearchOpen(false);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
    return () => {
      active = false;
    };
  }, [catalogProducts, searchQuery, language]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: Ctrl+K / Cmd+K to focus search, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      router.push({ pathname: '/search', query: { q: searchQuery.trim() } });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[var(--sp-surface)] font-sans text-[var(--sp-ink)]">
        {/* Level 1: Top Utility Bar */}
        <div className="hidden border-b border-[color-mix(in_srgb,var(--sp-on-primary-strong)_14%,transparent)] bg-[var(--sp-primary-strong)] py-1.5 text-[11px] text-[var(--sp-on-primary-strong)] md:block">
          <div className="mx-auto flex max-w-[1536px] items-center justify-between gap-4 px-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex min-w-0 items-center gap-1.5 font-medium">
                <MapPinIcon className="size-4 shrink-0 text-current" aria-hidden="true" />
                <span>{city}</span>
              </span>
              <span className="hidden items-center gap-1.5 border-l border-[color-mix(in_srgb,var(--sp-on-primary-strong)_20%,transparent)] pl-4 sm:flex">
                <ClockIcon className="size-4 text-current" aria-hidden="true" />
                <span>{workingHours}</span>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCallbackOpen(true)}
                className="inline-flex min-h-7 items-center rounded-[var(--sp-radius-control)] px-2 font-semibold text-current transition-colors hover:bg-[color-mix(in_srgb,var(--sp-on-primary-strong)_12%,transparent)]"
              >
                {t('callback')}
              </button>
              <div className="hidden items-center gap-3 border-l border-[color-mix(in_srgb,var(--sp-on-primary-strong)_20%,transparent)] pl-3 md:flex">
                {phones.slice(0, 1).map((phone) => (
                  <React.Fragment key={phone}>
                    <a
                      href={contactPhoneHref(phone)}
                      className="flex items-center gap-1.5 font-medium transition-opacity hover:opacity-80"
                    >
                      <PhoneIcon className="size-3.5 text-current" aria-hidden="true" />
                      <span>{phone}</span>
                    </a>
                  </React.Fragment>
                ))}
              </div>
              {contacts.telegram ? <div className="hidden items-center pl-1 sm:flex">
                <a
                  href={contacts.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-7 items-center justify-center rounded-[var(--sp-radius-control)] text-current transition-colors hover:bg-[color-mix(in_srgb,var(--sp-on-primary-strong)_12%,transparent)]"
                  title="Telegram"
                  aria-label="Telegram"
                >
                  <PaperAirplaneIcon className="size-4" aria-hidden="true" />
                </a>
              </div> : null}
            </div>
          </div>
        </div>

        {/* Level 2: Main Header */}
        <div className="border-b border-[var(--sp-line)] py-2.5 md:py-3">
          <div className="mx-auto flex max-w-[1536px] items-center justify-between gap-2 px-4 md:gap-4">
            {/* Logo */}
            <Link href="/" className="shrink-0 flex items-center py-0.5" aria-label={`${siteSettings.company.name} — ${copy.home}`}>
              <BrandLogo
                src={siteSettings.company?.logo}
                srcDark={siteSettings.company?.logoDark}
                label={siteSettings.company.name}
                variant="green"
                className="h-8 sm:h-8.5 md:h-9"
              />
            </Link>

            {/* The storefront opens directly with the catalogue; search is the primary desktop action. */}
            <div className="mx-2 hidden min-w-0 max-w-2xl flex-1 items-center md:flex">
              <div ref={searchRef} className="relative flex-1">
                <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onFocus={() => setIsSearchOpen(true)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="h-10 w-full rounded-[var(--sp-radius-control)] border border-[var(--sp-control-border)] bg-[var(--sp-control)] pl-3.5 pr-11 text-xs font-medium text-[var(--sp-ink)] outline-none transition-colors placeholder:text-[var(--sp-ink-tertiary)] focus:border-[var(--sp-brand)] focus-visible:!outline-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchOpen(false);
                          inputRef.current?.focus();
                        }}
                        className="rounded-[var(--sp-radius-control-inner)] p-1 text-[var(--sp-ink-tertiary)] transition-colors hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]"
                        aria-label={copy.clearSearch}
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="rounded-[var(--sp-radius-control-inner)] p-1 text-[var(--sp-ink-tertiary)] transition-colors hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)]"
                      aria-label={copy.find}
                    >
                      <MagnifyingGlassIcon className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Instant Search Popup */}
                <AnimatePresence>
                  {isSearchOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[320px] max-w-lg overflow-hidden rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] shadow-2xl"
                    >
                      {searchQuery.trim().length > 0 ? (
                        searchResults.length > 0 ? (
                          <div>
                            <div className="flex items-center justify-between border-b border-[var(--sp-line-soft)] px-3.5 py-2 text-[11px] font-semibold text-[var(--sp-ink-secondary)]">
                              <span>{fixText(`${copy.found} (${searchResults.length})`)}</span>
                            </div>
                            <ul className="max-h-[380px] divide-y divide-[var(--sp-line-soft)] overflow-y-auto">
                              {searchResults.map((product) => {
                                const title = getLocalizedText(product.titleRu, product.titleUz, product.titleEn, product.titleZh);
                                const priceText = getProductCatalogPriceText(product, language);
                                return (
                                  <li key={product.id}>
                                    <Link
                                      href={`/product/${product.slug}`}
                                      onClick={() => setIsSearchOpen(false)}
                                      className="group flex items-center gap-3 p-2.5 transition-colors hover:bg-[var(--sp-surface-inset)]"
                                    >
                                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-[var(--sp-line)] bg-white">
                                        <ProductImage
                                          source={product.mainImage}
                                          alt={title}
                                          sizes="40px"
                                          variant="compact"
                                          imageClassName="object-contain"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="truncate text-xs font-semibold text-[var(--sp-ink)] group-hover:text-[var(--sp-brand)]">
                                          {title}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-[var(--sp-ink-tertiary)]">
                                          <span className="font-mono">{copy.sku}: {product.sku}</span>
                                          {product.salesUnit ? <span>· {product.salesUnit}</span> : null}
                                        </div>
                                      </div>
                                      <span className="whitespace-nowrap text-xs font-bold text-[var(--sp-brand)]">
                                        {priceText}
                                      </span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                            <div className="border-t border-[var(--sp-line-soft)] bg-[var(--sp-surface)] p-2">
                              <Link
                                href={{ pathname: '/search', query: { q: searchQuery.trim() } }}
                                onClick={() => setIsSearchOpen(false)}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--sp-brand)] py-2 text-xs font-semibold text-[var(--sp-on-brand)] transition-colors hover:bg-[var(--sp-brand-deep)]"
                              >
                                <span>Смотреть все результаты в каталоге</span>
                                <ArrowRightIcon className="size-3.5" />
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <p className="text-xs font-medium text-[var(--sp-ink-secondary)]">
                              По запросу «{searchQuery}» товары не найдены
                            </p>
                            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                              {['Мешки для мусора', 'Салфетки', 'Контейнеры', 'Перчатки', 'Пакеты'].map((term) => (
                                <button
                                  key={term}
                                  type="button"
                                  onClick={() => setSearchQuery(term)}
                                  className="rounded-md border border-[var(--sp-line)] bg-[var(--sp-surface)] px-2 py-1 text-[11px] font-medium text-[var(--sp-ink)] hover:border-[var(--sp-brand)]"
                                >
                                  {term}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="p-3.5">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--sp-ink-muted)]">
                            Часто ищут
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {['Мешки для мусора', 'Салфетки', 'Контейнеры', 'Перчатки', 'Зелень', 'Пакеты', 'Стаканы', 'Фольга'].map((term) => (
                              <button
                                key={term}
                                type="button"
                                onClick={() => setSearchQuery(term)}
                                className="flex items-center gap-1 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-2.5 py-1 text-xs font-medium text-[var(--sp-ink)] transition-colors hover:border-[var(--sp-brand)]"
                              >
                                <MagnifyingGlassIcon className="size-3 text-[var(--sp-ink-muted)]" />
                                <span>{term}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Actions: Favorites, Cart, Language */}
            <div className="flex shrink-0 items-center gap-1 md:gap-2">
              {/* Favorites */}
              <Link
                href="/favorites"
                className="relative hidden size-10 shrink-0 items-center justify-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-brand)] transition-colors hover:border-[var(--sp-brand)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand-deep)] md:flex"
                title={t('favorites')}
              >
                <HeartIcon className="w-5 h-5" />
                {favCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-[var(--sp-radius-control-inner)] border-2 border-[var(--sp-surface)] bg-[var(--sp-brand)] px-1 text-[9px] font-semibold tabular-nums text-[var(--sp-on-brand)]"
                  >
                    {favCount}
                  </motion.span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/request"
                className="group relative hidden h-10 shrink-0 items-center gap-1.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 text-[var(--sp-brand)] transition-colors hover:border-[var(--sp-brand)] hover:bg-[var(--sp-surface-inset)] md:flex"
                title={t('requestCart')}
              >
                <ShoppingCartIcon className="w-5 h-5" />
                <span className="hidden text-xs font-semibold xl:inline">
                  {t('requestCart')}
                </span>
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex min-h-[18px] min-w-[18px] items-center justify-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand)] px-1 text-[10px] font-semibold tabular-nums text-[var(--sp-on-brand)]"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Link>

              <LanguageSwitcher />

              <Link
                href="/profile"
                className="hidden size-10 shrink-0 items-center justify-center rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-brand)] transition-colors hover:border-[var(--sp-brand)] hover:bg-[var(--sp-surface-inset)] md:flex"
                title={copy.profile}
                aria-label={copy.profile}
              >
                <UserCircleIcon className="size-5" aria-hidden="true" />
              </Link>

              {/* Mobile search entry point. Secondary navigation lives in the bottom bar. */}
              <button
                type="button"
                onClick={openSearch}
                aria-label={t('searchBtn')}
                aria-haspopup="dialog"
                className="sp-icon-button flex size-11 items-center justify-center border border-[var(--sp-line)] bg-[var(--sp-surface)] md:hidden"
              >
                <MagnifyingGlassIcon className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* Callback Modal */}
      <CallbackModal
        isOpen={isCallbackOpen}
        onClose={() => setIsCallbackOpen(false)}
      />
    </>
  );
}
