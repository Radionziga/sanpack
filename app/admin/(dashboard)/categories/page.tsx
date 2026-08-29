'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Edit3, FolderPlus, FolderTree, ImagePlus, Layers3, Plus, Save, Trash2 } from 'lucide-react';
import { MediaUploadField, deleteUploadedMedia } from '@/components/admin/MediaUploadField';
import { AiTranslateButton } from '@/components/admin/AiTranslateButton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import type { Category } from '@/types';

const newCategory: Partial<Category> = {
  titleRu: '',
  titleUz: '',
  titleEn: '',
  titleZh: '',
  slug: '',
  descriptionRu: '',
  descriptionUz: '',
  descriptionEn: '',
  descriptionZh: '',
  status: 'active',
  sortOrder: 1,
};

function getCategoryMediaPaths(category?: Partial<Category>) {
  return new Set([
    category?.imagePath,
    category?.navigationImagePath,
    category?.cardImagePath,
  ].filter((path): path is string => Boolean(path)));
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Partial<Category>>({ ...newCategory });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const persistedCategory = editingCategory.id
    ? categories.find((category) => category.id === editingCategory.id)
    : undefined;

  const cleanupStagedImage = () => {
    const persistedPaths = getCategoryMediaPaths(persistedCategory);
    for (const path of getCategoryMediaPaths(editingCategory)) {
      if (!persistedPaths.has(path)) void deleteUploadedMedia(path).catch(() => undefined);
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    setPageError('');
    try {
      const data = await AdminRepository.getCategories();
      setCategories(data.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Не удалось загрузить категории.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    AdminRepository.getCategories()
      .then((data) => {
        if (active) setCategories(data.slice().sort((a, b) => a.sortOrder - b.sortOrder));
      })
      .catch((error: unknown) => {
        if (active) setPageError(error instanceof Error ? error.message : 'Не удалось загрузить категории.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const startCreate = (kind: 'group' | 'category' = 'category') => {
    cleanupStagedImage();
    const firstGroup = categories.find((category) => !category.parentId);
    if (kind === 'category' && !firstGroup) {
      setPageError('Сначала создайте группу каталога, затем добавьте внутрь неё категорию.');
      return;
    }
    setEditingCategory({
      ...newCategory,
      parentId: kind === 'group' ? null : firstGroup?.id || null,
      sortOrder: categories.length + 1,
    });
    setNotice('');
  };

  const selectCategory = (category: Category) => {
    cleanupStagedImage();
    setEditingCategory({ ...category });
    setNotice('');
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setPageError('');
    setNotice('');
    if (!editingCategory.titleRu?.trim() || !editingCategory.titleUz?.trim() || !editingCategory.slug?.trim()) {
      setPageError('Заполните названия RU/UZ и URL категории.');
      return;
    }
    setSaving(true);
    try {
      const previous = editingCategory.id
        ? categories.find((category) => category.id === editingCategory.id)
        : undefined;
      const payload = {
        ...editingCategory,
        parentId: editingCategory.parentId || null,
        slug: editingCategory.slug.trim().toLowerCase(),
        status: editingCategory.status || 'active',
        sortOrder: Number(editingCategory.sortOrder || 0),
      };
      const saved = editingCategory.id
        ? await AdminRepository.updateCategory(editingCategory.id, payload)
        : await AdminRepository.saveCategory(payload);
      setEditingCategory(saved);
      await loadCategories();
      let cleanupFailed = false;
      const savedPaths = getCategoryMediaPaths(saved);
      for (const path of getCategoryMediaPaths(previous)) {
        if (savedPaths.has(path)) continue;
        try {
          await deleteUploadedMedia(path);
        } catch {
          cleanupFailed = true;
        }
      }
      setNotice(cleanupFailed
        ? 'Категория сохранена, но старое изображение не удалось очистить из Storage.'
        : 'Категория сохранена. Изображение уже доступно в каталоге.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Категория не сохранена.');
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (category: Category) => {
    if (!window.confirm(`Удалить категорию «${category.titleRu}»?`)) return;
    setPageError('');
    setNotice('');
    try {
      await AdminRepository.deleteCategory(category.id);
      let cleanupFailed = false;
      for (const path of getCategoryMediaPaths(category)) {
        try {
          await deleteUploadedMedia(path);
        } catch {
          cleanupFailed = true;
        }
      }
      if (editingCategory.id === category.id) startCreate('category');
      await loadCategories();
      setNotice(cleanupFailed
        ? 'Категория удалена, но изображение не удалось очистить из Storage.'
        : 'Категория удалена.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Категория не удалена.');
    }
  };

  const parentCategories = categories.filter((category) => !category.parentId && category.id !== editingCategory.id);
  const orderedCategories = useMemo(() => {
    const roots = categories.filter((category) => !category.parentId);
    const nestedIds = new Set<string>();
    const ordered = roots.flatMap((root) => {
      nestedIds.add(root.id);
      const children = categories.filter((category) => category.parentId === root.id);
      children.forEach((category) => nestedIds.add(category.id));
      return [root, ...children];
    });
    return [...ordered, ...categories.filter((category) => !nestedIds.has(category.id))];
  }, [categories]);
  const editingIsGroup = !editingCategory.parentId;

  return (
    <div className="admin-page space-y-6">
      <AdminPageHeader
        title="Категории каталога"
        description="Соберите понятное дерево каталога. Слева — структура, справа — содержимое выбранной категории."
        action={<div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => startCreate('group')} className="admin-button-secondary">
            <FolderPlus className="size-4" aria-hidden="true" /> Новая группа
          </button>
          <button type="button" onClick={() => startCreate('category')} className="admin-button-primary">
            <Plus className="size-4" aria-hidden="true" /> Новая категория
          </button>
        </div>}
      />

      {(pageError || notice) && (
        <p className={`sp-alert text-sm ${pageError ? 'sp-alert-danger' : 'sp-alert-success'}`} role={pageError ? 'alert' : 'status'}>
          {pageError || notice}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="admin-panel overflow-hidden lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[var(--sp-line)] px-4 py-3">
            <span className="font-compact text-xs font-bold text-[var(--sp-ink)]">Структура</span>
            <span className="text-[11px] text-[var(--sp-ink-tertiary)]">{categories.length} категорий</span>
          </div>
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-[var(--sp-ink-tertiary)]">Загрузка…</p>
          ) : categories.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <FolderTree className="mx-auto size-6 text-[var(--sp-ink-muted)]" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-[var(--sp-ink)]">Категорий пока нет</p>
              <p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Создайте первую корневую категорию.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--sp-line-soft)]">
              {orderedCategories.map((category) => (
                <li key={category.id} className={category.parentId ? 'pl-5' : ''}>
                  <div className={`flex items-center gap-3 px-3 py-3 ${editingCategory.id === category.id ? 'bg-[var(--sp-surface-inset)]' : ''}`}>
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)]">
                      {category.navigationImage || category.image ? <Image src={category.navigationImage || category.image!} alt="" fill sizes="48px" className="object-contain" /> : <ImagePlus className="absolute inset-0 m-auto size-4 text-[var(--sp-ink-muted)]" />}
                    </div>
                    <button type="button" onClick={() => selectCategory(category)} className="min-w-0 flex-1 text-left">
                      <span className="line-clamp-1 text-xs font-bold text-[var(--sp-ink)]">{category.titleRu}</span>
                      <span className="mt-1 flex items-center gap-1 truncate font-mono text-[10px] text-[var(--sp-ink-tertiary)]">
                        {category.parentId ? <Layers3 className="size-3" aria-hidden="true" /> : <FolderTree className="size-3" aria-hidden="true" />}
                        {category.parentId ? 'категория' : 'группа'} · /{category.slug}
                      </span>
                    </button>
                    <button type="button" onClick={() => selectCategory(category)} aria-label={`Редактировать ${category.titleRu}`} className="admin-icon-button size-9">
                      <Edit3 className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => void removeCategory(category)} aria-label={`Удалить ${category.titleRu}`} className="admin-icon-button size-9 hover:bg-red-500/8 hover:text-[var(--sp-danger)]">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={saveCategory} className="admin-panel overflow-hidden">
          <div className="border-b border-[var(--sp-line)] px-5 py-5 md:px-6">
            <h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">
              {editingCategory.id ? `Редактирование ${editingIsGroup ? 'группы' : 'категории'}` : `Новая ${editingIsGroup ? 'группа' : 'категория'}`}
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Сначала заполните основную информацию, затем изображение и правила публикации.</p>
          </div>

          <div className="space-y-7 p-5 md:p-6">
          <section className="admin-section">
            <div>
              <h3 className="admin-section-heading">Название и описание</h3>
              <p className="admin-section-description">Русская версия — основная. Узбекскую, английскую и китайскую можно заполнить автоматически и затем отредактировать.</p>
            </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {([
              ['titleRu', 'Название RU *'],
              ['titleUz', 'Название UZ *'],
              ['titleEn', 'Название EN'],
              ['titleZh', 'Название ZH'],
            ] as const).map(([field, label]) => (
              <label key={field} className="admin-field-label">
                {label}
                <input value={editingCategory[field] || ''} required={field === 'titleRu' || field === 'titleUz'} onChange={(event) => setEditingCategory((current) => ({ ...current, [field]: event.target.value }))} className="admin-control mt-1.5 text-sm font-normal" />
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {([['descriptionRu', 'Описание RU'], ['descriptionUz', 'Описание UZ'], ['descriptionEn', 'Описание EN'], ['descriptionZh', 'Описание ZH']] as const).map(([field, label]) => (
              <label key={field} className="admin-field-label">
                {label}
                <textarea rows={3} value={editingCategory[field] || ''} onChange={(event) => setEditingCategory((current) => ({ ...current, [field]: event.target.value }))} className="admin-control mt-1.5 text-sm font-normal" />
              </label>
            ))}
          </div>

          <div className="mt-4"><AiTranslateButton compact fields={[
            {
              key: 'title', label: 'Название категории',
              values: { ru: editingCategory.titleRu || '', uz: editingCategory.titleUz || '', en: editingCategory.titleEn || '', zh: editingCategory.titleZh || '' },
              onChange: (language, value) => setEditingCategory((current) => ({ ...current, [`title${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : language === 'en' ? 'En' : 'Zh'}`]: value })),
            },
            {
              key: 'description', label: 'Описание категории',
              values: { ru: editingCategory.descriptionRu || '', uz: editingCategory.descriptionUz || '', en: editingCategory.descriptionEn || '', zh: editingCategory.descriptionZh || '' },
              onChange: (language, value) => setEditingCategory((current) => ({ ...current, [`description${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : language === 'en' ? 'En' : 'Zh'}`]: value })),
            },
          ]} /></div>
          </section>

          <section className="admin-section">
            <h3 className="admin-section-heading">Место в каталоге</h3>
            <p className="admin-section-description">Корневая запись — группа. Реальная товарная категория всегда находится внутри группы.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="admin-field-label">
              URL категории *
              <input value={editingCategory.slug || ''} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="odnorazovaya-upakovka" onChange={(event) => setEditingCategory((current) => ({ ...current, slug: event.target.value }))} className="admin-control mt-1.5 font-mono text-sm font-normal" />
              <span className="mt-1 block font-normal text-[var(--sp-ink-tertiary)]">Только латиница, цифры и дефисы.</span>
            </label>
            <CustomSelect label="Родительская категория" value={editingCategory.parentId || ''} onChange={(value) => setEditingCategory((current) => ({ ...current, parentId: value || null }))} options={[
              { value: '', label: '— Это группа каталога —' },
              ...parentCategories.map((category) => ({ value: category.id, label: category.titleRu })),
            ]} />
          </div>
          </section>

          <section className="admin-section">
          <div>
            <h3 className="admin-section-heading">Изображения и публикация</h3>
            <p className="admin-section-description">Навигационная иконка и большая bento-обложка управляются независимо. Старое поле image остаётся резервным для существующих документов.</p>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <MediaUploadField kind="category" label="Иконка для навигации" recommendation="800×600 px · 4:3" value={editingCategory.navigationImage || editingCategory.image} optional onUploaded={(media) => {
            if (editingCategory.navigationImagePath && editingCategory.navigationImagePath !== persistedCategory?.navigationImagePath) {
              void deleteUploadedMedia(editingCategory.navigationImagePath).catch(() => undefined);
            }
            setEditingCategory((current) => ({ ...current, navigationImage: media.url, navigationImagePath: media.path }));
          }} onClear={() => {
            if (editingCategory.navigationImagePath && editingCategory.navigationImagePath !== persistedCategory?.navigationImagePath) {
              void deleteUploadedMedia(editingCategory.navigationImagePath).catch(() => undefined);
            }
            setEditingCategory((current) => ({ ...current, navigationImage: undefined, navigationImagePath: undefined }));
          }} />
          <MediaUploadField kind="category-card" label="Обложка bento-карточки" recommendation="1200×720 px · 5:3" value={editingCategory.cardImage} optional onUploaded={(media) => {
            if (editingCategory.cardImagePath && editingCategory.cardImagePath !== persistedCategory?.cardImagePath) {
              void deleteUploadedMedia(editingCategory.cardImagePath).catch(() => undefined);
            }
            setEditingCategory((current) => ({ ...current, cardImage: media.url, cardImagePath: media.path }));
          }} onClear={() => {
            if (editingCategory.cardImagePath && editingCategory.cardImagePath !== persistedCategory?.cardImagePath) {
              void deleteUploadedMedia(editingCategory.cardImagePath).catch(() => undefined);
            }
            setEditingCategory((current) => ({ ...current, cardImage: undefined, cardImagePath: undefined }));
          }} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <CustomSelect label="Статус" value={editingCategory.status || 'active'} onChange={(value) => setEditingCategory((current) => ({ ...current, status: value as Category['status'] }))} options={[
                { value: 'active', label: 'Показывать на сайте' },
                { value: 'hidden', label: 'Скрыть' },
              ]} />
            </div>
            <label className="admin-field-label">
              Порядок
              <input type="number" min="0" value={editingCategory.sortOrder ?? 0} onChange={(event) => setEditingCategory((current) => ({ ...current, sortOrder: Number(event.target.value) }))} className="admin-control mt-1.5 text-sm font-normal" />
            </label>
          </div>
          {!editingIsGroup ? <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="admin-panel-muted flex cursor-pointer items-center justify-between gap-3 p-3">
              <span><strong className="block text-xs text-[var(--sp-ink)]">Показывать в bento-блоке группы</strong><span className="mt-1 block text-[11px] text-[var(--sp-ink-tertiary)]">Если ни одна категория группы не отмечена, storefront использует первые шесть по порядку.</span></span>
              <input type="checkbox" checked={editingCategory.featured ?? false} onChange={(event) => setEditingCategory((current) => ({ ...current, featured: event.target.checked }))} className="size-4 accent-[var(--sp-brand)]" />
            </label>
            <label className="admin-field-label">Порядок в bento-блоке
              <input type="number" min="0" value={editingCategory.featuredSortOrder ?? editingCategory.sortOrder ?? 0} onChange={(event) => setEditingCategory((current) => ({ ...current, featuredSortOrder: Number(event.target.value) }))} className="admin-control mt-1.5 text-sm font-normal" />
            </label>
          </div> : null}
          </section>

          <section className="admin-section">
            <h3 className="admin-section-heading">SEO категории</h3>
            <p className="admin-section-description">Необязательные заголовки и описания для поисковых систем. Если оставить пустыми, используются обычные название и описание.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(['Ru', 'Uz', 'En', 'Zh'] as const).map((suffix) => (
                <label key={`seo-title-${suffix}`} className="admin-field-label">SEO title {suffix.toUpperCase()}
                  <input value={editingCategory.seo?.[`title${suffix}`] || ''} onChange={(event) => setEditingCategory((current) => ({ ...current, seo: { ...current.seo, [`title${suffix}`]: event.target.value } }))} className="admin-control mt-1.5 text-sm font-normal" />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(['Ru', 'Uz', 'En', 'Zh'] as const).map((suffix) => (
                <label key={`seo-description-${suffix}`} className="admin-field-label">SEO description {suffix.toUpperCase()}
                  <textarea rows={3} value={editingCategory.seo?.[`description${suffix}`] || ''} onChange={(event) => setEditingCategory((current) => ({ ...current, seo: { ...current.seo, [`description${suffix}`]: event.target.value } }))} className="admin-control mt-1.5 text-sm font-normal" />
                </label>
              ))}
            </div>
          </section>
          </div>

          <div className="flex justify-end border-t border-[var(--sp-line)] bg-[var(--sp-surface)] px-5 py-4 md:px-6">
            <button type="submit" disabled={saving} className="admin-button-primary px-5 disabled:cursor-wait disabled:opacity-60">
              <Save className="size-4" aria-hidden="true" /> {saving ? 'Сохранение…' : 'Сохранить категорию'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
