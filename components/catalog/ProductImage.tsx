'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { PhotoIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/context/LanguageContext';
import { hasProductImage } from '@/lib/catalog/productImages';

type ProductImageVariant = 'card' | 'detail' | 'compact';

interface ProductImageProps {
  source?: string | null;
  alt: string;
  sizes: string;
  variant?: ProductImageVariant;
  imageClassName?: string;
  loading?: ImageProps['loading'];
  fetchPriority?: ImageProps['fetchPriority'];
}

export function ProductImage({
  source,
  alt,
  sizes,
  variant = 'card',
  imageClassName,
  loading = 'lazy',
  fetchPriority,
}: ProductImageProps) {
  const { t } = useLanguage();
  const [failedSource, setFailedSource] = useState<string>();

  if (hasProductImage(source) && failedSource !== source) {
    return (
      <Image
        src={source}
        alt={alt}
        fill
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        onError={() => setFailedSource(source)}
        className={`rounded-[inherit] ${imageClassName ?? ''}`}
      />
    );
  }

  const label = `${alt}. ${t('photoComingSoon')}. ${t('photoComingSoonDescription')}`;

  return (
    <div
      role="img"
      aria-label={label}
      className="absolute inset-0 isolate flex items-center justify-center overflow-hidden rounded-[inherit] bg-[linear-gradient(145deg,var(--sp-brand-soft),var(--sp-surface-inset)_58%,var(--sp-surface))] p-3 text-center"
    >
      <div className="absolute -right-8 -top-8 size-28 rounded-full border border-[color-mix(in_srgb,var(--sp-brand)_16%,transparent)]" aria-hidden="true" />
      <div className="absolute -bottom-12 -left-10 size-36 rounded-full border border-[color-mix(in_srgb,var(--sp-brand)_12%,transparent)]" aria-hidden="true" />

      {variant === 'compact' ? (
        <PhotoIcon className="size-5 text-[var(--sp-brand)]" aria-hidden="true" />
      ) : (
        <div className={`relative flex max-w-[17rem] flex-col items-center ${variant === 'detail' ? 'gap-4' : 'gap-2.5'}`}>
          <div
            className={`relative grid place-items-center rounded-[var(--sp-radius-card)] border border-dashed border-[color-mix(in_srgb,var(--sp-brand)_45%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-surface-raised)_88%,transparent)] text-[var(--sp-brand)] shadow-[var(--sp-shadow-soft)] ${variant === 'detail' ? 'size-24' : 'size-16 sm:size-20'}`}
            aria-hidden="true"
          >
            <PhotoIcon className={variant === 'detail' ? 'size-10' : 'size-7 sm:size-8'} />
            <span className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-[var(--sp-brand)] text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)]">
              <SparklesIcon className="size-4" />
            </span>
          </div>

          <div>
            <p className={`${variant === 'detail' ? 'text-lg sm:text-xl' : 'text-xs sm:text-sm'} font-semibold tracking-tight text-[var(--sp-ink)]`}>
              {t('photoComingSoon')}
            </p>
            <p className={`${variant === 'detail' ? 'mt-1.5 text-sm' : 'mt-1 hidden text-[11px] leading-snug sm:block'} text-[var(--sp-ink-secondary)]`}>
              {t('photoComingSoonDescription')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
