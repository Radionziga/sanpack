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
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { contactPhoneHref, localizedContact } from '@/lib/settings/contacts';

export function Header({
  initialCategories = [],
  initialProducts = [],
}: {
  initialCategories?: Category[];
  initialProducts?: Product[];
} = {}) {
  const { language, t, getLocalizedText, fixText } = useLanguage();
  const { contacts } = useSiteSettings();
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
  const city = localizedContact(contacts, 'city', language);
  const workingHours = localizedContact(contacts, 'workingHours', language);
  const address = localizedContact(contacts, 'address', language);
  const phones = [contacts.phone1, contacts.phone2].filter(Boolean);

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
        <div className="border-b border-white/10 bg-[var(--sp-primary-strong)] py-2 text-xs text-[var(--sp-on-primary-strong)]">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4 opacity-85">
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5 text-[var(--sp-accent)]" />
                <span>{city}</span>
              </span>
              <span className="hidden items-center gap-1.5 border-l border-white/15 pl-4 sm:flex">
                <ClockIcon className="w-3.5 h-3.5 text-[var(--sp-accent)]" />
                <span>{workingHours}</span>
              </span>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <button
                onClick={() => setIsCallbackOpen(true)}
                className="font-medium text-[var(--sp-accent)] underline underline-offset-2 transition-opacity hover:opacity-80"
              >
                {t('callback')}
              </button>
              <div className="hidden items-center gap-3 border-l border-white/15 pl-4 md:flex">
                {phones.map((phone, index) => (
                  <React.Fragment key={phone}>
                    {index > 0 ? <span className="h-4 w-px bg-white/15" aria-hidden="true" /> : null}
                    <a
                      href={contactPhoneHref(phone)}
                      className="flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-80"
                    >
                      {index === 0 ? <PhoneIcon className="size-3.5 text-[var(--sp-accent)]" aria-hidden="true" /> : null}
                      <span>{phone}</span>
                    </a>
                  </React.Fragment>
                ))}
              </div>
              {contacts.telegram ? <div className="flex items-center gap-2 pl-2">
                <a
                  href={contacts.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-7 items-center justify-center rounded-md border border-white/15 bg-white/8 text-current transition-colors hover:bg-white/15"
                  title="Telegram"
                >
                  <PaperAirplaneIcon className="w-3 h-3" />
                </a>
              </div> : null}
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
                className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-bold text-[var(--sp-on-brand)] transition-[background-color,opacity] ${
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
                    className="h-10 w-full rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-control)] pl-3.5 pr-11 text-xs font-medium text-[var(--sp-ink)] outline-none transition-colors placeholder:text-[var(--sp-ink-tertiary)] focus:border-[var(--sp-brand)]"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setIsSearchOpen(false);
                        }}
                        className="rounded-md p-1 text-[var(--sp-ink-tertiary)] transition-colors hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]"
                        aria-label="Очистить поиск"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="rounded-md p-1 text-[var(--sp-ink-tertiary)] transition-colors hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)]"
                      aria-label="Найти"
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
                      className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] shadow-[var(--sp-shadow-raised)]"
                    >
                      <div className="border-b border-[var(--sp-line-soft)] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--sp-ink-tertiary)]">
                        {fixText(`${copy.found} (${searchResults.length})`)}
                      </div>
                      <ul className="divide-y divide-[var(--sp-line-soft)]">
                        {searchResults.map((product) => (
                          <li key={product.id}>
                            <Link
                              href={`/product/${product.slug}`}
                              onClick={() => setIsSearchOpen(false)}
                              className="group flex items-center gap-3 p-2.5 transition-colors hover:bg-[var(--sp-surface-inset)]"
                            >
                              <Image
                                src={product.mainImage}
                                alt={product.titleRu}
                                width={36}
                                height={36}
                                className="size-9 rounded-md border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[var(--sp-ink)] group-hover:text-[var(--sp-brand)] truncate">
                                  {getLocalizedText(product.titleRu, product.titleUz, product.titleEn)}
                                </p>
                                <p className="text-[10px] text-[var(--sp-ink-tertiary)]">
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
                className="hidden h-10 items-center gap-1.5 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3.5 text-xs font-bold text-[var(--sp-brand)] transition-colors hover:border-[var(--sp-brand)] hover:bg-[var(--sp-surface-inset)] lg:flex"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{t('leaveRequest')}</span>
              </Link>

              {/* Favorites */}
              <Link
                href="/favorites"
                className="relative hidden size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)] transition-colors hover:border-[var(--sp-brand)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)] sm:flex"
                title={t('favorites')}
              >
                <HeartIcon className="w-5 h-5" />
                {favCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full border-2 border-[var(--sp-surface)] bg-[var(--sp-brand)] text-[9px] font-bold text-[var(--sp-on-brand)]"
                  >
                    {favCount}
                  </motion.span>
                )}
              </Link>

              {/* Request Cart */}
              <Link
                href="/request"
                className="group relative hidden h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 text-[var(--sp-brand)] transition-colors hover:border-[var(--sp-brand)] hover:bg-[var(--sp-surface-inset)] sm:flex"
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
                    className="flex size-[18px] items-center justify-center rounded-full bg-[var(--sp-brand)] text-[10px] font-bold text-[var(--sp-on-brand)]"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Link>

              <span className="hidden h-10 items-center rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 text-[10px] font-bold text-[var(--sp-ink-secondary)] sm:inline-flex">{language.toUpperCase()}</span>

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
              <Link href="/" className="py-1 transition-colors hover:text-[var(--sp-brand)]">
                {t('home')}
              </Link>
              <Link href="/catalog" className="hover:text-[var(--sp-brand)] transition-colors py-1 text-[var(--sp-brand)] font-bold">
                {t('catalog')}
              </Link>
              <Link href="/about" className="py-1 transition-colors hover:text-[var(--sp-brand)]">
                {t('about')}
              </Link>
              <Link href="/clients" className="py-1 transition-colors hover:text-[var(--sp-brand)]">
                {t('clients')}
              </Link>
              <Link href="/delivery" className="py-1 transition-colors hover:text-[var(--sp-brand)]">
                {t('delivery')}
              </Link>
              <Link href="/branding" className="hover:text-[var(--sp-brand)] transition-colors py-1 text-[var(--sp-brand)] font-bold">
                {t('branding')}
              </Link>
              <Link href="/contacts" className="py-1 transition-colors hover:text-[var(--sp-brand)]">
                {t('contacts')}
              </Link>
            </nav>

            <NextLink
              href="/admin/login"
              className="text-[11px] font-medium text-[var(--sp-ink-tertiary)] transition-colors hover:text-[var(--sp-ink)]"
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
                    href={contactPhoneHref(contacts.phone1)}
                    className="block font-bold text-[var(--sp-brand)]"
                  >
                    <PhoneIcon className="mr-2 inline size-4" aria-hidden="true" />{contacts.phone1}
                  </a>
                  <p><MapPinIcon className="mr-2 inline size-4" aria-hidden="true" />{fixText(address)}</p>
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
