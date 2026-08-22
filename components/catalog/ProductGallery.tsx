'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ProductImage } from '@/components/catalog/ProductImage';
import { hasProductImage } from '@/lib/catalog/productImages';

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const { language } = useLanguage();
  const zoomTitle = { ru: 'Увеличить', uz: 'Kattalashtirish', en: 'Enlarge image' }[language];
  const closeTitle = { ru: 'Закрыть', uz: 'Yopish', en: 'Close' }[language];
  const availableImages = images.filter(hasProductImage);
  const [selectedImage, setSelectedImage] = useState('');
  const activeImage = availableImages.includes(selectedImage)
    ? selectedImage
    : availableImages[0] || '';
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isZoomOpen) return;

    const previousOverflow = document.body.style.overflow;
    const zoomTrigger = zoomTriggerRef.current;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsZoomOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => zoomTrigger?.focus());
    };
  }, [isZoomOpen]);

  return (
    <div className="space-y-4">
      {/* Main Image Stage */}
      <div className="group relative aspect-square overflow-hidden rounded-[var(--sp-radius-card)] bg-[var(--sp-surface)] sm:border sm:border-[var(--sp-line)]">
        <ProductImage
          source={activeImage}
          alt={title}
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 1024px) 45vw, 90vw"
          variant="detail"
          imageClassName="object-contain p-3 transition-transform duration-300 motion-reduce:transition-none sm:p-6 md:group-hover:scale-[1.025]"
        />

        {hasProductImage(activeImage) ? (
          <button
            ref={zoomTriggerRef}
            type="button"
            onClick={() => setIsZoomOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isZoomOpen}
            className="sp-icon-button absolute right-3 top-3 size-11 cursor-pointer border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] shadow-[var(--sp-shadow-soft)] sm:right-4 sm:top-4"
            title={zoomTitle}
            aria-label={zoomTitle}
          >
            <Maximize2 className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Thumbnails */}
      {availableImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {availableImages.map((img, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => setSelectedImage(img)}
              aria-label={`${title} — ${idx + 1}`}
              aria-pressed={activeImage === img}
              className={`relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-[var(--sp-radius-control)] border bg-[var(--sp-surface)] p-1 transition-[border-color,opacity,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus)] ${
                activeImage === img
                  ? 'scale-[1.03] border-[var(--sp-brand)] ring-2 ring-[var(--sp-brand-soft)]'
                  : 'border-[var(--sp-line)] opacity-70 hover:border-[var(--sp-line-strong)] hover:opacity-100'
              }`}
            >
              <ProductImage
                source={img}
                alt={`${title} — ${idx + 1}`}
                sizes="80px"
                variant="compact"
                imageClassName="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}

      {/* Modal Zoom */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center sm:p-4">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsZoomOpen(false)}
            aria-label={closeTitle}
            className="absolute inset-0 cursor-pointer bg-black/80 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={zoomTitle}
            className="relative flex h-full w-full items-center justify-center bg-[var(--sp-surface-raised)] p-4 pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] sm:h-[min(90dvh,900px)] sm:max-w-5xl sm:rounded-[var(--sp-radius-card)] sm:border sm:border-[var(--sp-line)] sm:p-8"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsZoomOpen(false)}
              aria-label={closeTitle}
              className="sp-icon-button absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-10 size-11 cursor-pointer border border-[var(--sp-line)] bg-[var(--sp-surface)] shadow-[var(--sp-shadow-soft)] sm:right-4 sm:top-4"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <div className="relative h-full w-full">
              <ProductImage
                source={activeImage}
                alt={title}
                sizes="(min-width: 640px) 90vw, 100vw"
                variant="detail"
                imageClassName="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
