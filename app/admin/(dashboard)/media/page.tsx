'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  HardDrive,
  Images,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import type { MediaFolderKey, MediaItem, MediaLibraryResponse } from '@/lib/media/types';
import type { BatchDeleteResult } from '@/lib/media/storageService';
import { MediaBatchDeleteModal } from '@/components/admin/media/MediaBatchDeleteModal';
import { MediaCard } from '@/components/admin/media/MediaCard';
import { MediaDeleteConfirmModal } from '@/components/admin/media/MediaDeleteConfirmModal';
import { MediaDetailModal } from '@/components/admin/media/MediaDetailModal';
import { MediaUploadModal } from '@/components/admin/media/MediaUploadModal';
import { CheckSquare, Square, Trash2 } from 'lucide-react';

type SortOption = 'date_desc' | 'date_asc' | 'size_desc' | 'size_asc' | 'name_asc';
type UsageFilter = 'all' | 'used' | 'unused';

export default function MediaLibraryPage() {
  const [data, setData] = useState<MediaLibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection State
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);

  // Filters & State
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<MediaFolderKey>('all');
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'compact' | 'table'>('grid');

  // Modals state
  const [detailFile, setDetailFile] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  function showNotification(msg: string) {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  }

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/media');
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Ошибка загрузки (${response.status})`);
      }
      const result: MediaLibraryResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить хранилище медиафайлов.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/media')
      .then((response) => {
        if (!response.ok) throw new Error(`Ошибка загрузки (${response.status})`);
        return response.json();
      })
      .then((result: MediaLibraryResponse) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить хранилище медиафайлов.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Handle Safe Deletion
  async function handleConfirmDelete(file: MediaItem, force: boolean) {
    const response = await fetch('/api/admin/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file.path, force }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || 'Не удалось удалить файл.');
    }

    // Remove file locally
    setData((prev) => {
      if (!prev) return null;
      const updatedFiles = prev.files.filter((f) => f.id !== file.id);
      const isUsed = file.usage.isUsed;
      return {
        files: updatedFiles,
        stats: {
          ...prev.stats,
          totalCount: updatedFiles.length,
          totalSizeBytes: Math.max(0, prev.stats.totalSizeBytes - file.size),
          usedCount: Math.max(0, prev.stats.usedCount - (isUsed ? 1 : 0)),
          unusedCount: Math.max(0, prev.stats.unusedCount - (isUsed ? 0 : 1)),
          folderCounts: {
            ...prev.stats.folderCounts,
            [file.folder]: Math.max(0, (prev.stats.folderCounts[file.folder] || 1) - 1),
            all: Math.max(0, (prev.stats.folderCounts.all || 1) - 1),
          },
        },
      };
    });

    if (detailFile?.id === file.id) {
      setDetailFile(null);
    }

    setSelectedPaths((prev) => {
      const next = new Set(prev);
      next.delete(file.path);
      return next;
    });

    showNotification(`Файл «${file.name}» успешно удалён.`);
  }

  // Handle Batch Deletion
  async function handleConfirmBatchDelete(paths: string[], force: boolean): Promise<BatchDeleteResult> {
    const response = await fetch('/api/admin/media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, force }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || 'Не удалось выполнить массовое удаление.');
    }

    const result: BatchDeleteResult = await response.json();
    return result;
  }

  function handleBatchSuccess(deletedPaths: string[]) {
    const deletedSet = new Set(deletedPaths);

    setData((prev) => {
      if (!prev) return null;
      const updatedFiles = prev.files.filter((f) => !deletedSet.has(f.path));
      const deletedFiles = prev.files.filter((f) => deletedSet.has(f.path));
      const deletedSize = deletedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
      const deletedUsed = deletedFiles.filter((f) => f.usage.isUsed).length;
      const deletedUnused = deletedFiles.length - deletedUsed;

      const folderCounts = { ...prev.stats.folderCounts };
      deletedFiles.forEach((f) => {
        if (folderCounts[f.folder]) {
          folderCounts[f.folder] = Math.max(0, folderCounts[f.folder] - 1);
        }
      });
      folderCounts.all = Math.max(0, (folderCounts.all || 0) - deletedFiles.length);

      return {
        files: updatedFiles,
        stats: {
          ...prev.stats,
          totalCount: updatedFiles.length,
          totalSizeBytes: Math.max(0, prev.stats.totalSizeBytes - deletedSize),
          usedCount: Math.max(0, prev.stats.usedCount - deletedUsed),
          unusedCount: Math.max(0, prev.stats.unusedCount - deletedUnused),
          folderCounts,
        },
      };
    });

    setSelectedPaths((prev) => {
      const next = new Set(prev);
      deletedPaths.forEach((p) => next.delete(p));
      return next;
    });

    showNotification(`Удалено файлов: ${deletedPaths.length}`);
  }

  function toggleSelect(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function selectAllVisible(files: MediaItem[]) {
    setSelectedPaths(new Set(files.map((f) => f.path)));
  }

  function clearSelection() {
    setSelectedPaths(new Set());
  }

  // Handle Upload Success
  function handleUploadSuccess(newFiles: MediaItem[]) {
    showNotification(`Успешно загружено файлов: ${newFiles.length}`);
    setIsUploadOpen(false);
    void loadMedia();
  }

  const allFiles = data?.files;

  // Filter and Sort files
  const filteredFiles = useMemo(() => {
    if (!allFiles) return [];

    return allFiles.filter((file) => {
      // 1. Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = file.name.toLowerCase().includes(q);
        const matchesPath = file.path.toLowerCase().includes(q);
        const matchesOriginal = file.originalName?.toLowerCase().includes(q);
        const matchesUsedTitle = file.usage.locations.some((l) =>
          l.title.toLowerCase().includes(q) || (l.sku && l.sku.toLowerCase().includes(q))
        );
        if (!matchesName && !matchesPath && !matchesOriginal && !matchesUsedTitle) {
          return false;
        }
      }

      // 2. Folder filter
      if (selectedFolder !== 'all') {
        if (selectedFolder === 'products' && file.folder !== 'products') return false;
        if (selectedFolder === 'categories' && file.folder !== 'categories') return false;
        if (selectedFolder === 'banners' && file.folder !== 'banners') return false;
        if (selectedFolder === 'clients' && file.folder !== 'clients') return false;
        if (selectedFolder === 'bag-designer' && file.folder !== 'bag-designer') return false;
        if (selectedFolder === 'documents' && file.folder !== 'documents') return false;
        if (selectedFolder === 'uploads' && file.folder !== 'uploads') return false;
        if (selectedFolder === 'other' && file.folder !== 'other') return false;
      }

      // 3. Usage filter
      if (usageFilter === 'used' && !file.usage.isUsed) return false;
      if (usageFilter === 'unused' && file.usage.isUsed) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (sortBy === 'date_asc') return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      if (sortBy === 'size_desc') return b.size - a.size;
      if (sortBy === 'size_asc') return a.size - b.size;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [allFiles, search, selectedFolder, usageFilter, sortBy]);

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  const folderTabs: { key: MediaFolderKey; label: string; count: number }[] = useMemo(() => {
    const counts = data?.stats.folderCounts || {};
    return [
      { key: 'all', label: 'Все файлы', count: counts.all || 0 },
      { key: 'products', label: 'Товары', count: counts.products || 0 },
      { key: 'categories', label: 'Категории', count: counts.categories || 0 },
      { key: 'banners', label: 'Баннеры', count: counts.banners || 0 },
      { key: 'clients', label: 'Клиенты', count: counts.clients || 0 },
      { key: 'bag-designer', label: 'Пакеты (конструктор)', count: counts['bag-designer'] || 0 },
      { key: 'documents', label: 'Документы', count: counts.documents || 0 },
      { key: 'uploads', label: 'Загрузки', count: counts.uploads || 0 },
    ];
  }, [data?.stats.folderCounts]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-xs font-bold text-white shadow-2xl border border-zinc-700 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="size-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--sp-brand)]/10 text-[var(--sp-brand)] shadow-sm">
              <Images className="size-5" />
            </div>
            <div>
              <h1 className="font-extended text-xl sm:text-2xl font-bold text-[var(--sp-ink)]">
                Хранилище медиафайлов
              </h1>
              <p className="text-xs text-[var(--sp-ink-secondary)] mt-0.5">
                Единая база изображений, баннеров и файлов с отслеживанием использования на сайте
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadMedia()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface)] px-4 text-xs font-bold text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)] shadow-sm transition-all"
            title="Перезагрузить и проверить связи"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--sp-brand)] px-5 text-xs font-bold text-[var(--sp-on-brand)] hover:brightness-105 shadow-md shadow-[var(--sp-brand)]/20 transition-all"
          >
            <Upload className="size-4" />
            Загрузить файлы
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--sp-brand)]/10 text-[var(--sp-brand)] shrink-0">
            <Images className="size-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-[var(--sp-ink-muted)] uppercase tracking-wider block">
              Всего файлов
            </span>
            <span className="text-xl font-bold text-[var(--sp-ink)] tabular-nums">
              {loading ? '…' : data?.stats.totalCount || 0}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
            <HardDrive className="size-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-[var(--sp-ink-muted)] uppercase tracking-wider block">
              Общий объём
            </span>
            <span className="text-xl font-bold text-[var(--sp-ink)] tabular-nums">
              {loading ? '…' : formatBytes(data?.stats.totalSizeBytes || 0)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
            <Database className="size-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Используются
            </span>
            <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {loading ? '…' : data?.stats.usedCount || 0}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 shadow-sm flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-[var(--sp-ink-muted)] uppercase tracking-wider block">
              Не используются
            </span>
            <span className="text-xl font-bold text-amber-600 tabular-nums">
              {loading ? '…' : data?.stats.unusedCount || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search, Folders, Usage Filter, Sorting, View Modes */}
      <div className="rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] p-4 space-y-3.5 shadow-sm">
        {/* Top bar: Search + Usage Filter + Sort + View */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--sp-ink-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, артикулу, пути..."
              className="w-full rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] pl-9 pr-9 py-2 text-xs font-medium text-[var(--sp-ink)] placeholder-[var(--sp-ink-muted)] focus:border-[var(--sp-brand)] focus:outline-none transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filters on right */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Usage Status Filter */}
            <div className="flex items-center rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUsageFilter('all')}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  usageFilter === 'all'
                    ? 'bg-[var(--sp-surface)] text-[var(--sp-ink)] shadow-xs'
                    : 'text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'
                }`}
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setUsageFilter('used')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                  usageFilter === 'used'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'
                }`}
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Используются
              </button>
              <button
                type="button"
                onClick={() => setUsageFilter('unused')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                  usageFilter === 'unused'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-[var(--sp-ink-tertiary)] hover:text-[var(--sp-ink)]'
                }`}
              >
                <span className="size-1.5 rounded-full bg-amber-500" />
                Свободные
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 py-2 text-xs font-medium text-[var(--sp-ink)] focus:border-[var(--sp-brand)] focus:outline-none cursor-pointer"
            >
              <option value="date_desc">Сначала новые</option>
              <option value="date_asc">Сначала старые</option>
              <option value="size_desc">По размеру (убывание)</option>
              <option value="size_asc">По размеру (возрастание)</option>
              <option value="name_asc">По имени (А-Я)</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-1 text-[var(--sp-ink-tertiary)]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[var(--sp-surface)] text-[var(--sp-ink)] shadow-xs'
                    : 'hover:text-[var(--sp-ink)]'
                }`}
                title="Сетка"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'compact'
                    ? 'bg-[var(--sp-surface)] text-[var(--sp-ink)] shadow-xs'
                    : 'hover:text-[var(--sp-ink)]'
                }`}
                title="Компактная сетка"
              >
                <div className="size-4 grid grid-cols-2 gap-0.5 p-0.5">
                  <span className="bg-current rounded-xs" />
                  <span className="bg-current rounded-xs" />
                  <span className="bg-current rounded-xs" />
                  <span className="bg-current rounded-xs" />
                </div>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-[var(--sp-surface)] text-[var(--sp-ink)] shadow-xs'
                    : 'hover:text-[var(--sp-ink)]'
                }`}
                title="Таблица"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selection quick actions bar if items are available */}
        {filteredFiles.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--sp-line)]/50 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allVisibleSelected = filteredFiles.every((f) => selectedPaths.has(f.path));
                  if (allVisibleSelected) {
                    clearSelection();
                  } else {
                    selectAllVisible(filteredFiles);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-2.5 py-1 font-semibold text-[var(--sp-ink)] hover:bg-[var(--sp-line)]/50 transition-colors"
              >
                {filteredFiles.every((f) => selectedPaths.has(f.path)) ? (
                  <>
                    <CheckSquare className="size-3.5 text-[var(--sp-brand)]" />
                    <span>Снять выделение ({selectedPaths.size})</span>
                  </>
                ) : (
                  <>
                    <Square className="size-3.5 text-[var(--sp-ink-tertiary)]" />
                    <span>Выбрать все показанные ({filteredFiles.length})</span>
                  </>
                )}
              </button>

              {selectedPaths.size > 0 && (
                <span className="text-[11px] font-bold text-[var(--sp-brand)]">
                  Выбрано: {selectedPaths.size}
                </span>
              )}
            </div>

            {selectedPaths.size > 0 && (
              <button
                type="button"
                onClick={() => setIsBatchDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700 transition-colors shadow-2xs"
              >
                <Trash2 className="size-3.5" />
                <span>Удалить выбранные ({selectedPaths.size})</span>
              </button>
            )}
          </div>
        )}

        {/* Folder Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-[var(--sp-line)]/60">
          {folderTabs.map((tab) => {
            const active = selectedFolder === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedFolder(tab.key)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[var(--sp-brand)] text-[var(--sp-on-brand)] shadow-sm'
                    : 'bg-[var(--sp-surface-inset)] text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)] hover:bg-[var(--sp-line)]/50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    active ? 'bg-white/20 text-white' : 'bg-[var(--sp-surface)] text-[var(--sp-ink-muted)]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Files Area */}
      {error && (
        <div className="rounded-2xl border border-red-300/40 bg-red-500/10 p-5 text-center text-xs text-[var(--sp-danger)] font-medium space-y-3">
          <AlertCircle className="size-8 mx-auto" />
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadMedia()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="size-8 animate-spin text-[var(--sp-brand)]" />
          <p className="text-xs font-semibold text-[var(--sp-ink-secondary)]">
            Сканирование хранилища и анализ связей с товарами...
          </p>
        </div>
      )}

      {!loading && filteredFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--sp-line)] bg-[var(--sp-surface)] py-20 px-4 text-center space-y-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--sp-surface-inset)] text-[var(--sp-ink-tertiary)]">
            <Images className="size-7" />
          </div>
          <h3 className="font-extended text-base font-bold text-[var(--sp-ink)]">
            Файлы не найдены
          </h3>
          <p className="text-xs text-[var(--sp-ink-tertiary)] max-w-sm">
            {search
              ? `По запросу «${search}» ничего не найдено. Попробуйте изменить параметры поиска.`
              : 'В этой папке пока нет файлов. Вы можете загрузить новые файлы прямо сейчас.'}
          </p>
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sp-line)] px-4 py-2 text-xs font-bold text-[var(--sp-ink)] hover:bg-[var(--sp-surface-inset)]"
            >
              Сбросить поиск
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--sp-brand)] px-4 py-2 text-xs font-bold text-[var(--sp-on-brand)] hover:brightness-105 shadow-sm"
            >
              <Upload className="size-4" />
              Загрузить файлы
            </button>
          )}
        </div>
      )}

      {filteredFiles.length > 0 && (
        <>
          {/* Table View */}
          {viewMode === 'table' && (
            <div className="overflow-hidden rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--sp-line)] bg-[var(--sp-surface-inset)] text-[10px] font-bold uppercase tracking-wider text-[var(--sp-ink-muted)]">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredFiles.length > 0 && filteredFiles.every((f) => selectedPaths.has(f.path))}
                          onChange={() => {
                            if (filteredFiles.every((f) => selectedPaths.has(f.path))) {
                              clearSelection();
                            } else {
                              selectAllVisible(filteredFiles);
                            }
                          }}
                          aria-label="Выбрать все"
                          className="size-4 rounded accent-[var(--sp-brand)] cursor-pointer"
                        />
                      </th>
                      <th className="p-3 w-12">Превью</th>
                      <th className="p-3">Файл / Путь</th>
                      <th className="p-3">Папка</th>
                      <th className="p-3">Размер</th>
                      <th className="p-3">Использование</th>
                      <th className="p-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFiles.map((file) => (
                      <MediaCard
                        key={file.id}
                        file={file}
                        viewMode="table"
                        isSelected={selectedPaths.has(file.path)}
                        onToggleSelect={() => toggleSelect(file.path)}
                        onClick={() => setDetailFile(file)}
                        onDelete={() => setDeleteTarget(file)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Compact View */}
          {viewMode === 'compact' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {filteredFiles.map((file) => (
                <MediaCard
                  key={file.id}
                  file={file}
                  viewMode="compact"
                  isSelected={selectedPaths.has(file.path)}
                  onToggleSelect={() => toggleSelect(file.path)}
                  onClick={() => setDetailFile(file)}
                  onDelete={() => setDeleteTarget(file)}
                />
              ))}
            </div>
          )}

          {/* Standard Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredFiles.map((file) => (
                <MediaCard
                  key={file.id}
                  file={file}
                  viewMode="grid"
                  isSelected={selectedPaths.has(file.path)}
                  onToggleSelect={() => toggleSelect(file.path)}
                  onClick={() => setDetailFile(file)}
                  onDelete={() => setDeleteTarget(file)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating Action Bar when items are selected */}
      {selectedPaths.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 animate-in slide-in-from-bottom-5 duration-200 pointer-events-none">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface)]/95 backdrop-blur-xl px-5 py-3 shadow-2xl pointer-events-auto max-w-lg w-full">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-[var(--sp-brand)] text-[11px] font-bold text-[var(--sp-on-brand)]">
                {selectedPaths.size}
              </span>
              <span className="text-xs font-bold text-[var(--sp-ink)]">
                {selectedPaths.size === 1 ? 'Выбран 1 файл' : `Выбрано файлов: ${selectedPaths.size}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 py-1.5 text-xs font-semibold text-[var(--sp-ink-secondary)] hover:text-[var(--sp-ink)] hover:bg-[var(--sp-line)]/50 transition-colors"
              >
                Снять выбор
              </button>
              <button
                type="button"
                onClick={() => setIsBatchDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors shadow-md"
              >
                <Trash2 className="size-3.5" />
                <span>Удалить ({selectedPaths.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      <MediaBatchDeleteModal
        isOpen={isBatchDeleteOpen}
        files={data?.files.filter((f) => selectedPaths.has(f.path)) || []}
        onClose={() => setIsBatchDeleteOpen(false)}
        onConfirmBatch={handleConfirmBatchDelete}
        onSuccess={handleBatchSuccess}
      />

      {/* Detail Inspection Modal */}
      <MediaDetailModal
        file={detailFile}
        isOpen={Boolean(detailFile)}
        onClose={() => setDetailFile(null)}
        onDeleteRequest={(file) => {
          setDeleteTarget(file);
        }}
      />

      {/* Delete Confirmation Modal with Safe Usage Warnings */}
      <MediaDeleteConfirmModal
        file={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Batch / Single File Upload Modal */}
      <MediaUploadModal
        isOpen={isUploadOpen}
        defaultFolder={selectedFolder === 'all' ? 'products' : selectedFolder}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
