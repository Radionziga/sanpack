'use client';

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({
  children,
  variant = 'brand',
  size = 'sm',
  icon,
  className = '',
}: BadgeProps) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  const variantStyles = {
    brand: 'bg-[color-mix(in_srgb,var(--sp-brand)_10%,var(--sp-surface))] text-[var(--sp-brand)] border border-[color-mix(in_srgb,var(--sp-brand)_24%,var(--sp-line))] font-semibold',
    success: 'bg-[color-mix(in_srgb,var(--sp-success)_10%,var(--sp-surface))] text-[var(--sp-success)] border border-[color-mix(in_srgb,var(--sp-success)_24%,var(--sp-line))] font-semibold',
    warning: 'bg-amber-500/10 text-amber-700 border border-amber-500/25 font-semibold',
    danger: 'bg-red-500/8 text-[var(--sp-danger)] border border-red-500/25 font-semibold',
    neutral: 'bg-[var(--sp-surface-inset)] text-[var(--sp-ink-secondary)] border border-[var(--sp-line)] font-semibold',
    outline: 'bg-[var(--sp-surface)] text-[var(--sp-ink-secondary)] border border-[var(--sp-line)] font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--sp-radius-control-inner)] tracking-tight select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
