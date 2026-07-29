'use client';

import React, { useId } from 'react';

export interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function CustomInput({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  id: customId,
  ...props
}: CustomInputProps) {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-[#222B35] mb-1.5">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none shrink-0">
            {leftIcon}
          </div>
        )}

        <input
          id={id}
          className={`w-full bg-white border rounded-xl py-2.5 px-3.5 text-xs font-medium text-[#222B35] placeholder:text-slate-400 outline-none transition-all ${
            leftIcon ? 'pl-10' : ''
          } ${rightIcon ? 'pr-10' : ''} ${
            error
              ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-200 hover:border-[#0F6E43]/40 focus:border-[#0F6E43] focus:ring-2 focus:ring-[#0F6E43]/15'
          } ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3.5 text-slate-400 shrink-0">{rightIcon}</div>
        )}
      </div>

      {error ? (
        <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
