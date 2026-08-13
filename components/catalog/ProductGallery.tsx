'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Maximize2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const { language } = useLanguage();
  const zoomTitle = { ru: 'Увеличить', uz: 'Kattalashtirish', en: 'Enlarge image' }[language];
  const [activeImage, setActiveImage] = useState(images[0] || 'https://picsum.photos/800/800');
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main Image Stage */}
      <div className="group relative aspect-square overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface)] p-6">
        <Image
          src={activeImage}
          alt={title}
          fill
          priority
          sizes="(min-width: 1024px) 45vw, 90vw"
          className="object-contain p-6 transition-transform duration-300 group-hover:scale-105"
        />

        <button
          type="button"
          onClick={() => setIsZoomOpen(true)}
          className="sp-icon-button absolute right-4 top-4 size-10 border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] shadow-[var(--sp-shadow-soft)]"
          title={zoomTitle}
          aria-label={zoomTitle}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {images.map((img, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => setActiveImage(img)}
              className={`relative size-16 shrink-0 overflow-hidden rounded-[var(--sp-radius-control)] border bg-[var(--sp-surface)] p-1 transition-[border-color,opacity,transform] ${
                activeImage === img
                  ? 'scale-[1.03] border-[var(--sp-brand)] ring-2 ring-[var(--sp-brand-soft)]'
                  : 'border-[var(--sp-line)] opacity-70 hover:border-[var(--sp-line-strong)] hover:opacity-100'
              }`}
            >
              <Image
                src={img}
                alt={`${title} — ${idx + 1}`}
                fill
                sizes="80px"
                className="object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}

      {/* Modal Zoom */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label={zoomTitle} className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[var(--sp-surface-raised)] p-6">
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              aria-label={language === 'ru' ? 'Закрыть' : language === 'uz' ? 'Yopish' : 'Close'}
              className="sp-icon-button absolute right-4 top-4 size-10 bg-[var(--sp-surface-inset)]"
            >
              <X className="w-5 h-5" />
            </button>
            <Image
              src={activeImage}
              alt={title}
              width={1200}
              height={1200}
              sizes="90vw"
              className="max-w-full max-h-[80vh] w-auto h-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
