'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import { Product, Category, Attribute } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { AiTranslateButton } from '@/components/admin/AiTranslateButton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ProductVariantsEditor } from '@/components/admin/ProductVariantsEditor';
import { deleteUploadedMedia, MediaUploadField } from '@/components/admin/MediaUploadField';
import { Plus, Edit, Trash2, Search, Factory, ShieldCheck, X, Check, RefreshCw, TriangleAlert, Star, FileText, Download } from 'lucide-react';
import { getMinimumOrderLabel, getOrderRuleSummary, getProductOrderRule } from '@/lib/commerce/orderQuantities';

const attributeLabels: Record<string, string> = {
  material: 'Материал',
  size: 'Размер',
  weight: 'Вес',
  volume: 'Объём',
  color: 'Цвет',
  brand: 'Бренд',
  packaging_type: 'Тип упаковки',
  horeca_category: 'Категория HoReCa',
};

function getAttributeLabel(key: string) {
  if (attributeLabels[key]) return attributeLabels[key];
  const readable = key.replace(/[_-]+/g, ' ').trim();
  return readable ? readable.charAt(0).toUpperCase() + readable.slice(1) : 'Характеристика';
}

interface ProductMediaAsset {
  url: string;
  path?: string;
}

function getProductMedia(product?: Partial<Product> | null): ProductMediaAsset[] {
  if (!product) return [];
  const orderedUrls = [product.mainImage, ...(product.images || [])].filter(
    (url): url is string => Boolean(url),
  );
  const uniqueUrls = [...new Set(orderedUrls)];

  return uniqueUrls.map((url) => {
    const index = product.images?.indexOf(url) ?? -1;
    if (url === product.mainImage) {
      return {
        url,
        path: product.mainImagePath || (index >= 0 ? product.imagePaths?.[index] : undefined),
      };
    }
    return {
      url,
      path: index >= 0 ? product.imagePaths?.[index] || undefined : undefined,
    };
  });
}

function withProductMedia(
  product: Partial<Product>,
  assets: ProductMediaAsset[],
): Partial<Product> {
  const uniqueAssets = assets.filter(
    (asset, index) => asset.url && assets.findIndex((candidate) => candidate.url === asset.url) === index,
  );
  const main = uniqueAssets[0];
  return {
    ...product,
    mainImage: main?.url || '',
    mainImagePath: main?.path,
    images: uniqueAssets.map((asset) => asset.url),
    imagePaths: uniqueAssets.map((asset) => asset.path || ''),
  };
}

function getManagedMediaPaths(product?: Partial<Product> | null) {
  return new Set(
    getProductMedia(product)
      .map((asset) => asset.path)
      .filter((path): path is string => Boolean(path)),
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return;
      const persistedProduct = editingProduct?.id
        ? products.find((product) => product.id === editingProduct.id)
        : undefined;
      const persistedPaths = getManagedMediaPaths(persistedProduct);
      for (const stagedPath of getManagedMediaPaths(editingProduct)) {
        if (!persistedPaths.has(stagedPath)) {
          void deleteUploadedMedia(stagedPath).catch((error) => {
            console.warn('Could not remove staged product image.', error);
          });
        }
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setSaveError('');
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isModalOpen, saving, editingProduct, products]);

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const [p, c, a] = await Promise.all([
        AdminRepository.getProducts(),
        AdminRepository.getCategories(),
        AdminRepository.getAttributes(),
      ]);
      setProducts(p);
      setCategories(c);
      setAttributes(a);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить каталог.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreate = () => {
    setEditingProduct({
      titleRu: '',
      titleUz: '',
      titleEn: '',
      slug: '',
      sku: 'SP-' + Math.floor(1000 + Math.random() * 9000),
      categoryId: categories[0]?.id || '',
      shortDescriptionRu: '',
      shortDescriptionUz: '',
      shortDescriptionEn: '',
      descriptionRu: '',
      descriptionUz: '',
      descriptionEn: '',
      mainImage: '',
      images: [],
      imagePaths: [],
      salesUnit: 'рулон',
      minimumOrder: 1,
      quantityStep: 1,
      orderPackaging: {
        enabled: false,
        nameRu: 'мешок',
        nameUz: 'qop',
        nameEn: 'bag',
        unitsPerPackage: 20,
        minimumPackages: 1,
        packageStep: 1,
      },
      showPrice: true,
      price: 15000,
      stockStatus: 'in_stock',
      attributes: { material: 'ПНД', size: 'стандарт' },
      variants: [],
      featured: false,
      ownProduction: true,
      newProduct: true,
      sortOrder: 10,
    });
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct({
      ...p,
      orderPackaging: p.orderPackaging || {
        enabled: false,
        nameRu: 'мешок',
        nameUz: 'qop',
        nameEn: 'bag',
        unitsPerPackage: 20,
        minimumPackages: 1,
        packageStep: 1,
      },
    });
    setSaveError('');
    setIsModalOpen(true);
  };

  const getPersistedProduct = () => (
    editingProduct?.id ? products.find((product) => product.id === editingProduct.id) : undefined
  );

  const cleanupStagedImage = () => {
    const persistedPaths = getManagedMediaPaths(getPersistedProduct());
    for (const stagedPath of getManagedMediaPaths(editingProduct || undefined)) {
      if (!persistedPaths.has(stagedPath)) {
        void deleteUploadedMedia(stagedPath).catch((error) => {
          console.warn('Could not remove staged product image.', error);
        });
      }
    }
  };

  const closeEditor = () => {
    if (saving) return;
    cleanupStagedImage();
    setIsModalOpen(false);
    setEditingProduct(null);
    setSaveError('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Вы действительно хотите удалить этот товар из каталога?')) {
      setLoadError('');
      try {
        const product = products.find((item) => item.id === id);
        await AdminRepository.deleteProduct(id);
        for (const path of getManagedMediaPaths(product)) {
          await deleteUploadedMedia(path).catch((error) => {
            console.warn('Could not remove product image.', error);
          });
        }
        await loadData();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Товар не удалён. Попробуйте ещё раз.');
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaveError('');
    setSaving(true);

    let draft = {
      ...editingProduct,
      slug: editingProduct.slug || (editingProduct.titleRu || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    } as Partial<Product>;
    const orderRule = getProductOrderRule(draft as Product);
    draft.minimumOrder = orderRule.minimumQuantity;
    draft.quantityStep = orderRule.quantityStep;
    draft = withProductMedia(draft, getProductMedia(draft));
    const previousProduct = draft.id
      ? products.find((product) => product.id === draft.id)
      : undefined;

    try {
      if (draft.id) {
        await AdminRepository.updateProduct(draft.id, draft);
      } else {
        await AdminRepository.createProduct(draft as Omit<Product, 'id' | 'createdAt' | 'updatedAt'>);
      }
      const draftPaths = getManagedMediaPaths(draft);
      for (const previousPath of getManagedMediaPaths(previousProduct)) {
        if (!draftPaths.has(previousPath)) {
          await deleteUploadedMedia(previousPath).catch((error) => {
            console.warn('Could not remove replaced product image.', error);
          });
        }
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      await loadData();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Товар не сохранён. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.titleRu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const editingOrderRule = editingProduct
    ? getProductOrderRule(editingProduct as Product)
    : null;
  const editingOrderSummary = editingProduct
    ? getOrderRuleSummary(editingProduct as Product)
    : '';
  const editingMediaAssets = getProductMedia(editingProduct || undefined);
  const editingCategory = categories.find((category) => category.id === editingProduct?.categoryId);
  const editingBrand = editingProduct?.brandName
    || (typeof editingProduct?.attributes?.brand === 'string' ? editingProduct.attributes.brand : '');

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        title="Товары"
        description="Управляйте ассортиментом, ценами, упаковкой и характеристиками. Редактор открывается как отдельное рабочее пространство."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/catalog/pdf?prices=1"
              target="_blank"
              rel="noreferrer"
              className="admin-button-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
              title="Сгенерировать и открыть PDF-прайс с актуальными ценами"
            >
              <FileText className="size-3.5 text-[var(--sp-brand)]" aria-hidden="true" />
              PDF с ценами
            </a>
            <a
              href="/api/catalog/pdf?prices=0"
              target="_blank"
              rel="noreferrer"
              className="admin-button-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
              title="Сгенерировать и открыть PDF-каталог без цен (для презентаций)"
            >
              <FileText className="size-3.5 text-[var(--sp-ink-secondary)]" aria-hidden="true" />
              PDF без цен
            </a>
            <button type="button" onClick={handleOpenCreate} className="admin-button-primary">
              <Plus className="size-4" aria-hidden="true" /> Добавить товар
            </button>
          </div>
        )}
      />

      {loadError ? (
        <div role="alert" className="sp-alert sp-alert-danger flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{loadError}</p>
          <button type="button" onClick={() => void loadData()} className="admin-button-secondary min-h-10 px-4 text-[var(--sp-danger)]"><RefreshCw className="size-4" aria-hidden="true" />Повторить</button>
        </div>
      ) : null}

      {/* Search & Stats */}
      <div className="admin-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md flex-1">
          <Search className="absolute left-3 top-3.5 size-4 text-[var(--sp-ink-muted)]" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по названию или артикулу (SKU)..."
            className="admin-control pl-9 pr-3 text-xs"
          />
        </div>

        <span className="shrink-0 text-xs font-bold text-[var(--sp-brand)]">
          Всего товаров: {filteredProducts.length}
        </span>
      </div>

      {/* Products Table */}
      <div className="admin-table-wrap">
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--sp-ink-tertiary)]">Загрузка товаров...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="admin-table-head font-bold">
                <tr>
                  <th className="p-3.5">Фото</th>
                  <th className="p-3.5">Артикул / Название</th>
                  <th className="p-3.5">Категория</th>
                  <th className="p-3.5">Цена / Ед.</th>
                  <th className="p-3.5">Завод</th>
                  <th className="p-3.5">Статус</th>
                  <th className="p-3.5 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sp-line-soft)]">
                {filteredProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  const orderSummary = getMinimumOrderLabel(p);
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-[var(--sp-surface-inset)]">
                      <td className="p-3.5">
                        <Image
                          src={p.mainImage || '/catalog/product-placeholder.svg'}
                          alt={p.titleRu}
                          width={40}
                          height={40}
                          className="size-10 rounded-[var(--radius-sm)] border border-[var(--sp-line)] bg-[var(--sp-surface)] object-contain p-1"
                        />
                      </td>
                      <td className="p-3.5">
                        <span className="block font-bold text-[var(--sp-ink)]">{p.titleRu}</span>
                        <span className="font-mono text-[10px] text-[var(--sp-ink-tertiary)]">Арт: {p.sku}</span>
                      </td>
                      <td className="p-3.5 font-semibold text-[var(--sp-ink-secondary)]">
                        {cat ? cat.titleRu : '—'}
                      </td>
                      <td className="p-3.5 font-bold text-[var(--sp-brand)]">
                        {p.showPrice && p.price ? `${p.price.toLocaleString()} сум` : 'По запросу'}
                        <span className="block text-[10px] font-normal text-[var(--sp-ink-tertiary)]">
                          {orderSummary}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {p.ownProduction ? (
                          <span className="flex w-fit items-center gap-1 rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--sp-brand)_10%,var(--sp-surface))] px-2 py-0.5 text-[10px] font-bold text-[var(--sp-brand)]">
                            <Factory className="w-3 h-3" /> Собственное производство
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--sp-ink-tertiary)]">Импорт</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${
                            p.stockStatus === 'in_stock'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.stockStatus === 'in_stock' ? 'В наличии' : 'Под заказ'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="admin-icon-button size-9 hover:bg-[var(--sp-brand)] hover:text-[var(--sp-on-brand)]"
                          title="Редактировать"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="admin-icon-button size-9 text-[var(--sp-danger)] hover:bg-red-500/10 hover:text-[var(--sp-danger)]"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Edit / Create Modal */}
      {isModalOpen && editingProduct && (
        <div className="admin-modal-backdrop p-0 md:p-4" role="dialog" aria-modal="true" aria-label={editingProduct.id ? 'Редактирование товара' : 'Новый товар'}>
          <form
            onSubmit={handleSave}
            className="admin-modal-card mx-auto md:my-0 md:max-w-6xl text-xs"
          >
            <div className="admin-modal-header flex items-center justify-between gap-4 px-5 py-4 md:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sp-brand)]">Каталог</p>
                <h3 className="mt-1 text-lg font-bold text-[var(--sp-ink)]">
                  {editingProduct.id ? 'Редактирование товара' : 'Новый товар'}
                </h3>
                <p className="mt-1 text-[11px] text-[var(--sp-ink-tertiary)]">Заполните обязательные данные, затем настройте продажу, описание и характеристики.</p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="admin-icon-button shrink-0"
                aria-label="Закрыть редактор"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="admin-modal-body space-y-7 bg-[var(--sp-canvas)] px-5 py-6 md:px-7">
            <section className="admin-panel p-5 md:p-6">
              <h4 className="admin-section-heading">Основная информация</h4>
              <p className="admin-section-description">Название, артикул, категория, цена и изображение, которые определяют товар в каталоге.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="font-bold block mb-1">Название (RU) *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.titleRu || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, titleRu: e.target.value })}
                  className="admin-control text-sm"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Название (UZ) *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.titleUz || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, titleUz: e.target.value })}
                  className="admin-control text-sm"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Название (EN)</label>
                <input
                  type="text"
                  value={editingProduct.titleEn || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, titleEn: e.target.value })}
                  className="admin-control text-sm"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Артикул (SKU) *</label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  className="admin-control font-mono text-sm"
                />
              </div>

              <div>
                <CustomSelect
                  label="Категория *"
                  value={editingProduct.categoryId || ''}
                  onChange={(val) => setEditingProduct({ ...editingProduct, categoryId: val })}
                  options={categories.map((c) => ({ value: c.id, label: c.titleRu }))}
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Цена (сум)</label>
                <input
                  type="number"
                  value={editingProduct.price || 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                  className="admin-control text-sm font-bold"
                />
              </div>

              <div>
                <CustomSelect
                  label="Статус склада"
                  value={editingProduct.stockStatus || 'in_stock'}
                  onChange={(val) =>
                    setEditingProduct({
                      ...editingProduct,
                      stockStatus: val as Product['stockStatus'],
                    })
                  }
                  options={[
                    { value: 'in_stock', label: 'В наличии' },
                    { value: 'out_of_stock', label: 'Нет в наличии' },
                    { value: 'on_order', label: 'Под заказ' },
                  ]}
                />
              </div>
            </div>

            <div className="mt-5 space-y-4 border-t border-[var(--sp-line)] pt-5">
              <div>
                <h4 className="text-sm font-bold text-[var(--sp-ink)]">Изображения товара</h4>
                <p className="mt-1 text-[11px] leading-5 text-[var(--sp-ink-secondary)]">
                  Первое изображение показывается в каталоге. Можно загрузить несколько фотографий или создать новый вариант с помощью ИИ.
                </p>
              </div>

              {editingMediaAssets.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {editingMediaAssets.map((asset, index) => (
                    <article key={`${asset.url}:${index}`} className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-2.5">
                      <div className="relative aspect-square overflow-hidden rounded-[var(--sp-radius-control)] bg-white">
                        <Image src={asset.url} alt={`Изображение товара ${index + 1}`} fill sizes="260px" className="object-contain" />
                        {index === 0 ? (
                          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand)] px-2 py-1 text-[10px] font-bold text-[var(--sp-on-brand)] shadow-sm">
                            <Star className="size-3" aria-hidden="true" /> Главное
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            const reordered = [asset, ...editingMediaAssets.filter((_, assetIndex) => assetIndex !== index)];
                            setEditingProduct(withProductMedia(editingProduct, reordered));
                          }}
                          className="admin-button-secondary min-h-9 px-2 text-[10px] disabled:cursor-default disabled:opacity-45"
                        >
                          <Star className="size-3.5" aria-hidden="true" /> Главная
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const persistedPaths = getManagedMediaPaths(getPersistedProduct());
                            if (asset.path && !persistedPaths.has(asset.path)) {
                              void deleteUploadedMedia(asset.path).catch((error) => {
                                console.warn('Could not remove staged product image.', error);
                              });
                            }
                            setEditingProduct(withProductMedia(
                              editingProduct,
                              editingMediaAssets.filter((_, assetIndex) => assetIndex !== index),
                            ));
                          }}
                          className="admin-button-secondary min-h-9 px-2 text-[10px] text-[var(--sp-danger)]"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" /> Удалить
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[var(--sp-radius-card)] border border-dashed border-[var(--sp-line-strong)] bg-[var(--sp-surface-inset)] px-4 py-5 text-center text-xs text-[var(--sp-ink-tertiary)]">
                  У товара пока нет изображения. Загрузите файл или создайте нейтральную фотографию товара.
                </div>
              )}

              <MediaUploadField
                kind="product"
                label="Добавить изображение"
                recommendation="Квадрат 1:1 · готовый файл сохраняется в WebP"
                aiContext={{
                  title: editingProduct.titleRu || '',
                  category: editingCategory?.titleRu || '',
                  brand: editingBrand,
                  description: editingProduct.descriptionRu || editingProduct.shortDescriptionRu || '',
                  attributes: editingProduct.attributes || {},
                }}
                onUploaded={(media) => {
                  setEditingProduct(withProductMedia(editingProduct, [
                    ...editingMediaAssets,
                    { url: media.url, path: media.path },
                  ]));
                }}
              />
            </div>
            </section>

            <section className="admin-panel space-y-4 p-5 md:p-6">
              <div className="flex flex-col gap-1 border-b border-[var(--sp-line)] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div>
                  <h4 className="text-sm font-bold text-[var(--sp-ink)]">Продажа и упаковка</h4>
                  <p className="mt-1 max-w-xl text-[11px] leading-5 text-[var(--sp-ink-secondary)]">
                    Укажите, за что установлена цена и каким количеством покупатель может оформить заказ.
                  </p>
                </div>
                <span className="mt-2 text-[10px] font-semibold text-[var(--sp-brand)] sm:mt-0">
                  Цена всегда считается за единицу продажи
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="font-bold text-[var(--sp-ink)]">
                  Единица продажи
                  <input
                    type="text"
                    required
                    value={editingProduct.salesUnit || ''}
                    onChange={(event) => setEditingProduct({ ...editingProduct, salesUnit: event.target.value })}
                    placeholder="рулон, штука, кг"
                    className="admin-control mt-1.5 font-normal"
                  />
                  <span className="mt-1 block text-[10px] font-normal leading-4 text-[var(--sp-ink-tertiary)]">
                    Например, цена 20 000 сум за один рулон.
                  </span>
                </label>

                <label className="font-bold text-[var(--sp-ink)]">
                  Минимум, единиц
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    disabled={editingProduct.orderPackaging?.enabled}
                    value={editingProduct.minimumOrder || 1}
                    onChange={(event) => setEditingProduct({ ...editingProduct, minimumOrder: Number(event.target.value) || 1 })}
                    className="admin-control mt-1.5 font-normal"
                  />
                </label>

                <label className="font-bold text-[var(--sp-ink)]">
                  Шаг заказа, единиц
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    disabled={editingProduct.orderPackaging?.enabled}
                    value={editingProduct.quantityStep || 1}
                    onChange={(event) => setEditingProduct({ ...editingProduct, quantityStep: Number(event.target.value) || 1 })}
                    className="admin-control mt-1.5 font-normal"
                  />
                </label>
              </div>

              <label className="admin-panel-muted flex cursor-pointer items-start gap-3 p-3.5">
                <input
                  type="checkbox"
                  checked={editingProduct.orderPackaging?.enabled || false}
                  onChange={(event) => setEditingProduct({
                    ...editingProduct,
                    orderPackaging: {
                      enabled: event.target.checked,
                      nameRu: editingProduct.orderPackaging?.nameRu || 'мешок',
                      nameUz: editingProduct.orderPackaging?.nameUz || 'qop',
                      nameEn: editingProduct.orderPackaging?.nameEn || 'bag',
                      unitsPerPackage: editingProduct.orderPackaging?.unitsPerPackage || 20,
                      minimumPackages: editingProduct.orderPackaging?.minimumPackages || 1,
                      packageStep: editingProduct.orderPackaging?.packageStep || 1,
                    },
                  })}
                  className="mt-0.5 size-4 accent-[var(--sp-brand)]"
                />
                <span>
                  <strong className="block text-xs text-[var(--sp-ink)]">Заказ только целыми внешними упаковками</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-[var(--sp-ink-secondary)]">
                    Включите, если рулоны, пачки или штуки отпускаются только мешками, коробками или ящиками.
                  </span>
                </span>
              </label>

              {editingProduct.orderPackaging?.enabled ? (
                <div className="space-y-4 border-l-2 border-[var(--sp-brand)] pl-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {(['Ru', 'Uz', 'En'] as const).map((suffix) => {
                      const field = `name${suffix}` as const;
                      return (
                        <label key={field} className="font-bold text-[var(--sp-ink)]">
                          Название упаковки ({suffix.toUpperCase()}){suffix === 'Ru' ? ' *' : ''}
                          <input
                            type="text"
                            required={suffix === 'Ru'}
                            value={editingProduct.orderPackaging?.[field] || ''}
                            onChange={(event) => setEditingProduct({
                              ...editingProduct,
                              orderPackaging: {
                                ...editingProduct.orderPackaging!,
                                [field]: event.target.value,
                              },
                            })}
                            placeholder={suffix === 'Ru' ? 'мешок, коробка, ящик' : ''}
                            className="admin-control mt-1.5 font-normal"
                          />
                        </label>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="font-bold text-[var(--sp-ink)]">
                      Единиц в одной упаковке
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={editingProduct.orderPackaging.unitsPerPackage}
                        onChange={(event) => setEditingProduct({ ...editingProduct, orderPackaging: { ...editingProduct.orderPackaging!, unitsPerPackage: Math.max(1, Number(event.target.value) || 1) } })}
                        className="admin-control mt-1.5 font-normal"
                      />
                    </label>
                    <label className="font-bold text-[var(--sp-ink)]">
                      Минимум упаковок
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={editingProduct.orderPackaging.minimumPackages}
                        onChange={(event) => setEditingProduct({ ...editingProduct, orderPackaging: { ...editingProduct.orderPackaging!, minimumPackages: Math.max(1, Number(event.target.value) || 1) } })}
                        className="admin-control mt-1.5 font-normal"
                      />
                    </label>
                    <label className="font-bold text-[var(--sp-ink)]">
                      Шаг, упаковок
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={editingProduct.orderPackaging.packageStep}
                        onChange={(event) => setEditingProduct({ ...editingProduct, orderPackaging: { ...editingProduct.orderPackaging!, packageStep: Math.max(1, Number(event.target.value) || 1) } })}
                        className="admin-control mt-1.5 font-normal"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {editingOrderRule ? (
                <div className="rounded-[var(--sp-radius-sm)] border border-[color-mix(in_srgb,var(--sp-brand)_28%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-brand)_8%,var(--sp-surface))] p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sp-brand)]">Так увидит покупатель</span>
                  <p className="mt-1.5 text-xs font-semibold leading-5 text-[var(--sp-ink)]">{editingOrderSummary}</p>
                  {editingProduct.showPrice && editingProduct.price && editingOrderRule.packageEnabled ? (
                    <p className="mt-1 text-[10px] text-[var(--sp-ink-secondary)]">
                      Стоимость одной внешней упаковки: {(editingProduct.price * editingOrderRule.unitsPerPackage).toLocaleString('ru-RU')} сум.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <ProductVariantsEditor
              key={editingProduct.id || 'new-product'}
              initialVariants={editingProduct.variants || []}
              currency={editingProduct.currency || 'UZS'}
              onChange={(variants) => setEditingProduct((current) => current ? { ...current, variants } : current)}
            />

            <section className="admin-panel space-y-5 p-5 md:p-6">
            <div>
              <h4 className="admin-section-heading">Описание и размещение</h4>
              <p className="admin-section-description">Отметьте нужные витрины и заполните тексты. Переводы можно подготовить автоматически.</p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={editingProduct.ownProduction || false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, ownProduction: e.target.checked })}
                  className="size-4 accent-[var(--sp-brand)]"
                />
                <span>Собственное производство</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={editingProduct.featured || false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                  className="size-4 accent-[var(--sp-brand)]"
                />
                <span>Популярное на главной</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(['Ru', 'Uz', 'En'] as const).map((suffix) => {
                const field = `shortDescription${suffix}` as const;
                return (
                  <label key={field} className="font-bold">
                    Краткое описание ({suffix.toUpperCase()})
                    <textarea rows={2} value={editingProduct[field] || ''} onChange={(event) => setEditingProduct({ ...editingProduct, [field]: event.target.value })} className="admin-control mt-1.5 font-normal" />
                  </label>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {(['Ru', 'Uz', 'En'] as const).map((suffix) => {
                const field = `description${suffix}` as const;
                return (
                  <label key={field} className="font-bold">
                    Полное описание ({suffix.toUpperCase()})
                    <textarea rows={4} value={editingProduct[field] || ''} onChange={(event) => setEditingProduct({ ...editingProduct, [field]: event.target.value })} className="admin-control mt-1.5 font-normal" />
                  </label>
                );
              })}
            </div>

            <AiTranslateButton fields={[
              {
                key: 'title', label: 'Название товара',
                values: { ru: editingProduct.titleRu || '', uz: editingProduct.titleUz || '', en: editingProduct.titleEn || '' },
                onChange: (language, value) => setEditingProduct((current) => current ? { ...current, [`title${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : 'En'}`]: value } : current),
              },
              {
                key: 'shortDescription', label: 'Краткое описание',
                values: { ru: editingProduct.shortDescriptionRu || '', uz: editingProduct.shortDescriptionUz || '', en: editingProduct.shortDescriptionEn || '' },
                onChange: (language, value) => setEditingProduct((current) => current ? { ...current, [`shortDescription${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : 'En'}`]: value } : current),
              },
              {
                key: 'description', label: 'Полное описание',
                values: { ru: editingProduct.descriptionRu || '', uz: editingProduct.descriptionUz || '', en: editingProduct.descriptionEn || '' },
                onChange: (language, value) => setEditingProduct((current) => current ? { ...current, [`description${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : 'En'}`]: value } : current),
              },
            ]} />
            </section>

            {/* Dynamic Attributes Section */}
            <section className="admin-panel space-y-5 p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="admin-section-heading">Характеристики и фильтры</h4>
                  <span className="admin-section-description block">
                    Выберите из созданных атрибутов или введите своё произвольное значение
                  </span>
                </div>
                <a
                  href="/admin/attributes"
                  target="_blank"
                  className="rounded-md border border-[color-mix(in_srgb,var(--sp-brand)_24%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-brand)_10%,var(--sp-surface))] px-2.5 py-1 text-[10px] font-semibold text-[var(--sp-brand)] hover:underline"
                >
                  + Управление базой атрибутов
                </a>
              </div>

              {/* Grid of System Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attributes.map((attr) => {
                  const rawVal = editingProduct.attributes?.[attr.key];
                  const currentValue = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
                  return (
                    <div key={attr.id} className="admin-panel-muted space-y-1.5 p-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-[var(--sp-ink)]">
                          {attr.titleRu} {attr.unit ? `(${attr.unit})` : ''}
                        </label>
                        <span className="text-[9px] text-[var(--sp-ink-tertiary)]">Для фильтра каталога</span>
                      </div>

                      {attr.type === 'select' && attr.options && attr.options.length > 0 ? (
                        <div className="space-y-1">
                          <CustomSelect
                            value={attr.options.some((o) => o.value === currentValue) ? currentValue : currentValue ? '__custom__' : ''}
                            onChange={(val) => {
                              if (val !== '__custom__') {
                                setEditingProduct({
                                  ...editingProduct,
                                  attributes: {
                                    ...(editingProduct.attributes || {}),
                                    [attr.key]: val,
                                  },
                                });
                              }
                            }}
                            options={[
                              { value: '', label: 'Не выбрано' },
                              ...attr.options.map((opt) => ({ value: opt.value, label: opt.labelRu })),
                              { value: '__custom__', label: 'Своё значение…' },
                            ]}
                            size="sm"
                            ariaLabel={attr.titleRu}
                          />

                          {(!attr.options.some((o) => o.value === currentValue) || currentValue === '__custom__') && (
                            <input
                              type="text"
                              value={currentValue === '__custom__' ? '' : currentValue}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  attributes: {
                                    ...(editingProduct.attributes || {}),
                                    [attr.key]: e.target.value,
                                  },
                                })
                              }
                              placeholder="Введите своё значение (например: 15 мкм)"
                              className="admin-control min-h-10 text-xs font-semibold text-[var(--sp-brand)]"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={currentValue}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              attributes: {
                                ...(editingProduct.attributes || {}),
                                [attr.key]: e.target.value,
                              },
                            })
                          }
                          placeholder={`Введите ${attr.titleRu.toLowerCase()}`}
                          className="admin-control min-h-10 text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Extra Custom Key-Value Attributes Adder */}
              <div className="space-y-2 border-t border-[var(--sp-line)] pt-4">
                <label className="block text-[11px] font-bold text-[var(--sp-ink)]">
                  Дополнительные характеристики
                </label>
                
                {/* List existing non-system attributes */}
                {Object.entries(editingProduct.attributes || {})
                  .filter(([k]) => !attributes.some((a) => a.key === k))
                  .map(([customKey, customVal]) => (
                    <div key={customKey} className="admin-panel-muted grid gap-2 p-3 sm:grid-cols-[10rem_minmax(0,1fr)_2.5rem] sm:items-center">
                      <span className="text-xs font-bold text-[var(--sp-ink-secondary)]">
                        {getAttributeLabel(customKey)}
                      </span>
                      <input
                        type="text"
                        value={String(customVal || '')}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            attributes: {
                              ...(editingProduct.attributes || {}),
                              [customKey]: e.target.value,
                            },
                          })
                        }
                        className="admin-control min-h-10 flex-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...(editingProduct.attributes || {}) };
                          delete updated[customKey];
                          setEditingProduct({ ...editingProduct, attributes: updated });
                        }}
                        className="admin-icon-button size-9 shrink-0 text-[var(--sp-danger)]"
                        aria-label={`Удалить характеристику ${getAttributeLabel(customKey)}`}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}

                {/* New Custom Attribute Inline Input */}
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <input
                    id="new-custom-attr-key"
                    type="text"
                    placeholder="Название, например «Плотность»"
                    className="admin-control text-xs"
                  />
                  <input
                    id="new-custom-attr-val"
                    type="text"
                    placeholder="Значение (например: 100 г/м²)"
                    className="admin-control text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const keyEl = document.getElementById('new-custom-attr-key') as HTMLInputElement;
                      const valEl = document.getElementById('new-custom-attr-val') as HTMLInputElement;
                      if (keyEl && valEl && keyEl.value.trim() && valEl.value.trim()) {
                        const cleanKey = keyEl.value.trim().toLowerCase().replace(/\s+/g, '_');
                        setEditingProduct({
                          ...editingProduct,
                          attributes: {
                            ...(editingProduct.attributes || {}),
                            [cleanKey]: valEl.value.trim(),
                          },
                        });
                        keyEl.value = '';
                        valEl.value = '';
                      }
                    }}
                    className="admin-button-primary shrink-0"
                  >
                    + Добавить
                  </button>
                </div>
              </div>
            </section>

            {saveError ? (
              <div role="alert" className="sp-alert sp-alert-danger flex items-start gap-2 text-xs">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{saveError}</span>
              </div>
            ) : null}
            </div>

            <div className="admin-modal-footer flex justify-end gap-2 px-5 py-4 md:px-7">
              <button
                type="button"
                disabled={saving}
                onClick={closeEditor}
                className="admin-button-secondary disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="admin-button-primary px-6 disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? 'Сохраняем…' : 'Сохранить товар'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
