'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import { Product, Category, Attribute, SiteSettings } from '@/types';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { AiTranslateButton } from '@/components/admin/AiTranslateButton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { ProductVariantsEditor } from '@/components/admin/ProductVariantsEditor';
import { ProductAttributeField } from '@/components/admin/ProductAttributeField';
import { ProductCmsFields } from '@/components/admin/ProductCmsFields';
import { deleteUploadedMedia, MediaUploadField } from '@/components/admin/MediaUploadField';
import { Plus, Edit, Trash2, Search, Factory, ShieldCheck, X, Check, RefreshCw, TriangleAlert, Star, FileText, Download, RotateCcw, Copy, ExternalLink, MoreHorizontal, PackageCheck, Tags, Eye, EyeOff } from 'lucide-react';
import { getMinimumOrderLabel, getOrderRuleSummary, getProductOrderRule } from '@/lib/commerce/orderQuantities';
import { getApplicableAttributes } from '@/lib/catalog/attributeApplicability';
import { getCategoryLabel, getOrderedCategories, isProductCategory } from '@/lib/catalog/categoryHierarchy';
import { createCatalogSlug } from '@/lib/catalog/catalogSlugs';
import { hasRequiredProductOrVariantAttribute } from '@/lib/catalog/productAttributeRequirements';
import { attributeValueAsText, parseEditedAttributeValue } from '@/lib/catalog/attributeValues';
import { getProductCatalogPriceText } from '@/lib/catalog/productPresentation';
import { filterAndSortAdminProducts, type AdminProductSort } from '@/lib/admin/productList';
import { trapDialogFocus } from '@/lib/admin/dialogLifecycle';
import { useUnsavedNavigationGuard } from '@/lib/admin/useUnsavedNavigationGuard';
import { getCategoryBreadcrumb, getCompactCategoryName, getProductReadiness, productStatusLabels, stockStatusLabels } from '@/lib/admin/productOperations';
import { initialSiteSettings } from '@/lib/seedData';

const PRODUCTS_PER_PAGE = 50;

function serializeProductDraft(product: Partial<Product> | null) {
  return product ? JSON.stringify(product) : '';
}

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

function formatUpdatedAt(value?: string) {
  if (!value) return 'Не указано';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Не указано';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (day === today) return `сегодня, ${time}`;
  if (day === today - 86_400_000) return `вчера, ${time}`;
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function AdminProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(initialSiteSettings);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [priceModeFilter, setPriceModeFilter] = useState('all');
  const [variantFilter, setVariantFilter] = useState('all');
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<AdminProductSort>('updated');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [quickEditDraft, setQuickEditDraft] = useState<Partial<Product>>({});
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Product | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [copyPickerQuery, setCopyPickerQuery] = useState('');
  const [bulkAction, setBulkAction] = useState<'category' | 'publish' | 'hide' | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const urlStateLoaded = useRef(false);
  const createProductButtonRef = useRef<HTMLButtonElement>(null);
  const quickEditReturnFocusRef = useRef<HTMLElement | null>(null);
  const editorReturnFocusRef = useRef<HTMLElement | null>(null);

  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editorBaseline, setEditorBaseline] = useState('');
  const hasUnsavedChanges = Boolean(editingProduct && serializeProductDraft(editingProduct) !== editorBaseline);
  const dialogStateRef = useRef({ saving, hasUnsavedChanges, editingProduct, products });
  dialogStateRef.current = { saving, hasUnsavedChanges, editingProduct, products };
  useUnsavedNavigationGuard(isModalOpen && hasUnsavedChanges, 'Перейти на другую страницу и потерять несохранённые изменения товара?');

  const showSaveError = (message: string) => {
    setSaveError(message);
    window.requestAnimationFrame(() => document.getElementById('product-save-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (urlStateLoaded.current) return;
    setSearchTerm(searchParams.get('q') || '');
    setCategoryFilter(searchParams.get('category') || '');
    setStatusFilter(searchParams.get('status') || 'all');
    setStockFilter(searchParams.get('stock') || 'all');
    setPriceModeFilter(searchParams.get('priceMode') || 'all');
    setVariantFilter(searchParams.get('variants') || 'all');
    setIssuesOnly(searchParams.get('attention') === '1');
    setSortBy((searchParams.get('sort') as AdminProductSort) || 'updated');
    setPage(Math.max(1, Number(searchParams.get('page')) || 1));
    urlStateLoaded.current = true;
    const savedScroll = Number(sessionStorage.getItem('admin-products-scroll') || 0);
    if (savedScroll > 0) window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll }));
  }, [searchParams]);

  useEffect(() => {
    if (!urlStateLoaded.current) return;
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (stockFilter !== 'all') params.set('stock', stockFilter);
    if (priceModeFilter !== 'all') params.set('priceMode', priceModeFilter);
    if (variantFilter !== 'all') params.set('variants', variantFilter);
    if (issuesOnly) params.set('attention', '1');
    if (sortBy !== 'updated') params.set('sort', sortBy);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [categoryFilter, issuesOnly, page, pathname, priceModeFilter, router, searchTerm, sortBy, statusFilter, stockFilter, variantFilter]);

  useEffect(() => {
    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = editorReturnFocusRef.current || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const fallbackFocus = createProductButtonRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      const current = dialogStateRef.current;
      if (event.key !== 'Escape' || current.saving) return;
      if (current.hasUnsavedChanges && !window.confirm('Закрыть редактор и потерять несохранённые изменения?')) return;
      const persistedProduct = current.editingProduct?.id
        ? current.products.find((product) => product.id === current.editingProduct?.id)
        : undefined;
      const persistedPaths = getManagedMediaPaths(persistedProduct);
      for (const stagedPath of getManagedMediaPaths(current.editingProduct)) {
        if (!persistedPaths.has(stagedPath)) {
          void deleteUploadedMedia(stagedPath).catch((error) => {
            console.warn('Could not remove staged product image.', error);
          });
        }
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setEditorBaseline('');
      setSaveError('');
    };
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-product-dialog-close]')?.focus());
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', closeOnEscape);
      if (previousFocus?.isConnected) previousFocus.focus();
      else fallbackFocus?.focus();
      editorReturnFocusRef.current = null;
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen || !hasUnsavedChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges, isModalOpen]);

  useEffect(() => {
    if (!quickEditProduct) return;
    const previousFocus = quickEditReturnFocusRef.current;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || quickEditSaving) return;
      setQuickEditProduct(null);
      setSaveError('');
    };
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('keydown', close);
      previousFocus?.focus();
    };
  }, [quickEditProduct, quickEditSaving]);

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const [p, c, a, settings] = await Promise.all([
        AdminRepository.getProducts(),
        AdminRepository.getCategories(),
        AdminRepository.getAttributes(),
        AdminRepository.getSettings(),
      ]);
      setProducts(p);
      setCategories(c);
      setAttributes(a);
      setSiteSettings(settings);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Не удалось загрузить каталог.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreate = () => {
    editorReturnFocusRef.current = createProductButtonRef.current;
    const firstLeaf = getOrderedCategories(categories).find((category) => isProductCategory(category.id, categories) && category.status === 'active');
    const draft: Partial<Product> = {
      titleRu: '',
      titleUz: '',
      titleEn: '',
      titleZh: '',
      slug: '',
      sku: 'SP-' + Math.floor(1000 + Math.random() * 9000),
      status: 'draft',
      categoryId: firstLeaf?.id || '',
      categorySlug: firstLeaf?.slug || '',
      shortDescriptionRu: '',
      shortDescriptionUz: '',
      shortDescriptionEn: '',
      shortDescriptionZh: '',
      descriptionRu: '',
      descriptionUz: '',
      descriptionEn: '',
      descriptionZh: '',
      mainImage: '',
      images: [],
      imagePaths: [],
      salesUnit: 'штука',
      unitCode: 'piece',
      minimumOrder: 1,
      quantityStep: 1,
      orderPackaging: {
        enabled: false,
        nameRu: 'мешок',
        nameUz: 'qop',
        nameEn: 'bag',
        nameZh: '袋',
        unitsPerPackage: 20,
        minimumPackages: 1,
        packageStep: 1,
      },
      showPrice: true,
      price: 15000,
      priceMode: 'fixed',
      currency: 'UZS',
      stockStatus: 'in_stock',
      availability: 'in_stock',
      attributes: {},
      variants: [],
      featured: false,
      ownProduction: false,
      newProduct: false,
      sortOrder: 10,
    };
    setEditingProduct(draft);
    setEditorBaseline(serializeProductDraft(draft));
    setSaveError('');
    setNotice('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    const draft: Partial<Product> = {
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
    };
    setEditingProduct(draft);
    setEditorBaseline(serializeProductDraft(draft));
    setSaveError('');
    setNotice('');
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
    if (hasUnsavedChanges && !window.confirm('Закрыть редактор и потерять несохранённые изменения?')) return;
    cleanupStagedImage();
    setIsModalOpen(false);
    setEditingProduct(null);
    setEditorBaseline('');
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

    const selectedCategory = categories.find((category) => category.id === editingProduct.categoryId);
    if (!selectedCategory || !isProductCategory(selectedCategory.id, categories)) {
      showSaveError('Выберите категорию или подкатегорию внутри группы.');
      setSaving(false);
      return;
    }
    const requiredMissing = getApplicableAttributes(attributes, selectedCategory.id, categories)
      .filter((attribute) => attribute.required)
      .filter((attribute) => {
        return !hasRequiredProductOrVariantAttribute(editingProduct, attribute.key);
      });
    if (editingProduct.status === 'published' && requiredMissing.length > 0) {
      showSaveError(`Для публикации заполните обязательные характеристики: ${requiredMissing.map((attribute) => attribute.titleRu).join(', ')}.`);
      setSaving(false);
      return;
    }

    let draft = {
      ...editingProduct,
      slug: editingProduct.slug || createCatalogSlug(editingProduct.titleRu || '', editingProduct.sku || ''),
      categorySlug: selectedCategory.slug,
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
      setEditorBaseline('');
      await loadData();
      setNotice(draft.id ? 'Товар сохранён.' : 'Новый товар создан.');
    } catch (error) {
      showSaveError(error instanceof Error ? error.message : 'Товар не сохранён. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const openProductEditor = (product: Product) => {
    sessionStorage.setItem('admin-products-scroll', String(window.scrollY));
    editorReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    handleOpenEdit(product);
  };

  const openQuickEdit = (product: Product) => {
    quickEditReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuickEditProduct(product);
    setQuickEditDraft({
      categoryId: product.categoryId,
      brandName: product.brandName || '',
      status: product.status,
      stockStatus: product.stockStatus,
      stockQuantity: product.stockQuantity,
      featured: product.featured,
      newProduct: product.newProduct,
    });
    setSaveError('');
  };

  const saveQuickEdit = async () => {
    if (!quickEditProduct) return;
    setQuickEditSaving(true);
    setSaveError('');
    try {
      const result = await AdminRepository.quickEditProduct(quickEditProduct, quickEditDraft);
      setProducts((current) => current.map((product) => product.id === result.product.id ? result.product : product));
      setQuickEditProduct(null);
      setNotice(result.message);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Не удалось сохранить изменения.');
    } finally {
      setQuickEditSaving(false);
    }
  };

  const confirmDuplicate = async (source = duplicateSource) => {
    if (!source) return;
    setDuplicating(true);
    setSaveError('');
    try {
      const result = await AdminRepository.duplicateProduct(source);
      setProducts((current) => [result.product, ...current]);
      setDuplicateSource(null);
      setCreateMenuOpen(false);
      setCopyPickerQuery('');
      setNotice(result.message);
      editorReturnFocusRef.current = createProductButtonRef.current;
      handleOpenEdit(result.product);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Не удалось создать копию.');
    } finally {
      setDuplicating(false);
    }
  };

  const selectedProducts = products.filter((product) => selectedIds.has(product.id));
  const applyBulkAction = async () => {
    if (!bulkAction || !selectedProducts.length) return;
    setBulkSaving(true);
    setSaveError('');
    try {
      const result = bulkAction === 'category'
        ? await AdminRepository.bulkMoveProducts(selectedProducts, bulkCategoryId)
        : await AdminRepository.bulkSetProductStatus(selectedProducts, bulkAction === 'publish' ? 'published' : 'hidden');
      setNotice(result.message);
      setSelectedIds(new Set());
      setBulkAction(null);
      await loadData();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Массовая операция не выполнена.');
    } finally {
      setBulkSaving(false);
    }
  };

  const filteredProducts = useMemo(() => filterAndSortAdminProducts(products, categories, {
    query: searchTerm,
    categoryId: categoryFilter || undefined,
    status: statusFilter === 'all' ? '' : statusFilter as Product['status'],
    stockStatus: stockFilter === 'all' ? '' : stockFilter as Product['stockStatus'],
    priceMode: priceModeFilter === 'all' ? '' : priceModeFilter as NonNullable<Product['priceMode']>,
    variants: variantFilter === 'all' ? '' : variantFilter as 'with' | 'without',
    issues: issuesOnly,
    attributes,
    sort: sortBy,
  }), [attributes, categoryFilter, categories, issuesOnly, priceModeFilter, products, searchTerm, sortBy, statusFilter, stockFilter, variantFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
  const editingOrderRule = editingProduct
    ? getProductOrderRule(editingProduct as Product)
    : null;
  const editingOrderSummary = editingProduct
    ? getOrderRuleSummary(editingProduct as Product)
    : '';
  const editingMediaAssets = getProductMedia(editingProduct || undefined);
  const editingCategory = categories.find((category) => category.id === editingProduct?.categoryId);
  const leafCategories = getOrderedCategories(categories).filter((category) => isProductCategory(category.id, categories));
  const applicableAttributes = getApplicableAttributes(attributes, editingProduct?.categoryId, categories);
  const inactiveStoredAttributes = attributes.filter((attribute) => (
    !applicableAttributes.some((candidate) => candidate.id === attribute.id)
    && editingProduct?.attributes?.[attribute.key] !== undefined
  ));
  const editingBrand = editingProduct?.brandName
    || (typeof editingProduct?.attributes?.brand === 'string' ? editingProduct.attributes.brand : '');
  const editingReadiness = editingProduct ? getProductReadiness(editingProduct, categories, attributes) : null;
  const pageIds = visibleProducts.map((product) => product.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const copyPickerProducts = products.filter((product) => {
    const value = copyPickerQuery.trim().toLocaleLowerCase('ru');
    if (!value) return true;
    return [product.titleRu, product.sku, getCompactCategoryName(product, categories), ...product.variants.map((variant) => variant.sku)]
      .some((entry) => entry?.toLocaleLowerCase('ru').includes(value));
  }).slice(0, 12);

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        title="Товары"
        description="Управляйте ассортиментом, ценами, упаковкой и характеристиками. Редактор открывается как отдельное рабочее пространство."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/prices" className="admin-button-secondary inline-flex items-center gap-1.5 text-xs font-semibold">
              <Tags className="size-3.5 text-[var(--sp-brand)]" aria-hidden="true" /> Массово изменить цены
            </Link>
            <a
              href="/ru/catalog/print?prices=1&lang=ru"
              target="_blank"
              rel="noreferrer"
              className="admin-button-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
              title="Сгенерировать и открыть PDF-прайс с актуальными ценами"
            >
              <FileText className="size-3.5 text-[var(--sp-brand)]" aria-hidden="true" />
              PDF с ценами
            </a>
            <a
              href="/ru/catalog/print?prices=0&lang=ru"
              target="_blank"
              rel="noreferrer"
              className="admin-button-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
              title="Сгенерировать и открыть PDF-каталог без цен (для презентаций)"
            >
              <FileText className="size-3.5 text-[var(--sp-ink-secondary)]" aria-hidden="true" />
              PDF без цен
            </a>
            <button ref={createProductButtonRef} type="button" aria-label="Добавить товар" onClick={() => setCreateMenuOpen(true)} className="admin-button-primary">
              <Plus className="size-4" aria-hidden="true" /> Новый товар
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

      {notice ? <p role="status" className="sp-alert sp-alert-success text-sm">{notice}</p> : null}
      {saveError && !isModalOpen ? <p role="alert" className="sp-alert sp-alert-danger text-sm">{saveError}</p> : null}

      <div className="admin-panel space-y-4 p-4">
        <div className="flex flex-wrap gap-2" aria-label="Быстрые представления">
          {[
            ['all', 'Все'], ['published', 'Опубликованные'], ['draft', 'Черновики'], ['attention', 'Требуют внимания'],
          ].map(([value, label]) => {
            const active = value === 'all' ? statusFilter === 'all' && !issuesOnly : value === 'attention' ? issuesOnly : statusFilter === value && !issuesOnly;
            return <button key={value} type="button" aria-pressed={active} onClick={() => { setIssuesOnly(value === 'attention'); setStatusFilter(value === 'published' || value === 'draft' ? value : 'all'); setPage(1); }} className={`min-h-9 rounded-[var(--sp-radius-control)] px-3 text-xs font-semibold transition-colors ${active ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'bg-[var(--sp-surface-inset)] text-[var(--sp-ink-secondary)] hover:text-[var(--sp-brand)]'}`}>{label}</button>;
          })}
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(18rem,1.7fr)_repeat(3,minmax(10rem,1fr))_auto]">
        <div className="relative min-w-0">
          <Search className="absolute left-3 top-3.5 size-4 text-[var(--sp-ink-muted)]" aria-hidden="true" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            placeholder="Название, SKU, SKU варианта или бренд…"
            className="admin-control pl-9 pr-3 text-xs"
          />
        </div>
        <CustomSelect ariaLabel="Фильтр по категории" value={categoryFilter} onChange={(value) => { setCategoryFilter(value); setPage(1); }} options={[
          { value: '', label: 'Все категории' },
          ...getOrderedCategories(categories).map((category) => ({ value: category.id, label: getCategoryLabel(category.id, categories) })),
        ]} />
        <CustomSelect ariaLabel="Фильтр по публикации" value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1); }} options={[
          { value: 'all', label: 'Все публикации' }, { value: 'published', label: 'Опубликованные' },
          { value: 'draft', label: 'Черновики' }, { value: 'hidden', label: 'Скрытые' }, { value: 'archived', label: 'Архив' },
        ]} />
        <CustomSelect ariaLabel="Фильтр по наличию" value={stockFilter} onChange={(value) => { setStockFilter(value); setPage(1); }} options={[
          { value: 'all', label: 'Любое наличие' }, { value: 'in_stock', label: 'В наличии' },
          { value: 'out_of_stock', label: 'Нет в наличии' }, { value: 'on_order', label: 'Под заказ' },
          { value: 'temporarily_unavailable', label: 'Временно недоступны' }, { value: 'discontinued', label: 'Сняты с ассортимента' },
        ]} />
        <CustomSelect ariaLabel="Фильтр по режиму цены" value={priceModeFilter} onChange={(value) => { setPriceModeFilter(value); setPage(1); }} options={[
          { value: 'all', label: 'Любой режим цены' }, { value: 'fixed', label: 'Фиксированная цена' },
          { value: 'from', label: 'Цена от' }, { value: 'request', label: 'Цена по запросу' }, { value: 'informational', label: 'Информационный' },
        ]} />
        <button type="button" onClick={() => { setSearchTerm(''); setCategoryFilter(''); setStatusFilter('all'); setStockFilter('all'); setPriceModeFilter('all'); setVariantFilter('all'); setIssuesOnly(false); setSortBy('updated'); setPage(1); }} className="admin-button-secondary justify-center" title="Сбросить поиск и фильтры">
          <RotateCcw className="size-4" aria-hidden="true" /> Сбросить
        </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_auto]">
        <CustomSelect ariaLabel="Фильтр по вариантам" value={variantFilter} onChange={(value) => { setVariantFilter(value); setPage(1); }} options={[
          { value: 'all', label: 'С вариантами и без' }, { value: 'with', label: 'Есть варианты' }, { value: 'without', label: 'Без вариантов' },
        ]} />
        <CustomSelect ariaLabel="Сортировка товаров" value={sortBy} onChange={(value) => { setSortBy(value as AdminProductSort); setPage(1); }} options={[
          { value: 'catalog', label: 'Порядок каталога' }, { value: 'updated', label: 'Недавно изменённые' },
          { value: 'name', label: 'По названию' }, { value: 'sku', label: 'По SKU' }, { value: 'category', label: 'По категории' },
          { value: 'price_asc', label: 'Цена: сначала ниже' }, { value: 'price_desc', label: 'Цена: сначала выше' },
        ]} />
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] px-3 text-xs font-semibold text-[var(--sp-ink-secondary)]"><input type="checkbox" checked={issuesOnly} onChange={(event) => { setIssuesOnly(event.target.checked); setPage(1); }} className="size-4 accent-[var(--sp-brand)]" />Только требующие внимания</label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[var(--sp-ink-secondary)]">Показано <strong className="text-[var(--sp-ink)]">{filteredProducts.length}</strong> из {products.length}</span>
          {filteredProducts.length > PRODUCTS_PER_PAGE ? <span className="font-semibold text-[var(--sp-brand)]">Страница {currentPage} из {totalPages}</span> : null}
        </div>
      </div>

      {/* Products Table */}
      <div className="admin-table-wrap">
        {loading ? (
          <div className="p-8 text-center text-xs text-[var(--sp-ink-tertiary)]">Загрузка товаров...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="admin-table-head font-bold">
                <tr>
                  <th className="w-11 p-3.5"><input type="checkbox" aria-label="Выбрать все товары на странице" checked={allPageSelected} onChange={(event) => setSelectedIds((current) => { const next = new Set(current); pageIds.forEach((id) => event.target.checked ? next.add(id) : next.delete(id)); return next; })} className="size-4 accent-[var(--sp-brand)]" /></th>
                  <th className="p-3.5">Товар</th>
                  <th className="p-3.5">Категория</th>
                  <th className="p-3.5">Цена</th>
                  <th className="p-3.5">Наличие</th>
                  <th className="p-3.5">Публикация</th>
                  <th className="p-3.5">Варианты</th>
                  <th className="p-3.5">Изменён</th>
                  <th className="p-3.5 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--sp-line-soft)]">
                {visibleProducts.map((p) => {
                  const orderSummary = getMinimumOrderLabel(p);
                  const readiness = getProductReadiness(p, categories, attributes);
                  return (
                    <tr key={p.id} className={`transition-colors hover:bg-[var(--sp-surface-inset)] ${selectedIds.has(p.id) ? 'bg-[color-mix(in_srgb,var(--sp-brand)_7%,var(--sp-surface))]' : ''}`}>
                      <td className="p-3.5"><input type="checkbox" aria-label={`Выбрать ${p.titleRu}`} checked={selectedIds.has(p.id)} onChange={(event) => setSelectedIds((current) => { const next = new Set(current); event.target.checked ? next.add(p.id) : next.delete(p.id); return next; })} className="size-4 accent-[var(--sp-brand)]" /></td>
                      <td className="p-3.5">
                        <div className="flex min-w-64 items-center gap-3">
                          {p.mainImage ? <Image src={p.mainImage} alt="" width={48} height={48} className="size-12 shrink-0 rounded-[var(--sp-radius-sm)] border border-[var(--sp-line)] bg-[var(--sp-surface)] object-contain p-1" /> : <span className="flex size-12 shrink-0 items-center justify-center rounded-[var(--sp-radius-sm)] border border-dashed border-[var(--sp-line)] bg-[var(--sp-surface-inset)] text-[9px] text-[var(--sp-ink-tertiary)]">Нет фото</span>}
                          <span className="min-w-0"><button type="button" onClick={() => openProductEditor(p)} className="block max-w-72 truncate text-left font-bold text-[var(--sp-ink)] hover:text-[var(--sp-brand)] hover:underline">{p.titleRu}</button><span className="mt-0.5 block font-mono text-[10px] text-[var(--sp-ink-tertiary)]">{p.sku || 'SKU не указан'}</span>{readiness.issues.length ? <button type="button" onClick={() => { setIssuesOnly(true); setPage(1); }} className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${readiness.blockers.length ? 'text-[var(--sp-danger)]' : 'text-amber-700'}`} title={readiness.issues.map((issue) => issue.label).join('\n')}><TriangleAlert className="size-3" />Нужно проверить: {readiness.issues.length}</button> : <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><Check className="size-3" />Карточка и SEO готовы</span>}</span>
                        </div>
                      </td>
                      <td className="max-w-48 p-3.5 font-semibold text-[var(--sp-ink-secondary)]" title={getCategoryBreadcrumb(p, categories)}>
                        <span className="block truncate">{getCompactCategoryName(p, categories)}</span>
                        <Link href="/admin/categories" className="mt-1 inline-block text-[10px] font-normal text-[var(--sp-brand)] hover:underline">Управление категориями</Link>
                      </td>
                      <td className="p-3.5 font-bold text-[var(--sp-brand)]">
                        {getProductCatalogPriceText(p, 'ru')}
                        <span className="block text-[10px] font-normal text-[var(--sp-ink-tertiary)]">
                          {orderSummary}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold ${p.stockStatus === 'in_stock' ? 'bg-emerald-100 text-emerald-800' : p.stockStatus === 'out_of_stock' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{stockStatusLabels[p.stockStatus]}</span>
                        {typeof p.stockQuantity === 'number' ? <span className="mt-1 block text-[10px] text-[var(--sp-ink-tertiary)]">Остаток: {p.stockQuantity}</span> : null}
                      </td>
                      <td className="p-3.5"><span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold ${p.status === 'published' ? 'bg-emerald-100 text-emerald-800' : p.status === 'draft' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800'}`}>{productStatusLabels[p.status]}</span></td>
                      <td className="p-3.5"><span className="font-semibold tabular-nums text-[var(--sp-ink)]">{p.variants?.length || 0}</span><span className="mt-1 block text-[10px] text-[var(--sp-ink-tertiary)]">{p.variants?.length ? 'вариантов' : 'базовый товар'}</span></td>
                      <td className="p-3.5 text-[var(--sp-ink-secondary)]"><span title={p.updatedAt ? new Date(p.updatedAt).toLocaleString('ru-RU') : ''}>{formatUpdatedAt(p.updatedAt)}</span></td>
                      <td className="p-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => openProductEditor(p)} className="admin-icon-button size-9" title="Открыть товар" aria-label={`Открыть ${p.titleRu}`}><Edit className="size-4" /></button>
                        <button type="button" onClick={() => openQuickEdit(p)} className="admin-icon-button size-9" title="Быстро изменить" aria-label={`Быстро изменить ${p.titleRu}`}><PackageCheck className="size-4" /></button>
                        <details className="relative"><summary className="admin-icon-button flex size-9 cursor-pointer list-none items-center justify-center" aria-label={`Другие действия с ${p.titleRu}`}><MoreHorizontal className="size-4" /></summary><div className="absolute right-0 z-30 mt-1 w-52 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-1.5 text-left shadow-lg"><a href={`/ru/product/${p.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)]"><ExternalLink className="size-3.5" />Открыть на сайте</a><button type="button" onClick={() => setDuplicateSource(p)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)]"><Copy className="size-3.5" />Создать копию</button><button type="button" onClick={() => handleDelete(p.id)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-[var(--sp-danger)] hover:bg-red-500/8"><Trash2 className="size-3.5" />Удалить</button></div></details>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visibleProducts.length === 0 ? <div className="border-t border-[var(--sp-line-soft)] p-10 text-center text-sm text-[var(--sp-ink-tertiary)]">По заданным условиям товары не найдены.</div> : null}
          </div>
        )}
      </div>

      {filteredProducts.length > PRODUCTS_PER_PAGE ? (
        <nav aria-label="Пагинация товаров" className="admin-panel flex items-center justify-between gap-3 p-3">
          <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="admin-button-secondary disabled:opacity-40">Назад</button>
          <span className="text-xs font-semibold text-[var(--sp-ink-secondary)]">{(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} из {filteredProducts.length}</span>
          <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="admin-button-secondary disabled:opacity-40">Дальше</button>
        </nav>
      ) : null}

      {selectedProducts.length ? (
        <div className="sticky bottom-4 z-30 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 py-3 shadow-xl" role="region" aria-label="Массовые действия">
          <div><strong className="text-sm text-[var(--sp-ink)]">Выбрано: {selectedProducts.length}</strong><button type="button" onClick={() => setSelectedIds(new Set())} className="ml-3 text-xs font-semibold text-[var(--sp-brand)] hover:underline">Снять выбор</button></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setBulkCategoryId(''); setBulkAction('category'); }} className="admin-button-secondary"><Tags className="size-4" />Изменить категорию</button><button type="button" onClick={() => setBulkAction('publish')} className="admin-button-secondary"><Eye className="size-4" />Опубликовать</button><button type="button" onClick={() => setBulkAction('hide')} className="admin-button-secondary"><EyeOff className="size-4" />Скрыть</button></div>
        </div>
      ) : null}

      {quickEditProduct ? (
        <div className="admin-modal-backdrop justify-end p-0" role="dialog" aria-modal="true" aria-label={`Быстро изменить ${quickEditProduct.titleRu}`}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-[var(--sp-surface)] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--sp-line)] bg-[var(--sp-surface)] px-5 py-4"><div><h2 className="text-lg font-bold text-[var(--sp-ink)]">Быстро изменить</h2><p className="mt-1 text-xs text-[var(--sp-ink-secondary)]">{quickEditProduct.titleRu} · {quickEditProduct.sku || 'SKU не указан'}</p></div><button type="button" onClick={() => { setQuickEditProduct(null); setSaveError(''); }} className="admin-icon-button" aria-label="Закрыть"><X className="size-5" /></button></div>
            <div className="space-y-5 p-5">
              <label className="block text-xs font-bold text-[var(--sp-ink)]">Категория<CustomSelect ariaLabel="Категория товара" value={String(quickEditDraft.categoryId || '')} onChange={(value) => setQuickEditDraft((current) => ({ ...current, categoryId: value }))} options={leafCategories.filter((category) => category.status === 'active').map((category) => ({ value: category.id, label: getCategoryLabel(category.id, categories) }))} /></label>
              <label className="block text-xs font-bold text-[var(--sp-ink)]">Бренд<input autoFocus type="text" value={quickEditDraft.brandName || ''} onChange={(event) => setQuickEditDraft((current) => ({ ...current, brandName: event.target.value }))} className="admin-control mt-1.5 font-normal" /></label>
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-[var(--sp-ink)]">Публикация<select value={quickEditDraft.status || 'draft'} onChange={(event) => setQuickEditDraft((current) => ({ ...current, status: event.target.value as Product['status'] }))} className="admin-control mt-1.5 font-normal"><option value="published">Опубликован</option><option value="draft">Черновик</option><option value="hidden">Скрыт</option><option value="archived">В архиве</option></select></label><label className="text-xs font-bold text-[var(--sp-ink)]">Наличие<select value={quickEditDraft.stockStatus || 'in_stock'} onChange={(event) => setQuickEditDraft((current) => ({ ...current, stockStatus: event.target.value as Product['stockStatus'] }))} className="admin-control mt-1.5 font-normal"><option value="in_stock">В наличии</option><option value="on_order">Под заказ</option><option value="out_of_stock">Нет в наличии</option><option value="temporarily_unavailable">Временно недоступен</option><option value="discontinued">Снят с ассортимента</option></select></label></div>
              <label className="block text-xs font-bold text-[var(--sp-ink)]">Остаток<input type="number" min="0" value={quickEditDraft.stockQuantity ?? ''} onChange={(event) => setQuickEditDraft((current) => ({ ...current, stockQuantity: event.target.value === '' ? undefined : Number(event.target.value) }))} className="admin-control mt-1.5 font-normal" /></label>
              <fieldset className="space-y-3 rounded-[var(--sp-radius-sm)] bg-[var(--sp-surface-inset)] p-4"><legend className="px-1 text-xs font-bold text-[var(--sp-ink)]">Размещение</legend>{([['featured', 'Популярное на главной'], ['newProduct', 'Новинка']] as const).map(([field, label]) => <label key={field} className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--sp-ink-secondary)]"><input type="checkbox" checked={Boolean(quickEditDraft[field])} onChange={(event) => setQuickEditDraft((current) => ({ ...current, [field]: event.target.checked }))} className="size-4 accent-[var(--sp-brand)]" />{label}</label>)}</fieldset>
              <div className="rounded-[var(--sp-radius-sm)] border border-[var(--sp-line)] p-4"><span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--sp-ink-tertiary)]">Цена</span><p className="mt-1 text-sm font-bold text-[var(--sp-brand)]">{getProductCatalogPriceText(quickEditProduct, 'ru')}</p><Link href="/admin/prices" className="mt-2 inline-block text-xs font-semibold text-[var(--sp-brand)] hover:underline">Изменить цену в Price Manager</Link></div>
              {saveError ? <p role="alert" className="sp-alert sp-alert-danger text-xs">{saveError}</p> : null}
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--sp-line)] bg-[var(--sp-surface)] px-5 py-4"><button type="button" disabled={quickEditSaving} onClick={() => { setQuickEditProduct(null); setSaveError(''); }} className="admin-button-secondary">Отмена</button><button type="button" disabled={quickEditSaving} onClick={() => void saveQuickEdit()} className="admin-button-primary disabled:opacity-50">{quickEditSaving ? 'Сохраняем…' : 'Сохранить'}</button></div>
          </div>
        </div>
      ) : null}

      {duplicateSource ? (
        <div className="admin-modal-backdrop p-4" role="dialog" aria-modal="true" aria-label="Создать копию товара"><div className="admin-modal-card max-w-lg p-6"><h2 className="text-lg font-bold text-[var(--sp-ink)]">Создать черновик на основе товара?</h2><p className="mt-3 text-sm leading-6 text-[var(--sp-ink-secondary)]">Категория, характеристики, правила заказа, варианты и ссылки на изображения будут скопированы из «{duplicateSource.titleRu}». SKU товара и вариантов необходимо указать заново.</p>{saveError ? <p role="alert" className="sp-alert sp-alert-danger mt-4 text-xs">{saveError}</p> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={duplicating} onClick={() => { setDuplicateSource(null); setSaveError(''); }} className="admin-button-secondary">Отмена</button><button type="button" disabled={duplicating} onClick={() => void confirmDuplicate()} className="admin-button-primary"><Copy className="size-4" />{duplicating ? 'Создаём…' : 'Создать черновик'}</button></div></div></div>
      ) : null}

      {createMenuOpen ? (
        <div className="admin-modal-backdrop p-4" role="dialog" aria-modal="true" aria-label="Новый товар"><div className="admin-modal-card max-w-2xl p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-[var(--sp-ink)]">Новый товар</h2><p className="mt-1 text-sm text-[var(--sp-ink-secondary)]">Создайте пустую карточку или используйте существующий товар как безопасную основу.</p></div><button type="button" onClick={() => setCreateMenuOpen(false)} className="admin-icon-button" aria-label="Закрыть"><X className="size-5" /></button></div><button type="button" onClick={() => { setCreateMenuOpen(false); handleOpenCreate(); }} className="mt-5 flex w-full items-center justify-between rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] p-4 text-left hover:border-[var(--sp-brand)]"><span><strong className="block text-sm text-[var(--sp-ink)]">Создать с нуля</strong><span className="mt-1 block text-xs text-[var(--sp-ink-secondary)]">Пустая карточка с базовыми настройками.</span></span><Plus className="size-5 text-[var(--sp-brand)]" /></button><div className="mt-5 border-t border-[var(--sp-line)] pt-5"><label className="text-xs font-bold text-[var(--sp-ink)]">Создать на основе существующего<input type="search" value={copyPickerQuery} onChange={(event) => setCopyPickerQuery(event.target.value)} placeholder="Название, SKU, SKU варианта или категория…" className="admin-control mt-2 font-normal" /></label><div className="mt-3 max-h-72 divide-y divide-[var(--sp-line-soft)] overflow-y-auto rounded-[var(--sp-radius-sm)] border border-[var(--sp-line)]">{copyPickerProducts.map((product) => <button key={product.id} type="button" onClick={() => { setCreateMenuOpen(false); setDuplicateSource(product); }} className="flex w-full items-center gap-3 p-3 text-left hover:bg-[var(--sp-surface-inset)]">{product.mainImage ? <Image src={product.mainImage} alt="" width={40} height={40} className="size-10 rounded-md object-contain" /> : <span className="flex size-10 items-center justify-center rounded-md bg-[var(--sp-surface-inset)] text-[9px]">Нет фото</span>}<span className="min-w-0"><strong className="block truncate text-xs text-[var(--sp-ink)]">{product.titleRu}</strong><span className="mt-0.5 block truncate text-[10px] text-[var(--sp-ink-tertiary)]">{product.sku || 'SKU не указан'} · {getCompactCategoryName(product, categories)}</span></span></button>)}</div></div></div></div>
      ) : null}

      {bulkAction ? (
        <div className="admin-modal-backdrop p-4" role="dialog" aria-modal="true" aria-label="Подтверждение массовой операции"><div className="admin-modal-card max-w-2xl p-6"><h2 className="text-lg font-bold text-[var(--sp-ink)]">{bulkAction === 'category' ? 'Изменить категорию' : bulkAction === 'publish' ? 'Опубликовать товары' : 'Скрыть товары'}</h2><p className="mt-2 text-sm text-[var(--sp-ink-secondary)]">Будет обновлено товаров: <strong>{selectedProducts.length}</strong>. Операция выполняется целиком: при конфликте или проблеме ни один товар не изменится.</p>{bulkAction === 'category' ? <div className="mt-5"><CustomSelect ariaLabel="Новая категория" value={bulkCategoryId} onChange={setBulkCategoryId} options={[{ value: '', label: 'Выберите категорию' }, ...leafCategories.filter((category) => category.status === 'active').map((category) => ({ value: category.id, label: getCategoryLabel(category.id, categories) }))]} /><div className="mt-4 max-h-48 overflow-y-auto rounded-[var(--sp-radius-sm)] bg-[var(--sp-surface-inset)] p-3 text-xs">{selectedProducts.slice(0, 12).map((product) => <p key={product.id} className="py-1 text-[var(--sp-ink-secondary)]"><strong className="text-[var(--sp-ink)]">{product.titleRu}</strong>: {getCompactCategoryName(product, categories)} → {categories.find((category) => category.id === bulkCategoryId)?.titleRu || 'новая категория'}</p>)}</div></div> : bulkAction === 'publish' ? <div className="mt-4 space-y-2">{selectedProducts.filter((product) => !getProductReadiness(product, categories, attributes).readyToPublish).map((product) => <p key={product.id} className="sp-alert sp-alert-warning text-xs"><strong>{product.titleRu}:</strong> {getProductReadiness(product, categories, attributes).blockers.map((issue) => issue.label).join(', ')}</p>)}</div> : null}{saveError ? <p role="alert" className="sp-alert sp-alert-danger mt-4 text-xs">{saveError}</p> : null}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={bulkSaving} onClick={() => { setBulkAction(null); setSaveError(''); }} className="admin-button-secondary">Отмена</button><button type="button" disabled={bulkSaving || (bulkAction === 'category' && !bulkCategoryId) || (bulkAction === 'publish' && selectedProducts.some((product) => !getProductReadiness(product, categories, attributes).readyToPublish))} onClick={() => void applyBulkAction()} className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-50">{bulkSaving ? 'Применяем…' : 'Применить'}</button></div></div></div>
      ) : null}

      {/* Product Edit / Create Modal */}
      {isModalOpen && editingProduct && (
        <div className="admin-modal-backdrop p-0 md:p-4" role="dialog" aria-modal="true" aria-label={editingProduct.id ? 'Редактирование товара' : 'Новый товар'} onKeyDown={trapDialogFocus}>
          <form
            onSubmit={handleSave}
            className="admin-modal-card mx-auto md:my-0 md:max-w-6xl text-xs"
          >
            <div className="admin-modal-header flex items-center justify-between gap-4 px-5 py-4 md:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sp-brand)]">Каталог</p>
                <h3 className="mt-1 text-lg font-bold text-[var(--sp-ink)]">
                  {editingProduct.id ? (editingProduct.titleRu || 'Редактирование товара') : 'Новый товар'}
                </h3>
                <p className="mt-1 text-[11px] text-[var(--sp-ink-tertiary)]">{editingProduct.sku || 'SKU не указан'}{editingCategory ? ` · ${editingCategory.titleRu}` : ''} · {productStatusLabels[(editingProduct.status || 'draft') as Product['status']]}</p>
                {hasUnsavedChanges ? <p className="mt-1 text-[11px] font-semibold text-amber-700">Есть несохранённые изменения</p> : null}
              </div>
              <div className="flex items-center gap-2">{editingProduct.id && editingProduct.slug ? <a href={`/ru/product/${editingProduct.slug}`} target="_blank" rel="noreferrer" className="admin-button-secondary hidden sm:inline-flex"><ExternalLink className="size-4" />На сайте</a> : null}{editingProduct.id ? <button type="button" onClick={() => { const source = products.find((product) => product.id === editingProduct.id); if (source) { closeEditor(); setDuplicateSource(source); } }} className="admin-button-secondary hidden sm:inline-flex"><Copy className="size-4" />Копия</button> : null}<button
                data-product-dialog-close
                type="button"
                onClick={closeEditor}
                className="admin-icon-button shrink-0"
                aria-label="Закрыть редактор"
              >
                <X className="size-5" />
              </button></div>
            </div>

            <div className="admin-modal-body space-y-7 bg-[var(--sp-canvas)] px-5 py-6 md:px-7">
            <nav aria-label="Разделы товара" className="sticky top-0 z-20 -mx-1 flex gap-2 overflow-x-auto rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[color-mix(in_srgb,var(--sp-surface)_96%,transparent)] p-2 shadow-sm backdrop-blur">
              {[
                ['product-main', 'Основное'], ['product-order', 'Цена и заказ'], ['product-variants', 'Варианты'],
                ['product-relations', 'Связи'], ['product-seo', 'SEO'], ['product-description', 'Описание'], ['product-attributes', 'Характеристики'],
              ].map(([href, label]) => <a key={href} href={`#${href}`} className="shrink-0 rounded-[var(--sp-radius-control-inner)] px-3 py-2 text-[11px] font-semibold text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)]">{label}</a>)}
            </nav>
            {editingReadiness?.issues.length ? <section className="admin-panel p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[var(--sp-ink)]">Нужно проверить: {editingReadiness.issues.length}</strong><span className={`rounded px-2 py-1 text-[10px] font-bold ${editingReadiness.readyToPublish ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{editingReadiness.readyToPublish ? 'Рекомендации' : 'Есть блокеры публикации'}</span></div><ul className="mt-3 grid gap-2 text-xs text-[var(--sp-ink-secondary)] sm:grid-cols-2">{editingReadiness.issues.map((issue) => <li key={issue.code} className="flex items-start gap-2"><TriangleAlert className={`mt-0.5 size-3.5 shrink-0 ${issue.severity === 'blocker' ? 'text-[var(--sp-danger)]' : 'text-amber-700'}`} /><span>{issue.label}</span></li>)}</ul></section> : null}
            <section id="product-main" className="admin-panel scroll-mt-20 p-5 md:p-6">
              <h4 className="admin-section-heading">Основная информация</h4>
              <p className="admin-section-description">Название, артикул, категория, цена и изображение, которые определяют товар в каталоге.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="font-bold block mb-1">Название (RU) *</label>
                <input
                  type="text"
                  aria-label="Название (RU) *"
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
                  aria-label="Название (UZ) *"
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
                  aria-label="Название (EN)"
                  value={editingProduct.titleEn || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, titleEn: e.target.value })}
                  className="admin-control text-sm"
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Название (ZH)</label>
                <input
                  type="text"
                  aria-label="Название (ZH)"
                  value={editingProduct.titleZh || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, titleZh: e.target.value })}
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
                <label className="font-bold block mb-1">URL (slug)</label>
                <input
                  type="text"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  value={editingProduct.slug || ''}
                  onChange={(event) => setEditingProduct({ ...editingProduct, slug: event.target.value.toLowerCase() })}
                  onBlur={() => {
                    if (!editingProduct.slug) setEditingProduct({ ...editingProduct, slug: createCatalogSlug(editingProduct.titleRu || '', editingProduct.sku || '') });
                  }}
                  className="admin-control font-mono text-sm"
                />
                {getPersistedProduct() && getPersistedProduct()?.slug !== editingProduct.slug ? <span className="mt-1 block text-[11px] font-normal text-amber-700">Изменение URL повлияет на canonical и внешние ссылки. Redirect автоматически не создаётся.</span> : null}
              </div>

              <div>
                <label className="font-bold block mb-1">Бренд</label>
                <input type="text" value={editingProduct.brandName || ''} onChange={(event) => setEditingProduct({ ...editingProduct, brandName: event.target.value })} className="admin-control text-sm" />
              </div>

              <div>
                <CustomSelect
                  label="Категория *"
                  value={editingProduct.categoryId || ''}
                  onChange={(val) => {
                    const category = categories.find((candidate) => candidate.id === val);
                    setEditingProduct({ ...editingProduct, categoryId: val, categorySlug: category?.slug || '' });
                  }}
                  options={leafCategories.map((category) => ({ value: category.id, label: getCategoryLabel(category.id, categories) }))}
                />
              </div>

              <div>
                <CustomSelect label="Публикация" value={editingProduct.status || 'draft'} onChange={(value) => setEditingProduct({ ...editingProduct, status: value as Product['status'] })} options={[
                  { value: 'draft', label: 'Черновик' },
                  { value: 'published', label: 'Опубликован' },
                  { value: 'hidden', label: 'Скрыт' },
                  { value: 'archived', label: 'В архиве' },
                ]} />
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
                    { value: 'temporarily_unavailable', label: 'Временно недоступен' },
                    { value: 'discontinued', label: 'Снят с ассортимента' },
                  ]}
                />
              </div>

              <label className="font-bold text-[var(--sp-ink)]">Порядок товара
                <input type="number" min="0" value={editingProduct.sortOrder ?? 0} onChange={(event) => setEditingProduct({ ...editingProduct, sortOrder: Number(event.target.value) || 0 })} className="admin-control mt-1.5 font-normal" />
              </label>
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

            <section id="product-order" className="admin-panel scroll-mt-20 space-y-4 p-5 md:p-6">
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

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div><CustomSelect label="Режим цены" value={editingProduct.priceMode || 'fixed'} onChange={(value) => setEditingProduct({ ...editingProduct, priceMode: value as Product['priceMode'] })} options={[
                  { value: 'fixed', label: 'Фиксированная цена' },
                  { value: 'from', label: 'Цена от' },
                  { value: 'request', label: 'Цена по запросу' },
                  { value: 'informational', label: 'Информационная позиция' },
                ]} /></div>
                <label className="font-bold text-[var(--sp-ink)]">Старая цена
                  <input type="number" min="0" value={editingProduct.oldPrice ?? ''} onChange={(event) => setEditingProduct({ ...editingProduct, oldPrice: event.target.value ? Number(event.target.value) : undefined })} className="admin-control mt-1.5 font-normal" />
                </label>
                <label className="font-bold text-[var(--sp-ink)]">Валюта
                  <input type="text" required value={editingProduct.currency || 'UZS'} onChange={(event) => setEditingProduct({ ...editingProduct, currency: event.target.value.toUpperCase() })} className="admin-control mt-1.5 font-normal" />
                </label>
                <label className="admin-panel-muted flex min-h-16 cursor-pointer items-center justify-between gap-3 p-3">
                  <span className="font-bold text-[var(--sp-ink)]">Показывать цену</span>
                  <input type="checkbox" checked={editingProduct.showPrice ?? true} onChange={(event) => setEditingProduct({ ...editingProduct, showPrice: event.target.checked })} className="size-4 accent-[var(--sp-brand)]" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

                <div><CustomSelect label="Каноническая единица" value={editingProduct.unitCode || 'custom'} onChange={(value) => setEditingProduct({ ...editingProduct, unitCode: value as Product['unitCode'] })} options={[
                  { value: 'piece', label: 'Штука' }, { value: 'pack', label: 'Упаковка' }, { value: 'roll', label: 'Рулон' },
                  { value: 'box', label: 'Коробка / ящик' }, { value: 'set', label: 'Набор' }, { value: 'kilogram', label: 'Килограмм' },
                  { value: 'gram', label: 'Грамм' }, { value: 'liter', label: 'Литр' }, { value: 'milliliter', label: 'Миллилитр' },
                  { value: 'meter', label: 'Метр' }, { value: 'square_meter', label: 'Квадратный метр' }, { value: 'service', label: 'Услуга' },
                  { value: 'custom', label: 'Другая' },
                ]} /></div>

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

                <label className="font-bold text-[var(--sp-ink)]">Максимум, единиц
                  <input type="number" min="0.001" step="any" value={editingProduct.maximumOrder ?? ''} onChange={(event) => setEditingProduct({ ...editingProduct, maximumOrder: event.target.value ? Number(event.target.value) : undefined })} className="admin-control mt-1.5 font-normal" />
                </label>

                <label className="font-bold text-[var(--sp-ink)]">Остаток, единиц
                  <input type="number" min="0" step="any" value={editingProduct.stockQuantity ?? ''} onChange={(event) => setEditingProduct({ ...editingProduct, stockQuantity: event.target.value ? Number(event.target.value) : undefined })} className="admin-control mt-1.5 font-normal" />
                </label>

                <label className="admin-panel-muted flex min-h-16 cursor-pointer items-center justify-between gap-3 p-3">
                  <span><strong className="block text-xs text-[var(--sp-ink)]">Переменный вес</strong><span className="mt-1 block text-[10px] text-[var(--sp-ink-tertiary)]">Итог зависит от фактического веса.</span></span>
                  <input type="checkbox" checked={editingProduct.catchWeight ?? false} onChange={(event) => setEditingProduct({ ...editingProduct, catchWeight: event.target.checked })} className="size-4 accent-[var(--sp-brand)]" />
                </label>
              </div>

              <div className="rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-[var(--sp-ink)]">Сравнимая цена за физическую единицу</h5>
                    <p className="mt-1 max-w-2xl text-[10px] leading-4 text-[var(--sp-ink-secondary)]">
                      Не меняет цену позиции и правила заказа. Например: упаковка 2 кг стоит 66 000 сум, а покупатель дополнительно видит 33 000 сум / кг.
                    </p>
                  </div>
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--sp-ink)]">
                    <input
                      type="checkbox"
                      checked={Boolean(editingProduct.unitPricing)}
                      onChange={(event) => setEditingProduct({
                        ...editingProduct,
                        catalogPriceBasis: event.target.checked ? editingProduct.catalogPriceBasis || 'sale' : 'sale',
                        unitPricing: event.target.checked
                          ? { quantity: 1, unit: 'kilogram', displayUnit: 'kilogram' }
                          : undefined,
                      })}
                      className="size-4 accent-[var(--sp-brand)]"
                    />
                    Настроить
                  </label>
                </div>

                {editingProduct.unitPricing ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="font-bold text-[var(--sp-ink)]">Количество содержимого
                      <input type="number" min="0.001" step="any" value={editingProduct.unitPricing.quantity} onChange={(event) => setEditingProduct({ ...editingProduct, unitPricing: { ...editingProduct.unitPricing!, quantity: Math.max(0.001, Number(event.target.value) || 1) } })} className="admin-control mt-1.5 font-normal" />
                    </label>
                    <div><CustomSelect label="Единица содержимого" value={editingProduct.unitPricing.unit} onChange={(value) => setEditingProduct({ ...editingProduct, unitPricing: { ...editingProduct.unitPricing!, unit: value as NonNullable<Product['unitPricing']>['unit'] } })} options={[
                      { value: 'gram', label: 'Грамм' }, { value: 'kilogram', label: 'Килограмм' }, { value: 'milliliter', label: 'Миллилитр' }, { value: 'liter', label: 'Литр' }, { value: 'piece', label: 'Штука' }, { value: 'meter', label: 'Метр' }, { value: 'square_meter', label: 'Квадратный метр' },
                    ]} /></div>
                    <div><CustomSelect label="Показывать цену за" value={editingProduct.unitPricing.displayUnit || editingProduct.unitPricing.unit} onChange={(value) => setEditingProduct({ ...editingProduct, unitPricing: { ...editingProduct.unitPricing!, displayUnit: value as NonNullable<Product['unitPricing']>['unit'] } })} options={[
                      { value: 'gram', label: 'Грамм' }, { value: 'kilogram', label: 'Килограмм' }, { value: 'milliliter', label: 'Миллилитр' }, { value: 'liter', label: 'Литр' }, { value: 'piece', label: 'Штуку' }, { value: 'meter', label: 'Метр' }, { value: 'square_meter', label: 'Квадратный метр' },
                    ]} /></div>
                    <div><CustomSelect label="Главная цена в каталоге" value={editingProduct.catalogPriceBasis || 'sale'} onChange={(value) => setEditingProduct({ ...editingProduct, catalogPriceBasis: value as Product['catalogPriceBasis'] })} options={[
                      { value: 'sale', label: 'Цена продаваемой позиции' },
                      { value: 'comparison', label: 'Сравнимая цена' },
                    ]} /></div>
                  </div>
                ) : null}
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
                      nameZh: editingProduct.orderPackaging?.nameZh || '袋',
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
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {(['Ru', 'Uz', 'En', 'Zh'] as const).map((suffix) => {
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

            <div id="product-variants" className="scroll-mt-20"><ProductVariantsEditor
              key={editingProduct.id || 'new-product'}
              initialVariants={editingProduct.variants || []}
              attributes={applicableAttributes}
              currency={editingProduct.currency || 'UZS'}
              onChange={(variants) => setEditingProduct((current) => current ? { ...current, variants } : current)}
            /></div>

            <ProductCmsFields
              product={editingProduct}
              products={products}
              categories={categories}
              settings={siteSettings}
              onChange={(patch) => setEditingProduct({ ...editingProduct, ...patch })}
            />

            <section id="product-description" className="admin-panel scroll-mt-20 space-y-5 p-5 md:p-6">
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
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input type="checkbox" checked={editingProduct.newProduct || false} onChange={(event) => setEditingProduct({ ...editingProduct, newProduct: event.target.checked })} className="size-4 accent-[var(--sp-brand)]" />
                <span>Новинка</span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(['Ru', 'Uz', 'En', 'Zh'] as const).map((suffix) => {
                const field = `shortDescription${suffix}` as const;
                return (
                  <label key={field} className="font-bold">
                    Краткое описание ({suffix.toUpperCase()})
                    <textarea rows={2} value={editingProduct[field] || ''} onChange={(event) => setEditingProduct({ ...editingProduct, [field]: event.target.value })} className="admin-control mt-1.5 font-normal" />
                  </label>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(['Ru', 'Uz', 'En', 'Zh'] as const).map((suffix) => {
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
                values: { ru: editingProduct.titleRu || '', uz: editingProduct.titleUz || '', en: editingProduct.titleEn || '', zh: editingProduct.titleZh || '' },
                onChange: (language, value) => setEditingProduct((current) => current ? { ...current, [`title${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : language === 'en' ? 'En' : 'Zh'}`]: value } : current),
              },
              {
                key: 'shortDescription', label: 'Краткое описание',
                values: { ru: editingProduct.shortDescriptionRu || '', uz: editingProduct.shortDescriptionUz || '', en: editingProduct.shortDescriptionEn || '', zh: editingProduct.shortDescriptionZh || '' },
                onChange: (language, value) => setEditingProduct((current) => current ? { ...current, [`shortDescription${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : language === 'en' ? 'En' : 'Zh'}`]: value } : current),
              },
              {
                key: 'description', label: 'Полное описание',
                values: { ru: editingProduct.descriptionRu || '', uz: editingProduct.descriptionUz || '', en: editingProduct.descriptionEn || '', zh: editingProduct.descriptionZh || '' },
                onChange: (language, value) => setEditingProduct((current) => current ? { ...current, [`description${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : language === 'en' ? 'En' : 'Zh'}`]: value } : current),
              },
            ]} />
            </section>

            {/* Dynamic Attributes Section */}
            <section id="product-attributes" className="admin-panel scroll-mt-20 space-y-5 p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="admin-section-heading">Характеристики и фильтры</h4>
                  <span className="admin-section-description block">
                    Поля определяются выбранной категорией или подкатегорией. Наследуются атрибуты группы и всех родителей.
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
                {applicableAttributes.map((attr) => {
                  const rawVal = editingProduct.attributes?.[attr.key];
                  return (
                    <div key={attr.id} className="admin-panel-muted space-y-1.5 p-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-[var(--sp-ink)]">
                          {attr.titleRu} {attr.unit ? `(${attr.unit})` : ''}{attr.required ? ' *' : ''}
                        </label>
                        <span className="text-[9px] text-[var(--sp-ink-tertiary)]">{attr.required ? 'Обязательно' : attr.filterable ? 'Для фильтра' : 'Необязательно'}</span>
                      </div>

                      <ProductAttributeField
                        attribute={attr}
                        value={rawVal}
                        onChange={(value) => {
                          const nextAttributes = { ...(editingProduct.attributes || {}) };
                          if (value === undefined) delete nextAttributes[attr.key];
                          else nextAttributes[attr.key] = value;
                          setEditingProduct({ ...editingProduct, attributes: nextAttributes });
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {inactiveStoredAttributes.length > 0 ? (
                <div className="sp-alert sp-alert-warning text-xs">
                  <strong>Сохранены значения от другой категории:</strong>{' '}
                  {inactiveStoredAttributes.map((attribute) => attribute.titleRu).join(', ')}. Они не удаляются автоматически при переносе товара и не показываются покупателю в текущей категории.
                </div>
              ) : null}

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
                        value={attributeValueAsText(customVal)}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            attributes: {
                              ...(editingProduct.attributes || {}),
                              [customKey]: parseEditedAttributeValue(e.target.value, customVal) ?? '',
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
              <div id="product-save-error" role="alert" className="sp-alert sp-alert-danger flex scroll-mt-24 items-start gap-2 text-xs">
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
