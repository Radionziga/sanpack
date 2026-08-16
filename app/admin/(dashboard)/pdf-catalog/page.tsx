'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { CatalogPrintDocument } from '@/components/catalog/CatalogPrintDocument';
import type { Category, ClientPartner, Product, SiteSettings } from '@/types';

export default function PdfCatalogAdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [clients, setClients] = useState<ClientPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [catsRes, prodsRes, settingsRes, clientsRes] = await Promise.all([
          fetch('/api/catalog?resource=categories'),
          fetch('/api/catalog?resource=products'),
          fetch('/api/catalog?resource=settings'),
          fetch('/api/catalog?resource=clients'),
        ]);

        if (catsRes.ok) {
          const catsData = await catsRes.json();
          if (Array.isArray(catsData)) setCategories(catsData);
        }
        if (prodsRes.ok) {
          const prodsData = await prodsRes.json();
          if (Array.isArray(prodsData)) setProducts(prodsData);
        }
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData && typeof settingsData === 'object') setSettings(settingsData);
        }
        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          if (Array.isArray(clientsData)) setClients(clientsData);
        }
      } catch (err) {
        console.error('Failed to load data for admin catalog print studio:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="admin-page mx-auto max-w-7xl space-y-4">
      <AdminPageHeader
        title="PDF-каталог и прайс-листы (A4)"
        description="Интерактивная студия формирования каталога формата А4 с крупными фото, живыми оптовыми ценами и сохранением в PDF."
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-slate-500">
          <Loader2 className="size-8 animate-spin text-[var(--sp-brand)]" />
          <span className="text-sm font-semibold">Загрузка каталога и базы товаров...</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--sp-line)] bg-slate-100/90 p-2 sm:p-4 shadow-inner overflow-hidden">
          <CatalogPrintDocument
            initialProducts={products}
            initialCategories={categories}
            settings={settings}
            clients={clients}
            initialOptions={{
              withPrices: true,
              language: 'ru',
            }}
            embeddedInAdmin={true}
          />
        </div>
      )}
    </div>
  );
}
