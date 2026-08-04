'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  FolderTree,
  Globe,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Package,
  Settings2,
  SlidersHorizontal,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SanpackLogo } from '@/components/ui/SanpackLogo';

const navigation = [
  {
    label: 'Работа',
    items: [
      { label: 'Обзор', href: '/admin', icon: LayoutDashboard },
      { label: 'Заявки B2B', href: '/admin/requests', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Каталог',
    items: [
      { label: 'Товары', href: '/admin/products', icon: Package },
      { label: 'Категории', href: '/admin/categories', icon: FolderTree },
      { label: 'Атрибуты и фильтры', href: '/admin/attributes', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'Материалы',
    items: [
      { label: 'Промо-карусель', href: '/admin/promotions', icon: ImageIcon },
      { label: 'Клиенты и партнёры', href: '/admin/clients', icon: Users },
    ],
  },
  {
    label: 'Система',
    items: [
      { label: 'Внешний вид', href: '/admin/settings', icon: Settings2 },
    ],
  },
] as const;

export default function AdminShell({ children, adminEmail }: { children: ReactNode; adminEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const signOut = async () => {
    await logout();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[var(--sp-canvas)] text-[var(--sp-ink)] md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="border-b border-[var(--sp-line)] bg-[var(--sp-canvas)] md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex h-full flex-col">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:min-h-20 md:px-5">
            <Link href="/admin" aria-label="SANPACK — главная админ-панели" className="text-[var(--sp-brand)]">
              <SanpackLogo variant="currentColor" className="h-[22px]" />
            </Link>
            <span className="hidden rounded-md border border-[var(--sp-line)] bg-[var(--sp-surface)] px-2 py-1 font-compact text-[9px] font-bold uppercase tracking-[0.09em] text-[var(--sp-ink-tertiary)] md:inline-flex">Control</span>
            <details className="group relative md:hidden">
              <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)] marker:content-none" aria-label="Меню администратора">
                <UserRound className="size-4" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-3 shadow-xl">
                <span className="block text-[9px] uppercase tracking-[0.08em] text-[var(--sp-ink-muted)]">Администратор</span>
                <span className="mt-1 block truncate text-xs font-bold text-[var(--sp-ink)]">{adminEmail}</span>
                <div className="mt-3 grid gap-2 border-t border-[var(--sp-line)] pt-3">
                  <Link href="/ru" target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--sp-line)] px-3 text-xs font-bold text-[var(--sp-ink-secondary)]">
                    <Globe className="size-4" aria-hidden="true" /> Открыть сайт
                  </Link>
                  <button type="button" onClick={() => void signOut()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300/30 px-3 text-xs font-bold text-[var(--sp-danger)]">
                    <LogOut className="size-4" aria-hidden="true" /> Выйти
                  </button>
                </div>
              </div>
            </details>
          </div>

          <nav aria-label="Админ-панель" className="no-scrollbar flex gap-2 overflow-x-auto border-t border-[var(--sp-line)] px-3 py-3 md:block md:flex-1 md:space-y-6 md:overflow-y-auto md:border-t-0 md:px-4 md:py-2">
            {navigation.map((group) => (
              <div key={group.label} className="flex shrink-0 gap-2 md:block">
                <p className="hidden px-2 pb-2 font-compact text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--sp-ink-muted)] md:block">{group.label}</p>
                <div className="flex gap-1.5 md:block md:space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                      <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 font-compact text-[11px] font-bold transition-colors md:w-full ${active ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)]'}`}>
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="hidden border-t border-[var(--sp-line)] p-4 md:block">
            <div className="mb-3 min-w-0 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3 py-2.5">
              <span className="block text-[9px] uppercase tracking-[0.08em] text-[var(--sp-ink-muted)]">Администратор</span>
              <span className="mt-1 block truncate text-[11px] font-bold text-[var(--sp-ink)]">{adminEmail}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/ru" target="_blank" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] text-[10px] font-bold text-[var(--sp-ink-secondary)] hover:border-[var(--sp-line-strong)] hover:text-[var(--sp-ink)]">
                <Globe className="size-3.5" aria-hidden="true" /> Сайт
              </Link>
              <button type="button" onClick={() => void signOut()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-300/30 text-[10px] font-bold text-[var(--sp-danger)] hover:bg-red-500/8">
                <LogOut className="size-3.5" aria-hidden="true" /> Выйти
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main id="admin-content" className="min-w-0 p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
    </div>
  );
}
