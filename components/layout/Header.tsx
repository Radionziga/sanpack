'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import NextLink from 'next/link';
import { Link } from '@/i18n/navigation';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPinIcon,
  ClockIcon,
  PhoneIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  HeartIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { CallbackModal } from '@/components/modals/CallbackModal';
import { MegaMenu } from '@/components/layout/MegaMenu';
import { PublicSanpackRepository as SanpackRepository } from '@/lib/repositories/publicRepository';
import { Category, Product } from '@/types';
import { SanpackLogo } from '@/components/ui/SanpackLogo';

export function Header({
  initialCategories = [],
  initialProducts = [],
}: {
  initialCategories?: Category[];
  initialProducts?: Product[];
} = {}) {
  const { language, t, getLocalizedText, fixText } = useLanguage();
  const copy = {
    ru: {
      city: 'Ташкент',
      found: 'Найдено в каталоге',
      sku: 'Арт.',
      admin: 'Вход в Admin',
      search: 'Поиск по каталогу…',
      catalog: 'Каталог товаров',
      address: 'Ташкент, Сергелийский район',
      adminPanel: 'Панель администратора',
      currency: 'сум',
    },
    uz: {
      city: 'Toshkent',
      found: 'Katalogda topildi',
      sku: 'Art.',
      admin: 'Admin kirish',
      search: 'Katalog bo‘yicha qidirish…',
      catalog: 'Mahsulotlar katalogi',
      address: 'Toshkent, Sergeli tumani',
      adminPanel: 'Administrator paneli',
      currency: 'so‘m',
    },
    en: {
      city: 'Tashkent',
      found: 'Found in catalog',
      sku: 'SKU',
      admin: 'Admin sign in',
      search: 'Search the catalog…',
      catalog: 'Product catalog',
      address: 'Sergeli district, Tashkent',
      adminPanel: 'Administration panel',
      currency: 'UZS',
    },
  }[language];
  const { itemCount } = useRequestCart();
  const { count: favCount } = useFavorites();
  const router = useRouter();

  const [isCallbackOpen, setIsCallbackOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialCategories.length === 0) {
      SanpackRepository.getCategories().then(setCategories).catch(() => setCategories([]));
    }
  }, [initialCategories.length]);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 120);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let active = true;
    if (searchQuery.trim().length >= 2) {
      const loadProducts = catalogProducts.length > 0
        ? Promise.resolve(catalogProducts)
        : SanpackRepository.getProducts().then((products) => {
            setCatalogProducts(products);
            return products;
          });
      loadProducts.then((products) => {
        if (!active) return;
        const q = searchQuery.toLowerCase();
        const filtered = products.filter(
          (p) =>
            p.titleRu.toLowerCase().includes(q) ||
            p.titleUz.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.shortDescriptionRu.toLowerCase().includes(q)
        );
        setSearchResults(filtered.slice(0, 6));
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
  }, [catalogProducts, searchQuery]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: Ctrl+K / Cmd+K to focus search, Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsMegaMenuOpen(false);
        setIsMobileMenuOpen(false);
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
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <header className="w-full bg-[var(--sp-surface)] text-[var(--sp-ink)] relative z-30 font-sans">
        {/* Level 1: Top Utility Bar */}
        <div className="bg-[#1C2520] text-slate-300 text-xs py-2 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5 text-[var(--sp-brand)]" />
                <span>{t('city')}: {copy.city}</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5 border-l border-slate-700/70 pl-4">
                <ClockIcon className="w-3.5 h-3.5 text-[var(--sp-brand)]" />
                <span>{t('workingHours')}</span>
              </span>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <button
                onClick={() => setIsCallbackOpen(true)}
                className="text-[#DCE9AF] hover:text-white font-medium transition-colors underline underline-offset-2"
              >
                {t('callback')}
              </button>
              <div className="hidden md:flex items-center gap-3 border-l border-slate-700/70 pl-4">
                <a
                  href="tel:+998998510506"
                  className="hover:text-white transition-colors flex items-center gap-1 font-semibold"
                >
                  <PhoneIcon className="w-3.5 h-3.5 text-[var(--sp-brand)]" />
                  <span>+998 99 851 05 06</span>
                </a>
                <span className="text-slate-600">|</span>
                <a
                  href="tel:+998992323999"
                  className="hover:text-white transition-colors"
                >
                  +998 99 232 39 99
                </a>
              </div>
              <div className="flex items-center gap-2 pl-2">
                <a
                  href="https://t.me/sanpack_uz"
                  target="_blank"
                  rel="noreferrer"
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-[var(--sp-brand)] flex items-center justify-center text-white transition-colors"
                  title="Telegram"
                >
                  <PaperAirplaneIcon className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Level 2: Main Header */}
        <div className="border-b border-[var(--sp-line)] py-3">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-3 md:gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 h-10">
              <SanpackLogo variant="green" className="h-5 sm:h-8" />
            </Link>

            {/* Catalog Button & Global Search Bar */}
            <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl mx-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className={`h-10 flex items-center gap-2 px-4 rounded-lg text-white font-bold text-xs transition-all shadow-2xs shrink-0 ${
                  isMegaMenuOpen
                    ? 'bg-[var(--sp-brand-deep)]'
                    : 'bg-[var(--sp-brand)] hover:opacity-90'
                }`}
              >
                <Bars3Icon className="w-4 h-4" />
                <span>{t('catalog')}</span>
                <ChevronDownIcon
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMegaMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </motion.button>

              <div ref={searchRef} className="relative flex-1">
                <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full h-10 pl-3.5 pr-11 rounded-lg bg-[var(--sp-control)] border border-[var(--sp-control-border)] text-[var(--sp-ink)] focus:border-[var(--sp-brand)] outline-none text-xs font-medium transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchOpen(false);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="p-1 text-slate-400 hover:text-[var(--sp-brand)] transition-colors"
                    >
                      <MagnifyingGlassIcon className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Instant Search Popup */}
                <AnimatePresence>
                  {isSearchOpen && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute top-full left-0 w-full mt-1.5 bg-white/95 backdrop-blur-xl rounded-lg shadow-2xl border border-slate-200 overflow-hidden z-50"
                    >
                      <div className="p-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
                        {fixText(`${copy.found} (${searchResults.length})`)}
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {searchResults.map((product) => (
                          <li key={product.id}>
                            <Link
                              href={`/product/${product.slug}`}
                              onClick={() => setIsSearchOpen(false)}
                              className="flex items-center gap-3 p-2.5 hover:bg-[#F2F7F4] transition-colors group"
                            >
                              <Image
                                src={product.mainImage}
                                alt={product.titleRu}
                                width={36}
                                height={36}
                                className="w-9 h-9 object-cover rounded bg-slate-50 border border-slate-200"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[var(--sp-ink)] group-hover:text-[var(--sp-brand)] truncate">
                                  {getLocalizedText(product.titleRu, product.titleUz, product.titleEn)}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {copy.sku}: {product.sku}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-[var(--sp-brand)] whitespace-nowrap">
                                {product.showPrice && product.price
                                  ? `${product.price.toLocaleString()} ${copy.currency}`
                                  : t('priceOnRequest')}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Actions: Request, Favorites, Request Cart, Lang */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Link
                href="/request"
                className="hidden lg:flex items-center gap-1.5 h-10 px-3.5 bg-[var(--sp-surface-inset)] hover:bg-[var(--sp-brand)] text-[var(--sp-brand)] hover:text-[var(--sp-on-brand)] text-xs font-bold rounded-lg transition-colors"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{t('leaveRequest')}</span>
              </Link>

              {/* Favorites */}
              <Link
                href="/favorites"
                className="relative hidden sm:flex h-10 w-10 rounded-lg hover:bg-[var(--sp-surface-inset)] text-[var(--sp-ink-secondary)] hover:text-[var(--sp-brand)] transition-colors items-center justify-center shrink-0"
                title={t('favorites')}
              >
                <HeartIcon className="w-5 h-5" />
                {favCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--sp-brand)] text-[var(--sp-on-brand)] text-[9px] font-bold flex items-center justify-center border-2 border-white"
                  >
                    {favCount}
                  </motion.span>
                )}
              </Link>

              {/* Request Cart */}
              <Link
                href="/request"
                className="relative hidden sm:flex h-10 px-3 rounded-lg bg-[var(--sp-surface-inset)] text-[var(--sp-brand)] hover:bg-[var(--sp-brand)] hover:text-[var(--sp-on-brand)] transition-colors items-center gap-1.5 group shrink-0"
                title={t('requestCart')}
              >
                <ShoppingCartIcon className="w-5 h-5" />
                <span className="hidden xl:inline text-xs font-bold">
                  {t('requestCart')}
                </span>
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4.5 h-4.5 rounded-full bg-[var(--sp-brand)] text-[var(--sp-on-brand)] text-[10px] font-bold flex items-center justify-center border border-white"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Link>

              <span className="hidden h-10 items-center rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 text-[10px] font-bold text-[var(--sp-ink-tertiary)] sm:inline-flex">RU</span>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden h-10 w-10 flex items-center justify-center text-[var(--sp-ink)] hover:text-[var(--sp-brand)]"
              >
                {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Level 3: Navigation Bar */}
        <div
          className={`hidden md:block transition-all duration-300 ${
            isSticky
              ? 'fixed top-0 left-0 w-full bg-[var(--sp-surface)]/95 backdrop-blur-xl border-b border-[var(--sp-line)] z-40 py-2'
              : 'border-b border-[var(--sp-line-soft)] py-2 bg-[var(--sp-surface)]'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-xs font-semibold text-[var(--sp-ink)]">
            <nav className="flex items-center gap-7">
              <Link href="/" className="hover:text-[#0F6E43] transition-colors py-1">
                {t('home')}
              </Link>
              <Link href="/catalog" className="hover:text-[var(--sp-brand)] transition-colors py-1 text-[var(--sp-brand)] font-bold">
                {t('catalog')}
              </Link>
              <Link href="/about" className="hover:text-[#0F6E43] transition-colors py-1">
                {t('about')}
              </Link>
              <Link href="/clients" className="hover:text-[#0F6E43] transition-colors py-1">
                {t('clients')}
              </Link>
              <Link href="/delivery" className="hover:text-[#0F6E43] transition-colors py-1">
                {t('delivery')}
              </Link>
              <Link href="/branding" className="hover:text-[var(--sp-brand)] transition-colors py-1 text-[var(--sp-brand)] font-bold">
                {t('branding')}
              </Link>
              <Link href="/contacts" className="hover:text-[#0F6E43] transition-colors py-1">
                {t('contacts')}
              </Link>
            </nav>

            <NextLink
              href="/admin/login"
              className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors font-medium"
            >
              {copy.admin}
            </NextLink>
          </div>
        </div>

        {/* Mega Menu Dropdown */}
        <MegaMenu
          isOpen={isMegaMenuOpen}
          onClose={() => setIsMegaMenuOpen(false)}
          categories={categories}
        />

        {/* Mobile Slideout Sidebar Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-2xs"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                className="relative w-4/5 max-w-sm h-full bg-[var(--sp-surface)] p-6 flex flex-col justify-between overflow-y-auto"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--sp-brand)] text-[var(--sp-on-brand)] font-bold flex items-center justify-center">
                        SP
                      </div>
                      <span className="font-bold text-[var(--sp-brand)]">SANPACK</span>
                    </div>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-900"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="py-4">
                    <form onSubmit={handleSearchSubmit} className="mb-4">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={copy.search}
                        className="w-full px-3 py-2 rounded-lg bg-slate-100 text-xs font-medium outline-none"
                      />
                    </form>

                    <nav className="space-y-3 text-xs font-semibold text-slate-800">
                      <Link
                        href="/catalog"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2 text-[var(--sp-brand)] font-bold border-b border-slate-100"
                      >
                        📁 {copy.catalog}
                      </Link>
                      <Link
                        href="/favorites"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2"
                      >
                        {t('favorites')}{favCount > 0 ? ` (${favCount})` : ''}
                      </Link>
                      <Link
                        href="/request"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2"
                      >
                        {t('requestCart')}{itemCount > 0 ? ` (${itemCount})` : ''}
                      </Link>
                      <Link
                        href="/"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2"
                      >
                        {t('home')}
                      </Link>
                      <Link
                        href="/about"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2"
                      >
                        {t('about')}
                      </Link>
                      <Link
                        href="/clients"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2"
                      >
                        {t('clients')}
                      </Link>
                      <Link
                        href="/delivery"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2"
                      >
                        {t('delivery')}
                      </Link>
                      <Link
                        href="/branding"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2 text-[var(--sp-brand)]"
                      >
                        {t('branding')}
                      </Link>
                      <Link
                        href="/contacts"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2"
                      >
                        {t('contacts')}
                      </Link>
                    </nav>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-600">
                  <a
                    href="tel:+998998510506"
                    className="block font-bold text-[var(--sp-brand)]"
                  >
                    📞 +998 99 851 05 06
                  </a>
                  <p>{fixText(`📍 ${copy.address}`)}</p>
                  <NextLink
                    href="/admin/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-slate-400"
                  >
                    🔒 {copy.adminPanel}
                  </NextLink>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </header>

      {/* Callback Modal */}
      <CallbackModal
        isOpen={isCallbackOpen}
        onClose={() => setIsCallbackOpen(false)}
      />
    </>
  );
}
