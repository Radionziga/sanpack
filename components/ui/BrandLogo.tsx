'use client';

import React from 'react';

interface BrandLogoProps {
  src?: string;
  srcDark?: string;
  label?: string;
  variant?: 'green' | 'white' | 'accent' | 'currentColor' | 'dark';
  className?: string;
}

export function BrandLogo({
  src,
  srcDark,
  label = 'Storefront',
  variant = 'green',
  className = 'h-7',
}: BrandLogoProps) {
  const activeSrc = variant === 'white' || variant === 'dark'
    ? srcDark || (srcDark === undefined ? src : undefined)
    : src || srcDark;

  if (activeSrc) {
    return (
      <span className="inline-flex shrink-0 select-none items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeSrc}
          alt={`${label} logo`}
          className={`${className} w-auto max-w-full object-contain`}
        />
      </span>
    );
  }

  const tone = variant === 'white'
    ? 'text-white'
    : variant === 'accent'
      ? 'text-[var(--sp-accent)]'
      : variant === 'dark'
        ? 'text-slate-950'
        : variant === 'currentColor'
          ? 'text-current'
          : 'text-[var(--sp-brand)]';

  return (
    <span
      role="img"
      aria-label={`${label} logo`}
      className={`${className} inline-flex max-w-full shrink-0 select-none items-center font-brand-heading text-lg font-bold uppercase leading-none tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}
