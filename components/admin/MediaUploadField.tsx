'use client';

import Image from 'next/image';
import { useId, useState } from 'react';
import { ImagePlus, LoaderCircle, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';

export type MediaKind = 'banner-desktop' | 'banner-mobile' | 'category';

export interface UploadedMedia {
  url: string;
  path: string;
  width: number;
  height: number;
  size: number;
  originalWidth: number;
  originalHeight: number;
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
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Не удалось удалить изображение.');
  }
}

export function MediaUploadField({
  kind,
  label,
  recommendation,
  value,
  onUploaded,
  onClear,
  optional = false,
}: {
  kind: MediaKind;
  label: string;
  recommendation: string;
  value?: string;
  onUploaded: (media: UploadedMedia) => void;
  onClear?: () => void;
  optional?: boolean;
}) {
  const inputId = useId();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<UploadedMedia | null>(null);
  const previewAspect = kind === 'banner-desktop'
    ? 'aspect-[24/7] sm:col-span-2 sm:w-full'
    : kind === 'banner-mobile'
      ? 'aspect-square'
      : 'aspect-[4/3]';

  const upload = async (file?: File) => {
    if (!file) return;
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
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Не удалось загрузить изображение.');
      const media = body as UploadedMedia;
      setDetails(media);
      onUploaded(media);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не удалось загрузить изображение.');
    } finally {
      setIsUploading(false);
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

      <div className="grid gap-3 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-3 sm:grid-cols-[148px_1fr]">
        <div className={`relative overflow-hidden rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] ${previewAspect}`}>
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
              void upload(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
            className="sr-only"
          />
          <label
            htmlFor={inputId}
            aria-disabled={isUploading}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-surface)] px-4 font-compact text-xs font-bold text-[var(--sp-ink)] transition-colors hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] aria-disabled:pointer-events-none aria-disabled:opacity-60"
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
              className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-300/40 px-3 font-compact text-xs font-bold text-[var(--sp-danger)] hover:bg-red-500/8"
            >
              <Trash2 className="size-4" aria-hidden="true" /> Удалить изображение
            </button>
          )}
          <p className="mt-2 text-[11px] leading-4 text-[var(--sp-ink-tertiary)]">
            JPEG, PNG или WebP, до 15 МБ. Сервер проверяет пропорции, приводит макет к нужному размеру и сохраняет оптимизированный WebP.
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
      </div>
    </div>
  );
}
