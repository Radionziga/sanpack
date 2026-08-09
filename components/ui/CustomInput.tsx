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
        <label htmlFor={id} className="admin-field-label mb-1.5 block">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3.5 shrink-0 text-[var(--sp-ink-tertiary)]">
            {leftIcon}
          </div>
        )}

        <input
          id={id}
          className={`admin-control py-2.5 px-3.5 text-xs font-medium ${
            leftIcon ? 'pl-10' : ''
          } ${rightIcon ? 'pr-10' : ''} ${
            error
              ? 'border-[var(--sp-danger)] focus:border-[var(--sp-danger)] focus:ring-[color-mix(in_srgb,var(--sp-danger)_16%,transparent)]'
              : ''
          } ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3.5 shrink-0 text-[var(--sp-ink-tertiary)]">{rightIcon}</div>
        )}
      </div>

      {error ? (
        <p className="mt-1 text-[11px] font-semibold text-[var(--sp-danger)]">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-[var(--sp-ink-tertiary)]">{helperText}</p>
      ) : null}
    </div>
  );
}
