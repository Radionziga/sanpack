'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import { RequestOrder, Product } from '@/types';
import { FileSpreadsheet, Package, Clock, Factory, RefreshCw, TriangleAlert } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui';

function fetchOverviewStats() {
  return Promise.all([
    AdminRepository.getRequests(),
    AdminRepository.getProducts(),
  ]);
}

export default function AdminOverviewPage() {
  const [requests, setRequests] = useState<RequestOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const [nextRequests, nextProducts] = await fetchOverviewStats();
      setRequests(nextRequests);
      setProducts(nextProducts);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить обзор магазина.');
    } finally {
      setLoading(false);
    }
  }, []);

  const retryLoadStats = () => {
    setLoading(true);
    setLoadError(null);
    void loadStats();
  };

  useEffect(() => {
    void fetchOverviewStats()
      .then(([nextRequests, nextProducts]) => {
        setRequests(nextRequests);
        setProducts(nextProducts);
      })
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить обзор магазина.');
      })
      .finally(() => setLoading(false));
  }, []);

  const totalRequests = requests.length;
  const newRequests = requests.filter((r) => r.status === 'new').length;
  const totalProducts = products.length;
  const ownProductionCount = products.filter((p) => p.ownProduction).length;

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Обзор магазина"
        description="Товары, новые заявки и основные показатели — в одном месте."
      />

      {loadError && (
        <section role="alert" className="flex flex-col gap-4 rounded-2xl border border-red-300/50 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <p className="font-bold">Обзор магазина пока не загрузился</p>
              <p className="mt-1 text-xs leading-5 text-red-800">{loadError}</p>
            </div>
          </div>
          <button type="button" onClick={retryLoadStats} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 text-xs font-bold text-red-800 hover:bg-red-100">
            <RefreshCw className="size-4" aria-hidden="true" /> Повторить
          </button>
        </section>
      )}


      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="admin-panel flex items-center justify-between p-5">
          <div>
            <span className="block text-xs font-bold text-[var(--sp-ink-tertiary)]">Новые заявки</span>
            <span className="text-3xl font-bold text-rose-600 block mt-1">{newRequests}</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-red-500/8 text-[var(--sp-danger)]">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="admin-panel flex items-center justify-between p-5">
          <div>
            <span className="block text-xs font-bold text-[var(--sp-ink-tertiary)]">Всего заявок</span>
            <span className="mt-1 block text-3xl font-bold text-[var(--sp-brand)]">{totalRequests}</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--sp-brand)_9%,var(--sp-surface))] text-[var(--sp-brand)]">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="admin-panel flex items-center justify-between p-5">
          <div>
            <span className="block text-xs font-bold text-[var(--sp-ink-tertiary)]">Товаров в каталоге</span>
            <span className="mt-1 block text-3xl font-bold text-[var(--sp-ink)]">{totalProducts}</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--sp-surface-muted)] text-[var(--sp-ink-secondary)]">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="admin-panel flex items-center justify-between p-5">
          <div>
            <span className="block text-xs font-bold text-[var(--sp-ink-tertiary)]">Собственная продукция</span>
            <span className="mt-1 block text-3xl font-bold text-[var(--sp-brand)]">{ownProductionCount}</span>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--sp-brand)_9%,var(--sp-surface))] text-[var(--sp-brand)]">
            <Factory className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="admin-panel space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-[var(--sp-line)] pb-3">
          <h2 className="text-base font-bold text-[var(--sp-ink)]">
            Последние входящие заявки
          </h2>
          <Link
            href="/admin/requests"
            className="text-xs font-bold text-[var(--sp-brand)] hover:underline"
          >
            Смотреть все заявки →
          </Link>
        </div>

        {loading ? (
          <div className="h-40 animate-pulse rounded-[var(--radius-md)] bg-[var(--sp-surface-muted)]" />
        ) : requests.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--sp-ink-tertiary)]">Заявок пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="admin-table-head">
                <tr>
                  <th className="p-3">№ Заявки</th>
                  <th className="p-3">Компания / ФИО</th>
                  <th className="p-3">Телефон</th>
                  <th className="p-3">Позиций</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sp-line)]">
                {requests.slice(0, 5).map((req) => (
                  <tr key={req.id} className="hover:bg-[var(--sp-surface-muted)]">
                    <td className="p-3 font-bold text-[var(--sp-brand)]">
                      {req.requestNumber}
                    </td>
                    <td className="p-3 font-bold text-[var(--sp-ink)]">
                      {req.companyName || req.contactName}
                    </td>
                    <td className="p-3">{req.phone}</td>
                    <td className="p-3 font-bold">{req.items.length} поз.</td>
                    <td className="p-3">
                      <Badge variant={req.status === 'new' ? 'danger' : req.status === 'processing' ? 'warning' : 'success'}>
                        {req.status === 'new'
                          ? 'НОВАЯ'
                          : req.status === 'processing'
                          ? 'В РАБОТЕ'
                          : 'ВЫПОЛНЕНА'}
                      </Badge>
                    </td>
                    <td className="p-3 text-[var(--sp-ink-tertiary)]">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
