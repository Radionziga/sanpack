'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Package,
  FolderTree,
  SlidersHorizontal,
  Users,
  LogOut,
  Globe,
} from 'lucide-react';

export default function AdminShell({
  children,
  adminEmail,
}: {
  children: React.ReactNode;
  adminEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const navItems = [
    { label: 'Обзор KPI', href: '/admin', icon: LayoutDashboard },
    { label: 'Заявки B2B', href: '/admin/requests', icon: FileSpreadsheet },
    { label: 'Товары каталога', href: '/admin/products', icon: Package },
    { label: 'Категории', href: '/admin/categories', icon: FolderTree },
    { label: 'Атрибуты и Фильтры', href: '/admin/attributes', icon: SlidersHorizontal },
    { label: 'Партнеры HoReCa', href: '/admin/clients', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#F5F7F6] flex flex-col md:flex-row font-sans text-[#18231E]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#18231E] text-slate-300 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Admin Header Logo */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-9 h-9 rounded-xl bg-[#006F3C] text-white font-bold flex items-center justify-center text-lg">
              SP
            </div>
            <div>
              <span className="font-bold text-white text-base block tracking-wider">
                SANPACK
              </span>
              <span className="text-[10px] text-emerald-400 font-bold block uppercase">
                Admin Panel
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#006F3C] text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Actions */}
        <div className="pt-6 border-t border-slate-800 space-y-3 text-xs">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>Перейти на сайт</span>
          </Link>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Администратор:</span>
            <span className="text-xs font-bold text-white block truncate">
              {adminEmail}
            </span>
          </div>

          <button
            onClick={async () => {
              await logout();
              router.push('/admin/login');
              router.refresh();
            }}
            className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
