'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, Loader2, Trash2, X } from 'lucide-react';
import type { MediaItem } from '@/lib/media/types';

interface MediaDeleteConfirmModalProps {
  file: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: MediaItem, force: boolean) => Promise<void>;
}

export function MediaDeleteConfirmModal({
  file,
  isOpen,
  onClose,
  onConfirm,
}: MediaDeleteConfirmModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !file) return null;

  const isUsed = file.usage.isUsed;
  const locations = file.usage.locations || [];

  async function handleDelete(force: boolean) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(file, force);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить файл.');
    } finally {
      setBusy(false);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  const isRasterOrSvg = file.contentType.startsWith('image/');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                isUsed ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
              }`}
            >
              {isUsed ? <AlertTriangle className="size-5" /> : <Trash2 className="size-5" />}
            </div>
            <div>
              <h2 id="delete-modal-title" className="font-extended text-lg font-bold text-[var(--sp-ink)]">
                {isUsed ? 'Внимание! Файл используется на сайте' : 'Удалить медиафайл?'}
              </h2>
              <p className="text-xs text-[var(--sp-ink-tertiary)]">
                {file.name} • {formatBytes(file.size)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Закрыть окно"
            className="rounded-lg p-1 text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* File Preview Snippet */}
        <div className="flex items-center gap-4 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-3">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] flex items-center justify-center">
            {isRasterOrSvg ? (
              <Image
                src={file.url}
                alt={file.name}
                fill
                sizes="64px"
                className="object-contain p-1"
                unoptimized
              />
            ) : (
              <span className="text-xs font-bold uppercase text-[var(--sp-ink-tertiary)]">
                {file.name.split('.').pop()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-semibold text-[var(--sp-ink)]">{file.name}</p>
            <p className="truncate text-[var(--sp-ink-muted)] font-mono text-[11px] mt-0.5">
              {file.path}
            </p>
          </div>
        </div>

        {/* Usage Warning Details */}
        {isUsed ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-xs leading-5 text-amber-900 dark:text-amber-200">
              <p className="font-bold">
                Этот файл задействован в {locations.length} {locations.length === 1 ? 'месте' : 'местах'} на сайте!
              </p>
              <p className="mt-1 opacity-90">
                Если вы удалите этот файл, на витрине и в карточках товаров появятся битые изображения.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--sp-ink-secondary)] block">
                Где используется этот файл:
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-[var(--sp-line)] p-2 bg-[var(--sp-surface-inset)]">
                {locations.map((loc, idx) => (
                  <div
                    key={`${loc.type}-${loc.id}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[var(--sp-surface)] px-3 py-2 text-xs border border-[var(--sp-line)]"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-[var(--sp-ink)] truncate block">
                        {loc.title}
                      </span>
                      <span className="text-[11px] text-[var(--sp-ink-tertiary)]">
                        {loc.field} {loc.sku ? `(Арт. ${loc.sku})` : ''}
                      </span>
                    </div>
                    {loc.editUrl ? (
                      <Link
                        href={loc.editUrl}
                        target="_blank"
                        className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--sp-brand)] hover:underline"
                      >
                        Перейти <ExternalLink className="size-3" />
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--sp-ink-secondary)] leading-5">
            Файл не используется ни в одном товаре, категории или баннере. Вы можете безопасно удалить его из хранилища.
          </p>
        )}

        {/* Error message if any */}
        {error && (
          <div className="rounded-lg border border-red-300/40 bg-red-500/10 p-3 text-xs text-[var(--sp-danger)] font-medium">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-[var(--sp-line)]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--sp-line)] px-4 text-xs font-bold text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)] transition-colors"
          >
            Отмена
          </button>
          {isUsed ? (
            <button
              type="button"
              onClick={() => void handleDelete(true)}
              disabled={busy}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
              Удалить принудительно (с риском)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleDelete(false)}
              disabled={busy}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Удалить файл
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
