'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center border font-semibold transition-colors duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--sp-brand)_18%,transparent)] disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    xs: 'h-8 px-3 text-xs gap-1.5 rounded-[var(--sp-radius-control)]',
    sm: 'h-9 px-3.5 text-xs gap-2 rounded-[var(--sp-radius-control)]',
    md: 'h-10 px-4 text-xs gap-2 rounded-[var(--sp-radius-control)]',
    lg: 'h-12 px-6 text-sm gap-2.5 rounded-[var(--sp-radius-control)]',
  };

  const variantStyles = {
    primary:
      'border-[var(--sp-brand)] bg-[var(--sp-brand)] text-[var(--sp-on-brand)] hover:border-[var(--sp-brand-deep)] hover:bg-[var(--sp-brand-deep)]',
    secondary:
      'border-[color-mix(in_srgb,var(--sp-brand)_20%,var(--sp-line))] bg-[color-mix(in_srgb,var(--sp-brand)_9%,var(--sp-surface))] text-[var(--sp-brand)] hover:bg-[color-mix(in_srgb,var(--sp-brand)_14%,var(--sp-surface))]',
    outline:
      'border-[var(--sp-line)] bg-[var(--sp-surface)] text-[var(--sp-ink)] hover:border-[color-mix(in_srgb,var(--sp-brand)_38%,var(--sp-line))] hover:bg-[var(--sp-surface-muted)]',
    ghost:
      'border-transparent bg-transparent text-[var(--sp-ink-secondary)] hover:bg-[var(--sp-surface-muted)] hover:text-[var(--sp-brand)]',
    danger:
      'border-[var(--sp-danger)] bg-[var(--sp-danger)] text-white hover:brightness-90',
    success:
      'border-[var(--sp-success)] bg-[var(--sp-success)] text-white hover:brightness-90',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}

      <span>{children}</span>

      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
