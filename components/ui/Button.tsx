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
    'inline-flex items-center justify-center font-bold transition-all duration-150 cursor-pointer select-none outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const sizeStyles = {
    xs: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    sm: 'h-9 px-3.5 text-xs gap-2 rounded-xl',
    md: 'h-10 px-4 text-xs gap-2 rounded-xl',
    lg: 'h-12 px-6 text-sm gap-2.5 rounded-xl',
  };

  const variantStyles = {
    primary:
      'bg-[#0F6E43] hover:bg-[#093E25] text-white shadow-md hover:shadow-lg focus:ring-2 focus:ring-[#0F6E43]/20',
    secondary:
      'bg-[#EAF5EF] hover:bg-[#D4EBE1] text-[#0F6E43] focus:ring-2 focus:ring-[#0F6E43]/15',
    outline:
      'bg-white border border-slate-200 text-[#222B35] hover:border-[#0F6E43]/40 hover:bg-slate-50 focus:ring-2 focus:ring-[#0F6E43]/15 shadow-2xs',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-[#0F6E43]',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-md focus:ring-2 focus:ring-rose-500/20',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md focus:ring-2 focus:ring-emerald-500/20',
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
