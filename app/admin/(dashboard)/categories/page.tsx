'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Edit3, FolderTree, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import { MediaUploadField, deleteUploadedMedia } from '@/components/admin/MediaUploadField';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import type { Category } from '@/types';

const newCategory: Partial<Category> = {
  titleRu: '',
  titleUz: '',
  titleEn: '',
  slug: '',
  descriptionRu: '',
  descriptionUz: '',
  descriptionEn: '',
  status: 'active',
  sortOrder: 1,
};

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
    if (editingCategory.imagePath && editingCategory.imagePath !== persistedCategory?.imagePath) {
      void deleteUploadedMedia(editingCategory.imagePath).catch(() => undefined);
    }
  };

  const loadCategories = async () => {
    setLoading(true);
    setPageError('');
    try {
      const data = await SanpackRepository.getCategories();
      setCategories(data.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Не удалось загрузить категории.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    SanpackRepository.getCategories()
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

  const startCreate = () => {
    cleanupStagedImage();
    setEditingCategory({ ...newCategory, sortOrder: categories.length + 1 });
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
        ? await SanpackRepository.updateCategory(editingCategory.id, payload)
        : await SanpackRepository.saveCategory(payload);
      setEditingCategory(saved);
      await loadCategories();
      let cleanupFailed = false;
      if (previous?.imagePath && previous.imagePath !== saved.imagePath) {
        try {
          await deleteUploadedMedia(previous.imagePath);
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
      await SanpackRepository.deleteCategory(category.id);
      let cleanupFailed = false;
      if (category.imagePath) {
        try {
          await deleteUploadedMedia(category.imagePath);
        } catch {
          cleanupFailed = true;
        }
      }
      if (editingCategory.id === category.id) startCreate();
      await loadCategories();
      setNotice(cleanupFailed
        ? 'Категория удалена, но изображение не удалось очистить из Storage.'
        : 'Категория удалена.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Категория не удалена.');
    }
  };

  const parentCategories = categories.filter((category) => !category.parentId && category.id !== editingCategory.id);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-[var(--sp-line)] pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-extended text-2xl font-bold tracking-[-0.025em] text-[var(--sp-ink)]">Категории каталога</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--sp-ink-secondary)]">Управляйте структурой каталога и изображениями, которые покупатель видит на главной странице.</p>
        </div>
        <button type="button" onClick={startCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-4 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90">
          <Plus className="size-4" aria-hidden="true" /> Новая категория
        </button>
      </header>

      {(pageError || notice) && (
        <p className={`rounded-lg border px-4 py-3 text-sm ${pageError ? 'border-red-300/50 bg-red-500/8 text-[var(--sp-danger)]' : 'border-emerald-500/30 bg-emerald-500/8 text-[var(--sp-success)]'}`} role={pageError ? 'alert' : 'status'}>
          {pageError || notice}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(300px,0.72fr)_minmax(520px,1.28fr)]">
        <section className="overflow-hidden rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)]">
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
              {categories.map((category) => (
                <li key={category.id} className={category.parentId ? 'pl-5' : ''}>
                  <div className={`flex items-center gap-3 px-3 py-3 ${editingCategory.id === category.id ? 'bg-[var(--sp-surface-inset)]' : ''}`}>
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-[var(--sp-line)] bg-[var(--sp-surface-inset)]">
                      {category.image ? <Image src={category.image} alt="" fill sizes="48px" className="object-contain" /> : <ImagePlus className="absolute inset-0 m-auto size-4 text-[var(--sp-ink-muted)]" />}
                    </div>
                    <button type="button" onClick={() => selectCategory(category)} className="min-w-0 flex-1 text-left">
                      <span className="line-clamp-1 text-xs font-bold text-[var(--sp-ink)]">{category.titleRu}</span>
                      <span className="mt-1 block truncate font-mono text-[10px] text-[var(--sp-ink-tertiary)]">/{category.slug}</span>
                    </button>
                    <button type="button" onClick={() => selectCategory(category)} aria-label={`Редактировать ${category.titleRu}`} className="flex size-9 items-center justify-center rounded-md text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-brand)]">
                      <Edit3 className="size-4" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => void removeCategory(category)} aria-label={`Удалить ${category.titleRu}`} className="flex size-9 items-center justify-center rounded-md text-[var(--sp-ink-tertiary)] hover:bg-red-500/8 hover:text-[var(--sp-danger)]">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={saveCategory} className="space-y-6 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
          <div className="border-b border-[var(--sp-line)] pb-4">
            <h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">{editingCategory.id ? 'Редактирование категории' : 'Новая категория'}</h2>
            <p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Изображение категории показывается в компактной витрине и не должно содержать мелкий текст.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {([
              ['titleRu', 'Название RU *'],
              ['titleUz', 'Название UZ *'],
              ['titleEn', 'Название EN'],
            ] as const).map(([field, label]) => (
              <label key={field} className="text-xs font-bold text-[var(--sp-ink)]">
                {label}
                <input value={editingCategory[field] || ''} required={field !== 'titleEn'} onChange={(event) => setEditingCategory((current) => ({ ...current, [field]: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-control)] px-3 text-sm font-normal text-[var(--sp-ink)] outline-none focus:border-[var(--sp-brand)]" />
              </label>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-[var(--sp-ink)]">
              URL категории *
              <input value={editingCategory.slug || ''} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="odnorazovaya-upakovka" onChange={(event) => setEditingCategory((current) => ({ ...current, slug: event.target.value }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-control)] px-3 font-mono text-sm font-normal text-[var(--sp-ink)] outline-none focus:border-[var(--sp-brand)]" />
              <span className="mt-1 block font-normal text-[var(--sp-ink-tertiary)]">Только латиница, цифры и дефисы.</span>
            </label>
            <CustomSelect label="Родительская категория" value={editingCategory.parentId || ''} onChange={(value) => setEditingCategory((current) => ({ ...current, parentId: value || null }))} options={[
              { value: '', label: '— Корневая категория —' },
              ...parentCategories.map((category) => ({ value: category.id, label: category.titleRu })),
            ]} />
          </div>

          <MediaUploadField kind="category" label="Изображение категории" recommendation="Рекомендуется 800×600 px · 4:3" value={editingCategory.image} optional onUploaded={(media) => {
            if (editingCategory.imagePath && editingCategory.imagePath !== persistedCategory?.imagePath) {
              void deleteUploadedMedia(editingCategory.imagePath).catch(() => undefined);
            }
            setEditingCategory((current) => ({ ...current, image: media.url, imagePath: media.path }));
          }} onClear={() => {
            if (editingCategory.imagePath && editingCategory.imagePath !== persistedCategory?.imagePath) {
              void deleteUploadedMedia(editingCategory.imagePath).catch(() => undefined);
            }
            setEditingCategory((current) => ({ ...current, image: undefined, imagePath: undefined }));
          }} />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <CustomSelect label="Статус" value={editingCategory.status || 'active'} onChange={(value) => setEditingCategory((current) => ({ ...current, status: value as Category['status'] }))} options={[
                { value: 'active', label: 'Показывать на сайте' },
                { value: 'hidden', label: 'Скрыть' },
              ]} />
            </div>
            <label className="text-xs font-bold text-[var(--sp-ink)]">
              Порядок
              <input type="number" min="0" value={editingCategory.sortOrder ?? 0} onChange={(event) => setEditingCategory((current) => ({ ...current, sortOrder: Number(event.target.value) }))} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-control)] px-3 text-sm font-normal text-[var(--sp-ink)] outline-none focus:border-[var(--sp-brand)]" />
            </label>
          </div>

          <div className="flex justify-end border-t border-[var(--sp-line)] pt-5">
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-5 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
              <Save className="size-4" aria-hidden="true" /> {saving ? 'Сохранение…' : 'Сохранить категорию'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
