'use client';

import {
  ChevronRight,
  Clock3,
  Ellipsis,
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
  Users,
  X,
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
import { useFavorites } from '@/context/FavoritesContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRequestCart } from '@/context/RequestCartContext';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { CallbackModal } from '@/components/modals/CallbackModal';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { contactPhoneHref } from '@/lib/settings/contacts';

type MobilePanel = 'search' | 'more' | null;

interface MobileStorefrontChromeContextValue {
  openSearch: () => void;
}

const MobileStorefrontChromeContext = createContext<MobileStorefrontChromeContextValue | null>(null);

const localePrefix = /^\/(ru|uz|en)(?=\/|$)/;

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

export function useMobileStorefrontChrome() {
  const value = useContext(MobileStorefrontChromeContext);
  if (!value) {
    throw new Error('useMobileStorefrontChrome must be used inside MobileStorefrontChrome.');
  }
  return value;
}

export function MobileStorefrontChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, t } = useLanguage();
  const { items } = useRequestCart();
  const { count: favoriteCount } = useFavorites();
  const { contacts, modules } = useSiteSettings();
  const [activePanel, setActivePanel] = useState<MobilePanel>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCallbackOpen, setIsCallbackOpen] = useState(false);
  const [isTextEntryFocused, setIsTextEntryFocused] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelTriggerRef = useRef<HTMLElement | null>(null);
  const normalizedPathname = normalizePathname(pathname);

  const copy = {
    ru: {
      more: 'Ещё',
      search: 'Поиск',
      searchTitle: 'Найти товар',
      searchPlaceholder: 'Название, категория или артикул',
      close: 'Закрыть',
      menuTitle: 'Меню магазина',
      orders: 'Мои заявки',
      bagDesigner: 'Конструктор пакета',
      callback: 'Перезвоните мне',
      phone: 'Позвонить',
      telegram: 'Написать в Telegram',
      navigation: 'Основная навигация',
      language: 'Язык',
    },
    uz: {
      more: 'Yana',
      search: 'Qidirish',
      searchTitle: 'Mahsulotni topish',
      searchPlaceholder: 'Nomi, kategoriya yoki artikul',
      close: 'Yopish',
      menuTitle: 'Do‘kon menyusi',
      orders: 'Mening arizalarim',
      bagDesigner: 'Paket konstruktori',
      callback: 'Menga qo‘ng‘iroq qiling',
      phone: 'Qo‘ng‘iroq qilish',
      telegram: 'Telegram orqali yozish',
      navigation: 'Asosiy navigatsiya',
      language: 'Til',
    },
    en: {
      more: 'More',
      search: 'Search',
      searchTitle: 'Find a product',
      searchPlaceholder: 'Product, category or SKU',
      close: 'Close',
      menuTitle: 'Store menu',
      orders: 'My requests',
      bagDesigner: 'Bag designer',
      callback: 'Request a callback',
      phone: 'Call us',
      telegram: 'Message on Telegram',
      navigation: 'Primary navigation',
      language: 'Language',
    },
  }[language];

  const openPanel = useCallback((panel: Exclude<MobilePanel, null>) => {
    panelTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActivePanel(panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
    window.requestAnimationFrame(() => panelTriggerRef.current?.focus());
  }, []);

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

  const contextValue = useMemo(
    () => ({ openSearch: () => openPanel('search') }),
    [openPanel],
  );

  const navigationItems = [
    {
      key: 'home',
      href: '/' as const,
      label: t('home'),
      icon: House,
      active: normalizedPathname === '/',
    },
    {
      key: 'catalog',
      href: '/catalog' as const,
      label: t('catalog'),
      icon: LayoutGrid,
      active: ['/catalog', '/product', '/search'].some((route) => normalizedPathname.startsWith(route)),
    },
    {
      key: 'favorites',
      href: '/favorites' as const,
      label: t('favorites'),
      icon: Heart,
      count: favoriteCount,
      active: normalizedPathname.startsWith('/favorites'),
    },
    {
      key: 'request',
      href: '/request' as const,
      label: language === 'uz' ? 'Savat' : language === 'en' ? 'Cart' : 'Корзина',
      icon: ShoppingCart,
      count: items.length,
      active: normalizedPathname.startsWith('/request'),
    },
  ];

  const secondaryRoutes = ['/about', '/clients', '/delivery', '/branding', '/contacts', '/orders', '/bag-designer'];
  const isMoreActive = secondaryRoutes.some((route) => normalizedPathname.startsWith(route));

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      searchInputRef.current?.focus();
      return;
    }
    setActivePanel(null);
    router.push({ pathname: '/search', query: { q: query } });
  }

  const moreLinks = [
    { href: '/about' as const, label: t('about'), icon: Info },
    { href: '/clients' as const, label: t('clients'), icon: Users },
    { href: '/delivery' as const, label: t('delivery'), icon: Truck },
    { href: '/branding' as const, label: t('branding'), icon: Palette },
    { href: '/contacts' as const, label: t('contacts'), icon: Phone },
    ...(modules?.bagDesigner?.enabled ?? true
      ? [{ href: '/bag-designer' as const, label: copy.bagDesigner, icon: PackageSearch }]
      : []),
    { href: '/orders' as const, label: copy.orders, icon: Clock3 },
  ];

  return (
    <MobileStorefrontChromeContext.Provider value={contextValue}>
      {children}

      <nav
        aria-label={copy.navigation}
        aria-hidden={isTextEntryFocused || activePanel !== null ? true : undefined}
        className={`mobile-bottom-navigation fixed inset-x-0 bottom-0 z-40 border-t border-[var(--sp-line)] bg-[color-mix(in_srgb,var(--sp-surface)_96%,transparent)] px-[max(0.375rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_28px_rgb(21_27_24/8%)] backdrop-blur-xl transition-transform duration-200 md:hidden ${
          isTextEntryFocused || activePanel !== null ? 'pointer-events-none translate-y-full' : 'translate-y-0'
        }`}
      >
        <div className="mx-auto grid h-[var(--sp-mobile-nav-height)] max-w-lg grid-cols-5">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 font-compact text-[10px] font-medium transition-colors active:bg-[var(--sp-surface-inset)] ${
                  item.active ? 'text-[var(--sp-brand)]' : 'text-[var(--sp-ink-tertiary)]'
                }`}
              >
                {item.active ? <span className="absolute inset-x-3 top-0 h-0.5 bg-[var(--sp-brand)]" aria-hidden="true" /> : null}
                <span className="relative">
                  <Icon className="size-5" strokeWidth={item.active ? 2.25 : 1.8} aria-hidden="true" />
                  {item.count && item.count > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 flex min-h-[17px] min-w-[17px] items-center justify-center rounded-[var(--sp-radius-control-inner)] border border-[var(--sp-surface)] bg-[var(--sp-brand)] px-1 text-[9px] font-semibold tabular-nums text-[var(--sp-on-brand)]">
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  ) : null}
                </span>
                <span className="w-full truncate text-center leading-4">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => openPanel('more')}
            aria-haspopup="dialog"
            aria-expanded={activePanel === 'more'}
            className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 font-compact text-[10px] font-medium transition-colors active:bg-[var(--sp-surface-inset)] ${
              isMoreActive ? 'text-[var(--sp-brand)]' : 'text-[var(--sp-ink-tertiary)]'
            }`}
          >
            {isMoreActive ? <span className="absolute inset-x-3 top-0 h-0.5 bg-[var(--sp-brand)]" aria-hidden="true" /> : null}
            <Ellipsis className="size-5" strokeWidth={isMoreActive ? 2.25 : 1.8} aria-hidden="true" />
            <span className="w-full truncate text-center leading-4">{copy.more}</span>
          </button>
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
              className="absolute inset-0 bg-black/55"
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-storefront-panel-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.34 }}
              className="absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,720px)] flex-col rounded-t-[var(--sp-radius-card)] border-t border-[var(--sp-line)] bg-[var(--sp-surface)] pb-[env(safe-area-inset-bottom)] shadow-[0_-24px_70px_rgb(8_16_12/24%)]"
            >
              <div className="mx-auto mt-2 h-1 w-10 rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-line-strong)]" aria-hidden="true" />
              <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--sp-line)] px-4">
                <h2 id="mobile-storefront-panel-title" className="font-extended text-lg font-bold text-[var(--sp-ink)]">
                  {activePanel === 'search' ? copy.searchTitle : copy.menuTitle}
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closePanel}
                  aria-label={copy.close}
                  className="sp-icon-button size-11 shrink-0 border border-[var(--sp-line)]"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              {activePanel === 'search' ? (
                <div className="flex-1 overflow-y-auto px-4 pb-6 pt-5">
                  <form onSubmit={submitSearch} className="mx-auto max-w-lg">
                    <label htmlFor="mobile-storefront-search" className="sr-only">{copy.searchTitle}</label>
                    <div className="flex min-h-14 items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-control-border)] bg-[var(--sp-control)] px-3 focus-within:border-[var(--sp-brand)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--sp-brand)_12%,transparent)]">
                      <Search className="size-5 shrink-0 text-[var(--sp-ink-tertiary)]" aria-hidden="true" />
                      <input
                        ref={searchInputRef}
                        id="mobile-storefront-search"
                        type="search"
                        enterKeyHint="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={copy.searchPlaceholder}
                        className="sp-field-input min-w-0 flex-1 bg-transparent py-3 text-base text-[var(--sp-ink)] placeholder:text-[var(--sp-ink-muted)]"
                      />
                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          aria-label={copy.close}
                          className="sp-icon-button size-10 shrink-0"
                        >
                          <X className="size-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <button type="submit" className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] bg-[var(--sp-brand)] px-4 text-sm font-semibold text-[var(--sp-on-brand)]">
                      <Search className="size-4" aria-hidden="true" />{copy.search}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
                  <div className="mx-auto max-w-lg">
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-inset)] p-3">
                      <span className="text-sm font-medium text-[var(--sp-ink-secondary)]">{copy.search}</span>
                      <button type="button" onClick={() => openPanel('search')} className="sp-icon-button size-11 border border-[var(--sp-line)] bg-[var(--sp-surface)]" aria-label={copy.searchTitle}>
                        <Search className="size-5" aria-hidden="true" />
                      </button>
                    </div>

                    <nav aria-label={copy.menuTitle} className="divide-y divide-[var(--sp-line-soft)] border-y border-[var(--sp-line)]">
                      {moreLinks.map(({ href, label, icon: Icon }) => (
                        <Link key={href} href={href} onClick={closePanel} className="flex min-h-12 items-center gap-3 py-2 text-sm font-medium text-[var(--sp-ink)] transition-colors active:text-[var(--sp-brand)]">
                          <Icon className="size-5 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
                          <span className="min-w-0 flex-1">{label}</span>
                          <ChevronRight className="size-4 shrink-0 text-[var(--sp-ink-muted)]" aria-hidden="true" />
                        </Link>
                      ))}
                    </nav>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <a href={contactPhoneHref(contacts.phone1)} className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-3 text-sm font-semibold text-[var(--sp-brand)]">
                        <Phone className="size-4" aria-hidden="true" />{copy.phone}
                      </a>
                      {contacts.telegram ? (
                        <a href={contacts.telegram} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-3 text-sm font-semibold text-[var(--sp-brand)]">
                          <Send className="size-4" aria-hidden="true" />{copy.telegram}
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
