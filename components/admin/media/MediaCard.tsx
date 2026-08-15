'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Check,
  Copy,
  Download,
  FileText,
  Trash2,
} from 'lucide-react';
import type { MediaItem } from '@/lib/media/types';

interface MediaCardProps {
  file: MediaItem;
  viewMode: 'grid' | 'compact' | 'table';
  onClick: () => void;
  onDelete: () => void;
}

export function MediaCard({ file, viewMode, onClick, onDelete }: MediaCardProps) {
  const [copied, setCopied] = useState(false);

  function copyUrl(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(file.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
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
      window.open(file.url, '_blank');
    }
  }

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete();
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
  const isRasterOrSvg = file.contentType.startsWith('image/');
  const isUsed = file.usage.isUsed;
  const usageCount = file.usage.totalCount;

  // TABLE VIEW ROW
  if (viewMode === 'table') {
    return (
      <tr
        onClick={onClick}
        className="group cursor-pointer border-b border-[var(--sp-line)] hover:bg-[var(--sp-surface-inset)] transition-colors text-xs"
      >
        <td className="p-3 w-12">
          <div className="relative size-10 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface)] overflow-hidden flex items-center justify-center shrink-0">
            {isRasterOrSvg ? (
              <Image
                src={file.url}
                alt={file.name}
                fill
                sizes="40px"
                className="object-contain p-0.5"
                unoptimized
              />
            ) : (
              <span className="text-[9px] font-bold uppercase text-[var(--sp-ink-tertiary)]">{ext}</span>
            )}
          </div>
        </td>

        <td className="p-3 font-semibold text-[var(--sp-ink)]">
          <div className="truncate max-w-[240px] sm:max-w-xs">{file.name}</div>
          <div className="text-[10px] text-[var(--sp-ink-muted)] font-mono truncate max-w-[240px] sm:max-w-xs">
            {file.path}
          </div>
        </td>

        <td className="p-3 text-[var(--sp-ink-secondary)]">
          <span className="inline-flex rounded-md bg-[var(--sp-surface-inset)] px-2 py-0.5 font-medium text-[11px] border border-[var(--sp-line)]">
            {file.folder}
          </span>
        </td>

        <td className="p-3 tabular-nums text-[var(--sp-ink-secondary)] whitespace-nowrap">
          {formatBytes(file.size)}
        </td>

        <td className="p-3">
          {isUsed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-bold text-[11px] text-emerald-700 dark:text-emerald-400 border border-emerald-400/20 whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Используется ({usageCount})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2.5 py-0.5 font-medium text-[11px] text-[var(--sp-ink-muted)] whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-gray-400" />
              Не исп.
            </span>
          )}
        </td>

        <td className="p-3 text-right">
          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={copyUrl}
              title="Копировать URL"
              className="rounded-lg p-1.5 text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface)] hover:text-[var(--sp-brand)] transition-colors"
            >
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              title="Скачать файл"
              className="rounded-lg p-1.5 text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface)] hover:text-[var(--sp-brand)] transition-colors"
            >
              <Download className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              title="Удалить файл"
              className="rounded-lg p-1.5 text-[var(--sp-ink-tertiary)] hover:bg-red-500/10 hover:text-[var(--sp-danger)] transition-colors"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // COMPACT VIEW
  if (viewMode === 'compact') {
    return (
      <div
        onClick={onClick}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-2 transition-all hover:border-[var(--sp-brand)] hover:shadow-md"
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[var(--sp-surface-inset)] flex items-center justify-center">
          {/* Subtle checker pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />
          {isRasterOrSvg ? (
            <Image
              src={file.url}
              alt={file.name}
              fill
              sizes="(max-width: 768px) 33vw, 15vw"
              className="object-contain p-1.5 transition-transform group-hover:scale-105"
              unoptimized
            />
          ) : (
            <FileText className="size-8 text-[var(--sp-ink-tertiary)]" />
          )}

          {/* Top-right Status Dot */}
          <div className="absolute top-1.5 right-1.5">
            {isUsed ? (
              <span className="flex size-2 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm" title={`Используется (${usageCount})`} />
            ) : (
              <span className="flex size-2 rounded-full bg-gray-300 ring-2 ring-white" title="Не используется" />
            )}
          </div>
        </div>

        <div className="mt-2 min-w-0">
          <p className="truncate text-[11px] font-semibold text-[var(--sp-ink)]" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center justify-between text-[10px] text-[var(--sp-ink-muted)] mt-0.5">
            <span>{formatBytes(file.size)}</span>
            <span className="uppercase font-mono">{ext}</span>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT STANDARD GRID CARD
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer overflow-hidden rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] transition-all duration-200 hover:border-[var(--sp-brand)] hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Visual Thumbnail Frame */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--sp-surface-inset)] flex items-center justify-center border-b border-[var(--sp-line)]">
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:14px_14px]" />

        {isRasterOrSvg ? (
          <Image
            src={file.url}
            alt={file.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-[var(--sp-ink-tertiary)]">
            <FileText className="size-12" />
            <span className="text-[10px] font-bold uppercase">{ext}</span>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="rounded-lg bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
            {ext}
          </span>
          <span className="rounded-lg bg-[var(--sp-surface)]/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-semibold text-[var(--sp-ink-secondary)] border border-[var(--sp-line)] shadow-sm">
            {file.folder}
          </span>
        </div>

        {/* Top Right Usage Status */}
        <div className="absolute top-2 right-2">
          {isUsed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
              {usageCount === 1 ? 'В товаре' : `${usageCount} мест`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-600/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white shadow-sm">
              Не исп.
            </span>
          )}
        </div>

        {/* Hover Quick Actions Overlay */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={copyUrl}
            title="Копировать URL"
            className="flex size-8 items-center justify-center rounded-xl bg-white/90 text-gray-800 shadow-md hover:bg-white hover:scale-110 transition-all"
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Скачать файл"
            className="flex size-8 items-center justify-center rounded-xl bg-white/90 text-gray-800 shadow-md hover:bg-white hover:scale-110 transition-all"
          >
            <Download className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            title="Удалить файл"
            className="flex size-8 items-center justify-center rounded-xl bg-red-600 text-white shadow-md hover:bg-red-700 hover:scale-110 transition-all"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Metadata Bottom Card Footer */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-2">
        <div>
          <h3 className="truncate text-xs font-bold text-[var(--sp-ink)]" title={file.name}>
            {file.name}
          </h3>
          <p className="truncate font-mono text-[10px] text-[var(--sp-ink-muted)] mt-0.5">
            {file.path}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[var(--sp-ink-tertiary)] pt-1.5 border-t border-[var(--sp-line)]/50">
          <span className="font-semibold tabular-nums">{formatBytes(file.size)}</span>
          <span className="text-[10px]">
            {new Date(file.createdAt).toLocaleDateString('ru-RU')}
          </span>
        </div>
      </div>
    </div>
  );
}
