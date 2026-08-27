'use client';

import {
  ChevronRight,
  Clock3,
  Heart,
  House,
  Info,
  LayoutGrid,
  PackageSearch,
  Palette,
  Phone,
  Search,
  Send,
  ShoppingCart,
  Truck,
  UserRound,
  Users,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { CallbackModal } from '@/components/modals/CallbackModal';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { contactPhoneHref } from '@/lib/settings/contacts';
import type { Product } from '@/types';
import { formatMoney, getProductCatalogPriceText } from '@/lib/catalog/productPresentation';
import { ProductImage } from '@/components/catalog/ProductImage';
import { PublicRepository } from '@/lib/repositories/publicRepository';

type MobilePanel = 'search' | 'more' | null;

interface MobileStorefrontChromeContextValue {
  openSearch: () => void;
}

const MobileStorefrontChromeContext = createContext<MobileStorefrontChromeContextValue | null>(null);

const localePrefix = /^\/(ru|uz|en|zh)(?=\/|$)/;

function normalizePathname(pathname: string) {
  return pathname.replace(localePrefix, '') || '/';
}

function isTextEntryElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.matches('input, textarea, select, [contenteditable="true"]');
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
}

const popularSuggestions = {
  ru: ['Мешки для мусора', 'Салфетки', 'Контейнеры', 'Перчатки', 'Зелень', 'Пакеты Майка', 'Фольга', 'Стаканы'],
  uz: ['Chiqindi qoplari', 'Salfetkalar', 'Konteynerlar', 'Qo‘lqoplar', 'Ko‘katlar', 'Mayka paketlar', 'Folga', 'Stakanlar'],
  en: ['Trash bags', 'Napkins', 'Containers', 'Gloves', 'Greens', 'T-shirt bags', 'Foil', 'Cups'],
  zh: ['垃圾袋', '餐巾纸', '容器', '手套', '蔬菜', '背心袋', '铝箔', '杯子'],
};

export function useMobileStorefrontChrome() {
  const value = useContext(MobileStorefrontChromeContext);
  if (!value) {
    throw new Error('useMobileStorefrontChrome must be used inside MobileStorefrontChrome.');
  }
  return value;
}

export function MobileStorefrontChrome({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, t, getLocalizedText } = useLanguage();
  const { items, totalAmount } = useRequestCart();
  const { contacts, modules } = useSiteSettings();
  const [activePanel, setActivePanel] = useState<MobilePanel>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);
  const [isTextEntryFocused, setIsTextEntryFocused] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelTriggerRef = useRef<HTMLElement | null>(null);
  const normalizedPathname = normalizePathname(pathname);

  const copy = {
    ru: {
      profile: 'Профиль',
      profileTitle: 'Профиль и настройки',
      search: 'Поиск',
      searchTitle: 'Поиск по каталогу',
      searchPlaceholder: 'Название товара, категория, артикул…',
      close: 'Закрыть',
      menuTitle: 'Меню магазина',
      orders: 'Мои заявки',
      bagDesigner: 'Конструктор пакета',
      callback: 'Перезвоните мне',
      phone: 'Позвонить',
      telegram: 'Написать в Telegram',
      navigation: 'Основная навигация',
      language: 'Язык',
      foundProducts: 'Найдено товаров',
      popularQueries: 'Часто ищут',
      popularCategories: 'Категории товаров',
      nothingFound: 'По вашему запросу ничего не найдено',
      tryAnother: 'Попробуйте изменить запрос или выберите из популярных вариантов:',
      viewAllResults: 'Смотреть все результаты в каталоге',
      sku: 'Арт.',
      cart: 'Корзина',
      preliminary: 'Предварительно',
      priceOnRequest: 'Цена по запросу',
      requestPrices: 'есть позиции по запросу',
      openCart: 'Открыть корзину',
    },
    uz: {
      profile: 'Profil',
      profileTitle: 'Profil va sozlamalar',
      search: 'Qidirish',
      searchTitle: 'Katalog bo‘yicha qidirish',
      searchPlaceholder: 'Mahsulot nomi, kategoriya, artikul…',
      close: 'Yopish',
      menuTitle: 'Do‘kon menyusi',
      orders: 'Mening arizalarim',
      bagDesigner: 'Paket konstruktori',
      callback: 'Menga qo‘ng‘iroq qiling',
      phone: 'Qo‘ng‘iroq qilish',
      telegram: 'Telegram orqali yozish',
      navigation: 'Asosiy navigatsiya',
      language: 'Til',
      foundProducts: 'Topilgan mahsulotlar',
      popularQueries: 'Ko‘p qidiriladiganlar',
      popularCategories: 'Mahsulot kategoriyalari',
      nothingFound: 'So‘rovingiz bo‘yicha hech narsa topilmadi',
      tryAnother: 'So‘rovni o‘zgartirib ko‘ring yoki quyidagi variantlardan birini tanlang:',
      viewAllResults: 'Katalogda barcha natijalarni ko‘rish',
      sku: 'Art.',
      cart: 'Savat',
      preliminary: 'Dastlabki summa',
      priceOnRequest: 'Narx so‘rov asosida',
      requestPrices: 'so‘rov asosidagi narxlar bor',
      openCart: 'Savatni ochish',
    },
    en: {
      profile: 'Profile',
      profileTitle: 'Profile and settings',
      search: 'Search',
      searchTitle: 'Search the catalog',
      searchPlaceholder: 'Product name, category, SKU…',
      close: 'Close',
      menuTitle: 'Store menu',
      orders: 'My requests',
      bagDesigner: 'Bag designer',
      callback: 'Request a callback',
      phone: 'Call us',
      telegram: 'Message on Telegram',
      navigation: 'Primary navigation',
      language: 'Language',
      foundProducts: 'Products found',
      popularQueries: 'Popular searches',
      popularCategories: 'Product categories',
      nothingFound: 'No products match your query',
      tryAnother: 'Try a different term or select from popular options below:',
      viewAllResults: 'View all results in catalog',
      sku: 'SKU',
      cart: 'Cart',
      preliminary: 'Preliminary',
      priceOnRequest: 'Price on request',
      requestPrices: 'includes request-only prices',
      openCart: 'Open cart',
    },
    zh: {
      profile: '个人中心', profileTitle: '个人资料与设置', search: '搜索', searchTitle: '搜索目录',
      searchPlaceholder: '商品名称、分类或货号…', close: '关闭', menuTitle: '商店菜单', orders: '我的申请',
      bagDesigner: '包装袋设计器', callback: '请求回电', phone: '致电我们', telegram: '通过 Telegram 联系',
      navigation: '主导航', language: '语言', foundProducts: '找到商品', popularQueries: '热门搜索',
      popularCategories: '商品分类', nothingFound: '没有符合搜索条件的商品',
      tryAnother: '请更换关键词或选择以下热门选项：', viewAllResults: '查看目录中的全部结果', sku: '货号',
      cart: '购物车', preliminary: '预估', priceOnRequest: '价格面议', requestPrices: '包含面议商品', openCart: '打开购物车',
    },
  }[language];

  const closePanel = useCallback(() => {
    setActivePanel(null);
    window.requestAnimationFrame(() => panelTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (activePanel !== 'search' || products.length > 0) return;
    let cancelled = false;
    PublicRepository.getProducts()
      .then((nextProducts) => {
        if (!cancelled) setProducts(nextProducts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activePanel, products.length]);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => setIsTextEntryFocused(isTextEntryElement(event.target));
    const handleFocusOut = () => {
      window.requestAnimationFrame(() => setIsTextEntryFocused(isTextEntryElement(document.activeElement)));
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const closeMobilePanelOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setActivePanel(null);
    };
    desktopQuery.addEventListener('change', closeMobilePanelOnDesktop);
    return () => desktopQuery.removeEventListener('change', closeMobilePanelOnDesktop);
  }, []);

  useEffect(() => {
    if (!activePanel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      if (activePanel === 'search') searchInputRef.current?.focus();
      else closeButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePanel, closePanel]);

  const openSearch = useCallback(() => {
    panelTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setActivePanel('search');
  }, []);

  const contextValue = useMemo(() => ({ openSearch }), [openSearch]);

  const navigationItems = [
    {
      key: 'home',
      href: '/' as const,
      panel: null,
      label: t('home'),
      icon: House,
      active: normalizedPathname === '/',
    },
    {
      key: 'catalog',
      href: '/catalog' as const,
      panel: null,
      label: t('catalog'),
      icon: LayoutGrid,
      active: ['/catalog', '/product'].some((route) => normalizedPathname.startsWith(route)),
    },
    {
      key: 'search',
      href: null,
      panel: 'search' as const,
      label: copy.search,
      icon: Search,
      active: activePanel === 'search' || normalizedPathname.startsWith('/search'),
    },
    {
      key: 'cart',
      href: '/request' as const,
      panel: null,
      label: copy.cart,
      icon: ShoppingCart,
      active: normalizedPathname.startsWith('/request'),
    },
    {
      key: 'profile',
      href: '/profile' as const,
      panel: null,
      label: copy.profile,
      icon: UserRound,
      active: normalizedPathname.startsWith('/profile'),
    },
  ];

  const hasRequestOnlyPrices = items.some((item) => item.price === undefined);
  const shouldShowCartDock = items.length > 0
    && !normalizedPathname.startsWith('/request')
    && !normalizedPathname.startsWith('/product')
    && !isTextEntryFocused
    && activePanel === null;
  const formattedCartAmount = totalAmount > 0
    ? formatMoney(totalAmount, language, 'UZS')
    : copy.priceOnRequest;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      searchInputRef.current?.focus();
      return;
    }
    searchInputRef.current?.blur();
  }

  // Live filter matching
  const matchingProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return products
      .filter((p) => {
        const titleRu = (p.titleRu || '').toLowerCase();
        const titleUz = (p.titleUz || '').toLowerCase();
        const titleEn = (p.titleEn || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const desc = (p.shortDescriptionRu || '').toLowerCase();
        const cat = (p.categorySlug || '').toLowerCase();
        return (
          titleRu.includes(q) ||
          titleUz.includes(q) ||
          titleEn.includes(q) ||
          sku.includes(q) ||
          desc.includes(q) ||
          cat.includes(q)
        );
      })
      .sort((a, b) => {
        const aTitle = ((language === 'uz' ? a.titleUz : language === 'en' ? a.titleEn : a.titleRu) || a.titleRu || '').toLowerCase();
        const bTitle = ((language === 'uz' ? b.titleUz : language === 'en' ? b.titleEn : b.titleRu) || b.titleRu || '').toLowerCase();
        const aStarts = aTitle.startsWith(q) || aTitle.split(' ').some((w) => w.startsWith(q));
        const bStarts = bTitle.startsWith(q) || bTitle.split(' ').some((w) => w.startsWith(q));
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return aTitle.localeCompare(bTitle);
      });
  }, [searchQuery, products, language]);

  const moreLinks = [
    { href: '/favorites' as const, label: t('favorites'), icon: Heart },
    { href: '/orders' as const, label: copy.orders, icon: Clock3 },
    { href: '/about' as const, label: t('about'), icon: Info },
    { href: '/clients' as const, label: t('clients'), icon: Users },
    { href: '/delivery' as const, label: t('delivery'), icon: Truck },
    { href: '/branding' as const, label: t('branding'), icon: Palette },
    { href: '/contacts' as const, label: t('contacts'), icon: Phone },
    ...(modules?.bagDesigner?.enabled ?? true
      ? [{ href: '/bag-designer' as const, label: copy.bagDesigner, icon: PackageSearch }]
      : []),
  ];

  return (
    <MobileStorefrontChromeContext.Provider value={contextValue}>
      {children}

      {shouldShowCartDock ? <div className="h-[var(--sp-mobile-cart-dock-height)] md:hidden" aria-hidden="true" /> : null}

      <AnimatePresence>
        {shouldShowCartDock ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 z-[39] px-[max(0.75rem,env(safe-area-inset-left))] md:hidden"
            style={{ bottom: 'calc(var(--sp-mobile-nav-height) + env(safe-area-inset-bottom) + 0.625rem)' }}
          >
            <Link
              href="/request"
              aria-label={copy.openCart}
              className="mx-auto grid min-h-16 max-w-lg grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--sp-radius-card)] bg-[var(--sp-brand)] px-3 py-2 text-[var(--sp-on-brand)] shadow-[0_14px_34px_rgb(8_49_30/24%)] transition-transform active:scale-[0.985]"
            >
              <span className="relative flex size-10 items-center justify-center rounded-[var(--sp-radius-control)] bg-[color-mix(in_srgb,var(--sp-on-brand)_12%,transparent)]" aria-hidden="true">
                <ShoppingCart className="size-5" />
                <span className="absolute -right-1.5 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--sp-accent)] px-1 text-[9px] font-bold tabular-nums text-[var(--sp-on-accent)]">
                  {items.length > 99 ? '99+' : items.length}
                </span>
              </span>
              <span className="min-w-0">
                <strong className="block truncate font-compact text-xs font-bold">{copy.cart}</strong>
                <span className="mt-0.5 block truncate text-[10px] text-[color-mix(in_srgb,var(--sp-on-brand)_78%,transparent)]">
                  {totalAmount > 0 ? `${copy.preliminary}: ${formattedCartAmount}` : formattedCartAmount}
                  {hasRequestOnlyPrices && totalAmount > 0 ? ` · ${copy.requestPrices}` : ''}
                </span>
              </span>
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav
        aria-label={copy.navigation}
        aria-hidden={isTextEntryFocused || activePanel !== null ? true : undefined}
        className={`mobile-bottom-navigation fixed inset-x-0 bottom-0 z-40 border-t border-[var(--sp-line)] bg-[color-mix(in_srgb,var(--sp-surface)_96%,transparent)] pb-[env(safe-area-inset-bottom)] pl-[max(0.375rem,env(safe-area-inset-left))] pr-[max(0.375rem,env(safe-area-inset-right))] shadow-[0_-10px_28px_rgb(21_27_24/8%)] backdrop-blur-xl transition-transform duration-200 md:hidden ${
          isTextEntryFocused || activePanel !== null ? 'pointer-events-none translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="mx-auto grid h-[var(--sp-mobile-nav-height)] max-w-lg grid-cols-5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                {item.active ? <span className="absolute inset-x-3 top-0 h-0.5 bg-[var(--sp-brand)]" aria-hidden="true" /> : null}
                <span className="relative">
                  <Icon className="size-5" strokeWidth={item.active ? 2.25 : 1.8} aria-hidden="true" />
                  {item.key === 'cart' && items.length > 0 ? (
                    <span className="absolute -right-2.5 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sp-accent)] px-1 text-[8px] font-bold tabular-nums text-[var(--sp-on-accent)]">
                      {items.length > 99 ? '99+' : items.length}
                    </span>
                  ) : null}
                </span>
                <span className="w-full truncate text-center leading-4">{item.label}</span>
              </>
            );
            const className = `relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 font-compact text-[10px] font-medium transition-colors active:bg-[var(--sp-surface-inset)] ${
              item.active ? 'text-[var(--sp-brand)]' : 'text-[var(--sp-ink-tertiary)]'
            }`;
            if (item.panel === 'search') {
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-current={item.active ? 'page' : undefined}
                  onClick={(event) => {
                    panelTriggerRef.current = event.currentTarget;
                    setActivePanel('search');
                  }}
                  className={className}
                >
                  {content}
                </button>
              );
            }
            return (
              <Link key={item.key} href={item.href} aria-current={item.active ? 'page' : undefined} className={className}>
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {activePanel ? (
          <div className="fixed inset-0 z-[70] md:hidden">
            <motion.button
              type="button"
              aria-label={copy.close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-storefront-panel-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`absolute inset-x-0 bottom-0 flex flex-col rounded-t-[var(--sp-radius-card)] border-t border-[var(--sp-line)] bg-[var(--sp-surface)] pb-[env(safe-area-inset-bottom)] shadow-[0_-24px_70px_rgb(8_16_12/28%)] ${
                activePanel === 'search' ? 'h-[70dvh] max-h-[48rem]' : 'max-h-[92dvh]'
              }`}
            >
              {/* Drag Pill */}
              <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-[var(--sp-line-strong)]" aria-hidden="true" />

              {/* Panel Header */}
              <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--sp-line)] px-4 py-1">
                <h2 id="mobile-storefront-panel-title" className="font-extended text-base font-bold text-[var(--sp-ink)]">
                  {activePanel === 'search' ? copy.searchTitle : copy.profileTitle}
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closePanel}
                  aria-label={copy.close}
                  className="sp-icon-button size-10 shrink-0 border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] text-[var(--sp-ink)] hover:bg-[var(--sp-surface-raised)]"
                >
                  <X className="size-4.5" aria-hidden="true" />
                </button>
              </div>

              {activePanel === 'search' ? (
                <div className="flex flex-1 flex-col overflow-hidden">
                  {/* Sticky Search Input Bar */}
                  <div className="border-b border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 py-3">
                    <form onSubmit={submitSearch} className="relative">
                      <label htmlFor="mobile-storefront-search" className="sr-only">
                        {copy.searchTitle}
                      </label>
                      <div className="flex min-h-12 items-center gap-2.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3.5 transition-[border-color,background-color] focus-within:border-[var(--sp-brand)] focus-within:bg-[var(--sp-surface)]">
                        <Search className="size-5 shrink-0 text-[var(--sp-ink-tertiary)]" aria-hidden="true" />
                        <input
                          ref={searchInputRef}
                          id="mobile-storefront-search"
                          type="search"
                          enterKeyHint="search"
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder={copy.searchPlaceholder}
                          style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                          className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-sm font-medium text-[var(--sp-ink)] placeholder:text-[var(--sp-ink-muted)] !outline-none !ring-0 !shadow-none focus:!border-none focus:!outline-none focus:!ring-0 focus-visible:!outline-none [appearance:none] [-webkit-appearance:none]"
                        />
                        {searchQuery ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              searchInputRef.current?.focus();
                            }}
                            aria-label={copy.close}
                            className="flex size-7 items-center justify-center rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-line)] text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)]"
                          >
                            <X className="size-3.5" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>

                  {/* Search Body: Results or Suggestions */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
                    {searchQuery.trim().length > 0 ? (
                      <div>
                        {matchingProducts.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-[var(--sp-ink-secondary)] px-1">
                              <span>
                                {copy.foundProducts}: <strong className="text-[var(--sp-ink)] font-semibold">{matchingProducts.length}</strong>
                              </span>
                            </div>

                            <ul className="divide-y divide-[var(--sp-line-soft)] rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] overflow-hidden">
                              {matchingProducts.slice(0, 10).map((product) => {
                                const title = getLocalizedText(product.titleRu, product.titleUz, product.titleEn, product.titleZh);
                                const priceText = getProductCatalogPriceText(product, language);
                                return (
                                  <li key={product.id}>
                                    <Link
                                      href={`/product/${product.slug}`}
                                      onClick={closePanel}
                                      className="flex items-center gap-3 p-3 transition-colors active:bg-[var(--sp-surface-hover)]"
                                    >
                                      <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--sp-radius-control-inner)] border border-[var(--sp-line)] bg-white">
                                        <ProductImage
                                          source={product.mainImage}
                                          alt={title}
                                          sizes="48px"
                                          variant="compact"
                                          imageClassName="object-contain p-1"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate font-compact text-xs font-bold text-[var(--sp-ink)]">
                                          {title}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-[var(--sp-ink-muted)]">
                                          {copy.sku}: {product.sku}
                                        </p>
                                      </div>
                                      <div className="shrink-0 text-right">
                                        <span className="block text-xs font-bold text-[var(--sp-brand)]">
                                          {priceText}
                                        </span>
                                      </div>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>

                            {matchingProducts.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const q = searchQuery.trim();
                                  closePanel();
                                  router.push({ pathname: '/search', query: { q } });
                                }}
                                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-xs font-semibold text-[var(--sp-on-brand)] shadow-xs active:scale-[0.98]"
                              >
                                <span>{copy.viewAllResults} ({matchingProducts.length})</span>
                                <ArrowRight className="size-3.5" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="py-6 text-center">
                            <div className="mx-auto flex size-12 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] text-[var(--sp-ink-muted)]">
                              <Search className="size-6" />
                            </div>
                            <h3 className="mt-3 font-semibold text-sm text-[var(--sp-ink)]">
                              {copy.nothingFound}
                            </h3>
                            <p className="mt-1 text-xs text-[var(--sp-ink-secondary)] max-w-xs mx-auto">
                              {copy.tryAnother}
                            </p>

                            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                              {popularSuggestions[language].map((term) => (
                                <button
                                  key={term}
                                  type="button"
                                  onClick={() => setSearchQuery(term)}
                                  className="rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-2.5 py-1 text-xs font-medium text-[var(--sp-ink)] hover:border-[var(--sp-brand)] active:bg-[var(--sp-brand-soft)]"
                                >
                                  {term}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty State: focused search suggestions only. */
                      <div className="space-y-5">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--sp-ink-muted)] mb-2.5">
                            {copy.popularQueries}
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {popularSuggestions[language].map((term) => (
                              <button
                                key={term}
                                type="button"
                                onClick={() => setSearchQuery(term)}
                                className="flex items-center gap-1.5 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 py-1.5 text-xs font-medium text-[var(--sp-ink)] transition-colors hover:border-[var(--sp-brand)] active:bg-[var(--sp-brand-soft)]"
                              >
                                <Search className="size-3 text-[var(--sp-ink-muted)]" />
                                <span>{term}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
                  <div className="mx-auto max-w-lg">
                    <nav aria-label={copy.menuTitle} className="divide-y divide-[var(--sp-line-soft)] border-y border-[var(--sp-line)]">
                      {moreLinks.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={closePanel}
                          className="flex min-h-12 items-center gap-3 py-2 text-sm font-medium text-[var(--sp-ink)] transition-colors active:text-[var(--sp-brand)]"
                        >
                          <Icon className="size-5 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
                          <span className="min-w-0 flex-1">{label}</span>
                          <ChevronRight className="size-4 shrink-0 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                        </Link>
                      ))}
                    </nav>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <a
                        href={contactPhoneHref(contacts.phone1)}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-3 text-sm font-semibold text-[var(--sp-brand)]"
                      >
                        <Phone className="size-4" aria-hidden="true" />
                        {copy.phone}
                      </a>
                      {contacts.telegram ? (
                        <a
                          href={contacts.telegram}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-3 text-sm font-semibold text-[var(--sp-brand)]"
                        >
                          <Send className="size-4" aria-hidden="true" />
                          {copy.telegram}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePanel(null);
                          setIsCallbackOpen(true);
                        }}
                        className="flex min-h-12 items-center justify-center rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-on-brand)] sm:col-span-2"
                      >
                        {copy.callback}
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--sp-line)] pt-4">
                      <span className="text-sm font-medium text-[var(--sp-ink-secondary)]">{copy.language}</span>
                      <LanguageSwitcher />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <CallbackModal isOpen={isCallbackOpen} onClose={() => setIsCallbackOpen(false)} />
    </MobileStorefrontChromeContext.Provider>
  );
}
