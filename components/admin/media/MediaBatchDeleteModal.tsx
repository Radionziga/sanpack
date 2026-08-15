'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, ExternalLink, Loader2, ShieldCheck, Trash2, X } from 'lucide-react';
import type { MediaItem } from '@/lib/media/types';
import type { BatchDeleteResult } from '@/lib/media/storageService';

interface MediaBatchDeleteModalProps {
  files: MediaItem[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmBatch: (paths: string[], force: boolean) => Promise<BatchDeleteResult>;
  onSuccess: (deletedPaths: string[]) => void;
}

export function MediaBatchDeleteModal({
  files,
  isOpen,
  onClose,
  onConfirmBatch,
  onSuccess,
}: MediaBatchDeleteModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || files.length === 0) return null;

  const usedFiles = files.filter((f) => f.usage.isUsed);
  const safeFiles = files.filter((f) => !f.usage.isUsed);
  const totalSizeBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function handleBatchDelete(force: boolean, targetPaths?: string[]) {
    const paths = targetPaths || files.map((f) => f.path);
    if (paths.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const res = await onConfirmBatch(paths, force);
      if (res.deleted.length > 0) {
        onSuccess(res.deleted);
      }
      if (res.failed.length > 0) {
        setError(`Не удалось удалить ${res.failed.length} файл(ов): ${res.failed.map((f) => f.error).join(', ')}`);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при массовом удалении файлов.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                usedFiles.length > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
              }`}
            >
              {usedFiles.length > 0 ? <AlertTriangle className="size-6" /> : <Trash2 className="size-6" />}
            </div>
            <div>
              <h2 id="batch-delete-modal-title" className="font-extended text-lg font-bold text-[var(--sp-ink)]">
                {usedFiles.length > 0
                  ? `Внимание: часть файлов используется на сайте`
                  : `Удалить выбранные медиафайлы?`}
              </h2>
              <p className="text-xs text-[var(--sp-ink-tertiary)]">
                Выбрано: {files.length} файл(ов) • Общий объём: {formatBytes(totalSizeBytes)}
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

        {/* Warning if any files are in use */}
        {usedFiles.length > 0 && (
          <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-xs leading-5 text-amber-900 dark:text-amber-200 space-y-2">
            <p className="font-bold">
              {usedFiles.length} из {files.length} выбранных файлов привязаны к товарам, баннерам или категориям!
            </p>
            <p className="opacity-90">
              Если удалить используемые файлы принудительно, на витрине и в каталоге появятся пустые или битые изображения.
            </p>
          </div>
        )}

        {/* Files Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--sp-ink-secondary)]">
            <span>Список файлов ({files.length})</span>
            <div className="flex items-center gap-3 text-[11px] font-normal">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                ✓ Свободных: {safeFiles.length}
              </span>
              {usedFiles.length > 0 && (
                <span className="text-amber-700 dark:text-amber-400 font-bold">
                  ⚠ Используемых: {usedFiles.length}
                </span>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 rounded-xl border border-[var(--sp-line)] p-2.5 bg-[var(--sp-surface-inset)]">
            {files.map((file) => {
              const isUsed = file.usage.isUsed;
              const isImage = file.contentType.startsWith('image/');
              return (
                <div
                  key={file.id || file.path}
                  className={`flex items-start gap-3 rounded-lg bg-[var(--sp-surface)] p-2.5 text-xs border transition-colors ${
                    isUsed ? 'border-amber-400/30' : 'border-[var(--sp-line)]'
                  }`}
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] flex items-center justify-center">
                    {isImage ? (
                      <Image
                        src={file.url}
                        alt={file.name}
                        fill
                        sizes="40px"
                        className="object-contain p-0.5"
                        unoptimized
                      />
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-[var(--sp-ink-tertiary)]">
                        {file.name.split('.').pop()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-[var(--sp-ink)]">{file.name}</p>
                      <span className="text-[11px] text-[var(--sp-ink-muted)] shrink-0 font-mono">
                        {formatBytes(file.size)}
                      </span>
                    </div>

                    {isUsed ? (
                      <div className="mt-1 space-y-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                          ⚠ Используется: {file.usage.locations[0]?.title || 'На сайте'}
                          {file.usage.locations.length > 1 ? ` (+ ещё ${file.usage.locations.length - 1})` : ''}
                        </span>
                        {file.usage.locations[0]?.editUrl && (
                          <Link
                            href={file.usage.locations[0].editUrl}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[10px] text-[var(--sp-brand)] hover:underline ml-2"
                          >
                            Просмотреть <ExternalLink className="size-2.5" />
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                        ✓ Безопасно к удалению
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-300/40 bg-red-500/10 p-3 text-xs text-[var(--sp-danger)] font-medium">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[var(--sp-line)]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--sp-line)] px-4 text-xs font-bold text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)] transition-colors"
          >
            Отмена
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {usedFiles.length > 0 && safeFiles.length > 0 && (
              <button
                type="button"
                onClick={() => void handleBatchDelete(false, safeFiles.map((f) => f.path))}
                disabled={busy}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-2xs disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                Удалить только свободные ({safeFiles.length})
              </button>
            )}

            {usedFiles.length > 0 ? (
              <button
                type="button"
                onClick={() => void handleBatchDelete(true)}
                disabled={busy}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
                Удалить все {files.length} шт. (принудительно)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleBatchDelete(false)}
                disabled={busy}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Удалить выбранные ({files.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
