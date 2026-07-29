'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import { Category, Product } from '@/types';
import { SanpackLogo } from '@/components/ui/SanpackLogo';

export function Header() {
  const { language, setLanguage, t, getLocalizedText, fixText } = useLanguage();
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    SanpackRepository.getCategories().then(setCategories);
  }, []);

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
      SanpackRepository.getProducts().then((products) => {
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
  }, [searchQuery]);

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
      <header className="w-full bg-white relative z-30 font-sans">
        {/* Level 1: Top Utility Bar */}
        <div className="bg-[#1C2520] text-slate-300 text-xs py-2 border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="w-3.5 h-3.5 text-[#0F6E43]" />
                <span>{t('city')}: Ташкент</span>
              </span>
              <span className="hidden sm:flex items-center gap-1.5 border-l border-slate-700/70 pl-4">
                <ClockIcon className="w-3.5 h-3.5 text-[#0F6E43]" />
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
                  <PhoneIcon className="w-3.5 h-3.5 text-[#0F6E43]" />
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
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-[#0F6E43] flex items-center justify-center text-white transition-colors"
                  title="Telegram"
                >
                  <PaperAirplaneIcon className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Level 2: Main Header */}
        <div className="border-b border-slate-200/80 py-3">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-3 md:gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 h-10">
              <SanpackLogo variant="green" className="h-7 sm:h-8" />
            </Link>

            {/* Catalog Button & Global Search Bar */}
            <div className="hidden md:flex items-center gap-3 flex-1 max-w-2xl mx-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className={`h-10 flex items-center gap-2 px-4 rounded-lg text-white font-bold text-xs transition-all shadow-2xs shrink-0 ${
                  isMegaMenuOpen
                    ? 'bg-[#093E25]'
                    : 'bg-[#0F6E43] hover:bg-[#0B5735]'
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
                    className="w-full h-10 pl-3.5 pr-16 rounded-lg bg-[#F8FAFC] border border-slate-200 focus:border-[#0F6E43] focus:bg-white focus:ring-2 focus:ring-[#0F6E43]/20 outline-none text-xs font-medium transition-all"
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
                    ) : (
                      <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono font-semibold text-slate-400 bg-slate-200/60 rounded border border-slate-300/60">
                        Ctrl K
                      </kbd>
                    )}
                    <button
                      type="submit"
                      className="p-1 text-slate-400 hover:text-[#0F6E43] transition-colors"
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
                        {fixText(`Найдено в каталоге (${searchResults.length})`)}
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {searchResults.map((product) => (
                          <li key={product.id}>
                            <Link
                              href={`/product/${product.slug}`}
                              onClick={() => setIsSearchOpen(false)}
                              className="flex items-center gap-3 p-2.5 hover:bg-[#F2F7F4] transition-colors group"
                            >
                              <img
                                src={product.mainImage}
                                alt={product.titleRu}
                                className="w-9 h-9 object-cover rounded bg-slate-50 border border-slate-200"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#222B35] group-hover:text-[#0F6E43] truncate">
                                  {getLocalizedText(product.titleRu, product.titleUz)}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  Арт: {product.sku}
                                </p>
                              </div>
                              <span className="text-xs font-bold text-[#0F6E43] whitespace-nowrap">
                                {product.showPrice && product.price
                                  ? `${product.price.toLocaleString()} сум`
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
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/request"
                className="hidden lg:flex items-center gap-1.5 h-10 px-3.5 bg-[#F2F7F4] hover:bg-[#0F6E43] text-[#0F6E43] hover:text-white text-xs font-bold rounded-lg transition-all shadow-2xs"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{t('leaveRequest')}</span>
              </Link>

              {/* Favorites */}
              <Link
                href="/favorites"
                className="relative h-10 w-10 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-[#0F6E43] transition-colors flex items-center justify-center shrink-0"
                title={t('favorites')}
              >
                <HeartIcon className="w-5 h-5" />
                {favCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0F6E43] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-2xs"
                  >
                    {favCount}
                  </motion.span>
                )}
              </Link>

              {/* Request Cart */}
              <Link
                href="/request"
                className="relative h-10 px-3 rounded-lg bg-[#F2F7F4] text-[#0F6E43] hover:bg-[#0F6E43] hover:text-white transition-all flex items-center gap-1.5 group shrink-0"
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
                    className="w-4.5 h-4.5 rounded-full bg-[#0F6E43] text-white text-[10px] font-bold flex items-center justify-center border border-white shadow-2xs"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Link>

              {/* Language Switcher */}
              <div className="h-10 flex items-center bg-slate-100 p-1 rounded-lg text-xs font-bold shrink-0">
                <button
                  onClick={() => setLanguage('ru')}
                  className={`h-full px-2 rounded transition-all flex items-center justify-center ${
                    language === 'ru'
                      ? 'bg-white text-[#0F6E43] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  RU
                </button>
                <button
                  onClick={() => setLanguage('uz')}
                  className={`h-full px-2 rounded transition-all flex items-center justify-center ${
                    language === 'uz'
                      ? 'bg-white text-[#0F6E43] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  UZ
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden h-10 w-10 flex items-center justify-center text-slate-700 hover:text-[#0F6E43]"
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
              ? 'fixed top-0 left-0 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm z-40 py-2'
              : 'border-b border-slate-100 py-2 bg-white'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between text-xs font-semibold text-[#222B35]">
            <nav className="flex items-center gap-7">
              <Link href="/" className="hover:text-[#0F6E43] transition-colors py-1">
                {t('home')}
              </Link>
              <Link href="/catalog" className="hover:text-[#0F6E43] transition-colors py-1 text-[#0F6E43] font-bold">
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
              <Link href="/branding" className="hover:text-[#0F6E43] transition-colors py-1 text-[#0F6E43] font-bold">
                {t('branding')}
              </Link>
              <Link href="/contacts" className="hover:text-[#0F6E43] transition-colors py-1">
                {t('contacts')}
              </Link>
            </nav>

            <Link
              href="/admin/login"
              className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors font-medium"
            >
              Вход в Admin
            </Link>
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
                className="relative w-4/5 max-w-sm h-full bg-white shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0F6E43] text-white font-bold flex items-center justify-center">
                        SP
                      </div>
                      <span className="font-bold text-[#0F6E43]">SANPACK</span>
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
                        placeholder="Поиск по каталогу..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-100 text-xs font-medium outline-none"
                      />
                    </form>

                    <nav className="space-y-3 text-xs font-semibold text-slate-800">
                      <Link
                        href="/catalog"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block py-2 text-[#0F6E43] font-bold border-b border-slate-100"
                      >
                        📁 Каталог товаров
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
                        className="block py-2 text-[#0F6E43]"
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
                    className="block font-bold text-[#0F6E43]"
                  >
                    📞 +998 99 851 05 06
                  </a>
                  <p>{fixText('📍 г. Ташкент, Сергелийский р-н')}</p>
                  <Link
                    href="/admin/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-slate-400"
                  >
                    🔒 Панель администратора
                  </Link>
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
