'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Folder,
  Globe,
  HardDrive,
  Info,
  Trash2,
  X,
  Calendar,
} from 'lucide-react';
import type { MediaItem } from '@/lib/media/types';

interface MediaDetailModalProps {
  file: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteRequest: (file: MediaItem) => void;
}

export function MediaDetailModal({
  file,
  isOpen,
  onClose,
  onDeleteRequest,
}: MediaDetailModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  if (!isOpen || !file) return null;

  const isRasterOrSvg = file.contentType.startsWith('image/');
  const locations = file.usage.locations || [];
  const isUsed = file.usage.isUsed;

  function copyToClipboard(text: string, type: 'url' | 'path') {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  async function handleDownload() {
    if (!file) return;
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open directly in new tab
      window.open(file.url, '_blank');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-[var(--sp-line)] px-5 py-3.5 bg-[var(--sp-surface)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--sp-brand)]/10 text-[var(--sp-brand)] font-bold text-xs">
              {file.name.split('.').pop()?.toUpperCase()}
            </span>
            <h2 id="detail-modal-title" className="truncate font-extended text-sm sm:text-base font-bold text-[var(--sp-ink)]">
              {file.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="rounded-lg p-1.5 text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[var(--sp-line)]">
          {/* Left / Top: Visual Preview */}
          <div className="md:col-span-7 p-5 sm:p-6 flex flex-col items-center justify-center bg-[var(--sp-surface-inset)] min-h-[280px]">
            <div className="relative w-full aspect-square max-h-[420px] rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] overflow-hidden shadow-inner flex items-center justify-center">
              {/* Checkerboard background for transparency */}
              <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
              {isRasterOrSvg ? (
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain p-3"
                  unoptimized
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-[var(--sp-ink-tertiary)]">
                  <FileText className="size-16 stroke-[1.5]" />
                  <span className="text-xs font-bold uppercase">{file.contentType}</span>
                </div>
              )}
            </div>

            {/* Quick Action Pills Under Preview */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 w-full">
              <button
                type="button"
                onClick={() => void handleDownload()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3.5 py-2 text-xs font-bold text-[var(--sp-ink)] hover:border-[var(--sp-brand)] hover:text-[var(--sp-brand)] shadow-sm transition-all"
              >
                <Download className="size-3.5" />
                Скачать оригинал
              </button>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] px-3.5 py-2 text-xs font-bold text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)] shadow-sm transition-all"
              >
                <Globe className="size-3.5" />
                Открыть в новой вкладке
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* Right / Bottom: File Info & Usage Analysis */}
          <div className="md:col-span-5 p-5 sm:p-6 space-y-5 bg-[var(--sp-surface)]">
            {/* Usage Status Pill Banner */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--sp-ink-muted)] block mb-1.5">
                Статус использования
              </span>
              {isUsed ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Используется на сайте ({locations.length} {locations.length === 1 ? 'место' : 'мест'})
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3.5 py-2.5 text-xs font-bold text-[var(--sp-ink-tertiary)]">
                  <span className="flex size-2 rounded-full bg-gray-400" />
                  Не используется на сайте (сирота)
                </div>
              )}
            </div>

            {/* Technical Metadata */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--sp-ink-muted)] block">
                Свойства файла
              </span>

              <div className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--sp-ink-tertiary)] flex items-center gap-1.5">
                    <HardDrive className="size-3.5" /> Размер
                  </span>
                  <span className="font-bold text-[var(--sp-ink)] tabular-nums">
                    {formatBytes(file.size)} ({file.size.toLocaleString('ru-RU')} Б)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--sp-ink-tertiary)] flex items-center gap-1.5">
                    <Folder className="size-3.5" /> Папка
                  </span>
                  <span className="font-semibold text-[var(--sp-brand)]">
                    media/{file.folder}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--sp-ink-tertiary)] flex items-center gap-1.5">
                    <Info className="size-3.5" /> Тип (MIME)
                  </span>
                  <span className="font-mono text-[11px] text-[var(--sp-ink-secondary)]">
                    {file.contentType}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--sp-ink-tertiary)] flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> Загружен
                  </span>
                  <span className="text-[var(--sp-ink-secondary)] tabular-nums">
                    {formatDate(file.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Storage Path with Copy */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--sp-ink-muted)] block">
                Путь в хранилище (Storage Path)
              </span>
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 py-2 text-xs">
                <span className="font-mono text-[11px] text-[var(--sp-ink-secondary)] truncate flex-1 select-all">
                  {file.path}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(file.path, 'path')}
                  aria-label="Копировать путь"
                  className="rounded-lg p-1 text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface)] hover:text-[var(--sp-ink)] transition-colors"
                >
                  {copiedPath ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Public URL with Copy */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--sp-ink-muted)] block">
                Публичный URL
              </span>
              <div className="flex items-center gap-1.5 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 py-2 text-xs">
                <span className="font-mono text-[11px] text-[var(--sp-ink-secondary)] truncate flex-1 select-all">
                  {file.url}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(file.url, 'url')}
                  aria-label="Копировать URL"
                  className="rounded-lg p-1 text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface)] hover:text-[var(--sp-ink)] transition-colors"
                >
                  {copiedUrl ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Usage Locations List */}
            {isUsed && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--sp-ink-muted)] block">
                  Связанные объекты ({locations.length})
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
            )}
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-between border-t border-[var(--sp-line)] px-5 py-3.5 bg-[var(--sp-surface)]">
          <button
            type="button"
            onClick={() => onDeleteRequest(file)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-300/40 bg-red-500/10 px-3.5 py-2 text-xs font-bold text-[var(--sp-danger)] hover:bg-red-500/20 transition-all"
          >
            <Trash2 className="size-4" />
            Удалить файл
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--sp-line)] px-5 py-2 text-xs font-bold text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)] transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
