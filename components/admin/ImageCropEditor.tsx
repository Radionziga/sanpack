'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ImageIcon, LoaderCircle, Move, TriangleAlert, X, ZoomIn } from 'lucide-react';
import { mediaPresets, type MediaKind } from '@/lib/media/presets';

type ImageSize = { width: number; height: number };
type CropRect = { x: number; y: number; width: number; height: number };

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getCropRect(
  image: ImageSize,
  targetRatio: number,
  zoom: number,
  positionX: number,
  positionY: number
): CropRect {
  const sourceRatio = image.width / image.height;
  const baseWidth = sourceRatio >= targetRatio ? image.height * targetRatio : image.width;
  const baseHeight = sourceRatio >= targetRatio ? image.height : image.width / targetRatio;
  const width = baseWidth / zoom;
  const height = baseHeight / zoom;

  return {
    x: (image.width - width) * positionX,
    y: (image.height - height) * positionY,
    width,
    height,
  };
}

function toWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Браузер не смог подготовить изображение.')),
      'image/webp',
      0.94
    );
  });
}

export function ImageCropEditor({
  file,
  kind,
  onCancel,
  onConfirm,
}: {
  file: File;
  kind: MediaKind;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
}) {
  const preset = mediaPresets[kind];
  const targetRatio = preset.width / preset.height;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    positionX: number;
    positionY: number;
  } | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0.5);
  const [positionY, setPositionY] = useState(0.5);
  const [loadError, setLoadError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const previewSize = useMemo(() => {
    const width = kind === 'banner-desktop' ? 1200 : 720;
    return { width, height: Math.round(width / targetRatio) };
  }, [kind, targetRatio]);

  useEffect(() => {
    let active = true;
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (!active) return;
      imageRef.current = image;
      setLoadError('');
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      if (!active) return;
      setLoadError('Файл не удалось открыть как изображение. Выберите другой файл.');
    };
    image.src = objectUrl;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
      imageRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !imageSize) return;

    const frame = requestAnimationFrame(() => {
      canvas.width = previewSize.width;
      canvas.height = previewSize.height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;
      const crop = getCropRect(imageSize, targetRatio, zoom, positionX, positionY);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        previewSize.width,
        previewSize.height
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [imageSize, positionX, positionY, previewSize, targetRatio, zoom]);

  const qualityWarning = imageSize
    ? imageSize.width < preset.width || imageSize.height < preset.height
    : false;

  const updateFromPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas || !imageSize || event.pointerId !== drag.pointerId) return;
    const bounds = canvas.getBoundingClientRect();
    const crop = getCropRect(imageSize, targetRatio, zoom, drag.positionX, drag.positionY);
    const availableX = imageSize.width - crop.width;
    const availableY = imageSize.height - crop.height;
    const sourceDeltaX = ((event.clientX - drag.clientX) / bounds.width) * crop.width;
    const sourceDeltaY = ((event.clientY - drag.clientY) / bounds.height) * crop.height;
    setPositionX(availableX > 0 ? clamp(drag.positionX - sourceDeltaX / availableX) : 0.5);
    setPositionY(availableY > 0 ? clamp(drag.positionY - sourceDeltaY / availableY) : 0.5);
  };

  const applyCrop = async () => {
    const image = imageRef.current;
    if (!image || !imageSize) return;
    setIsExporting(true);
    setLoadError('');
    try {
      const output = document.createElement('canvas');
      output.width = preset.width;
      output.height = preset.height;
      const context = output.getContext('2d', { alpha: false });
      if (!context) throw new Error('Браузер не поддерживает обработку изображений.');
      const crop = getCropRect(imageSize, targetRatio, zoom, positionX, positionY);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        preset.width,
        preset.height
      );
      const blob = await toWebp(output);
      const baseName = file.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'image';
      await onConfirm(new File([blob], `${baseName}.webp`, { type: 'image/webp' }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Изображение не удалось подготовить.');
    } finally {
      setIsExporting(false);
    }
  };

  const crop = imageSize ? getCropRect(imageSize, targetRatio, zoom, positionX, positionY) : null;
  const canMoveX = Boolean(crop && imageSize && imageSize.width - crop.width > 0.5);
  const canMoveY = Boolean(crop && imageSize && imageSize.height - crop.height > 0.5);

  return (
    <section className="rounded-2xl border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] p-3 sm:p-4" aria-labelledby="crop-editor-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h3 id="crop-editor-title" className="text-base font-bold text-[var(--sp-ink)]">Настройте область изображения</h3>
          <p id="crop-editor-help" className="mt-1 max-w-3xl text-xs leading-5 text-[var(--sp-ink-secondary)]">
            Перетаскивайте изображение внутри рамки и меняйте масштаб. На сайте будет видна ровно эта область — {preset.width}×{preset.height} px.
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-[var(--sp-line)] bg-[var(--sp-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sp-ink-secondary)]">
          {preset.label}
        </span>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-lg border border-black/10 bg-[var(--sp-surface)] shadow-sm dark:border-white/10">
        {imageSize ? (
          <>
            <canvas
              ref={canvasRef}
              className="block w-full touch-none cursor-grab select-none active:cursor-grabbing"
              style={{ aspectRatio: `${preset.width} / ${preset.height}` }}
              role="img"
              aria-describedby="crop-editor-help"
              aria-label="Предпросмотр выбранной области изображения"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  pointerId: event.pointerId,
                  clientX: event.clientX,
                  clientY: event.clientY,
                  positionX,
                  positionY,
                };
              }}
              onPointerMove={updateFromPointer}
              onPointerUp={(event) => {
                dragRef.current = null;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              onPointerCancel={() => { dragRef.current = null; }}
            />
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/40 shadow-[1px_0_0_rgb(0_0_0/18%)]" />
              <div className="absolute inset-y-0 right-1/3 w-px bg-white/40 shadow-[1px_0_0_rgb(0_0_0/18%)]" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/40 shadow-[0_1px_0_rgb(0_0_0/18%)]" />
              <div className="absolute inset-x-0 bottom-1/3 h-px bg-white/40 shadow-[0_1px_0_rgb(0_0_0/18%)]" />
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-black/65 px-2.5 py-1.5 text-[11px] font-semibold text-white">
                <Move className="size-3.5" /> Перетащите изображение
              </span>
            </div>
          </>
        ) : (
          <div className="flex min-h-48 items-center justify-center text-[var(--sp-ink-tertiary)]" style={{ aspectRatio: `${preset.width} / ${preset.height}` }}>
            {loadError ? <ImageIcon className="size-6" aria-hidden="true" /> : <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />}
          </div>
        )}
      </div>

      {qualityWarning ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5 text-xs leading-5 text-amber-800" role="status">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Исходник {imageSize?.width}×{imageSize?.height} px меньше рекомендуемого размера. Его можно использовать, но на большом экране детализация может быть ниже.
        </p>
      ) : null}

      {loadError ? (
        <p className="mt-3 flex items-start gap-2 text-xs text-[var(--sp-danger)]" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{loadError}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="block text-xs font-semibold text-[var(--sp-ink-secondary)]">
          <span className="mb-2 flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5"><ZoomIn className="size-4" aria-hidden="true" /> Масштаб</span><output>{Math.round(zoom * 100)}%</output></span>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-[var(--sp-brand)]" />
        </label>
        <label className="block text-xs font-semibold text-[var(--sp-ink-secondary)]">
          <span className="mb-2 flex items-center justify-between gap-2"><span>По горизонтали</span><output>{Math.round(positionX * 100)}%</output></span>
          <input type="range" min="0" max="1" step="0.01" value={positionX} disabled={!canMoveX} onChange={(event) => setPositionX(Number(event.target.value))} className="w-full accent-[var(--sp-brand)] disabled:opacity-35" />
        </label>
        <label className="block text-xs font-semibold text-[var(--sp-ink-secondary)]">
          <span className="mb-2 flex items-center justify-between gap-2"><span>По вертикали</span><output>{Math.round(positionY * 100)}%</output></span>
          <input type="range" min="0" max="1" step="0.01" value={positionY} disabled={!canMoveY} onChange={(event) => setPositionY(Number(event.target.value))} className="w-full accent-[var(--sp-brand)] disabled:opacity-35" />
        </label>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--sp-line)] pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isExporting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--sp-control-border)] bg-[var(--sp-surface)] px-4 text-xs font-bold text-[var(--sp-ink-secondary)] transition-colors hover:text-[var(--sp-ink)] disabled:opacity-50">
          <X className="size-4" aria-hidden="true" /> Отмена
        </button>
        <button type="button" onClick={() => void applyCrop()} disabled={!imageSize || isExporting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--sp-brand)] px-5 text-xs font-bold text-[var(--sp-on-brand)] transition-opacity hover:opacity-90 active:scale-[0.96] disabled:cursor-wait disabled:opacity-50">
          {isExporting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
          {isExporting ? 'Подготовка…' : 'Применить и загрузить'}
        </button>
      </div>
    </section>
  );
}
