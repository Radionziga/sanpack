'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Eye, EyeOff, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import { MediaUploadField, deleteUploadedMedia } from '@/components/admin/MediaUploadField';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AiTranslateButton } from '@/components/admin/AiTranslateButton';
import { SanpackRepository } from '@/lib/repositories/sanpackRepository';
import type { Banner } from '@/types';

const assetUrlSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/(?!\/)/),
]);
const buttonTextSchema = z.string().trim().max(80, 'Текст кнопки должен быть короче 80 символов.');

const bannerFormSchema = z.object({
  titleRu: z.string().trim().min(1, 'Добавьте описание баннера на русском.').max(180),
  titleUz: z.string().trim().min(1, 'Добавьте описание баннера на узбекском.').max(180),
  titleEn: z.string().trim().max(180),
  imageDesktop: assetUrlSchema,
  imageDesktopPath: z.string(),
  imageMobile: assetUrlSchema,
  imageMobilePath: z.string(),
  buttonTextRu: buttonTextSchema,
  buttonTextUz: buttonTextSchema,
  buttonTextEn: buttonTextSchema,
  link: z.union([z.string().url(), z.string().regex(/^\/(?!\/)/), z.literal('')]),
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
    titleRu: banner.titleRu,
    titleUz: banner.titleUz,
    titleEn: banner.titleEn || '',
    imageDesktop: banner.imageDesktop,
    imageDesktopPath: banner.imageDesktopPath || '',
    imageMobile: banner.imageMobile || '',
    imageMobilePath: banner.imageMobilePath || '',
    buttonTextRu: banner.buttonTextRu || '',
    buttonTextUz: banner.buttonTextUz || '',
    buttonTextEn: banner.buttonTextEn || '',
    link: banner.link || '',
    sortOrder: banner.sortOrder,
    active: banner.active,
  };
}

export default function AdminPromotionsPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');

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
  const buttonTextRu = useWatch({ control, name: 'buttonTextRu' });
  const buttonTextUz = useWatch({ control, name: 'buttonTextUz' });
  const buttonTextEn = useWatch({ control, name: 'buttonTextEn' });

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
      const data = await SanpackRepository.getBanners();
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
    SanpackRepository.getBanners()
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
        ? await SanpackRepository.updateBanner(selectedId, payload)
        : await SanpackRepository.saveBanner(payload);
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
        : 'Баннер сохранён и опубликован в конфигурации сайта.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Баннер не сохранён.');
    }
  });

  const removeBanner = async (banner: Banner) => {
    if (!window.confirm(`Удалить баннер «${banner.titleRu}»?`)) return;
    setPageError('');
    setNotice('');
    try {
      await SanpackRepository.deleteBanner(banner.id);
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
        title="Промо-карусель"
        description="Один активный баннер показывается статично. Два и больше автоматически образуют карусель."
        action={(
          <button type="button" onClick={startCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-4 font-compact text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90">
            <Plus className="size-4" aria-hidden="true" /> Новый баннер
          </button>
        )}
      />

      {(pageError || notice) && (
        <p className={`rounded-lg border px-4 py-3 text-sm ${pageError ? 'border-red-300/50 bg-red-500/8 text-[var(--sp-danger)]' : 'border-emerald-500/30 bg-emerald-500/8 text-[var(--sp-success)]'}`} role={pageError ? 'alert' : 'status'}>
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
              <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">Загрузите первый desktop-баннер — он сразу станет статичным промо-блоком.</p>
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
                      <span className="line-clamp-2 text-xs font-bold text-[var(--sp-ink)]">{banner.titleRu}</span>
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
              <p className="mt-1 text-xs text-[var(--sp-ink-tertiary)]">Текст нужен для доступности и поиска; визуальный текст размещайте в самом макете.</p>
            </div>
            {selectedId && (
              <button type="button" onClick={() => { const banner = banners.find((item) => item.id === selectedId); if (banner) void removeBanner(banner); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300/40 px-3 text-xs font-bold text-[var(--sp-danger)] hover:bg-red-500/8">
                <Trash2 className="size-4" aria-hidden="true" /> Удалить
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {(['titleRu', 'titleUz', 'titleEn'] as const).map((name, index) => (
              <label key={name} className="space-y-1.5 text-xs font-bold text-[var(--sp-ink)]">
                Описание {['RU', 'UZ', 'EN'][index]}{index < 2 ? ' *' : ''}
                <input {...register(name)} aria-invalid={Boolean(errors[name])} className="admin-control mt-1.5 text-sm font-normal" />
                {errors[name] && <span className="block font-normal text-[var(--sp-danger)]">{errors[name]?.message}</span>}
              </label>
            ))}
          </div>

          <AiTranslateButton fields={[
            {
              key: 'description', label: 'Описание баннера', values: { ru: titleRu, uz: titleUz, en: titleEn },
              onChange: (language, value) => setValue(`title${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : 'En'}`, value, { shouldDirty: true, shouldValidate: true }),
            },
            {
              key: 'buttonText', label: 'Текст кнопки', values: { ru: buttonTextRu, uz: buttonTextUz, en: buttonTextEn },
              onChange: (language, value) => setValue(`buttonText${language === 'ru' ? 'Ru' : language === 'uz' ? 'Uz' : 'En'}`, value, { shouldDirty: true, shouldValidate: true }),
            },
          ]} compact />

          <MediaUploadField kind="banner-desktop" label="Desktop-баннер *" recommendation="Рекомендуется 1920×560 px · 24:7" value={desktopImage} onUploaded={(media) => {
            void cleanupStagedPath(desktopPath, persistedBanner?.imageDesktopPath);
            setValue('imageDesktop', media.url, { shouldValidate: true, shouldDirty: true });
            setValue('imageDesktopPath', media.path, { shouldDirty: true });
          }} />
          {errors.imageDesktop && <p className="text-xs text-[var(--sp-danger)]" role="alert">Загрузите desktop-баннер.</p>}

          <MediaUploadField kind="banner-mobile" label="Мобильный баннер *" recommendation="Отдельный горизонтальный макет 960×540 px · 16:9" value={mobileImage || undefined} onUploaded={(media) => {
            void cleanupStagedPath(mobilePath, persistedBanner?.imageMobilePath);
            setValue('imageMobile', media.url, { shouldValidate: true, shouldDirty: true });
            setValue('imageMobilePath', media.path, { shouldDirty: true });
          }} onClear={() => {
            void cleanupStagedPath(mobilePath, persistedBanner?.imageMobilePath);
            setValue('imageMobile', '', { shouldValidate: true, shouldDirty: true });
            setValue('imageMobilePath', '', { shouldDirty: true });
          }} />
          {errors.imageMobile && <p className="text-xs text-[var(--sp-danger)]" role="alert">Загрузите отдельный мобильный баннер.</p>}

          <fieldset className="space-y-4 border-t border-[var(--sp-line)] pt-5">
            <legend className="font-compact text-sm font-bold text-[var(--sp-ink)]">Действие баннера</legend>
            <p className="text-xs leading-5 text-[var(--sp-ink-tertiary)]">
              Кнопка показывается на компьютерах. На телефоне весь баннер открывает указанную ссылку — без отдельной кнопки поверх изображения.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {(['buttonTextRu', 'buttonTextUz', 'buttonTextEn'] as const).map((name, index) => (
                <label key={name} className="space-y-1.5 text-xs font-bold text-[var(--sp-ink)]">
                  Текст кнопки {['RU', 'UZ', 'EN'][index]}
                  <input
                    {...register(name)}
                    maxLength={80}
                    placeholder={['Перейти в каталог', 'Katalogni ko‘rish', 'View catalog'][index]}
                    aria-invalid={Boolean(errors[name])}
                    className="admin-control mt-1.5 text-sm font-normal"
                  />
                  {errors[name] && <span className="block font-normal text-[var(--sp-danger)]">{errors[name]?.message}</span>}
                </label>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
              <label className="space-y-1.5 text-xs font-bold text-[var(--sp-ink)]">
                Ссылка кнопки и мобильного баннера
                <input {...register('link')} placeholder="/catalog или https://…" aria-invalid={Boolean(errors.link)} className="admin-control mt-1.5 text-sm font-normal" />
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
