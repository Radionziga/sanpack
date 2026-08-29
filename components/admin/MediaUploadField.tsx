'use client';

import Image from 'next/image';
import { useId, useState } from 'react';
import {
  Check,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { ImageCropEditor } from '@/components/admin/ImageCropEditor';
import { MAX_MEDIA_FILE_SIZE, type MediaKind } from '@/lib/media/presets';
import { parseJsonResponse } from '@/lib/http/parseJsonResponse';

export type { MediaKind } from '@/lib/media/presets';

export interface UploadedMedia {
  url: string;
  path: string;
  width: number;
  height: number;
  size: number;
  originalWidth: number;
  originalHeight: number;
}

export interface ProductImageGenerationContext {
  title: string;
  category?: string;
  brand?: string;
  description?: string;
  attributes?: Record<string, string | number | boolean | string[]>;
}

async function dataUrlToFile(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
  return new File([blob], `gemini-product-${Date.now()}.${extension}`, {
    type: blob.type || 'image/png',
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export async function deleteUploadedMedia(path: string) {
  const response = await fetch('/api/admin/media', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  await parseJsonResponse<{ success: boolean }>(response, 'Не удалось удалить изображение.');
}

export function MediaUploadField({
  kind,
  label,
  recommendation,
  value,
  onUploaded,
  onClear,
  optional = false,
  aiContext,
}: {
  kind: MediaKind;
  label: string;
  recommendation: string;
  value?: string;
  onUploaded: (media: UploadedMedia) => void;
  onClear?: () => void;
  optional?: boolean;
  aiContext?: ProductImageGenerationContext;
}) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<UploadedMedia | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [generationNote, setGenerationNote] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const generationBlockedByBrand = kind === 'product' && Boolean(aiContext?.brand?.trim());
  const previewAspect = kind === 'banner-desktop'
    ? 'aspect-[24/7] sm:col-span-2 sm:w-full'
    : kind === 'banner-mobile'
      ? 'aspect-square'
      : kind === 'product'
        ? 'aspect-square'
        : kind === 'category-card'
          ? 'aspect-[5/3]'
        : 'aspect-[4/3]';

  const upload = async (file: File) => {
    setError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.set('kind', kind);
    formData.set('file', file);

    try {
      const response = await fetch('/api/admin/media', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });
      const media = await parseJsonResponse<UploadedMedia>(response, 'Не удалось загрузить изображение.');
      setDetails(media);
      onUploaded(media);
      return true;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не удалось загрузить изображение.');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const selectFile = (file?: File) => {
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Выберите изображение в формате JPEG, PNG или WebP.');
      return;
    }
    if (file.size === 0 || file.size > MAX_MEDIA_FILE_SIZE) {
      setError('Размер файла должен быть меньше 15 МБ.');
      return;
    }
    setPendingFile(file);
  };

  const generateImage = async () => {
    if (!aiContext?.title.trim()) {
      setError('Сначала укажите название товара — оно нужно для создания изображения.');
      return;
    }
    if (generationBlockedByBrand) {
      setError('Для брендированного товара сначала загрузите исходную фотографию. Создавать упаковку с логотипом без исходника небезопасно для фирменного дизайна.');
      return;
    }
    setError('');
    setIsGenerating(true);
    try {
      const response = await fetch('/api/admin/gemini/product-image', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...aiContext, note: generationNote }),
      });
      const result = await parseJsonResponse<{ image: string }>(
        response,
        'Не удалось создать изображение. Попробуйте ещё раз.',
      );
      setGeneratedImage(result.image);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Не удалось создать изображение.');
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptGeneratedImage = async () => {
    if (!generatedImage) return;
    setError('');
    try {
      setPendingFile(await dataUrlToFile(generatedImage));
      setGeneratedImage('');
    } catch {
      setError('Предпросмотр не удалось подготовить. Создайте изображение ещё раз.');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="font-compact text-xs font-bold text-[var(--sp-ink)]">
          {label}{optional ? ' · необязательно' : ''}
        </label>
        <span className="text-[11px] text-[var(--sp-ink-tertiary)]">{recommendation}</span>
      </div>

      {pendingFile ? (
        <ImageCropEditor
          key={`${pendingFile.name}:${pendingFile.size}:${pendingFile.lastModified}`}
          file={pendingFile}
          kind={kind}
          onCancel={() => setPendingFile(null)}
          onConfirm={async (file) => {
            if (await upload(file)) setPendingFile(null);
          }}
        />
      ) : (
        <div className="grid gap-3 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-3 sm:grid-cols-[148px_1fr]">
          <div className={`relative overflow-hidden rounded-[var(--sp-radius-control-inner)] border border-[var(--sp-line)] bg-[var(--sp-surface)] ${previewAspect}`}>
          {value ? (
            <Image src={value} alt="Предпросмотр изображения" fill sizes="148px" className="object-contain" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--sp-ink-muted)]">
              <ImagePlus className="size-6" aria-hidden="true" />
              <span className="text-[10px]">Нет файла</span>
            </div>
          )}
          </div>

          <div className={`flex min-w-0 flex-col justify-center ${kind === 'banner-desktop' ? 'sm:col-span-2' : ''}`}>
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isUploading}
            onChange={(event) => {
              selectFile(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
            className="sr-only"
          />
          <label
            htmlFor={inputId}
            aria-disabled={isUploading}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-control-border)] bg-[var(--sp-surface)] px-4 font-compact text-xs font-bold text-[var(--sp-ink)] transition-colors hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            {isUploading ? (
              <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Обработка…</>
            ) : value ? (
              <><RotateCcw className="size-4" aria-hidden="true" /> Заменить файл</>
            ) : (
              <><ImagePlus className="size-4" aria-hidden="true" /> Выбрать изображение</>
            )}
          </label>
          {optional && value && onClear && (
            <button
              type="button"
              onClick={() => {
                setDetails(null);
                setError('');
                onClear();
              }}
              className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-red-300/40 px-3 font-compact text-xs font-bold text-[var(--sp-danger)] hover:bg-red-500/8"
            >
              <Trash2 className="size-4" aria-hidden="true" /> Удалить изображение
            </button>
          )}
          <p className="mt-2 text-[11px] leading-4 text-[var(--sp-ink-tertiary)]">
            JPEG, PNG или WebP, до 15 МБ. После выбора можно настроить кадр, положение и масштаб. Готовый файл сохраняется в WebP.
          </p>
          {details && (
            <p className="mt-1 text-[11px] text-[var(--sp-success)]" aria-live="polite">
              Готово: {details.width}×{details.height}, {formatSize(details.size)}
              {' · '}исходник {details.originalWidth}×{details.originalHeight}
            </p>
          )}
          {error && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-[var(--sp-danger)]" role="alert">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          </div>

          {kind === 'product' && aiContext ? (
            <section className="border-t border-[var(--sp-line)] pt-3 sm:col-span-2" aria-labelledby={`${inputId}-ai-title`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 id={`${inputId}-ai-title`} className="flex items-center gap-2 text-sm font-bold text-[var(--sp-ink)]">
                    <Sparkles className="size-4 text-[var(--sp-brand)]" aria-hidden="true" />
                    Создать изображение с ИИ
                  </h3>
                  <p className="mt-1 max-w-2xl text-[11px] leading-4 text-[var(--sp-ink-tertiary)]">
                    Сервис сам использует название, категорию и характеристики. Получится квадратная фотография товара на белом фоне без текста и логотипов.
                  </p>
                </div>
                {!generatedImage ? (
                  <button
                    type="button"
                    onClick={() => void generateImage()}
                    disabled={isGenerating || !aiContext.title.trim() || generationBlockedByBrand}
                    className="admin-button-secondary min-h-10 shrink-0 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isGenerating ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
                    {isGenerating ? 'Создаём…' : 'Создать изображение'}
                  </button>
                ) : null}
              </div>

              {generationBlockedByBrand ? (
                <p className="mt-3 rounded-[var(--sp-radius-control)] border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-[11px] leading-4 text-amber-800">
                  Для брендированного товара загрузите исходную фотографию. ИИ не будет придумывать логотип, этикетку или фирменную упаковку с нуля.
                </p>
              ) : null}

              <label className="mt-3 block text-[11px] font-semibold text-[var(--sp-ink-secondary)]">
                Пожелание к изображению · необязательно
                <textarea
                  rows={2}
                  value={generationNote}
                  onChange={(event) => setGenerationNote(event.target.value)}
                  maxLength={800}
                  placeholder="Например: показать небольшую аккуратную горсть спелой клубники"
                  className="admin-control mt-1.5 resize-y text-xs font-normal"
                />
              </label>

              {generatedImage ? (
                <div className="mt-3 grid gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-3 sm:grid-cols-[180px_1fr]">
                  <div className="relative aspect-square overflow-hidden rounded-[var(--sp-radius-control-inner)] bg-white">
                    <Image src={generatedImage} alt="Созданный ИИ вариант товара" fill unoptimized sizes="180px" className="object-contain" />
                  </div>
                  <div className="flex min-w-0 flex-col justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[var(--sp-ink)]">Временный предпросмотр</p>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--sp-ink-tertiary)]">
                        Он ещё не загружен в хранилище. Используйте вариант, чтобы проверить кадр, масштаб и только затем сохранить.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button type="button" onClick={() => void acceptGeneratedImage()} className="admin-button-primary min-h-10">
                        <Check className="size-4" aria-hidden="true" /> Использовать
                      </button>
                      <button type="button" onClick={() => void generateImage()} disabled={isGenerating} className="admin-button-secondary min-h-10 disabled:opacity-45">
                        {isGenerating ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
                        Создать ещё
                      </button>
                      <button type="button" onClick={() => setGeneratedImage('')} className="admin-button-secondary min-h-10">
                        <X className="size-4" aria-hidden="true" /> Отменить
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      )}
      {pendingFile && error ? (
        <p className="flex items-start gap-1.5 text-[11px] text-[var(--sp-danger)]" role="alert">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
