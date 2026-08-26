'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Edit3, FolderTree, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
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
        ? await AdminRepository.updateCategory(editingCategory.id, payload)
        : await AdminRepository.saveCategory(payload);
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
      await AdminRepository.deleteCategory(category.id);
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
    <div className="admin-page space-y-6">
      <AdminPageHeader
        title="Категории каталога"
        description="Соберите понятное дерево каталога. Слева — структура, справа — содержимое выбранной категории."
        action={(
          <button type="button" onClick={startCreate} className="admin-button-primary">
            <Plus className="size-4" aria-hidden="true" /> Новая категория
          </button>
        )}
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
              {categories.map((category) => (
                <li key={category.id} className={category.parentId ? 'pl-5' : ''}>
                  <div className={`flex items-center gap-3 px-3 py-3 ${editingCategory.id === category.id ? 'bg-[var(--sp-surface-inset)]' : ''}`}>
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)]">
                      {category.image ? <Image src={category.image} alt="" fill sizes="48px" className="object-contain" /> : <ImagePlus className="absolute inset-0 m-auto size-4 text-[var(--sp-ink-muted)]" />}
                    </div>
                    <button type="button" onClick={() => selectCategory(category)} className="min-w-0 flex-1 text-left">
                      <span className="line-clamp-1 text-xs font-bold text-[var(--sp-ink)]">{category.titleRu}</span>
                      <span className="mt-1 block truncate font-mono text-[10px] text-[var(--sp-ink-tertiary)]">/{category.slug}</span>
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
            <h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">{editingCategory.id ? 'Редактирование категории' : 'Новая категория'}</h2>
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
            <p className="admin-section-description">URL используется в адресе страницы, а родительская категория определяет вложенность.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="admin-field-label">
              URL категории *
              <input value={editingCategory.slug || ''} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="odnorazovaya-upakovka" onChange={(event) => setEditingCategory((current) => ({ ...current, slug: event.target.value }))} className="admin-control mt-1.5 font-mono text-sm font-normal" />
              <span className="mt-1 block font-normal text-[var(--sp-ink-tertiary)]">Только латиница, цифры и дефисы.</span>
            </label>
            <CustomSelect label="Родительская категория" value={editingCategory.parentId || ''} onChange={(value) => setEditingCategory((current) => ({ ...current, parentId: value || null }))} options={[
              { value: '', label: '— Корневая категория —' },
              ...parentCategories.map((category) => ({ value: category.id, label: category.titleRu })),
            ]} />
          </div>
          </section>

          <section className="admin-section">
          <div>
            <h3 className="admin-section-heading">Изображение и публикация</h3>
            <p className="admin-section-description">Картинка появится на главной витрине. Статус и порядок управляют показом категории.</p>
          </div>
          <div className="mt-4">
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
