'use client';

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Folder, Image as ImageIcon } from 'lucide-react';
import type { MediaItem } from '@/lib/media/types';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newFiles: MediaItem[]) => void;
  defaultFolder?: string;
}

interface UploadFileItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const folders = [
  { key: 'products', label: 'Товары', icon: '📦' },
  { key: 'categories', label: 'Категории', icon: '📁' },
  { key: 'banners', label: 'Баннеры', icon: '🖼️' },
  { key: 'clients', label: 'Клиенты', icon: '👥' },
  { key: 'documents', label: 'Документы', icon: '📄' },
  { key: 'uploads', label: 'Общие файлы', icon: '☁️' },
] as const;

export function MediaUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  defaultFolder = 'products',
}: MediaUploadModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>(defaultFolder);
  const [items, setItems] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function addFiles(files: FileList | File[]) {
    const newItems: UploadFileItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
      newItems.push({
        id: `${file.name}-${Date.now()}-${i}`,
        file,
        previewUrl,
        status: 'pending',
      });
    }
    setItems((prev) => [...prev, ...newItems]);
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  async function uploadAll() {
    if (items.length === 0 || isUploading) return;
    setIsUploading(true);

    const uploadedResults: MediaItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'success') continue;

      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'uploading', errorMessage: undefined } : it))
      );

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('folder', selectedFolder);

        const response = await fetch('/api/admin/media', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || `Ошибка сервера (${response.status})`);
        }

        const uploadedMediaItem: MediaItem = await response.json();
        uploadedResults.push(uploadedMediaItem);

        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'success' } : it))
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'error',
                  errorMessage: err instanceof Error ? err.message : 'Ошибка загрузки',
                }
              : it
          )
        );
      }
    }

    setIsUploading(false);
    if (uploadedResults.length > 0) {
      onUploadSuccess(uploadedResults);
    }
  }

  const allSuccess = items.length > 0 && items.every((i) => i.status === 'success');
  const pendingCount = items.filter((i) => i.status === 'pending' || i.status === 'error').length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--sp-brand)]/10 text-[var(--sp-brand)]">
              <Upload className="size-5" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="font-extended text-lg font-bold text-[var(--sp-ink)]">
                Загрузка медиафайлов
              </h2>
              <p className="text-xs text-[var(--sp-ink-tertiary)]">
                Поддерживаются WebP, PNG, JPEG, SVG, GIF, PDF (до 15 МБ)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Закрыть окно"
            className="rounded-lg p-1 text-[var(--sp-ink-tertiary)] hover:bg-[var(--sp-surface-inset)] hover:text-[var(--sp-ink)] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Target Folder Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[var(--sp-ink-secondary)] flex items-center gap-1.5">
            <Folder className="size-3.5 text-[var(--sp-brand)]" />
            Целевая папка в хранилище:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {folders.map((f) => {
              const active = selectedFolder === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedFolder(f.key)}
                  disabled={isUploading}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold text-left transition-all ${
                    active
                      ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)]/10 text-[var(--sp-brand)] shadow-sm'
                      : 'border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)] hover:border-[var(--sp-brand)]/40 hover:text-[var(--sp-ink)]'
                  }`}
                >
                  <span className="text-base">{f.icon}</span>
                  <span className="truncate">{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[var(--sp-brand)] bg-[var(--sp-brand)]/5 scale-[0.99]'
              : 'border-[var(--sp-line)] bg-[var(--sp-surface-inset)] hover:border-[var(--sp-brand)]/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-line)] shadow-sm mb-3">
            <ImageIcon className="size-6 text-[var(--sp-brand)]" />
          </div>
          <p className="text-sm font-bold text-[var(--sp-ink)]">
            Перетащите файлы сюда или <span className="text-[var(--sp-brand)] underline">выберите с диска</span>
          </p>
          <p className="text-xs text-[var(--sp-ink-muted)] mt-1">
            Можно выбрать сразу несколько картинок или документов
          </p>
        </div>

        {/* Selected Files Queue */}
        {items.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-2 max-h-48 rounded-xl border border-[var(--sp-line)] p-2 bg-[var(--sp-surface-inset)]">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-[var(--sp-surface)] p-2.5 border border-[var(--sp-line)] text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="size-8 rounded object-cover border border-[var(--sp-line)]"
                    />
                  ) : (
                    <div className="size-8 rounded bg-[var(--sp-surface-inset)] flex items-center justify-center font-bold text-[10px] uppercase text-[var(--sp-ink-tertiary)] border border-[var(--sp-line)]">
                      {item.file.name.split('.').pop()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--sp-ink)]">{item.file.name}</p>
                    <p className="text-[11px] text-[var(--sp-ink-muted)]">
                      {(item.file.size / 1024).toFixed(1)} КБ
                      {item.errorMessage && (
                        <span className="text-[var(--sp-danger)] ml-2 font-semibold">
                          • {item.errorMessage}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'uploading' && (
                    <Loader2 className="size-4 animate-spin text-[var(--sp-brand)]" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="size-4 text-[var(--sp-danger)]" />
                  )}
                  {item.status === 'pending' && !isUploading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                      className="p-1 text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-danger)]"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--sp-line)]">
          <div className="text-xs text-[var(--sp-ink-tertiary)]">
            {items.length > 0
              ? `Выбрано: ${items.length} ${items.length === 1 ? 'файл' : 'файлов'}`
              : 'Файлы не выбраны'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--sp-line)] px-4 text-xs font-bold text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)] transition-colors"
            >
              {allSuccess ? 'Закрыть' : 'Отмена'}
            </button>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => void uploadAll()}
                disabled={isUploading}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--sp-brand)] px-5 text-xs font-bold text-[var(--sp-on-brand)] hover:brightness-105 transition-all shadow-sm disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Загрузка…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Загрузить ({pendingCount})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
