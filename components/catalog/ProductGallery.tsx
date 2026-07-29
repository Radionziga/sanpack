'use client';

import React, { useState } from 'react';
import { Maximize2, X } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeImage, setActiveImage] = useState(images[0] || 'https://picsum.photos/800/800');
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main Image Stage */}
      <div className="relative aspect-square bg-white rounded-2xl p-6 border border-slate-200 overflow-hidden group">
        <img
          src={activeImage}
          alt={title}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
        />

        <button
          onClick={() => setIsZoomOpen(true)}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/80 hover:bg-white text-slate-700 shadow-md flex items-center justify-center transition-colors"
          title="Увеличить"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImage(img)}
              className={`w-16 h-16 rounded-xl border-2 p-1 bg-white overflow-hidden shrink-0 transition-all ${
                activeImage === img
                  ? 'border-[#006F3C] ring-2 ring-[#006F3C]/20 scale-105'
                  : 'border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`${title} - ${idx}`} className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}

      {/* Modal Zoom */}
      {isZoomOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-6 overflow-hidden">
            <button
              onClick={() => setIsZoomOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeImage}
              alt={title}
              className="max-w-full max-h-[80vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
