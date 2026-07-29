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
    brand: 'bg-[#EAF5EF] text-[#0F6E43] border border-[#0F6E43]/20 font-bold',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200 font-bold',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold',
    outline: 'bg-white text-slate-700 border border-slate-200 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg tracking-tight select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
