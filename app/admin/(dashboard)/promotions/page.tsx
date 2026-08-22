'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, ImagePlus, Monitor, Plus, Save, Smartphone, Sparkles, Trash2 } from 'lucide-react';
import { MediaUploadField, deleteUploadedMedia } from '@/components/admin/MediaUploadField';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AiTranslateButton } from '@/components/admin/AiTranslateButton';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import type { Banner } from '@/types';

const httpUrlSchema = z.string().url().refine(
  (value) => /^https?:\/\//i.test(value),
  'Используйте полный HTTP(S) URL.',
);
const assetUrlSchema = z.union([
  httpUrlSchema,
  z.string().regex(/^\/(?!\/)/),
]);
const buttonTextSchema = z.string().trim().max(80, 'Текст кнопки должен быть короче 80 символов.');

const bannerFormSchema = z.object({
  titleRu: z.string().trim().max(180),
  titleUz: z.string().trim().max(180),
  titleEn: z.string().trim().max(180),
  subtitleRu: z.string().trim().max(300),
  subtitleUz: z.string().trim().max(300),
  subtitleEn: z.string().trim().max(300),
  imageDesktop: assetUrlSchema,
  imageDesktopPath: z.string(),
  imageMobile: assetUrlSchema,
  imageMobilePath: z.string(),
  buttonTextRu: buttonTextSchema,
  buttonTextUz: buttonTextSchema,
  buttonTextEn: buttonTextSchema,
  link: z.union([httpUrlSchema, z.string().regex(/^\/(?!\/)/), z.literal('')]),
  sortOrder: z.number().int().min(0).max(100_000),
  active: z.boolean(),
}).superRefine((values, context) => {
  const hasButtonText = Boolean(values.buttonTextRu || values.buttonTextUz || values.buttonTextEn);
  if (hasButtonText && !values.link) {
    context.addIssue({
      code: 'custom',
      path: ['link'],
      message: 'Добавьте ссылку для кнопки.',
    });
  }
});

type BannerForm = z.infer<typeof bannerFormSchema>;

const emptyBanner: BannerForm = {
  titleRu: '',
  titleUz: '',
  titleEn: '',
  subtitleRu: '',
  subtitleUz: '',
  subtitleEn: '',
  imageDesktop: '',
  imageDesktopPath: '',
  imageMobile: '',
  imageMobilePath: '',
  buttonTextRu: 'Перейти в каталог',
  buttonTextUz: 'Katalogni ko‘rish',
  buttonTextEn: 'View catalog',
  link: '/catalog',
  sortOrder: 1,
  active: true,
};

function toFormValues(banner: Banner): BannerForm {
  return {
    titleRu: banner.titleRu || '',
    titleUz: banner.titleUz || '',
    titleEn: banner.titleEn || '',
    subtitleRu: banner.subtitleRu || '',
    subtitleUz: banner.subtitleUz || '',
    subtitleEn: banner.subtitleEn || '',
    imageDesktop: banner.imageDesktop || '',
    imageDesktopPath: banner.imageDesktopPath || '',
    imageMobile: banner.imageMobile || '',
    imageMobilePath: banner.imageMobilePath || '',
    buttonTextRu: banner.buttonTextRu || '',
    buttonTextUz: banner.buttonTextUz || '',
    buttonTextEn: banner.buttonTextEn || '',
    link: banner.link || '',
    sortOrder: banner.sortOrder ?? 1,
    active: banner.active ?? true,
  };
}

export default function AdminPromotionsPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BannerForm>({
    resolver: zodResolver(bannerFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: emptyBanner,
  });

  const desktopImage = useWatch({ control, name: 'imageDesktop' });
  const mobileImage = useWatch({ control, name: 'imageMobile' });
  const desktopPath = useWatch({ control, name: 'imageDesktopPath' });
  const mobilePath = useWatch({ control, name: 'imageMobilePath' });
  const titleRu = useWatch({ control, name: 'titleRu' });
  const titleUz = useWatch({ control, name: 'titleUz' });
  const titleEn = useWatch({ control, name: 'titleEn' });
  const subtitleRu = useWatch({ control, name: 'subtitleRu' });
  const subtitleUz = useWatch({ control, name: 'subtitleUz' });
  const subtitleEn = useWatch({ control, name: 'subtitleEn' });
  const buttonTextRu = useWatch({ control, name: 'buttonTextRu' });
  const buttonTextUz = useWatch({ control, name: 'buttonTextUz' });
  const buttonTextEn = useWatch({ control, name: 'buttonTextEn' });
  const link = useWatch({ control, name: 'link' });

  const persistedBanner = selectedId ? banners.find((banner) => banner.id === selectedId) : undefined;
  const cleanupStagedPath = async (path?: string, persistedPath?: string) => {
    if (path && path !== persistedPath) await deleteUploadedMedia(path).catch(() => undefined);
  };

  const cleanupStagedForm = () => {
    const values = getValues();
    void Promise.allSettled([
      cleanupStagedPath(values.imageDesktopPath, persistedBanner?.imageDesktopPath),
      cleanupStagedPath(values.imageMobilePath, persistedBanner?.imageMobilePath),
    ]);
  };

  const loadBanners = async () => {
    setLoading(true);
    setPageError('');
    try {
      const data = await AdminRepository.getBanners();
      const sorted = data.slice().sort((a, b) => a.sortOrder - b.sortOrder);
      setBanners(sorted);
      return sorted;
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Не удалось загрузить баннеры.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    AdminRepository.getBanners()
      .then((data) => {
        if (active) setBanners(data.slice().sort((a, b) => a.sortOrder - b.sortOrder));
      })
      .catch((error: unknown) => {
        if (active) setPageError(error instanceof Error ? error.message : 'Не удалось загрузить баннеры.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const startCreate = () => {
    cleanupStagedForm();
    setSelectedId(null);
    setNotice('');
    reset({ ...emptyBanner, sortOrder: banners.length + 1 });
  };

  const selectBanner = (banner: Banner) => {
    cleanupStagedForm();
    setSelectedId(banner.id);
    setNotice('');
    reset(toFormValues(banner));
  };

  const saveBanner = handleSubmit(async (values) => {
    setPageError('');
    setNotice('');
    const payload: Partial<Banner> = {
      ...values,
      imageMobile: values.imageMobile,
      imageMobilePath: values.imageMobilePath || undefined,
      imageDesktopPath: values.imageDesktopPath || undefined,
    };
    try {
      const previous = selectedId ? banners.find((banner) => banner.id === selectedId) : undefined;
      const saved = selectedId
        ? await AdminRepository.updateBanner(selectedId, payload)
        : await AdminRepository.saveBanner(payload);
      setSelectedId(saved.id);
      reset(toFormValues(saved));
      await loadBanners();
      const obsoletePaths = [
        previous?.imageDesktopPath && previous.imageDesktopPath !== saved.imageDesktopPath ? previous.imageDesktopPath : undefined,
        previous?.imageMobilePath && previous.imageMobilePath !== saved.imageMobilePath ? previous.imageMobilePath : undefined,
      ].filter(Boolean) as string[];
      const cleanup = await Promise.allSettled(obsoletePaths.map(deleteUploadedMedia));
      setNotice(cleanup.some((result) => result.status === 'rejected')
        ? 'Баннер сохранён, но старый файл не удалось очистить из Storage.'
        : 'Баннер сохранён и опубликован на сайте.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Баннер не сохранён.');
    }
  });

  const removeBanner = async (banner: Banner) => {
    if (!window.confirm(`Удалить баннер «${banner.titleRu || 'без названия'}»?`)) return;
    setPageError('');
    setNotice('');
    try {
      await AdminRepository.deleteBanner(banner.id);
      const paths = [banner.imageDesktopPath, banner.imageMobilePath].filter(Boolean) as string[];
      const cleanup = await Promise.allSettled(paths.map(deleteUploadedMedia));
      const mediaCleanupFailed = cleanup.some((result) => result.status === 'rejected');
      await loadBanners();
      if (selectedId === banner.id) startCreate();
      setNotice(mediaCleanupFailed
        ? 'Баннер удалён, но один из файлов не удалось очистить из Storage.'
        : 'Баннер и связанные файлы удалены.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Баннер не удалён.');
    }
  };

  const activeCount = banners.filter((banner) => banner.active).length;

  return (
    <div className="admin-page mx-auto max-w-[1500px] space-y-6">
      <AdminPageHeader
        title="Промо-баннеры и карусель"
        description="Управление промо-баннерами на главной странице сайта. Добавляйте заголовок, описание, кнопку и отдельные фоновые изображения для компьютеров и смартфонов."
        action={(
          <button type="button" onClick={startCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-4 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90">
            <Plus className="size-4" aria-hidden="true" /> Новый баннер
          </button>
        )}
      />

      {(pageError || notice) && (
        <p className={`sp-alert text-sm ${pageError ? 'sp-alert-danger' : 'sp-alert-success'}`} role={pageError ? 'alert' : 'status'}>
          {pageError || notice}
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--sp-line)] px-4 py-3">
            <span className="font-compact text-xs font-bold text-[var(--sp-ink)]">Слайды</span>
            <span className="text-[11px] text-[var(--sp-ink-tertiary)]">Активно: {activeCount}</span>
          </div>
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--sp-ink-tertiary)]">Загрузка…</p>
          ) : banners.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <ImagePlus className="mx-auto size-6 text-[var(--sp-ink-muted)]" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-[var(--sp-ink)]">Карусель пока пустая</p>
              <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Загрузите первый баннер — он сразу станет главным промо-блоком.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--sp-line-soft)]">
              {banners.map((banner) => (
                <li key={banner.id}>
                  <button type="button" onClick={() => selectBanner(banner)} className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--sp-surface-inset)] ${selectedId === banner.id ? 'bg-[var(--sp-surface-inset)]' : ''}`}>
                    <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-[var(--sp-line)] bg-[var(--sp-surface-inset)]">
                      <Image src={banner.imageDesktop} alt="" fill sizes="80px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-xs font-bold text-[var(--sp-ink)]">{banner.titleRu || 'Без заголовка'}</span>
                      <span className="mt-1 flex items-center gap-1 text-[10px] text-[var(--sp-ink-tertiary)]">
                        {banner.active ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        {banner.active ? 'Показывается' : 'Скрыт'} · #{banner.sortOrder}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <form onSubmit={saveBanner} className="space-y-6 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--sp-line)] pb-4">
            <div>
              <h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">{selectedId ? 'Редактирование баннера' : 'Новый баннер'}</h2>
              <p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Текст размещается слева поверх фонового изображения. Если текст не нужен, оставьте поля пустыми.</p>
            </div>
            {selectedId && (
              <button type="button" onClick={() => { const banner = banners.find((item) => item.id === selectedId); if (banner) void removeBanner(banner); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300/40 px-3 text-xs font-bold text-[var(--sp-danger)] hover:bg-red-500/8">
                <Trash2 className="size-4" aria-hidden="true" /> Удалить
              </button>
            )}
          </div>

          {/* Live Preview Box */}
          <div className="space-y-2 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--sp-ink)]">
                <Sparkles className="size-3.5 text-emerald-600" /> Живой предпросмотр
              </span>
              <div className="flex gap-1 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${previewMode === 'desktop' ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'}`}
                >
                  <Monitor className="size-3" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${previewMode === 'mobile' ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)]' : 'text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'}`}
                >
                  <Smartphone className="size-3" /> Mobile
                </button>
              </div>
            </div>

            <div className={`relative mx-auto overflow-hidden rounded-lg border border-[var(--sp-line)] bg-[var(--sp-brand-deep)] ${previewMode === 'desktop' ? 'aspect-[24/7] w-full' : 'aspect-[16/9] max-w-sm'}`}>
              {(previewMode === 'desktop' ? desktopImage : (mobileImage || desktopImage)) ? (
                <Image
                  src={previewMode === 'desktop' ? desktopImage : (mobileImage || desktopImage)}
                  alt="Предпросмотр"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--sp-on-brand-deep)] opacity-50">
                  Загрузите изображение для предпросмотра
                </div>
              )}

              {(titleRu || subtitleRu || buttonTextRu) && (
                <div className="absolute inset-0 z-10 flex flex-col justify-center p-4 sm:p-6 md:p-8 pointer-events-none">
                  <div className="max-w-[65%] sm:max-w-[55%] space-y-1 sm:space-y-2">
                    {titleRu ? (
                      <h3 className="font-extended text-xs sm:text-base md:text-xl font-bold text-white leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
                        {titleRu}
                      </h3>
                    ) : null}
                    {subtitleRu ? (
                      <p className="line-clamp-2 text-[10px] sm:text-xs text-white/90 leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                        {subtitleRu}
                      </p>
                    ) : null}
                    {buttonTextRu && link ? (
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--sp-brand)] px-2.5 py-1 text-[10px] font-semibold text-[var(--sp-on-brand)] shadow sm:text-xs">
                          {buttonTextRu} <ArrowRight className="size-3" />
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title Inputs */}
          <div className="space-y-4">
            <h3 className="font-compact text-sm font-bold text-[var(--sp-ink)]">Заголовок баннера</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {(['titleRu', 'titleUz', 'titleEn'] as const).map((name, index) => (
                <label key={name} className="space-y-1.5 text-xs font-bold text-[var(--sp-ink)]">
                  Заголовок {['RU', 'UZ', 'EN'][index]}
                  <input
                    {...register(name)}
                    placeholder={['Свежее мясо по лучшим ценам', 'Eng yaxshi narxlarda yangi go‘sht', 'Fresh meat at best prices'][index]}
                    aria-invalid={Boolean(errors[name])}
                    className="admin-control mt-1.5 text-sm font-normal"
                  />
                  {errors[name] && <span className="block font-normal text-[var(--sp-danger)]">{errors[name]?.message}</span>}
                </label>
              ))}
            </div>
          </div>

          {/* Subtitle Inputs */}
          <div className="space-y-4">
            <h3 className="font-compact text-sm font-bold text-[var(--sp-ink)]">Подзаголовок / Описание</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {(['subtitleRu', 'subtitleUz', 'subtitleEn'] as const).map((name, index) => (
                <label key={name} className="space-y-1.5 text-xs font-bold text-[var(--sp-ink)]">
                  Подзаголовок {['RU', 'UZ', 'EN'][index]}
                  <textarea
                    {...register(name)}
                    rows={2}
                    placeholder={['Прямые оптовые поставки для ресторанов', 'Restoranlar uchun ulgurji yetkazib berish', 'Direct wholesale supply for restaurants'][index]}
                    aria-invalid={Boolean(errors[name])}
                    className="admin-control mt-1.5 text-sm font-normal resize-none"
                  />
                  {errors[name] && <span className="block font-normal text-[var(--sp-danger)]">{errors[name]?.message}</span>}
                </label>
              ))}
            </div>
          </div>

          {/* AI Translator */}
          <AiTranslateButton fields={[
            {
              key: 'title', label: 'Заголовок баннера', values: { ru: titleRu, uz: titleUz, en: titleEn },
              onChange: (language, value) => setValue(`title${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : 'En'}`, value, { shouldDirty: true, shouldValidate: true }),
            },
            {
              key: 'subtitle', label: 'Подзаголовок баннера', values: { ru: subtitleRu, uz: subtitleUz, en: subtitleEn },
              onChange: (language, value) => setValue(`subtitle${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : 'En'}`, value, { shouldDirty: true, shouldValidate: true }),
            },
            {
              key: 'buttonText', label: 'Текст кнопки', values: { ru: buttonTextRu, uz: buttonTextUz, en: buttonTextEn },
              onChange: (language, value) => setValue(`buttonText${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : 'En'}`, value, { shouldDirty: true, shouldValidate: true }),
            },
          ]} compact />

          {/* Media uploaders */}
          <div className="space-y-4 border-t border-[var(--sp-line)] pt-5">
            <h3 className="font-compact text-sm font-bold text-[var(--sp-ink)]">Фоновые изображения</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <MediaUploadField kind="banner-desktop" label="Desktop-баннер *" recommendation="Широкий макет 24:7 (напр. 2322×677 px)" value={desktopImage} onUploaded={(media) => {
                  void cleanupStagedPath(desktopPath, persistedBanner?.imageDesktopPath);
                  setValue('imageDesktop', media.url, { shouldValidate: true, shouldDirty: true });
                  setValue('imageDesktopPath', media.path, { shouldDirty: true });
                }} />
                {errors.imageDesktop && <p className="mt-1 text-xs text-[var(--sp-danger)]" role="alert">Загрузите desktop-баннер.</p>}
              </div>

              <div>
                <MediaUploadField kind="banner-mobile" label="Мобильный баннер *" recommendation="Горизонтальный макет 16:9 (напр. 1672×941 px)" value={mobileImage || undefined} onUploaded={(media) => {
                  void cleanupStagedPath(mobilePath, persistedBanner?.imageMobilePath);
                  setValue('imageMobile', media.url, { shouldValidate: true, shouldDirty: true });
                  setValue('imageMobilePath', media.path, { shouldDirty: true });
                }} onClear={() => {
                  void cleanupStagedPath(mobilePath, persistedBanner?.imageMobilePath);
                  setValue('imageMobile', '', { shouldValidate: true, shouldDirty: true });
                  setValue('imageMobilePath', '', { shouldDirty: true });
                }} />
                {errors.imageMobile && <p className="mt-1 text-xs text-[var(--sp-danger)]" role="alert">Загрузите мобильный баннер.</p>}
              </div>
            </div>
          </div>

          {/* Action button & link */}
          <fieldset className="space-y-4 border-t border-[var(--sp-line)] pt-5">
            <legend className="font-compact text-sm font-bold text-[var(--sp-ink)]">Действие и кнопка (необязательно)</legend>
            <p className="text-xs leading-5 text-[var(--sp-ink-tertiary)]">
              Если текст кнопки указан, поверх баннера отобразится фирменная кнопка действия. Если текст кнопки пустой, но указана ссылка — весь баннер будет кликабелен без кнопки.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {(['buttonTextRu', 'buttonTextUz', 'buttonTextEn'] as const).map((name, index) => (
                <label key={name} className="space-y-1.5 text-xs font-bold text-[var(--sp-ink)]">
                  Текст кнопки {['RU', 'UZ', 'EN'][index]}
                  <input
                    {...register(name)}
                    maxLength={80}
                    placeholder={['Смотреть продукцию', 'Mahsulotlarni ko‘rish', 'View products'][index]}
                    aria-invalid={Boolean(errors[name])}
                    className="admin-control mt-1.5 text-sm font-normal"
                  />
                  {errors[name] && <span className="block font-normal text-[var(--sp-danger)]">{errors[name]?.message}</span>}
                </label>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
              <label className="space-y-1.5 text-xs font-bold text-[var(--sp-ink)]">
                Ссылка для перехода
                <input {...register('link')} placeholder="/catalog/produkty-pitaniya или https://…" aria-invalid={Boolean(errors.link)} className="admin-control mt-1.5 text-sm font-normal" />
                {errors.link && <span className="block font-normal text-[var(--sp-danger)]">{errors.link.message || 'Укажите внутренний путь или полный URL.'}</span>}
              </label>
              <label className="space-y-1.5 text-xs font-bold text-[var(--sp-ink)]">
                Порядок
                <input type="number" min="0" {...register('sortOrder', { valueAsNumber: true })} className="admin-control mt-1.5 text-sm font-normal" />
              </label>
            </div>
          </fieldset>

          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 text-sm font-semibold text-[var(--sp-ink)]">
            <input type="checkbox" {...register('active')} className="size-4 accent-[var(--sp-brand)]" />
            Показывать баннер на сайте
          </label>

          <div className="flex justify-end border-t border-[var(--sp-line)] pt-5">
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-5 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
              <Save className="size-4" aria-hidden="true" /> {isSubmitting ? 'Сохранение…' : 'Сохранить баннер'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
